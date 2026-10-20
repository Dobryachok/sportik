"""Server-side Sportik progression derived from event participation (visits only)."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def count_past_visits(session: AsyncSession, user_db_id: int) -> int:
    return int(
        await session.scalar(
            text(
                '''SELECT count(*)::integer FROM event_registrations r
                   JOIN events e ON e.id = r.event_id
                   WHERE r.user_id = :user AND r.status = 'REGISTERED' AND e.start_at < now()'''
            ),
            {'user': user_db_id},
        )
        or 0
    )


def resolve_stage(visits: int, closed_challenges: int = 0) -> str:
    if visits >= 40 and closed_challenges >= 4:
        return 'hight'
    if visits >= 10 and closed_challenges >= 1:
        return 'medium'
    return 'default'


def progress_level(visits: int, closed_challenges: int = 0) -> int:
    return visits + closed_challenges * 2


def sportik_payload(visits: int, closed_challenges: int = 0) -> dict:
    stage = resolve_stage(visits, closed_challenges)
    return {
        'level': progress_level(visits, closed_challenges),
        'visits': visits,
        'stage': stage,
        'image': f'/models/{stage}.glb' if stage != 'hight' else '/models/hight.glb',
    }
