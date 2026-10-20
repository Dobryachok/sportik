"""Expandable compatibility scoring between viewer and candidate profiles."""

from __future__ import annotations

WEIGHTS = {
    'interests': 35,
    'sport': 25,
    'city': 20,
    'age': 10,
    'shared_teams': 10,
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
    parts = [
        WEIGHTS['interests'] * _jaccard(viewer_interests, candidate_interests),
        WEIGHTS['sport'] * _jaccard(viewer_sports, candidate_sports),
        WEIGHTS['city'] * (1.0 if viewer_city and candidate_city and viewer_city.casefold() == candidate_city.casefold() else 0.0),
        WEIGHTS['age'] * _age_score(viewer_age, candidate_age),
        WEIGHTS['shared_teams'] * _jaccard(
            {str(i) for i in viewer_team_ids},
            {str(i) for i in candidate_team_ids},
        ),
    ]
    total_weight = sum(WEIGHTS.values())
    return max(0, min(100, round(sum(parts) / total_weight * 100)))
