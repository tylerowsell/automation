// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header({
  appMode, setAppMode,
  language, setLanguage,
  loading, uploadProcessing,
  onReset, onFullReset,
  codeReady,            // true once code has been generated
  onLanguageChange,     // called when language toggled after code is generated
}) {
  function handleLangChange(lang) {
    if (lang === language) return;
    setLanguage(lang);
    if (codeReady) onLanguageChange?.();
  }

  return (
    <div style={{ background: "#060a12", borderBottom: "1px solid #1a2d45", padding: "0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0088ff", boxShadow: "0 0 8px #0088ff" }} />
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", color: "#c0d8f0" }}>
              TLF<span style={{ color: "#4fc3f7" }}>·</span>AGENTIC
            </span>
          </div>
          <span style={{ fontSize: "10px", color: "#2a4a6a", letterSpacing: "0.08em" }}>CLINICAL OUTPUT AUTOMATION</span>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Language toggle */}
          <div style={{ display: "flex", gap: "3px", background: "#060a12", border: "1px solid #1a2d45", borderRadius: "5px", padding: "3px" }}>
            {[["python", "🐍 PYTHON"], ["r", "📊 R"]].map(([lang, label]) => (
              <button
                key={lang}
                className={`btn-mode ${language === lang ? "active" : "inactive"}`}
                onClick={() => handleLangChange(lang)}
              >{label}</button>
            ))}
          </div>

          {/* Sample / Upload toggle */}
          <div style={{ display: "flex", gap: "3px", background: "#060a12", border: "1px solid #1a2d45", borderRadius: "5px", padding: "3px" }}>
            {[["sample", "SAMPLE DATA"], ["upload", "UPLOAD FILES"]].map(([m, l]) => (
              <button
                key={m}
                className={`btn-mode ${appMode === m ? "active" : "inactive"}`}
                onClick={() => { setAppMode(m); onReset(); }}
              >{l}</button>
            ))}
          </div>

          <button className="btn-ghost" onClick={onFullReset} style={{ fontSize: "10px" }}>↺ RESET</button>
        </div>
      </div>

      {(loading || uploadProcessing) && <div className="lbar" />}
    </div>
  );
}
