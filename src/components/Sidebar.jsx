import { useRef, useEffect } from "react";

const STEPS = ["select", "parse", "generate", "execute", "output"];
const STEP_LABELS = [
  ["select",   "Select Shell"],
  ["parse",    "Parse & Ingest"],
  ["generate", "Generate Code"],
  ["execute",  "QC & Execute"],
  ["output",   "Review Output"],
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ step, appMode, uploadedDatasets, uploadedShells, agentLogs }) {
  const logsEndRef = useRef(null);
  const stepIdx = STEPS.indexOf(step);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentLogs]);

  return (
    <div style={{
      width: "232px", flexShrink: 0,
      borderRight: "1px solid #121c2e",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      background: "#050810",
    }}>
      {/* Workflow steps */}
      <div style={{ padding: "18px 16px", borderBottom: "1px solid #121c2e" }}>
        <div style={{ fontSize: "9px", letterSpacing: "0.14em", color: "#1a3050", marginBottom: "14px", fontFamily: "'IBM Plex Mono'" }}>
          WORKFLOW
        </div>
        {STEP_LABELS.map(([id, label], i) => {
          const idx = STEPS.indexOf(id);
          const isDone = stepIdx > idx;
          const isActive = stepIdx === idx;
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div className={`step-dot ${isActive ? "step-active" : isDone ? "step-done" : "step-pending"}`}>
                {isDone ? "✓" : i + 1}
              </div>
              <div>
                <div style={{
                  fontSize: "11px",
                  fontFamily: "'IBM Plex Mono'",
                  color: isActive ? "#b0d0ee" : isDone ? "#3a9050" : "#1e3a50",
                  fontWeight: isActive ? 500 : 400,
                }}>
                  {label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload status */}
      {appMode === "upload" && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #121c2e" }}>
          <div style={{ fontSize: "9px", letterSpacing: ".12em", color: "#1a3050", marginBottom: "7px", fontFamily: "'IBM Plex Mono'" }}>LOADED FILES</div>
          <div style={{ fontSize: "11px", color: Object.keys(uploadedDatasets).length > 0 ? "#3a9050" : "#1e3a50", marginBottom: "3px" }}>
            {Object.keys(uploadedDatasets).length > 0
              ? `● ${Object.keys(uploadedDatasets).length} dataset(s)`
              : "○ No datasets"}
          </div>
          <div style={{ fontSize: "11px", color: uploadedShells.length > 0 ? "#3a9050" : "#1e3a50" }}>
            {uploadedShells.length > 0
              ? `● ${uploadedShells.length} shell(s)`
              : "○ No shells"}
          </div>
        </div>
      )}

      {/* Agent logs */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 16px 6px", fontSize: "9px", letterSpacing: ".12em", color: "#1a3050", fontFamily: "'IBM Plex Mono'", flexShrink: 0 }}>
          AGENT LOGS
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 16px" }}>
          {agentLogs.length === 0 && (
            <div style={{ fontSize: "10px", color: "#121e30", fontStyle: "italic", fontFamily: "'IBM Plex Mono'" }}>
              Awaiting workflow...
            </div>
          )}
          {agentLogs.map((l, i) => (
            <div key={i} className={`log-line log-${l.type}`}>
              <span style={{ color: "#111d2e", marginRight: 5 }}>{l.ts}</span>{l.msg}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
