"""Add organization approval workflow and event chat activity.

Revision ID: 0007_orgs_events_chat
Revises: 0006_follows_sport_mod
"""
from alembic import op

revision = '0007_orgs_events_chat'
down_revision = '0006_follows_sport_mod'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('ALTER TABLE organization_applications ADD COLUMN IF NOT EXISTS review_comment TEXT')
    op.execute('''CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_applications_one_pending
        ON organization_applications(organization_id) WHERE status='PENDING' ''')
    op.execute('CREATE INDEX IF NOT EXISTS idx_organization_members_owner ON organization_members(user_id, organization_id) WHERE role=\'OWNER\'')

    op.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE')
    op.execute('CREATE INDEX IF NOT EXISTS idx_notifications_organization_active ON notifications(organization_id, dismissed_at, created_at DESC)')

    op.execute("ALTER TABLE event_comments ADD COLUMN IF NOT EXISTS kind VARCHAR(30) NOT NULL DEFAULT 'MESSAGE'")
    op.execute("""DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='event_comments_kind_check') THEN
            ALTER TABLE event_comments ADD CONSTRAINT event_comments_kind_check
                CHECK (kind IN ('MESSAGE','PARTICIPANT_JOINED','PARTICIPANT_LEFT'));
        END IF;
    END $$""")
    op.execute('CREATE INDEX IF NOT EXISTS idx_event_comments_kind_created ON event_comments(event_id, kind, created_at, id)')


def downgrade():
    op.execute('DROP INDEX IF EXISTS idx_event_comments_kind_created')
    op.execute('ALTER TABLE event_comments DROP CONSTRAINT IF EXISTS event_comments_kind_check')
    op.execute('ALTER TABLE event_comments DROP COLUMN IF EXISTS kind')
    op.execute('DROP INDEX IF EXISTS idx_notifications_organization_active')
    op.execute('ALTER TABLE notifications DROP COLUMN IF EXISTS organization_id')
    op.execute('DROP INDEX IF EXISTS idx_organization_members_owner')
    op.execute('DROP INDEX IF EXISTS idx_organization_applications_one_pending')
    op.execute('ALTER TABLE organization_applications DROP COLUMN IF EXISTS review_comment')
