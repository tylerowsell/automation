// ─── Dataset preview table (first 5 rows, up to 8 columns) ───────────────────
export default function DataPreview({ dataset }) {
  const cols = dataset.vars || Object.keys(dataset.data[0] || {});
  const rows = dataset.data.slice(0, 5);
  const visibleCols = cols.slice(0, 8);

  return (
    <div style={{ overflowX: "auto", maxHeight: "180px", overflowY: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "10px", fontFamily: "'IBM Plex Mono'", width: "100%" }}>
        <thead>
          <tr>
            {visibleCols.map(c => (
              <th key={c} style={{ padding: "4px 10px", background: "#0a1525", color: "#4fc3f7", borderBottom: "1px solid #1e3a5f", whiteSpace: "nowrap", textAlign: "left" }}>{c}</th>
            ))}
            {cols.length > 8 && (
              <th style={{ padding: "4px 10px", background: "#0a1525", color: "#2a4a6a" }}>+{cols.length - 8} more</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#06080f" : "#080b14" }}>
              {visibleCols.map(c => (
                <td key={c} style={{ padding: "3px 10px", color: "#7090a8", borderBottom: "1px solid #0d1525", whiteSpace: "nowrap", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {String(row[c] ?? "")}
                </td>
              ))}
              {cols.length > 8 && <td style={{ padding: "3px 10px", color: "#2a4a6a" }}>...</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
