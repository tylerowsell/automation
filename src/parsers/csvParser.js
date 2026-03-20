// ─── CSV Parser ───────────────────────────────────────────────────────────────
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote; }
      else if (line[i] === "," && !inQuote) { vals.push(cur); cur = ""; }
      else { cur += line[i]; }
    }
    vals.push(cur);
    const row = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || "").trim().replace(/^"|"$/g, "");
      row[h] = v !== "" && !isNaN(v) ? Number(v) : v;
    });
    return row;
  });
}
