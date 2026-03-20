// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header({
  appMode, setAppMode,
  language, setLanguage,
  loading, uploadProcessing,
  onReset, onFullReset,
  codeReady,
  onLanguageChange,
}) {
  function handleLangChange(lang) {
    if (lang === language) return;
    setLanguage(lang);
    if (codeReady) onLanguageChange?.();
  }

  return (
    <div style={{ background: "#050810", borderBottom: "1px solid #121c2e" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "54px", padding: "0 24px" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" fill="#0088ff" opacity="0.9"/>
              <circle cx="10" cy="10" r="6" stroke="#0055aa" strokeWidth="1" fill="none" opacity="0.5"/>
              <circle cx="10" cy="10" r="9" stroke="#003366" strokeWidth="0.5" fill="none" opacity="0.3"/>
            </svg>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "13px", fontWeight: 600, letterSpacing: "0.14em", color: "#b8d4ee" }}>
              TLF<span style={{ color: "#2a90d0" }}>·</span>AGENTIC
            </span>
          </div>
          <span style={{ fontSize: "10px", color: "#1a3050", letterSpacing: "0.1em", fontFamily: "'IBM Plex Mono'" }}>
            CLINICAL QC AUTOMATION
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {appMode === "upload" && (
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "4px 9px", borderRadius: "4px",
              background: "#050f0a", border: "1px solid #0d2a1a",
            }}>
              <span style={{ fontSize: "11px" }}>🔒</span>
              <span style={{ fontSize: "9px", color: "#2a7040", letterSpacing: ".06em", fontFamily: "'IBM Plex Mono'" }}>
                SCHEMA ONLY
              </span>
            </div>
          )}
          {/* Language toggle */}
          <div style={{ display: "flex", gap: "2px", background: "#030608", border: "1px solid #111e30", borderRadius: "5px", padding: "3px" }}>
            {[["python", "🐍 Python"], ["r", "R"]].map(([lang, label]) => (
              <button
                key={lang}
                className={`btn-mode ${language === lang ? "active" : "inactive"}`}
                onClick={() => handleLangChange(lang)}
              >{label}</button>
            ))}
          </div>

          {/* Sample / Upload toggle */}
          <div style={{ display: "flex", gap: "2px", background: "#030608", border: "1px solid #111e30", borderRadius: "5px", padding: "3px" }}>
            {[["sample", "Sample Data"], ["upload", "Upload Files"]].map(([m, l]) => (
              <button
                key={m}
                className={`btn-mode ${appMode === m ? "active" : "inactive"}`}
                onClick={() => { setAppMode(m); onReset(); }}
              >{l}</button>
            ))}
          </div>

          <div style={{ width: "1px", height: "24px", background: "#111e30" }} />
          <button className="btn-ghost" onClick={onFullReset} style={{ fontSize: "10px", padding: "5px 12px" }}>↺ Reset</button>
        </div>
      </div>

      {/* Loading bar */}
      {(loading || uploadProcessing) && <div className="lbar" />}
    </div>
  );
}
