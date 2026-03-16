import Link from "next/link";

export const metadata = {
  title: "Offline | JobJar",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-4 rounded-[1.75rem] border border-border bg-surface p-6 shadow-sm">
        <p className="settings-kicker">Offline</p>
        <h1 className="text-2xl font-bold text-foreground">You&apos;re offline</h1>
        <p className="text-sm leading-6 text-muted">
          JobJar needs a connection for most changes, but you can still reopen pages that were loaded recently.
        </p>
        <Link href="/" className="action-btn bright w-fit">
          Go home
        </Link>
      </div>
    </main>
  );
}
