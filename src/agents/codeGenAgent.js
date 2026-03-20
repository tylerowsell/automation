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
- All data must be defined INLINE as Python dict literals (copy the data from the prompt exactly)
- Do NOT use file I/O (open(), to_csv()) — no file paths allowed
- Build the output as an HTML string using pandas .to_html() or manual HTML construction
- The LAST line MUST assign the final HTML to OUTPUT_HTML:
    OUTPUT_HTML = df_final.to_html(index=False, classes='tlf-table', border=0)
- Do NOT use matplotlib, seaborn, or any plotting library
- Add inline comments explaining each clinical computation step
- This code WILL be executed live in the browser via Pyodide`;

// Serialise ADaM datasets as Python dict literals for inline embedding in code
function datasetsToPythonDicts(adamDatasets, dsNames) {
  return dsNames
    .filter(ds => adamDatasets[ds])
    .map(ds => {
      const info = adamDatasets[ds];
      const rows = info.data
        .map(row => {
          const pairs = Object.entries(row)
            .map(([k, v]) => `"${k}": ${typeof v === "string" ? `"${v.replace(/"/g, '\\"')}"` : v}`)
            .join(", ");
          return `    {${pairs}}`;
        })
        .join(",\n");
      return `# ${ds} — ${info.label}\n${ds}_data = [\n${rows}\n]`;
    })
    .join("\n\n");
}

export async function runCodeGenAgent({ parsedMeta, adamDatasets, addLog }) {
  addLog("agent", "[Code Gen Agent] Generating R + Python programs...");

  const dsNames = parsedMeta?.required_datasets?.length
    ? parsedMeta.required_datasets
    : Object.keys(adamDatasets).slice(0, 3);

  // Small JSON preview for R context
  const rPreview = dsNames
    .filter(ds => adamDatasets[ds])
    .map(ds => `# ${ds} (${adamDatasets[ds].data.length} rows):\n${JSON.stringify(adamDatasets[ds].data.slice(0, 3), null, 2)}`)
    .join("\n\n");

  // Full inline data for Python (so Pyodide code is self-contained)
  const pythonData = datasetsToPythonDicts(adamDatasets, dsNames);

  const raw = await callClaude(
    SYSTEM_PROMPT,
    `METADATA:\n${JSON.stringify(parsedMeta, null, 2)}\n\nDATA PREVIEW (for R):\n${rPreview}\n\nINLINE DATA FOR PYTHON:\n${pythonData}`,
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
