import { bootstrapOwnerAction, loginAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";
  const showError = params.error === "invalid";
  const showSetupError = params.error === "setup";

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      displayName: true,
    },
  });

  const needsSetup = users.length === 0;

  return (
    <div className="workday-gradient min-h-screen px-4 py-6">
      <main className="mx-auto w-full max-w-md">
        <section className="board-shell p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#526071]">Household Job Jar</p>
          <h1 className="mt-1 text-2xl font-bold text-[#111f33]">{needsSetup ? "Create Admin" : "Sign In"}</h1>
          <p className="mt-1 text-sm text-[#5e6e80]">
            {needsSetup ? "Set up the first admin account to start capturing jobs." : "Choose your name and enter your personal passcode."}
          </p>

          {needsSetup ? (
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
          ) : (
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
          )}
        </section>
      </main>
    </div>
  );
}
