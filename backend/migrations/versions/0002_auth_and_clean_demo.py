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
    # The prior release used shared demo identities. Never silently erase data
    # users may have added under those identities: require an explicit backup and
    # reset if the initial PostgreSQL fixture has been modified.
    op.execute("""DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM users WHERE public_id NOT IN ('u-demo','u-anya','u-vitya'))
      OR EXISTS (SELECT 1 FROM events WHERE public_id NOT IN ('ev-tsimlyanskaya','ev-run','ev-chess'))
      OR EXISTS (SELECT 1 FROM organizations WHERE public_id <> 'org-sever')
      OR EXISTS (SELECT 1 FROM event_registrations)
      OR EXISTS (SELECT 1 FROM event_comments)
      OR EXISTS (SELECT 1 FROM event_favorites)
      OR EXISTS (SELECT 1 FROM event_likes)
      OR EXISTS (SELECT 1 FROM event_moderations)
      OR EXISTS (SELECT 1 FROM comment_moderations)
      OR EXISTS (SELECT 1 FROM user_profiles)
      OR EXISTS (SELECT 1 FROM user_permissions)
      OR EXISTS (SELECT 1 FROM organization_applications)
      OR EXISTS (SELECT 1 FROM activities)
      OR EXISTS (SELECT 1 FROM notifications)
      OR EXISTS (SELECT 1 FROM organization_members om JOIN organizations o ON o.id=om.organization_id
                 JOIN users u ON u.id=om.user_id
                 WHERE o.public_id <> 'org-sever' OR u.public_id <> 'u-anya')
      THEN RAISE EXCEPTION 'Database contains non-demo content. Back it up, then explicitly reset the demo database before upgrading; no data was deleted.';
      END IF;
    END $$""")
    op.execute("DELETE FROM events WHERE public_id IN ('ev-tsimlyanskaya', 'ev-run', 'ev-chess')")
    op.execute("DELETE FROM organizations WHERE public_id = 'org-sever'")
    op.execute("DELETE FROM users WHERE public_id IN ('u-demo', 'u-anya', 'u-vitya')")
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
