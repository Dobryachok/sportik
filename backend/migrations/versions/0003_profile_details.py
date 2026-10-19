"""Add optional profile detail fields.

Revision ID: 0003_profile_details
Revises: 0002_auth_and_clean_demo
"""
from alembic import op

revision = '0003_profile_details'
down_revision = '0002_auth_and_clean_demo'
branch_labels = None
depends_on = None


def upgrade():
    # user_profiles already exists in the initial schema. All fields are optional so
    # existing accounts and profile rows remain valid without backfilling.
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50)")
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS children_count SMALLINT")
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS has_car BOOLEAN")
    op.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS work_schedule VARCHAR(255)")


def downgrade():
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS work_schedule')
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS has_car')
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS children_count')
    op.execute('ALTER TABLE user_profiles DROP COLUMN IF EXISTS marital_status')
