from app.discovery.compatibility import compatibility_score, team_compatibility_score
from app.main import app


def test_compatibility_score_is_bounded():
    score = compatibility_score(
        viewer_city='Красноярск',
        viewer_age=25,
        viewer_interests={'football', 'music'},
        viewer_sports={'football'},
        viewer_team_ids={1},
        candidate_city='Красноярск',
        candidate_age=24,
        candidate_interests={'football', 'games'},
        candidate_sports={'football'},
        candidate_team_ids={1},
    )
    assert 0 <= score <= 100


def test_team_compatibility_score_is_bounded():
    score = team_compatibility_score(
        viewer_city='Красноярск',
        viewer_sports={'football'},
        viewer_interests={'football'},
        team_city='Красноярск',
        team_sport_slug='football',
    )
    assert 0 <= score <= 100


def test_discovery_routes_are_published():
    paths = app.openapi()['paths']
    for route in (
        '/api/v1/discovery/users',
        '/api/v1/discovery/users/{user_id}/like',
        '/api/v1/discovery/teams',
        '/api/v1/teams/{team_id}/join-request',
        '/api/v1/profile/memberships',
    ):
        assert route in paths


def test_discovery_migration_is_additive():
    from pathlib import Path

    migration = Path(__file__).parents[1].joinpath(
        'migrations', 'versions', '0008_discovery_teams_and_swipes.py'
    ).read_text(encoding='utf8')
    upgrade = migration.partition('def downgrade():')[0]
    assert 'discovery_swipes' in upgrade
    assert 'team_join_requests' in upgrade
    assert "down_revision = '0008_start_completed'" in upgrade
    assert 'DROP TABLE' not in upgrade
