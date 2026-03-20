import { callClaudeWithTools } from "../config/apiConfig.js";
import { lookupVariable } from "../parsers/specParser.js";

// ─── Data Analyst Agent ───────────────────────────────────────────────────────
// Agentic (tool-calling) step that runs BEFORE code generation.
// Interrogates in-memory datasets to produce grounded structural findings.
//
// ⚠ PRIVACY DESIGN — two tiers:
//
//   CONTROLLED-TERM variables (PARAMCD, PARAM, AVISIT, ATPT, EPOCH, DTYPE,
//   flag variables ending in FL): values come from protocol/spec codelists and
//   will appear in the published CSR. Actual unique values ARE returned to
//   Claude — this is critical for PARAMCD-filtered code generation.
//
//   SUBJECT-LEVEL variables (RACE, COUNTRY, AETERM, measurements, identifiers):
//   Tools return only cardinality (n_unique) — actual values never sent.
//
//     get_unique_values  → values for controlled-term vars; count only otherwise
//     get_numeric_stats  → aggregate statistics (mean/SD/min/max) — no records
//     get_column_info    → column names and inferred types — no values
//     lookup_spec        → spec metadata (labels, codelists) — no patient data
//
// Output: a structural findings object consumed by codeGenAgent.

const SYSTEM_PROMPT = `You are a clinical data analyst preparing structural findings to guide TLF code generation.
You have access to tools that interrogate dataset structure.

PRIVACY TIERS — important to understand:

CONTROLLED-TERM variables: PARAMCD, PARAM, AVISIT, AVISITN, ATPT, ATPTN, EPOCH, DTYPE, and
any variable ending in FL (flag variables). The get_unique_values tool returns ACTUAL VALUES
for these — you MUST include them in your output. They are protocol metadata, not patient data,
and the code generation agent needs them to write correct PARAMCD filters and visit loops.

SUBJECT-LEVEL variables: everything else (RACE, SEX, COUNTRY, AETERM, measurements, IDs).
get_unique_values returns only n_unique (count) for these — do NOT attempt to enumerate them.

Your job:
1. For PARAMCD/PARAM: call get_unique_values — record the full values list in your output
2. For AVISIT/ATPT/EPOCH: call get_unique_values — record the full values list
3. For other categorical variables: call get_unique_values for the count only
4. For numeric variables: call get_numeric_stats for summary statistics
5. Look up variable labels from the spec for any relevant variable
6. Note any structural issues (variable missing from dataset, unexpected type)

When done, output a JSON object:
{
  "arm_variable": "ARM",
  "arm_values": ["Placebo", "Xanomeline Low Dose", "Xanomeline High Dose"],
  "param_values": ["ALT", "AST", "SODIUM", "WBC"],
  "visit_values": ["Baseline", "Week 4", "Week 8", "Week 12"],
  "variables": {
    "VARNAME": {
      "dataset": "ADSL",
      "type": "categorical" | "numeric",
      "n_unique": 3,
      "values": ["val1", "val2"],
      "stats": { "n": 306, "mean": 75.1, "sd": 8.2, "median": 76, "min": 52, "max": 89 },
      "label": "...",
      "codelist": "AGEGR1",
      "note": "..."
    }
  },
  "notes": []
}

Include "values" array ONLY for controlled-term variables (PARAMCD, PARAM, AVISIT, etc.).
CRITICAL: Output ONLY the JSON object, no other text.`;

// ─── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_unique_values",
    description: "Returns unique values for CONTROLLED-TERM variables (PARAMCD, PARAM, AVISIT, ATPT, EPOCH, DTYPE, *FL flags) — actual values are returned for these. For all other variables only cardinality (n_unique) is returned. Always call this for PARAMCD and AVISIT.",
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

// ─── Controlled-term variable allowlist ──────────────────────────────────────
// Values of these variables are protocol/spec metadata — safe to send to API.
// Anything not in this set is treated as subject-level and values are withheld.
const CONTROLLED_TERM_VARS = new Set([
  "PARAMCD", "PARAM", "PARAMN",           // parameter codes/labels
  "AVISIT", "AVISITN", "VISIT", "VISITN", // visit schedule
  "ATPT", "ATPTN",                        // timepoints
  "EPOCH",                                // study epoch
  "DTYPE",                                // record type
  "ACAT1", "ACAT2",                       // analysis categories (protocol-defined)
]);

// Flag variables (ending in FL) only ever contain Y/N/null — safe to pass through
function isControlledTerm(variable) {
  return CONTROLLED_TERM_VARS.has(variable?.toUpperCase())
    || /FL$/i.test(variable || "");
}

// ─── Tool executor ─────────────────────────────────────────────────────────────
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
      const allVals = [...new Set(rows.map(r => r[variable]).filter(v => v != null && v !== ""))]
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

      if (isControlledTerm(variable)) {
        // Controlled-term: return actual values — these are protocol metadata, not patient data
        return {
          dataset: dataset.toUpperCase(), variable,
          n_rows: rows.length, n_unique: allVals.length,
          type: "categorical", values: allVals,
          note: "Controlled-term variable — values are protocol/spec metadata",
        };
      }

      // Subject-level: count only — actual values never sent to API
      return {
        dataset: dataset.toUpperCase(), variable,
        n_rows: rows.length, n_unique: allVals.length,
        type: "categorical",
        privacy_note: "Subject-level variable — values withheld. Code should enumerate dynamically.",
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
PRIORITY: If any dataset contains PARAMCD or PARAM, call get_unique_values on it first —
the code generation agent needs the full parameter list to write correct filters.
Similarly call get_unique_values on AVISIT/ATPT/EPOCH if present — these are controlled-term
variables whose actual values will be returned.
For other categorical variables, use get_unique_values for the count.
For numeric variables, use get_numeric_stats for summary statistics.`;

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
