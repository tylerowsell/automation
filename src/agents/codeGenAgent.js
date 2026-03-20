import { callClaude } from "../config/apiConfig.js";
import { specToContextString } from "../parsers/specParser.js";

// ─── Code Generation Agent ────────────────────────────────────────────────────
// Generates BOTH R and Python programs using:
//   1. Parsed shell metadata (structure, column labels, row groups, formats)
//   2. Data Analyst findings (actual unique values, stats, arm values)
//   3. ADaM spec context (variable labels, codelists)
//
// R:      executable via WebR in browser + downloadable for local use
// Python: executable via Pyodide in browser

const SYSTEM_PROMPT = `You are an expert clinical programmer. Generate production-quality TLF code.
A QC programmer will compare your output against the table shell — SHELL FIDELITY IS CRITICAL.
Return ONLY: { "r": "<R program>", "python": "<Python program>" }

━━━ DYNAMIC ENUMERATION (most important rule) ━━━
The table shell shows EXAMPLE/REPRESENTATIVE values, NOT an exhaustive list.
For row_groups rows with enumerate_dynamically=true:
  - Python: use df[variable].unique() or df[variable].value_counts() to get ALL values
  - R:      use unique() or levels() to discover all values dynamically
  - NEVER hardcode the specific values shown in the shell — they are just examples
For rows with enumerate_dynamically=false (specific pre-defined stats rows like "n / Mean (SD)"):
  - These are computed rows, not category lists — calculate and display them as fixed rows

The Data Analyst Findings below contain the ACTUAL unique values found in the data.
Use these to verify your logic, but still write code that discovers values dynamically
(the real data may differ from the sample).

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

function datasetsToSchemaPreview(adamDatasets, dsNames) {
  return dsNames
    .filter(ds => adamDatasets[ds])
    .map(ds => {
      const info = adamDatasets[ds];
      const cols = Object.keys(info.data[0] || {});
      const sample = info.data.slice(0, 3);
      return `# ${ds} (${info.data.length} rows)\n# Columns: ${cols.join(", ")}\n${JSON.stringify(sample, null, 2)}`;
    })
    .join("\n\n");
}

export async function runCodeGenAgent({ parsedMeta, adamDatasets, adamSpec, analystFindings, addLog }) {
  addLog("agent", "[Code Gen Agent] Generating R + Python programs...");

  const dsNames = parsedMeta?.required_datasets?.length
    ? parsedMeta.required_datasets
    : Object.keys(adamDatasets).slice(0, 3);

  const schemaPreview = datasetsToSchemaPreview(adamDatasets, dsNames);

  // Build spec context for relevant variables
  const relevantVars = parsedMeta?.key_variables || [];
  const specContext = specToContextString(adamSpec, relevantVars);

  // Format analyst findings as a readable section
  const analystSection = analystFindings
    ? `ANALYST FINDINGS (actual data values — use these for verification, but write dynamic code):\n${JSON.stringify(analystFindings, null, 2)}`
    : "ANALYST FINDINGS: Not available — infer from dataset schemas below.";

  const raw = await callClaude(
    SYSTEM_PROMPT,
    `METADATA:\n${JSON.stringify(parsedMeta, null, 2)}\n\n${analystSection}\n\nDATA SCHEMAS (3-row sample):\n${schemaPreview}\n\nADAM SPEC:\n${specContext}`,
    7000
  );

  const cleaned = raw.replace(/^```json?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { r: cleaned, python: "# Code generation failed — please retry.\nOUTPUT_HTML = '<p>Error</p>'" };
  }

  const rCode = (parsed.r || "").replace(/^```[r\n]*/i, "").replace(/```\s*$/i, "").trim();
  const pyCode = (parsed.python || "").replace(/^```python\n?/i, "").replace(/```\s*$/i, "").trim();

  addLog("success", `[Code Gen Agent] R: ${rCode.split("\n").length} lines | Python: ${pyCode.split("\n").length} lines`);
  return { rCode, pyCode };
}
