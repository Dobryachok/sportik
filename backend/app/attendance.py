"""Event attendance marks (organizer) and user reliability."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

ATTENDANCE_WINDOW = timedelta(days=7)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def attendance_deadline(start_at: datetime) -> datetime:
    return ensure_aware(start_at) + ATTENDANCE_WINDOW


def attendance_window_open(start_at: datetime, now: datetime | None = None) -> bool:
    moment = now or utc_now()
    start = ensure_aware(start_at)
    return start <= moment <= attendance_deadline(start)


async def registration_has_attendance(session: AsyncSession) -> bool:
    found = await session.scalar(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = current_schema() AND table_name = 'event_registrations' "
            "AND column_name = 'attended' LIMIT 1"
        )
    )
    return found is not None


async def user_reliability_column_sql(session: AsyncSession) -> str:
    if not await registration_has_attendance(session):
        return 'NULL::integer AS "reliabilityPercent"'
    return '''(
        SELECT CASE WHEN counted.total > 0
            THEN round(100.0 * counted.attended / counted.total)::integer
            ELSE NULL END
        FROM (
            SELECT
                count(*) FILTER (WHERE r.attended IS NOT NULL) AS total,
                count(*) FILTER (WHERE r.attended = true) AS attended
            FROM event_registrations r
            WHERE r.user_id = u.id AND r.status = 'REGISTERED'
        ) counted
    ) AS "reliabilityPercent"'''
