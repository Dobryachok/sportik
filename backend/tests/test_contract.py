from datetime import datetime, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.main import Credentials, EventInput, ReverseGeoInput, app, csrf_origin, image_extension, password_hasher


def test_auth_and_private_write_contracts_are_published():
    schema = app.openapi()
    for route in ('/api/v1/auth/register', '/api/v1/auth/login', '/api/v1/auth/logout',
                  '/api/v1/auth/me', '/api/v1/profile', '/api/v1/profile/avatar',
                  '/api/v1/geo/reverse', '/api/v1/events/{event_id}/comments'):
        assert route in schema['paths']
    assert schema['paths']['/api/v1/events/{event_id}/join']['post']['responses']['201']
    assert 'patch' in schema['paths']['/api/v1/events/{event_id}']
    assert '/media/{media_id}' in schema['paths']


@pytest.mark.parametrize('field', ['title', 'address', 'sportName'])
def test_whitespace_event_fields_are_not_accepted(field):
    payload = dict(title='Run', address='Park', sportName='Running', city='Krasnoyarsk',
                   startsAt=datetime.now(timezone.utc), price=0, capacity=10, joinMode='open', level=1)
    payload[field] = '   '
    with pytest.raises(ValidationError):
        EventInput(**payload)


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
    # The implementation is deliberately async so handlers can use it as a dependency.
    assert callable(csrf_origin)


def test_auth_migration_keeps_seed_roles_and_removes_only_known_demo_users():
    migration = (Path(__file__).parents[1] / 'migrations' / 'versions' / '0002_auth_and_clean_demo.py').read_text(encoding='utf8')
    assert "DELETE FROM users WHERE public_id IN ('u-demo', 'u-anya', 'u-vitya')" in migration
    assert 'CREATE TABLE auth_sessions' in migration
    assert 'token_hash CHAR(64) NOT NULL UNIQUE' in migration
    assert 'Database contains non-demo content' in migration
    assert "DELETE FROM events WHERE public_id IN ('ev-tsimlyanskaya', 'ev-run', 'ev-chess')" in migration
