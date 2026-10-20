"""Store Start quest completion on the user profile.

Revision ID: 0008_start_completed
Revises: 0007_orgs_events_chat
"""
from alembic import op

revision = '0008_start_completed'
down_revision = '0007_orgs_events_chat'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS start_completed BOOLEAN NOT NULL DEFAULT FALSE')


def downgrade():
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS start_completed')
