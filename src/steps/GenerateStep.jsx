import { useState } from "react";
import CodeViewer from "../components/CodeViewer.jsx";

// ─── Generate Step — dual-language code display ───────────────────────────────
export default function GenerateStep({
  rCode, pyCode, parsedMeta, selectedShell,
  language, loading,
  onRunExecute,
}) {
  const [codeTab, setCodeTab] = useState(language === "python" ? "python" : "r");

  const tabs = [
    {
      key: "python",
      label: "PYTHON",
      badge: { label: "● PYODIDE", color: "green" },
    },
    {
      key: "r",
      label: "R",
      badge: { label: "● WEBR", color: "blue" },
    },
    { key: "meta", label: "METADATA" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#c8e0f8" }}>Generated Code</h2>
        <span className="badge b-ok">CODE READY</span>
        <span style={{ fontSize: "10px", color: "#2a5070" }}>Both languages executable in the browser</span>
      </div>

      <CodeViewer tabs={tabs} activeTab={codeTab} onTabChange={setCodeTab}>
        {codeTab === "python" && (
          <div>
            <div style={{ marginBottom: "10px", fontSize: "10px", color: "#2a6a3a", lineHeight: 1.6 }}>
              Executes live in your browser via <strong>Pyodide</strong>. Datasets pre-mounted at <code>/datasets/*.csv</code>.
              Output rendered as an HTML table.
            </div>
            <pre className="code-pre">{pyCode}</pre>
          </div>
        )}
        {codeTab === "r" && (
          <div>
            <div style={{ marginBottom: "10px", fontSize: "10px", color: "#1a4a70", lineHeight: 1.6 }}>
              Executes live in your browser via <strong>WebR</strong>. Datasets pre-loaded as R dataframes.
              Also downloadable for your local R environment.
            </div>
            <pre className="code-pre">{rCode}</pre>
          </div>
        )}
        {codeTab === "meta" && (
          <pre className="code-pre">{JSON.stringify(parsedMeta, null, 2)}</pre>
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
