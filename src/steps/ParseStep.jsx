// ─── Parse Step — parsed metadata display ────────────────────────────────────
export default function ParseStep({ parsedMeta, loading, onRunCodeGen, language }) {
  return (
    <div>
      <div style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#d0e8f8" }}>Parsed Metadata</h2>
        <span className="badge b-ok">INGESTION COMPLETE</span>
      </div>

      <div className="mg" style={{ marginBottom: "16px" }}>
        {[
          ["Output ID", parsedMeta.output_id, "#4fc3f7"],
          ["Output Type", parsedMeta.output_type],
          ["Title", parsedMeta.title, null, "1/-1"],
          ["Population", parsedMeta.population],
          ["R Filter", parsedMeta.population_filter, "#a8d8a8"],
          ["Datasets", parsedMeta.required_datasets?.join(", ")],
          ["Key Variables", parsedMeta.key_variables?.slice(0, 8).join(", ")],
        ].map(([label, val, color, span]) => (
          <div key={label} className="mi" style={span ? { gridColumn: span } : {}}>
            <div className="ml">{label}</div>
            <div className="mv" style={color ? { color } : {}}>{val}</div>
          </div>
        ))}
      </div>

      <pre className="code-pre" style={{ marginBottom: "18px" }}>{JSON.stringify(parsedMeta.row_groups, null, 2)}</pre>

      <button className="btn-primary" onClick={onRunCodeGen} disabled={loading}>
        {loading
          ? <span className="pulse">⟳ Generating {language === "python" ? "Python + R" : "R + Python"}...</span>
          : `▶ Run Code Generation Agent →`}
      </button>
    </div>
  );
}
