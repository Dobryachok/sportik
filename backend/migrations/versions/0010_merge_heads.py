"""Merge discovery and profile migration branches.

Revision ID: 0010_merge_heads
Revises: 0009_discovery_teams_and_swipes, 0009_profile_gender_interests_waitlist
"""
from alembic import op

revision = '0010_merge_heads'
down_revision = ('0009_discovery_teams_and_swipes', '0009_profile_gender_interests_waitlist')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
