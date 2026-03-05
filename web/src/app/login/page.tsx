import { bootstrapOwnerAction, loginAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

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
    const missingEnvVars = ["DATABASE_URL", "DIRECT_URL"].filter((key) => !process.env[key]);
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
    <div className="workday-gradient min-h-screen px-4 py-6">
      <main className="mx-auto w-full max-w-md">
        <section className="board-shell p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#526071]">Household Job Jar</p>
          <h1 className="mt-1 text-2xl font-bold text-[#111f33]">{needsSetup ? "Create Admin" : "Sign In"}</h1>
          <p className="mt-1 text-sm text-[#5e6e80]">
            {needsSetup ? "Set up the first admin account to start capturing jobs." : "Choose your name and enter your personal passcode."}
          </p>
          {dbError ? (
            <div className="mt-3 space-y-2 rounded-xl border border-[#efb5b5] bg-[#fff2f2] px-3 py-2 text-sm text-[#a03b3b]">
              <p className="font-semibold">Database check failed. Review server logs and database configuration.</p>
              {dbError.missingEnvVars.length > 0 ? (
                <p>
                  Missing env vars: <span className="font-mono">{dbError.missingEnvVars.join(", ")}</span>
                </p>
              ) : null}
              <p className="break-words font-mono text-xs">{dbError.message}</p>
            </div>
          ) : null}

          {!dbUnavailable && needsSetup ? (
            <form action={bootstrapOwnerAction} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#526071]">Name</span>
                <input
                  name="displayName"
                  type="text"
                  required
                  className="w-full rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] px-3 py-2 text-sm"
                  placeholder="House Admin"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#526071]">Email (optional)</span>
                <input
                  name="email"
                  type="email"
                  className="w-full rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] px-3 py-2 text-sm"
                  placeholder="owner@jobjar.app"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#526071]">Passcode</span>
                <input
                  name="passcode"
                  type="password"
                  required
                  minLength={4}
                  className="w-full rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] px-3 py-2 text-sm"
                  placeholder="Minimum 4 characters"
                />
              </label>
              {showSetupError ? <p className="text-sm font-semibold text-red">Passcode must be at least 4 characters.</p> : null}
              <button className="action-btn primary w-full">Create Admin</button>
            </form>
          ) : !dbUnavailable ? (
            <form action={loginAction} className="mt-4 space-y-3">
              <input type="hidden" name="next" value={nextPath} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#526071]">Person</span>
                <select name="userId" required className="w-full rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] px-3 py-2 text-sm">
                  <option value="">Select your name</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#526071]">Passcode</span>
                <input
                  name="passcode"
                  type="password"
                  required
                  className="w-full rounded-xl border border-[#d7e3f4] bg-[#f2f8ff] px-3 py-2 text-sm"
                  placeholder="Your personal passcode"
                />
              </label>
              {showError ? <p className="text-sm font-semibold text-red">Invalid login details.</p> : null}
              <button className="action-btn primary w-full">Sign In</button>
            </form>
          ) : (
            <div className="mt-4 space-y-2 rounded-xl border border-[#d7e3f4] bg-[#f6faff] p-3 text-sm text-[#4e657d]">
              <p>Check the database connection, migrations, and env vars before signing in.</p>
              <p className="font-mono text-xs">DATABASE_URL</p>
              <p className="font-mono text-xs">DIRECT_URL</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
