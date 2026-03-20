import { callClaude } from "../config/apiConfig.js";

// ─── Ingestion Agent ──────────────────────────────────────────────────────────
// Parses a table shell + ADaM spec into structured metadata JSON.

const SYSTEM_PROMPT = `You are a clinical programming expert. Extract structured TLF metadata from shells and ADaM specs.
Respond ONLY with a valid JSON object — no markdown, no explanation.
Fields: output_id, output_type (table/listing/figure), title, population, population_filter (R expression),
required_datasets (array), columns (array of {label,arm,armcd}), row_groups (array of {group, rows:[{label,stat,variable}]}),
key_variables (array), footnotes (array), merge_key.`;

export async function runIngestionAgent({ shell, adamDatasets, addLog }) {
  addLog("agent", `[Ingestion Agent] Starting parse of ${shell.id}...`);

  // Build dataset info string from available datasets
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

  const raw = await callClaude(
    SYSTEM_PROMPT,
    `TABLE SHELL:\n${shell.shell}\n\nADAM SPEC:\n${shell.adamSpec}\n\nAVAILABLE DATASETS:\n${dsInfo}`,
    2000
  );

  const meta = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim());
  addLog("success", `[Ingestion Agent] ${meta.row_groups?.length || 0} row groups, ${meta.columns?.length || 0} columns`);
  addLog("info", `Filter: ${meta.population_filter}`);
  return meta;
}
