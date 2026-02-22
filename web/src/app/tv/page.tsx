import { getTvData } from "@/lib/tv-data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TvPage() {
  const data = await getTvData();

  return (
    <div className="min-h-screen bg-[#101510] px-6 py-6 text-[#eef6eb]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex items-center justify-between rounded-3xl border border-[#2c3a2e] bg-[#162118] px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#98af9f]">Public Dashboard</p>
            <h1 className="text-3xl font-bold">Household Job Jar</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="rounded-xl border border-[#3a4c3d] bg-[#1f2d21] px-4 py-2 text-sm font-semibold">
              Daily
            </Link>
            <Link href="/admin" className="rounded-xl border border-[#3a4c3d] bg-[#1f2d21] px-4 py-2 text-sm font-semibold">
              Admin
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Total Jobs" value={String(data.totalTasks)} />
          <MetricCard label="Done" value={String(data.doneTasks)} />
          <MetricCard label="Open" value={String(data.pendingTasks)} />
          <MetricCard label="Overdue (Red)" value={String(data.rag.red)} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-[#2c3a2e] bg-[#162118] p-5">
            <h2 className="mb-4 text-lg font-semibold">RAG Job Split</h2>
            <PieChart
              values={[
                { label: "Green", value: data.rag.green, color: "#2f8f51" },
                { label: "Amber", value: data.rag.amber, color: "#c67a06" },
                { label: "Red", value: data.rag.red, color: "#c03221" },
              ]}
            />
          </article>
          <article className="rounded-3xl border border-[#2c3a2e] bg-[#162118] p-5">
            <h2 className="mb-4 text-lg font-semibold">Completion Split</h2>
            <PieChart
              values={[
                { label: "Done", value: data.doneTasks, color: "#2f8f51" },
                { label: "Open", value: data.pendingTasks, color: "#6a756b" },
              ]}
            />
          </article>
        </section>

        <section className="rounded-3xl border border-[#2c3a2e] bg-[#162118] p-5">
          <h2 className="mb-3 text-lg font-semibold">Room Workload</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {data.roomLoad.map((room) => (
              <article key={room.room} className="rounded-2xl border border-[#2c3a2e] bg-[#1a281c] p-3">
                <p className="text-base font-semibold">{room.room}</p>
                <p className="text-sm text-[#a9bcad]">
                  {room.total} jobs • {room.overdue} overdue
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-[#2c3a2e] bg-[#162118] p-4">
      <p className="text-xs uppercase tracking-wide text-[#8ca08f]">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
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
    <div className="flex items-center gap-6">
      <svg width="220" height="220" viewBox="0 0 220 220" aria-label="Pie chart">
        <g transform="translate(110,110)">
          {slices.map((slice) => (
            <path key={slice.label} d={slice.path} fill={slice.color} stroke="#101510" strokeWidth="2" />
          ))}
          <circle r="42" fill="#162118" />
        </g>
      </svg>
      <ul className="space-y-2 text-sm">
        {values.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: item.color }} />
            <span className="text-[#d3e1d4]">{item.label}</span>
            <span className="font-semibold">{item.value}</span>
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
