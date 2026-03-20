import { callClaudeWithTools } from "../config/apiConfig.js";
import { lookupVariable } from "../parsers/specParser.js";

// ─── Data Analyst Agent ───────────────────────────────────────────────────────
// An agentic (tool-calling) step that runs BEFORE code generation.
// Claude is given 4 tools to actively interrogate the in-memory datasets and
// ADaM spec, so the code generation agent receives grounded, data-driven context
// rather than inferring from 3 sample rows alone.
//
// Tools:
//   get_unique_values   → all unique values for a categorical variable
//   get_numeric_stats   → n / mean / SD / median / min / max
//   get_column_info     → column names + types for a dataset
//   lookup_spec         → variable metadata from the uploaded ADaM spec
//
// Output: a structured findings object consumed by codeGenAgent.

const SYSTEM_PROMPT = `You are a clinical data analyst preparing structured findings to guide TLF code generation.
You have access to tools that let you inspect the actual datasets and ADaM spec.

Your job:
1. For EVERY variable referenced in the table metadata, use tools to find:
   - Categorical variables: get ALL unique values (don't assume from the shell)
   - Numeric variables: get summary statistics
2. Verify the treatment arm variable and its actual values
3. Look up variable labels and codelists from the spec for any relevant variable
4. Identify any data quality issues (missing variables, unexpected values)

When you are done exploring, output a JSON object with this structure:
{
  "arm_variable": "ARM",
  "arm_values": ["Placebo", "Xanomeline Low Dose", "Xanomeline High Dose"],
  "variables": {
    "VARNAME": {
      "dataset": "ADSL",
      "type": "categorical" | "numeric",
      "unique_values": [...],      // for categorical
      "stats": { "n": 0, "mean": 0, "sd": 0, "median": 0, "min": 0, "max": 0 },  // for numeric
      "label": "...",
      "codelist_values": [...],
      "note": "..."
    }
  },
  "notes": ["any data-quality or analysis notes"]
}

CRITICAL: Output ONLY the JSON object, no other text.`;

// ─── Tool definitions (Anthropic schema format) ───────────────────────────────
const TOOLS = [
  {
    name: "get_unique_values",
    description: "Get all unique non-null values of a variable in a dataset. Use for categorical variables (ARM, SEX, RACE, AGEGR1, AEBODSYS, etc.)",
    input_schema: {
      type: "object",
      properties: {
        dataset: { type: "string", description: "Dataset name e.g. ADSL, ADAE, ADLB" },
        variable: { type: "string", description: "Variable name e.g. ARM, SEX, AGEGR1" },
        filter_var: { type: "string", description: "Optional: variable to filter on (e.g. SAFFL)" },
        filter_val: { type: "string", description: "Optional: value to keep (e.g. Y)" },
      },
      required: ["dataset", "variable"],
    },
  },
  {
    name: "get_numeric_stats",
    description: "Get n, mean, SD, median, min, max for a numeric variable. Use for AGE, CHG, AVAL, TRTDUR, etc.",
    input_schema: {
      type: "object",
      properties: {
        dataset: { type: "string" },
        variable: { type: "string" },
        filter_var: { type: "string" },
        filter_val: { type: "string" },
      },
      required: ["dataset", "variable"],
    },
  },
  {
    name: "get_column_info",
    description: "List all column names, infer their types (categorical/numeric), and row count for a dataset.",
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
    description: "Look up a variable in the uploaded ADaM spec to get its label, type, and codelist values.",
    input_schema: {
      type: "object",
      properties: {
        variable: { type: "string", description: "Variable name to look up" },
      },
      required: ["variable"],
    },
  },
];

// ─── Tool executor — runs against in-memory JS datasets ───────────────────────
function makeToolExecutor(adamDatasets, adamSpec) {
  return function executeToolCall(toolName, input) {
    const { dataset, variable, filter_var, filter_val } = input;

    if (toolName === "get_column_info") {
      const info = adamDatasets[dataset?.toUpperCase()];
      if (!info) return { error: `Dataset '${dataset}' not found. Available: ${Object.keys(adamDatasets).join(", ")}` };
      const sample = info.data[0] || {};
      const columns = Object.keys(sample).map(col => {
        const vals = info.data.slice(0, 20).map(r => r[col]);
        const numCount = vals.filter(v => typeof v === "number").length;
        return { name: col, type: numCount > vals.length / 2 ? "numeric" : "character" };
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
      const values = [...new Set(rows.map(r => r[variable]).filter(v => v != null && v !== ""))]
        .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      return { dataset: dataset.toUpperCase(), variable, n_rows: rows.length, unique_values: values, n_unique: values.length };
    }

    if (toolName === "get_numeric_stats") {
      const info = adamDatasets[dataset?.toUpperCase()];
      if (!info) return { error: `Dataset '${dataset}' not found.` };
      let rows = info.data;
      if (filter_var && filter_val) {
        rows = rows.filter(r => String(r[filter_var]) === String(filter_val));
      }
      const vals = rows.map(r => r[variable]).filter(v => typeof v === "number");
      if (!vals.length) return { dataset, variable, n: 0, note: "No numeric values found" };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length);
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return {
        dataset: dataset.toUpperCase(), variable, n: vals.length,
        mean: +mean.toFixed(2), sd: +sd.toFixed(2), median,
        min: sorted[0], max: sorted[sorted.length - 1],
      };
    }

    if (toolName === "lookup_spec") {
      const entry = lookupVariable(adamSpec, variable);
      if (!entry) return { variable, note: "Not found in spec — no spec uploaded or variable not listed" };
      return entry;
    }

    return { error: `Unknown tool: ${toolName}` };
  };
}

// ─── Main agent entry point ───────────────────────────────────────────────────
export async function runDataAnalystAgent({ parsedMeta, adamDatasets, adamSpec, addLog }) {
  addLog("agent", "[Data Analyst] Exploring datasets with tool use...");

  const dsNames = Object.keys(adamDatasets);
  const relevantVars = [
    ...(parsedMeta.key_variables || []),
    ...(parsedMeta.columns?.map(c => c.armcd).filter(Boolean) || []),
    "ARM", "ARMCD", "TRT01A",
  ];

  const userPrompt = `TABLE METADATA:
${JSON.stringify(parsedMeta, null, 2)}

AVAILABLE DATASETS: ${dsNames.join(", ")}
ADaM SPEC: ${adamSpec?.variables?.length ? `${adamSpec.variables.length} variables loaded` : "Not uploaded"}

Please analyze the datasets to gather the information needed for accurate code generation.
Focus on: treatment arm values, all unique values for each categorical variable in the row_groups,
and numeric stats for any continuous variables.`;

  let toolCallCount = 0;
  const rawOutput = await callClaudeWithTools({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    toolDefinitions: TOOLS,
    toolExecutor: makeToolExecutor(adamDatasets, adamSpec),
    onToolCall: (name, input) => {
      toolCallCount++;
      const detail = input.variable
        ? `${input.dataset || ""}${input.variable ? "." + input.variable : ""}`
        : input.dataset || "";
      addLog("info", `  ↳ ${name}(${detail})`);
    },
    maxTokens: 3000,
    maxIterations: 12,
  });

  addLog("success", `[Data Analyst] ${toolCallCount} tool calls completed`);

  // Parse JSON from the final output
  try {
    const cleaned = rawOutput.replace(/^```json?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    addLog("error", "[Data Analyst] Could not parse findings JSON — using raw output");
    return { raw: rawOutput, notes: ["Analyst output parse failed"] };
  }
}
