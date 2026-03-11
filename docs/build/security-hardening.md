# Security Hardening — March 2026

A security review was carried out on the codebase followed by two rounds of fixes. This document records what was changed and why.

---

## Round 1 — Critical and High fixes

### Startup secret enforcement (`src/instrumentation.ts`)
The server now refuses to start in production if `SESSION_SIGNING_SECRET` is not set. Previously, the app would silently fall back to a hardcoded default (`"jobjar-dev-secret"`), making session cookies trivially forgeable. A warning is also emitted if `HOUSEHOLD_PASSCODE` is unset.

### Login rate limiting (`src/lib/rate-limit.ts`, `src/app/actions.ts`)
The login action now limits attempts to 10 per IP per 15-minute window. Exceeding the limit redirects to `/login?error=rate-limited`. The limiter is in-memory (per server instance), which is effective against automated attacks without requiring external infrastructure.

### HTTP security headers (`next.config.ts`)
The following headers are now set on all responses:
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — stops MIME-type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `Permissions-Policy` — disables camera, microphone, geolocation, payment APIs
- `Strict-Transport-Security` — enforces HTTPS for 2 years including subdomains

### TV dashboard now requires auth (`middleware.ts`)
`/tv` and `/tv-lite` were previously fully public. They now require a session cookie and redirect to `/login` if absent. This prevents household task data from being accessible to anyone who guesses or obtains the URL.

### Health check error redaction (`src/app/api/health/db/route.ts`)
The `/api/health/db` endpoint no longer returns raw database error messages in the JSON response. Errors are logged server-side only.

### Login page error redaction (`src/app/login/page.tsx`)
The raw database error message was previously rendered in the HTML on login failures. It is now suppressed from the UI; only the missing env var name is shown (useful for setup), not the error detail.

### Minimum password length 4 → 8 (`src/app/actions.ts`, `src/app/login/page.tsx`)
Bootstrap and setup passcode minimum raised from 4 to 8 characters.

### `.env.example` updated
`SESSION_SIGNING_SECRET` and `HOUSEHOLD_PASSCODE` documented with generation instructions.

---

## Round 2 — Code quality and audit

### Magic strings removed from Task.description (`prisma/schema.prisma`, `actions.ts`, `admin-data.ts`)
Task validation settings (`validationMode`, `minimumMinutes`) were previously encoded as a string in the `description` field (e.g. `"validation=strict;min=30"`) and parsed with regex in multiple places. These are now stored as proper typed columns on the `Task` table. The `description` field is now free for actual user-visible content.

Migration `20260311000001_validation_columns_and_audit` backfills existing data from the old format.

### Audit logging added to TaskLog (`prisma/schema.prisma`, `actions.ts`)
`TaskLog` now records admin and management actions alongside task workflow events:
- `task_created` — logged when an admin creates a task
- `task_updated` — logged when an admin edits a task
- `task_deleted` — logged with the task title when a task is soft-deleted
- `assignee_changed` — logged when a task is assigned or reassigned
- `started`, `completed`, `reopened` — existing workflow events, now include `actorUserId`

The `actorUserId` field was added to `TaskLog` so every log entry records who performed the action.

### Duplicate parse functions removed (`src/lib/admin-data.ts`)
`parseValidationMode()` and `parseMinimumMinutes()` were duplicated between `actions.ts` and `admin-data.ts`. Both are now removed; the data is read directly from the database columns.
