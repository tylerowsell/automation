// ─── TLF Output Table ─────────────────────────────────────────────────────────
// For Python runs: renders raw OUTPUT_HTML via dangerouslySetInnerHTML
// For R runs:      renders a JS-built simulated preview table

export function buildOutputTable(shell, meta, adamDatasets) {
  const allData = Object.values(adamDatasets)[0]?.data || [];
  const safe = allData.filter(r => !r.SAFFL || r.SAFFL === "Y");
  const armKey = ["ARM", "TRT01A", "ARMCD", "TRT"].find(k => safe.some(r => r[k])) || "ARM";
  const arms = [...new Set(safe.map(r => r[armKey]).filter(Boolean))].slice(0, 4);

  const headers = ["", ...arms.map(a => `${a}\n(N=${safe.filter(r => r[armKey] === a).length})`)];

  const pct = (n, tot) => `${n} (${tot > 0 ? (n / tot * 100).toFixed(1) : "0.0"}%)`;
  const meanSd = vals => {
    if (!vals.length) return "—";
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const s = Math.sqrt(vals.reduce((sum, x) => sum + (x - m) ** 2, 0) / vals.length);
    return `${m.toFixed(1)} (${s.toFixed(1)})`;
  };

  const rows = [];
  const allVars = meta?.key_variables || (safe.length ? Object.keys(safe[0]) : []);
  const numVars = allVars
    .filter(v => safe.some(r => typeof r[v] === "number") && !["TRTDUR", "VISITNUM"].includes(v))
    .slice(0, 2);
  const catVars = allVars.filter(v => {
    const vals = safe.map(r => r[v]).filter(x => typeof x === "string" && x && x.length < 60);
    const uniq = [...new Set(vals)];
    return vals.length > 0 && uniq.length >= 2 && uniq.length <= 20 &&
      !["USUBJID", "ARM", "ARMCD", "TRT01A", "STUDYID", "SITEID"].includes(v);
  }).slice(0, 4);

  numVars.forEach(v => {
    rows.push({ label: v, isHeader: true });
    rows.push({ label: "  Mean (SD)", vals: arms.map(a => meanSd(safe.filter(r => r[armKey] === a).map(r => r[v]).filter(x => typeof x === "number"))) });
    rows.push({ label: "  Min, Max", vals: arms.map(a => { const vals = safe.filter(r => r[armKey] === a).map(r => r[v]).filter(x => typeof x === "number"); return vals.length ? `${Math.min(...vals)}, ${Math.max(...vals)}` : "—"; }) });
  });
  catVars.forEach(v => {
    const levels = [...new Set(safe.map(r => r[v]).filter(Boolean))].slice(0, 8);
    rows.push({ label: v, isHeader: true });
    levels.forEach(lv => {
      rows.push({ label: `  ${lv}`, vals: arms.map(a => { const grp = safe.filter(r => r[armKey] === a); return pct(grp.filter(r => r[v] === lv).length, grp.length); }) });
    });
  });

  if (!rows.length) rows.push({ label: "  (No columns matched for preview)", vals: arms.map(() => "—") });

  return {
    title: shell.title, id: shell.id, headers, rows,
    footnotes: meta?.footnotes?.length ? meta.footnotes : ["Generated from uploaded data."],
  };
}

// ─── Rendered output component ────────────────────────────────────────────────
export default function OutputTable({ language, outputTable, outputHtml }) {
  // Python: render the HTML produced by the generated Python code
  if (language === "python" && outputHtml) {
    return (
      <div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "2px solid #1e3a5f" }}>
          <span className="badge b-ok" style={{ background: "#0a2510", color: "#40d060", border: "1px solid #1a5030" }}>● LIVE EXECUTION</span>
          <span style={{ fontSize: "11px", color: "#3a6a8a" }}>Output rendered from Python (Pyodide) execution</span>
        </div>
        <style>{`
          .tlf-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .tlf-table th { background: #0a1525; color: #7ab0d0; font-weight: 500; padding: 8px 14px; text-align: center; border-bottom: 2px solid #1e3a5f; white-space: pre-line; font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
          .tlf-table th:first-child { text-align: left; }
          .tlf-table td { padding: 6px 14px; border-bottom: 1px solid #111d2e; color: #b0c8d8; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; }
          .tlf-table tr:hover td { background: #0a1525; }
        `}</style>
        <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
      </div>
    );
  }

  // R / fallback: render the JS-built simulated table
  if (!outputTable) return null;
  return (
    <div className="card" style={{ padding: "24px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "2px solid #1e3a5f" }}>
        <div style={{ textAlign: "left", flex: 1 }}>
          <div style={{ fontSize: "10px", color: "#3a6a8a", marginBottom: "3px" }}>{outputTable.id}</div>
          <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: "14px", color: "#c0d8f0", fontWeight: 500 }}>{outputTable.title}</div>
        </div>
        <span className="badge" style={{ background: "#1a1500", color: "#d0a030", border: "1px solid #4a3500" }}>SIMULATED PREVIEW</span>
      </div>
      <table className="tlf-table">
        <thead>
          <tr>{outputTable.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {outputTable.rows.map((row, i) => (
            <tr key={i} className={row.isHeader ? "hdr" : ""}>
              <td style={{ color: row.isHeader ? "#5090b8" : "#90b0c8" }}>{row.label}</td>
              {!row.isHeader && row.vals?.map((v, j) => <td key={j} className="val">{v}</td>)}
              {row.isHeader && <td colSpan={outputTable.headers.length - 1} />}
            </tr>
          ))}
        </tbody>
      </table>
      {outputTable.footnotes?.map((fn, i) => (
        <div key={i} style={{ marginTop: i === 0 ? "12px" : "2px", paddingTop: i === 0 ? "10px" : 0, borderTop: i === 0 ? "1px solid #1a2d45" : "none", fontSize: "10px", color: "#2a5a7a" }}>
          Note: {fn}
        </div>
      ))}
      <div style={{ marginTop: "12px", fontSize: "10px", color: "#4a3a0a", padding: "8px 12px", background: "#1a1200", border: "1px solid #3a2800", borderRadius: "4px" }}>
        ℹ Run the R program in your local R environment for the official output.
      </div>
    </div>
  );
}
