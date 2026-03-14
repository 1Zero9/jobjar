# JobJar Handover

## Current product shape
JobJar is a household work-tracking app built with Next.js App Router, Prisma, and PostgreSQL.

Current routes:
- `/login`: bootstrap and sign-in
- `/`: home
- `/log`: quick capture
- `/tasks`: jobs board, with a personal jobs flow for `member`
- `/projects`: project board
- `/projects/timeline`: project timeline
- `/help`: in-app onboarding and audience guides
- `/stats`: reporting
- `/admin`: admin workspace
- `/settings/*`: setup sections
- `/api/health/db`: DB health check

Current package version:
- `web/package.json`: `0.4.8`

Recurring job behavior:
- finishing a recurring job records the completion against the current occurrence
- the job stays open and the next scheduled occurrence is created automatically

## Auth model
- custom auth, not NextAuth/Auth.js
- per-user passcodes stored in `AuthCredential`
- session cookies signed with HMAC-SHA256
- `SESSION_SIGNING_SECRET` must be set in production
- `HOUSEHOLD_PASSCODE` only falls back in development; production users without stored hashes need the env var set
- login rate limiting is in-memory per server instance
- role model:
  - `admin`: full setup and task management
  - `power_user`: project planning and project management
  - `member`: personal jobs flow by default
  - `viewer`: read-only
- audience bands:
  - `adult`: current full household UI
  - `teen_12_18`: brighter teen-focused presentation
  - `under_12`: playful child UI limited to assigned jobs
- profile themes:
  - `default`: current palette
  - `boy / blue`: blue-accent variant
  - `girl / pink`: pink-accent variant

## Data model
Schema source of truth:
- `web/prisma/schema.prisma`

## User guides
- `docs/user-guide/jobjar-user-guide.md`: guide hub
- `docs/user-guide/adults-guide.md`: adult workflow
- `docs/user-guide/teens-guide.md`: teen workflow
- `docs/user-guide/kids-guide.md`: under-12 workflow
- `docs/user-guide/grandparents-guide.md`: read-only family workflow

Project support is built on `Task`, not a separate `Project` model.

Project capabilities currently come from:
- `Task.jobKind = project`
- `Task.projectParentId`
- `Task.projectTargetAt`
- `Task.projectBudgetCents`
- `ProjectCost`
- `ProjectMaterial`
- `ProjectMilestone`

## Deployment notes
- Vercel root directory is `web`
- `web/vercel.json` uses `npm run build:vercel`
- `build:vercel` runs `prisma migrate deploy` before `next build`
- `DIRECT_URL` is recommended and falls back to `DATABASE_URL`
- committed Prisma migrations live under `web/prisma/migrations`

## Required environment variables
| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres connection string |
| `DIRECT_URL` | Recommended | Non-pooled migration connection |
| `SESSION_SIGNING_SECRET` | Yes in production | Session signing secret |
| `HOUSEHOLD_PASSCODE` | Recommended | Production fallback passcode for users without stored hashes |

## Verification routine
```bash
cd web
npm run db:generate
npm run lint
npm run build
```

If the schema changed:

```bash
cd web
npm run db:deploy
```

## Operational checks
- `/api/health/db` returns `status: "ok"` and `db: "connected"`
- `/login` should show `Create Admin` on a fresh production DB
- `/projects` should load and show project filters, milestones, materials, and project health states
- `/projects/timeline` should load overdue/upcoming/recent sections
- `/stats` should show project budget/spend, shopping progress, and project risk summaries when projects exist

## Known next steps
- timezone-aware due-date handling
- timeline drag/drop or dependency sequencing
- materials budget rollups into project spend
