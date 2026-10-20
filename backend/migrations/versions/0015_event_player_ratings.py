"""Peer friendliness and organizer skill ratings after events."""

from alembic import op

revision = '0015_event_player_ratings'
down_revision = '0014_event_attendance'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        '''CREATE TABLE IF NOT EXISTS event_player_ratings (
            id BIGSERIAL PRIMARY KEY,
            event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            target_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rater_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind VARCHAR(20) NOT NULL CHECK (kind IN ('friendliness', 'skill')),
            score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (event_id, target_user_id, rater_user_id, kind)
        )'''
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS ix_event_player_ratings_event_target '
        'ON event_player_ratings (event_id, target_user_id, kind)'
    )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS event_player_ratings')
