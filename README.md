# JobJar

Household job tracking app built with Next.js, Prisma, and PostgreSQL.

## App structure
- `web/`: Next.js application
- `docs/`: build, product, and architecture notes

## Production deployment
- Vercel root directory: `web`
- Vercel build command is pinned in `web/vercel.json`
- Production schema changes are applied with Prisma migrations during deploy

## First-run behavior
- A fresh production database will be empty after migrations
- Open `/login` and create the first admin account
- `web/prisma/seed.ts` is optional demo data, not required for production bootstrap

## Key operational routes
- `/login`
- `/admin`
- `/tv`
- `/api/health/db`

## Local development
```bash
cd web
npm install
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
