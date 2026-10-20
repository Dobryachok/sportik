from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.main import (
    Credentials, EventInput, EventModerationInput, OrganizationApplicationInput,
    OrganizationReviewInput, ReverseGeoInput, SportRequestInput, app, csrf_origin,
    image_extension, password_hasher,
)


def test_auth_and_private_write_contracts_are_published():
    schema = app.openapi()
    for route in (
        '/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/logout',
        '/api/v1/auth/me', '/api/v1/profile', '/api/v1/profile/avatar',
        '/api/v1/geo/reverse', '/api/v1/events/{event_id}/comments',
        '/api/v1/users/{user_id}/follow', '/api/v1/sports/requests',
        '/api/v1/admin/sports', '/api/v1/admin/sports/{sport_id}',
        '/api/v1/organizations/applications', '/api/v1/organizations/mine',
        '/api/v1/organizations/{organization_id}', '/api/v1/admin/organizations',
        '/api/v1/admin/organizations/{organization_id}', '/api/v1/admin/events',
        '/api/v1/admin/events/{event_id}/moderation',
    ):
        assert route in schema['paths']
    assert any(route.path == '/api/v1/events/{event_id}/ws' for route in app.routes)
    assert schema['paths']['/api/v1/events/{event_id}/join']['post']['responses']['201']
    assert 'delete' in schema['paths']['/api/v1/events/{event_id}/join']
    assert 'patch' in schema['paths']['/api/v1/events/{event_id}']
    assert '/media/{media_id}' in schema['paths']


def test_sport_request_rejects_blank_name():
    with pytest.raises(ValidationError):
        SportRequestInput(name='   ')


@pytest.mark.parametrize('field', ['title', 'address', 'sportName'])
def test_whitespace_event_fields_are_not_accepted(field):
    payload = dict(title='Run', address='Park', sportName='Running', city='Krasnoyarsk',
                   startsAt=datetime.now(timezone.utc), capacity=10, joinMode='open', level=1)
    payload[field] = '   '
    with pytest.raises(ValidationError):
        EventInput(**payload)


def test_event_level_accepts_half_stars_and_rejects_other_fractions():
    payload = dict(title='Run', address='Park', sportName='Running', city='Krasnoyarsk',
                   startsAt=datetime.now(timezone.utc), capacity=10, joinMode='open', level=3.5)
    assert EventInput(**payload).level == 3.5
    payload['level'] = 3.25
    with pytest.raises(ValidationError):
        EventInput(**payload)


def test_organization_and_event_moderation_validation():
    application = OrganizationApplicationInput(
        name='Sports club', city='Krasnoyarsk', latitude=55.99, longitude=92.85,
        website='https://example.org', comment='  Review us  ',
    )
    assert application.comment == 'Review us'
    with pytest.raises(ValidationError):
        OrganizationApplicationInput(name='X', city='Krasnoyarsk', latitude=91, longitude=92)
    with pytest.raises(ValidationError):
        OrganizationReviewInput(decision='later')
    assert EventModerationInput(action='unpublish').action == 'unpublish'


def test_password_policy_rejects_weak_passwords():
    with pytest.raises(ValidationError):
        Credentials(email='person@example.com', password='onlylettersxx', name='Person')
    with pytest.raises(ValidationError):
        Credentials(email='person@example.com', password='12345678901', name='Person')


def test_password_hash_is_not_plaintext():
    digest = password_hasher.hash('Example-Password123')
    assert digest != 'Example-Password123'
    assert password_hasher.verify('Example-Password123', digest)
    assert not password_hasher.verify('Wrong-Password123', digest)


def test_geolocation_and_avatar_validation():
    with pytest.raises(ValidationError):
        ReverseGeoInput(latitude=91, longitude=0)
    assert image_extension(b'<svg><script>test</script></svg>') is None
    assert image_extension(b'\x89PNG\r\n\x1a\n' + b'xyz') == ('.png', 'image/png')


def test_csrf_origin_is_an_async_guard():
    assert callable(csrf_origin)


def test_auth_migration_is_additive_for_existing_data():
    migration = (Path(__file__).parents[1] / 'migrations' / 'versions' / '0002_auth_and_clean_demo.py').read_text(encoding='utf8')
    assert 'CREATE TABLE auth_sessions' in migration
    assert 'token_hash CHAR(64) NOT NULL UNIQUE' in migration
    assert 'DELETE FROM users' not in migration
    assert 'DELETE FROM events' not in migration


def test_half_star_migration_is_non_destructive():
    migration = (Path(__file__).parents[1] / 'migrations' / 'versions' / '0005_half_star_levels.py').read_text(encoding='utf8')
    assert 'NUMERIC(2,1)' in migration
    assert 'DROP TABLE' not in migration
    assert 'TRUNCATE' not in migration


def test_follows_and_sport_moderation_migration_is_additive():
    migration = (Path(__file__).parents[1] / 'migrations' / 'versions' / '0006_follows_and_sport_moderation.py').read_text(encoding='utf8')
    assert 'CREATE TABLE IF NOT EXISTS user_follows' in migration
    assert "ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'" in migration
    assert 'DROP TABLE' not in migration.partition('def downgrade():')[0]
    assert 'TRUNCATE' not in migration


def test_organization_and_chat_activity_migration_is_additive():
    migration = (Path(__file__).parents[1] / 'migrations' / 'versions' / '0007_organizations_event_moderation_and_chat_activity.py').read_text(encoding='utf8')
    upgrade = migration.partition('def downgrade():')[0]
    assert 'organization_applications' in upgrade
    assert 'organization_id BIGINT' in upgrade
    assert "PARTICIPANT_JOINED" in upgrade
    assert 'DROP TABLE' not in upgrade
    assert 'TRUNCATE' not in upgrade


def test_new_release_guards_exist_in_backend_source():
    source = (Path(__file__).parents[1] / 'app' / 'main.py').read_text(encoding='utf8')
    assert "status='UNPUBLISHED'" in source
    assert "event_unpublished" in source
    assert "PARTICIPANT_LEFT" in source
    assert 'grant_configured_admin_role' in source
    assert "EXTRACT(YEAR FROM age(current_date,p.birth_date))" in source
    assert 'p.birth_date AS "birthDate"' not in source[source.index('async def find_public_user'):source.index('async def event_rows')]
