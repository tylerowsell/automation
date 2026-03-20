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
// Displays structural findings only — no actual data values shown or stored.
function AnalystFindingsView({ findings }) {
  if (!findings) return null;
  const { arm_variable, arm_n_unique, variables = {}, notes = [] } = findings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Privacy badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 12px", background: "#050f0a", border: "1px solid #0d2a1a", borderRadius: "5px",
      }}>
        <span style={{ fontSize: "12px" }}>🔒</span>
        <span style={{ fontSize: "10px", color: "#2a7040", fontFamily: "'IBM Plex Mono'" }}>
          Privacy-safe analysis — variable structure only, no data values sent to API
        </span>
      </div>

      {/* Treatment arm summary */}
      <div style={{ padding: "10px 14px", background: "#06101e", border: "1px solid #0d2840", borderRadius: "5px" }}>
        <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a4060", marginBottom: "5px" }}>TREATMENT ARM</div>
        <div style={{ fontSize: "11px", color: "#3a7090", fontFamily: "'IBM Plex Mono'" }}>
          {arm_variable || "—"}
          {arm_n_unique != null && (
            <span style={{ color: "#2a6080" }}> — {arm_n_unique} distinct arm(s) in data</span>
          )}
        </div>
      </div>

      {/* Variables table */}
      <div style={{ border: "1px solid #111e30", borderRadius: "5px", overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "140px 90px 80px 1fr",
          padding: "6px 12px", background: "#060a14",
          fontSize: "9px", letterSpacing: ".08em", color: "#1a3050",
          borderBottom: "1px solid #111e30",
        }}>
          <span>VARIABLE</span><span>TYPE</span><span>CARDINALITY</span><span>STATS / NOTES</span>
        </div>
        {Object.entries(variables).map(([varName, info], i) => (
          <div key={varName} style={{
            display: "grid", gridTemplateColumns: "140px 90px 80px 1fr",
            padding: "7px 12px", alignItems: "start",
            background: i % 2 === 0 ? "#050810" : "#060a14",
            borderBottom: "1px solid #0c1420",
            fontSize: "11px",
          }}>
            {/* Variable name + label */}
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono'", color: "#4fc3f7", fontSize: "11px" }}>{varName}</div>
              {info.label && <div style={{ fontSize: "9px", color: "#1a3a50", marginTop: "1px" }}>{info.label}</div>}
              {info.dataset && <div style={{ fontSize: "9px", color: "#112030" }}>{info.dataset}</div>}
            </div>

            {/* Type badge */}
            <div>
              <span className="badge" style={{
                background: info.type === "categorical" ? "#071020" : "#100718",
                color: info.type === "categorical" ? "#3080c0" : "#9060c0",
                border: `1px solid ${info.type === "categorical" ? "#0d2840" : "#201030"}`,
              }}>
                {info.type || "—"}
              </span>
            </div>

            {/* Cardinality */}
            <div style={{ fontFamily: "'IBM Plex Mono'", color: "#3a6080", fontSize: "11px" }}>
              {info.n_unique != null
                ? <span>{info.n_unique} unique</span>
                : <span style={{ color: "#1a3050" }}>—</span>}
            </div>

            {/* Stats or codelist note */}
            <div>
              {info.type === "numeric" && info.stats && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {Object.entries(info.stats).map(([k, v]) => (
                    <span key={k} style={{ fontSize: "10px" }}>
                      <span style={{ color: "#1a3a50" }}>{k} </span>
                      <span style={{ color: "#5a8090", fontFamily: "'IBM Plex Mono'" }}>
                        {typeof v === "number" ? v.toFixed(1) : v}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {info.codelist && (
                <div style={{ fontSize: "10px", color: "#1a4030", marginTop: "2px" }}>
                  codelist: {info.codelist}
                </div>
              )}
              {info.note && (
                <div style={{ fontSize: "10px", color: "#3a5020", marginTop: "2px" }}>ℹ {info.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {notes.length > 0 && (
        <div style={{ padding: "8px 12px", background: "#0e0e06", border: "1px solid #222008", borderRadius: "5px" }}>
          {notes.map((n, i) => (
            <div key={i} style={{ fontSize: "10px", color: "#806030", marginBottom: i < notes.length - 1 ? "3px" : 0 }}>
              ℹ {n}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
