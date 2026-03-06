import { getTvData } from "@/lib/tv-data";

export const dynamic = "force-dynamic";

export default async function TvLitePage() {
  const data = await getTvData();
  const completion = data.totalTasks === 0 ? 0 : Math.round((data.doneTasks / data.totalTasks) * 100);
  const focusText =
    data.rag.red > 0
      ? `${data.rag.red} ${data.rag.red === 1 ? "job is" : "jobs are"} waiting too long`
      : "Everything is on track";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f4efe6",
          color: "#2b241f",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ padding: "18px" }}>
          <div
            style={{
              background: "#fffaf2",
              border: "2px solid #d8c7af",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>JobJar TV Lite</div>
            <div style={{ fontSize: "40px", fontWeight: 700, marginTop: "8px" }}>Bowie House Board</div>
            <div style={{ fontSize: "24px", marginTop: "10px" }}>{focusText}</div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <MetricRow label="Family Stars" value={`${data.starScore}`} bg="#f5d164" />
            <MetricRow label="Done So Far" value={`${completion}%`} bg="#e8eef6" />
            <MetricRow label="All Jobs" value={`${data.totalTasks}`} bg="#edd0ad" />
            <MetricRow label="Finished" value={`${data.doneTasks}`} bg="#bfe4c2" />
            <MetricRow label="Need Help" value={`${data.rag.red}`} bg="#efb0ae" />
          </div>

          <div
            style={{
              marginTop: "18px",
              background: "#fffaf2",
              border: "2px solid #d8c7af",
              padding: "18px",
            }}
          >
            <div style={{ fontSize: "28px", fontWeight: 700, marginBottom: "12px" }}>Room Progress</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "24px" }}>
              <thead>
                <tr>
                  <th align="left" style={tableHeadStyle}>
                    Room
                  </th>
                  <th align="right" style={tableHeadStyle}>
                    Done
                  </th>
                  <th align="right" style={tableHeadStyle}>
                    Total
                  </th>
                  <th align="right" style={tableHeadStyle}>
                    Waiting
                  </th>
                  <th align="right" style={tableHeadStyle}>
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.roomLoad.map((room) => (
                  <tr key={room.room}>
                    <td style={tableCellStyle}>{room.room}</td>
                    <td align="right" style={tableCellStyle}>
                      {room.done}
                    </td>
                    <td align="right" style={tableCellStyle}>
                      {room.total}
                    </td>
                    <td align="right" style={tableCellStyle}>
                      {room.overdue}
                    </td>
                    <td align="right" style={tableCellStyle}>
                      {room.completion}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "14px", fontSize: "18px", color: "#5c4d41" }}>
            Open <strong>/tv-lite</strong> on LG webOS. This page uses minimal styling for older TV browsers.
          </div>
        </div>
      </body>
    </html>
  );
}

function MetricRow({
  label,
  value,
  bg,
}: {
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        border: "2px solid #d8c7af",
        marginBottom: "12px",
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "38px", fontWeight: 700, marginTop: "6px" }}>{value}</div>
    </div>
  );
}

const tableHeadStyle = {
  borderBottom: "2px solid #d8c7af",
  padding: "8px 4px 10px",
} as const;

const tableCellStyle = {
  borderBottom: "1px solid #e4d8c7",
  padding: "10px 4px",
} as const;
