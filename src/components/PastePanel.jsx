import { useState } from "react";

// ─── Paste from Excel panel ───────────────────────────────────────────────────
export default function PastePanel({ onAddShell, onAddDataset }) {
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [pasteMode, setPasteMode] = useState("shell"); // "shell" | "data"
  const [pasteError, setPasteError] = useState("");

  function handlePasteShell() {
    setPasteError("");
    const text = pasteText.trim();
    if (!text) { setPasteError("Nothing to add — paste some content first."); return; }

    const lines = text.split(/\r?\n/);
    const isTabSep = lines.some(l => l.includes("\t"));
    let shellText = text;

    if (isTabSep) {
      const rows = lines.map(l => l.split("\t"));
      const colWidths = rows.reduce((widths, row) => {
        row.forEach((cell, i) => { widths[i] = Math.max(widths[i] || 0, cell.length); });
        return widths;
      }, []);
      shellText = rows.map(row =>
        row.map((cell, i) => cell.padEnd(i < row.length - 1 ? colWidths[i] + 2 : 0)).join("")
      ).join("\n");
    }

    const id = `PASTE-${(pasteName || "SHELL").replace(/\s+/g, "-").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20)}-${Date.now().toString(36).toUpperCase()}`;
    const titleRow = lines.find(l => l.trim().length > 8 && !l.match(/^[-=─\t ]+$/));

    const shell = {
      id,
      title: pasteName || titleRow?.replace(/\t/g, " ").trim() || "Pasted Shell",
      type: "table", population: "See shell", datasets: [],
      shell: shellText,
      adamSpec: "Pasted shell — review and supplement ADaM spec as needed",
      source: "pasted", uploaded: true,
    };

    onAddShell(shell, `✓ Pasted shell "${shell.title}" added (${lines.length} lines)`);
    setPasteText(""); setPasteName("");
  }

  function handlePasteDataset() {
    setPasteError("");
    const text = pasteText.trim();
    if (!text) { setPasteError("Nothing to add — paste some content first."); return; }

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { setPasteError("Need at least a header row and one data row."); return; }

    const isTabSep = lines[0].includes("\t");
    const sep = isTabSep ? "\t" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ""));
    if (headers.length < 2) { setPasteError("Could not detect columns — copy with headers from Excel (Ctrl+C / Cmd+C)."); return; }

    const data = lines.slice(1).map(line => {
      const vals = line.split(sep);
      const row = {};
      headers.forEach((h, i) => {
        const v = (vals[i] || "").trim().replace(/^"|"$/g, "");
        row[h] = v !== "" && !isNaN(v) ? Number(v) : v;
      });
      return row;
    });

    const dsName = (pasteName || "PASTED_DS").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 20);
    onAddDataset(dsName, { label: dsName, vars: headers, data, source: "pasted" },
      `✓ Pasted dataset "${dsName}" — ${data.length} rows × ${headers.length} cols`);
    setPasteText(""); setPasteName("");
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#2a4a6a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
        PASTE FROM EXCEL
        <span style={{ fontSize: "9px", color: "#1e3a5a" }}>— select cells in Excel, copy (Cmd+C), paste below</span>
      </div>
      <div className="card" style={{ padding: "16px" }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
          {[["shell", "📋 Table Shell"], ["data", "📊 Dataset"]].map(([m, l]) => (
            <button key={m}
              onClick={() => { setPasteMode(m); setPasteError(""); }}
              style={{
                padding: "5px 14px", borderRadius: "4px", fontSize: "10px", cursor: "pointer",
                fontFamily: "'IBM Plex Mono'", letterSpacing: "0.06em", transition: "all 0.15s",
                background: pasteMode === m ? "#0a2040" : "transparent",
                color: pasteMode === m ? "#4fc3f7" : "#3a6a8a",
                border: pasteMode === m ? "1px solid #0066cc" : "1px solid #1a2d45",
              }}>{l}</button>
          ))}
        </div>

        {/* Name input */}
        <div style={{ marginBottom: "8px" }}>
          <input type="text"
            placeholder={pasteMode === "shell" ? "Shell name / ID (optional, e.g. T-14.1.1)" : "Dataset name (e.g. ADSL)"}
            value={pasteName}
            onChange={e => setPasteName(e.target.value)}
            style={{ width: "100%", background: "#06080f", border: "1px solid #1a2d45", borderRadius: "4px", padding: "8px 12px", color: "#90b8d0", fontFamily: "'IBM Plex Mono'", fontSize: "11px", outline: "none" }}
          />
        </div>

        {/* Paste textarea */}
        <textarea
          value={pasteText}
          onChange={e => { setPasteText(e.target.value); setPasteError(""); }}
          placeholder={
            pasteMode === "shell"
              ? "Paste table shell content here...\n\nWorks with:\n• Plain text\n• Cells copied from Excel (tab-separated)\n• RTF/Word table content"
              : "Paste dataset rows here...\n\nHow to copy from Excel:\n1. Select cells including header row\n2. Cmd+C (Mac) or Ctrl+C (Windows)\n3. Paste here with Cmd+V / Ctrl+V\n\nColumn headers must be in the first row."
          }
          style={{
            width: "100%", height: "160px", background: "#06080f",
            border: `1px solid ${pasteText ? "#1e4a6a" : "#1a2d45"}`,
            borderRadius: "4px", padding: "10px 12px", color: "#a8c8e8",
            fontFamily: "'IBM Plex Mono'", fontSize: "11px", resize: "vertical",
            outline: "none", lineHeight: "1.6", transition: "border-color 0.2s",
          }}
        />

        {/* Character count */}
        {pasteText && (
          <div style={{ fontSize: "9px", color: "#2a4a6a", marginTop: "4px", marginBottom: "8px" }}>
            {pasteText.split("\n").length} lines · {pasteText.length} characters
            {pasteMode === "data" && pasteText.includes("\t") && (
              <span style={{ color: "#40c060", marginLeft: "10px" }}>✓ Tab-separated detected (Excel format)</span>
            )}
            {pasteMode === "data" && !pasteText.includes("\t") && pasteText.includes(",") && (
              <span style={{ color: "#c0a040", marginLeft: "10px" }}>CSV format detected</span>
            )}
          </div>
        )}

        {/* Error */}
        {pasteError && (
          <div style={{ fontSize: "11px", color: "#ef5350", marginBottom: "8px", padding: "6px 10px", background: "#1a0808", border: "1px solid #3a1a1a", borderRadius: "4px" }}>
            ✗ {pasteError}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="btn-primary"
            style={{ padding: "8px 18px", fontSize: "11px" }}
            onClick={pasteMode === "shell" ? handlePasteShell : handlePasteDataset}
            disabled={!pasteText.trim()}
          >
            {pasteMode === "shell" ? "＋ Add Shell" : "＋ Add Dataset"}
          </button>
          {pasteText && (
            <button className="btn-ghost" style={{ fontSize: "10px" }}
              onClick={() => { setPasteText(""); setPasteName(""); setPasteError(""); }}>
              Clear
            </button>
          )}
          <span style={{ fontSize: "9px", color: "#1e3a5a", marginLeft: "4px" }}>
            {pasteMode === "shell" ? "Added shells appear in the shell list below" : "Added datasets available immediately"}
          </span>
        </div>
      </div>
    </div>
  );
}
