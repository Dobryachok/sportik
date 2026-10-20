"""Discovery queue, cards, swipes, and team join requests (raw SQL, no duplicate models)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.discovery.compatibility import compatibility_score, team_compatibility_score
from app.discovery.sportik import count_past_visits, sportik_payload

USER_EXCLUDE_SQL = '''
    AND u.id <> :viewer
    AND NOT EXISTS (
        SELECT 1 FROM discovery_swipes s
        WHERE s.user_id = :viewer AND s.target_type = 'USER' AND s.target_id = u.id
    )
    AND NOT EXISTS (
        SELECT 1 FROM user_follows f
        WHERE f.follower_id = :viewer AND f.followed_id = u.id
    )
    AND NOT EXISTS (
        SELECT 1 FROM user_blocks b
        WHERE (b.blocker_id = :viewer AND b.blocked_id = u.id)
           OR (b.blocker_id = u.id AND b.blocked_id = :viewer)
    )
'''

TEAM_INVITE_TTL_DAYS = 30

TEAM_EXCLUDE_SQL = '''
    AND t.status = 'ACTIVE'
    AND NOT EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = t.id AND tm.user_id = :viewer
    )
    AND NOT EXISTS (
        SELECT 1 FROM team_join_requests r
        WHERE r.team_id = t.id AND r.user_id = :viewer AND r.status = 'PENDING'
    )
    AND NOT EXISTS (
        SELECT 1 FROM discovery_swipes s
        WHERE s.user_id = :viewer AND s.target_type = 'TEAM' AND s.target_id = t.id
    )
'''


async def _row(session: AsyncSession, query: str, params: dict | None = None) -> dict | None:
    result = await session.execute(text(query), params or {})
    row = result.mappings().first()
    return dict(row) if row else None


async def _rows(session: AsyncSession, query: str, params: dict | None = None) -> list[dict]:
    result = await session.execute(text(query), params or {})
    return [dict(row) for row in result.mappings().all()]


async def viewer_profile_bundle(session: AsyncSession, viewer_id: int) -> dict[str, Any]:
    base = await _row(
        session,
        '''SELECT u.id, COALESCE(u.city, '') AS city,
           EXTRACT(YEAR FROM age(current_date, p.birth_date))::integer AS age
           FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
           WHERE u.id = :id''',
        {'id': viewer_id},
    )
    if not base:
        raise HTTPException(404, 'User not found')
    interests = {
        r['slug']
        for r in await _rows(
            session,
            '''SELECT i.slug FROM user_interests ui
               JOIN interests i ON i.id = ui.interest_id WHERE ui.user_id = :id''',
            {'id': viewer_id},
        )
    }
    sports = {
        r['slug']
        for r in await _rows(
            session,
            '''SELECT DISTINCT s.slug FROM event_registrations r
               JOIN events e ON e.id = r.event_id JOIN sports s ON s.id = e.sport_id
               WHERE r.user_id = :id AND r.status = 'REGISTERED'
               UNION
               SELECT DISTINCT s.slug FROM events e JOIN sports s ON s.id = e.sport_id
               WHERE e.organizer_id = :id''',
            {'id': viewer_id},
        )
    }
    team_ids = {
        int(r['team_id'])
        for r in await _rows(
            session, 'SELECT team_id FROM team_members WHERE user_id = :id', {'id': viewer_id}
        )
    }
    return {
        'city': base['city'] or '',
        'age': base.get('age'),
        'interests': interests,
        'sports': sports,
        'team_ids': team_ids,
    }


async def user_sport_stats(session: AsyncSession, user_db_id: int) -> list[dict]:
    return await _rows(
        session,
        '''SELECT s.name AS sport, count(*)::integer AS games
           FROM event_registrations r
           JOIN events e ON e.id = r.event_id
           JOIN sports s ON s.id = e.sport_id
           WHERE r.user_id = :user AND r.status = 'REGISTERED' AND e.start_at < now()
           GROUP BY s.id, s.name
           ORDER BY games DESC, s.name
           LIMIT 8''',
        {'user': user_db_id},
    )


async def user_interests(session: AsyncSession, user_db_id: int) -> list[dict]:
    return await _rows(
        session,
        '''SELECT i.name, i.slug FROM user_interests ui
           JOIN interests i ON i.id = ui.interest_id
           WHERE ui.user_id = :user ORDER BY i.name''',
        {'user': user_db_id},
    )


async def user_teams_groups(session: AsyncSession, user_db_id: int) -> tuple[list[dict], list[dict]]:
    teams = await _rows(
        session,
        '''SELECT t.public_id AS id, t.name, tm.role, s.name AS sport, t.logo_url AS "logoUrl",
           (SELECT count(*)::integer FROM team_members tm2 WHERE tm2.team_id = t.id) AS "membersCount",
           'member' AS "membershipStatus"
           FROM team_members tm
           JOIN teams t ON t.id = tm.team_id
           JOIN sports s ON s.id = t.sport_id
           WHERE tm.user_id = :user AND t.status = 'ACTIVE'
           ORDER BY t.name''',
        {'user': user_db_id},
    )
    pending = await _rows(
        session,
        '''SELECT t.public_id AS id, t.name, 'APPLICANT' AS role, s.name AS sport, t.logo_url AS "logoUrl",
           'pending' AS "membershipStatus"
           FROM team_join_requests r
           JOIN teams t ON t.id = r.team_id
           JOIN sports s ON s.id = t.sport_id
           WHERE r.user_id = :user AND r.status = 'PENDING' AND t.status = 'ACTIVE'
           AND NOT EXISTS (
             SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = :user
           )
           ORDER BY r.created_at DESC''',
        {'user': user_db_id},
    )
    teams.extend(pending)
    groups = await _rows(
        session,
        '''SELECT g.public_id AS id, g.name, gm.role
           FROM group_members gm
           JOIN sport_groups g ON g.id = gm.group_id
           WHERE gm.user_id = :user ORDER BY g.name''',
        {'user': user_db_id},
    )
    return teams, groups


async def build_user_card(session: AsyncSession, viewer_id: int, candidate: dict, viewer: dict) -> dict:
    cand_interests = {r['slug'] for r in await user_interests(session, candidate['db_id'])}
    cand_sports = {
        r['slug']
        for r in await _rows(
            session,
            '''SELECT DISTINCT s.slug FROM event_registrations r
               JOIN events e ON e.id = r.event_id JOIN sports s ON s.id = e.sport_id
               WHERE r.user_id = :id AND r.status = 'REGISTERED'
               UNION
               SELECT DISTINCT s.slug FROM events e JOIN sports s ON s.id = e.sport_id
               WHERE e.organizer_id = :id''',
            {'id': candidate['db_id']},
        )
    }
    cand_teams = {
        int(r['team_id'])
        for r in await _rows(
            session, 'SELECT team_id FROM team_members WHERE user_id = :id', {'id': candidate['db_id']}
        )
    }
    visits = await count_past_visits(session, candidate['db_id'])
    sportik = sportik_payload(visits, 0)
    score = compatibility_score(
        viewer_city=viewer['city'],
        viewer_age=viewer.get('age'),
        viewer_interests=viewer['interests'],
        viewer_sports=viewer['sports'],
        viewer_team_ids=viewer['team_ids'],
        candidate_city=candidate.get('city') or '',
        candidate_age=candidate.get('age'),
        candidate_interests=cand_interests,
        candidate_sports=cand_sports,
        candidate_team_ids=cand_teams,
    )
    return {
        'type': 'user',
        'id': candidate['id'],
        'name': candidate['name'],
        'city': candidate.get('city') or '',
        'age': candidate.get('age'),
        'avatarUrl': candidate.get('avatarUrl'),
        'bio': candidate.get('bio') or '',
        'interests': await user_interests(session, candidate['db_id']),
        'sportStats': await user_sport_stats(session, candidate['db_id']),
        'sportik': sportik,
        'compatibility': score,
    }


async def list_users(
    session: AsyncSession, viewer_id: int, limit: int = 10, cursor: str | None = None
) -> dict:
    viewer = await viewer_profile_bundle(session, viewer_id)
    params: dict[str, Any] = {'viewer': viewer_id, 'limit': limit}
    cursor_sql = ''
    if cursor:
        cursor_sql = ' AND u.public_id > :cursor'
        params['cursor'] = cursor
    candidates = await _rows(
        session,
        f'''SELECT u.id AS db_id, u.public_id AS id, u.name, COALESCE(u.city, '') AS city,
            u.avatar_url AS "avatarUrl", COALESCE(u.bio, '') AS bio,
            EXTRACT(YEAR FROM age(current_date, p.birth_date))::integer AS age
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.status = 'ACTIVE' {USER_EXCLUDE_SQL} {cursor_sql}
            ORDER BY u.public_id
            LIMIT :limit''',
        params,
    )
    items = []
    for candidate in candidates:
        items.append(await build_user_card(session, viewer_id, candidate, viewer))
    next_cursor = candidates[-1]['id'] if len(candidates) == limit else None
    return {'items': items, 'nextCursor': next_cursor}


async def list_teams(
    session: AsyncSession, viewer_id: int, limit: int = 10, cursor: str | None = None
) -> dict:
    viewer = await viewer_profile_bundle(session, viewer_id)
    params: dict[str, Any] = {'viewer': viewer_id, 'limit': limit}
    cursor_sql = ''
    if cursor:
        cursor_sql = ' AND t.public_id > :cursor'
        params['cursor'] = cursor
    team_rows = await _rows(
        session,
        f'''SELECT t.id AS db_id, t.public_id AS id, t.name, t.description, t.city, t.logo_url AS "logoUrl",
            s.public_id AS "sportId", s.name AS sport, s.slug AS "sportSlug", t.created_at AS "createdAt"
            FROM teams t JOIN sports s ON s.id = t.sport_id
            WHERE TRUE {TEAM_EXCLUDE_SQL} {cursor_sql}
            ORDER BY t.public_id
            LIMIT :limit''',
        params,
    )
    items = []
    for team in team_rows:
        items.append(await build_team_card(session, viewer, team))
    next_cursor = team_rows[-1]['id'] if len(team_rows) == limit else None
    return {'items': items, 'nextCursor': next_cursor}


async def team_member_previews(session: AsyncSession, team_db_id: int, limit: int = 12) -> list[dict]:
    return await _rows(
        session,
        '''SELECT u.public_id AS id, u.name, u.avatar_url AS "avatarUrl", tm.role
           FROM team_members tm JOIN users u ON u.id = tm.user_id
           WHERE tm.team_id = :team
           ORDER BY CASE tm.role WHEN 'CAPTAIN' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END, u.name
           LIMIT :limit''',
        {'team': team_db_id, 'limit': limit},
    )


async def team_aggregate_stats(session: AsyncSession, team_db_id: int, sport_db_id: int) -> dict:
    row = await _row(
        session,
        '''SELECT count(*)::integer AS games
           FROM event_registrations r
           JOIN events e ON e.id = r.event_id
           JOIN team_members tm ON tm.user_id = r.user_id AND tm.team_id = :team
           WHERE r.status = 'REGISTERED' AND e.sport_id = :sport AND e.start_at < now()''',
        {'team': team_db_id, 'sport': sport_db_id},
    )
    games = int(row['games']) if row else 0
    return {'games': games, 'wins': 0, 'losses': 0, 'winRate': 0.0}


async def build_team_card(session: AsyncSession, viewer: dict, team: dict) -> dict:
    sport_row = await _row(session, 'SELECT id FROM sports WHERE public_id = :id', {'id': team['sportId']})
    sport_db_id = sport_row['id'] if sport_row else 0
    members = await team_member_previews(session, team['db_id'])
    stats = await team_aggregate_stats(session, team['db_id'], sport_db_id)
    score = team_compatibility_score(
        viewer_city=viewer['city'],
        viewer_sports=viewer['sports'],
        viewer_interests=viewer['interests'],
        team_city=team.get('city') or '',
        team_sport_slug=(team.get('sportSlug') or '').casefold(),
    )
    return {
        'type': 'team',
        'id': team['id'],
        'name': team['name'],
        'description': team.get('description') or '',
        'city': team.get('city') or '',
        'sport': team.get('sport') or '',
        'sportId': team.get('sportId'),
        'logoUrl': team.get('logoUrl'),
        'membersCount': len(
            await _rows(session, 'SELECT 1 FROM team_members WHERE team_id = :t', {'t': team['db_id']})
        ),
        'members': members,
        'stats': stats,
        'compatibility': score,
    }


async def get_user_card_by_public_id(session: AsyncSession, viewer_id: int, public_id: str) -> dict:
    candidate = await _row(
        session,
        '''SELECT u.id AS db_id, u.public_id AS id, u.name, COALESCE(u.city, '') AS city,
            u.avatar_url AS "avatarUrl", COALESCE(u.bio, '') AS bio,
            EXTRACT(YEAR FROM age(current_date, p.birth_date))::integer AS age
            FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.public_id = :id AND u.status = 'ACTIVE' ''',
        {'id': public_id},
    )
    if not candidate:
        raise HTTPException(404, 'User not found')
    viewer = await viewer_profile_bundle(session, viewer_id)
    return await build_user_card(session, viewer_id, candidate, viewer)


async def get_team_by_public_id(session: AsyncSession, viewer_id: int | None, public_id: str) -> dict:
    team = await _row(
        session,
        '''SELECT t.id AS db_id, t.public_id AS id, t.name, t.description, t.city, t.logo_url AS "logoUrl",
            s.public_id AS "sportId", s.name AS sport, s.slug AS "sportSlug", t.created_at AS "createdAt"
            FROM teams t JOIN sports s ON s.id = t.sport_id
            WHERE t.public_id = :id AND t.status = 'ACTIVE' ''',
        {'id': public_id},
    )
    if not team:
        raise HTTPException(404, 'Team not found')
    viewer = await viewer_profile_bundle(session, viewer_id) if viewer_id else {
        'city': '', 'age': None, 'interests': set(), 'sports': set(), 'team_ids': set(),
    }
    card = await build_team_card(session, viewer, team)
    card['createdAt'] = team['createdAt'].isoformat() if team.get('createdAt') else None
    card['history'] = []
    card['members'] = await _rows(
        session,
        '''SELECT u.public_id AS id, u.name, u.avatar_url AS "avatarUrl", tm.role
           FROM team_members tm JOIN users u ON u.id = tm.user_id
           WHERE tm.team_id = :team
           ORDER BY CASE tm.role WHEN 'CAPTAIN' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END, u.name''',
        {'team': team['db_id']},
    )
    if viewer_id:
        viewer_role = await session.scalar(
            text('SELECT role FROM team_members WHERE team_id = :team AND user_id = :user'),
            {'team': team['db_id'], 'user': viewer_id},
        )
        card['viewerRole'] = viewer_role
        card['canManage'] = bool(
            await session.scalar(
                text(
                    '''SELECT 1 FROM team_members
                       WHERE team_id = :team AND user_id = :user AND role IN ('CAPTAIN','ADMIN')'''
                ),
                {'team': team['db_id'], 'user': viewer_id},
            )
        )
        card['joinRequestStatus'] = await session.scalar(
            text(
                '''SELECT status FROM team_join_requests
                   WHERE team_id = :team AND user_id = :user AND status = 'PENDING' LIMIT 1'''
            ),
            {'team': team['db_id'], 'user': viewer_id},
        )
    else:
        card['viewerRole'] = None
        card['canManage'] = False
        card['joinRequestStatus'] = None
    return card


async def resolve_user_db_id(session: AsyncSession, public_id: str) -> int:
    row = await _row(session, "SELECT id FROM users WHERE public_id = :id AND status = 'ACTIVE'", {'id': public_id})
    if not row:
        raise HTTPException(404, 'User not found')
    return int(row['id'])


async def resolve_team_db_id(session: AsyncSession, public_id: str) -> int:
    row = await _row(session, "SELECT id FROM teams WHERE public_id = :id AND status = 'ACTIVE'", {'id': public_id})
    if not row:
        raise HTTPException(404, 'Team not found')
    return int(row['id'])


async def record_user_swipe(session: AsyncSession, viewer_id: int, target_public_id: str, action: str) -> None:
    if target_public_id and viewer_id:
        viewer_public = await session.scalar(
            text('SELECT public_id FROM users WHERE id = :id'), {'id': viewer_id}
        )
        if viewer_public == target_public_id:
            raise HTTPException(422, 'You cannot interact with yourself')
    target_id = await resolve_user_db_id(session, target_public_id)
    await session.execute(
        text(
            '''INSERT INTO discovery_swipes(user_id, target_type, target_id, action)
               VALUES (:viewer, 'USER', :target, :action)
               ON CONFLICT (user_id, target_type, target_id)
               DO UPDATE SET action = EXCLUDED.action, created_at = now()'''
        ),
        {'viewer': viewer_id, 'target': target_id, 'action': action},
    )


async def like_user(
    session: AsyncSession,
    viewer_id: int,
    target_public_id: str,
    notify: Any,
) -> dict:
    target_id = await resolve_user_db_id(session, target_public_id)
    if target_id == viewer_id:
        raise HTTPException(422, 'You cannot like yourself')
    blocked = await session.scalar(
        text(
            '''SELECT 1 FROM user_blocks
               WHERE (blocker_id = :a AND blocked_id = :b) OR (blocker_id = :b AND blocked_id = :a)'''
        ),
        {'a': viewer_id, 'b': target_id},
    )
    if blocked:
        raise HTTPException(403, 'User is not available')
    await record_user_swipe(session, viewer_id, target_public_id, 'LIKE')
    exists = await session.scalar(
        text('SELECT 1 FROM user_follows WHERE follower_id = :f AND followed_id = :t'),
        {'f': viewer_id, 't': target_id},
    )
    if not exists:
        await session.execute(
            text('INSERT INTO user_follows(follower_id, followed_id) VALUES (:f, :t)'),
            {'f': viewer_id, 't': target_id},
        )
    await notify(session, viewer_id, target_id, target_public_id)
    return {'ok': True}


async def skip_user(session: AsyncSession, viewer_id: int, target_public_id: str) -> dict:
    await record_user_swipe(session, viewer_id, target_public_id, 'SKIP')
    return {'ok': True}


async def like_team(session: AsyncSession, viewer_id: int, team_public_id: str, notify: Any) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    member = await session.scalar(
        text('SELECT 1 FROM team_members WHERE team_id = :t AND user_id = :u'),
        {'t': team_id, 'u': viewer_id},
    )
    if member:
        raise HTTPException(409, 'You are already a member of this team')
    pending = await session.scalar(
        text(
            '''SELECT id FROM team_join_requests
               WHERE team_id = :t AND user_id = :u AND status = 'PENDING' '''
        ),
        {'t': team_id, 'u': viewer_id},
    )
    if pending:
        raise HTTPException(409, 'Join request already pending')
    await session.execute(
        text(
            '''INSERT INTO discovery_swipes(user_id, target_type, target_id, action)
               VALUES (:viewer, 'TEAM', :target, 'LIKE')
               ON CONFLICT (user_id, target_type, target_id)
               DO UPDATE SET action = 'LIKE', created_at = now()'''
        ),
        {'viewer': viewer_id, 'target': team_id},
    )
    request_id = await session.scalar(
        text(
            '''INSERT INTO team_join_requests(team_id, user_id, status)
               VALUES (:team, :user, 'PENDING') RETURNING id'''
        ),
        {'team': team_id, 'user': viewer_id},
    )
    await notify(session, viewer_id, team_id, team_public_id, int(request_id))
    return {'ok': True, 'requestId': int(request_id)}


async def skip_team(session: AsyncSession, viewer_id: int, team_public_id: str) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    await session.execute(
        text(
            '''INSERT INTO discovery_swipes(user_id, target_type, target_id, action)
               VALUES (:viewer, 'TEAM', :target, 'SKIP')
               ON CONFLICT (user_id, target_type, target_id)
               DO UPDATE SET action = 'SKIP', created_at = now()'''
        ),
        {'viewer': viewer_id, 'target': team_id},
    )
    return {'ok': True}


async def team_managers(session: AsyncSession, team_db_id: int) -> list[int]:
    rows = await _rows(
        session,
        '''SELECT user_id FROM team_members
           WHERE team_id = :team AND role IN ('CAPTAIN', 'ADMIN')''',
        {'team': team_db_id},
    )
    return [int(r['user_id']) for r in rows]


async def assert_team_manager(session: AsyncSession, team_db_id: int, user_db_id: int) -> None:
    allowed = await session.scalar(
        text(
            '''SELECT 1 FROM team_members
               WHERE team_id = :team AND user_id = :user AND role IN ('CAPTAIN', 'ADMIN')'''
        ),
        {'team': team_db_id, 'user': user_db_id},
    )
    if not allowed:
        raise HTTPException(403, 'Team manager access is required')


async def list_join_requests(session: AsyncSession, team_public_id: str, manager_id: int) -> list[dict]:
    team_id = await resolve_team_db_id(session, team_public_id)
    await assert_team_manager(session, team_id, manager_id)
    pending = await _rows(
        session,
        '''SELECT r.id, u.public_id AS "userId", u.name, u.avatar_url AS "avatarUrl", r.status, r.created_at AS "createdAt"
           FROM team_join_requests r JOIN users u ON u.id = r.user_id
           WHERE r.team_id = :team AND r.status = 'PENDING'
           ORDER BY r.created_at DESC''',
        {'team': team_id},
    )
    for item in pending:
        item['requestId'] = item['id']
        if item.get('createdAt'):
            item['createdAt'] = item['createdAt'].isoformat()
    return pending


async def get_join_request_card(session: AsyncSession, request_id: int, manager_id: int) -> dict:
    row = await _row(
        session,
        '''SELECT r.id, r.status, r.team_id, t.public_id AS "teamPublicId", t.name AS "teamName",
            u.id AS "userDbId", u.public_id AS "userId"
           FROM team_join_requests r
           JOIN teams t ON t.id = r.team_id
           JOIN users u ON u.id = r.user_id
           WHERE r.id = :id''',
        {'id': request_id},
    )
    if not row:
        raise HTTPException(404, 'Join request not found')
    await assert_team_manager(session, int(row['team_id']), manager_id)
    user_card = await get_user_card_by_public_id(session, manager_id, row['userId'])
    return {
        'requestId': row['id'],
        'status': row['status'],
        'teamId': row['teamPublicId'],
        'teamName': row['teamName'],
        'applicant': user_card,
    }


async def accept_join_request(
    session: AsyncSession, team_public_id: str, request_id: int, manager_id: int, notify: Any
) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    await assert_team_manager(session, team_id, manager_id)
    req = await _row(
        session,
        '''SELECT id, user_id, status FROM team_join_requests
           WHERE id = :id AND team_id = :team FOR UPDATE''',
        {'id': request_id, 'team': team_id},
    )
    if not req:
        raise HTTPException(404, 'Join request not found')
    if req['status'] != 'PENDING':
        raise HTTPException(409, 'Join request is no longer active')
    await session.execute(
        text(
            '''UPDATE team_join_requests SET status = 'ACCEPTED', reviewed_by = :mgr, reviewed_at = now()
               WHERE id = :id'''
        ),
        {'mgr': manager_id, 'id': request_id},
    )
    await session.execute(
        text(
            '''INSERT INTO team_members(team_id, user_id, role)
               VALUES (:team, :user, 'MEMBER') ON CONFLICT (team_id, user_id) DO NOTHING'''
        ),
        {'team': team_id, 'user': req['user_id']},
    )
    await _close_team_invites_for_existing_member(session, int(req['user_id']), team_id)
    team_name = await session.scalar(text('SELECT name FROM teams WHERE id = :id'), {'id': team_id})
    await notify(session, int(req['user_id']), team_id, team_public_id, team_name or '', accepted=True)
    return {'status': 'ACCEPTED'}


async def reject_join_request(
    session: AsyncSession, team_public_id: str, request_id: int, manager_id: int, notify: Any
) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    await assert_team_manager(session, team_id, manager_id)
    req = await _row(
        session,
        '''SELECT id, user_id, status FROM team_join_requests
           WHERE id = :id AND team_id = :team FOR UPDATE''',
        {'id': request_id, 'team': team_id},
    )
    if not req:
        raise HTTPException(404, 'Join request not found')
    if req['status'] != 'PENDING':
        raise HTTPException(409, 'Join request is no longer active')
    await session.execute(
        text(
            '''UPDATE team_join_requests SET status = 'REJECTED', reviewed_by = :mgr, reviewed_at = now()
               WHERE id = :id'''
        ),
        {'mgr': manager_id, 'id': request_id},
    )
    team_name = await session.scalar(text('SELECT name FROM teams WHERE id = :id'), {'id': team_id})
    await notify(session, int(req['user_id']), team_id, team_public_id, team_name or '', accepted=False)
    return {'status': 'REJECTED'}


class TeamCreateInput:
    def __init__(self, name: str, city: str, sport_id: str, description: str | None = None):
        self.name = name.strip()
        self.city = city.strip()
        self.sport_id = sport_id
        self.description = (description or '').strip()


async def create_team(session: AsyncSession, owner_id: int, payload: TeamCreateInput) -> dict:
    if not payload.name or not payload.city:
        raise HTTPException(422, 'Name and city are required')
    sport = await _row(
        session, "SELECT id FROM sports WHERE public_id = :id AND status = 'APPROVED'", {'id': payload.sport_id}
    )
    if not sport:
        raise HTTPException(422, 'Sport not found')
    public_id = f"tm-{secrets.token_hex(6)}"
    team_id = await session.scalar(
        text(
            '''INSERT INTO teams(public_id, name, description, city, sport_id, logo_url)
               VALUES (:pid, :name, :desc, :city, :sport, NULL) RETURNING id'''
        ),
        {
            'pid': public_id,
            'name': payload.name[:255],
            'desc': payload.description[:5000] if payload.description else None,
            'city': payload.city[:150],
            'sport': sport['id'],
        },
    )
    await session.execute(
        text("INSERT INTO team_members(team_id, user_id, role) VALUES (:t, :u, 'CAPTAIN')"),
        {'t': team_id, 'u': owner_id},
    )
    return {'id': public_id, 'name': payload.name}


async def profile_memberships(session: AsyncSession, user_id: int) -> dict:
    teams, groups = await user_teams_groups(session, user_id)
    return {'teams': teams, 'groups': groups}


async def invite_team_by_email(
    session: AsyncSession,
    team_public_id: str,
    manager_id: int,
    email: str,
    notify: Any,
) -> dict:
    normalized = email.strip().lower()
    if '@' not in normalized or '.' not in normalized.split('@')[-1]:
        raise HTTPException(422, 'Enter a valid email address')
    team_id = await resolve_team_db_id(session, team_public_id)
    await assert_team_manager(session, team_id, manager_id)
    invitee = await _row(
        session,
        "SELECT id, public_id FROM users WHERE lower(email) = :email AND status = 'ACTIVE'",
        {'email': normalized},
    )
    if invitee and await session.scalar(
        text('SELECT 1 FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': invitee['id']},
    ):
        raise HTTPException(409, 'User is already a team member')
    existing = await session.scalar(
        text(
            '''SELECT id FROM team_email_invites
               WHERE team_id = :team AND lower(email) = :email AND status = 'PENDING' '''
        ),
        {'team': team_id, 'email': normalized},
    )
    if existing:
        raise HTTPException(409, 'Invite already sent to this email')
    invite_id = await session.scalar(
        text(
            '''INSERT INTO team_email_invites(team_id, email, invited_by, invitee_user_id, status)
               VALUES (:team, :email, :manager, :invitee, 'PENDING') RETURNING id'''
        ),
        {
            'team': team_id,
            'email': normalized,
            'manager': manager_id,
            'invitee': invitee['id'] if invitee else None,
        },
    )
    await notify(session, manager_id, team_id, team_public_id, normalized, int(invite_id), invitee)
    return {'ok': True, 'inviteId': int(invite_id), 'userFound': bool(invitee)}


def _invite_is_expired(created_at: datetime | None) -> bool:
    if created_at is None:
        return False
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created_at > timedelta(days=TEAM_INVITE_TTL_DAYS)


async def _load_team_email_invite(session: AsyncSession, invite_id: int, *, lock: bool = False) -> dict | None:
    lock_sql = ' FOR UPDATE' if lock else ''
    return await _row(
        session,
        f'''SELECT i.id, i.team_id, i.email, i.status, i.created_at,
           t.public_id AS "teamPublicId", t.status AS "teamStatus"
           FROM team_email_invites i JOIN teams t ON t.id = i.team_id
           WHERE i.id = :id{lock_sql}''',
        {'id': invite_id},
    )


async def accept_team_email_invite(session: AsyncSession, invite_id: int, user_id: int) -> dict:
    invite = await _load_team_email_invite(session, invite_id, lock=True)
    if not invite or invite['status'] != 'PENDING':
        raise HTTPException(404, 'Invite not found')
    if invite['teamStatus'] != 'ACTIVE':
        raise HTTPException(410, 'Team is no longer available')
    if _invite_is_expired(invite.get('created_at')):
        await session.execute(
            text("UPDATE team_email_invites SET status = 'CANCELLED', responded_at = now() WHERE id = :id"),
            {'id': invite_id},
        )
        raise HTTPException(410, 'Invite has expired')
    user_email = await session.scalar(text('SELECT lower(email) FROM users WHERE id = :id'), {'id': user_id})
    if user_email != invite['email'].lower():
        raise HTTPException(403, 'This invite was sent to another email address')
    if await session.scalar(
        text('SELECT 1 FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': invite['team_id'], 'user': user_id},
    ):
        await session.execute(
            text("UPDATE team_email_invites SET status = 'ACCEPTED', invitee_user_id = :user, responded_at = now() WHERE id = :id"),
            {'user': user_id, 'id': invite_id},
        )
        raise HTTPException(409, 'You are already a member of this team')
    await session.execute(
        text(
            '''INSERT INTO team_members(team_id, user_id, role)
               VALUES (:team, :user, 'MEMBER') ON CONFLICT (team_id, user_id) DO NOTHING'''
        ),
        {'team': invite['team_id'], 'user': user_id},
    )
    await session.execute(
        text("UPDATE team_email_invites SET status = 'ACCEPTED', invitee_user_id = :user, responded_at = now() WHERE id = :id"),
        {'user': user_id, 'id': invite_id},
    )
    return {'status': 'ACCEPTED', 'teamId': invite['teamPublicId']}


async def decline_team_email_invite(session: AsyncSession, invite_id: int, user_id: int) -> dict:
    invite = await _load_team_email_invite(session, invite_id, lock=True)
    if not invite or invite['status'] != 'PENDING':
        raise HTTPException(404, 'Invite not found')
    if _invite_is_expired(invite.get('created_at')):
        await session.execute(
            text("UPDATE team_email_invites SET status = 'CANCELLED', responded_at = now() WHERE id = :id"),
            {'id': invite_id},
        )
        raise HTTPException(410, 'Invite has expired')
    user_email = await session.scalar(text('SELECT lower(email) FROM users WHERE id = :id'), {'id': user_id})
    if user_email != invite['email'].lower():
        raise HTTPException(403, 'This invite was sent to another email address')
    await session.execute(
        text("UPDATE team_email_invites SET status = 'DECLINED', invitee_user_id = :user, responded_at = now() WHERE id = :id"),
        {'user': user_id, 'id': invite_id},
    )
    return {'status': 'DECLINED'}


async def leave_team(session: AsyncSession, team_public_id: str, user_id: int) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    team_status = await session.scalar(text("SELECT status FROM teams WHERE id = :id"), {'id': team_id})
    if team_status != 'ACTIVE':
        raise HTTPException(404, 'Team not found')
    role = await session.scalar(
        text('SELECT role FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': user_id},
    )
    if not role:
        raise HTTPException(404, 'You are not a member of this team')
    if role == 'CAPTAIN':
        raise HTTPException(
            409,
            'Капитан не может выйти из команды. Передайте капитанство другому участнику или распустите команду.',
        )
    await session.execute(
        text('DELETE FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': user_id},
    )
    return {'ok': True}


async def transfer_team_captain(
    session: AsyncSession,
    team_public_id: str,
    actor_id: int,
    new_captain_public_id: str,
) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    role = await session.scalar(
        text('SELECT role FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': actor_id},
    )
    if role != 'CAPTAIN':
        raise HTTPException(403, 'Only the team captain can transfer captaincy')
    new_captain_id = await resolve_user_db_id(session, new_captain_public_id)
    if new_captain_id == actor_id:
        raise HTTPException(422, 'Select another team member as captain')
    is_member = await session.scalar(
        text('SELECT 1 FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': new_captain_id},
    )
    if not is_member:
        raise HTTPException(422, 'New captain must be a current team member')
    await session.execute(
        text("UPDATE team_members SET role = 'MEMBER' WHERE team_id = :team AND role = 'CAPTAIN'"),
        {'team': team_id},
    )
    await session.execute(
        text("UPDATE team_members SET role = 'CAPTAIN' WHERE team_id = :team AND user_id = :user"),
        {'team': team_id, 'user': new_captain_id},
    )
    return {'ok': True, 'newCaptainId': new_captain_public_id}


async def remove_team_member(
    session: AsyncSession,
    team_public_id: str,
    manager_id: int,
    member_public_id: str,
) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    await assert_team_manager(session, team_id, manager_id)
    member_id = await resolve_user_db_id(session, member_public_id)
    if member_id == manager_id:
        raise HTTPException(422, 'Use leave or dissolve flow for yourself')
    target_role = await session.scalar(
        text('SELECT role FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': member_id},
    )
    if not target_role:
        raise HTTPException(404, 'User is not a member of this team')
    if target_role == 'CAPTAIN':
        raise HTTPException(409, 'Cannot remove the captain. Transfer captaincy first.')
    await session.execute(
        text('DELETE FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': member_id},
    )
    return {'ok': True}


async def dissolve_team(session: AsyncSession, team_public_id: str, captain_id: int) -> dict:
    team_id = await resolve_team_db_id(session, team_public_id)
    role = await session.scalar(
        text('SELECT role FROM team_members WHERE team_id = :team AND user_id = :user'),
        {'team': team_id, 'user': captain_id},
    )
    if role != 'CAPTAIN':
        raise HTTPException(403, 'Only the team captain can dissolve the team')
    await session.execute(
        text("UPDATE team_join_requests SET status = 'REJECTED', reviewed_at = now() WHERE team_id = :team AND status = 'PENDING'"),
        {'team': team_id},
    )
    await session.execute(text('DELETE FROM team_members WHERE team_id = :team'), {'team': team_id})
    await session.execute(
        text("UPDATE teams SET status = 'DISSOLVED', updated_at = now() WHERE id = :id"),
        {'id': team_id},
    )
    return {'ok': True}


async def attach_pending_team_invites(session: AsyncSession, user_id: int, email: str) -> None:
    pending = await _rows(
        session,
        '''SELECT i.id, i.team_id, t.public_id AS "teamPublicId", t.name AS "teamName"
           FROM team_email_invites i
           JOIN teams t ON t.id = i.team_id
           WHERE lower(i.email) = :email AND i.status = 'PENDING' ''',
        {'email': email.strip().lower()},
    )
    for item in pending:
        await session.execute(
            text('UPDATE team_email_invites SET invitee_user_id = :user WHERE id = :id'),
            {'user': user_id, 'id': item['id']},
        )
        await session.execute(
            text(
                '''INSERT INTO notifications(user_id, type, title, message, team_id, target_type, target_public_id)
                   VALUES (:user, 'TEAM_INVITE', :title, :message, :team, 'TEAM', :public_id)'''
            ),
            {
                'user': user_id,
                'title': 'Приглашение в команду',
                'message': f'Вас пригласили в команду «{item["teamName"]}».',
                'team': item['team_id'],
                'public_id': item['teamPublicId'],
            },
        )


async def _close_team_invites_for_existing_member(session: AsyncSession, user_id: int, team_id: int | None = None) -> None:
    """Mark pending email invites as accepted when the user already belongs to the team."""
    team_filter = 'AND i.team_id = :team' if team_id is not None else ''
    params: dict = {'user': user_id}
    if team_id is not None:
        params['team'] = team_id
    await session.execute(
        text(
            f'''UPDATE team_email_invites i
               SET status = 'ACCEPTED', invitee_user_id = :user, responded_at = now()
               WHERE i.status = 'PENDING'
                 {team_filter}
                 AND EXISTS (
                   SELECT 1 FROM team_members tm
                   WHERE tm.team_id = i.team_id AND tm.user_id = :user
                 )
                 AND (
                   i.invitee_user_id = :user
                   OR lower(i.email) = (SELECT lower(email) FROM users WHERE id = :user)
                 )'''
        ),
        params,
    )


async def list_pending_team_invites(session: AsyncSession, user_id: int) -> list[dict]:
    await _close_team_invites_for_existing_member(session, user_id)
    rows_out = await _rows(
        session,
        '''SELECT i.id AS "inviteId", t.public_id AS "teamId", t.name AS "teamName", t.logo_url AS "logoUrl",
           u.name AS "invitedByName", i.created_at AS "createdAt"
           FROM team_email_invites i
           JOIN teams t ON t.id = i.team_id
           JOIN users u ON u.id = i.invited_by
           WHERE i.invitee_user_id = :user AND i.status = 'PENDING'
             AND NOT EXISTS (
               SELECT 1 FROM team_members tm
               WHERE tm.team_id = i.team_id AND tm.user_id = :user
             )
           ORDER BY i.created_at DESC''',
        {'user': user_id},
    )
    for item in rows_out:
        if item.get('createdAt'):
            item['createdAt'] = item['createdAt'].isoformat()
    return rows_out


async def upload_team_logo(
    session: AsyncSession,
    team_public_id: str,
    manager_id: int,
    media_id: str,
    filename: str,
    content_type: str,
) -> str:
    team_id = await resolve_team_db_id(session, team_public_id)
    await assert_team_manager(session, team_id, manager_id)
    old = await session.scalar(text('SELECT filename FROM team_avatars WHERE team_id = :id'), {'id': team_id})
    await session.execute(
        text(
            '''INSERT INTO team_avatars(id, team_id, filename, content_type)
               VALUES (:media, :team, :file, :type)
               ON CONFLICT (team_id) DO UPDATE
               SET id = EXCLUDED.id, filename = EXCLUDED.filename,
                   content_type = EXCLUDED.content_type, created_at = now()'''
        ),
        {'media': media_id, 'team': team_id, 'file': filename, 'type': content_type},
    )
    logo_url = f'/media/{media_id}'
    await session.execute(
        text('UPDATE teams SET logo_url = :url, updated_at = now() WHERE id = :id'),
        {'url': logo_url, 'id': team_id},
    )
    return logo_url, old
