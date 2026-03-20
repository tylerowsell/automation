import { useState } from "react";
import CodeViewer from "../components/CodeViewer.jsx";

// ─── Generate Step — dual-language code display + analyst findings ─────────────
export default function GenerateStep({
  rCode, pyCode, parsedMeta, selectedShell,
  language, loading,
  onRunExecute,
  analystFindings,
}) {
  const [codeTab, setCodeTab] = useState(language === "python" ? "python" : "r");

  const tabs = [
    { key: "python", label: "PYTHON", badge: { label: "● PYODIDE", color: "green" } },
    { key: "r",      label: "R",      badge: { label: "● WEBR",    color: "blue"  } },
    { key: "meta",   label: "METADATA" },
    ...(analystFindings ? [{ key: "analysis", label: "ANALYST" }] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#c8e0f8" }}>Generated Code</h2>
        <span className="badge b-ok">CODE READY</span>
        {analystFindings && (
          <span className="badge" style={{ background: "#081828", color: "#2890c0", border: "1px solid #0c3050" }}>
            ● DATA ANALYZED
          </span>
        )}
        <span style={{ fontSize: "10px", color: "#2a5070" }}>Both languages executable in the browser</span>
      </div>

      <CodeViewer tabs={tabs} activeTab={codeTab} onTabChange={setCodeTab}>
        {codeTab === "python" && (
          <div>
            <div style={{ marginBottom: "10px", fontSize: "10px", color: "#2a6a3a", lineHeight: 1.6 }}>
              Executes live via <strong>Pyodide</strong>. Datasets at <code style={{ fontFamily: "'IBM Plex Mono'" }}>/datasets/*.csv</code>.
              Categorical values enumerated dynamically from data.
            </div>
            <pre className="code-pre">{pyCode}</pre>
          </div>
        )}
        {codeTab === "r" && (
          <div>
            <div style={{ marginBottom: "10px", fontSize: "10px", color: "#1a4a70", lineHeight: 1.6 }}>
              Executes live via <strong>WebR</strong>. Datasets pre-loaded as R dataframes.
              Also downloadable for your local R environment.
            </div>
            <pre className="code-pre">{rCode}</pre>
          </div>
        )}
        {codeTab === "meta" && (
          <pre className="code-pre">{JSON.stringify(parsedMeta, null, 2)}</pre>
        )}
        {codeTab === "analysis" && analystFindings && (
          <AnalystFindingsView findings={analystFindings} />
        )}
      </CodeViewer>

      <div style={{ marginTop: "18px", display: "flex", gap: "10px", alignItems: "center" }}>
        <button className="btn-primary" onClick={onRunExecute} disabled={loading}>
          {loading
            ? <span className="pulse">⟳ Executing...</span>
            : `▶ Execute ${language === "python" ? "Python (Pyodide)" : "R (WebR)"} + QC Agent →`}
        </button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(language === "python" ? pyCode : rCode)}`}
          download={`${selectedShell?.id || "tlf"}.${language === "python" ? "py" : "R"}`}
          style={{ fontSize: "11px", color: "#3a708a", textDecoration: "none" }}
        >
          ↓ Download {language === "python" ? "Python" : "R"} script
        </a>
      </div>
    </div>
  );
}

// ─── Analyst findings panel ───────────────────────────────────────────────────
function AnalystFindingsView({ findings }) {
  if (!findings) return null;
  const { arm_variable, arm_values, variables = {}, notes = [] } = findings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", background: "#06101e", border: "1px solid #0d2840", borderRadius: "5px" }}>
        <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a4060", marginBottom: "6px" }}>DATA ANALYST FINDINGS</div>
        <div style={{ fontSize: "11px", color: "#3a7090" }}>
          Treatment arm variable: <span style={{ color: "#4fc3f7" }}>{arm_variable || "—"}</span>
          {arm_values?.length > 0 && (
            <span style={{ color: "#2a6080" }}> → {arm_values.join(" | ")}</span>
          )}
        </div>
      </div>

      {/* Variables */}
      {Object.entries(variables).map(([varName, info]) => (
        <div key={varName} style={{ padding: "10px 14px", background: "#060a14", border: "1px solid #111e30", borderRadius: "5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "12px", color: "#4fc3f7" }}>{varName}</span>
            <span className="badge" style={{
              background: info.type === "categorical" ? "#071020" : "#100710",
              color: info.type === "categorical" ? "#3080c0" : "#9060c0",
              border: `1px solid ${info.type === "categorical" ? "#0d2840" : "#201030"}`,
            }}>{info.type || "unknown"}</span>
            {info.dataset && <span style={{ fontSize: "10px", color: "#1a3050" }}>{info.dataset}</span>}
          </div>

          {info.label && (
            <div style={{ fontSize: "10px", color: "#2a5070", marginBottom: "4px" }}>{info.label}</div>
          )}

          {/* Categorical: show unique values */}
          {info.type === "categorical" && info.unique_values?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
              {info.unique_values.map(v => (
                <span key={v} style={{
                  padding: "1px 7px", fontSize: "10px", background: "#07101e",
                  border: "1px solid #112030", borderRadius: "3px", color: "#5a90a8",
                  fontFamily: "'IBM Plex Mono'",
                }}>
                  {String(v)}
                </span>
              ))}
              {info.n_unique > info.unique_values?.length && (
                <span style={{ fontSize: "10px", color: "#1a3a50" }}>+{info.n_unique - info.unique_values.length} more</span>
              )}
            </div>
          )}

          {/* Numeric: show stats */}
          {info.type === "numeric" && info.stats && (
            <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
              {Object.entries(info.stats).map(([k, v]) => (
                <div key={k} style={{ fontSize: "10px" }}>
                  <span style={{ color: "#1a3a50" }}>{k}: </span>
                  <span style={{ color: "#5a8090", fontFamily: "'IBM Plex Mono'" }}>{typeof v === "number" ? v.toFixed(1) : v}</span>
                </div>
              ))}
            </div>
          )}

          {info.codelist_values?.length > 0 && (
            <div style={{ marginTop: "6px", fontSize: "10px", color: "#1a4030" }}>
              Spec codelist: {info.codelist_values.join(", ")}
            </div>
          )}

          {info.note && <div style={{ marginTop: "4px", fontSize: "10px", color: "#3a5020" }}>ℹ {info.note}</div>}
        </div>
      ))}

      {/* Notes */}
      {notes.length > 0 && (
        <div style={{ padding: "10px 14px", background: "#100e06", border: "1px solid #2a2008", borderRadius: "5px" }}>
          {notes.map((n, i) => <div key={i} style={{ fontSize: "10px", color: "#906030", marginBottom: "2px" }}>ℹ {n}</div>)}
        </div>
      )}
    </div>
  );
}
