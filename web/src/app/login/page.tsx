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

const loginCardStyle = {
  width: "100%",
  maxWidth: "28rem",
  borderRadius: "1.2rem",
  border: "1px solid #cfdef4",
  background: "linear-gradient(180deg, rgba(244, 250, 255, 0.95) 0%, rgba(235, 244, 255, 0.9) 100%)",
  boxShadow: "0 2px 0 rgba(23, 38, 58, 0.04), 0 14px 32px rgba(63, 109, 184, 0.09)",
  padding: "1.25rem",
} as const;

const inputStyle = {
  width: "100%",
  display: "block",
  borderRadius: "0.9rem",
  border: "1px solid #d7e3f4",
  background: "#f2f8ff",
  color: "#13233c",
  fontSize: "1rem",
  lineHeight: "1.35",
  padding: "0.72rem 0.9rem",
  boxSizing: "border-box",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
} as const;

const primaryButtonStyle = {
  width: "100%",
  display: "block",
  marginTop: "1rem",
  borderRadius: "0.9rem",
  border: "1px solid #13233c",
  background: "#13233c",
  color: "#ffffff",
  fontSize: "0.95rem",
  fontWeight: 700,
  lineHeight: "1.2",
  padding: "0.8rem 1rem",
  textAlign: "center" as const,
} as const;

const secondaryButtonStyle = {
  width: "100%",
  display: "block",
  marginTop: "1rem",
  borderRadius: "0.9rem",
  border: "1px solid #cfdcf2",
  background: "linear-gradient(180deg, #f8fbff 0%, #ecf3ff 100%)",
  color: "#1a2c44",
  fontSize: "0.95rem",
  fontWeight: 700,
  lineHeight: "1.2",
  padding: "0.8rem 1rem",
  textAlign: "center" as const,
  textDecoration: "none",
  boxSizing: "border-box" as const,
} as const;

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
    <div
      className="login-screen workday-gradient min-h-screen px-4 py-6"
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem" }}
    >
      <main className="login-main" style={{ width: "100%", maxWidth: "28rem" }}>
        <section className="login-shell board-shell" style={loginCardStyle}>
          <p className="login-kicker" style={{ color: "#526071", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", margin: 0, textTransform: "uppercase" }}>
            Household Job Jar
          </p>
          <h1 className="login-heading" style={{ color: "#111f33", fontSize: "1.9rem", fontWeight: 800, lineHeight: 1.1, margin: "0.45rem 0 0" }}>
            {needsSetup ? "Create Admin" : "Sign In"}
          </h1>
          <p className="login-copy" style={{ color: "#5e6e80", fontSize: "0.98rem", lineHeight: 1.5, margin: "0.45rem 0 0" }}>
            {needsSetup ? "Set up the first admin account to start capturing jobs." : "Choose your name and enter your personal passcode."}
          </p>
          {dbError ? (
            <div
              className="login-alert"
              style={{ marginTop: "1rem", borderRadius: "0.9rem", border: "1px solid #efb5b5", background: "#fff2f2", color: "#a03b3b", padding: "0.85rem 0.95rem", fontSize: "0.92rem", lineHeight: 1.45 }}
            >
              <p className="login-alert-title" style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>
                Database check failed. Review server logs and database configuration.
              </p>
              {dbError.missingEnvVars.length > 0 ? (
                <p>
                  Missing env vars: <span className="login-mono" style={{ fontFamily: 'var(--font-mono)', fontSize: "0.75rem" }}>{dbError.missingEnvVars.join(", ")}</span>
                </p>
              ) : null}
              <p className="login-alert-message" style={{ fontFamily: 'var(--font-mono)', fontSize: "0.75rem", margin: "0.35rem 0 0", overflowWrap: "anywhere" }}>
                {dbError.message}
              </p>
            </div>
          ) : null}

          {!dbUnavailable && needsSetup ? (
            <form action={bootstrapOwnerAction} className="login-form" style={{ marginTop: "1rem" }}>
              <label className="login-label" style={{ display: "block" }}>
                <span className="login-label-text" style={{ color: "#526071", display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Name
                </span>
                <input
                  name="displayName"
                  type="text"
                  required
                  className="login-input"
                  style={inputStyle}
                  placeholder="House Admin"
                />
              </label>
              <label className="login-label" style={{ display: "block", marginTop: "0.9rem" }}>
                <span className="login-label-text" style={{ color: "#526071", display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Email (optional)
                </span>
                <input
                  name="email"
                  type="email"
                  className="login-input"
                  style={inputStyle}
                  placeholder="owner@jobjar.app"
                />
              </label>
              <label className="login-label" style={{ display: "block", marginTop: "0.9rem" }}>
                <span className="login-label-text" style={{ color: "#526071", display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Passcode
                </span>
                <input
                  name="passcode"
                  type="password"
                  required
                  minLength={4}
                  className="login-input"
                  style={inputStyle}
                  placeholder="Minimum 4 characters"
                />
              </label>
              {showSetupError ? (
                <p className="login-error-text" style={{ color: "#c03221", fontSize: "0.9rem", fontWeight: 700, margin: "0.75rem 0 0" }}>
                  Passcode must be at least 4 characters.
                </p>
              ) : null}
              <button className="login-primary-btn" style={primaryButtonStyle}>Create Admin</button>
            </form>
          ) : !dbUnavailable ? (
            <form action={loginAction} className="login-form" style={{ marginTop: "1rem" }}>
              <input type="hidden" name="next" value={nextPath} />
              <label className="login-label" style={{ display: "block" }}>
                <span className="login-label-text" style={{ color: "#526071", display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Person
                </span>
                <select name="userId" required className="login-input" style={inputStyle}>
                  <option value="">Select your name</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="login-label" style={{ display: "block", marginTop: "0.9rem" }}>
                <span className="login-label-text" style={{ color: "#526071", display: "block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.14em", marginBottom: "0.35rem", textTransform: "uppercase" }}>
                  Passcode
                </span>
                <input
                  name="passcode"
                  type="password"
                  required
                  className="login-input"
                  style={inputStyle}
                  placeholder="Your personal passcode"
                />
              </label>
              {showError ? (
                <p className="login-error-text" style={{ color: "#c03221", fontSize: "0.9rem", fontWeight: 700, margin: "0.75rem 0 0" }}>
                  Invalid login details.
                </p>
              ) : null}
              <button className="login-primary-btn" style={primaryButtonStyle}>Sign In</button>
            </form>
          ) : (
            <div
              className="login-info"
              style={{ marginTop: "1rem", borderRadius: "0.9rem", border: "1px solid #d7e3f4", background: "#f6faff", color: "#4e657d", padding: "0.85rem 0.95rem", fontSize: "0.92rem", lineHeight: 1.45 }}
            >
              <p>Check the database connection, migrations, and env vars before signing in.</p>
              <p className="login-mono" style={{ fontFamily: 'var(--font-mono)', fontSize: "0.75rem" }}>DATABASE_URL</p>
              <p className="login-mono" style={{ fontFamily: 'var(--font-mono)', fontSize: "0.75rem" }}>DIRECT_URL (optional, falls back to DATABASE_URL)</p>
            </div>
          )}

          <div className="login-button-row" style={{ borderTop: "1px solid #d7e3f4", marginTop: "1rem", paddingTop: "1rem" }}>
            <Link href="/tv-lite" className="login-secondary-btn" style={secondaryButtonStyle}>
              Public TV View
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
