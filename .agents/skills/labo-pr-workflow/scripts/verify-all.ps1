#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

if (Test-Path ".vercel") { Remove-Item -Recurse -Force ".vercel" }

Write-Host "==> [1/6] Format check (Prettier)..." -ForegroundColor Cyan
bun run format:check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [2/6] Lint (ESLint --max-warnings=0)..." -ForegroundColor Cyan
bun run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [3/6] Typecheck (tsc --noEmit)..." -ForegroundColor Cyan
bun run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [4/6] Validation stricte des critères Zod & score initial..." -ForegroundColor Cyan
bun run validate:criteria
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [5/6] Tests unitaires et d'intégration (Vitest)..." -ForegroundColor Cyan
bun run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> [6/6] Build de production (Vite + Nitro)..." -ForegroundColor Cyan
bun run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Toutes les vérifications locales ont réussi avec succès !" -ForegroundColor Green
