"""Profile gender/interests and event waitlist registrations.

Revision ID: 0009_profile_gender_interests_waitlist
Revises: 0008_start_completed
"""
from alembic import op

revision = '0009_profile_gender_interests_waitlist'
down_revision = '0008_start_completed'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20)")
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS interests JSONB NOT NULL DEFAULT '[]'::jsonb")


def downgrade():
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS interests')
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS gender')
