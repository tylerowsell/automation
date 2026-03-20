import { useRef, useEffect } from "react";

const STEPS = ["select", "parse", "generate", "execute", "output"];
const STEP_LABELS = [
  ["select", "Select Shell"],
  ["parse", "Parse & Ingest"],
  ["generate", "Generate Code"],
  ["execute", "QC & Execute"],
  ["output", "Review Output"],
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ step, appMode, uploadedDatasets, uploadedShells, agentLogs }) {
  const logsEndRef = useRef(null);
  const stepIdx = STEPS.indexOf(step);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentLogs]);

  return (
    <div style={{ width: "240px", flexShrink: 0, borderRight: "1px solid #1a2d45", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Workflow steps */}
      <div style={{ padding: "18px 16px", borderBottom: "1px solid #1a2d45" }}>
        <div style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#2a4a6a", marginBottom: "12px" }}>WORKFLOW</div>
        {STEP_LABELS.map(([id, label], i) => {
          const idx = STEPS.indexOf(id);
          const isDone = stepIdx > idx;
          const isActive = stepIdx === idx;
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div className={`step-dot ${isActive ? "step-active" : isDone ? "step-done" : "step-pending"}`}>
                {isDone ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "11px", color: isActive ? "#c0d8f0" : isDone ? "#66bb6a" : "#2a4a6a" }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Upload status (upload mode only) */}
      {appMode === "upload" && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #1a2d45" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#2a4a6a", marginBottom: "6px" }}>UPLOADED</div>
          <div style={{ fontSize: "11px", color: Object.keys(uploadedDatasets).length > 0 ? "#66bb6a" : "#3a5a7a" }}>
            {Object.keys(uploadedDatasets).length > 0 ? `● ${Object.keys(uploadedDatasets).length} dataset(s)` : "○ No datasets"}
          </div>
          <div style={{ fontSize: "11px", color: uploadedShells.length > 0 ? "#66bb6a" : "#3a5a7a", marginTop: "3px" }}>
            {uploadedShells.length > 0 ? `● ${uploadedShells.length} shell(s)` : "○ No shells"}
          </div>
        </div>
      )}

      {/* Agent logs */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 16px 4px", fontSize: "9px", letterSpacing: "0.12em", color: "#2a4a6a" }}>AGENT LOGS</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
          {agentLogs.length === 0 && (
            <div style={{ fontSize: "10px", color: "#1e3a5a", fontStyle: "italic" }}>Awaiting workflow...</div>
          )}
          {agentLogs.map((l, i) => (
            <div key={i} className={`log-line log-${l.type}`}>
              <span style={{ color: "#1e3a5a", marginRight: 4 }}>{l.ts}</span>{l.msg}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
