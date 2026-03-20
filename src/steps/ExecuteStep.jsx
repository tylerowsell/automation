// ─── Execute Step — QC loop display + runtime initialisation status ────────────
export default function ExecuteStep({
  loading, loadingMsg, qcAttempts,
  finalRCode, finalPyCode,
  language,
  runtimeLoading,      // true while runtime (Pyodide or WebR) is initialising
  runtimeLoadingMsg,   // current runtime init message
}) {
  const currentCode = language === "python" ? finalPyCode : finalRCode;
  const runtimeName = language === "python" ? "Python (Pyodide)" : "R (WebR)";

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#c8e0f8", marginBottom: "6px" }}>
          QC &amp; Self-Correction Loop
        </h2>
        <p style={{ fontSize: "11px", color: "#2a5070", lineHeight: 1.6 }}>
          Executes {runtimeName} code, validates output, and auto-corrects errors via Claude — up to 3 attempts.
        </p>
      </div>

      {/* Runtime initialisation status (first-run only) */}
      {loading && runtimeLoading && (
        <div style={{ marginBottom: "14px", padding: "14px 16px", background: "#06101e", border: "1px solid #0d2840", borderRadius: "6px" }}>
          <div style={{ fontSize: "10px", letterSpacing: ".08em", color: "#1a4060", marginBottom: "8px" }}>
            {language === "python" ? "PYTHON RUNTIME INIT" : "R RUNTIME INIT"} — FIRST RUN ONLY
          </div>
          <div style={{ fontSize: "11px", color: "#3a90c0", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="pulse" style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#3a90c0" }} />
            {runtimeLoadingMsg || `Initialising ${runtimeName}...`}
          </div>
          {language === "python" && (
            <div style={{ fontSize: "10px", color: "#1a3a50" }}>
              Downloading Pyodide WASM (~5 MB) + pandas, numpy, scipy
            </div>
          )}
          {language === "r" && (
            <div style={{ fontSize: "10px", color: "#1a3a50" }}>
              Downloading WebR WASM + dplyr, tidyr, gt packages — may take ~30s on first run
            </div>
          )}
          <div className="lbar" style={{ marginTop: "10px" }} />
        </div>
      )}

      {/* Active execution status */}
      {loading && !runtimeLoading && (
        <div style={{ marginBottom: "14px", padding: "12px 16px", background: "#06101e", border: "1px solid #0d2840", borderRadius: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#4fc3f7", flexShrink: 0 }} />
            <span style={{ fontSize: "11.5px", color: "#4fc3f7" }}>{loadingMsg}</span>
          </div>
          <div className="lbar" />
        </div>
      )}

      {/* QC attempt log */}
      {qcAttempts.length > 0 && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a3a50", marginBottom: "8px" }}>QC ATTEMPTS</div>
          {qcAttempts.map((a, i) => (
            <div key={i} className={`arow ${a.success ? "aok" : "afail"}`}>
              <span style={{ color: a.success ? "#3aaa50" : "#cc3030", fontSize: "15px", flexShrink: 0 }}>{a.success ? "✓" : "✗"}</span>
              <span style={{ color: "#2a4a60", minWidth: 80, flexShrink: 0 }}>ATTEMPT {a.attempt}</span>
              <span style={{ color: a.success ? "#3aaa50" : "#cc3030", fontFamily: "'IBM Plex Mono'", fontSize: "10.5px", wordBreak: "break-word" }}>
                {a.success
                  ? `Execution successful — ${runtimeName} output validated`
                  : a.error?.slice(0, 140)}
                {!a.success && a.error?.length > 140 ? "…" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Final code preview */}
      {qcAttempts.length > 0 && !loading && (
        <div>
          <div style={{ fontSize: "9px", letterSpacing: ".1em", color: "#1a3a50", marginBottom: "8px" }}>
            FINAL {language === "python" ? "PYTHON" : "R"} PROGRAM
          </div>
          <pre className="code-pre">{currentCode}</pre>
        </div>
      )}
    </div>
  );
}
