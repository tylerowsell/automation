import { useState } from "react";
import CodeViewer from "../components/CodeViewer.jsx";

// ─── Generate Step — dual-language code display ───────────────────────────────
export default function GenerateStep({
  rCode, pyCode, parsedMeta, selectedShell,
  language, loading,
  onRunExecute,
}) {
  // Default tab: python if language=python, else r
  const [codeTab, setCodeTab] = useState(language === "python" ? "python" : "r");

  const tabs = [
    {
      key: "python",
      label: "PYTHON (LIVE)",
      badge: { label: "● EXECUTABLE", color: "green" },
    },
    {
      key: "r",
      label: "R (DOWNLOAD)",
      badge: { label: "DOWNLOAD ONLY", color: "grey" },
    },
    { key: "meta", label: "METADATA" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#d0e8f8" }}>Generated Code</h2>
        <span className="badge b-ok">CODE READY</span>
      </div>

      <CodeViewer tabs={tabs} activeTab={codeTab} onTabChange={setCodeTab}>
        {codeTab === "python" && (
          <div>
            <div style={{ marginBottom: "8px", fontSize: "10px", color: "#3a7a4a" }}>
              This Python code will execute live in your browser via Pyodide. Output will be rendered as an HTML table.
            </div>
            <pre className="code-pre">{pyCode}</pre>
          </div>
        )}
        {codeTab === "r" && (
          <div>
            <div style={{ marginBottom: "8px", fontSize: "10px", color: "#5a5a3a" }}>
              Download this R program and run it in your local R environment (tidyverse, gtsummary, r2rtf required).
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
            : language === "python" ? "▶ Execute Python + QC Agent →" : "▶ Execute R (simulated) + QC Agent →"}
        </button>
        {language === "r" && (
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(rCode)}`}
            download={`${selectedShell?.id || "tlf"}.R`}
            style={{ fontSize: "11px", color: "#5090b8", textDecoration: "none" }}
          >
            ↓ Download R script
          </a>
        )}
      </div>
    </div>
  );
}
