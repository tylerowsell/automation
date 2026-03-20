// ─── Shell Parsers ────────────────────────────────────────────────────────────

// Parse plain text or RTF shell content into a shell object
export function parseShellText(raw, filename) {
  // Strip basic RTF control words
  const text = raw.replace(/\{\\[^{}]*\}|\\[a-zA-Z]+\d*[ ]?|[{}]/g, "").trim();
  const rows = text.split("\n").filter(r => r.trim());
  const titleRow = rows.find(r => r.length > 8 && !r.match(/^[-=─]+$/));
  return {
    id: `UP-${filename.replace(/\.[^.]+$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 20)}`,
    title: titleRow?.trim() || `Shell: ${filename}`,
    type: "table",
    population: "See shell",
    datasets: [],
    shell: text,
    adamSpec: "Uploaded shell",
    source: filename,
    uploaded: true,
  };
}
