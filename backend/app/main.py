"""Authenticated PostgreSQL API for СпортВместе."""
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
from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
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


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    yield
    await redis.aclose()
    await engine.dispose()


app = FastAPI(title='СпортВместе API', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PATCH', 'OPTIONS'], allow_headers=['Content-Type'])


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


def public_user(row):
    birth_date = row.get('birthDate')
    age = row.get('age')
    result = {
        'id': row['id'],
        'name': row['name'],
        'city': row.get('city') or '',
        'role': row.get('role') or 'user',
        'avatarUrl': row.get('avatarUrl'),
        'bio': row.get('bio') or '',
        'birthDate': timestamp(birth_date),
        'maritalStatus': row.get('maritalStatus'),
        'childrenCount': row.get('childrenCount'),
        'hasCar': row.get('hasCar'),
        'workSchedule': row.get('workSchedule'),
        'stats': {
            'events': int(row.get('eventCount') or 0),
            'subscriptions': int(row.get('subscriptionsCount') or 0),
            'followers': int(row.get('followersCount') or 0),
        },
    }
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
        p.birth_date AS "birthDate",p.marital_status AS "maritalStatus",p.children_count AS "childrenCount",
        p.has_car AS "hasCar",p.work_schedule AS "workSchedule",
        EXTRACT(YEAR FROM age(current_date,p.birth_date))::integer AS age,
        (SELECT count(*)::integer FROM events e WHERE e.organizer_id=u.id) AS "eventCount",
        CASE WHEN EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id AND om.role='OWNER')
             THEN 'organization' ELSE 'user' END AS role
        FROM auth_sessions s JOIN users u ON u.id=s.user_id
        LEFT JOIN user_profiles p ON p.user_id=u.id
        WHERE s.token_hash=:hash AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status='ACTIVE'"""),
                                      {'hash': digest})).mappings().first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Authentication required')
    return dict(user)


async def require_user(request: Request, user=Depends(current_user)):
    await csrf_origin(request)
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
        token = await create_login(session, user_id)
    result = public_user({'id': public_id, 'name': payload.name, 'city': '', 'role': 'user', 'avatarUrl': None, 'bio': ''})
    set_session(response, token)
    return result


@app.post('/api/v1/auth/login')
async def login(payload: Credentials, request: Request, response: Response, session: AsyncSession = Depends(db_session)):
    # Login is public: there is no cookie-authenticated state to protect yet.
    await throttle_auth(payload.email, 'login', 20)
    user = (await session.execute(text('''SELECT u.id,u.public_id,u.password_hash,u.name,u.city,u.avatar_url AS "avatarUrl",u.bio,
        p.birth_date AS "birthDate",p.marital_status AS "maritalStatus",p.children_count AS "childrenCount",
        p.has_car AS "hasCar",p.work_schedule AS "workSchedule",
        EXTRACT(YEAR FROM age(current_date,p.birth_date))::integer AS age,
        (SELECT count(*)::integer FROM events e WHERE e.organizer_id=u.id) AS "eventCount"
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
        token = await create_login(session, user['id'])
    result = public_user({**dict(user), 'id': user['public_id'], 'role': 'user'})
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
        return public_user(await current_user(request, session))
    except HTTPException as exc:
        if exc.status_code == 401:
            return None
        raise


class ProfileInput(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    bio: str | None = Field(default=None, max_length=5000)
    city: str | None = Field(default=None, max_length=150)
    birthDate: date | None = None
    maritalStatus: str | None = Field(default=None, max_length=50)
    childrenCount: int | None = Field(default=None, ge=0, le=20)
    hasCar: bool | None = None
    workSchedule: str | None = Field(default=None, max_length=255)

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
        return public_user(user)
    user_columns = {'name': 'name', 'bio': 'bio', 'city': 'city'}
    profile_columns = {
        'birthDate': 'birth_date',
        'maritalStatus': 'marital_status',
        'childrenCount': 'children_count',
        'hasCar': 'has_car',
        'workSchedule': 'work_schedule',
    }
    user_values = {key: value for key, value in values.items() if key in user_columns}
    profile_values = {key: value for key, value in values.items() if key in profile_columns}
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
    return public_user(result)


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
    return public_user({**user, 'avatarUrl': f'/media/{media_id}'})


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

async def event_rows(session, city: str | None, public_only=True):
    where = "e.status='PUBLISHED'" if public_only else 'TRUE'
    params = {}
    if city:
        where += ' AND lower(e.city)=lower(:city)'
        params['city'] = city.strip()
    events = await rows(session, f'''SELECT e.id AS internal_id,e.public_id AS id,s.public_id AS "sportId",u.public_id AS "organizerUserId",
      o.public_id AS "organizationId",e.title,COALESCE(e.description,'') AS description,
      COALESCE(e.location,'') AS address,e.district,e.city,e.start_at AS "startsAt",e.price,e.capacity,
      e.join_mode AS "joinMode",CASE WHEN e.status='PUBLISHED' THEN 'published' ELSE 'unpublished' END AS status,e.level,
      e.min_age AS "minAge",e.image_url AS "imageUrl",e.rating,e.event_type AS "eventType",
      (SELECT count(*) FROM event_registrations r WHERE r.event_id=e.id AND r.status='REGISTERED') AS "confirmedCount"
      FROM events e JOIN sports s ON s.id=e.sport_id JOIN users u ON u.id=e.organizer_id
      LEFT JOIN organizations o ON o.id=e.organization_id WHERE {where} ORDER BY e.start_at,e.id''', params)
    for event in events:
        event['startsAt'] = timestamp(event['startsAt'])
        event['rating'] = float(event['rating'])
        del event['internal_id']
    return events


async def build_state(session: AsyncSession, city: str | None, user: dict | None):
    selected_city = (city or settings.default_city or '').strip()
    # A missing city must not leak an unfiltered nationwide feed.
    events = await event_rows(session, selected_city) if selected_city else []
    event_ids = [e['id'] for e in events]
    if not event_ids:
        return dict(version=1, currentUserId=user['id'] if user else None, accounts=[], city=selected_city,
                    users=[public_user(user)] if user else [], organizations=[], sports=[], events=[], participations=[],
                    comments=[], notifications=[], favorites=[], likedEvents=[])
    params = {'ids': event_ids, 'user_id': user['db_id'] if user else -1}
    users = await rows(session, '''SELECT DISTINCT u.public_id AS id,u.name,COALESCE(u.city,'') AS city,u.avatar_url AS "avatarUrl",COALESCE(u.bio,'') AS bio,
       p.birth_date AS "birthDate",p.marital_status AS "maritalStatus",p.children_count AS "childrenCount",
       p.has_car AS "hasCar",p.work_schedule AS "workSchedule",
       EXTRACT(YEAR FROM age(current_date,p.birth_date))::integer AS age,
       (SELECT count(*)::integer FROM events owner_events WHERE owner_events.organizer_id=u.id) AS "eventCount",
       CASE WHEN EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id=u.id AND om.role='OWNER') THEN 'organization' ELSE 'user' END AS role
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
       JOIN events e ON e.sport_id=s.id AND e.status='PUBLISHED' AND e.public_id=ANY(:ids) GROUP BY s.id ORDER BY s.id''', params)
    comments = await rows(session, '''SELECT 'c-' || c.id AS id,e.public_id AS "eventId",u.public_id AS "authorId",c.text,c.created_at AS "createdAt"
       FROM event_comments c JOIN events e ON e.id=c.event_id JOIN users u ON u.id=c.user_id
       WHERE e.public_id=ANY(:ids) AND c.status='VISIBLE' ORDER BY c.id''', params)
    for comment in comments: comment['createdAt'] = timestamp(comment['createdAt'])
    participations = []
    favorites, liked = [], []
    if user:
        participations = await rows(session, '''SELECT 'part-' || r.id AS id,e.public_id AS "eventId",u.public_id AS "userId",
           CASE r.status WHEN 'REGISTERED' THEN 'confirmed' WHEN 'PENDING' THEN 'pending' ELSE 'rejected' END AS status,r.registered_at AS "createdAt"
           FROM event_registrations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id
           WHERE e.public_id=ANY(:ids) AND (r.user_id=:user_id OR e.organizer_id=:user_id) ORDER BY r.id''', params)
        for item in participations: item['createdAt'] = timestamp(item['createdAt'])
        favorites = [x['id'] for x in await rows(session, '''SELECT e.public_id AS id FROM event_favorites f JOIN events e ON e.id=f.event_id
            WHERE f.user_id=:user_id AND e.public_id=ANY(:ids)''', params)]
        liked = [x['id'] for x in await rows(session, '''SELECT e.public_id AS id FROM event_likes f JOIN events e ON e.id=f.event_id
            WHERE f.user_id=:user_id AND e.public_id=ANY(:ids)''', params)]
    return dict(version=1, currentUserId=user['id'] if user else None, accounts=[], city=selected_city,
                users=[public_user(u) for u in users], organizations=[{**org, 'sports': []} for org in organizations],
                sports=sports, events=events, participations=participations, comments=comments, notifications=[],
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


class EventInput(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default='', max_length=10000)
    address: str = Field(min_length=1, max_length=255)
    district: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=150)
    startsAt: datetime
    price: int = Field(ge=0)
    capacity: int = Field(gt=0)
    joinMode: str = Field(pattern='^(open|application)$')
    level: int = Field(ge=1, le=5)
    sportName: str = Field(min_length=1, max_length=100)
    minAge: int | None = Field(default=None, ge=0, le=120)

    @field_validator('title', 'address', 'sportName')
    @classmethod
    def not_blank(cls, value):
        value = value.strip()
        if not value: raise ValueError('Field cannot be blank')
        return value


@app.post('/api/v1/events', status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    if payload.startsAt.tzinfo is None: raise HTTPException(422, 'startsAt must include a timezone')
    city = (payload.city or user.get('city') or '').strip()
    if not city: raise HTTPException(422, 'city is required')
    await session.commit()
    async with session.begin():
        sport = await session.scalar(text('SELECT id FROM sports WHERE lower(name)=lower(:name)'), {'name': payload.sportName})
        if sport is None:
            sport = await session.scalar(text('INSERT INTO sports(public_id,name,slug) VALUES (:id,:name,:slug) RETURNING id'),
                {'id': 'sp-' + uuid4().hex[:12], 'name': payload.sportName, 'slug': 'sport-' + uuid4().hex[:12]})
        event_id = 'ev-' + uuid4().hex[:12]
        await session.execute(text('''INSERT INTO events(public_id,organizer_id,sport_id,title,description,event_type,location,district,city,start_at,
             capacity,price,join_mode,level,min_age,image_url,status,published_at) VALUES
             (:id,:user,:sport,:title,:description,'game',:address,:district,:city,:starts,:capacity,:price,:mode,:level,:age,NULL,'PUBLISHED',now())'''),
             {'id': event_id, 'user': user['db_id'], 'sport': sport, 'title': payload.title, 'description': payload.description.strip(),
              'address': payload.address, 'district': payload.district, 'city': city, 'starts': payload.startsAt, 'capacity': payload.capacity,
              'price': payload.price, 'mode': payload.joinMode, 'level': payload.level, 'age': payload.minAge})
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
        event = (await session.execute(text('SELECT id,organizer_id FROM events WHERE public_id=:id FOR UPDATE'),
                                       {'id': event_id})).mappings().first()
        if not event:
            raise HTTPException(404, 'Event not found')
        if event['organizer_id'] != user['db_id']:
            raise HTTPException(403, 'Only the organizer may edit the event')
        confirmed = await session.scalar(text("SELECT count(*) FROM event_registrations WHERE event_id=:id AND status='REGISTERED'"),
                                         {'id': event['id']})
        if confirmed > payload.capacity:
            raise HTTPException(409, 'Capacity cannot be below confirmed registrations')
        sport = await session.scalar(text('SELECT id FROM sports WHERE lower(name)=lower(:name)'),
                                     {'name': payload.sportName})
        if sport is None:
            sport = await session.scalar(text('INSERT INTO sports(public_id,name,slug) VALUES (:id,:name,:slug) RETURNING id'),
                {'id': 'sp-' + uuid4().hex[:12], 'name': payload.sportName, 'slug': 'sport-' + uuid4().hex[:12]})
        await session.execute(text('''UPDATE events SET sport_id=:sport,title=:title,description=:description,
           location=:address,district=:district,city=:city,start_at=:starts,capacity=:capacity,
           price=:price,join_mode=:mode,level=:level,min_age=:age,updated_at=now() WHERE id=:id'''), {
            'id': event['id'], 'sport': sport, 'title': payload.title, 'description': payload.description.strip(),
            'address': payload.address, 'district': payload.district, 'city': city, 'starts': payload.startsAt,
            'capacity': payload.capacity, 'price': payload.price, 'mode': payload.joinMode,
            'level': payload.level, 'age': payload.minAge,
        })
    await restart_redis_cache()
    return {'id': event_id}

@app.post('/api/v1/events/{event_id}/join', status_code=status.HTTP_201_CREATED)
async def join(event_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
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
    await restart_redis_cache()
    return {'status': 'confirmed' if result == 'REGISTERED' else 'pending'}


class CommentInput(BaseModel):
    text: str = Field(min_length=1, max_length=5000)

    @field_validator('text')
    @classmethod
    def comment_not_blank(cls, value):
        if not value.strip(): raise ValueError('Comment cannot be empty')
        return value.strip()


@app.get('/api/v1/events/{event_id}/comments')
async def get_comments(event_id: str, session: AsyncSession = Depends(db_session)):
    result = await rows(session, '''SELECT 'c-' || c.id AS id,e.public_id AS "eventId",u.public_id AS "authorId",c.text,c.created_at AS "createdAt"
      FROM event_comments c JOIN events e ON e.id=c.event_id JOIN users u ON u.id=c.user_id
      WHERE e.public_id=:event AND e.status='PUBLISHED' AND c.status='VISIBLE' ORDER BY c.id''', {'event': event_id})
    for item in result: item['createdAt'] = timestamp(item['createdAt'])
    return result


@app.post('/api/v1/events/{event_id}/comments', status_code=status.HTTP_201_CREATED)
async def add_comment(event_id: str, payload: CommentInput, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    await session.commit()
    async with session.begin():
        event_db_id = await session.scalar(text("SELECT id FROM events WHERE public_id=:id AND status='PUBLISHED'"), {'id': event_id})
        if not event_db_id: raise HTTPException(404, 'Published event not found')
        comment_id = await session.scalar(text('INSERT INTO event_comments(event_id,user_id,text) VALUES (:event,:user,:text) RETURNING id'),
                                                {'event': event_db_id, 'user': user['db_id'], 'text': payload.text})
    await restart_redis_cache()
    return {'id': f'c-{comment_id}', 'created': True}


@app.post('/api/v1/participations/{participation_id}/review')
async def review(participation_id: int, decision: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
    if decision not in ('confirmed', 'rejected'): raise HTTPException(422, 'Expected confirmed or rejected')
    await session.commit()
    async with session.begin():
        registration = (await session.execute(text('''SELECT r.id,e.id AS event_id,e.capacity,e.organizer_id FROM event_registrations r
          JOIN events e ON e.id=r.event_id WHERE r.id=:id AND r.status='PENDING' FOR UPDATE OF r,e'''), {'id': participation_id})).mappings().first()
        if not registration: raise HTTPException(404, 'Pending registration not found')
        if registration['organizer_id'] != user['db_id']: raise HTTPException(403, 'Only the event organizer may review participation')
        if decision == 'confirmed':
            count = await session.scalar(text("SELECT count(*) FROM event_registrations WHERE event_id=:id AND status='REGISTERED'"), {'id': registration['event_id']})
            if count >= registration['capacity']: raise HTTPException(409, 'Event is full')
        await session.execute(text('UPDATE event_registrations SET status=:status WHERE id=:id'),
                              {'id': participation_id, 'status': 'REGISTERED' if decision == 'confirmed' else 'CANCELLED'})
    await restart_redis_cache()
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
