# Vercel + Database Setup

## 1) Import the project
1. Import `stiofancranpairc-source/jobjar` into Vercel.
2. Set the Root Directory to `web`.
3. Confirm Vercel detects Next.js.

## 2) Create and attach Postgres
1. In Vercel, open the project's Storage tab.
2. Create a Postgres database and connect it to this project.
3. Vercel will create `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, and related variables.

## 3) Map Prisma env vars
Add these project env vars in Vercel:
- `DATABASE_URL` = `POSTGRES_URL`
- `DIRECT_URL` = `POSTGRES_URL_NON_POOLING` (recommended)

`DATABASE_URL` is required. If `DIRECT_URL` is not set, the build scripts fall back to `DATABASE_URL`.

## 4) Initialize the database once
For production, the committed Prisma migrations are the primary schema setup path.

If you need local demo data, run this against a local or non-production database:

```bash
cd web
npm run db:push
npm run db:seed
```

This creates the current schema and demo seed data. It is optional for production.

## 5) Deploy safely after schema changes
For any schema change after initial setup:
1. Update `web/prisma/schema.prisma`.
2. Create a migration locally with `npm run db:migrate -- --name <change-name>`.
3. Commit the generated `web/prisma/migrations` files.
4. The repo includes `web/vercel.json`, which tells Vercel to use `npm run build:vercel`.
5. Deploy normally.

The Vercel build command runs `prisma migrate deploy` before `next build`, so committed migrations are applied during deployment without breaking ordinary local `npm run build`.

## 6) Verify the deployment
After deploy, open `/api/health/db`.

Expected JSON:
- `status: "ok"`
- `db: "connected"`

If `/login` shows a DB failure, check:
- Vercel env vars
- migration status
- database permissions
- server logs for the underlying Prisma error

Expected first-run production state:
- `/api/health/db` returns connected
- `/login` shows `Create Admin`
- no demo household data exists unless you explicitly ran `db:seed`

Useful smoke routes after first login:
- `/tasks`
- `/projects`
- `/stats`
