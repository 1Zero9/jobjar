# JobJar Handover

## Current product shape
JobJar is a household job tracker built with Next.js App Router, Prisma, and PostgreSQL. The current app supports:
- household bootstrap from `/login`
- simple passcode-based sign-in
- room and task management from `/admin`
- a daily dashboard at `/`
- a TV dashboard at `/tv`
- a DB health check at `/api/health/db`

## Auth model
- Auth is custom, not NextAuth/Auth.js.
- Users sign in with a selected profile plus a passcode.
- Password hashes are stored in the `AuthCredential` table.
- Session state is handled by the app's own server-side session helpers.
- Sessions are signed with HMAC-SHA256 using `SESSION_SIGNING_SECRET`. **This env var must be set in production** — the server will refuse to start without it.
- `HOUSEHOLD_PASSCODE` is a fallback for users without a stored hash. Set it in production; warn is emitted if absent.
- Login is rate-limited to 10 attempts per IP per 15 minutes (in-memory, per server instance).

## Data model
The schema source of truth is `web/prisma/schema.prisma`.

Main models:
- `User`
- `AuthCredential`
- `Household`
- `HouseholdMember`
- `Room`
- `Task`
- `TaskSchedule`
- `TaskOccurrence`
- `TaskLog`
- `TaskAssignment`
- `ShareLink`

## Deployment notes
- Vercel root directory is `web`.
- Prisma requires `DATABASE_URL`. `DIRECT_URL` is recommended and falls back to `DATABASE_URL` when unset in the repo scripts.
- Fresh production databases are initialized by committed Prisma migrations during deploy.
- `npm run db:seed` is optional demo/local data, not required for production bootstrap.
- Ongoing schema changes should use Prisma migrations committed under `web/prisma/migrations`.
- `web/vercel.json` points Vercel at `npm run build:vercel`, so `prisma migrate deploy` runs before `next build`.

### Required environment variables
| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres connection string |
| `DIRECT_URL` | Recommended | Non-pooled connection for migrations; falls back to `DATABASE_URL` |
| `SESSION_SIGNING_SECRET` | **Yes in production** | Signs session cookies; server won't start without it. Generate: `openssl rand -hex 32` |
| `HOUSEHOLD_PASSCODE` | Recommended | Fallback passcode for users without a stored hash |

## Operational checks
- `/api/health/db` verifies Prisma can reach the database.
- `/login` now reports database failures more accurately and logs the underlying server error.
- A brand-new production environment should land on `Create Admin`, not on pre-seeded demo data.

## Task validation model
Tasks have two validation fields (stored as proper columns on `Task`, not encoded in `description`):
- `validationMode` — `"basic"` (default) or `"strict"`. Strict requires a note and a minimum time worked before completion.
- `minimumMinutes` — minimum time in minutes that must be logged before a strict-mode task can be completed.

## Audit trail
`TaskLog` records all task-level events with an `actorUserId` field indicating who performed the action. Logged actions:
- `started`, `completed`, `reopened` — task workflow events
- `task_created`, `task_updated`, `task_deleted` — admin/management events
- `assignee_changed` — when a task is assigned/reassigned

## Security headers
The following HTTP headers are set on all responses via `next.config.ts`:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

## Protected routes
All routes except `/login` and `/api/health/db` require an authenticated session, including `/tv` and `/tv-lite`.

## Known cleanup outside this handover
- `.DS_Store` is untracked in the repo root and should not be committed.
