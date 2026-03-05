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
- Prisma requires `DATABASE_URL`. `DIRECT_URL` is recommended and falls back to `DATABASE_URL` when unset in the repo scripts.
- Fresh production databases are initialized by committed Prisma migrations during deploy.
- `npm run db:seed` is optional demo/local data, not required for production bootstrap.
- Ongoing schema changes should use Prisma migrations committed under `web/prisma/migrations`.
- `web/vercel.json` points Vercel at `npm run build:vercel`, so `prisma migrate deploy` runs before `next build`.

## Operational checks
- `/api/health/db` verifies Prisma can reach the database.
- `/login` now reports database failures more accurately and logs the underlying server error.
- A brand-new production environment should land on `Create Admin`, not on pre-seeded demo data.

## Known cleanup outside this handover
- `.DS_Store` is untracked in the repo root and should not be committed.
