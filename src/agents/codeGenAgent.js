import { callClaude } from "../config/apiConfig.js";

// ─── Code Generation Agent ────────────────────────────────────────────────────
// Generates BOTH R and Python programs in a single Claude API call.
// R:      executable via WebR in the browser AND downloadable for offline use
// Python: executable via Pyodide in the browser

const SYSTEM_PROMPT = `You are an expert clinical programmer generating TLF code for QC comparison.
A QC programmer will compare your output side-by-side against a production table — SHELL FIDELITY IS CRITICAL.

Return ONLY a JSON object: { "r": "<R program>", "python": "<Python program>" }

━━━ SHELL FIDELITY RULES (apply to BOTH languages) ━━━
1. Column headers: reproduce EXACTLY the labels from metadata.columns[].label
2. Row structure: reproduce EXACT row group hierarchy and indentation from metadata.row_groups
   - Group headers: bold/styled, no indentation
   - Sub-rows: indented (2-4 spaces prefix on label cell)
3. Statistical formats: match EXACTLY per metadata row_groups[].rows[].format
   - "n (%)" → "X (XX.X%)" with one decimal
   - "Mean (SD)" → "XX.X (X.X)" with one decimal
   - "n / Mean (SD)" → "N / XX.X (X.X)"
   - "Median / Min, Max" → "XX.X / XX, XX"
   - Missing/zero → show "—" (em dash), never blank or NaN
4. Include table title from metadata.title as a visible header above the table
5. Include all footnotes from metadata.footnotes below the table as small text
6. Number alignment: center-align value cells, left-align row label column

━━━ R CODE REQUIREMENTS ━━━
- Datasets are PRE-LOADED into the R environment: access them directly by name (e.g. adsl, adae, ADSL, ADAE)
- Do NOT call read.csv() — data is already available
- Use dplyr and tidyr for all data manipulation
- Use gt for table output — it produces HTML
- The LAST line MUST assign HTML output: OUTPUT_HTML <- gt::as_raw_html(tbl)
- Add tab_header(), tab_footnote() and cols_label() to the gt table for shell fidelity
- This code runs live in the browser via WebR AND can be downloaded for local use

━━━ PYTHON CODE REQUIREMENTS ━━━
- Load datasets: adsl = pd.read_csv('/datasets/ADSL.csv') — files are pre-mounted
- Use pandas, numpy, scipy.stats for all computations
- Build output as an HTML string — use manual HTML construction for maximum control over formatting
- Do NOT use .to_html() alone — build a proper <table> with <thead>/<tbody>, styled cells
- The LAST line MUST assign: OUTPUT_HTML = "<complete html table string>"
- Apply inline styles: dark background (#0a1525), monospace font, proper borders
- This code runs live in the browser via Pyodide`;

// Build a schema/preview string for each dataset (column list + 3 sample rows)
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

export async function runCodeGenAgent({ parsedMeta, adamDatasets, addLog }) {
  addLog("agent", "[Code Gen Agent] Generating R + Python programs...");

  const dsNames = parsedMeta?.required_datasets?.length
    ? parsedMeta.required_datasets
    : Object.keys(adamDatasets).slice(0, 3);

  const schemaPreview = datasetsToSchemaPreview(adamDatasets, dsNames);

  const raw = await callClaude(
    SYSTEM_PROMPT,
    `METADATA:\n${JSON.stringify(parsedMeta, null, 2)}\n\nDATASET SCHEMAS AND SAMPLE ROWS:\n${schemaPreview}`,
    7000
  );

  // Parse JSON response — strip any accidental markdown fences
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
