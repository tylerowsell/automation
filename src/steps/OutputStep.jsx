import { useState } from "react";
import OutputTable from "../components/OutputTable.jsx";

// ─── Output Step — review rendered table, code, and audit trail ───────────────
export default function OutputStep({
  outputTable, outputHtml,
  finalRCode, finalPyCode,
  qcAttempts,
  appMode, adamDatasets,
  language,
  onRunAnother,
  selectedShell,
}) {
  const [tab, setTab] = useState("table");
  const currentCode = language === "python" ? finalPyCode : finalRCode;

  return (
    <div>
      <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#d0e8f8" }}>Output Review</h2>
        <span className="badge b-ok">✓ QC PASSED</span>
        <span style={{ fontSize: "10px", color: "#2a5a3a" }}>{qcAttempts.length} attempt(s)</span>
        {language === "python"
          ? <span className="badge" style={{ background: "#0a2510", color: "#40d060", border: "1px solid #1a5030" }}>🐍 PYTHON / Pyodide v0.27.0</span>
          : <span className="badge" style={{ background: "#1a1a0a", color: "#c0a040", border: "1px solid #3a3a1a" }}>📊 R (SIMULATED)</span>}
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid #1a2d45", marginBottom: "14px", display: "flex" }}>
        {[["table", "RENDERED TABLE"], ["code", `FINAL ${language.toUpperCase()} CODE`], ["audit", "AUDIT TRAIL"]].map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? "on" : "off"}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab === "table" && (
        <OutputTable
          language={language}
          outputTable={outputTable}
          outputHtml={outputHtml}
        />
      )}

      {tab === "code" && <pre className="code-pre">{currentCode}</pre>}

      {tab === "audit" && (
        <div className="card" style={{ padding: "16px" }}>
          {[
            ["Output ID", outputTable?.id || selectedShell?.id || "—"],
            ["Model", "claude-sonnet-4-20250514"],
            ["Language", language === "python" ? "Python (Pyodide v0.27.0)" : "R (simulated)"],
            ["Execution", language === "python" ? "Live browser execution" : "Simulated"],
            ...(language === "python" ? [["Python Packages", "pandas, numpy, scipy"]] : []),
            ["Data Source", appMode === "upload" && Object.keys(adamDatasets).length > 0 ? "Uploaded files" : "CDISC Pilot (sample)"],
            ["Datasets", Object.keys(adamDatasets).join(", ")],
            ["QC Attempts", qcAttempts.length],
            ["Status", "COMPLETED — READY FOR PROGRAMMER REVIEW"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: "16px", padding: "5px 0", fontSize: "11px", borderBottom: "1px solid #0d1a2a" }}>
              <span style={{ color: "#3a6a8a", minWidth: 160 }}>{k}</span>
              <span style={{ color: "#90b8d0" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "18px", display: "flex", gap: "10px" }}>
        <button className="btn-primary" onClick={onRunAnother}>↺ Run Another TLF</button>
        {language === "r" && (
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(finalRCode)}`}
            download={`${outputTable?.id || selectedShell?.id || "tlf"}.R`}
            className="btn-ghost"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            ↓ Download R Script
          </a>
        )}
        {language !== "r" && (
          <button className="btn-ghost">↓ Export RTF (simulated)</button>
        )}
      </div>
    </div>
  );
}
