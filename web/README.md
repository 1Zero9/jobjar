# Web App

Next.js App Router frontend and server actions for JobJar.

## Commands
```bash
npm run dev
npm run lint
npm run build
```

## Prisma commands
```bash
npm run db:generate
npm run db:push
npm run db:migrate -- --name <change-name>
npm run db:deploy
npm run db:seed
```

## Current product routes
- `/log`: fast capture
- `/tasks`: general task board
- `/projects`: project planning, child tasks, costs, milestones, and materials
- `/projects/timeline`: project dates, overdue items, and recent completions
- `/stats`: household reporting, including project health and shopping progress
- `/admin`: people, room, and task shaping
- `/settings/*`: setup sections

## Deployment notes
- `npm run build` regenerates the Prisma client before building
- Vercel uses `npm run build:vercel` via `vercel.json`
- `build:vercel` runs `prisma migrate deploy` before the Next.js build
- `DIRECT_URL` is optional in scripts and falls back to `DATABASE_URL`

## First production login
After a fresh deploy with an empty database:
1. Open `/api/health/db` and confirm DB connectivity.
2. Open `/login`.
3. Create the first admin account.

The seed script is for optional demo/local data, not production bootstrap.
