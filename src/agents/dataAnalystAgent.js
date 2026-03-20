import { callClaudeWithTools } from "../config/apiConfig.js";
import { lookupVariable } from "../parsers/specParser.js";

// ─── Data Analyst Agent ───────────────────────────────────────────────────────
// Agentic (tool-calling) step that runs BEFORE code generation.
// Interrogates in-memory datasets to produce grounded structural findings.
//
// ⚠ PRIVACY DESIGN: actual data values are NEVER sent to the Anthropic API.
//   Tools execute locally in the browser against in-memory datasets, but the
//   results returned to Claude contain only structural metadata:
//     get_unique_values  → cardinality (n_unique) and type — no actual values
//     get_numeric_stats  → aggregate statistics (mean/SD/min/max) — no records
//     get_column_info    → column names and inferred types — no values
//     lookup_spec        → spec metadata (labels, codelists) — no patient data
//
// Output: a structural findings object consumed by codeGenAgent.

const SYSTEM_PROMPT = `You are a clinical data analyst preparing structural findings to guide TLF code generation.
You have access to tools that interrogate dataset structure — NOT individual data values.

PRIVACY NOTE: Tools deliberately return cardinality counts and aggregate statistics only.
Actual data values are never surfaced. Write all findings accordingly.

Your job:
1. For every variable in the table metadata, call the appropriate tool to learn:
   - Categorical variables: how many unique values (n_unique) — code will enumerate dynamically
   - Numeric variables: summary statistics (n, mean, SD, median, min, max)
   - Treatment arm: confirm it exists and how many distinct arms are present
2. Look up variable labels from the spec for any relevant variable
3. Note any structural issues (variable missing from dataset, unexpected type)

When done, output a JSON object — this structure is sent to the code generation agent:
{
  "arm_variable": "ARM",
  "arm_n_unique": 3,
  "variables": {
    "VARNAME": {
      "dataset": "ADSL",
      "type": "categorical" | "numeric",
      "n_unique": 3,
      "stats": { "n": 306, "mean": 75.1, "sd": 8.2, "median": 76, "min": 52, "max": 89 },
      "label": "...",
      "codelist": "AGEGR1",
      "note": "..."
    }
  },
  "notes": ["structural notes — no data values"]
}

CRITICAL: Output ONLY the JSON object, no other text. Do NOT include any actual data values.`;

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_unique_values",
    description: "Returns the NUMBER of unique values (cardinality) for a variable — NOT the values themselves. Use for categorical variables to confirm type and cardinality.",
    input_schema: {
      type: "object",
      properties: {
        dataset:    { type: "string", description: "Dataset name e.g. ADSL, ADAE, ADLB" },
        variable:   { type: "string", description: "Variable name e.g. ARM, SEX, AGEGR1" },
        filter_var: { type: "string", description: "Optional: variable to filter on (e.g. SAFFL)" },
        filter_val: { type: "string", description: "Optional: value to keep (e.g. Y)" },
      },
      required: ["dataset", "variable"],
    },
  },
  {
    name: "get_numeric_stats",
    description: "Get aggregate statistics (n, mean, SD, median, min, max) for a numeric variable. No individual records are returned.",
    input_schema: {
      type: "object",
      properties: {
        dataset:    { type: "string" },
        variable:   { type: "string" },
        filter_var: { type: "string" },
        filter_val: { type: "string" },
      },
      required: ["dataset", "variable"],
    },
  },
  {
    name: "get_column_info",
    description: "List column names, inferred types (categorical/numeric), and row count for a dataset. No data values returned.",
    input_schema: {
      type: "object",
      properties: {
        dataset: { type: "string", description: "Dataset name" },
      },
      required: ["dataset"],
    },
  },
  {
    name: "lookup_spec",
    description: "Look up a variable in the ADaM spec to get its label, type, and codelist name. Returns spec metadata only.",
    input_schema: {
      type: "object",
      properties: {
        variable: { type: "string", description: "Variable name to look up" },
      },
      required: ["variable"],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
// All tools execute against in-memory JS data.
// ⚠ get_unique_values deliberately withholds actual values — returns only counts.
function makeToolExecutor(adamDatasets, adamSpec) {
  return function executeToolCall(toolName, input) {
    const { dataset, variable, filter_var, filter_val } = input;

    if (toolName === "get_column_info") {
      const info = adamDatasets[dataset?.toUpperCase()];
      if (!info) return { error: `Dataset '${dataset}' not found. Available: ${Object.keys(adamDatasets).join(", ")}` };
      const columns = Object.keys(info.data[0] || {}).map(col => {
        const sample = info.data.slice(0, 10).map(r => r[col]);
        const numCount = sample.filter(v => typeof v === "number").length;
        return { name: col, type: numCount > sample.length / 2 ? "numeric" : "character" };
      });
      return { dataset: dataset.toUpperCase(), rows: info.data.length, columns };
    }

    if (toolName === "get_unique_values") {
      const info = adamDatasets[dataset?.toUpperCase()];
      if (!info) return { error: `Dataset '${dataset}' not found.` };
      let rows = info.data;
      if (filter_var && filter_val) {
        rows = rows.filter(r => String(r[filter_var]) === String(filter_val));
      }
      // ⚠ PRIVACY: count only — actual values are NOT returned to Claude
      const n_unique = new Set(rows.map(r => r[variable]).filter(v => v != null && v !== "")).size;
      return {
        dataset: dataset.toUpperCase(),
        variable,
        n_rows: rows.length,
        n_unique,
        type: "categorical",
        privacy_note: "Actual values withheld. Code must enumerate dynamically (e.g. df[var].unique()).",
      };
    }

    if (toolName === "get_numeric_stats") {
      const info = adamDatasets[dataset?.toUpperCase()];
      if (!info) return { error: `Dataset '${dataset}' not found.` };
      let rows = info.data;
      if (filter_var && filter_val) {
        rows = rows.filter(r => String(r[filter_var]) === String(filter_val));
      }
      const vals = rows.map(r => r[variable]).filter(v => typeof v === "number");
      if (!vals.length) return { dataset, variable, n: 0, note: "No numeric values found — check variable name or filter" };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length);
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return {
        dataset: dataset.toUpperCase(), variable, n: vals.length,
        mean: +mean.toFixed(2), sd: +sd.toFixed(2), median: +median.toFixed(1),
        min: sorted[0], max: sorted[sorted.length - 1],
      };
    }

    if (toolName === "lookup_spec") {
      const entry = lookupVariable(adamSpec, variable);
      if (!entry) return { variable, note: "Not found in spec — no spec uploaded or variable not listed" };
      // Return spec metadata only (labels, types, codelist names) — no patient data
      return {
        variable: entry.variable,
        dataset:  entry.dataset,
        label:    entry.label,
        type:     entry.type,
        codelist: entry.codelist,
        // Spec-defined values (from codelist definitions, not from patient data) are OK to include
        values:   entry.values,
      };
    }

    return { error: `Unknown tool: ${toolName}` };
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export async function runDataAnalystAgent({ parsedMeta, adamDatasets, adamSpec, addLog }) {
  addLog("agent", "[Data Analyst] Exploring dataset structure (privacy-safe mode)...");

  const dsNames = Object.keys(adamDatasets);

  const userPrompt = `TABLE METADATA:
${JSON.stringify(parsedMeta, null, 2)}

AVAILABLE DATASETS: ${dsNames.join(", ")} (${dsNames.map(d => `${d}: ${adamDatasets[d]?.data?.length ?? 0} rows`).join(", ")})
ADaM SPEC: ${adamSpec?.variables?.length ? `${adamSpec.variables.length} variables loaded` : "Not uploaded"}

Analyze the dataset structure for each variable in the table metadata.
For categorical variables, use get_unique_values to confirm type and cardinality.
For numeric variables, use get_numeric_stats to get summary statistics.
Remember: actual data values are withheld by the tools — your findings must not include them.`;

  let toolCallCount = 0;
  const rawOutput = await callClaudeWithTools({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    toolDefinitions: TOOLS,
    toolExecutor: makeToolExecutor(adamDatasets, adamSpec),
    onToolCall: (name, input) => {
      toolCallCount++;
      const detail = input.variable
        ? `${input.dataset || ""}.${input.variable}`
        : (input.dataset || "");
      addLog("info", `  ↳ ${name}(${detail})`);
    },
    maxTokens: 3000,
    maxIterations: 12,
  });

  addLog("success", `[Data Analyst] Done — ${toolCallCount} tool calls, no data values sent to API`);

  try {
    const cleaned = rawOutput.replace(/^```json?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    addLog("error", "[Data Analyst] Could not parse findings JSON");
    return { notes: ["Analyst output parse failed"] };
  }
}
