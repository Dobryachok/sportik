"""Add event map fields, social links, and dismissible notifications.

Revision ID: 0004_event_communication_and_geo
Revises: 0003_profile_details
"""
from alembic import op

revision = '0004_event_communication_and_geo'
down_revision = '0003_profile_details'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb")
    op.execute('ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6)')
    op.execute('ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6)')
    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES events(id) ON DELETE CASCADE')
    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ')
    op.execute('CREATE INDEX IF NOT EXISTS idx_event_comments_event_visible_created ON event_comments(event_id, status, created_at, id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(user_id, dismissed_at, created_at DESC)')


def downgrade():
    op.execute('DROP INDEX IF EXISTS idx_notifications_active')
    op.execute('DROP INDEX IF EXISTS idx_event_comments_event_visible_created')
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS dismissed_at')
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS event_id')
    op.execute('ALTER TABLE events DROP COLUMN IF EXISTS longitude')
    op.execute('ALTER TABLE events DROP COLUMN IF EXISTS latitude')
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS social_links')
