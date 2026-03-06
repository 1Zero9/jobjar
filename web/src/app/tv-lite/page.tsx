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
          background: "#efe7da",
          color: "#2c231d",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ padding: "14px" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "12px" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    width: "58%",
                    verticalAlign: "top",
                    background: "#fffaf1",
                    border: "2px solid #d8c7af",
                    borderRadius: "20px",
                    boxShadow: "0 8px 22px rgba(98, 73, 46, 0.12)",
                    padding: "14px",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a624e" }}>
                    JobJar TV Lite
                  </div>
                  <div style={{ fontSize: "34px", fontWeight: 700, marginTop: "6px" }}>Bowie House Board</div>
                  <div style={{ fontSize: "20px", marginTop: "10px", lineHeight: 1.25 }}>{focusText}</div>

                  <div style={{ marginTop: "14px" }}>
                    <MetricBadge label="Stars" value={`${data.starScore}`} bg="#f4d25f" />
                    <MetricBadge label="Done" value={`${completion}%`} bg="#dde7f2" />
                    <MetricBadge label="Jobs" value={`${data.totalTasks}`} bg="#ead0b0" />
                    <MetricBadge label="Finished" value={`${data.doneTasks}`} bg="#c8e6cb" />
                    <MetricBadge label="Help" value={`${data.rag.red}`} bg="#efb4b3" />
                  </div>
                </td>

                <td
                  style={{
                    width: "42%",
                    verticalAlign: "top",
                    background: "#fffaf1",
                    border: "2px solid #d8c7af",
                    borderRadius: "20px",
                    boxShadow: "0 8px 22px rgba(98, 73, 46, 0.12)",
                    padding: "8px",
                  }}
                >
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    style={{ display: "block", width: "100%", height: "170px", objectFit: "cover", background: "#eadfce", borderRadius: "14px" }}
                  >
                    <source src="/images/bobovid.mp4" type="video/mp4" />
                  </video>
                </td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              marginTop: "2px",
              background: "#fffaf1",
              border: "2px solid #d8c7af",
              borderRadius: "20px",
              boxShadow: "0 8px 22px rgba(98, 73, 46, 0.12)",
              padding: "14px",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: 700, marginBottom: "10px" }}>Rooms</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "20px" }}>
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
                    %
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
        </div>
      </body>
    </html>
  );
}

function MetricBadge({
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
        display: "inline-block",
        verticalAlign: "top",
        minWidth: "116px",
        marginRight: "8px",
        marginBottom: "8px",
        padding: "10px 12px",
        background: bg,
        border: "2px solid #d8c7af",
        borderRadius: "16px",
        boxShadow: "0 5px 14px rgba(98, 73, 46, 0.1)",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, textTransform: "uppercase", color: "#6b5645" }}>{label}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px" }}>{value}</div>
    </div>
  );
}

const tableHeadStyle = {
  borderBottom: "2px solid #d8c7af",
  padding: "6px 4px 8px",
} as const;

const tableCellStyle = {
  borderBottom: "1px solid #e4d8c7",
  padding: "8px 4px",
} as const;
