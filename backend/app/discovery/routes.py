"""Discovery HTTP routes (registered from main after app bootstrap)."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.discovery import service
from app.discovery.schemas import TeamRequestReviewInput

router = APIRouter()


class TeamCreateBody(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    city: str = Field(min_length=1, max_length=150)
    sportId: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=5000)


class TeamInviteBody(BaseModel):
    email: str = Field(min_length=3, max_length=254)


class TransferCaptainBody(BaseModel):
    newCaptainId: str = Field(min_length=2, max_length=80)


def register(app):
    from app.main import db_session, require_user, restart_redis_cache

    async def notify_user_like(session: AsyncSession, actor_id: int, target_id: int, target_public_id: str):
        actor_row = (
            await session.execute(
                text('SELECT name, public_id FROM users WHERE id = :id'),
                {'id': actor_id},
            )
        ).mappings().first()
        actor_name = actor_row['name'] if actor_row else 'Пользователь'
        actor_public_id = actor_row['public_id'] if actor_row else target_public_id
        await session.execute(
            text(
                '''INSERT INTO notifications(
                    user_id, type, title, message, actor_user_id, target_type, target_public_id
                ) VALUES (
                    :target, 'DISCOVERY_LIKE', :title, :message, :actor, 'USER', :public_id
                )'''
            ),
            {
                'target': target_id,
                'title': 'Новый интерес к профилю',
                'message': f'❤️ {actor_name} заинтересовался(-ась) вашим профилем',
                'actor': actor_id,
                'public_id': actor_public_id,
            },
        )

    async def notify_team_join(
        session: AsyncSession,
        actor_id: int,
        team_db_id: int,
        team_public_id: str,
        request_id: int,
    ):
        actor_name = await session.scalar(text('SELECT name FROM users WHERE id = :id'), {'id': actor_id})
        team_name = await session.scalar(text('SELECT name FROM teams WHERE id = :id'), {'id': team_db_id})
        managers = await service.team_managers(session, team_db_id)
        for manager_id in managers:
            await session.execute(
                text(
                    '''INSERT INTO notifications(
                        user_id, type, title, message, actor_user_id,
                        target_type, target_public_id, team_id, team_request_id
                    ) VALUES (
                        :user, 'TEAM_JOIN_REQUEST', :title, :message, :actor,
                        'TEAM', :team_public, :team, :request
                    )'''
                ),
                {
                    'user': manager_id,
                    'title': 'Заявка в команду',
                    'message': f'👥 {actor_name} хочет вступить в команду «{team_name}»',
                    'actor': actor_id,
                    'team_public': team_public_id,
                    'team': team_db_id,
                    'request': request_id,
                },
            )

    async def notify_team_email_invite(
        session: AsyncSession,
        manager_id: int,
        team_db_id: int,
        team_public_id: str,
        email: str,
        invite_id: int,
        invitee: dict | None,
    ):
        team_name = await session.scalar(text('SELECT name FROM teams WHERE id = :id'), {'id': team_db_id})
        manager_name = await session.scalar(text('SELECT name FROM users WHERE id = :id'), {'id': manager_id})
        if invitee:
            await session.execute(
                text(
                    '''INSERT INTO notifications(
                        user_id, type, title, message, actor_user_id,
                        target_type, target_public_id, team_id
                    ) VALUES (
                        :user, 'TEAM_INVITE', :title, :message, :actor,
                        'TEAM', :public_id, :team
                    )'''
                ),
                {
                    'user': invitee['id'],
                    'title': 'Приглашение в команду',
                    'message': f'👥 {manager_name} пригласил(а) вас в команду «{team_name}».',
                    'actor': manager_id,
                    'public_id': team_public_id,
                    'team': team_db_id,
                },
            )

    async def notify_join_result(
        session: AsyncSession,
        applicant_id: int,
        team_db_id: int,
        team_public_id: str,
        team_name: str,
        *,
        accepted: bool,
    ):
        if accepted:
            await session.execute(
                text(
                    '''INSERT INTO notifications(
                        user_id, type, title, message, target_type, target_public_id, team_id
                    ) VALUES (
                        :user, 'TEAM_REQUEST_ACCEPTED', :title, :message, 'TEAM', :public_id, :team
                    )'''
                ),
                {
                    'user': applicant_id,
                    'title': 'Вас приняли в команду',
                    'message': f'🎉 Вас приняли в команду «{team_name}»',
                    'public_id': team_public_id,
                    'team': team_db_id,
                },
            )
        else:
            await session.execute(
                text(
                    '''INSERT INTO notifications(
                        user_id, type, title, message, target_type, target_public_id, team_id
                    ) VALUES (
                        :user, 'TEAM_REQUEST_REJECTED', :title, :message, 'TEAM', :public_id, :team
                    )'''
                ),
                {
                    'user': applicant_id,
                    'title': 'Заявка отклонена',
                    'message': f'Заявка в команду «{team_name}» отклонена',
                    'public_id': team_public_id,
                    'team': team_db_id,
                },
            )

    @router.get('/discovery/users')
    async def discovery_users(
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
        limit: int = Query(default=10, ge=1, le=20),
        cursor: str | None = None,
    ):
        return await service.list_users(session, user['db_id'], limit, cursor)

    @router.get('/discovery/users/{user_id}')
    async def discovery_user_card(user_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        return await service.get_user_card_by_public_id(session, user['db_id'], user_id)

    @router.post('/discovery/users/{user_id}/like')
    async def discovery_user_like(user_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.like_user(session, user['db_id'], user_id, notify_user_like)
        await restart_redis_cache()
        return result

    @router.post('/discovery/users/{user_id}/skip')
    async def discovery_user_skip(user_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.skip_user(session, user['db_id'], user_id)
        return result

    @router.get('/discovery/teams')
    async def discovery_teams(
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
        limit: int = Query(default=10, ge=1, le=20),
        cursor: str | None = None,
    ):
        return await service.list_teams(session, user['db_id'], limit, cursor)

    @router.get('/discovery/teams/{team_id}')
    async def discovery_team_detail(team_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        return await service.get_team_by_public_id(session, user['db_id'], team_id)

    @router.post('/discovery/teams/{team_id}/skip')
    async def discovery_team_skip(team_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.skip_team(session, user['db_id'], team_id)
        return result

    @router.post('/teams/{team_id}/join-request')
    async def team_join_request(team_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.like_team(session, user['db_id'], team_id, notify_team_join)
        await restart_redis_cache()
        return result

    @router.get('/teams/{team_id}/join-requests')
    async def team_join_requests(team_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        return await service.list_join_requests(session, team_id, user['db_id'])

    @router.get('/teams/join-requests/{request_id}')
    async def team_join_request_card(
        request_id: int, user=Depends(require_user), session: AsyncSession = Depends(db_session)
    ):
        return await service.get_join_request_card(session, request_id, user['db_id'])

    @router.post('/teams/{team_id}/join-requests/{request_id}/accept')
    async def accept_team_request(
        team_id: str,
        request_id: int,
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
        _payload: TeamRequestReviewInput | None = None,
    ):
        await session.commit()
        async with session.begin():
            result = await service.accept_join_request(
                session, team_id, request_id, user['db_id'], notify_join_result
            )
        await restart_redis_cache()
        return result

    @router.post('/teams/{team_id}/join-requests/{request_id}/reject')
    async def reject_team_request(
        team_id: str,
        request_id: int,
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
        _payload: TeamRequestReviewInput | None = None,
    ):
        await session.commit()
        async with session.begin():
            result = await service.reject_join_request(
                session, team_id, request_id, user['db_id'], notify_join_result
            )
        await restart_redis_cache()
        return result

    @router.get('/profile/memberships')
    async def memberships(user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        return await service.profile_memberships(session, user['db_id'])

    @router.get('/profile/team-invites')
    async def team_invites(user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.list_pending_team_invites(session, user['db_id'])
        return result

    @router.post('/teams/invites/{invite_id}/accept')
    @router.post('/team-invitations/{invite_id}/accept')
    async def accept_team_invite(invite_id: int, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.accept_team_email_invite(session, invite_id, user['db_id'])
        await restart_redis_cache()
        return result

    @router.post('/teams/invites/{invite_id}/decline')
    @router.post('/team-invitations/{invite_id}/decline')
    async def decline_team_invite(invite_id: int, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.decline_team_email_invite(session, invite_id, user['db_id'])
        await restart_redis_cache()
        return result

    @router.post('/teams/{team_id}/leave')
    async def leave_team_route(team_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.leave_team(session, team_id, user['db_id'])
        await restart_redis_cache()
        return result

    @router.post('/teams/{team_id}/transfer-captain')
    async def transfer_captain_route(
        team_id: str,
        payload: TransferCaptainBody,
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
    ):
        await session.commit()
        async with session.begin():
            result = await service.transfer_team_captain(
                session, team_id, user['db_id'], payload.newCaptainId
            )
        await restart_redis_cache()
        return result

    @router.delete('/teams/{team_id}/members/{member_id}')
    async def remove_team_member_route(
        team_id: str,
        member_id: str,
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
    ):
        await session.commit()
        async with session.begin():
            result = await service.remove_team_member(session, team_id, user['db_id'], member_id)
        await restart_redis_cache()
        return result

    @router.post('/teams/{team_id}/dissolve')
    async def dissolve_team_route(team_id: str, user=Depends(require_user), session: AsyncSession = Depends(db_session)):
        await session.commit()
        async with session.begin():
            result = await service.dissolve_team(session, team_id, user['db_id'])
        await restart_redis_cache()
        return result

    @router.post('/teams/{team_id}/invites')
    async def invite_to_team(
        team_id: str,
        payload: TeamInviteBody,
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
    ):
        await session.commit()
        async with session.begin():
            result = await service.invite_team_by_email(
                session, team_id, user['db_id'], payload.email, notify_team_email_invite
            )
        await restart_redis_cache()
        return result

    @router.post('/teams/{team_id}/logo')
    async def upload_team_logo(
        team_id: str,
        file: UploadFile = File(...),
        user=Depends(require_user),
        session: AsyncSession = Depends(db_session),
    ):
        from app.main import image_extension, settings

        data = await file.read(settings.max_avatar_bytes + 1)
        kind = image_extension(data)
        if len(data) > settings.max_avatar_bytes or not kind:
            from fastapi import HTTPException

            raise HTTPException(422, 'Logo must be a JPEG, PNG, or WebP image up to 5 MB')
        extension, content_type = kind
        media_id = uuid4().hex
        filename = media_id + extension
        path = settings.upload_dir / filename
        path.write_bytes(data)
        try:
            await session.commit()
            async with session.begin():
                logo_url, old = await service.upload_team_logo(
                    session, team_id, user['db_id'], media_id, filename, content_type
                )
        except Exception:
            path.unlink(missing_ok=True)
            raise
        if old:
            try:
                (settings.upload_dir / old).unlink(missing_ok=True)
            except OSError:
                pass
        await restart_redis_cache()
        return {'logoUrl': logo_url}

    @router.post('/teams')
    async def create_team_route(
        payload: TeamCreateBody, user=Depends(require_user), session: AsyncSession = Depends(db_session)
    ):
        await session.commit()
        async with session.begin():
            created = await service.create_team(
                session,
                user['db_id'],
                service.TeamCreateInput(payload.name, payload.city, payload.sportId, payload.description),
            )
        await restart_redis_cache()
        return created

    app.include_router(router, prefix='/api/v1')
