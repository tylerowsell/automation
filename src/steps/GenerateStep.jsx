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

// Small pill chip used for controlled-term value lists
function ValueChip({ value, color = "teal" }) {
  const palettes = {
    teal:   { bg: "#041414", border: "#0a2a2a", text: "#30a0a0" },
    blue:   { bg: "#040814", border: "#0a1a38", text: "#3070c0" },
    purple: { bg: "#08040e", border: "#1a0a30", text: "#7050c0" },
  };
  const p = palettes[color] || palettes.teal;
  return (
    <span style={{
      padding: "1px 6px", fontSize: "9.5px", borderRadius: "3px",
      background: p.bg, border: `1px solid ${p.border}`,
      color: p.text, fontFamily: "'IBM Plex Mono'", whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}

// ─── Analyst findings panel ───────────────────────────────────────────────────
// Controlled-term variables (PARAMCD, AVISIT, etc.) show actual values — these
// are protocol metadata. Subject-level variables show cardinality count only.
function AnalystFindingsView({ findings }) {
  if (!findings) return null;
  const { arm_variable, arm_values, arm_n_unique, param_values, visit_values, variables = {}, notes = [] } = findings;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Privacy / data tier indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 12px", background: "#050f0a", border: "1px solid #0d2a1a", borderRadius: "5px",
      }}>
        <span style={{ fontSize: "12px" }}>🔒</span>
        <span style={{ fontSize: "10px", color: "#2a7040", fontFamily: "'IBM Plex Mono'" }}>
          Controlled-term values (PARAMCD, AVISIT, etc.) shown · Subject-level values withheld
        </span>
      </div>

      {/* Key controlled-term summaries */}
      <div style={{ display: "grid", gridTemplateColumns: arm_values?.length ? "1fr 1fr" : "1fr", gap: "8px" }}>
        {/* Arms */}
        <div style={{ padding: "10px 14px", background: "#06101e", border: "1px solid #0d2840", borderRadius: "5px" }}>
          <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a4060", marginBottom: "5px" }}>TREATMENT ARMS</div>
          <div style={{ fontSize: "11px", color: "#4fc3f7", fontFamily: "'IBM Plex Mono'", marginBottom: "2px" }}>
            {arm_variable || "—"}
          </div>
          {arm_values?.length > 0
            ? <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                {arm_values.map(v => <ValueChip key={v} value={v} color="blue" />)}
              </div>
            : arm_n_unique != null && (
                <div style={{ fontSize: "10px", color: "#2a6080" }}>{arm_n_unique} arm(s)</div>
              )
          }
        </div>

        {/* PARAMCDs if present */}
        {param_values?.length > 0 && (
          <div style={{ padding: "10px 14px", background: "#06101e", border: "1px solid #0d2840", borderRadius: "5px" }}>
            <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a4060", marginBottom: "5px" }}>PARAMCD VALUES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {param_values.map(v => <ValueChip key={v} value={v} color="teal" />)}
            </div>
          </div>
        )}

        {/* Visits if present */}
        {visit_values?.length > 0 && (
          <div style={{ padding: "10px 14px", background: "#06101e", border: "1px solid #0d2840", borderRadius: "5px" }}>
            <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a4060", marginBottom: "5px" }}>VISIT VALUES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {visit_values.map(v => <ValueChip key={v} value={v} color="purple" />)}
            </div>
          </div>
        )}
      </div>

      {/* Variables table */}
      <div style={{ border: "1px solid #111e30", borderRadius: "5px", overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "130px 80px 70px 1fr",
          padding: "6px 12px", background: "#060a14",
          fontSize: "9px", letterSpacing: ".08em", color: "#1a3050",
          borderBottom: "1px solid #111e30",
        }}>
          <span>VARIABLE</span><span>TYPE</span><span>COUNT</span><span>VALUES / STATS</span>
        </div>
        {Object.entries(variables).map(([varName, info], i) => (
          <div key={varName} style={{
            display: "grid", gridTemplateColumns: "130px 80px 70px 1fr",
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
            <div style={{ fontFamily: "'IBM Plex Mono'", color: "#3a6080", fontSize: "10px" }}>
              {info.n_unique != null
                ? <span>{info.n_unique}</span>
                : <span style={{ color: "#1a3050" }}>—</span>}
            </div>

            {/* Values (controlled-term) OR stats (numeric) OR note */}
            <div>
              {info.values?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginBottom: "3px" }}>
                  {info.values.map(v => <ValueChip key={v} value={String(v)} color="teal" />)}
                </div>
              )}
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
                <div style={{ fontSize: "10px", color: "#1a4030", marginTop: "2px" }}>codelist: {info.codelist}</div>
              )}
              {info.note && !info.values?.length && (
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
