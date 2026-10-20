"""Organizer attendance marks on confirmed registrations."""

from alembic import op

revision = '0014_event_attendance'
down_revision = '0013_organization_profile_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attended BOOLEAN')
    op.execute(
        'ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ'
    )
    op.execute(
        '''ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance_marked_by BIGINT
           REFERENCES users(id) ON DELETE SET NULL'''
    )


def downgrade() -> None:
    op.execute('ALTER TABLE event_registrations DROP COLUMN IF EXISTS attendance_marked_by')
    op.execute('ALTER TABLE event_registrations DROP COLUMN IF EXISTS attendance_marked_at')
    op.execute('ALTER TABLE event_registrations DROP COLUMN IF EXISTS attended')
