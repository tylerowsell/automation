import JSZip from "jszip";
import * as XLSX from "xlsx";
import { parseCSV } from "./csvParser.js";
import { xlsxBufferToDatasets, xlsxBufferToShells } from "./xlsxParser.js";
import { parseXPT } from "./xptParser.js";
import { parseShellText } from "./shellParser.js";

// ─── Master file dispatcher ───────────────────────────────────────────────────
// Returns { datasets: {}, shells: [] }
export async function parseUploadedFile(file) {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  // ZIP — recursively parse all inner files
  if (name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    const out = { datasets: {}, shells: [] };
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const innerName = path.split("/").pop();
      const innerBuf = await entry.async("arraybuffer");
      try {
        const r = await parseUploadedFile(new File([innerBuf], innerName));
        Object.assign(out.datasets, r.datasets);
        out.shells.push(...r.shells);
      } catch (e) {
        out.shells.push({ parseError: true, source: innerName, errorMsg: e.message });
      }
    }
    return out;
  }

  // SAS7BDAT — not supported in browser
  if (name.endsWith(".sas7bdat")) {
    throw new Error(
      "SAS7BDAT cannot be parsed in the browser. Convert first:\n" +
      "R: haven::write_csv(haven::read_sas('file.sas7bdat'), 'file.csv')\n" +
      "SAS: PROC EXPORT DATA=ds OUTFILE='file.csv' DBMS=CSV; RUN;"
    );
  }

  // XPT
  if (name.endsWith(".xpt")) {
    const datasets = await parseXPT(buffer, file.name);
    return { datasets, shells: [] };
  }

  // CSV
  if (name.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer);
    const data = parseCSV(text);
    if (!data.length) throw new Error("No data rows found in CSV");
    const dsName = file.name
      .replace(/\.csv$/i, "")
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");
    return {
      datasets: { [dsName]: { label: dsName, vars: Object.keys(data[0]), data, source: file.name } },
      shells: [],
    };
  }

  // XLSX / XLS — sniff whether it's data or a shell
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const firstRowVals = (XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] || [])
      .map(h => String(h).toUpperCase());
    const dataKeywords = ["USUBJID","SUBJID","STUDYID","SITEID","PARAMCD","AEDECOD","VISITNUM"];
    const looksLikeData = firstRowVals.some(h => dataKeywords.includes(h));
    const adAMPattern = /^(ad[a-z]+|dm|ae|cm|ex|lb|vs|mh|ds|sv|tu|rs)\.(xlsx|xls)$/i.test(file.name);

    if (looksLikeData || adAMPattern) {
      return { datasets: xlsxBufferToDatasets(buffer, file.name), shells: [] };
    } else {
      return { datasets: {}, shells: xlsxBufferToShells(buffer, file.name) };
    }
  }

  // TXT / RTF — treat as shell
  if (name.endsWith(".txt") || name.endsWith(".rtf")) {
    const raw = new TextDecoder().decode(buffer);
    return { datasets: {}, shells: [parseShellText(raw, file.name)] };
  }

  throw new Error(
    `Unsupported format: ${file.name} — supported: CSV, XLSX, XLS, XPT, SAS7BDAT (convert first), TXT, RTF, ZIP`
  );
}
