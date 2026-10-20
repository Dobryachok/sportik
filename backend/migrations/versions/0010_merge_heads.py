"""Merge discovery and profile migration branches.

Revision ID: 0010_merge_heads
Revises: 0009_discovery_teams_and_swipes, 0009_prof_gender_interests
"""
from alembic import op

revision = '0010_merge_heads'
down_revision = ('0009_discovery_teams_and_swipes', '0009_prof_gender_interests')
branch_labels = None
depends_on = None


def upgrade():
    # Alembic defaults to varchar(32); some revision ids are longer.
    op.execute(
        'ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(128)'
    )


def downgrade():
    pass
