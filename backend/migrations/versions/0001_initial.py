"""Initial PostgreSQL schema and demonstration catalog (no authentication).

Revision ID: 0001_initial
Revises:
"""
from alembic import op

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None

# One statement per execute: asyncpg does not accept multi-command prepared statements.
TABLES = [
    """CREATE TABLE users (
      id BIGSERIAL PRIMARY KEY, public_id VARCHAR(80) NOT NULL UNIQUE,
      email VARCHAR(255) UNIQUE, username VARCHAR(100) UNIQUE,
      name VARCHAR(150) NOT NULL, city VARCHAR(150), avatar_url TEXT,
      bio TEXT, status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE user_profiles (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100), last_name VARCHAR(100), avatar_url TEXT, bio TEXT,
      city VARCHAR(150), latitude DECIMAL(9,6), longitude DECIMAL(9,6), birth_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE roles (
      id BIGSERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE,
      description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE permissions (
      id BIGSERIAL PRIMARY KEY, code VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE organizations (
      id BIGSERIAL PRIMARY KEY, public_id VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL, description TEXT, logo_url TEXT,
      city VARCHAR(150) NOT NULL, latitude DECIMAL(9,6) NOT NULL, longitude DECIMAL(9,6) NOT NULL,
      email VARCHAR(255), phone VARCHAR(50), website TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE user_roles (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, role_id)
    )""",
    """CREATE TABLE role_permissions (
      id BIGSERIAL PRIMARY KEY, role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(role_id, permission_id)
    )""",
    """CREATE TABLE user_permissions (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      granted BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, permission_id)
    )""",
    """CREATE TABLE organization_members (
      id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(organization_id, user_id)
    )""",
    """CREATE TABLE organization_applications (
      id BIGSERIAL PRIMARY KEY, organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      submitted_by BIGINT NOT NULL REFERENCES users(id),
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING', comment TEXT,
      reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE sports (
      id BIGSERIAL PRIMARY KEY, public_id VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL UNIQUE, slug VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE events (
      id BIGSERIAL PRIMARY KEY, public_id VARCHAR(80) NOT NULL UNIQUE,
      organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL,
      organizer_id BIGINT NOT NULL REFERENCES users(id),
      sport_id BIGINT NOT NULL REFERENCES sports(id),
      title VARCHAR(255) NOT NULL, description TEXT, event_type VARCHAR(100),
      location VARCHAR(255), district VARCHAR(100), city VARCHAR(150) NOT NULL,
      start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
      join_mode VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (join_mode IN ('open','application')),
      level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
      min_age INTEGER, image_url TEXT, rating NUMERIC(3,1) NOT NULL DEFAULT 4,
      status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT','PENDING_MODERATION','PUBLISHED','REJECTED','CANCELLED','COMPLETED','UNPUBLISHED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_at TIMESTAMPTZ
    )""",
    """CREATE TABLE event_registrations (
      id BIGSERIAL PRIMARY KEY, event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',
      registered_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(event_id, user_id)
    )""",
    """CREATE TABLE event_comments (
      id BIGSERIAL PRIMARY KEY, event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id BIGINT REFERENCES event_comments(id) ON DELETE SET NULL,
      text TEXT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'VISIBLE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE event_moderations (
      id BIGSERIAL PRIMARY KEY, event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL, reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE comment_moderations (
      id BIGSERIAL PRIMARY KEY, comment_id BIGINT NOT NULL REFERENCES event_comments(id) ON DELETE CASCADE,
      admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL, reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE activities (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL, description TEXT, type VARCHAR(50),
      status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE notifications (
      id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), read_at TIMESTAMPTZ
    )""",
    """CREATE TABLE event_favorites (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, event_id)
    )""",
    """CREATE TABLE event_likes (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, event_id)
    )""",
]

INDEXES = [
    ('users', 'status'), ('user_profiles', 'city'),
    ('user_profiles', 'latitude, longitude'), ('user_roles', 'user_id'),
    ('user_roles', 'role_id'), ('role_permissions', 'role_id'),
    ('role_permissions', 'permission_id'), ('user_permissions', 'user_id'),
    ('user_permissions', 'permission_id'), ('organizations', 'city'),
    ('organizations', 'latitude, longitude'), ('organizations', 'status'),
    ('organization_members', 'user_id'), ('organization_members', 'organization_id'),
    ('organization_applications', 'status'), ('organization_applications', 'organization_id'),
    ('events', 'organization_id'), ('events', 'sport_id'), ('events', 'status'),
    ('events', 'start_at'), ('event_registrations', 'event_id'),
    ('event_registrations', 'user_id'), ('event_comments', 'event_id'),
    ('event_comments', 'user_id'), ('event_comments', 'parent_id'),
    ('notifications', 'user_id'), ('notifications', 'is_read'),
]


def upgrade():
    for statement in TABLES:
        op.execute(statement)
    for table, columns in INDEXES:
        name = f'idx_{table}_{columns.replace(", ", "_")}'
        op.execute(f'CREATE INDEX {name} ON {table} ({columns})')

    # Seed only shared demo data; credentials and sessions are intentionally absent.
    for name in ('USER', 'ORGANIZATION', 'MODERATOR', 'ADMIN'):
        op.execute(f"INSERT INTO roles(name) VALUES ('{name}')")
    for code in (
        'event.create', 'event.edit', 'event.delete', 'event.moderate',
        'user.view', 'user.edit', 'user.block', 'organization.create',
        'organization.edit', 'organization.approve', 'organization.reject',
        'comment.view', 'comment.delete', 'comment.moderate',
        'activity.create', 'activity.edit', 'activity.delete',
    ):
        op.execute(f"INSERT INTO permissions(code, name) VALUES ('{code}', '{code}')")
    op.execute("INSERT INTO role_permissions(role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'ADMIN'")
    op.execute("INSERT INTO role_permissions(role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'USER' AND p.code IN ('comment.view', 'activity.create', 'activity.edit', 'activity.delete')")
    op.execute("INSERT INTO users(public_id,name,city) VALUES ('u-demo','Демо','Красноярск'),('u-anya','Аня','Красноярск'),('u-vitya','Витя','Красноярск')")
    op.execute("INSERT INTO user_roles(user_id,role_id) SELECT u.id,r.id FROM users u CROSS JOIN roles r WHERE r.name = 'USER'")
    op.execute("INSERT INTO sports(public_id,name,slug) VALUES ('sp-vb','Волейбол','volleyball'),('sp-run','Бег','running'),('sp-chess','Шахматы','chess'),('sp-foot','Футбол','football')")
    op.execute("INSERT INTO organizations(public_id,name,description,city,latitude,longitude,status) VALUES ('org-sever','Клуб «Север»','Любительский спорт','Красноярск',56.0106,92.8526,'APPROVED')")
    op.execute("INSERT INTO organization_members(organization_id,user_id,role) SELECT o.id,u.id,'OWNER' FROM organizations o,users u WHERE o.public_id='org-sever' AND u.public_id='u-anya'")
    op.execute("""INSERT INTO events(public_id,organizer_id,sport_id,organization_id,title,description,event_type,location,city,start_at,capacity,price,join_mode,level,rating,status,published_at)
      SELECT 'ev-tsimlyanskaya',u.id,s.id,o.id,'Волейбол на Цимлянской','Приносите форму и воду.','game','Цимлянская, 35А','Красноярск','2026-10-19T11:30:00Z',14,350,'open',2,4.5,'PUBLISHED',now()
      FROM users u,sports s,organizations o WHERE u.public_id='u-anya' AND s.public_id='sp-vb' AND o.public_id='org-sever'""")
    op.execute("""INSERT INTO events(public_id,organizer_id,sport_id,title,description,event_type,location,city,start_at,capacity,price,join_mode,level,rating,status,published_at)
      SELECT 'ev-run',u.id,s.id,'Утренний забег 5 км','Лёгкий темп, подходит начинающим.','game','Набережная Енисея','Красноярск','2026-10-20T00:00:00Z',30,0,'open',1,4.8,'PUBLISHED',now()
      FROM users u,sports s WHERE u.public_id='u-vitya' AND s.public_id='sp-run'""")
    op.execute("""INSERT INTO events(public_id,organizer_id,sport_id,title,description,event_type,location,city,start_at,capacity,price,join_mode,level,rating,status,published_at)
      SELECT 'ev-chess',u.id,s.id,'Шахматный кружок','Партии по швейцарской системе.','game','Библиотека, Мира 15','Красноярск','2026-10-25T07:00:00Z',16,200,'application',2,4.6,'PUBLISHED',now()
      FROM users u,sports s WHERE u.public_id='u-vitya' AND s.public_id='sp-chess'""")


def downgrade():
    for name in (
        'event_likes', 'event_favorites', 'notifications', 'activities',
        'comment_moderations', 'event_moderations', 'event_comments',
        'event_registrations', 'events', 'sports', 'organization_applications',
        'organization_members', 'user_permissions', 'role_permissions',
        'user_roles', 'organizations', 'permissions', 'roles', 'user_profiles', 'users',
    ):
        op.execute(f'DROP TABLE {name}')
