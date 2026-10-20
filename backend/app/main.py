"""Authenticated PostgreSQL API for Спортик."""
import asyncio
import hashlib
import json
import logging
from io import BytesIO
import secrets
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
from PIL import Image, UnidentifiedImageError
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator
from pwdlib import PasswordHash
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

logger = logging.getLogger(__name__)
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
sessions = async_sessionmaker(engine, expire_on_commit=False)
redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
password_hasher = PasswordHash.recommended()
# Equal-cost verification when an email is absent reduces account enumeration by timing.
_dummy_password_hash = password_hasher.hash('Not-a-real-password-9')
_geo_lock = asyncio.Lock()
_geo_last_request = 0.0
_chat_connections: dict[str, set[WebSocket]] = {}
_chat_connections_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    yield
    await redis.aclose()
    await engine.dispose()


app = FastAPI(title='Спортик API', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allow_headers=['Content-Type'])


async def db_session():
    async with sessions() as session:
        yield session


def timestamp(value):
    return value.isoformat() if value else None


async def rows(session, query, params=None):
    result = await session.execute(text(query), params or {})
    return [dict(row) for row in result.mappings().all()]


async def restart_redis_cache():
    # Redis contains ONLY a disposable public city catalog, never sessions.
    # Its container restarts under Compose; meanwhile reads use PostgreSQL.
    try:
        await redis.execute_command('SHUTDOWN', 'NOSAVE')
    except RedisError:
        logger.info('Redis unavailable or restarting after committed data change')


def age_from_birth_date(value: date | None):
    if value is None:
        return None
    today = datetime.now(timezone.utc).date()
    return today.year - value.year - ((today.month, today.day) < (value.month, value.day))


def social_links(value):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            value = []
    if not isinstance(value, list):
        return []
    return [
        {'platform': str(item['platform']), 'url': str(item['url']), 'label': str(item.get('label') or '')}
        for item in value
        if isinstance(item, dict) and isinstance(item.get('platform'), str) and isinstance(item.get('url'), str)
    ][:5]


def public_user(row):
    """Projection deliberately safe to show from event lists and participant cards."""
    result = {
        'id': row['id'],
        'name': row['name'],
        'city': row.get('city') or '',
        'role': row.get('role') or 'user',
        'avatarUrl': row.get('avatarUrl'),
        'bio': row.get('bio') or '',
        'socialLinks': social_links(row.get('socialLinks')),
        'stats': {
            'events': int(row.get('eventCount') or 0),
            'subscriptions': int(row.get('subscriptionsCount') or 0),
            'followers': int(row.get('followersCount') or 0),
        },
    }
    # Public profiles intentionally expose age, not an exact date of birth.
    age = row.get('age')
    if age is None and row.get('birthDate') is not None:
        age = age_from_birth_date(row['birthDate'])
    if age is not None:
        result['age'] = int(age)
    for key in ('maritalStatus', 'hasCar', 'workSchedule'):
        if row.get(key) is not None:
            result[key] = row[key]
    return result



def self_user(row):
    """Extended projection returned only to the authenticated account owner."""
    result = public_user(row)
    birth_date = row.get('birthDate')
    age = row.get('age')
    result.update({
        'birthDate': timestamp(birth_date),
        'maritalStatus': row.get('maritalStatus'),
        'hasCar': row.get('hasCar'),
        'workSchedule': row.get('workSchedule'),
    })
    if age is not None:
        result['age'] = int(age)
    elif birth_date is not None:
        result['age'] = age_from_birth_date(birth_date)
    return result


def origin_matches_request_host(request: Request, origin: str):
    """Accept the frontend served by the same host as the API reverse proxy."""
    parsed = urlsplit(origin)
    forwarded_proto = request.headers.get('x-forwarded-proto', '').split(',')[0].strip()
    scheme = forwarded_proto or request.url.scheme
    host = request.headers.get('host', '')
    return (
        parsed.scheme in {'http', 'https'}
        and bool(host)
        and parsed.netloc == host
        and origin.rstrip('/') == f'{scheme}://{host}'
    )


async def csrf_origin(request: Request):
    # Unsafe cookie-authenticated requests must come from an explicitly allowed
    # development origin or from the same host as the frontend reverse proxy.
    # This retains CSRF protection for protected routes while allowing a deployed
    # single-origin frontend without hard-coding its public domain in the image.
    origin = request.headers.get('origin')
    if not origin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Untrusted request origin')
    clean_origin = origin.rstrip('/')
    if clean_origin in settings.allowed_origins or origin_matches_request_host(request, clean_origin):
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, 'Untrusted request origin')


async def current_user(request: Request, session: AsyncSession = Depends(db_session)):
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Authentication required')
    digest = hashlib.sha256(token.encode()).hexdigest()
    user = (await session.execute(text("""SELECT u.id AS db_id,u.public_id AS id,u.name,u.city,u.avatar_url AS "avatarUrl",u.bio,
        p.birth_date AS "birthDate",p.marital_status AS "maritalStatus",
        p.has_car AS "hasCar",p.work_schedule AS "workSchedule",p.social_links AS "socialLinks",
        EXTRACT(YEAR FROM age(current_date,p.birth_date))::integer AS age,
        (SELECT count(*)::integer FROM events e WHERE e.organizer_id=u.id) AS "eventCount",
        (SELECT count(*)::integer FROM user_follows f WHERE f.follower_id=u.id) AS "subscriptionsCount",
        (SELECT count(*)::integer FROM user_follows f WHERE f.followed_id=u.id) AS "followersCount",
        CASE WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.name='ADMIN') THEN 'admin'
             WHEN EXISTS (SELECT 1 FROM organization_members om JOIN organizations o ON o.id=om.organization_id WHERE om.user_id=u.id AND om.role='OWNER' AND o.status='APPROVED') THEN 'organization'
             ELSE 'user' END AS role
        FROM auth_sessions s JOIN users u ON u.id=s.user_id
        LEFT JOIN user_profiles p ON p.user_id=u.id
        WHERE s.token_hash=:hash AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status='ACTIVE'"""),
                                      {'hash': digest})).mappings().first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Authentication required')
    return dict(user)


async def require_user(request: Request, user=Depends(current_user)):
    # Origin validation is required for cookie-authenticated state changes, not reads.
    if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
        await csrf_origin(request)
    return user


async def require_admin(user=Depends(require_user)):
    if user.get('role') != 'admin':
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Administrator access is required')
    return user


def set_session(response: Response, token: str):
    response.set_cookie(settings.session_cookie_name, token, max_age=settings.session_days * 86400,
                        httponly=True, secure=settings.cookie_secure, samesite='lax', path='/')


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    name: str | None = Field(default=None, max_length=150)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value):
        return str(value).strip().lower()

    @field_validator('password')
    @classmethod
    def password_strength(cls, value):
        if value != value.strip() or not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError('Password must be 10+ characters and contain letters and digits')
        return value

    @field_validator('name')
    @classmethod
    def name_not_blank(cls, value):
        if value is not None and not value.strip():
            raise ValueError('Name cannot be blank')
        return value.strip() if value else value


async def throttle_auth(email: str, action: str, limit: int):
    key = 'auth:attempts:' + action + ':' + hashlib.sha256(email.encode()).hexdigest()
    try:
        attempts = await redis.incr(key)
        if attempts == 1:
            await redis.expire(key, 60)
        if attempts > limit:
            raise HTTPException(429, 'Too many attempts. Try again in a minute')
    except RedisError:
        logger.warning('Auth rate limiter unavailable; PostgreSQL auth remains active')


async def create_login(session: AsyncSession, user_id: int):
    raw = secrets.token_urlsafe(48)
    await session.execute(text("INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES (:user,:hash,:expiry)"), {
        'user': user_id, 'hash': hashlib.sha256(raw.encode()).hexdigest(),
        'expiry': datetime.now(timezone.utc) + timedelta(days=settings.session_days)})
    return raw


async def grant_configured_admin_role(session: AsyncSession, user_id: int, email: str):
    """Bootstrap only the explicitly configured administrator identity."""
    configured = settings.admin_email.strip().lower()
    if not configured or email.strip().lower() != configured:
        return False
    role_id = await session.scalar(text("SELECT id FROM roles WHERE name='ADMIN'"))
    if not role_id:
        return False
    await session.execute(text('''INSERT INTO user_roles(user_id,role_id)
        VALUES (:user,:role) ON CONFLICT DO NOTHING'''), {'user': user_id, 'role': role_id})
    return True


@app.post('/api/v1/auth/register', status_code=status.HTTP_201_CREATED)
async def register(payload: Credentials, request: Request, response: Response, session: AsyncSession = Depends(db_session)):
    await throttle_auth(payload.email, 'register', 5)
    if not payload.name:
        raise HTTPException(422, 'Name is required')
    await session.commit()
    async with session.begin():
        existing = await session.scalar(text('SELECT 1 FROM users WHERE lower(email)=:email'), {'email': payload.email})
        if existing:
            # Do not identify whether a specific email has an account.
            raise HTTPException(status.HTTP_400_BAD_REQUEST, 'Unable to create account')
        public_id = 'u-' + uuid4().hex[:16]
        user_id = await session.scalar(text("""INSERT INTO users(public_id,email,name,password_hash)
            VALUES (:id,:email,:name,:password) RETURNING id"""),
            {'id': public_id, 'email': payload.email, 'name': payload.name, 'password': password_hasher.hash(payload.password)})
        role_id = await session.scalar(text("SELECT id FROM roles WHERE name='USER'"))
        if role_id:
            await session.execute(text('INSERT INTO user_roles(user_id,role_id) VALUES (:user,:role) ON CONFLICT DO NOTHING'),
                                  {'user': user_id, 'role': role_id})
        is_admin = await grant_configured_admin_role(session, user_id, payload.email)
        token = await create_login(session, user_id)
    result = self_user({'id': public_id, 'name': payload.name, 'city': '', 'role': 'admin' if is_admin else 'user', 'avatarUrl': None, 'bio': ''})
    set_session(response, token)
    return result


@app.post('/api/v1/auth/login')
async def login(payload: Credentials, request: Request, response: Response, session: AsyncSession = Depends(db_session)):
    # Login is public: there is no cookie-authenticated state to protect yet.
    await throttle_auth(payload.email, 'login', 20)
    user = (await session.execute(text('''SELECT u.id,u.public_id,u.password_hash,u.name,u.city,u.avatar_url AS "avatarUrl",u.bio,
        p.birth_date AS "birthDate",p.marital_status AS "maritalStatus",
        p.has_car AS "hasCar",p.work_schedule AS "workSchedule",p.social_links AS "socialLinks",
        EXTRACT(YEAR FROM age(current_date,p.birth_date))::integer AS age,
        (SELECT count(*)::integer FROM events e WHERE e.organizer_id=u.id) AS "eventCount",
        (SELECT count(*)::integer FROM user_follows f WHERE f.follower_id=u.id) AS "subscriptionsCount",
        (SELECT count(*)::integer FROM user_follows f WHERE f.followed_id=u.id) AS "followersCount",
        CASE WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.name='ADMIN') THEN 'admin'
             WHEN EXISTS (SELECT 1 FROM organization_members om JOIN organizations o ON o.id=om.organization_id WHERE om.user_id=u.id AND om.role='OWNER' AND o.status='APPROVED') THEN 'organization'
             ELSE 'user' END AS role
        FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id
        WHERE lower(u.email)=:email AND u.status='ACTIVE' '''),
                                  {'email': payload.email})).mappings().first()
    stored_hash = user['password_hash'] if user and user['password_hash'] else _dummy_password_hash
    try:
        valid_password = password_hasher.verify(payload.password, stored_hash)
    except ValueError:
        valid_password = False
    if not user or not user['password_hash'] or not valid_password:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Invalid email or password')
    await session.commit()
    async with session.begin():
        is_admin = await grant_configured_admin_role(session, user['id'], payload.email)
        token = await create_login(session, user['id'])
    result = self_user({**dict(user), 'id': user['public_id'], 'role': 'admin' if is_admin else user['role']})
    set_session(response, token)
    return result


@app.post('/api/v1/auth/logout', status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, session: AsyncSession = Depends(db_session)):
    await csrf_origin(request)
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        await session.commit()
        async with session.begin():
            await session.execute(text('UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=:hash AND revoked_at IS NULL'),
                                  {'hash': hashlib.sha256(token.encode()).hexdigest()})
    response.delete_cookie(settings.session_cookie_name, path='/', secure=settings.cookie_secure, httponly=True, samesite='lax')


@app.get('/api/v1/auth/me')
async def me(request: Request, session: AsyncSession = Depends(db_session)):
    try:
        return self_user(await current_user(request, session))
    except HTTPException as exc:
        if exc.status_code == 401:
            return None
        raise


class SocialLinkInput(BaseModel):
    platform: str = Field(min_length=1, max_length=40)
    url: str = Field(min_length=8, max_length=500)
    label: str | None = Field(default=None, max_length=80)

    @field_validator('platform', 'label')
    @classmethod
    def clean_text(cls, value):
        return value.strip() if value is not None else value

    @field_validator('url')
    @classmethod
    def valid_link(cls, value):
        parsed = urlsplit(value.strip())
        if parsed.scheme not in {'https', 'http'} or not parsed.netloc:
            raise ValueError('Social link must be an http(s) URL')
        return value.strip()


class ProfileInput(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    bio: str | None = Field(default=None, max_length=5000)
    city: str | None = Field(default=None, max_length=150)
    birthDate: date | None = None
    maritalStatus: str | None = Field(default=None, max_length=50)
    hasCar: bool | None = None
    workSchedule: str | None = Field(default=None, max_length=255)
    socialLinks: list[SocialLinkInput] | None = Field(default=None, max_length=5)

    @field_validator('name', 'city', 'bio', 'maritalStatus', 'workSchedule')
    @classmethod
    def clean(cls, value):
        if value is not None and not value.strip() and value != '':
            raise ValueError('Field cannot be whitespace')
        return value.strip() if value is not None else value

    @field_validator('birthDate')
    @classmethod
    def birth_date_not_future(cls, value):
        if value is not None and value > datetime.now(timezone.utc).date():
            raise ValueError('Birth date cannot be in the future')
        return value


@app.patch('/api/v1/profile')
async def patch_profile(payload: ProfileInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    values = payload.model_dump(exclude_unset=True)
    if not values:
        return self_user(user)
    user_columns = {'name': 'name', 'bio': 'bio', 'city': 'city'}
    profile_columns = {
        'birthDate': 'birth_date',
        'maritalStatus': 'marital_status',
        'hasCar': 'has_car',
        'workSchedule': 'work_schedule',
        'socialLinks': 'social_links',
    }
    user_values = {key: value for key, value in values.items() if key in user_columns}
    profile_values = {key: value for key, value in values.items() if key in profile_columns}
    if 'socialLinks' in profile_values:
        profile_values['socialLinks'] = json.dumps(profile_values['socialLinks'])
    await session.commit()
    async with session.begin():
        if user_values:
            sets = ', '.join(f'{user_columns[key]}=:{key}' for key in user_values)
            await session.execute(text(f'UPDATE users SET {sets},updated_at=now() WHERE id=:id'), {
                **user_values,
                'id': user['db_id'],
            })
        if profile_values:
            profile_keys = list(profile_values)
            columns = ', '.join(['user_id', *(profile_columns[key] for key in profile_keys), 'updated_at'])
            bindings = ', '.join([':id', *(f':{key}' for key in profile_keys), 'now()'])
            updates = ', '.join(f'{profile_columns[key]}=EXCLUDED.{profile_columns[key]}' for key in profile_keys)
            await session.execute(text(
                f'INSERT INTO user_profiles ({columns}) VALUES ({bindings}) '
                f'ON CONFLICT (user_id) DO UPDATE SET {updates},updated_at=now()'
            ), {**profile_values, 'id': user['db_id']})
    await restart_redis_cache()
    result = {**user, **user_values, **profile_values}
    if 'birthDate' in profile_values:
        result['age'] = age_from_birth_date(profile_values['birthDate'])
    return self_user(result)


def image_extension(data: bytes):
    if data.startswith(b'\xff\xd8\xff'):
        return '.jpg', 'image/jpeg'
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return '.png', 'image/png'
    if len(data) >= 12 and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return '.webp', 'image/webp'
    return None


@app.post('/api/v1/profile/avatar')
async def avatar(request: Request, file: UploadFile = File(...), user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    data = await file.read(settings.max_avatar_bytes + 1)
    kind = image_extension(data)
    if len(data) > settings.max_avatar_bytes or not kind:
        raise HTTPException(422, 'Avatar must be a JPEG, PNG, or WebP image up to 5 MB')
    extension, content_type = kind
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in {'JPEG', 'PNG', 'WEBP'} or image.width > 4096 or image.height > 4096:
                raise HTTPException(422, 'Unsupported avatar image or dimensions')
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(422, 'Invalid avatar image')
    media_id = uuid4().hex
    filename = media_id + extension
    path = settings.upload_dir / filename
    try:
        path.write_bytes(data)
    except OSError:
        raise HTTPException(503, 'Avatar storage unavailable')
    try:
        await session.commit()
        async with session.begin():
            old = await session.scalar(text('SELECT filename FROM user_avatars WHERE user_id=:id'), {'id': user['db_id']})
            await session.execute(text("""INSERT INTO user_avatars(id,user_id,filename,content_type) VALUES (:media,:user,:file,:type)
                ON CONFLICT (user_id) DO UPDATE SET id=EXCLUDED.id,filename=EXCLUDED.filename,content_type=EXCLUDED.content_type,created_at=now()"""),
                {'media': media_id, 'user': user['db_id'], 'file': filename, 'type': content_type})
            await session.execute(text('UPDATE users SET avatar_url=:url,updated_at=now() WHERE id=:id'),
                                  {'url': f'/media/{media_id}', 'id': user['db_id']})
        if old:
            try:
                (settings.upload_dir / old).unlink(missing_ok=True)
            except OSError:
                # The new DB row and file are already committed; cleanup can be retried.
                pass
    except Exception:
        path.unlink(missing_ok=True)
        raise
    await restart_redis_cache()
    return self_user({**user, 'avatarUrl': f'/media/{media_id}'})


@app.get('/media/{media_id}')
async def media(media_id: str, session: AsyncSession = Depends(db_session)):
    if not media_id.isalnum() or len(media_id) > 64:
        raise HTTPException(404, 'Media not found')
    item = (await session.execute(text('SELECT filename,content_type FROM user_avatars WHERE id=:id'), {'id': media_id})).mappings().first()
    if not item:
        raise HTTPException(404, 'Media not found')
    path = settings.upload_dir / item['filename']
    if not path.is_file():
        raise HTTPException(404, 'Media not found')
    return FileResponse(path, media_type=item['content_type'], headers={'X-Content-Type-Options': 'nosniff'})


async def find_public_user(session: AsyncSession, public_id: str, viewer_id: int | None = None):
    user = (await session.execute(text('''SELECT u.id AS db_id,u.public_id AS id,u.name,COALESCE(u.city,'') AS city,
        u.avatar_url AS "avatarUrl",COALESCE(u.bio,'') AS bio,p.social_links AS "socialLinks",
        p.marital_status AS "maritalStatus",p.has_car AS "hasCar",p.work_schedule AS "workSchedule",
        EXTRACT(YEAR FROM age(current_date,p.birth_date))::integer AS age,
        (SELECT count(*)::integer FROM events e WHERE e.organizer_id=u.id) AS "eventCount",
        (SELECT count(*)::integer FROM user_follows f WHERE f.follower_id=u.id) AS "subscriptionsCount",
        (SELECT count(*)::integer FROM user_follows f WHERE f.followed_id=u.id) AS "followersCount",
        CASE WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.name='ADMIN') THEN 'admin'
          WHEN EXISTS (SELECT 1 FROM organization_members om JOIN organizations o ON o.id=om.organization_id WHERE om.user_id=u.id AND om.role='OWNER' AND o.status='APPROVED') THEN 'organization'
          ELSE 'user' END AS role
        FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id
        WHERE u.public_id=:id AND u.status='ACTIVE' '''), {'id': public_id})).mappings().first()
    if not user:
        raise HTTPException(404, 'User not found')
    result = public_user(dict(user))
    if viewer_id is not None and viewer_id != user['db_id']:
        result['viewerFollows'] = bool(await session.scalar(text('''SELECT 1 FROM user_follows
            WHERE follower_id=:viewer AND followed_id=:target'''), {'viewer': viewer_id, 'target': user['db_id']}))
    return result


@app.get('/api/v1/users/{user_id}')
async def user_profile(user_id: str, request: Request, session: AsyncSession = Depends(db_session)):
    viewer = None
    try:
        viewer = await current_user(request, session)
    except HTTPException as exc:
        if exc.status_code != 401:
            raise
    return await find_public_user(session, user_id, viewer['db_id'] if viewer else None)


@app.post('/api/v1/users/{user_id}/follow')
async def toggle_user_follow(user_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        target = (await session.execute(text('''SELECT id FROM users
            WHERE public_id=:id AND status='ACTIVE' FOR SHARE'''), {'id': user_id})).mappings().first()
        if not target:
            raise HTTPException(404, 'User not found')
        if target['id'] == user['db_id']:
            raise HTTPException(422, 'You cannot follow yourself')
        exists = await session.scalar(text('''SELECT 1 FROM user_follows
            WHERE follower_id=:follower AND followed_id=:followed'''),
            {'follower': user['db_id'], 'followed': target['id']})
        if exists:
            await session.execute(text('''DELETE FROM user_follows
                WHERE follower_id=:follower AND followed_id=:followed'''),
                {'follower': user['db_id'], 'followed': target['id']})
        else:
            await session.execute(text('''INSERT INTO user_follows(follower_id,followed_id)
                VALUES (:follower,:followed)'''), {'follower': user['db_id'], 'followed': target['id']})
    await restart_redis_cache()
    return {'active': not bool(exists)}


async def event_rows(session, city: str | None, public_only=True):
    where = "e.status='PUBLISHED'" if public_only else 'TRUE'
    params = {}
    if city:
        where += ' AND lower(e.city)=lower(:city)'
        params['city'] = city.strip()
    events = await rows(session, f'''SELECT e.id AS internal_id,e.public_id AS id,s.public_id AS "sportId",u.public_id AS "organizerUserId",
      o.public_id AS "organizationId",o.name AS "organizationName",e.title,COALESCE(e.description,'') AS description,
      COALESCE(e.location,'') AS address,e.district,e.city,e.start_at AS "startsAt",e.capacity,
      e.join_mode AS "joinMode",CASE WHEN e.status='PUBLISHED' THEN 'published' ELSE 'unpublished' END AS status,e.level,
      e.min_age AS "minAge",e.image_url AS "imageUrl",e.rating,e.event_type AS "eventType",
      e.latitude::float AS latitude,e.longitude::float AS longitude,
      (SELECT count(*) FROM event_registrations r WHERE r.event_id=e.id AND r.status='REGISTERED') AS "confirmedCount"
      FROM events e JOIN sports s ON s.id=e.sport_id JOIN users u ON u.id=e.organizer_id
      LEFT JOIN organizations o ON o.id=e.organization_id WHERE {where} ORDER BY e.start_at,e.id''', params)
    for event in events:
        event['startsAt'] = timestamp(event['startsAt'])
        event['rating'] = float(event['rating'])
        event['level'] = float(event['level'])
        del event['internal_id']
    return events


async def notification_rows(session: AsyncSession, user_id: int):
    items = await rows(session, '''SELECT 'n-' || n.id AS id,n.type,n.title,n.message AS body,n.is_read AS "isRead",
       n.created_at AS "createdAt",e.public_id AS "eventId",o.public_id AS "organizationId",s.name AS "eventTag",e.start_at AS "eventStart"
       FROM notifications n LEFT JOIN events e ON e.id=n.event_id LEFT JOIN organizations o ON o.id=n.organization_id
       LEFT JOIN sports s ON s.id=e.sport_id
       WHERE n.user_id=:user AND n.dismissed_at IS NULL ORDER BY n.created_at DESC,n.id DESC''', {'user': user_id})
    for item in items:
        item['createdAt'] = timestamp(item['createdAt'])
        if item.get('eventStart'):
            item['eventDate'] = timestamp(item.pop('eventStart'))
        else:
            item.pop('eventStart', None)
        if item.get('eventId'):
            if item.get('type') == 'event_moderation':
                item['linkUrl'] = '/my-events'
                item['linkText'] = 'Мои события'
            else:
                item['linkUrl'] = f"/events/{item['eventId']}"
                item['linkText'] = 'Открыть событие'
        elif item.get('organizationId'):
            item['linkUrl'] = '/org'
            item['linkText'] = 'Открыть организацию'
        item.pop('eventId', None)
        item.pop('organizationId', None)
    return items


async def build_state(session: AsyncSession, city: str | None, user: dict | None):
    selected_city = (city or settings.default_city or '').strip()
    # A missing city must not leak an unfiltered nationwide feed.
    events = await event_rows(session, selected_city) if selected_city else []
    event_ids = [e['id'] for e in events]
    if not event_ids:
        notifications = await notification_rows(session, user['db_id']) if user else []
        return dict(version=1, currentUserId=user['id'] if user else None, accounts=[], city=selected_city,
                    users=[public_user(user)] if user else [], organizations=[], sports=[], events=[], participations=[],
                    comments=[], notifications=notifications, favorites=[], likedEvents=[])
    params = {'ids': event_ids, 'user_id': user['db_id'] if user else -1}
    users = await rows(session, '''SELECT DISTINCT u.public_id AS id,u.name,COALESCE(u.city,'') AS city,u.avatar_url AS "avatarUrl",COALESCE(u.bio,'') AS bio,
       p.birth_date AS "birthDate",p.marital_status AS "maritalStatus",
       p.has_car AS "hasCar",p.work_schedule AS "workSchedule",p.social_links AS "socialLinks",
       EXTRACT(YEAR FROM age(current_date,p.birth_date))::integer AS age,
       (SELECT count(*)::integer FROM events owner_events WHERE owner_events.organizer_id=u.id) AS "eventCount",
       (SELECT count(*)::integer FROM user_follows f WHERE f.follower_id=u.id) AS "subscriptionsCount",
       (SELECT count(*)::integer FROM user_follows f WHERE f.followed_id=u.id) AS "followersCount",
       CASE WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.name='ADMIN') THEN 'admin'
         WHEN EXISTS (SELECT 1 FROM organization_members om JOIN organizations o ON o.id=om.organization_id WHERE om.user_id=u.id AND om.role='OWNER' AND o.status='APPROVED') THEN 'organization' ELSE 'user' END AS role
       FROM users u LEFT JOIN user_profiles p ON p.user_id=u.id WHERE u.id IN (
        SELECT organizer_id FROM events WHERE public_id = ANY(:ids)
        UNION SELECT c.user_id FROM event_comments c JOIN events e ON e.id=c.event_id WHERE e.public_id=ANY(:ids) AND c.status='VISIBLE'
        UNION SELECT r.user_id FROM event_registrations r JOIN events e ON e.id=r.event_id
          WHERE e.public_id=ANY(:ids) AND e.organizer_id=:user_id
        UNION SELECT :user_id) ORDER BY u.public_id''', params)
    organizations = await rows(session, '''SELECT DISTINCT o.public_id AS id,o.name,COALESCE(o.description,'') AS description,lower(o.status) AS status,
       owner.public_id AS "ownerUserId" FROM organizations o JOIN events e ON e.organization_id=o.id
       LEFT JOIN organization_members m ON m.organization_id=o.id AND m.role='OWNER' LEFT JOIN users owner ON owner.id=m.user_id
       WHERE e.public_id=ANY(:ids) ORDER BY o.public_id''', params)
    sports = await rows(session, '''SELECT s.public_id AS id,s.name,s.slug,count(e.id)::integer AS "eventCount" FROM sports s
       JOIN events e ON e.sport_id=s.id AND e.status='PUBLISHED' AND e.public_id=ANY(:ids)
       WHERE s.status='APPROVED' GROUP BY s.id ORDER BY s.id''', params)
    comments = await rows(session, '''SELECT 'c-' || c.id AS id,e.public_id AS "eventId",u.public_id AS "authorId",c.text,c.kind,c.created_at AS "createdAt"
       FROM event_comments c JOIN events e ON e.id=c.event_id JOIN users u ON u.id=c.user_id
       WHERE e.public_id=ANY(:ids) AND c.status='VISIBLE' ORDER BY c.id''', params)
    for comment in comments: comment['createdAt'] = timestamp(comment['createdAt'])
    participations = []
    favorites, liked = [], []
    notifications = []
    if user:
        notifications = await notification_rows(session, user['db_id'])
        participations = await rows(session, '''SELECT 'part-' || r.id AS id,e.public_id AS "eventId",u.public_id AS "userId",
           CASE r.status WHEN 'REGISTERED' THEN 'confirmed' WHEN 'PENDING' THEN 'pending' WHEN 'CANCELLED' THEN 'cancelled' ELSE 'rejected' END AS status,r.registered_at AS "createdAt"
           FROM event_registrations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id
           WHERE e.public_id=ANY(:ids) AND (r.user_id=:user_id OR e.organizer_id=:user_id) ORDER BY r.id''', params)
        for item in participations: item['createdAt'] = timestamp(item['createdAt'])
        favorites = [x['id'] for x in await rows(session, '''SELECT e.public_id AS id FROM event_favorites f JOIN events e ON e.id=f.event_id
            WHERE f.user_id=:user_id AND e.public_id=ANY(:ids)''', params)]
        liked = [x['id'] for x in await rows(session, '''SELECT e.public_id AS id FROM event_likes f JOIN events e ON e.id=f.event_id
            WHERE f.user_id=:user_id AND e.public_id=ANY(:ids)''', params)]
    return dict(version=1, currentUserId=user['id'] if user else None, accounts=[], city=selected_city,
                users=[public_user(u) for u in users], organizations=[{**org, 'sports': []} for org in organizations],
                sports=sports, events=events, participations=participations, comments=comments, notifications=notifications,
                favorites=favorites, likedEvents=liked)


@app.get('/health')
async def health(session: AsyncSession = Depends(db_session)):
    await session.execute(text('SELECT 1'))
    return {'status': 'ok'}


@app.get('/api/v1/state')
async def state(request: Request, city: str | None = None, session: AsyncSession = Depends(db_session)):
    user = None
    try:
        user = await current_user(request, session)
    except HTTPException as exc:
        if exc.status_code != 401: raise
    return await build_state(session, city, user)


@app.get('/api/v1/events')
async def events(city: str | None = None, session: AsyncSession = Depends(db_session)):
    if not city or not city.strip():
        return []
    selected = city.strip()
    cache_key = 'public:events:v2:' + hashlib.sha256(selected.casefold().encode()).hexdigest()
    try:
        cached = await redis.get(cache_key)
        if cached is not None:
            return json.loads(cached)
    except (RedisError, ValueError):
        logger.info('Reading public catalog directly from PostgreSQL')
    result = await event_rows(session, selected)
    try:
        await redis.set(cache_key, json.dumps(result, ensure_ascii=False), ex=settings.cache_ttl_seconds)
    except RedisError:
        logger.info('Redis unavailable; public catalog not cached')
    return result


@app.get('/api/v1/events/{event_id}')
async def event(event_id: str, session: AsyncSession = Depends(db_session)):
    items = await event_rows(session, None)
    item = next((value for value in items if value['id'] == event_id), None)
    if not item: raise HTTPException(404, 'Event not found')
    return item


@app.get('/api/v1/events/{event_id}/participants')
async def event_participants(event_id: str, session: AsyncSession = Depends(db_session)):
    participants = await rows(session, '''SELECT u.public_id AS id,u.name,COALESCE(u.city,'') AS city,
        u.avatar_url AS "avatarUrl",COALESCE(u.bio,'') AS bio,p.social_links AS "socialLinks",
        (SELECT count(*)::integer FROM events owner_events WHERE owner_events.organizer_id=u.id) AS "eventCount",
        'user' AS role
        FROM event_registrations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id
        LEFT JOIN user_profiles p ON p.user_id=u.id
        WHERE e.public_id=:event AND e.status='PUBLISHED' AND r.status='REGISTERED' AND u.status='ACTIVE'
        ORDER BY r.registered_at,u.id''', {'event': event_id})
    return [public_user(participant) for participant in participants]


@app.patch('/api/v1/notifications/{notification_id}/dismiss', status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_notification(notification_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    if not notification_id.startswith('n-') or not notification_id[2:].isdigit():
        raise HTTPException(404, 'Notification not found')
    await session.commit()
    async with session.begin():
        updated = await session.scalar(text('''UPDATE notifications SET dismissed_at=now()
            WHERE id=:id AND user_id=:user AND dismissed_at IS NULL RETURNING id'''),
            {'id': int(notification_id[2:]), 'user': user['db_id']})
        if updated is None:
            raise HTTPException(404, 'Notification not found')
    await restart_redis_cache()


class OrganizationApplicationInput(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str = Field(default='', max_length=10000)
    city: str = Field(min_length=1, max_length=150)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=500)
    comment: str = Field(default='', max_length=4000)

    @field_validator('name', 'city', 'description', 'phone', 'website', 'comment')
    @classmethod
    def clean_organization_text(cls, value):
        return value.strip() if value is not None else value

    @field_validator('website')
    @classmethod
    def organization_website(cls, value):
        if not value:
            return value
        parsed = urlsplit(value)
        if parsed.scheme not in {'https', 'http'} or not parsed.netloc:
            raise ValueError('Website must be an http(s) URL')
        return value


class OrganizationReviewInput(BaseModel):
    decision: str = Field(pattern='^(approved|rejected)$')
    comment: str = Field(default='', max_length=4000)

    @field_validator('comment')
    @classmethod
    def clean_comment(cls, value):
        return value.strip()


class EventModerationInput(BaseModel):
    action: str = Field(pattern='^(unpublish|remove)$')
    reason: str = Field(default='', max_length=4000)

    @field_validator('reason')
    @classmethod
    def clean_reason(cls, value):
        return value.strip()


class EventInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default='', max_length=10000)
    address: str = Field(min_length=1, max_length=255)
    district: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=150)
    startsAt: datetime
    capacity: int = Field(gt=0)
    joinMode: str = Field(pattern='^(open|application)$')
    level: float = Field(ge=0.5, le=5)
    sportName: str = Field(min_length=1, max_length=100)
    minAge: int | None = Field(default=None, ge=0, le=120)
    eventType: str = Field(default='game', pattern='^(game|training|tournament)$')
    organizationId: str | None = Field(default=None, min_length=3, max_length=80)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator('title', 'address', 'sportName')
    @classmethod
    def not_blank(cls, value):
        value = value.strip()
        if not value: raise ValueError('Field cannot be blank')
        return value

    @field_validator('level')
    @classmethod
    def half_star_level(cls, value):
        normalized = round(value * 2) / 2
        if abs(value - normalized) > 1e-9:
            raise ValueError('level must use 0.5-star increments')
        return normalized


class SportRequestInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)

    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Sport name cannot be blank')
        return value


class SportReviewInput(BaseModel):
    decision: str = Field(pattern='^(approved|rejected)$')


@app.post('/api/v1/sports/requests', status_code=status.HTTP_201_CREATED)
async def request_sport(payload: SportRequestInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        existing = (await session.execute(text('''SELECT id,public_id,status,requested_by FROM sports
            WHERE lower(name)=lower(:name) FOR UPDATE'''), {'name': payload.name})).mappings().first()
        if existing:
            if existing['status'] == 'APPROVED':
                raise HTTPException(409, 'This sport is already available')
            if existing['status'] == 'PENDING':
                if existing['requested_by'] == user['db_id']:
                    return {'id': existing['public_id'], 'status': 'pending'}
                raise HTTPException(409, 'This sport is already awaiting moderation')
            # The name is unique. Re-open a rejected suggestion instead of making
            # a second row that would violate the catalog's unique-name constraint.
            sport_id = existing['public_id']
            await session.execute(text('''UPDATE sports
                SET status='PENDING',requested_by=:user,reviewed_by=NULL,reviewed_at=NULL
                WHERE id=:id'''), {'user': user['db_id'], 'id': existing['id']})
        else:
            sport_id = 'sp-' + uuid4().hex[:12]
            await session.execute(text('''INSERT INTO sports(public_id,name,slug,status,requested_by)
                VALUES (:id,:name,:slug,'PENDING',:user)'''), {
                    'id': sport_id, 'name': payload.name, 'slug': 'sport-' + uuid4().hex[:12], 'user': user['db_id'],
                })
        admins = await rows(session, '''SELECT DISTINCT ur.user_id FROM user_roles ur
            JOIN roles r ON r.id=ur.role_id WHERE r.name='ADMIN' ''')
        for admin in admins:
            await session.execute(text('''INSERT INTO notifications(user_id,type,title,message)
                VALUES (:user,'sport_review','Новый вид спорта',:message)'''), {
                    'user': admin['user_id'], 'message': f'На модерацию предложен вид спорта «{payload.name}».',
                })
    await restart_redis_cache()
    return {'id': sport_id, 'status': 'pending'}


@app.get('/api/v1/admin/sports')
async def pending_sports(user=Depends(require_admin), session: AsyncSession = Depends(db_session)):
    return await rows(session, '''SELECT s.public_id AS id,s.name,s.slug,s.created_at AS "createdAt",
        u.public_id AS "requestedById",u.name AS "requestedByName" FROM sports s
        LEFT JOIN users u ON u.id=s.requested_by WHERE s.status='PENDING' ORDER BY s.created_at,s.id''')


@app.patch('/api/v1/admin/sports/{sport_id}')
async def review_sport(sport_id: str, payload: SportReviewInput, user=Depends(require_admin), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        sport = (await session.execute(text('''SELECT id,name,requested_by FROM sports
            WHERE public_id=:id AND status='PENDING' FOR UPDATE'''), {'id': sport_id})).mappings().first()
        if not sport:
            raise HTTPException(404, 'Pending sport not found')
        status_value = 'APPROVED' if payload.decision == 'approved' else 'REJECTED'
        await session.execute(text('''UPDATE sports SET status=:status,reviewed_by=:reviewer,reviewed_at=now()
            WHERE id=:id'''), {'status': status_value, 'reviewer': user['db_id'], 'id': sport['id']})
        if sport['requested_by']:
            await session.execute(text('''INSERT INTO notifications(user_id,type,title,message)
                VALUES (:user,'sport_review',:title,:message)'''), {
                    'user': sport['requested_by'],
                    'title': f'Вид спорта «{sport["name"]}» {"одобрен" if status_value == "APPROVED" else "отклонён"}',
                    'message': 'Теперь его можно выбрать при создании мероприятия.' if status_value == 'APPROVED' else 'Попробуйте уточнить название и отправить другую заявку.',
                })
    await restart_redis_cache()
    return {'id': sport_id, 'status': payload.decision}


@app.post('/api/v1/organizations/applications', status_code=status.HTTP_201_CREATED)
async def request_organization(payload: OrganizationApplicationInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        has_pending = await session.scalar(text('''SELECT 1 FROM organization_members m
            JOIN organizations o ON o.id=m.organization_id
            WHERE m.user_id=:user AND m.role='OWNER' AND o.status='PENDING' '''), {'user': user['db_id']})
        if has_pending:
            raise HTTPException(409, 'You already have an organization awaiting review')
        organization_id = 'org-' + uuid4().hex[:12]
        internal_id = await session.scalar(text('''INSERT INTO organizations(public_id,name,description,city,latitude,longitude,email,phone,website,status)
            VALUES (:id,:name,:description,:city,:latitude,:longitude,:email,:phone,:website,'PENDING') RETURNING id'''), {
                'id': organization_id, 'name': payload.name, 'description': payload.description, 'city': payload.city,
                'latitude': payload.latitude, 'longitude': payload.longitude, 'email': str(payload.email) if payload.email else None,
                'phone': payload.phone or None, 'website': payload.website or None,
            })
        await session.execute(text('''INSERT INTO organization_members(organization_id,user_id,role)
            VALUES (:organization,:user,'OWNER')'''), {'organization': internal_id, 'user': user['db_id']})
        await session.execute(text('''INSERT INTO organization_applications(organization_id,submitted_by,status,comment)
            VALUES (:organization,:user,'PENDING',:comment)'''), {
                'organization': internal_id, 'user': user['db_id'], 'comment': payload.comment,
            })
        admins = await rows(session, '''SELECT DISTINCT ur.user_id FROM user_roles ur
            JOIN roles r ON r.id=ur.role_id WHERE r.name='ADMIN' ''')
        for admin in admins:
            await session.execute(text('''INSERT INTO notifications(user_id,organization_id,type,title,message)
                VALUES (:user,:organization,'organization_review','Новая заявка организации',:message)'''), {
                    'user': admin['user_id'], 'organization': internal_id,
                    'message': f'Организация «{payload.name}» ожидает модерации.',
                })
    await restart_redis_cache()
    return {'id': organization_id, 'status': 'pending'}


@app.get('/api/v1/organizations/mine')
async def my_organizations(user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    items = await rows(session, '''SELECT o.public_id AS id,o.name,COALESCE(o.description,'') AS description,o.city,
        o.latitude::float AS latitude,o.longitude::float AS longitude,o.email,o.phone,o.website,lower(o.status) AS status,
        lower(m.role) AS role,a.comment AS "applicationComment",a.review_comment AS "reviewComment",a.reviewed_at AS "reviewedAt"
        FROM organization_members m JOIN organizations o ON o.id=m.organization_id
        LEFT JOIN LATERAL (SELECT * FROM organization_applications x WHERE x.organization_id=o.id
            ORDER BY x.created_at DESC,x.id DESC LIMIT 1) a ON TRUE
        WHERE m.user_id=:user ORDER BY o.created_at DESC,o.id DESC''', {'user': user['db_id']})
    for item in items:
        item['reviewedAt'] = timestamp(item['reviewedAt'])
    return items


@app.get('/api/v1/admin/organizations')
async def pending_organizations(user=Depends(require_admin), session: AsyncSession = Depends(db_session)):
    items = await rows(session, '''SELECT o.public_id AS id,o.name,COALESCE(o.description,'') AS description,o.city,
        o.latitude::float AS latitude,o.longitude::float AS longitude,o.email,o.phone,o.website,
        a.comment,u.public_id AS "requestedById",u.name AS "requestedByName",a.created_at AS "createdAt"
        FROM organization_applications a JOIN organizations o ON o.id=a.organization_id JOIN users u ON u.id=a.submitted_by
        WHERE a.status='PENDING' AND o.status='PENDING' ORDER BY a.created_at,a.id''')
    for item in items:
        item['createdAt'] = timestamp(item['createdAt'])
    return items


@app.patch('/api/v1/admin/organizations/{organization_id}')
async def review_organization(organization_id: str, payload: OrganizationReviewInput, user=Depends(require_admin), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        application = (await session.execute(text('''SELECT a.id,a.submitted_by,o.id AS organization_id,o.name
            FROM organization_applications a JOIN organizations o ON o.id=a.organization_id
            WHERE o.public_id=:id AND a.status='PENDING' AND o.status='PENDING'
            ORDER BY a.created_at DESC,a.id DESC LIMIT 1 FOR UPDATE OF a,o'''), {'id': organization_id})).mappings().first()
        if not application:
            raise HTTPException(404, 'Pending organization application not found')
        status_value = 'APPROVED' if payload.decision == 'approved' else 'REJECTED'
        await session.execute(text('''UPDATE organizations SET status=:status,updated_at=now() WHERE id=:id'''),
                              {'status': status_value, 'id': application['organization_id']})
        await session.execute(text('''UPDATE organization_applications SET status=:status,reviewed_by=:reviewer,
            reviewed_at=now(),review_comment=:comment WHERE id=:id'''), {
                'status': status_value, 'reviewer': user['db_id'], 'comment': payload.comment, 'id': application['id'],
            })
        await session.execute(text('''INSERT INTO notifications(user_id,organization_id,type,title,message)
            VALUES (:user,:organization,'organization_review',:title,:message)'''), {
                'user': application['submitted_by'], 'organization': application['organization_id'],
                'title': f'Организация «{application["name"]}» {"одобрена" if status_value == "APPROVED" else "отклонена"}',
                'message': 'Теперь можно публиковать мероприятия от имени организации.' if status_value == 'APPROVED'
                    else (payload.comment or 'Заявка отклонена. Уточните данные и отправьте новую заявку.'),
            })
    await restart_redis_cache()
    return {'id': organization_id, 'status': payload.decision}


@app.get('/api/v1/organizations/{organization_id}')
async def organization_profile(organization_id: str, session: AsyncSession = Depends(db_session)):
    organization = (await session.execute(text('''SELECT public_id AS id,name,COALESCE(description,'') AS description,city,
        latitude::float AS latitude,longitude::float AS longitude,email,phone,website
        FROM organizations WHERE public_id=:id AND status='APPROVED' '''), {'id': organization_id})).mappings().first()
    if not organization:
        raise HTTPException(404, 'Organization not found')
    events = [item for item in await event_rows(session, None) if item.get('organizationId') == organization_id]
    return {**dict(organization), 'events': events}


async def approved_owned_organization(session: AsyncSession, public_id: str, user_id: int):
    organization = (await session.execute(text('''SELECT o.id,o.public_id,o.name FROM organizations o
        JOIN organization_members m ON m.organization_id=o.id
        WHERE o.public_id=:id AND o.status='APPROVED' AND m.user_id=:user AND m.role='OWNER' FOR SHARE'''),
        {'id': public_id, 'user': user_id})).mappings().first()
    if not organization:
        raise HTTPException(422, 'Choose an approved organization that you manage')
    return organization


@app.get('/api/v1/admin/events')
async def admin_events(status_value: str | None = None, user=Depends(require_admin), session: AsyncSession = Depends(db_session)):
    status_value = (status_value or 'PUBLISHED').upper()
    if status_value not in {'PUBLISHED', 'UNPUBLISHED'}:
        raise HTTPException(422, 'Expected PUBLISHED or UNPUBLISHED status')
    items = await rows(session, '''SELECT e.public_id AS id,e.title,e.city,e.start_at AS "startsAt",e.status,
        u.public_id AS "organizerId",u.name AS "organizerName",o.public_id AS "organizationId",o.name AS "organizationName"
        FROM events e JOIN users u ON u.id=e.organizer_id LEFT JOIN organizations o ON o.id=e.organization_id
        WHERE e.status=:status ORDER BY e.start_at DESC,e.id DESC''', {'status': status_value})
    for item in items:
        item['startsAt'] = timestamp(item['startsAt'])
        item['status'] = item['status'].lower()
    return items


@app.patch('/api/v1/admin/events/{event_id}/moderation')
async def moderate_event(event_id: str, payload: EventModerationInput, user=Depends(require_admin), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        event = (await session.execute(text('''SELECT id,public_id,title,organizer_id,status FROM events
            WHERE public_id=:id FOR UPDATE'''), {'id': event_id})).mappings().first()
        if not event:
            raise HTTPException(404, 'Event not found')
        if event['status'] != 'PUBLISHED':
            raise HTTPException(409, 'Only published events can be removed from the catalog')
        await session.execute(text("UPDATE events SET status='UNPUBLISHED',updated_at=now() WHERE id=:id"), {'id': event['id']})
        await session.execute(text('''INSERT INTO event_moderations(event_id,admin_id,action,reason)
            VALUES (:event,:admin,:action,:reason)'''), {
                'event': event['id'], 'admin': user['db_id'], 'action': payload.action, 'reason': payload.reason or None,
            })
        await session.execute(text('''INSERT INTO notifications(user_id,event_id,type,title,message)
            VALUES (:user,:event,'event_moderation','Событие снято с публикации',:message)'''), {
                'user': event['organizer_id'], 'event': event['id'],
                'message': payload.reason or f'Событие «{event["title"]}» больше не отображается в каталоге.',
            })
    await restart_redis_cache()
    await broadcast_chat_message(event_id, {'type': 'event_unpublished', 'detail': 'Событие снято с публикации администратором.'})
    return {'id': event_id, 'status': 'unpublished'}


@app.post('/api/v1/events', status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    if payload.startsAt.tzinfo is None:
        raise HTTPException(422, 'startsAt must include a timezone')
    city = (payload.city or user.get('city') or '').strip()
    if not city:
        raise HTTPException(422, 'city is required')
    await session.commit()
    async with session.begin():
        sport = await session.scalar(text("SELECT id FROM sports WHERE lower(name)=lower(:name) AND status='APPROVED'"), {'name': payload.sportName})
        if sport is None:
            raise HTTPException(422, 'Choose an approved sport or submit a sport request for moderation')
        organization = await approved_owned_organization(session, payload.organizationId, user['db_id']) if payload.organizationId else None
        event_id = 'ev-' + uuid4().hex[:12]
        event_db_id = await session.scalar(text('''INSERT INTO events(public_id,organization_id,organizer_id,sport_id,title,description,event_type,location,district,city,start_at,
             capacity,join_mode,level,min_age,latitude,longitude,image_url,status,published_at) VALUES
             (:id,:organization,:user,:sport,:title,:description,:type,:address,:district,:city,:starts,:capacity,:mode,:level,:age,:latitude,:longitude,NULL,'PUBLISHED',now())
             RETURNING id'''),
             {'id': event_id, 'organization': organization['id'] if organization else None, 'user': user['db_id'], 'sport': sport, 'title': payload.title, 'description': payload.description.strip(),
              'type': payload.eventType, 'address': payload.address, 'district': payload.district, 'city': city, 'starts': payload.startsAt,
              'capacity': payload.capacity, 'mode': payload.joinMode, 'level': payload.level, 'age': payload.minAge,
              'latitude': payload.latitude, 'longitude': payload.longitude})
        if payload.eventType == 'tournament':
            # A sport specialization is inferred from prior event participation or organizing.
            # This avoids notifying unrelated athletes while keeping the MVP schema compact.
            recipients = await rows(session, '''SELECT DISTINCT candidate.user_id FROM (
                SELECT e.organizer_id AS user_id FROM events e WHERE e.sport_id=:sport
                UNION
                SELECT r.user_id FROM event_registrations r JOIN events e ON e.id=r.event_id WHERE e.sport_id=:sport AND r.status='REGISTERED'
            ) candidate WHERE candidate.user_id <> :organizer''', {'sport': sport, 'organizer': user['db_id']})
            for recipient in recipients:
                await session.execute(text('''INSERT INTO notifications(user_id,event_id,type,title,message)
                    VALUES (:user,:event,'tournament_invitation',:title,:message)'''), {
                    'user': recipient['user_id'], 'event': event_db_id,
                    'title': f'Новый турнир: {payload.title}',
                    'message': f'Открыта регистрация на турнир по {payload.sportName}.',
                })
    await restart_redis_cache()
    return {'id': event_id}


@app.patch('/api/v1/events/{event_id}')
async def update_event(event_id: str, payload: EventInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    if payload.startsAt.tzinfo is None:
        raise HTTPException(422, 'startsAt must include a timezone')
    city = (payload.city or '').strip()
    if not city:
        raise HTTPException(422, 'city is required')
    await session.commit()
    async with session.begin():
        event = (await session.execute(text('SELECT id,organizer_id,event_type,organization_id FROM events WHERE public_id=:id FOR UPDATE'),
                                       {'id': event_id})).mappings().first()
        if not event:
            raise HTTPException(404, 'Event not found')
        if event['organizer_id'] != user['db_id']:
            raise HTTPException(403, 'Only the organizer may edit the event')
        confirmed = await session.scalar(text("SELECT count(*) FROM event_registrations WHERE event_id=:id AND status='REGISTERED'"),
                                         {'id': event['id']})
        if confirmed > payload.capacity:
            raise HTTPException(409, 'Capacity cannot be below confirmed registrations')
        sport = await session.scalar(text("SELECT id FROM sports WHERE lower(name)=lower(:name) AND status='APPROVED'"),
                                     {'name': payload.sportName})
        if sport is None:
            raise HTTPException(422, 'Choose an approved sport or submit a sport request for moderation')
        organization = await approved_owned_organization(session, payload.organizationId, user['db_id']) if payload.organizationId else None
        await session.execute(text('''UPDATE events SET organization_id=:organization,sport_id=:sport,title=:title,description=:description,event_type=:type,
           location=:address,district=:district,city=:city,latitude=:latitude,longitude=:longitude,start_at=:starts,capacity=:capacity,
           join_mode=:mode,level=:level,min_age=:age,updated_at=now() WHERE id=:id'''), {
            'id': event['id'], 'organization': organization['id'] if organization else None, 'sport': sport, 'title': payload.title, 'description': payload.description.strip(),
            'type': payload.eventType, 'address': payload.address, 'district': payload.district, 'city': city,
            'latitude': payload.latitude, 'longitude': payload.longitude, 'starts': payload.startsAt,
            'capacity': payload.capacity, 'mode': payload.joinMode,
            'level': payload.level, 'age': payload.minAge,
        })
        if payload.eventType == 'tournament' and event['event_type'] != 'tournament':
            recipients = await rows(session, '''SELECT DISTINCT candidate.user_id FROM (
                SELECT e.organizer_id AS user_id FROM events e WHERE e.sport_id=:sport
                UNION
                SELECT r.user_id FROM event_registrations r JOIN events e ON e.id=r.event_id
                  WHERE e.sport_id=:sport AND r.status='REGISTERED'
            ) candidate WHERE candidate.user_id <> :organizer''', {'sport': sport, 'organizer': user['db_id']})
            for recipient in recipients:
                await session.execute(text('''INSERT INTO notifications(user_id,event_id,type,title,message)
                    VALUES (:user,:event,'tournament_invitation',:title,:message)'''), {
                    'user': recipient['user_id'], 'event': event['id'],
                    'title': f'Новый турнир: {payload.title}',
                    'message': f'Открыта регистрация на турнир по {payload.sportName}.',
                })
    await restart_redis_cache()
    return {'id': event_id}


async def create_event_chat_activity(session: AsyncSession, event_db_id: int, event_id: str, user: dict, kind: str):
    """Persist a join/leave line in the same ordered history as chat messages."""
    verb = 'присоединился(-ась) к мероприятию' if kind == 'PARTICIPANT_JOINED' else 'покинул(-а) мероприятие'
    created = (await session.execute(text('''INSERT INTO event_comments(event_id,user_id,text,kind)
        VALUES (:event,:user,:text,:kind) RETURNING id,created_at'''), {
            'event': event_db_id, 'user': user['db_id'], 'text': f"{user['name']} {verb}", 'kind': kind,
        })).mappings().one()
    return {'id': f"c-{created['id']}", 'eventId': event_id, 'authorId': user['id'],
            'text': f"{user['name']} {verb}", 'kind': kind, 'createdAt': timestamp(created['created_at'])}


@app.post('/api/v1/events/{event_id}/join', status_code=status.HTTP_201_CREATED)
async def join(event_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    activity = None
    await session.commit()
    async with session.begin():
        event = (await session.execute(text("SELECT id,organizer_id,capacity,join_mode,status FROM events WHERE public_id=:id FOR UPDATE"), {'id': event_id})).mappings().first()
        if not event or event['status'] != 'PUBLISHED': raise HTTPException(404, 'Published event not found')
        if event['organizer_id'] == user['db_id']: raise HTTPException(409, 'Organizers cannot join their own event')
        existing = (await session.execute(text('SELECT id,status FROM event_registrations WHERE event_id=:event AND user_id=:user'),
                                               {'event': event['id'], 'user': user['db_id']})).mappings().first()
        if existing and existing['status'] != 'CANCELLED': raise HTTPException(409, 'Already joined')
        registered = await session.scalar(text("SELECT count(*) FROM event_registrations WHERE event_id=:event AND status='REGISTERED'"), {'event': event['id']})
        if registered >= event['capacity'] and event['join_mode'] == 'open': raise HTTPException(409, 'Event is full')
        result = 'REGISTERED' if event['join_mode'] == 'open' else 'PENDING'
        if existing:
            await session.execute(text('UPDATE event_registrations SET status=:status,registered_at=now() WHERE id=:id'), {'status': result, 'id': existing['id']})
        else:
            await session.execute(text('INSERT INTO event_registrations(event_id,user_id,status) VALUES (:event,:user,:status)'),
                                  {'event': event['id'], 'user': user['db_id'], 'status': result})
        if result == 'REGISTERED':
            activity = await create_event_chat_activity(session, event['id'], event_id, user, 'PARTICIPANT_JOINED')
    await restart_redis_cache()
    if activity:
        await broadcast_chat_message(event_id, {'type': 'comment', 'comment': activity})
    return {'status': 'confirmed' if result == 'REGISTERED' else 'pending'}


@app.delete('/api/v1/events/{event_id}/join', status_code=status.HTTP_204_NO_CONTENT)
async def leave_event(event_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    activity = None
    await session.commit()
    async with session.begin():
        registration = (await session.execute(text('''SELECT r.id,e.id AS event_db_id,e.public_id AS event_id
            FROM event_registrations r JOIN events e ON e.id=r.event_id
            WHERE e.public_id=:event AND r.user_id=:user AND e.status='PUBLISHED' AND r.status='REGISTERED'
            FOR UPDATE OF r,e'''), {'event': event_id, 'user': user['db_id']})).mappings().first()
        if not registration:
            raise HTTPException(404, 'Confirmed participation not found')
        await session.execute(text("UPDATE event_registrations SET status='CANCELLED' WHERE id=:id"), {'id': registration['id']})
        activity = await create_event_chat_activity(session, registration['event_db_id'], event_id, user, 'PARTICIPANT_LEFT')
    await restart_redis_cache()
    await broadcast_chat_message(event_id, {'type': 'comment', 'comment': activity})


class CommentInput(BaseModel):
    text: str = Field(min_length=1, max_length=5000)

    @field_validator('text')
    @classmethod
    def comment_not_blank(cls, value):
        if not value.strip(): raise ValueError('Comment cannot be empty')
        return value.strip()


async def broadcast_chat_message(event_id: str, message: dict):
    async with _chat_connections_lock:
        connections = list(_chat_connections.get(event_id, set()))
    disconnected = []
    for connection in connections:
        try:
            await connection.send_json(message)
        except (RuntimeError, WebSocketDisconnect):
            disconnected.append(connection)
    if disconnected:
        async with _chat_connections_lock:
            current = _chat_connections.get(event_id)
            if current:
                current.difference_update(disconnected)
                if not current:
                    _chat_connections.pop(event_id, None)


async def websocket_chat_user(websocket: WebSocket, session: AsyncSession):
    token = websocket.cookies.get(settings.session_cookie_name)
    if not token:
        return None
    digest = hashlib.sha256(token.encode()).hexdigest()
    user = (await session.execute(text('''SELECT u.id AS db_id,u.public_id AS id FROM auth_sessions s
        JOIN users u ON u.id=s.user_id WHERE s.token_hash=:hash AND s.revoked_at IS NULL
        AND s.expires_at > now() AND u.status='ACTIVE' '''), {'hash': digest})).mappings().first()
    return dict(user) if user else None


def websocket_origin_trusted(websocket: WebSocket):
    origin = websocket.headers.get('origin')
    if not origin:
        return False
    clean_origin = origin.rstrip('/')
    if clean_origin in settings.allowed_origins:
        return True
    parsed = urlsplit(clean_origin)
    return parsed.scheme in {'http', 'https'} and parsed.netloc == websocket.headers.get('host', '')


@app.websocket('/api/v1/events/{event_id}/ws')
async def event_chat_socket(websocket: WebSocket, event_id: str):
    if not websocket_origin_trusted(websocket):
        await websocket.close(code=4403)
        return
    async with sessions() as session:
        event = (await session.execute(text('''SELECT id,organizer_id FROM events
            WHERE public_id=:id AND status='PUBLISHED' '''), {'id': event_id})).mappings().first()
        if not event:
            await websocket.close(code=4404)
            return
        user = await websocket_chat_user(websocket, session)
        can_write = False
        if user:
            participant = await session.scalar(text('''SELECT 1 FROM event_registrations
                WHERE event_id=:event AND user_id=:user AND status='REGISTERED' '''),
                {'event': event['id'], 'user': user['db_id']})
            can_write = event['organizer_id'] == user['db_id'] or bool(participant)
        await websocket.accept()
        async with _chat_connections_lock:
            _chat_connections.setdefault(event_id, set()).add(websocket)
        await websocket.send_json({'type': 'ready', 'canWrite': can_write})
        try:
            while True:
                payload = await websocket.receive_json()
                if not isinstance(payload, dict) or payload.get('type') != 'message':
                    await websocket.send_json({'type': 'error', 'detail': 'Unknown chat message'})
                    continue
                client_message_id = str(payload.get('clientMessageId') or '')
                if not client_message_id or len(client_message_id) > 100:
                    await websocket.send_json({'type': 'error', 'detail': 'Message identifier is required'})
                    continue
                if not user or not can_write:
                    await websocket.send_json({'type': 'error', 'clientMessageId': client_message_id,
                                               'detail': 'Only confirmed participants can write in this chat'})
                    continue
                current_access = (await session.execute(text('''SELECT e.status,e.organizer_id,
                    EXISTS(SELECT 1 FROM event_registrations r WHERE r.event_id=e.id AND r.user_id=:user
                        AND r.status='REGISTERED') AS is_participant
                    FROM events e WHERE e.id=:event'''),
                    {'event': event['id'], 'user': user['db_id']})).mappings().first()
                if not current_access or current_access['status'] != 'PUBLISHED':
                    await websocket.send_json({'type': 'event_unpublished',
                                               'detail': 'Событие больше недоступно для обсуждения.'})
                    await websocket.close(code=4404)
                    return
                if current_access['organizer_id'] != user['db_id'] and not current_access['is_participant']:
                    await websocket.send_json({'type': 'error', 'clientMessageId': client_message_id,
                                               'detail': 'Только подтверждённые участники могут писать в чате'})
                    continue
                try:
                    comment_input = CommentInput(text=str(payload.get('text') or ''))
                except ValidationError:
                    await websocket.send_json({'type': 'error', 'clientMessageId': client_message_id,
                                               'detail': 'Message must contain text up to 5000 characters'})
                    continue
                await session.commit()
                async with session.begin():
                    created = (await session.execute(text('''INSERT INTO event_comments(event_id,user_id,text)
                        VALUES (:event,:user,:text) RETURNING id,created_at'''),
                        {'event': event['id'], 'user': user['db_id'], 'text': comment_input.text})).mappings().one()
                comment = {'id': f"c-{created['id']}", 'eventId': event_id, 'authorId': user['id'],
                           'text': comment_input.text, 'kind': 'MESSAGE', 'createdAt': timestamp(created['created_at'])}
                await restart_redis_cache()
                await broadcast_chat_message(event_id, {'type': 'comment', 'comment': comment})
                await websocket.send_json({'type': 'ack', 'clientMessageId': client_message_id})
        except WebSocketDisconnect:
            pass
        finally:
            async with _chat_connections_lock:
                current = _chat_connections.get(event_id)
                if current:
                    current.discard(websocket)
                    if not current:
                        _chat_connections.pop(event_id, None)


@app.get('/api/v1/events/{event_id}/comments')
async def get_comments(event_id: str, session: AsyncSession = Depends(db_session)):
    result = await rows(session, '''SELECT 'c-' || c.id AS id,e.public_id AS "eventId",u.public_id AS "authorId",c.text,c.kind,c.created_at AS "createdAt"
      FROM event_comments c JOIN events e ON e.id=c.event_id JOIN users u ON u.id=c.user_id
      WHERE e.public_id=:event AND e.status='PUBLISHED' AND c.status='VISIBLE' ORDER BY c.id''', {'event': event_id})
    for item in result: item['createdAt'] = timestamp(item['createdAt'])
    return result


@app.post('/api/v1/events/{event_id}/comments', status_code=status.HTTP_201_CREATED)
async def add_comment(event_id: str, payload: CommentInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        event = (await session.execute(text('''SELECT e.id,e.organizer_id FROM events e
            WHERE e.public_id=:id AND e.status='PUBLISHED' FOR SHARE'''), {'id': event_id})).mappings().first()
        if not event:
            raise HTTPException(404, 'Published event not found')
        is_participant = await session.scalar(text('''SELECT 1 FROM event_registrations
            WHERE event_id=:event AND user_id=:user AND status='REGISTERED' '''),
            {'event': event['id'], 'user': user['db_id']})
        if event['organizer_id'] != user['db_id'] and not is_participant:
            raise HTTPException(403, 'Only the organizer and confirmed participants can write in this event chat')
        created = (await session.execute(text('''INSERT INTO event_comments(event_id,user_id,text)
            VALUES (:event,:user,:text) RETURNING id,created_at'''),
            {'event': event['id'], 'user': user['db_id'], 'text': payload.text})).mappings().one()
    comment = {'id': f"c-{created['id']}", 'eventId': event_id, 'authorId': user['id'],
               'text': payload.text, 'kind': 'MESSAGE', 'createdAt': timestamp(created['created_at'])}
    await restart_redis_cache()
    await broadcast_chat_message(event_id, {'type': 'comment', 'comment': comment})
    return {'id': comment['id'], 'created': True}


@app.post('/api/v1/participations/{participation_id}/review')
async def review(participation_id: int, decision: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    if decision not in ('confirmed', 'rejected'): raise HTTPException(422, 'Expected confirmed or rejected')
    activity = None
    await session.commit()
    async with session.begin():
        registration = (await session.execute(text('''SELECT r.id,r.user_id,e.id AS event_id,e.public_id AS event_public_id,e.title,
            e.capacity,e.organizer_id,participant.public_id AS participant_public_id,participant.name AS participant_name
            FROM event_registrations r JOIN events e ON e.id=r.event_id JOIN users participant ON participant.id=r.user_id
            WHERE r.id=:id AND r.status='PENDING' AND e.status='PUBLISHED' FOR UPDATE OF r,e'''), {'id': participation_id})).mappings().first()
        if not registration: raise HTTPException(404, 'Pending registration not found')
        if registration['organizer_id'] != user['db_id']: raise HTTPException(403, 'Only the event organizer may review participation')
        if decision == 'confirmed':
            count = await session.scalar(text("SELECT count(*) FROM event_registrations WHERE event_id=:id AND status='REGISTERED'"), {'id': registration['event_id']})
            if count >= registration['capacity']: raise HTTPException(409, 'Event is full')
        await session.execute(text('UPDATE event_registrations SET status=:status WHERE id=:id'),
                              {'id': participation_id, 'status': 'REGISTERED' if decision == 'confirmed' else 'CANCELLED'})
        await session.execute(text('''INSERT INTO notifications(user_id,event_id,type,title,message)
            VALUES (:user,:event,'participation_review',:title,:message)'''), {
                'user': registration['user_id'], 'event': registration['event_id'],
                'title': 'Участие подтверждено' if decision == 'confirmed' else 'Заявка отклонена',
                'message': f'Организатор {"подтвердил ваше участие в событии" if decision == "confirmed" else "отклонил заявку на событие"} «{registration["title"]}».',
            })
        if decision == 'confirmed':
            participant = {'db_id': registration['user_id'], 'id': registration['participant_public_id'], 'name': registration['participant_name']}
            activity = await create_event_chat_activity(session, registration['event_id'], registration['event_public_id'], participant, 'PARTICIPANT_JOINED')
    await restart_redis_cache()
    if activity:
        await broadcast_chat_message(activity['eventId'], {'type': 'comment', 'comment': activity})
    return {'status': decision}


@app.post('/api/v1/events/{event_id}/{kind}')
async def toggle(event_id: str, kind: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    if kind not in ('favorite', 'like'): raise HTTPException(404, 'Unknown action')
    table = 'event_favorites' if kind == 'favorite' else 'event_likes'
    await session.commit()
    async with session.begin():
        event_db_id = await session.scalar(text("SELECT id FROM events WHERE public_id=:id AND status='PUBLISHED'"), {'id': event_id})
        if not event_db_id: raise HTTPException(404, 'Event not found')
        found = await session.scalar(text(f'SELECT 1 FROM {table} WHERE user_id=:user AND event_id=:event'), {'user': user['db_id'], 'event': event_db_id})
        if found:
            await session.execute(text(f'DELETE FROM {table} WHERE user_id=:user AND event_id=:event'), {'user': user['db_id'], 'event': event_db_id})
        else:
            await session.execute(text(f'INSERT INTO {table}(user_id,event_id) VALUES (:user,:event)'), {'user': user['db_id'], 'event': event_db_id})
    await restart_redis_cache()
    return {'active': not bool(found)}


class ReverseGeoInput(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


@app.get('/api/v1/geo/suggest')
async def suggest_addresses(query: str, city: str | None = None):
    """Return a small, Redis-cached set of Nominatim address choices for an event."""
    query = query.strip()
    city = (city or '').strip()
    if len(query) < 3:
        return []
    if len(query) > 180 or len(city) > 150:
        raise HTTPException(422, 'Address query is too long')
    if not settings.geo_contact_email:
        raise HTTPException(503, 'Geocoder contact is not configured; enter the address manually')
    lookup = f'{query}, {city}' if city and city.casefold() not in query.casefold() else query
    cache_key = 'geo:suggest:v1:' + hashlib.sha256(lookup.casefold().encode()).hexdigest()
    try:
        cached = await redis.get(cache_key)
        if cached is not None:
            return json.loads(cached)
    except (RedisError, ValueError):
        logger.info('Address suggestion cache unavailable; querying Nominatim directly')
    global _geo_last_request
    try:
        # Do not allow anonymous distinct queries to form an unbounded queue
        # behind Nominatim's required one-request-per-second throttle.
        await asyncio.wait_for(_geo_lock.acquire(), timeout=0.1)
    except TimeoutError:
        raise HTTPException(429, 'Address suggestions are busy; try again in a moment')
    try:
        delay = 1 - (time.monotonic() - _geo_last_request)
        if delay > 0:
            await asyncio.sleep(delay)
        _geo_last_request = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=settings.geo_timeout_seconds, headers={'User-Agent': settings.geo_user_agent}) as client:
                response = await client.get(settings.geo_search_url, params={
                    'q': lookup, 'format': 'jsonv2', 'addressdetails': 1, 'limit': 5,
                    'email': settings.geo_contact_email,
                })
                response.raise_for_status()
                raw_items = response.json()
        except (httpx.HTTPError, ValueError):
            raise HTTPException(503, 'Unable to suggest addresses; enter the address manually')
    finally:
        _geo_lock.release()
    suggestions = []
    for item in raw_items if isinstance(raw_items, list) else []:
        address = item.get('address') if isinstance(item, dict) else None
        if not isinstance(address, dict):
            continue
        try:
            latitude, longitude = float(item['lat']), float(item['lon'])
        except (KeyError, TypeError, ValueError):
            continue
        selected_city = address.get('city') or address.get('town') or address.get('village') or address.get('municipality') or city
        district = address.get('city_district') or address.get('district') or address.get('borough') or address.get('suburb') or ''
        label = str(item.get('display_name') or '').strip()
        road = str(address.get('road') or address.get('pedestrian') or address.get('footway') or address.get('amenity') or address.get('building') or '').strip()
        house_number = str(address.get('house_number') or '').strip()
        short_address = ', '.join(part for part in (road, house_number) if part) or label
        if label and short_address:
            suggestions.append({'label': label, 'address': short_address[:255], 'city': str(selected_city or '')[:150],
                                'district': str(district or '')[:100], 'latitude': latitude, 'longitude': longitude})
    try:
        await redis.set(cache_key, json.dumps(suggestions, ensure_ascii=False), ex=600)
    except RedisError:
        logger.info('Address suggestions were not cached')
    return suggestions


@app.post('/api/v1/geo/reverse')
async def reverse_geo(payload: ReverseGeoInput, request: Request):
    # Public city discovery permits browsing before registration. Browser origin
    # and global provider rate limits still apply; coordinates are never stored.
    await csrf_origin(request)
    if not settings.geo_contact_email:
        raise HTTPException(503, 'Geocoder contact is not configured; enter the city manually')
    global _geo_last_request
    async with _geo_lock:
        delay = 1 - (time.monotonic() - _geo_last_request)
        if delay > 0: await asyncio.sleep(delay)
        _geo_last_request = time.monotonic()
        headers = {'User-Agent': settings.geo_user_agent}
        params = {'lat': payload.latitude, 'lon': payload.longitude, 'format': 'jsonv2', 'zoom': 10, 'addressdetails': 1}
        if settings.geo_contact_email: params['email'] = settings.geo_contact_email
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=settings.geo_timeout_seconds, headers=headers) as client:
                    response = await client.get(settings.geo_url, params=params)
                    response.raise_for_status()
                    address = response.json().get('address', {})
                    city = address.get('city') or address.get('town') or address.get('village') or address.get('municipality')
                    if city: return {'city': city}
                    break
            except (httpx.HTTPError, ValueError):
                if attempt == 0:
                    # Respect the provider's global one-request-per-second policy.
                    await asyncio.sleep(1)
                    _geo_last_request = time.monotonic()
    # Deliberately do not retain coordinates.  The client offers manual city input on failure.
    raise HTTPException(503, 'Unable to determine city; enter it manually')
