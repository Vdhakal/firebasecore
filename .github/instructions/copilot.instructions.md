---
applyTo: '**'
---
Provide project context and coding guidelines for the firebase-core package.
# Copilot Instructions for Firebase Core

## Package snapshot
- Lightweight helpers for Firebase Admin initialization.
- Source in `src/index.ts`; build output generated for publishing.

## Conventions
- Keep runtime logic in `src/` only; avoid committing `dist/` artifacts.
- Preserve backwards compatibility for consumers (CoachAI backend).
- Prefer minimal dependencies; keep the surface small.

## Build & publish
- Build: `npm run build`
- Publish: `npm publish --access public`

## Post-generation checklist
- [ ] Update package version if public API changes
- [ ] Ensure README stays accurate
