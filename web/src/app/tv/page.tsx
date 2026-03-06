import { getTvData } from "@/lib/tv-data";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TvPage() {
  const data = await getTvData();
  const visibleStars = Math.min(56, Math.max(12, data.starScore));
  const completion = data.totalTasks === 0 ? 0 : Math.round((data.doneTasks / data.totalTasks) * 100);
  const focusText =
    data.rag.red > 0
      ? `${data.rag.red} ${data.rag.red === 1 ? "job is" : "jobs are"} waiting too long`
      : "Everything is on track";

  return (
    <div className="tv-bowie-bg min-h-screen px-4 py-5 text-[#3D312A] sm:px-6 sm:py-6">
      <main className="tv-board mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="tv-shell p-4 sm:p-5">
          <div className="tv-header-grid grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#8d6742]">Family Big Screen</p>
              <h1 className="text-3xl font-bold text-[#3D312A] sm:text-4xl">Bowie House Board</h1>
              <p className="mt-1 text-sm text-[#775d4a]">Simple, bright status for the whole house.</p>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:w-64">
                <Link href="/" className="tv-nav-btn text-center">
                  Daily
                </Link>
                <Link href="/admin" className="tv-nav-btn text-center">
                  Admin
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E0E0E0] bg-[#FFFFFF] px-3 py-2">
                <span className="rounded-full bg-[#F5C344] px-2 py-1 text-xs font-semibold text-[#3D312A]">Focus</span>
                <p className="text-sm text-[#6b5443]">{focusText}</p>
              </div>
            </div>
            <div className="tv-dog-hero">
              <Image
                src="/images/bowie-tv-hero.png"
                alt="Bowie hero artwork"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 38vw"
                className="tv-dog-hero-img"
              />
              <div className="tv-dog-hero-glow" aria-hidden />
            </div>
          </div>
        </header>

        <section className="tv-metrics-grid grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Family Stars" value={`${data.starScore} ⭐`} tone="gold" />
          <MetricCard label="Done So Far" value={`${completion}%`} tone="cream" />
          <MetricCard label="All Jobs" value={String(data.totalTasks)} tone="tan" />
          <MetricCard label="Finished" value={String(data.doneTasks)} tone="green" />
          <MetricCard label="Need Help" value={String(data.rag.red)} tone="red" />
        </section>

        <section className="tv-pulse-grid grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
          <article className="tv-shell p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#3D312A]">Family Pulse</h2>
              <p className="text-xs text-[#7b644f]">How things look right now</p>
            </div>
            <div className="tv-chart-grid grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="tv-subpanel p-3">
                <p className="mb-2 text-sm font-semibold text-[#4d3b2f]">Red / Amber / Green</p>
                <PieChart
                  values={[
                    { label: "Green", value: data.rag.green, color: "#66BB6A" },
                    { label: "Amber", value: data.rag.amber, color: "#F5C344" },
                    { label: "Red", value: data.rag.red, color: "#EF5350" },
                  ]}
                />
              </div>
              <div className="tv-subpanel p-3">
                <p className="mb-2 text-sm font-semibold text-[#4d3b2f]">Finished vs Left</p>
                <PieChart
                  values={[
                    { label: "Finished", value: data.doneTasks, color: "#66BB6A" },
                    { label: "Left", value: data.pendingTasks, color: "#D4A373" },
                  ]}
                />
              </div>
            </div>
          </article>

          <article className="tv-shell p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#3D312A]">Star Wall</h2>
              <p className="text-xs text-[#7b644f]">Each finished job adds stars</p>
            </div>
            <div className="rounded-2xl border border-[#E0E0E0] bg-gradient-to-br from-[#fffaf0] via-[#fff6de] to-[#fff] p-3">
              <div className="tv-star-grid grid grid-cols-8 gap-1 text-center text-lg leading-none sm:grid-cols-10">
                {Array.from({ length: visibleStars }).map((_, index) => (
                  <span key={index} aria-hidden>
                    ⭐
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm text-[#6b5443]">
              {data.rag.red > 0 ? `A quick push on ${data.rag.red} waiting jobs will keep the streak alive.` : "Everything is on track. Keep it going."}
            </p>
          </article>
        </section>

        <section className="tv-shell p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#3D312A]">Room Progress</h2>
            <p className="text-xs text-[#7b644f]">Finished and waiting by room</p>
          </div>
          <div className="tv-room-grid grid grid-cols-1 gap-2 lg:grid-cols-2">
            {data.roomLoad.map((room) => (
              <article key={room.room} className="tv-subpanel p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-[#4b3a2e]">{room.room}</p>
                  <p className="text-xs text-[#826a56]">
                    {room.done}/{room.total} finished • {room.overdue} waiting
                  </p>
                </div>
                <div className="h-3 rounded-full bg-[#EFE8DF]">
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#66BB6A] to-[#4DAA56]" style={{ width: `${room.completion}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gold" | "cream" | "tan" | "green" | "red";
}) {
  return (
    <article className={`tv-metric ${tone}`}>
      <p className="text-[11px] uppercase tracking-wide text-[#5d4939]">{label}</p>
      <p className="tv-metric-value mt-1 text-3xl font-bold text-[#3D312A]">{value}</p>
    </article>
  );
}

function PieChart({
  values,
}: {
  values: Array<{ label: string; value: number; color: string }>;
}) {
  const total = Math.max(1, values.reduce((sum, item) => sum + item.value, 0));
  const slices = buildPieSlices(values, total);

  return (
    <div className="tv-chart-wrap flex items-center gap-4">
      <svg width="170" height="170" viewBox="0 0 220 220" aria-label="Pie chart" className="tv-chart-svg shrink-0">
        <g transform="translate(110,110)">
          {slices.map((slice) => (
            <path key={slice.label} d={slice.path} fill={slice.color} stroke="#ffffff" strokeWidth="2" />
          ))}
          <circle r="42" fill="#ffffff" />
        </g>
      </svg>
      <ul className="space-y-1 text-sm">
        {values.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: item.color }} />
            <span className="text-[#5f4c3c]">{item.label}</span>
            <span className="font-semibold text-[#3D312A]">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildPieSlices(values: Array<{ label: string; value: number; color: string }>, total: number) {
  const slices: Array<{ label: string; color: string; path: string }> = [];
  let angleCursor = -90;
  for (const item of values) {
    const sweep = (item.value / total) * 360;
    const start = angleCursor;
    const end = angleCursor + sweep;
    slices.push({
      label: item.label,
      color: item.color,
      path: pieSlicePath(0, 0, 90, start, end),
    });
    angleCursor = end;
  }
  return slices;
}

function pieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians),
  };
}
