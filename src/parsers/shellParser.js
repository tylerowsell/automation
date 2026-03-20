// ─── Shell Parsers ────────────────────────────────────────────────────────────

// Detect whether a shell describes a listing vs a summary table.
// Uses filename conventions (L-xx, LST-xx) and content keywords.
function detectShellType(text, filename) {
  const name = filename.toUpperCase();
  // Filename signals: L-14.1, LST14, LISTING_...
  if (/\bL[-_]?\d|LST[-_]?\d|LISTING/i.test(name)) return "listing";
  // Content signals: first non-blank line contains LISTING keyword or L- ID
  const firstLines = text.split("\n").slice(0, 5).join(" ").toUpperCase();
  if (/\bLISTING\b|^\s*L-\d/.test(firstLines)) return "listing";
  return "table";
}

// Parse plain text or RTF shell content into a shell object.
// Sets output_type hint so ingestionAgent can branch to the right prompt.
export function parseShellText(raw, filename) {
  // Strip basic RTF control words
  const text = raw.replace(/\{\\[^{}]*\}|\\[a-zA-Z]+\d*[ ]?|[{}]/g, "").trim();
  const rows = text.split("\n").filter(r => r.trim());
  const titleRow = rows.find(r => r.length > 8 && !r.match(/^[-=─]+$/));
  const type = detectShellType(text, filename);
  return {
    id: `UP-${filename.replace(/\.[^.]+$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 20)}`,
    title: titleRow?.trim() || `Shell: ${filename}`,
    type,               // "table" | "listing"
    population: "See shell",
    datasets: [],
    shell: text,
    adamSpec: "Uploaded shell",
    source: filename,
    uploaded: true,
  };
}
