"""Organization social links, address, optional coordinates."""

from alembic import op

revision = '0013_organization_profile_fields'
down_revision = '0012_sport_background_image'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT")
    op.execute(
        "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb"
    )
    op.execute('ALTER TABLE organizations ALTER COLUMN latitude DROP NOT NULL')
    op.execute('ALTER TABLE organizations ALTER COLUMN longitude DROP NOT NULL')


def downgrade() -> None:
    op.execute('ALTER TABLE organizations DROP COLUMN IF EXISTS social_links')
    op.execute('ALTER TABLE organizations DROP COLUMN IF EXISTS address')
    op.execute('ALTER TABLE organizations ALTER COLUMN latitude SET NOT NULL')
    op.execute('ALTER TABLE organizations ALTER COLUMN longitude SET NOT NULL')
