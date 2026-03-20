import { callClaude } from "../config/apiConfig.js";
import { specToContextString } from "../parsers/specParser.js";

// ─── Code Generation Agent ────────────────────────────────────────────────────
// Generates BOTH R and Python programs using:
//   1. Parsed shell metadata (structure, column labels, row groups, formats)
//   2. Data Analyst findings (cardinality, controlled-term values, stats)
//   3. ADaM spec context (variable labels, codelists)
//   4. Domain-specific prompt injection (demographics, AE, lab, listing)
//
// ⚠ PRIVACY: only variable names, types, row counts, aggregate statistics,
// and controlled-term values (PARAMCD, AVISIT, etc.) are included in payloads.

// ─── Base system prompt (all domains) ────────────────────────────────────────
const BASE_PROMPT = `You are an expert clinical programmer. Generate production-quality TLF code.
A QC programmer will compare your output against the table shell — SHELL FIDELITY IS CRITICAL.
Return ONLY: { "r": "<R program>", "python": "<Python program>" }

━━━ DYNAMIC ENUMERATION ━━━
The table shell shows EXAMPLE/REPRESENTATIVE values, NOT an exhaustive list.
For row_groups rows with enumerate_dynamically=true:
  - Python: use df[variable].unique() or df[variable].value_counts() to get ALL values
  - R:      use unique() or levels() to discover all values dynamically
  - NEVER hardcode the specific values shown in the shell — they are just examples
For rows with enumerate_dynamically=false:
  - These are computed rows — calculate and display them as fixed rows

The Analyst Findings contain controlled-term variable values (PARAMCD, AVISIT, etc.) that
ARE actual values from the data — use them directly in filters and loops.
Subject-level variable values are not included — code should enumerate those dynamically.

━━━ SHELL FIDELITY ━━━
1. Column headers: reproduce EXACTLY from metadata.columns[].label
2. Row group hierarchy: match indentation from metadata.row_groups exactly
3. Statistical formats: match per metadata row_groups[].rows[].format
   - "n (%)" → "X (XX.X%)" one decimal; missing → "—"
   - "Mean (SD)" → "XX.X (X.X)" one decimal
   - "n / Mean (SD)" → "N / XX.X (X.X)"
   - "Median / Min, Max" → "XX.X / XX, XX"
4. Table title from metadata.title; footnotes from metadata.footnotes
5. Missing/zero values → "—" (em dash), never blank or NaN

━━━ R REQUIREMENTS ━━━
- Datasets pre-loaded as R dataframes (access by name: adsl, adae, ADSL, ADAE etc.)
- Do NOT call read.csv() — data is already in the environment
- Use dplyr, tidyr for manipulation; gt for HTML output
- Last line MUST be: OUTPUT_HTML <- gt::as_raw_html(tbl)
- Use tab_header(), cols_label(), tab_footnote() on the gt object

━━━ PYTHON REQUIREMENTS ━━━
- Load datasets: df = pd.read_csv('/datasets/DSNAME.csv')
- Use pandas, numpy, scipy.stats
- Build HTML manually for full formatting control — do not rely on .to_html() alone
- Last line MUST be: OUTPUT_HTML = "<complete html string>"
- Apply dark theme inline styles consistent with the app`;

// ─── Domain-specific prompt blocks ───────────────────────────────────────────
const DOMAIN_PROMPTS = {

  demographics: `
━━━ DOMAIN: DEMOGRAPHICS / BASELINE CHARACTERISTICS ━━━
Data source: ADSL (one row per subject).
- Filter to population using population_filter (e.g. SAFFL == 'Y')
- N per arm is the denominator for all percentages — compute from filtered ADSL
- Continuous variables (AGE, TRTDUR): compute n, mean, SD, median, min, max per arm
- Categorical variables (AGEGR1, SEX, RACE): enumerate all values dynamically,
  compute n (%) per arm — never hardcode categories
- Column order: match metadata.columns exactly; last column is often "Total"
- Total column: pool all arms (all subjects in population)
- R: use gt::tab_spanner() if metadata has spanning_header`,

  ae: `
━━━ DOMAIN: ADVERSE EVENTS ━━━
Data sources: ADAE (events) merged with ADSL (arm assignment).
- Apply both filters: TRTEMFL == 'Y' AND SAFFL == 'Y' unless shell specifies otherwise
- Denominator (N): from ADSL filtered to population — NOT from ADAE
- Subject-level counts: count distinct USUBJID per SOC/PT per arm (not event counts)
- Hierarchy: AEBODSYS (SOC) as group header, AEDECOD (PT) as indented sub-rows
- Sort: SOC and PT alphabetically unless shell implies frequency sort
- Enumerate ALL SOC/PT combinations dynamically — do NOT hardcode the examples in the shell
- Summary rows at top (subjects with any TEAE, serious, related) come before the hierarchy
- R: use dplyr::distinct(USUBJID, AEBODSYS, AEDECOD) before counting
- Python: deduplicate on ['USUBJID','AEBODSYS','AEDECOD'] before groupby`,

  lab: `
━━━ DOMAIN: LABORATORY PARAMETERS ━━━
Data sources: ADLB or ADLBC merged with ADSL (arm assignment).
- The Analyst Findings contain the actual PARAMCD values — use them to drive the parameter loop
- Structure: one row-group per PARAM, sub-rows for Baseline / each visit / Change
- Filter pattern: df[df['PARAMCD'] == paramcd] for each parameter
- Apply ANL01FL == 'Y' (or relevant analysis flag) unless shell specifies otherwise
- AVISIT values from Analyst Findings — loop over visits as they appear in data
- Compute n, mean(SD) per PARAMCD × AVISIT × ARM
- Baseline row: filter ABLFL == 'Y' or AVISIT == 'Baseline'
- Change from baseline: use CHG variable if present, else compute AVAL - BASE
- Missing n → show as 0; missing stats → "—"
- R: iterate params with purrr::map or a for loop, bind_rows at end
- Python: groupby(['PARAMCD','AVISIT','ARM']) or iterate params with a for loop`,

  conmeds: `
━━━ DOMAIN: CONCOMITANT MEDICATIONS ━━━
Data sources: ADCM merged with ADSL.
- Filter: CMSTDTC within treatment window or ONTRTFL == 'Y' as appropriate
- Denominator: from ADSL filtered to population
- Hierarchy: ATC class (CMCLAS / CMDECOD class) → preferred name (CMDECOD)
- Count distinct subjects per medication per arm
- Enumerate medication classes and terms dynamically from the data`,

  listing: `
━━━ DOMAIN: LISTING ━━━
Output format: paginated patient-level listing, NOT a summary table.
- Columns defined in metadata.columns — render them in exact order
- One row per observation — do NOT aggregate or summarise
- Sort by metadata.sort_variables (default: USUBJID, then chronological variable)
- Page break by metadata.page_by variable if specified
- Date variables: display as YYYY-MM-DD; do not reformat to numeric
- Flag variables (Y/N): display verbatim
- Missing values: display as blank or "." per clinical convention — NOT "—"
- R: use gt with no grouping; set opt_row_striping(TRUE); use tab_style for header
- Python: build a simple bordered HTML table; apply alternating row shading
- Do NOT compute any statistics — listings show raw data only
- Column widths: USUBJID/dates narrow; text fields (TERM, DECOD) wide`,
};

// ─── Domain detection ─────────────────────────────────────────────────────────
// Infers the clinical domain from parsed metadata so the right prompt block is
// injected. Multiple signals are used: output_type, dataset names, variable names.
function detectDomain(parsedMeta) {
  if (!parsedMeta) return "general";

  if (parsedMeta.output_type === "listing") return "listing";

  const datasets = (parsedMeta.required_datasets || []).map(d => d.toUpperCase());
  const vars     = (parsedMeta.key_variables || []).map(v => v.toUpperCase());
  const id       = (parsedMeta.output_id || "").toUpperCase();

  // Lab: any lab dataset or PARAMCD in key vars
  if (datasets.some(d => ["ADLB","ADLBC","ADLBH","ADPC","ADPP"].includes(d))
      || vars.includes("PARAMCD") || vars.includes("PARAM")) {
    return "lab";
  }

  // AE: adverse event dataset present
  if (datasets.some(d => ["ADAE","ADCM"].includes(d))) {
    return datasets.some(d => d === "ADCM") ? "conmeds" : "ae";
  }

  // Demographics: ADSL only + no lab/AE variables
  if (datasets.every(d => d === "ADSL")
      || vars.some(v => ["AGE","AGEGR1","RACE","SEX","ETHNIC"].includes(v))) {
    return "demographics";
  }

  return "general";
}

// ─── Schema builder ───────────────────────────────────────────────────────────
function datasetsToSchemaOnly(adamDatasets, dsNames) {
  return dsNames
    .filter(ds => adamDatasets[ds])
    .map(ds => {
      const info = adamDatasets[ds];
      const firstRow = info.data[0] || {};
      const colDefs = Object.keys(firstRow).map(col => {
        const sample = info.data.slice(0, 10).map(r => r[col]);
        const numCount = sample.filter(v => typeof v === "number").length;
        return `${col}:${numCount > sample.length / 2 ? "num" : "chr"}`;
      });
      return `# ${ds}: ${info.data.length} rows\n# Columns (name:type): ${colDefs.join(", ")}`;
    })
    .join("\n\n");
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export async function runCodeGenAgent({ parsedMeta, adamDatasets, adamSpec, analystFindings, addLog }) {
  const domain = detectDomain(parsedMeta);
  addLog("agent", `[Code Gen Agent] Domain: ${domain} — generating R + Python programs...`);

  const dsNames = parsedMeta?.required_datasets?.length
    ? parsedMeta.required_datasets
    : Object.keys(adamDatasets).slice(0, 3);

  const schemaPreview = datasetsToSchemaOnly(adamDatasets, dsNames);
  const relevantVars  = parsedMeta?.key_variables || [];
  const specContext   = specToContextString(adamSpec, relevantVars);

  // Combine base prompt with domain-specific block
  const domainBlock = DOMAIN_PROMPTS[domain] || "";
  const systemPrompt = domainBlock ? `${BASE_PROMPT}\n${domainBlock}` : BASE_PROMPT;

  // Analyst findings now include controlled-term values (PARAMCD, AVISIT, etc.)
  const analystSection = analystFindings
    ? `ANALYST FINDINGS (controlled-term values included — use PARAMCD/AVISIT values directly):\n${JSON.stringify(analystFindings, null, 2)}`
    : "ANALYST FINDINGS: Not available — infer from dataset schemas below.";

  const raw = await callClaude(
    systemPrompt,
    `METADATA:\n${JSON.stringify(parsedMeta, null, 2)}\n\n${analystSection}\n\nDATA SCHEMAS (column names + types):\n${schemaPreview}\n\nADAM SPEC:\n${specContext}`,
    7000
  );

  const cleaned = raw.replace(/^```json?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { r: cleaned, python: "# Code generation failed — please retry.\nOUTPUT_HTML = '<p>Error</p>'" };
  }

  const rCode  = (parsed.r      || "").replace(/^```[r\n]*/i,     "").replace(/```\s*$/i, "").trim();
  const pyCode = (parsed.python || "").replace(/^```python\n?/i,  "").replace(/```\s*$/i, "").trim();

  addLog("success", `[Code Gen Agent] ${domain} | R: ${rCode.split("\n").length} lines | Python: ${pyCode.split("\n").length} lines`);
  return { rCode, pyCode, domain };
}
