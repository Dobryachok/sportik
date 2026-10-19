"""Add server sessions and remove public demo content.

Revision ID: 0002_auth_and_clean_demo
Revises: 0001_initial
"""
from alembic import op

revision = '0002_auth_and_clean_demo'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    op.execute("CREATE TABLE auth_sessions ("
               "id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
               "token_hash CHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, "
               "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now())")
    op.execute("CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id)")
    op.execute("CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at)")
    op.execute("CREATE TABLE user_avatars ("
               "id VARCHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, "
               "filename VARCHAR(255) NOT NULL, content_type VARCHAR(32) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())")


def downgrade():
    op.execute('DROP TABLE user_avatars')
    op.execute('DROP TABLE auth_sessions')
    op.execute('ALTER TABLE users DROP COLUMN password_hash')
