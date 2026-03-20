import * as XLSX from "xlsx";

// ─── XPT Parser (SheetJS has partial XPT support) ────────────────────────────
export async function parseXPT(buffer, filename) {
  try {
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
          data,
          source: filename,
        };
      }
    });
    if (Object.keys(datasets).length > 0) return datasets;
    throw new Error("No sheets found");
  } catch {
    throw new Error(
      "XPT parsing failed — try converting in R: readxpt::write_csv(haven::read_xpt('file.xpt'), 'file.csv')"
    );
  }
}
