"""Add user follows and approval workflow for new sports.

Revision ID: 0006_follows_sport_mod
Revises: 0005_half_star_levels
"""
from alembic import op

revision = '0006_follows_sport_mod'
down_revision = '0005_half_star_levels'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE sports ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'")
    op.execute('ALTER TABLE sports ADD COLUMN IF NOT EXISTS requested_by BIGINT REFERENCES users(id) ON DELETE SET NULL')
    op.execute('ALTER TABLE sports ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL')
    op.execute('ALTER TABLE sports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ')
    op.execute("UPDATE sports SET status='APPROVED' WHERE status IS NULL")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE sports ADD CONSTRAINT sports_status_check CHECK (status IN ('PENDING','APPROVED','REJECTED'));
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute('CREATE INDEX IF NOT EXISTS idx_sports_status_created ON sports(status, created_at, id)')
    op.execute('''CREATE TABLE IF NOT EXISTS user_follows (
        follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        followed_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (follower_id, followed_id),
        CHECK (follower_id <> followed_id)
    )''')
    op.execute('CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows(followed_id, created_at)')


def downgrade():
    op.execute('DROP INDEX IF EXISTS idx_user_follows_followed')
    op.execute('DROP TABLE IF EXISTS user_follows')
    op.execute('DROP INDEX IF EXISTS idx_sports_status_created')
    op.execute('ALTER TABLE sports DROP CONSTRAINT IF EXISTS sports_status_check')
    op.execute('ALTER TABLE sports DROP COLUMN IF EXISTS reviewed_at')
    op.execute('ALTER TABLE sports DROP COLUMN IF EXISTS reviewed_by')
    op.execute('ALTER TABLE sports DROP COLUMN IF EXISTS requested_by')
    op.execute('ALTER TABLE sports DROP COLUMN IF EXISTS status')
