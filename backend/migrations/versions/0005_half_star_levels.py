"""Allow event levels in half-star increments.

Revision ID: 0005_half_star_levels
Revises: 0004_event_communication_and_geo
"""
from alembic import op

revision = '0005_half_star_levels'
down_revision = '0004_event_communication_and_geo'
branch_labels = None
depends_on = None


def upgrade():
    # Keep the legacy price column untouched for existing installations.  The
    # application no longer reads or writes it, so this change is non-destructive.
    op.execute('ALTER TABLE events DROP CONSTRAINT IF EXISTS events_level_check')
    op.execute('ALTER TABLE events ALTER COLUMN level TYPE NUMERIC(2,1) USING level::NUMERIC(2,1)')
    op.execute('''ALTER TABLE events ADD CONSTRAINT events_level_check
        CHECK (level >= 0.5 AND level <= 5 AND level * 2 = trunc(level * 2))''')


def downgrade():
    op.execute('ALTER TABLE events DROP CONSTRAINT IF EXISTS events_level_check')
    op.execute('ALTER TABLE events ALTER COLUMN level TYPE INTEGER USING round(level)::INTEGER')
    op.execute('ALTER TABLE events ADD CONSTRAINT events_level_check CHECK (level BETWEEN 1 AND 5)')
