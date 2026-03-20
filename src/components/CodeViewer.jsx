// ─── Syntax-highlighted code display with tab switcher ───────────────────────
const BADGE_STYLES = {
  green: { background: "#0a2510", color: "#40d060", border: "1px solid #1a5030" },
  blue:  { background: "#071828", color: "#3090d0", border: "1px solid #0d3050" },
  grey:  { background: "#141414", color: "#606060", border: "1px solid #282828" },
};

export default function CodeViewer({ tabs, activeTab, onTabChange, children }) {
  return (
    <div>
      <div style={{ borderBottom: "1px solid #121e30", marginBottom: "14px", display: "flex", gap: "2px" }}>
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? "on" : "off"}`}
            onClick={() => onTabChange(key)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {label}
            {badge && (
              <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "3px", ...(BADGE_STYLES[badge.color] || BADGE_STYLES.grey) }}>
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
