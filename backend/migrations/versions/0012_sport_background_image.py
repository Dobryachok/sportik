"""Sport card background image URL.

Revision ID: 0012_sport_background
Revises: 0011_team_invites_avatars
"""
from alembic import op

revision = '0012_sport_background'
down_revision = '0011_team_invites_avatars'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('ALTER TABLE sports ADD COLUMN IF NOT EXISTS background_image TEXT')
    op.execute('''CREATE TABLE IF NOT EXISTS sport_backgrounds (
        id VARCHAR(64) PRIMARY KEY,
        sport_id BIGINT NOT NULL UNIQUE REFERENCES sports(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )''')


def downgrade():
    op.execute('DROP TABLE IF EXISTS sport_backgrounds')
    op.execute('ALTER TABLE sports DROP COLUMN IF EXISTS background_image')
