# JobJar

JobJar is a household work system built with Next.js, Prisma, and PostgreSQL.

It started as a task tracker and now supports:
- quick capture on `/log`
- shared task management on `/tasks`
- project planning on `/projects`
- location-scoped views and people access controls
- stats on `/stats`
- admin shaping on `/admin`
- setup routes under `/settings/*`

## Repo structure
- `web/`: Next.js application
- `docs/`: product, architecture, build, and handover notes
- `docs/user-guide/`: guide hub plus adults, teens, kids, and grandparents guides

## Current app version
- `web/package.json` is currently `0.4.15`

## Current project behavior
- jobs can be promoted into projects for planning
- projects can be turned back into normal jobs when they no longer have project steps, milestones, materials, or cost lines

## Key routes
- `/login`
- `/`
- `/log`
- `/tasks`
- `/projects`
- `/projects/timeline`
- `/help`
- `/stats`
- `/admin`
- `/settings`
- `/api/health/db`

## Production deployment
- Vercel root directory is `web`
- `web/vercel.json` uses `npm run build:vercel`
- production schema changes are applied from committed Prisma migrations during deploy

## First-run behavior
- a fresh production database is empty after migrations
- open `/login` and create the first admin account
- `web/prisma/seed.ts` is optional for local/demo data only

## Local development
```bash
cd web
npm install
npm run db:generate
npm run dev
```

If you need a local schema:

```bash
cd web
npm run db:push
```

If you want demo data locally:

```bash
cd web
npm run db:seed
```
