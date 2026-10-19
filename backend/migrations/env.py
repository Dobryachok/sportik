import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool

from app.config import settings

config = context.config
config.set_main_option('sqlalchemy.url', settings.database_url.replace('%', '%%'))
if config.config_file_name:
    fileConfig(config.config_file_name)


def run_migrations_offline():
    context.configure(url=settings.database_url, literal_binds=True, dialect_opts={'paramstyle': 'named'})
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    engine = async_engine_from_config(config.get_section(config.config_ini_section), prefix='sqlalchemy.', poolclass=pool.NullPool)
    async with engine.connect() as connection:
        def do_run_migrations(sync_connection):
            context.configure(connection=sync_connection)
            with context.begin_transaction():
                context.run_migrations()
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
