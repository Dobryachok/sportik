# Run from the project root after ANY data/schema update, even a small one.
$ErrorActionPreference = 'Stop'
docker compose up -d postgres redis
if ($LASTEXITCODE -ne 0) { throw 'Could not start PostgreSQL/Redis' }
docker compose run --rm migrate
if ($LASTEXITCODE -ne 0) { throw 'Migration failed; Redis was not restarted' }
docker compose restart redis
if ($LASTEXITCODE -ne 0) { throw 'Could not restart Redis' }
docker compose up -d --build backend frontend
if ($LASTEXITCODE -ne 0) { throw 'Could not start services' }
Write-Host 'Migration complete, Redis restarted, services running.'
