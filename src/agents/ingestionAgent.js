import { callClaude } from "../config/apiConfig.js";
import { specToContextString } from "../parsers/specParser.js";

// ─── Ingestion Agent ──────────────────────────────────────────────────────────
// Parses a table shell + ADaM spec into structured metadata JSON.
// Branches on output type: summary tables use TABLE_PROMPT, listings use
// LISTING_PROMPT — they have fundamentally different structures.

// ─── Table shell prompt ───────────────────────────────────────────────────────
const TABLE_PROMPT = `You are a clinical programming expert parsing regulatory TLF table shells.
Extract PRECISE metadata — your output drives agentic data analysis and code generation.
Respond ONLY with a valid JSON object — no markdown, no explanation.

Fields:
- output_id: table ID verbatim (e.g. "T-14.1.1")
- output_type: "table"
- title: full title copied verbatim
- population: population description (e.g. "Safety Analysis Set")
- population_filter: filter expression (e.g. "SAFFL == 'Y'")
- required_datasets: array of ADaM dataset names
- merge_key: primary merge key (usually "USUBJID")
- columns: array of treatment column objects { label, armcd }
  label = EXACT column header text; armcd = corresponding ARMCD/ARM/TRT value
- spanning_header: spanning header above treatment columns or null
- row_groups: array of row-group objects:
  {
    group: group label,
    indent: 0,
    variable: primary ADaM variable for this group,
    rows: [
      {
        label: exact row label (preserve leading spaces),
        indent: 1,
        stat: "n_pct" | "mean_sd" | "median_minmax" | "n_mean_sd" | "n" | "count",
        variable: ADaM variable name,
        format: exact format pattern (e.g. "xx (xx.x%)"),
        enumerate_dynamically: true | false
      }
    ]
  }

  enumerate_dynamically = true when the shell shows representative examples of a
  categorical variable whose full value set comes from the actual data.
  enumerate_dynamically = false for fixed summary rows (n/Mean/SD) or clinically
  fixed categories (Male/Female).

- key_variables: all ADaM variables referenced
- footnotes: footnote strings verbatim (empty array if none)`;

// ─── Listing shell prompt ─────────────────────────────────────────────────────
const LISTING_PROMPT = `You are a clinical programming expert parsing regulatory TLF listing shells.
A listing shows patient-level data rows — it does NOT contain summary statistics or row groups.
Extract PRECISE metadata — your output drives code generation.
Respond ONLY with a valid JSON object — no markdown, no explanation.

Fields:
- output_id: listing ID verbatim (e.g. "L-16.2.1")
- output_type: "listing"
- title: full title copied verbatim
- population: population description
- population_filter: filter expression (e.g. "SAFFL == 'Y' AND TRTEMFL == 'Y'")
- required_datasets: array of ADaM dataset names needed
- merge_key: primary merge key (usually "USUBJID")
- columns: array of column objects defining what to display:
  [
    {
      variable: "ADaM variable name",
      label: "Exact column header from shell",
      type: "character" | "date" | "numeric" | "flag",
      width: "narrow" | "medium" | "wide"
    }
  ]
  - Infer variable names from context if not explicitly stated in shell
  - type = "date" for any STDTC/ENDTC/DTC variable
  - type = "flag" for Y/N variables (AESER, AEREL, etc.)
  - width = "narrow" for IDs/flags/dates; "wide" for free-text terms
- sort_variables: array of variable names defining row order (e.g. ["USUBJID","AESTDTC"])
- page_by: variable to page-break on (usually "USUBJID"), or null
- key_variables: all ADaM variables referenced
- footnotes: footnote strings verbatim (empty array if none)

Do NOT include row_groups — listings have no summary rows.`;

export async function runIngestionAgent({ shell, adamDatasets, adamSpec, addLog }) {
  const isListing = shell.type === "listing"
    || /listing/i.test(shell.title || "")
    || /^L[-.]?\d/i.test(shell.id || "");

  addLog("agent", `[Ingestion Agent] Parsing ${shell.id} (${isListing ? "listing" : "table"})...`);

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
  const systemPrompt = isListing ? LISTING_PROMPT : TABLE_PROMPT;

  const raw = await callClaude(
    systemPrompt,
    `SHELL:\n${shell.shell}\n\nADAM SPEC (shell-level): ${shell.adamSpec}\n\nAVAILABLE DATASETS:\n${dsInfo}\n\nUPLOADED ADAM SPEC:\n${specContext}`,
    2500
  );

  const meta = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim());

  if (isListing) {
    addLog("success", `[Ingestion Agent] Listing: ${meta.columns?.length || 0} columns, sort by ${meta.sort_variables?.join(", ") || "—"}`);
  } else {
    addLog("success", `[Ingestion Agent] Table: ${meta.row_groups?.length || 0} row groups, ${meta.columns?.length || 0} columns`);
  }
  addLog("info", `Population filter: ${meta.population_filter}`);
  return meta;
}
