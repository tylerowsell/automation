import { callClaude } from "../config/apiConfig.js";

// ─── Code Generation Agent ────────────────────────────────────────────────────
// Generates BOTH R and Python programs in a single Claude API call.
// R:      for download + offline use by clinical programmers
// Python: self-contained, fully executable via Pyodide in the browser

const SYSTEM_PROMPT = `You are an expert clinical programmer. Generate BOTH R and Python programs for TLF generation.

Return ONLY a JSON object with exactly two keys:
{ "r": "<complete R program>", "python": "<complete Python program>" }

R CODE REQUIREMENTS:
- Use tidyverse, dplyr, gtsummary or Tplyr, r2rtf
- Include library() calls, data load from CSV, filter/derive, table build, RTF export
- Add inline comments explaining clinical logic
- This code is for download and offline use only — it will NOT run in the browser

PYTHON CODE REQUIREMENTS:
- Use pandas, numpy, scipy.stats for all computations
- Load datasets using pd.read_csv('/datasets/{DSNAME}.csv') — files are pre-loaded into the runtime FS
- Example: adsl = pd.read_csv('/datasets/ADSL.csv')
- Do NOT define data inline as dict literals
- Build the output as an HTML string using pandas .to_html() or manual HTML construction
- The LAST line MUST assign the final HTML to OUTPUT_HTML:
    OUTPUT_HTML = df_final.to_html(index=False, classes='tlf-table', border=0)
- Do NOT use matplotlib, seaborn, or any plotting library
- Add inline comments explaining each clinical computation step
- This code WILL be executed live in the browser via Pyodide`;

// Build a schema/preview string for each dataset (column list + 3 sample rows)
function datasetsToSchemaPreview(adamDatasets, dsNames) {
  return dsNames
    .filter(ds => adamDatasets[ds])
    .map(ds => {
      const info = adamDatasets[ds];
      const cols = Object.keys(info.data[0] || {});
      const sample = info.data.slice(0, 3);
      return `# ${ds} (${info.data.length} rows) — available at /datasets/${ds}.csv\n# Columns: ${cols.join(", ")}\n${JSON.stringify(sample, null, 2)}`;
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
    6000
  );

  // Parse JSON response — strip any accidental markdown fences
  const cleaned = raw.replace(/^```json?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: if Claude returns non-JSON, put raw in r and empty python
    parsed = { r: cleaned, python: "# Code generation failed — please retry.\nOUTPUT_HTML = '<p>Error</p>'" };
  }

  const rCode = (parsed.r || "").replace(/^```[r\n]*/i, "").replace(/```\s*$/i, "").trim();
  const pyCode = (parsed.python || "").replace(/^```python\n?/i, "").replace(/```\s*$/i, "").trim();

  addLog("success", `[Code Gen Agent] R: ${rCode.split("\n").length} lines | Python: ${pyCode.split("\n").length} lines`);
  return { rCode, pyCode };
}
