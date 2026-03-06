import { bootstrapOwnerAction, loginAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

type DbStatus =
  | { state: "ok" }
  | {
      state: "error";
      message: string;
      missingEnvVars: string[];
    };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";
  const showError = params.error === "invalid";
  const showSetupError = params.error === "setup";

  let users: Array<{ id: string; displayName: string }> = [];
  let dbStatus: DbStatus = { state: "ok" };

  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        displayName: true,
      },
    });
  } catch (error) {
    const missingEnvVars = ["DATABASE_URL"].filter((key) => !process.env[key]);
    const message = error instanceof Error ? error.message : "Unknown database error";

    console.error("Login page database check failed", error);
    dbStatus = {
      state: "error",
      message,
      missingEnvVars,
    };
  }

  const needsSetup = users.length === 0;
  const dbUnavailable = dbStatus.state === "error";
  const dbError = dbStatus.state === "error" ? dbStatus : null;

  return (
    <div className="login-screen workday-gradient min-h-screen px-4 py-6">
      <main className="login-main">
        <section className="login-shell board-shell">
          <p className="login-kicker">Household Job Jar</p>
          <h1 className="login-heading">{needsSetup ? "Create Admin" : "Sign In"}</h1>
          <p className="login-copy">
            {needsSetup ? "Set up the first admin account to start capturing jobs." : "Choose your name and enter your personal passcode."}
          </p>
          {dbError ? (
            <div className="login-alert">
              <p className="login-alert-title">Database check failed. Review server logs and database configuration.</p>
              {dbError.missingEnvVars.length > 0 ? (
                <p>
                  Missing env vars: <span className="login-mono">{dbError.missingEnvVars.join(", ")}</span>
                </p>
              ) : null}
              <p className="login-alert-message">{dbError.message}</p>
            </div>
          ) : null}

          {!dbUnavailable && needsSetup ? (
            <form action={bootstrapOwnerAction} className="login-form">
              <label className="login-label">
                <span className="login-label-text">Name</span>
                <input
                  name="displayName"
                  type="text"
                  required
                  className="login-input"
                  placeholder="House Admin"
                />
              </label>
              <label className="login-label">
                <span className="login-label-text">Email (optional)</span>
                <input
                  name="email"
                  type="email"
                  className="login-input"
                  placeholder="owner@jobjar.app"
                />
              </label>
              <label className="login-label">
                <span className="login-label-text">Passcode</span>
                <input
                  name="passcode"
                  type="password"
                  required
                  minLength={4}
                  className="login-input"
                  placeholder="Minimum 4 characters"
                />
              </label>
              {showSetupError ? <p className="login-error-text">Passcode must be at least 4 characters.</p> : null}
              <button className="login-primary-btn">Create Admin</button>
            </form>
          ) : !dbUnavailable ? (
            <form action={loginAction} className="login-form">
              <input type="hidden" name="next" value={nextPath} />
              <label className="login-label">
                <span className="login-label-text">Person</span>
                <select name="userId" required className="login-input">
                  <option value="">Select your name</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="login-label">
                <span className="login-label-text">Passcode</span>
                <input
                  name="passcode"
                  type="password"
                  required
                  className="login-input"
                  placeholder="Your personal passcode"
                />
              </label>
              {showError ? <p className="login-error-text">Invalid login details.</p> : null}
              <button className="login-primary-btn">Sign In</button>
            </form>
          ) : (
            <div className="login-info">
              <p>Check the database connection, migrations, and env vars before signing in.</p>
              <p className="login-mono">DATABASE_URL</p>
              <p className="login-mono">DIRECT_URL (optional, falls back to DATABASE_URL)</p>
            </div>
          )}

          <div className="login-button-row">
            <Link href="/tv" className="login-secondary-btn">
              Public TV View
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
