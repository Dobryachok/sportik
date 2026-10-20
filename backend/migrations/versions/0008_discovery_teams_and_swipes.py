"""Discovery swipes, teams, interests, join requests, and notification targets.

Revision ID: 0009_discovery_teams_and_swipes
Revises: 0008_start_completed
"""
from alembic import op

revision = '0009_discovery_teams_and_swipes'
down_revision = '0008_start_completed'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('''CREATE TABLE IF NOT EXISTS interests (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(120) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )''')
    op.execute('''CREATE TABLE IF NOT EXISTS user_interests (
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interest_id BIGINT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, interest_id)
    )''')
    op.execute('''CREATE TABLE IF NOT EXISTS teams (
        id BIGSERIAL PRIMARY KEY,
        public_id VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        city VARCHAR(150) NOT NULL,
        sport_id BIGINT NOT NULL REFERENCES sports(id),
        logo_url TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )''')
    op.execute('''CREATE TABLE IF NOT EXISTS team_members (
        team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(30) NOT NULL DEFAULT 'MEMBER'
            CHECK (role IN ('CAPTAIN','ADMIN','MEMBER')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (team_id, user_id)
    )''')
    op.execute('CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id, team_id)')
    op.execute('''CREATE TABLE IF NOT EXISTS sport_groups (
        id BIGSERIAL PRIMARY KEY,
        public_id VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        city VARCHAR(150),
        owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )''')
    op.execute('''CREATE TABLE IF NOT EXISTS group_members (
        group_id BIGINT NOT NULL REFERENCES sport_groups(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (group_id, user_id)
    )''')
    op.execute('''CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (blocker_id, blocked_id),
        CHECK (blocker_id <> blocked_id)
    )''')
    op.execute('''CREATE TABLE IF NOT EXISTS discovery_swipes (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('USER','TEAM')),
        target_id BIGINT NOT NULL,
        action VARCHAR(10) NOT NULL CHECK (action IN ('LIKE','SKIP')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, target_type, target_id)
    )''')
    op.execute('CREATE INDEX IF NOT EXISTS idx_discovery_swipes_user ON discovery_swipes(user_id, target_type, created_at DESC)')
    op.execute('''CREATE TABLE IF NOT EXISTS team_join_requests (
        id BIGSERIAL PRIMARY KEY,
        team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
            CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
        reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )''')
    op.execute('''CREATE UNIQUE INDEX IF NOT EXISTS idx_team_join_requests_active
        ON team_join_requests(team_id, user_id) WHERE status = 'PENDING' ''')
    op.execute('CREATE INDEX IF NOT EXISTS idx_team_join_requests_team ON team_join_requests(team_id, status, created_at DESC)')

    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL')
    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type VARCHAR(40)')
    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_public_id VARCHAR(80)')
    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE')
    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS team_request_id BIGINT REFERENCES team_join_requests(id) ON DELETE CASCADE')

    for name, slug in (
        ('Футбол', 'football'),
        ('Программирование', 'programming'),
        ('Музыка', 'music'),
        ('Игры', 'games'),
        ('Бег', 'running'),
        ('Волейбол', 'volleyball'),
    ):
        op.execute(
            f"INSERT INTO interests(name, slug) VALUES ('{name}', '{slug}') ON CONFLICT (slug) DO NOTHING"
        )


def downgrade():
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS team_request_id')
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS team_id')
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS target_public_id')
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS target_type')
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS actor_user_id')
    op.execute('DROP TABLE IF EXISTS team_join_requests')
    op.execute('DROP TABLE IF EXISTS discovery_swipes')
    op.execute('DROP TABLE IF EXISTS user_blocks')
    op.execute('DROP TABLE IF EXISTS group_members')
    op.execute('DROP TABLE IF EXISTS sport_groups')
    op.execute('DROP TABLE IF EXISTS team_members')
    op.execute('DROP TABLE IF EXISTS teams')
    op.execute('DROP TABLE IF EXISTS user_interests')
    op.execute('DROP TABLE IF EXISTS interests')
