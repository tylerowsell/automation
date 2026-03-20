// ─── Syntax-highlighted code display with tab switcher ───────────────────────
export default function CodeViewer({ tabs, activeTab, onTabChange, children }) {
  return (
    <div>
      <div style={{ borderBottom: "1px solid #1a2d45", marginBottom: "14px", display: "flex" }}>
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? "on" : "off"}`}
            onClick={() => onTabChange(key)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {label}
            {badge && (
              <span style={{
                fontSize: "9px", padding: "1px 6px", borderRadius: "3px",
                background: badge.color === "green" ? "#0a2510" : "#1a1a1a",
                color: badge.color === "green" ? "#40d060" : "#707070",
                border: `1px solid ${badge.color === "green" ? "#1a5030" : "#2a2a2a"}`,
              }}>
                {badge.label}
              </span>
            )}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
