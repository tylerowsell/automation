import * as XLSX from "xlsx";

// ─── ADaM Spec Parser ─────────────────────────────────────────────────────────
// Parses a clinical programmer's ADaM spec file (XLSX or CSV) into structured
// variable metadata and codelists consumed by the ingestion and analyst agents.
//
// Supported formats:
//   XLSX with "Variables" + optional "Codelists" sheets
//   CSV flat file with variable-per-row layout
//
// Output: { variables: [...], codelists: { name: [{ code, decode }] } }

// Header aliases to tolerate varied spec formats
const VAR_ALIASES = {
  dataset:      ["dataset", "domain", "ds"],
  variable:     ["variable", "var", "varname", "variable name", "var name", "name"],
  label:        ["label", "variable label", "var label", "description", "desc"],
  type:         ["type", "variable type", "var type", "data type"],
  codelist:     ["codelist", "code list", "controlled terms", "format", "values", "decode"],
  significance: ["significant digits", "sig digits", "format", "length"],
  comment:      ["comment", "notes", "usage", "derivation", "method"],
};

function normalizeHeader(h) {
  return String(h).trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

function findCol(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseVariablesSheet(data) {
  if (!data || data.length < 2) return [];

  // First row is headers
  const rawHeaders = Object.keys(data[0]).map(normalizeHeader);

  const colDataset  = findCol(rawHeaders, VAR_ALIASES.dataset);
  const colVar      = findCol(rawHeaders, VAR_ALIASES.variable);
  const colLabel    = findCol(rawHeaders, VAR_ALIASES.label);
  const colType     = findCol(rawHeaders, VAR_ALIASES.type);
  const colCodelist = findCol(rawHeaders, VAR_ALIASES.codelist);
  const colComment  = findCol(rawHeaders, VAR_ALIASES.comment);

  if (colVar === -1) return []; // Can't use without variable name column

  return data.map(row => {
    const vals = Object.values(row);
    return {
      dataset:  colDataset  !== -1 ? String(vals[colDataset] || "").trim().toUpperCase()  : "",
      variable: colVar      !== -1 ? String(vals[colVar]     || "").trim().toUpperCase()  : "",
      label:    colLabel    !== -1 ? String(vals[colLabel]   || "").trim()                : "",
      type:     colType     !== -1 ? String(vals[colType]    || "").trim()                : "",
      codelist: colCodelist !== -1 ? String(vals[colCodelist]|| "").trim()               : "",
      comment:  colComment  !== -1 ? String(vals[colComment] || "").trim()                : "",
      values:   [],  // filled in later from codelists sheet
    };
  }).filter(r => r.variable && r.variable !== "VARIABLE");
}

function parseCodelistsSheet(data) {
  if (!data || data.length < 2) return {};

  const rawHeaders = Object.keys(data[0]).map(normalizeHeader);
  const colName   = findCol(rawHeaders, ["codelist", "codelist name", "name", "list name", "id"]);
  const colCode   = findCol(rawHeaders, ["code", "coded value", "submission value", "value"]);
  const colDecode = findCol(rawHeaders, ["decode", "syspref", "nci preferred term", "decoded value", "description", "label"]);

  if (colCode === -1) return {};

  const codelists = {};
  let currentList = "";

  data.forEach(row => {
    const vals = Object.values(row);
    const listName = colName !== -1 ? String(vals[colName] || "").trim() : "";
    const code     = String(vals[colCode]   || "").trim();
    const decode   = colDecode !== -1 ? String(vals[colDecode] || "").trim() : code;

    if (listName) currentList = listName.toUpperCase();
    if (!currentList || !code) return;

    if (!codelists[currentList]) codelists[currentList] = [];
    codelists[currentList].push({ code, decode });
  });

  return codelists;
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export function parseSpecBuffer(buffer, filename) {
  const isCSV = /\.csv$/i.test(filename);
  const wb = XLSX.read(buffer, { type: "array" });

  let variables = [];
  let codelists = {};

  if (isCSV) {
    // CSV: single sheet, treat entire file as variable listing
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
    variables = parseVariablesSheet(data);
  } else {
    // XLSX: look for named sheets; fall back to first sheet for variables
    const sheetNames = wb.SheetNames.map(s => s.toLowerCase());

    const varSheetIdx = sheetNames.findIndex(s =>
      s.includes("variable") || s.includes("dataset") || s.includes("var")
    );
    const clSheetIdx = sheetNames.findIndex(s =>
      s.includes("codelist") || s.includes("code list") || s.includes("terminology") || s.includes("cl")
    );

    const varSheet = wb.Sheets[wb.SheetNames[varSheetIdx !== -1 ? varSheetIdx : 0]];
    variables = parseVariablesSheet(XLSX.utils.sheet_to_json(varSheet, { defval: "" }));

    if (clSheetIdx !== -1) {
      const clSheet = wb.Sheets[wb.SheetNames[clSheetIdx]];
      codelists = parseCodelistsSheet(XLSX.utils.sheet_to_json(clSheet, { defval: "" }));
    }
  }

  // Resolve codelist references → embed actual values into variable objects
  variables.forEach(v => {
    if (v.codelist && codelists[v.codelist.toUpperCase()]) {
      v.values = codelists[v.codelist.toUpperCase()].map(e => e.decode || e.code);
    }
  });

  return { variables, codelists, source: filename };
}

// ─── Look up a single variable (used by analyst agent) ────────────────────────
export function lookupVariable(spec, variableName) {
  if (!spec?.variables?.length) return null;
  return spec.variables.find(
    v => v.variable.toUpperCase() === variableName.toUpperCase()
  ) || null;
}

// ─── Format spec as a compact context string for agent prompts ────────────────
export function specToContextString(spec, relevantVars = []) {
  if (!spec?.variables?.length) return "No ADaM spec uploaded.";

  const vars = relevantVars.length
    ? spec.variables.filter(v => relevantVars.some(r => r.toUpperCase() === v.variable))
    : spec.variables.slice(0, 40); // cap for prompt size

  return vars.map(v => {
    const vals = v.values.length ? ` | Values: ${v.values.join(", ")}` : "";
    const codelist = v.codelist ? ` | Codelist: ${v.codelist}` : "";
    return `${v.dataset ? v.dataset + "." : ""}${v.variable} [${v.type}] — ${v.label}${codelist}${vals}`;
  }).join("\n");
}
