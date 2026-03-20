import * as XLSX from "xlsx";

// ─── XLSX → Datasets (each sheet = one dataset) ───────────────────────────────
export function xlsxBufferToDatasets(buffer, filename) {
  const wb = XLSX.read(buffer, { type: "array" });
  const datasets = {};
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (data.length > 0) {
      const vars = Object.keys(data[0]);
      datasets[name.toUpperCase()] = {
        label: name,
        vars,
        data: data.map(row => {
          const r = {};
          vars.forEach(v => { r[v] = row[v] !== "" && !isNaN(row[v]) ? Number(row[v]) : row[v]; });
          return r;
        }),
        source: filename,
      };
    }
  });
  return datasets;
}

// ─── XLSX → Table Shells (each sheet = one shell) ─────────────────────────────
export function xlsxBufferToShells(buffer, filename) {
  const wb = XLSX.read(buffer, { type: "array" });
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    const text = XLSX.utils.sheet_to_csv(ws);
    const rows = text.split("\n").map(r => r.replace(/,+$/, "")).filter(r => r.trim());
    const titleRow = rows.find(r => r.length > 8 && !r.match(/^[-=─]+$/));
    return {
      id: `UP-${name.replace(/\s+/g, "-").toUpperCase().slice(0, 20)}`,
      title: titleRow?.replace(/^[",\s]+|[",\s]+$/g, "") || `Shell: ${name}`,
      type: "table",
      population: "See shell",
      datasets: [],
      shell: rows.join("\n"),
      adamSpec: "Uploaded shell — review and supplement ADaM spec as needed",
      source: filename,
      uploaded: true,
    };
  });
}
