import { loginAction } from "@/app/actions";
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

  const household = await prisma.household.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  return (
    <div className="family-gradient min-h-screen px-4 py-6">
      <main className="mx-auto w-full max-w-md">
        <section className="playful-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Household Job Jar</p>
          <h1 className="mt-1 text-2xl font-bold">Sign In</h1>
          <p className="mt-1 text-sm text-muted">Choose your name and enter the household passcode.</p>
          <form action={loginAction} className="mt-4 space-y-3">
            <input type="hidden" name="next" value={nextPath} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Person</span>
              <select name="userId" required className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm">
                <option value="">Select your name</option>
                {household?.members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Passcode</span>
              <input
                name="passcode"
                type="password"
                required
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                placeholder="Household passcode"
              />
            </label>
            {showError ? <p className="text-sm font-semibold text-red">Invalid login details.</p> : null}
            <button className="action-btn primary w-full">Sign In</button>
          </form>
        </section>
      </main>
    </div>
  );
}
