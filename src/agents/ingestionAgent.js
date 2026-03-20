import { callClaude } from "../config/apiConfig.js";
import { specToContextString } from "../parsers/specParser.js";

// ─── Ingestion Agent ──────────────────────────────────────────────────────────
// Parses a table shell + ADaM spec into structured metadata JSON.
// The metadata drives the Data Analyst Agent and then Code Generation.

const SYSTEM_PROMPT = `You are a clinical programming expert parsing regulatory TLF table shells.
Extract PRECISE metadata — your output drives agentic data analysis and code generation.
Respond ONLY with a valid JSON object — no markdown, no explanation.

Fields:
- output_id: table/listing ID verbatim (e.g. "T-14.1.1")
- output_type: "table" | "listing" | "figure"
- title: full title copied verbatim
- population: population description (e.g. "Safety Analysis Set")
- population_filter: R/Python filter expression (e.g. "SAFFL == 'Y'")
- required_datasets: array of ADaM dataset names
- merge_key: primary merge key (usually "USUBJID")
- columns: array of treatment column objects
  { label, armcd }
  label = EXACT column header text (e.g. "Placebo\\n(N=xx)")
  armcd = corresponding ARMCD/ARM/TRT value
- spanning_header: spanning header above treatment columns or null
- row_groups: array of row-group objects:
  {
    group: group label (e.g. "Age (Years)"),
    indent: 0,
    variable: primary ADaM variable for this group (e.g. "AGE"),
    rows: [
      {
        label: exact row label from shell (preserve leading spaces for indentation),
        indent: 1,
        stat: "n_pct" | "mean_sd" | "median_minmax" | "n_mean_sd" | "n" | "count",
        variable: ADaM variable name,
        format: exact format pattern (e.g. "xx (xx.x%)", "xx.x (x.x)", "xx / xx.x (x.x)"),
        enumerate_dynamically: true | false
      }
    ]
  }

  IMPORTANT — enumerate_dynamically:
  Set to TRUE when:
    - The row is a section header indicating "all unique values of variable will be shown as sub-rows"
    - The shell shows representative example values (e.g. shows "White", "Black" but RACE could have more)
    - Any categorical variable where the full value set should come from the actual data
  Set to FALSE when:
    - The row represents a SPECIFIC pre-defined category that should always appear (e.g. "Male"/"Female")
    - The row is a summary row (e.g. "n / Mean (SD)") — not a category row at all
    - The value set is clinically fixed regardless of data (e.g. severity: Mild/Moderate/Severe)

- key_variables: all ADaM variables referenced
- footnotes: footnote strings copied verbatim (empty array if none)`;

export async function runIngestionAgent({ shell, adamDatasets, adamSpec, addLog }) {
  addLog("agent", `[Ingestion Agent] Parsing ${shell.id}...`);

  const dsInfo =
    shell.datasets.filter(ds => adamDatasets[ds]).map(ds => {
      const info = adamDatasets[ds];
      const vars = info.vars || Object.keys(info.data[0] || {});
      return `${ds} (${info.data.length} rows): ${vars.join(", ")}`;
    }).join("\n") ||
    Object.entries(adamDatasets).slice(0, 3).map(([k, v]) => {
      const vars = v.vars || Object.keys(v.data[0] || {});
      return `${k} (${v.data.length} rows): ${vars.join(", ")}`;
    }).join("\n");

  const specContext = specToContextString(adamSpec, []);

  const raw = await callClaude(
    SYSTEM_PROMPT,
    `TABLE SHELL:\n${shell.shell}\n\nADAM SPEC:\n${shell.adamSpec}\n\nAVAILABLE DATASETS:\n${dsInfo}\n\nUPLOADED ADAM SPEC:\n${specContext}`,
    2500
  );

  const meta = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim());
  addLog("success", `[Ingestion Agent] ${meta.row_groups?.length || 0} row groups, ${meta.columns?.length || 0} columns`);
  addLog("info", `Population filter: ${meta.population_filter}`);
  return meta;
}
