"""Post-event player ratings: friendliness (peers) and skill (organizer, open events)."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance import attendance_deadline, attendance_window_open, ensure_aware


async def player_ratings_table_exists(session: AsyncSession) -> bool:
    found = await session.scalar(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = current_schema() AND table_name = 'event_player_ratings' LIMIT 1"
        )
    )
    return found is not None


async def load_rating_event(session: AsyncSession, event_public_id: str):
    return (
        await session.execute(
            text(
                '''SELECT e.id,e.public_id,e.start_at,e.organizer_id,e.join_mode,e.status
                FROM events e WHERE e.public_id=:id'''
            ),
            {'id': event_public_id},
        )
    ).mappings().first()


async def viewer_is_confirmed_participant(session: AsyncSession, event_db_id: int, user_db_id: int) -> bool:
    found = await session.scalar(
        text(
            '''SELECT 1 FROM event_registrations
            WHERE event_id=:event AND user_id=:user AND status='REGISTERED' LIMIT 1'''
        ),
        {'event': event_db_id, 'user': user_db_id},
    )
    return found is not None


def score_to_stars(score: int | None) -> float | None:
    if score is None:
        return None
    return round(max(0.0, min(5.0, score / 20.0)), 1)


async def build_player_ratings_payload(session: AsyncSession, event_row, viewer: dict | None) -> dict:
    if not await player_ratings_table_exists(session):
        raise ValueError('ratings_unavailable')
    start_at = ensure_aware(event_row['start_at'])
    window_open = attendance_window_open(start_at)
    organizer_id = event_row['organizer_id']
    join_mode = event_row['join_mode']
    open_event = join_mode == 'open'

    participants = await session.execute(
        text(
            '''SELECT u.id AS db_id,u.public_id AS id,u.name,u.avatar_url AS "avatarUrl",COALESCE(u.city,'') AS city
            FROM event_registrations r
            JOIN users u ON u.id=r.user_id
            WHERE r.event_id=:event AND r.status='REGISTERED'
            ORDER BY u.name,u.id'''
        ),
        {'event': event_row['id']},
    )
    participant_rows = [dict(row) for row in participants.mappings()]

    rating_rows = await session.execute(
        text(
            '''SELECT target.public_id AS "targetUserId", rater.public_id AS "raterUserId",
            pr.kind, pr.score
            FROM event_player_ratings pr
            JOIN users target ON target.id=pr.target_user_id
            JOIN users rater ON rater.id=pr.rater_user_id
            WHERE pr.event_id=:event'''
        ),
        {'event': event_row['id']},
    )
    ratings = [dict(row) for row in rating_rows.mappings()]

    viewer_db_id = viewer['db_id'] if viewer else None
    viewer_public_id = viewer['id'] if viewer else None
    is_organizer = viewer_db_id is not None and viewer_db_id == organizer_id
    viewer_confirmed = (
        await viewer_is_confirmed_participant(session, event_row['id'], viewer_db_id)
        if viewer_db_id is not None
        else False
    )

    result_rows = []
    for participant in participant_rows:
        target_id = participant['id']
        friendliness_scores = [
            row['score']
            for row in ratings
            if row['targetUserId'] == target_id and row['kind'] == 'friendliness'
        ]
        skill_row = next(
            (
                row
                for row in ratings
                if row['targetUserId'] == target_id and row['kind'] == 'skill'
            ),
            None,
        )
        my_friendliness = next(
            (
                row['score']
                for row in ratings
                if row['targetUserId'] == target_id
                and row['kind'] == 'friendliness'
                and row['raterUserId'] == viewer_public_id
            ),
            None,
        )
        avg_friendliness = (
            round(sum(friendliness_scores) / len(friendliness_scores))
            if friendliness_scores
            else None
        )
        skill_score = skill_row['score'] if skill_row else None
        can_rate_friendliness = (
            window_open
            and viewer_confirmed
            and viewer_public_id is not None
            and target_id != viewer_public_id
        )
        can_rate_skill = window_open and is_organizer and open_event and target_id != viewer_public_id

        result_rows.append(
            {
                'userId': target_id,
                'name': participant['name'],
                'avatarUrl': participant.get('avatarUrl'),
                'city': participant.get('city') or '',
                'avgFriendliness': avg_friendliness,
                'myFriendliness': my_friendliness,
                'skillScore': skill_score,
                'skillStars': score_to_stars(skill_score),
                'canRateFriendliness': can_rate_friendliness,
                'canRateSkill': can_rate_skill,
            }
        )

    return {
        'startsAt': start_at.isoformat(),
        'deadlineAt': attendance_deadline(start_at).isoformat(),
        'windowOpen': window_open,
        'joinMode': join_mode,
        'canView': viewer_confirmed or is_organizer,
        'rows': result_rows,
    }
