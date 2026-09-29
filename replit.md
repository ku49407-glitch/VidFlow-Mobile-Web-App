# VidFlow

VidFlow is a mobile-friendly media URL organizer that validates URL structure locally and keeps optional analysis history in the browser without downloading content.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/vidflow run dev` — run the VidFlow web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vidflow/src/App.tsx` — screen routing, URL validation, local history, and settings behavior
- `artifacts/vidflow/src/index.css` — VidFlow visual theme and responsive layout
- `attached_assets/Pasted--DOCTYPE-html-html-lang-en-head-meta-charset-UTF-8-meta_1790667334905.txt` — original HTML mockup

## Architecture decisions

- URL analysis is client-side only and uses the browser `URL` parser.
- The app does not fetch, download, scrape, or bypass media platform restrictions.
- Analysis history and settings are stored in browser local storage; no backend or account is required for the first release.

## Product

- Home screen for safe structural URL checks with inline results
- Downloads screen showing local analysis history and the authorized-content policy
- Settings screen for accent selection, local-history retention, and reset

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
