"""Team email invites and team avatar storage.

Revision ID: 0011_team_invites_avatars
Revises: 0010_merge_heads
"""
from alembic import op

revision = '0011_team_invites_avatars'
down_revision = '0010_merge_heads'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('''CREATE TABLE IF NOT EXISTS team_avatars (
        id VARCHAR(64) PRIMARY KEY,
        team_id BIGINT NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        content_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )''')
    op.execute('''CREATE TABLE IF NOT EXISTS team_email_invites (
        id BIGSERIAL PRIMARY KEY,
        team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        email VARCHAR(254) NOT NULL,
        invited_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invitee_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
            CHECK (status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        responded_at TIMESTAMPTZ
    )''')
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_team_email_invites_email ON team_email_invites(lower(email), status)'
    )
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_team_email_invites_user ON team_email_invites(invitee_user_id, status)'
    )


def downgrade():
    op.execute('DROP TABLE IF EXISTS team_email_invites')
    op.execute('DROP TABLE IF EXISTS team_avatars')
