// ─── Execute Step — QC loop display + Pyodide execution status ────────────────
export default function ExecuteStep({
  loading, loadingMsg, qcAttempts,
  finalRCode, finalPyCode,
  language,
  pyodideLoading,  // true while Pyodide is initialising for the first time
}) {
  const currentCode = language === "python" ? finalPyCode : finalRCode;

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#d0e8f8", marginBottom: "5px" }}>
          QC &amp; Self-Correction Loop
        </h2>
        <p style={{ fontSize: "11px", color: "#3a6a8a" }}>
          {language === "python"
            ? "Executes Python code in Pyodide, validates output, auto-corrects errors via Claude."
            : "Runs R code (simulated), validates output, auto-corrects errors via Claude."}
        </p>
      </div>

      {loading && (
        <div style={{ marginBottom: "18px", padding: "14px 16px", background: "#0a1525", border: "1px solid #1a3a5a", borderRadius: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#4fc3f7" }} />
            <span style={{ fontSize: "12px", color: "#4fc3f7" }}>
              {pyodideLoading
                ? "⟳ Loading Python runtime (first run only, ~10 seconds)..."
                : `⟳ ${loadingMsg}`}
            </span>
          </div>
          <div className="lbar" />
        </div>
      )}

      {qcAttempts.map((a, i) => (
        <div key={i} className={`arow ${a.success ? "aok" : "afail"}`}>
          <span style={{ color: a.success ? "#66bb6a" : "#ef5350", fontSize: "14px" }}>{a.success ? "✓" : "✗"}</span>
          <span style={{ color: "#3a5a7a", minWidth: 70 }}>ATTEMPT {a.attempt}</span>
          <span style={{ color: a.success ? "#66bb6a" : "#ef5350", fontFamily: "'IBM Plex Mono'", fontSize: "11px" }}>
            {a.success
              ? "Execution successful — output validated"
              : (a.error?.slice(0, 100) + "...")}
          </span>
        </div>
      ))}

      {qcAttempts.length > 0 && !loading && (
        <div style={{ marginTop: "18px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#2a4a6a", marginBottom: "8px" }}>
            FINAL {language === "python" ? "PYTHON" : "R"} PROGRAM
          </div>
          <pre className="code-pre">{currentCode}</pre>
        </div>
      )}
    </div>
  );
}
