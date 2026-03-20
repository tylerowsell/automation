import { callClaude } from "../config/apiConfig.js";

// ─── Ingestion Agent ──────────────────────────────────────────────────────────
// Parses a table shell into structured metadata JSON that drives faithful code generation.

const SYSTEM_PROMPT = `You are a clinical programming expert parsing regulatory TLF table shells.
Extract PRECISE metadata — your output drives code generation that QC programmers compare against production outputs.
Respond ONLY with a valid JSON object — no markdown, no explanation.

Fields to extract:
- output_id: table/listing ID exactly as written (e.g. "T-14.1.1")
- output_type: "table" | "listing" | "figure"
- title: full title copied verbatim from the shell
- population: population description (e.g. "Safety Analysis Set")
- population_filter: R expression (e.g. "SAFFL == 'Y'")
- required_datasets: array of ADaM dataset names needed (e.g. ["ADSL", "ADAE"])
- merge_key: primary merge key (usually "USUBJID")
- columns: array of treatment arm column objects. Each: { label, armcd }
  - label: EXACT column header text from the shell (e.g. "Placebo\n(N=xx)")
  - armcd: the ARMCD/TRT value this column corresponds to
- spanning_header: any spanning header text above the treatment columns (or null)
- row_groups: array of row group objects. Each:
  {
    group: group label (e.g. "Age (Years)"),
    indent: 0,
    rows: [
      {
        label: exact row label from shell (e.g. "  n / Mean (SD)"),
        indent: 1,
        stat: stat type — one of: "n_pct", "mean_sd", "median_minmax", "n_mean_sd", "n", "count", "custom",
        variable: ADaM variable name for this row (e.g. "AGE", "AGEGR1", "AEBODSYS"),
        format: exact format pattern from shell (e.g. "xx (xx.x%)", "xx / xx.x (x.x)", "xx.x / xx, xx")
      }
    ]
  }
- key_variables: all ADaM variables referenced
- footnotes: array of footnote strings copied verbatim from the shell (empty array if none)`;

export async function runIngestionAgent({ shell, adamDatasets, addLog }) {
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

  const raw = await callClaude(
    SYSTEM_PROMPT,
    `TABLE SHELL:\n${shell.shell}\n\nADAM SPEC:\n${shell.adamSpec}\n\nAVAILABLE DATASETS:\n${dsInfo}`,
    2500
  );

  const meta = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim());
  addLog("success", `[Ingestion Agent] ${meta.row_groups?.length || 0} row groups, ${meta.columns?.length || 0} columns`);
  addLog("info", `Population filter: ${meta.population_filter}`);
  return meta;
}
