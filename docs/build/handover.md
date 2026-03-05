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
- Prisma requires both `DATABASE_URL` and `DIRECT_URL`.
- Fresh databases are initialized with `npm run db:push` and `npm run db:seed`.
- Ongoing schema changes should use Prisma migrations committed under `web/prisma/migrations`.
- Vercel should use `npm run build:vercel` so `prisma migrate deploy` runs before `next build`.

## Operational checks
- `/api/health/db` verifies Prisma can reach the database.
- `/login` now reports database failures more accurately and logs the underlying server error.

## Known cleanup outside this handover
- `.DS_Store` is untracked in the repo root and should not be committed.
