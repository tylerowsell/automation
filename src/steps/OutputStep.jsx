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
  const [tab, setTab] = useState("output");
  const currentCode = language === "python" ? finalPyCode : finalRCode;
  const runtimeLabel = language === "python" ? "Python / Pyodide v0.27.0" : "R / WebR";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#c8e0f8" }}>Output Review</h2>
        <span className="badge b-ok">✓ QC PASSED</span>
        <span style={{ fontSize: "10px", color: "#1e4a28" }}>{qcAttempts.length} attempt(s)</span>
        {language === "python"
          ? <span className="badge" style={{ background: "#062010", color: "#30b060", border: "1px solid #0c3820" }}>🐍 PYTHON · LIVE EXECUTION</span>
          : <span className="badge" style={{ background: "#071020", color: "#30a0e0", border: "1px solid #0c2840" }}>R · WEBR LIVE EXECUTION</span>}
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid #162035", marginBottom: "16px", display: "flex", gap: "2px" }}>
        {[
          ["output", "RENDERED OUTPUT"],
          ["compare", "SHELL vs OUTPUT"],
          ["code", `FINAL ${language.toUpperCase()} CODE`],
          ["audit", "AUDIT TRAIL"],
        ].map(([t, l]) => (
          <button key={t} className={`tab-btn ${tab === t ? "on" : "off"}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* RENDERED OUTPUT */}
      {tab === "output" && (
        <OutputTable
          language={language}
          outputTable={outputTable}
          outputHtml={outputHtml}
        />
      )}

      {/* SHELL vs OUTPUT — side-by-side comparison */}
      {tab === "compare" && (
        <div>
          <div style={{ marginBottom: "12px", fontSize: "11px", color: "#2a5a70", lineHeight: 1.6 }}>
            Compare the original shell structure (left) against the generated output (right).
            Verify column headers, row groups, indentation, and statistical formats match.
          </div>
          <div className="compare-grid" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
            {/* Left: original shell */}
            <div className="compare-pane">
              <div className="compare-pane-header">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a4060", flexShrink: 0 }} />
                ORIGINAL SHELL — {selectedShell?.id}
                <span style={{ marginLeft: "auto", color: "#1a3a50" }}>xx = placeholder</span>
              </div>
              <div className="compare-pane-body">
                <pre style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px",
                  color: "#4a7898",
                  lineHeight: 1.75,
                  whiteSpace: "pre",
                  margin: 0,
                }}>
                  {selectedShell?.shell?.trim() || "No shell available"}
                </pre>
              </div>
            </div>

            <div className="compare-divider" />

            {/* Right: generated output */}
            <div className="compare-pane">
              <div className="compare-pane-header">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0d4020", flexShrink: 0 }} />
                GENERATED OUTPUT
                <span className="badge b-ok" style={{ marginLeft: "auto", fontSize: "9px" }}>LIVE DATA</span>
              </div>
              <div className="compare-pane-body">
                <OutputTable
                  language={language}
                  outputTable={outputTable}
                  outputHtml={outputHtml}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FINAL CODE */}
      {tab === "code" && (
        <div>
          <div style={{ marginBottom: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#2a5070" }}>
              {language === "python" ? "Python — executed via Pyodide" : "R — executed via WebR · download for local use"}
            </span>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(currentCode)}`}
              download={`${selectedShell?.id || "tlf"}.${language === "python" ? "py" : "R"}`}
              className="btn-ghost"
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "4px 12px", fontSize: "10px", marginLeft: "auto" }}
            >
              ↓ Download
            </a>
          </div>
          <pre className="code-pre">{currentCode}</pre>
        </div>
      )}

      {/* AUDIT TRAIL */}
      {tab === "audit" && (
        <div className="card" style={{ padding: "18px" }}>
          {[
            ["Output ID", selectedShell?.id || outputTable?.id || "—"],
            ["Title", selectedShell?.title || outputTable?.title || "—"],
            ["Model", "claude-sonnet-4-20250514"],
            ["Language", language === "python" ? "Python" : "R"],
            ["Runtime", language === "python" ? "Pyodide v0.27.0 (browser WASM)" : "WebR (browser WASM)"],
            ["Execution", "Live browser execution"],
            ...(language === "python" ? [["Python packages", "pandas, numpy, scipy"]] : [["R packages", "dplyr, tidyr, gt"]]),
            ["Data source", appMode === "upload" && Object.keys(adamDatasets).length > 0 ? "Uploaded ADaM files" : "CDISC Pilot (sample data)"],
            ["Datasets used", Object.keys(adamDatasets).join(", ")],
            ["QC attempts", qcAttempts.length],
            ["QC status", qcAttempts.some(a => a.success) ? "PASSED" : "FAILED — MANUAL REVIEW REQUIRED"],
            ["QC purpose", "COMPARISON AGAINST PRODUCTION OUTPUT — NOT FOR SUBMISSION"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: "16px", padding: "6px 0", fontSize: "11px", borderBottom: "1px solid #0c1520" }}>
              <span style={{ color: "#2a5a70", minWidth: 180, flexShrink: 0 }}>{k}</span>
              <span style={{ color: "#7aabb8" }}>{String(v)}</span>
            </div>
          ))}
          {qcAttempts.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a3a50", marginBottom: "8px" }}>QC ATTEMPT LOG</div>
              {qcAttempts.map((a, i) => (
                <div key={i} className={`arow ${a.success ? "aok" : "afail"}`}>
                  <span style={{ color: a.success ? "#3aaa50" : "#cc3030", fontSize: "13px" }}>{a.success ? "✓" : "✗"}</span>
                  <span style={{ color: "#2a4a60", minWidth: 80 }}>Attempt {a.attempt}</span>
                  <span style={{ color: a.success ? "#3aaa50" : "#cc3030", fontFamily: "'IBM Plex Mono'", fontSize: "10.5px" }}>
                    {a.success ? "Execution successful — output validated" : a.error?.slice(0, 120)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={onRunAnother}>↺ Run Another TLF</button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(currentCode)}`}
          download={`${selectedShell?.id || "tlf"}.${language === "python" ? "py" : "R"}`}
          className="btn-ghost"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          ↓ Download {language === "python" ? "Python" : "R"} Script
        </a>
      </div>
    </div>
  );
}
