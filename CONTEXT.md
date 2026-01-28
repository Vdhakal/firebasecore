# Repo Context (@fiyareuse/firebase-core)

## What this repo is
- Shared Firebase Admin initialization helpers used by CoachAI backend.

## Key paths
- Source: `src/index.ts`
- Package metadata: `package.json`

## Recent work (Jan 2026)
- Updated admin namespace resolution to handle `admin.default` vs `admin`.
- Split repo from monorepo; `dist/` is not tracked.

## Conventions
- Keep runtime code in `src/`; build artifacts generated on publish.

## Build
- `npm run build`
