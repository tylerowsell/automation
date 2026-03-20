// ─── TLF Output Table ─────────────────────────────────────────────────────────
// If outputHtml is set (from Pyodide or WebR live execution): renders it directly.
// Otherwise falls back to a JS-built preview table.

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
    footnotes: meta?.footnotes?.length ? meta.footnotes : [],
  };
}

// ─── Inline styles injected for outputHtml content ────────────────────────────
const LIVE_TABLE_STYLES = `
  .tlf-table, table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'IBM Plex Mono', monospace; }
  .tlf-table caption, caption { text-align: left; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; color: #c0d8f0; font-weight: 500; padding-bottom: 10px; caption-side: top; }
  .tlf-table th, th { background: #07101e; color: #5890b0; font-weight: 500; padding: 8px 14px; text-align: center; border-bottom: 2px solid #1a2e48; white-space: pre-line; font-size: 11px; }
  .tlf-table th:first-child, th:first-child { text-align: left; }
  .tlf-table td, td { padding: 5px 14px; border-bottom: 1px solid #0d1828; color: #90b0c8; font-size: 11.5px; }
  .tlf-table td:first-child, td:first-child { text-align: left; }
  .tlf-table td:not(:first-child), td:not(:first-child) { text-align: center; color: #a8c4d8; }
  .tlf-table tr:hover td, tr:hover td { background: #07101e; }
  p.footnote, .footnote { font-size: 10px; color: #2a5a70; margin-top: 8px; border-top: 1px solid #1a2e48; padding-top: 8px; }
`;

// ─── Rendered output component ────────────────────────────────────────────────
export default function OutputTable({ language, outputTable, outputHtml, compact }) {
  // Live execution HTML (Python/Pyodide or R/WebR) — render directly
  if (outputHtml) {
    const runtimeLabel = language === "python" ? "Python · Pyodide" : "R · WebR";
    const runtimeBadgeStyle = language === "python"
      ? { background: "#062010", color: "#30b060", border: "1px solid #0c3820" }
      : { background: "#071020", color: "#30a0e0", border: "1px solid #0c2840" };
    return (
      <div className={compact ? "" : "card"} style={{ padding: compact ? 0 : "24px", marginBottom: compact ? 0 : "16px" }}>
        {!compact && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #121e30" }}>
            <span className="badge" style={runtimeBadgeStyle}>● LIVE EXECUTION</span>
            <span style={{ fontSize: "11px", color: "#2a5070" }}>Output from {runtimeLabel}</span>
          </div>
        )}
        <style>{LIVE_TABLE_STYLES}</style>
        <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
      </div>
    );
  }

  // JS-built fallback preview (used when live execution result isn't available)
  if (!outputTable) return null;
  return (
    <div className={compact ? "" : "card"} style={{ padding: compact ? 0 : "24px", marginBottom: compact ? 0 : "16px" }}>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #121e30" }}>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontSize: "10px", color: "#2a5070", marginBottom: "3px" }}>{outputTable.id}</div>
            <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: "14px", color: "#b8d4ee", fontWeight: 500 }}>{outputTable.title}</div>
          </div>
          <span className="badge" style={{ background: "#120e04", color: "#b09030", border: "1px solid #302808" }}>PREVIEW</span>
        </div>
      )}
      <table className="tlf-table">
        <thead>
          <tr>{outputTable.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {outputTable.rows.map((row, i) => (
            <tr key={i} className={row.isHeader ? "hdr" : ""}>
              <td style={{ color: row.isHeader ? "#3a7898" : "#8ab0c8" }}>{row.label}</td>
              {!row.isHeader && row.vals?.map((v, j) => <td key={j} className="val">{v}</td>)}
              {row.isHeader && <td colSpan={outputTable.headers.length - 1} />}
            </tr>
          ))}
        </tbody>
      </table>
      {outputTable.footnotes?.map((fn, i) => (
        <div key={i} style={{ marginTop: i === 0 ? "12px" : "3px", paddingTop: i === 0 ? "10px" : 0, borderTop: i === 0 ? "1px solid #121e30" : "none", fontSize: "10px", color: "#2a5070" }}>
          {fn}
        </div>
      ))}
    </div>
  );
}
