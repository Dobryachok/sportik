"""Expandable compatibility scoring between viewer and candidate profiles."""

from __future__ import annotations

WEIGHTS = {
    'interests': 40,
    'sport': 30,
    'city': 15,
    'extra': 15,
}

_EXTRA_SPLIT = {
    'age': 0.6,
    'shared_teams': 0.4,
}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 0.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _age_score(viewer_age: int | None, candidate_age: int | None) -> float:
    if viewer_age is None or candidate_age is None:
        return 0.5
    diff = abs(viewer_age - candidate_age)
    if diff <= 2:
        return 1.0
    if diff <= 5:
        return 0.7
    if diff <= 10:
        return 0.4
    return 0.1


def compatibility_score(
    *,
    viewer_city: str,
    viewer_age: int | None,
    viewer_interests: set[str],
    viewer_sports: set[str],
    viewer_team_ids: set[int],
    candidate_city: str,
    candidate_age: int | None,
    candidate_interests: set[str],
    candidate_sports: set[str],
    candidate_team_ids: set[int],
) -> int:
    extra = (
        _EXTRA_SPLIT['age'] * _age_score(viewer_age, candidate_age)
        + _EXTRA_SPLIT['shared_teams']
        * _jaccard({str(i) for i in viewer_team_ids}, {str(i) for i in candidate_team_ids})
    )
    parts = [
        WEIGHTS['interests'] * _jaccard(viewer_interests, candidate_interests),
        WEIGHTS['sport'] * _jaccard(viewer_sports, candidate_sports),
        WEIGHTS['city'] * (1.0 if viewer_city and candidate_city and viewer_city.casefold() == candidate_city.casefold() else 0.0),
        WEIGHTS['extra'] * extra,
    ]
    total_weight = sum(WEIGHTS.values())
    return max(0, min(100, round(sum(parts) / total_weight * 100)))


def team_compatibility_score(
    *,
    viewer_city: str,
    viewer_sports: set[str],
    viewer_interests: set[str],
    team_city: str,
    team_sport_slug: str,
) -> int:
    sport_hit = 1.0 if team_sport_slug and team_sport_slug in {s.casefold() for s in viewer_sports} else 0.0
    city_hit = 1.0 if viewer_city and team_city and viewer_city.casefold() == team_city.casefold() else 0.0
    interest_boost = 0.35 if viewer_interests else 0.15
    raw = sport_hit * 0.55 + city_hit * 0.3 + interest_boost * 0.15
    return max(0, min(100, round(raw * 100)))
