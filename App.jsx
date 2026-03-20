import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";

// ─── YOUR ANTHROPIC API KEY ───────────────────────────────────────────────────
// Get yours at: https://console.anthropic.com/api-keys
// ⚠️  For local testing only — do not commit this file with a real key
const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";
// ─────────────────────────────────────────────────────────────────────────────

// ─── CDISC Public ADaM Sample Data (CDISC Pilot Study) ───────────────────────
const SAMPLE_ADAM_DATASETS = {
  ADSL: {
    label: "Subject-Level Analysis Dataset",
    vars: ["USUBJID","STUDYID","SITEID","AGE","AGEGR1","SEX","RACE","ETHNIC","ARM","ARMCD","ACTARM","SAFFL","EFFFL","TRTDUR"],
    data: [
      {USUBJID:"01-701-1015",AGE:63,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1023",AGE:64,AGEGR1:"<65",SEX:"M",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1028",AGE:71,AGEGR1:">=65",SEX:"M",RACE:"WHITE",ARM:"Xanomeline Low Dose",ARMCD:"54mg",SAFFL:"Y",EFFFL:"N",TRTDUR:24},
      {USUBJID:"01-701-1033",AGE:74,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Xanomeline High Dose",ARMCD:"81mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1034",AGE:77,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Xanomeline Low Dose",ARMCD:"54mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:12},
      {USUBJID:"01-701-1047",AGE:85,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1097",AGE:52,AGEGR1:"<65",SEX:"M",RACE:"WHITE",ARM:"Xanomeline High Dose",ARMCD:"81mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1115",AGE:81,AGEGR1:">=65",SEX:"M",RACE:"BLACK OR AFRICAN AMERICAN",ARM:"Xanomeline Low Dose",ARMCD:"54mg",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1118",AGE:68,AGEGR1:">=65",SEX:"F",RACE:"WHITE",ARM:"Placebo",ARMCD:"PLACEBO",SAFFL:"Y",EFFFL:"Y",TRTDUR:26},
      {USUBJID:"01-701-1130",AGE:75,AGEGR1:">=65",SEX:"M",RACE:"WHITE",ARM:"Xanomeline High Dose",ARMCD:"81mg",SAFFL:"Y",EFFFL:"N",TRTDUR:2},
    ]
  },
  ADAE: {
    label: "Adverse Events Analysis Dataset",
    vars: ["USUBJID","AEDECOD","AEBODSYS","AESEV","AESER","AEREL","AESTDTC","TRTEMFL","SAFFL"],
    data: [
      {USUBJID:"01-701-1015",AEDECOD:"DIARRHOEA",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1023",AEDECOD:"HEADACHE",AEBODSYS:"NERVOUS SYSTEM DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"UNLIKELY",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1028",AEDECOD:"APPLICATION SITE PRURITUS",AEBODSYS:"GENERAL DISORDERS",AESEV:"MODERATE",AESER:"N",AEREL:"PROBABLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1033",AEDECOD:"NAUSEA",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1033",AEDECOD:"VOMITING",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MODERATE",AESER:"N",AEREL:"PROBABLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1034",AEDECOD:"AGITATION",AEBODSYS:"PSYCHIATRIC DISORDERS",AESEV:"SEVERE",AESER:"Y",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1097",AEDECOD:"APPLICATION SITE ERYTHEMA",AEBODSYS:"GENERAL DISORDERS",AESEV:"MILD",AESER:"N",AEREL:"PROBABLE",TRTEMFL:"Y",SAFFL:"Y"},
      {USUBJID:"01-701-1115",AEDECOD:"DIARRHOEA",AEBODSYS:"GASTROINTESTINAL DISORDERS",AESEV:"MODERATE",AESER:"N",AEREL:"POSSIBLE",TRTEMFL:"Y",SAFFL:"Y"},
    ]
  },
  ADLB: {
    label: "Laboratory Analysis Dataset",
    vars: ["USUBJID","PARAMCD","PARAM","AVISIT","AVAL","BASE","CHG","PCHG","ANL01FL","SAFFL"],
    data: [
      {USUBJID:"01-701-1015",PARAMCD:"ALT",PARAM:"Alanine Aminotransferase (U/L)",AVISIT:"Week 8",AVAL:22,BASE:18,CHG:4,PCHG:22.2,ANL01FL:"Y"},
      {USUBJID:"01-701-1023",PARAMCD:"ALT",PARAM:"Alanine Aminotransferase (U/L)",AVISIT:"Week 8",AVAL:31,BASE:28,CHG:3,PCHG:10.7,ANL01FL:"Y"},
      {USUBJID:"01-701-1028",PARAMCD:"SODIUM",PARAM:"Sodium (mEq/L)",AVISIT:"Week 8",AVAL:139,BASE:141,CHG:-2,PCHG:-1.4,ANL01FL:"Y"},
      {USUBJID:"01-701-1033",PARAMCD:"WBC",PARAM:"White Blood Cell Count (10^9/L)",AVISIT:"Week 8",AVAL:7.2,BASE:6.8,CHG:0.4,PCHG:5.9,ANL01FL:"Y"},
      {USUBJID:"01-701-1097",PARAMCD:"ALT",PARAM:"Alanine Aminotransferase (U/L)",AVISIT:"Week 8",AVAL:44,BASE:35,CHG:9,PCHG:25.7,ANL01FL:"Y"},
    ]
  }
};

// ─── Pre-defined TLF Table Shells ─────────────────────────────────────────────
const SAMPLE_TABLE_SHELLS = [
  {
    id: "T-14.1.1",
    title: "Summary of Demographic and Baseline Characteristics",
    type: "table",
    population: "Safety Population (SAFFL='Y')",
    datasets: ["ADSL"],
    shell: `TABLE T-14.1.1
Title: Summary of Demographic and Baseline Characteristics
Population: Safety Analysis Set (SAFFL='Y')

                          Placebo        Xanomeline      Xanomeline
                          (N=xx)         Low Dose        High Dose
                                         (N=xx)          (N=xx)
Age (Years)
  n / Mean (SD)         xx / xx.x (x.x) xx / xx.x (x.x) xx / xx.x (x.x)
  Median / Min, Max     xx.x / xx, xx   xx.x / xx, xx   xx.x / xx, xx
Age Group, n (%)
  <65                    xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
  >=65                   xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
Sex, n (%)
  Male                   xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
  Female                 xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
Race, n (%)
  White                  xx (xx.x%)      xx (xx.x%)      xx (xx.x%)
  Black or African Amer  xx (xx.x%)      xx (xx.x%)      xx (xx.x%)`,
    adamSpec: `ADSL: USUBJID, SAFFL (filter Y), ARM (columns), AGE (continuous), AGEGR1 (<65/>=65), SEX (M/F), RACE (categorical)`
  },
  {
    id: "T-14.3.1",
    title: "Summary of Treatment-Emergent Adverse Events",
    type: "table",
    population: "Safety Population (SAFFL='Y', TRTEMFL='Y')",
    datasets: ["ADSL","ADAE"],
    shell: `TABLE T-14.3.1
Title: Summary of Treatment-Emergent Adverse Events
Population: Safety Analysis Set

                              Placebo      Xanomeline    Xanomeline
                              (N=xx)       Low Dose      High Dose
Subjects with any TEAE        xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
Subjects with Serious AE      xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
Subjects with Related AE      xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
AEs by SOC and PT
GASTROINTESTINAL DISORDERS
  Diarrhoea                   xx (xx.x%)   xx (xx.x%)    xx (xx.x%)
  Nausea                      xx (xx.x%)   xx (xx.x%)    xx (xx.x%)`,
    adamSpec: `ADAE: USUBJID, TRTEMFL (filter Y), SAFFL (filter Y), AEBODSYS (SOC), AEDECOD (PT), AESER (Y/N), AEREL (causality: POSSIBLE/PROBABLE=related)`
  },
  {
    id: "T-14.4.1",
    title: "Summary of Laboratory Values — Change from Baseline",
    type: "table",
    population: "Safety Population (SAFFL='Y')",
    datasets: ["ADSL","ADLB"],
    shell: `TABLE T-14.4.1
Title: Change from Baseline in Laboratory Parameters at Week 8
Population: Safety Analysis Set

                              Placebo      Xanomeline    Xanomeline
Alanine Aminotransferase (U/L)
  Baseline n / Mean (SD)   xx / xx.x     xx / xx.x     xx / xx.x
  Week 8 n / Mean (SD)     xx / xx.x     xx / xx.x     xx / xx.x
  Change n / Mean (SD)     xx / xx.x     xx / xx.x     xx / xx.x
Sodium (mEq/L)
  Baseline n / Mean (SD)   xx / xx.x     xx / xx.x     xx / xx.x
  Change n / Mean (SD)     xx / xx.x     xx / xx.x     xx / xx.x`,
    adamSpec: `ADLB: USUBJID, PARAMCD, PARAM, AVISIT, AVAL, BASE, CHG, ANL01FL (filter Y). Merge ADSL for ARM.`
  }
];

// ─── File Parsing Utilities ───────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote; }
      else if (line[i] === "," && !inQuote) { vals.push(cur); cur = ""; }
      else { cur += line[i]; }
    }
    vals.push(cur);
    const row = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || "").trim().replace(/^"|"$/g, "");
      row[h] = v !== "" && !isNaN(v) ? Number(v) : v;
    });
    return row;
  });
}

function xlsxBufferToDatasets(buffer, filename) {
  const wb = XLSX.read(buffer, { type: "array" });
  const datasets = {};
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (data.length > 0) {
      const vars = Object.keys(data[0]);
      datasets[name.toUpperCase()] = {
        label: name,
        vars,
        data: data.map(row => {
          const r = {};
          vars.forEach(v => { r[v] = row[v] !== "" && !isNaN(row[v]) ? Number(row[v]) : row[v]; });
          return r;
        }),
        source: filename
      };
    }
  });
  return datasets;
}

function xlsxBufferToShells(buffer, filename) {
  const wb = XLSX.read(buffer, { type: "array" });
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    const text = XLSX.utils.sheet_to_csv(ws);
    const rows = text.split("\n").map(r => r.replace(/,+$/, "")).filter(r => r.trim());
    const titleRow = rows.find(r => r.length > 8 && !r.match(/^[-=─]+$/));
    return {
      id: `UP-${name.replace(/\s+/g, "-").toUpperCase().slice(0, 20)}`,
      title: titleRow?.replace(/^[",\s]+|[",\s]+$/g, "") || `Shell: ${name}`,
      type: "table",
      population: "See shell",
      datasets: [],
      shell: rows.join("\n"),
      adamSpec: "Uploaded shell — review and supplement ADaM spec as needed",
      source: filename,
      uploaded: true
    };
  });
}

async function parseXPT(buffer, filename) {
  // SheetJS has partial XPT support
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const datasets = {};
    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (data.length > 0) {
        const vars = Object.keys(data[0]);
        datasets[name.toUpperCase()] = {
          label: name, vars, data,
          source: filename
        };
      }
    });
    if (Object.keys(datasets).length > 0) return datasets;
    throw new Error("No sheets found");
  } catch {
    throw new Error("XPT parsing failed — try converting in R: readxpt::write_csv(haven::read_xpt('file.xpt'), 'file.csv')");
  }
}

async function parseUploadedFile(file) {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(buffer);
    const out = { datasets: {}, shells: [] };
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const innerName = path.split("/").pop();
      const innerBuf = await entry.async("arraybuffer");
      try {
        const r = await parseUploadedFile(new File([innerBuf], innerName));
        Object.assign(out.datasets, r.datasets);
        out.shells.push(...r.shells);
      } catch (e) {
        out.shells.push({ parseError: true, source: innerName, errorMsg: e.message });
      }
    }
    return out;
  }

  if (name.endsWith(".sas7bdat")) {
    throw new Error(
      "SAS7BDAT cannot be parsed in the browser. Convert first:\n" +
      "R: haven::write_csv(haven::read_sas('file.sas7bdat'), 'file.csv')\n" +
      "SAS: PROC EXPORT DATA=ds OUTFILE='file.csv' DBMS=CSV; RUN;"
    );
  }

  if (name.endsWith(".xpt")) {
    const datasets = await parseXPT(buffer, file.name);
    return { datasets, shells: [] };
  }

  if (name.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer);
    const data = parseCSV(text);
    if (!data.length) throw new Error("No data rows found in CSV");
    const dsName = file.name.replace(/\.csv$/i, "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    return {
      datasets: { [dsName]: { label: dsName, vars: Object.keys(data[0]), data, source: file.name } },
      shells: []
    };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const firstRowVals = (XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0] || [])
      .map(h => String(h).toUpperCase());
    // If first row contains CDISC dataset identifiers → treat as data
    const dataKeywords = ["USUBJID","SUBJID","STUDYID","SITEID","PARAMCD","AEDECOD","VISITNUM"];
    const looksLikeData = firstRowVals.some(h => dataKeywords.includes(h));
    // Also treat as data if the filename matches an ADaM dataset pattern
    const adAMPattern = /^(ad[a-z]+|dm|ae|cm|ex|lb|vs|mh|ds|sv|tu|rs)\.(xlsx|xls)$/i.test(file.name);

    if (looksLikeData || adAMPattern) {
      return { datasets: xlsxBufferToDatasets(buffer, file.name), shells: [] };
    } else {
      return { datasets: {}, shells: xlsxBufferToShells(buffer, file.name) };
    }
  }

  if (name.endsWith(".txt") || name.endsWith(".rtf")) {
    const raw = new TextDecoder().decode(buffer);
    // Strip basic RTF control words
    const text = raw.replace(/\{\\[^{}]*\}|\\[a-zA-Z]+\d*[ ]?|[{}]/g, "").trim();
    const rows = text.split("\n").filter(r => r.trim());
    const titleRow = rows.find(r => r.length > 8 && !r.match(/^[-=─]+$/));
    return {
      datasets: {},
      shells: [{
        id: `UP-${file.name.replace(/\.[^.]+$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 20)}`,
        title: titleRow?.trim() || `Shell: ${file.name}`,
        type: "table", population: "See shell", datasets: [],
        shell: text, adamSpec: "Uploaded shell", source: file.name, uploaded: true
      }]
    };
  }

  throw new Error(`Unsupported format: ${file.name} — supported: CSV, XLSX, XLS, XPT, SAS7BDAT (convert first), TXT, RTF, ZIP`);
}

// ─── Claude API helper ────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt, maxTokens = 4000) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

// ─── Simulated R execution ────────────────────────────────────────────────────
function simulateRExecution(attempt) {
  if (attempt === 0 && Math.random() > 0.3) {
    const errors = [
      "Error in tbl_summary(): Column 'ARM' not found. Did you filter SAFFL='Y'?",
      "Error: object 'adsl_safe' not found. Did you mean: adsl?",
      "Error in dplyr::mutate(): AGEGR1 must be a factor, not a character.",
    ];
    return { success: false, error: errors[Math.floor(Math.random() * errors.length)] };
  }
  return { success: true, error: null };
}

// ─── DropZone component ───────────────────────────────────────────────────────
function DropZone({ onFiles, accept, label, sublabel, icon }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    onFiles(Array.from(e.dataTransfer.files));
  }, [onFiles]);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? "#0088ff" : "#1e3a5f"}`,
        borderRadius: "6px", padding: "28px 20px", textAlign: "center", cursor: "pointer",
        background: dragging ? "#0a1a30" : "#06080f", transition: "all 0.2s",
        boxShadow: dragging ? "0 0 20px #0066cc30" : "none"
      }}
    >
      <input ref={inputRef} type="file" multiple accept={accept} style={{ display: "none" }}
        onChange={e => onFiles(Array.from(e.target.files))} />
      <div style={{ fontSize: "26px", marginBottom: "8px" }}>{icon}</div>
      <div style={{ fontSize: "12px", color: dragging ? "#4fc3f7" : "#5090b8", fontFamily: "'IBM Plex Mono'", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "10px", color: "#2a4a6a" }}>{sublabel}</div>
    </div>
  );
}

// ─── Data Preview Table ───────────────────────────────────────────────────────
function DataPreview({ dataset }) {
  const cols = dataset.vars || Object.keys(dataset.data[0] || {});
  const rows = dataset.data.slice(0, 5);
  const visibleCols = cols.slice(0, 8);
  return (
    <div style={{ overflowX: "auto", maxHeight: "180px", overflowY: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "10px", fontFamily: "'IBM Plex Mono'", width: "100%" }}>
        <thead>
          <tr>{visibleCols.map(c => (
            <th key={c} style={{ padding: "4px 10px", background: "#0a1525", color: "#4fc3f7", borderBottom: "1px solid #1e3a5f", whiteSpace: "nowrap", textAlign: "left" }}>{c}</th>
          ))}{cols.length > 8 && <th style={{ padding: "4px 10px", background: "#0a1525", color: "#2a4a6a" }}>+{cols.length - 8} more</th>}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#06080f" : "#080b14" }}>
              {visibleCols.map(c => (
                <td key={c} style={{ padding: "3px 10px", color: "#7090a8", borderBottom: "1px solid #0d1525", whiteSpace: "nowrap", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {String(row[c] ?? "")}
                </td>
              ))}
              {cols.length > 8 && <td style={{ padding: "3px 10px", color: "#2a4a6a" }}>...</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function TLFApp() {
  const [appMode, setAppMode] = useState("sample"); // "sample" | "upload"
  const [uploadedDatasets, setUploadedDatasets] = useState({});
  const [uploadedShells, setUploadedShells] = useState([]);
  const [uploadLog, setUploadLog] = useState([]);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [previewDs, setPreviewDs] = useState(null);

  // ── Paste shell state ──
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [pasteMode, setPasteMode] = useState("shell"); // "shell" | "data"
  const [pasteError, setPasteError] = useState("");

  const [step, setStep] = useState("select");
  const [selectedShell, setSelectedShell] = useState(null);
  const [parsedMeta, setParsedMeta] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [qcAttempts, setQcAttempts] = useState([]);
  const [finalCode, setFinalCode] = useState("");
  const [outputTable, setOutputTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [agentLogs, setAgentLogs] = useState([]);
  const [codeTab, setCodeTab] = useState("generated");
  const logsEndRef = useRef(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [agentLogs]);

  const ADAM_DATASETS = (appMode === "upload" && Object.keys(uploadedDatasets).length > 0)
    ? uploadedDatasets : SAMPLE_ADAM_DATASETS;
  const TABLE_SHELLS = (appMode === "upload" && uploadedShells.length > 0)
    ? [...uploadedShells, ...SAMPLE_TABLE_SHELLS] : SAMPLE_TABLE_SHELLS;

  function addLog(type, msg) {
    setAgentLogs(prev => [...prev, { type, msg, ts: new Date().toISOString().slice(11, 19) }]);
  }

  async function handleDatasetFiles(files) {
    setUploadProcessing(true);
    const newDatasets = { ...uploadedDatasets };
    const newLog = [];
    for (const file of files) {
      try {
        const result = await parseUploadedFile(file);
        Object.assign(newDatasets, result.datasets);
        const dsNames = Object.keys(result.datasets);
        if (dsNames.length > 0)
          newLog.push({ ok: true, msg: `✓ ${file.name} → ${dsNames.join(", ")} (${dsNames.map(n => result.datasets[n].data.length + "r").join(", ")})` });
        if (result.shells.length > 0) {
          setUploadedShells(prev => [...prev, ...result.shells.filter(s => !s.parseError)]);
          newLog.push({ ok: true, msg: `  + ${result.shells.filter(s=>!s.parseError).length} shell(s) found inside ZIP` });
        }
        result.shells.filter(s => s.parseError).forEach(s =>
          newLog.push({ ok: false, msg: `  ✗ ${s.source}: ${s.errorMsg}` })
        );
      } catch (e) {
        newLog.push({ ok: false, msg: `✗ ${file.name}: ${e.message}` });
      }
    }
    setUploadedDatasets(newDatasets);
    setUploadLog(prev => [...prev, ...newLog]);
    setUploadProcessing(false);
  }

  async function handleShellFiles(files) {
    setUploadProcessing(true);
    const newLog = [];
    for (const file of files) {
      try {
        const result = await parseUploadedFile(file);
        if (result.shells.length > 0) {
          setUploadedShells(prev => [...prev, ...result.shells]);
          newLog.push({ ok: true, msg: `✓ ${file.name} → ${result.shells.length} shell(s)` });
        }
        if (Object.keys(result.datasets).length > 0) {
          setUploadedDatasets(prev => ({ ...prev, ...result.datasets }));
          newLog.push({ ok: true, msg: `ℹ ${file.name} looks like data — added to datasets` });
        }
      } catch (e) {
        newLog.push({ ok: false, msg: `✗ ${file.name}: ${e.message}` });
      }
    }
    setUploadLog(prev => [...prev, ...newLog]);
    setUploadProcessing(false);
  }

  // ── Handle pasted shell text (plain text or tab-separated from Excel) ──
  function handlePasteShell() {
    setPasteError("");
    const text = pasteText.trim();
    if (!text) { setPasteError("Nothing to add — paste some content first."); return; }

    const lines = text.split(/\r?\n/);
    const isTabSep = lines.some(l => l.includes("\t"));
    let shellText = text;

    if (isTabSep) {
      // Convert tab-separated Excel paste → aligned plain text
      const rows = lines.map(l => l.split("\t"));
      const colWidths = rows.reduce((widths, row) => {
        row.forEach((cell, i) => { widths[i] = Math.max(widths[i] || 0, cell.length); });
        return widths;
      }, []);
      shellText = rows.map(row =>
        row.map((cell, i) => cell.padEnd(i < row.length - 1 ? colWidths[i] + 2 : 0)).join("")
      ).join("\n");
    }

    const id = `PASTE-${(pasteName || "SHELL").replace(/\s+/g, "-").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20)}-${Date.now().toString(36).toUpperCase()}`;
    const titleRow = lines.find(l => l.trim().length > 8 && !l.match(/^[-=─\t ]+$/));

    const shell = {
      id,
      title: pasteName || titleRow?.replace(/\t/g, " ").trim() || "Pasted Shell",
      type: "table", population: "See shell", datasets: [],
      shell: shellText,
      adamSpec: "Pasted shell — review and supplement ADaM spec as needed",
      source: "pasted", uploaded: true
    };

    setUploadedShells(prev => [shell, ...prev]);
    setUploadLog(prev => [{ ok: true, msg: `✓ Pasted shell "${shell.title}" added (${lines.length} lines)` }, ...prev]);
    setPasteText(""); setPasteName("");
  }

  // ── Handle pasted dataset (tab-separated from Excel) ──
  function handlePasteDataset() {
    setPasteError("");
    const text = pasteText.trim();
    if (!text) { setPasteError("Nothing to add — paste some content first."); return; }

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { setPasteError("Need at least a header row and one data row."); return; }

    const isTabSep = lines[0].includes("\t");
    const sep = isTabSep ? "\t" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ""));
    if (headers.length < 2) { setPasteError("Could not detect columns — copy with headers from Excel (Ctrl+C / Cmd+C)."); return; }

    const data = lines.slice(1).map(line => {
      const vals = line.split(sep);
      const row = {};
      headers.forEach((h, i) => {
        const v = (vals[i] || "").trim().replace(/^"|"$/g, "");
        row[h] = v !== "" && !isNaN(v) ? Number(v) : v;
      });
      return row;
    });

    const dsName = (pasteName || "PASTED_DS").toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 20);
    setUploadedDatasets(prev => ({ ...prev, [dsName]: { label: dsName, vars: headers, data, source: "pasted" } }));
    setUploadLog(prev => [{ ok: true, msg: `✓ Pasted dataset "${dsName}" — ${data.length} rows × ${headers.length} cols` }, ...prev]);
    setPasteText(""); setPasteName("");
  }

  // ── Workflow steps ──
  async function handleParse() {
    setLoading(true);
    setLoadingMsg("Ingestion Agent parsing table shell and ADaM spec...");
    addLog("agent", `[Ingestion Agent] Starting parse of ${selectedShell.id}...`);

    const dsInfo = selectedShell.datasets.filter(ds => ADAM_DATASETS[ds]).map(ds => {
      const info = ADAM_DATASETS[ds];
      const vars = info.vars || Object.keys(info.data[0] || {});
      return `${ds} (${info.data.length} rows): ${vars.join(", ")}`;
    }).join("\n") || Object.entries(ADAM_DATASETS).slice(0, 3).map(([k, v]) => {
      const vars = v.vars || Object.keys(v.data[0] || {});
      return `${k} (${v.data.length} rows): ${vars.join(", ")}`;
    }).join("\n");

    try {
      const raw = await callClaude(
        `You are a clinical programming expert. Extract structured TLF metadata from shells and ADaM specs.
Respond ONLY with a valid JSON object — no markdown, no explanation.
Fields: output_id, output_type (table/listing/figure), title, population, population_filter (R expression),
required_datasets (array), columns (array of {label,arm,armcd}), row_groups (array of {group, rows:[{label,stat,variable}]}),
key_variables (array), footnotes (array), merge_key.`,
        `TABLE SHELL:\n${selectedShell.shell}\n\nADAM SPEC:\n${selectedShell.adamSpec}\n\nAVAILABLE DATASETS:\n${dsInfo}`,
        2000
      );
      const meta = JSON.parse(raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim());
      setParsedMeta(meta);
      addLog("success", `[Ingestion Agent] ${meta.row_groups?.length || 0} row groups, ${meta.columns?.length || 0} columns`);
      addLog("info", `Filter: ${meta.population_filter}`);
      setStep("parse");
    } catch (e) { addLog("error", `Parse failed: ${e.message}`); }
    setLoading(false);
  }

  async function handleGenerate() {
    setLoading(true);
    setLoadingMsg("Code Generation Agent synthesizing R program...");
    addLog("agent", "[Code Gen Agent] Generating R program...");

    const dsNames = parsedMeta?.required_datasets?.length
      ? parsedMeta.required_datasets : Object.keys(ADAM_DATASETS).slice(0, 3);
    const preview = dsNames.filter(ds => ADAM_DATASETS[ds]).map(ds =>
      `# ${ds} (${ADAM_DATASETS[ds].data.length} rows):\n${JSON.stringify(ADAM_DATASETS[ds].data.slice(0, 3), null, 2)}`
    ).join("\n\n");

    try {
      const code = await callClaude(
        `You are an expert clinical R programmer. Generate production R code for TLF generation using tidyverse/dplyr/gtsummary.
Include: library calls, data load, filter/derive, table build, RTF export.
Return ONLY R code — no markdown fences, no explanation.`,
        `METADATA:\n${JSON.stringify(parsedMeta, null, 2)}\n\nDATA PREVIEW:\n${preview}`,
        4000
      );
      const clean = code.replace(/^```[r\n]*/i, "").replace(/```\s*$/i, "").trim();
      setGeneratedCode(clean); setFinalCode(clean);
      addLog("success", `[Code Gen Agent] ${clean.split("\n").length} lines generated`);
      setStep("generate");
    } catch (e) { addLog("error", `Code generation failed: ${e.message}`); }
    setLoading(false);
  }

  async function handleExecute() {
    setLoading(true); setQcAttempts([]); setStep("execute");
    let currentCode = finalCode, attempt = 0;
    const attempts = [];
    addLog("agent", "[QC Agent] Starting execution loop...");

    while (attempt < 3) {
      setLoadingMsg(`QC Agent — Attempt ${attempt + 1}/3...`);
      addLog("info", `Attempt ${attempt + 1}: Running Rscript...`);
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
      const result = simulateRExecution(attempt);

      if (result.success) {
        addLog("success", `[QC Agent] Succeeded on attempt ${attempt + 1}`);
        attempts.push({ attempt: attempt + 1, success: true });
        setQcAttempts([...attempts]);
        setFinalCode(currentCode);
        setOutputTable(buildOutputTable(selectedShell, parsedMeta));
        setStep("output"); setLoading(false); return;
      }

      addLog("error", `Attempt ${attempt + 1}: ${result.error}`);
      attempts.push({ attempt: attempt + 1, success: false, error: result.error });
      setQcAttempts([...attempts]);
      addLog("agent", "[QC Agent] Requesting correction...");
      setLoadingMsg("QC Agent — Correcting...");
      try {
        const fixed = await callClaude(
          "Debug and fix this R clinical TLF code. Return ONLY corrected R code.",
          `ERROR:\n${result.error}\n\nCODE:\n${currentCode}\n\nMETADATA:\n${JSON.stringify(parsedMeta, null, 2)}`,
          4000
        );
        currentCode = fixed.replace(/^```[r\n]*/i, "").replace(/```\s*$/i, "").trim();
        setFinalCode(currentCode);
        addLog("success", "[QC Agent] Correction applied");
      } catch (e) { addLog("error", `Correction failed: ${e.message}`); break; }
      attempt++;
    }
    addLog("error", "[QC Agent] Max attempts — flagging for manual review.");
    setLoading(false);
  }

  function buildOutputTable(shell, meta) {
    const allData = Object.values(ADAM_DATASETS)[0]?.data || [];
    const safe = allData.filter(r => !r.SAFFL || r.SAFFL === "Y");
    const armKey = ["ARM","TRT01A","ARMCD","TRT"].find(k => safe.some(r => r[k])) || "ARM";
    const arms = [...new Set(safe.map(r => r[armKey]).filter(Boolean))].slice(0, 4);

    const headers = ["", ...arms.map(a => `${a}\n(N=${safe.filter(r => r[armKey] === a).length})`)];

    const pct = (n, tot) => `${n} (${tot > 0 ? (n / tot * 100).toFixed(1) : "0.0"}%)`;
    const meanSd = vals => {
      if (!vals.length) return "—";
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const s = Math.sqrt(vals.reduce((sum, x) => sum + (x - m) ** 2, 0) / vals.length);
      return `${m.toFixed(1)} (${s.toFixed(1)})`;
    };

    const rows = [];
    const allVars = meta?.key_variables || (safe.length ? Object.keys(safe[0]) : []);
    const numVars = allVars.filter(v => safe.some(r => typeof r[v] === "number") && !["TRTDUR","VISITNUM"].includes(v)).slice(0, 2);
    const catVars = allVars.filter(v => {
      const vals = safe.map(r => r[v]).filter(x => typeof x === "string" && x && x.length < 60);
      const uniq = [...new Set(vals)];
      return vals.length > 0 && uniq.length >= 2 && uniq.length <= 20 && !["USUBJID","ARM","ARMCD","TRT01A","STUDYID","SITEID"].includes(v);
    }).slice(0, 4);

    numVars.forEach(v => {
      rows.push({ label: v, isHeader: true });
      rows.push({ label: "  Mean (SD)", vals: arms.map(a => meanSd(safe.filter(r => r[armKey] === a).map(r => r[v]).filter(x => typeof x === "number"))) });
      rows.push({ label: "  Min, Max", vals: arms.map(a => { const vals = safe.filter(r => r[armKey] === a).map(r => r[v]).filter(x => typeof x === "number"); return vals.length ? `${Math.min(...vals)}, ${Math.max(...vals)}` : "—"; }) });
    });
    catVars.forEach(v => {
      const levels = [...new Set(safe.map(r => r[v]).filter(Boolean))].slice(0, 8);
      rows.push({ label: v, isHeader: true });
      levels.forEach(lv => {
        rows.push({ label: `  ${lv}`, vals: arms.map(a => { const grp = safe.filter(r => r[armKey] === a); return pct(grp.filter(r => r[v] === lv).length, grp.length); }) });
      });
    });

    if (!rows.length) rows.push({ label: "  (No columns matched for preview)", vals: arms.map(() => "—") });

    return {
      title: shell.title, id: shell.id, headers, rows,
      footnotes: meta?.footnotes?.length ? meta.footnotes : ["Generated from uploaded data."]
    };
  }

  function resetWorkflow() {
    setStep("select"); setSelectedShell(null); setParsedMeta(null);
    setGeneratedCode(""); setFinalCode(""); setQcAttempts([]);
    setOutputTable(null); setAgentLogs([]); setCodeTab("generated");
  }
  function fullReset() { resetWorkflow(); setUploadedDatasets({}); setUploadedShells([]); setUploadLog([]); setAppMode("sample"); }

  const STEPS = ["select","parse","generate","execute","output"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", fontFamily:"'IBM Plex Mono','Courier New',monospace", color:"#c8d8e8", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:#0d1321}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
        .btn-primary{background:linear-gradient(135deg,#0066cc,#0044aa);color:#e0f0ff;border:1px solid #0088ff40;padding:10px 22px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;cursor:pointer;letter-spacing:.05em;text-transform:uppercase;transition:all .2s}
        .btn-primary:hover{background:linear-gradient(135deg,#0077ee,#0055bb);box-shadow:0 0 16px #0066cc60}
        .btn-primary:disabled{opacity:.4;cursor:not-allowed}
        .btn-ghost{background:transparent;color:#7a9ab8;border:1px solid #1e3a5f;padding:8px 18px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s}
        .btn-ghost:hover{border-color:#3a6a9f;color:#a0c0d8}
        .btn-mode{background:transparent;border:none;padding:7px 14px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:.08em;transition:all .2s}
        .btn-mode.active{background:#0a2040;color:#4fc3f7;border:1px solid #0066cc}
        .btn-mode.inactive{color:#3a6a8a;border:1px solid transparent}
        .card{background:#0d1321;border:1px solid #1a2d45;border-radius:6px}
        .shell-card{background:#0d1321;border:1px solid #1a2d45;border-radius:6px;padding:14px 16px;cursor:pointer;transition:all .2s}
        .shell-card:hover{border-color:#0066cc;background:#0f1828}
        .shell-card.selected{border-color:#0088ff;background:#0a1a30;box-shadow:0 0 20px #0066cc20}
        .shell-card.up{border-color:#1a4a2a}.shell-card.up:hover{border-color:#00cc66}.shell-card.up.selected{border-color:#00ff88}
        .log-line{font-size:11px;padding:2px 0;font-family:'IBM Plex Mono',monospace;line-height:1.6}
        .log-agent{color:#4fc3f7}.log-success{color:#66bb6a}.log-error{color:#ef5350}.log-info{color:#90a4ae}
        .step-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600}
        .step-active{background:#0066cc;color:white;box-shadow:0 0 12px #0066cc80}
        .step-done{background:#1a3a1a;color:#66bb6a;border:1px solid #2a5a2a}
        .step-pending{background:#0d1321;color:#3a5a7a;border:1px solid #1a2d45}
        .code-pre{background:#06080f;border:1px solid #1a2d45;border-radius:4px;padding:16px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#a8c8e8;overflow:auto;white-space:pre;line-height:1.7;max-height:440px}
        .tlf-table{width:100%;border-collapse:collapse;font-size:12px}
        .tlf-table th{background:#0a1525;color:#7ab0d0;font-weight:500;padding:8px 14px;text-align:center;border-bottom:2px solid #1e3a5f;white-space:pre-line;font-family:'IBM Plex Mono',monospace;font-size:11px}
        .tlf-table th:first-child{text-align:left}
        .tlf-table td{padding:6px 14px;border-bottom:1px solid #111d2e;color:#b0c8d8;font-family:'IBM Plex Mono',monospace;font-size:11.5px}
        .tlf-table td.val{text-align:center}
        .tlf-table tr.hdr td{color:#5090b8;font-weight:600;padding-top:12px}
        .tlf-table tr:hover td{background:#0a1525}
        .pulse{animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:500;letter-spacing:.05em}
        .b-tbl{background:#0a2040;color:#4090c0;border:1px solid #1a4060}
        .b-ok{background:#0a2010;color:#40c060;border:1px solid #1a4030}
        .b-up{background:#0a2a1a;color:#40d090;border:1px solid #1a5a3a}
        .b-smp{background:#1a1a0a;color:#c0a040;border:1px solid #3a3a1a}
        .tab-btn{padding:7px 16px;font-size:11px;cursor:pointer;background:transparent;border:none;font-family:'IBM Plex Mono',monospace;letter-spacing:.05em;transition:all .15s}
        .tab-btn.on{color:#4fc3f7;border-bottom:2px solid #4fc3f7}
        .tab-btn.off{color:#3a5a7a;border-bottom:2px solid transparent}
        .tab-btn:hover{color:#7ab8d8}
        .mg{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .mi{background:#06080f;border:1px solid #1a2d45;border-radius:4px;padding:12px}
        .ml{font-size:9px;letter-spacing:.1em;color:#3a6a8a;text-transform:uppercase;margin-bottom:4px}
        .mv{font-size:12px;color:#90c0d8}
        .arow{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:4px;margin-bottom:6px;font-size:11px}
        .aok{background:#0a1a0a;border:1px solid #1a3a1a}
        .afail{background:#1a0a0a;border:1px solid #3a1a1a}
        .lbar{height:2px;background:linear-gradient(90deg,#0066cc,#00aaff,#0066cc);background-size:200% 100%;animation:slide 1.5s linear infinite;border-radius:1px}
        @keyframes slide{0%{background-position:0%}100%{background-position:200%}}
        .ds-chip{display:inline-flex;align-items:center;gap:6px;background:#0a1828;border:1px solid #1a3a5a;border-radius:4px;padding:5px 10px;font-size:11px;font-family:'IBM Plex Mono',monospace}
        .ds-rm{background:transparent;border:none;color:#ef5350;cursor:pointer;font-size:14px;line-height:1;padding:0}
        .ds-rm:hover{color:#ff6666}
        .ulok{font-size:11px;color:#66bb6a;font-family:'IBM Plex Mono';padding:2px 0}
        .ulerr{font-size:11px;color:#ef5350;font-family:'IBM Plex Mono';padding:2px 0;white-space:pre-wrap}
        textarea:focus{border-color:#0066cc !important;box-shadow:0 0 0 2px #0066cc20}
        input:focus{border-color:#0066cc !important;outline:none}
        input::placeholder{color:#1e3a5a}
        textarea::placeholder{color:#1e3a5a;line-height:1.8}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"#060a12", borderBottom:"1px solid #1a2d45", padding:"0 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:"56px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#0088ff", boxShadow:"0 0 8px #0088ff" }} />
              <span style={{ fontFamily:"'IBM Plex Mono'", fontSize:"13px", fontWeight:600, letterSpacing:"0.12em", color:"#c0d8f0" }}>
                TLF<span style={{ color:"#4fc3f7" }}>·</span>AGENTIC
              </span>
            </div>
            <span style={{ fontSize:"10px", color:"#2a4a6a", letterSpacing:"0.08em" }}>CLINICAL OUTPUT AUTOMATION</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ display:"flex", gap:"3px", background:"#060a12", border:"1px solid #1a2d45", borderRadius:"5px", padding:"3px" }}>
              {[["sample","SAMPLE DATA"],["upload","UPLOAD FILES"]].map(([m, l]) => (
                <button key={m} className={`btn-mode ${appMode === m ? "active" : "inactive"}`}
                  onClick={() => { setAppMode(m); resetWorkflow(); }}>{l}</button>
              ))}
            </div>
            <button className="btn-ghost" onClick={fullReset} style={{ fontSize:"10px" }}>↺ RESET</button>
          </div>
        </div>
        {(loading || uploadProcessing) && <div className="lbar" />}
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 57px)" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:"240px", flexShrink:0, borderRight:"1px solid #1a2d45", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"18px 16px", borderBottom:"1px solid #1a2d45" }}>
            <div style={{ fontSize:"9px", letterSpacing:"0.12em", color:"#2a4a6a", marginBottom:"12px" }}>WORKFLOW</div>
            {[["select","Select Shell"],["parse","Parse & Ingest"],["generate","Generate Code"],["execute","QC & Execute"],["output","Review Output"]].map(([id, label], i) => {
              const idx = STEPS.indexOf(id), isDone = stepIdx > idx, isActive = stepIdx === idx;
              return (
                <div key={id} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                  <div className={`step-dot ${isActive?"step-active":isDone?"step-done":"step-pending"}`}>{isDone?"✓":i+1}</div>
                  <span style={{ fontSize:"11px", color:isActive?"#c0d8f0":isDone?"#66bb6a":"#2a4a6a" }}>{label}</span>
                </div>
              );
            })}
          </div>

          {appMode === "upload" && (
            <div style={{ padding:"10px 16px", borderBottom:"1px solid #1a2d45" }}>
              <div style={{ fontSize:"9px", letterSpacing:"0.12em", color:"#2a4a6a", marginBottom:"6px" }}>UPLOADED</div>
              <div style={{ fontSize:"11px", color:Object.keys(uploadedDatasets).length>0?"#66bb6a":"#3a5a7a" }}>
                {Object.keys(uploadedDatasets).length>0 ? `● ${Object.keys(uploadedDatasets).length} dataset(s)` : "○ No datasets"}
              </div>
              <div style={{ fontSize:"11px", color:uploadedShells.length>0?"#66bb6a":"#3a5a7a", marginTop:"3px" }}>
                {uploadedShells.length>0 ? `● ${uploadedShells.length} shell(s)` : "○ No shells"}
              </div>
            </div>
          )}

          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"10px 16px 4px", fontSize:"9px", letterSpacing:"0.12em", color:"#2a4a6a" }}>AGENT LOGS</div>
            <div style={{ flex:1, overflowY:"auto", padding:"0 16px 16px" }}>
              {agentLogs.length===0 && <div style={{ fontSize:"10px", color:"#1e3a5a", fontStyle:"italic" }}>Awaiting workflow...</div>}
              {agentLogs.map((l, i) => (
                <div key={i} className={`log-line log-${l.type}`}>
                  <span style={{ color:"#1e3a5a", marginRight:4 }}>{l.ts}</span>{l.msg}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* ── MAIN PANEL ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px" }}>

          {/* ── UPLOAD PANEL (only in upload mode on select step) ── */}
          {appMode === "upload" && step === "select" && (
            <div style={{ marginBottom:"28px", paddingBottom:"28px", borderBottom:"1px solid #1a2d45" }}>
              <h2 style={{ fontFamily:"'IBM Plex Sans'", fontSize:"18px", fontWeight:600, color:"#d0e8f8", marginBottom:"6px" }}>Upload Files</h2>
              <p style={{ fontSize:"11px", color:"#3a6a8a", lineHeight:1.7, marginBottom:"20px" }}>
                Upload ADaM datasets and/or table shells. Supported: CSV, XLSX, XPT, ZIP (auto-extracts), TXT/RTF shells.
              </p>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
                <div>
                  <div style={{ fontSize:"9px", letterSpacing:"0.1em", color:"#2a4a6a", marginBottom:"8px" }}>ADAM DATASETS</div>
                  <DropZone onFiles={handleDatasetFiles} accept=".csv,.xlsx,.xls,.xpt,.sas7bdat,.zip"
                    label="Drop datasets here or click" sublabel="CSV · XLSX · XPT · ZIP · SAS7BDAT*" icon="📊" />
                  <div style={{ marginTop:"8px", fontSize:"9px", color:"#1e3a5a", lineHeight:1.8 }}>
                    CSV → filename = dataset name (e.g. adsl.csv → ADSL)<br/>
                    XLSX multi-sheet → each sheet = one dataset<br/>
                    ZIP → all supported files extracted automatically<br/>
                    *SAS7BDAT: convert to CSV first (see note)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:"9px", letterSpacing:"0.1em", color:"#2a4a6a", marginBottom:"8px" }}>TABLE SHELLS</div>
                  <DropZone onFiles={handleShellFiles} accept=".xlsx,.xls,.txt,.rtf"
                    label="Drop shells here or click" sublabel="XLSX (each sheet = shell) · TXT · RTF" icon="📋" />
                  <div style={{ marginTop:"8px", fontSize:"9px", color:"#1e3a5a", lineHeight:1.8 }}>
                    XLSX → each worksheet parsed as one shell<br/>
                    TXT/RTF → plain text shell content<br/>
                    CDISC sample shells always available below<br/>
                    Uploaded shells appear at top of the list
                  </div>
                </div>
              </div>

              {/* ── PASTE FROM EXCEL PANEL ── */}
              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"9px", letterSpacing:"0.1em", color:"#2a4a6a", marginBottom:"8px", display:"flex", alignItems:"center", gap:"10px" }}>
                  PASTE FROM EXCEL
                  <span style={{ fontSize:"9px", color:"#1e3a5a" }}>— select cells in Excel, copy (Cmd+C), paste below</span>
                </div>
                <div className="card" style={{ padding:"16px" }}>
                  {/* Mode toggle */}
                  <div style={{ display:"flex", gap:"4px", marginBottom:"12px" }}>
                    {[["shell","📋 Table Shell"],["data","📊 Dataset"]].map(([m, l]) => (
                      <button key={m}
                        onClick={() => { setPasteMode(m); setPasteError(""); }}
                        style={{
                          padding:"5px 14px", borderRadius:"4px", fontSize:"10px", cursor:"pointer",
                          fontFamily:"'IBM Plex Mono'", letterSpacing:"0.06em", transition:"all 0.15s",
                          background: pasteMode === m ? "#0a2040" : "transparent",
                          color: pasteMode === m ? "#4fc3f7" : "#3a6a8a",
                          border: pasteMode === m ? "1px solid #0066cc" : "1px solid #1a2d45"
                        }}>{l}</button>
                    ))}
                  </div>

                  {/* Name input */}
                  <div style={{ marginBottom:"8px" }}>
                    <input
                      type="text"
                      placeholder={pasteMode === "shell" ? "Shell name / ID (optional, e.g. T-14.1.1)" : "Dataset name (e.g. ADSL)"}
                      value={pasteName}
                      onChange={e => setPasteName(e.target.value)}
                      style={{
                        width:"100%", background:"#06080f", border:"1px solid #1a2d45", borderRadius:"4px",
                        padding:"8px 12px", color:"#90b8d0", fontFamily:"'IBM Plex Mono'", fontSize:"11px",
                        outline:"none"
                      }}
                    />
                  </div>

                  {/* Paste textarea */}
                  <textarea
                    value={pasteText}
                    onChange={e => { setPasteText(e.target.value); setPasteError(""); }}
                    placeholder={
                      pasteMode === "shell"
                        ? "Paste table shell content here...\n\nWorks with:\n• Plain text\n• Cells copied from Excel (tab-separated)\n• RTF/Word table content"
                        : "Paste dataset rows here...\n\nHow to copy from Excel:\n1. Select cells including header row\n2. Cmd+C (Mac) or Ctrl+C (Windows)\n3. Paste here with Cmd+V / Ctrl+V\n\nColumn headers must be in the first row."
                    }
                    style={{
                      width:"100%", height:"160px", background:"#06080f",
                      border:`1px solid ${pasteText ? "#1e4a6a" : "#1a2d45"}`,
                      borderRadius:"4px", padding:"10px 12px", color:"#a8c8e8",
                      fontFamily:"'IBM Plex Mono'", fontSize:"11px", resize:"vertical",
                      outline:"none", lineHeight:"1.6",
                      transition:"border-color 0.2s"
                    }}
                  />

                  {/* Character/line count */}
                  {pasteText && (
                    <div style={{ fontSize:"9px", color:"#2a4a6a", marginTop:"4px", marginBottom:"8px" }}>
                      {pasteText.split("\n").length} lines · {pasteText.length} characters
                      {pasteMode === "data" && pasteText.includes("\t") && (
                        <span style={{ color:"#40c060", marginLeft:"10px" }}>✓ Tab-separated detected (Excel format)</span>
                      )}
                      {pasteMode === "data" && !pasteText.includes("\t") && pasteText.includes(",") && (
                        <span style={{ color:"#c0a040", marginLeft:"10px" }}>CSV format detected</span>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {pasteError && (
                    <div style={{ fontSize:"11px", color:"#ef5350", marginBottom:"8px", padding:"6px 10px", background:"#1a0808", border:"1px solid #3a1a1a", borderRadius:"4px" }}>
                      ✗ {pasteError}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                    <button
                      className="btn-primary"
                      style={{ padding:"8px 18px", fontSize:"11px" }}
                      onClick={pasteMode === "shell" ? handlePasteShell : handlePasteDataset}
                      disabled={!pasteText.trim()}
                    >
                      {pasteMode === "shell" ? "＋ Add Shell" : "＋ Add Dataset"}
                    </button>
                    {pasteText && (
                      <button className="btn-ghost" style={{ fontSize:"10px" }}
                        onClick={() => { setPasteText(""); setPasteName(""); setPasteError(""); }}>
                        Clear
                      </button>
                    )}
                    <span style={{ fontSize:"9px", color:"#1e3a5a", marginLeft:"4px" }}>
                      {pasteMode === "shell" ? "Added shells appear in the shell list below" : "Added datasets available immediately"}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding:"10px 14px", background:"#100a06", border:"1px solid #3a2a1a", borderRadius:"4px", marginBottom:"14px" }}>
                <div style={{ fontSize:"10px", color:"#c09060", marginBottom:"4px", fontWeight:600 }}>ℹ SAS7BDAT conversion</div>
                <pre style={{ fontSize:"10px", color:"#806040", fontFamily:"'IBM Plex Mono'" }}>{`# R (haven):
haven::write_csv(haven::read_sas("adsl.sas7bdat"), "adsl.csv")

# SAS:
PROC EXPORT DATA=adsl OUTFILE='adsl.csv' DBMS=CSV REPLACE; RUN;`}</pre>
              </div>

              {/* Upload log */}
              {uploadLog.length > 0 && (
                <div style={{ marginBottom:"14px" }}>
                  <div style={{ fontSize:"9px", letterSpacing:"0.1em", color:"#2a4a6a", marginBottom:"6px" }}>UPLOAD LOG</div>
                  <div className="card" style={{ padding:"10px 14px", maxHeight:"130px", overflowY:"auto" }}>
                    {uploadLog.map((l, i) => <div key={i} className={l.ok?"ulok":"ulerr"}>{l.msg}</div>)}
                  </div>
                </div>
              )}

              {/* Loaded datasets chips with preview */}
              {Object.keys(uploadedDatasets).length > 0 && (
                <div>
                  <div style={{ fontSize:"9px", letterSpacing:"0.1em", color:"#2a4a6a", marginBottom:"8px" }}>LOADED DATASETS</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"12px" }}>
                    {Object.entries(uploadedDatasets).map(([name, info]) => (
                      <div key={name} style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                        <div className="ds-chip" style={{ cursor:"pointer" }} onClick={() => setPreviewDs(previewDs === name ? null : name)}>
                          <span style={{ color:"#4fc3f7" }}>{name}</span>
                          <span style={{ color:"#3a6a8a" }}>{info.data.length}r</span>
                          <span style={{ color:"#2a4a6a", fontSize:"9px" }}>▾</span>
                          <button className="ds-rm" onClick={e => { e.stopPropagation(); const c={...uploadedDatasets}; delete c[name]; setUploadedDatasets(c); }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {previewDs && uploadedDatasets[previewDs] && (
                    <div className="card" style={{ marginBottom:"12px" }}>
                      <div style={{ padding:"8px 12px", borderBottom:"1px solid #1a2d45", fontSize:"10px", color:"#4fc3f7", display:"flex", justifyContent:"space-between" }}>
                        <span>{previewDs} — first 5 rows</span>
                        <span style={{ color:"#2a4a6a" }}>{(uploadedDatasets[previewDs].vars || Object.keys(uploadedDatasets[previewDs].data[0]||{})).length} variables</span>
                      </div>
                      <DataPreview dataset={uploadedDatasets[previewDs]} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SELECT SHELL ── */}
          {step === "select" && (
            <div>
              {appMode === "sample" && (
                <div style={{ marginBottom:"20px" }}>
                  <h1 style={{ fontFamily:"'IBM Plex Sans'", fontSize:"20px", fontWeight:600, color:"#d0e8f8", marginBottom:"6px" }}>Select Table Shell</h1>
                  <p style={{ fontSize:"12px", color:"#3a6a8a", lineHeight:1.6 }}>
                    CDISC Pilot Study shells below — or switch to <strong style={{ color:"#4fc3f7" }}>UPLOAD FILES</strong> to use your own data and shells.
                  </p>
                </div>
              )}

              {/* Active datasets bar */}
              <div style={{ marginBottom:"18px" }}>
                <div style={{ fontSize:"9px", letterSpacing:"0.12em", color:"#2a4a6a", marginBottom:"8px", display:"flex", alignItems:"center", gap:"8px" }}>
                  ACTIVE DATASETS
                  <span className={`badge ${appMode==="upload"&&Object.keys(uploadedDatasets).length>0?"b-up":"b-smp"}`}>
                    {appMode==="upload"&&Object.keys(uploadedDatasets).length>0?"UPLOADED":"SAMPLE"}
                  </span>
                </div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  {Object.entries(ADAM_DATASETS).map(([ds, info]) => (
                    <div key={ds} className="card" style={{ padding:"8px 12px" }}>
                      <div style={{ fontSize:"12px", fontWeight:600, color:"#4fc3f7" }}>{ds}</div>
                      <div style={{ fontSize:"9px", color:"#2a4a6a" }}>{info.data.length}r · {(info.vars||Object.keys(info.data[0]||{})).length}v</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize:"9px", letterSpacing:"0.12em", color:"#2a4a6a", marginBottom:"10px" }}>
                TABLE SHELLS {uploadedShells.length > 0 && <span className="badge b-up" style={{ marginLeft:6 }}>{uploadedShells.length} UPLOADED</span>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"20px" }}>
                {TABLE_SHELLS.map(shell => (
                  <div key={shell.id}
                    className={`shell-card ${selectedShell?.id===shell.id?"selected":""} ${shell.uploaded?"up":""}`}
                    onClick={() => setSelectedShell(shell)}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"5px" }}>
                      <span style={{ fontSize:"12px", fontWeight:600, color:shell.uploaded?"#40d090":"#4fc3f7" }}>{shell.id}</span>
                      <span className={`badge ${shell.uploaded?"b-up":"b-tbl"}`}>{shell.uploaded?"UPLOADED":shell.type.toUpperCase()}</span>
                      {shell.datasets?.length>0 && <span style={{ fontSize:"10px", color:"#2a5a7a" }}>{shell.datasets.join(" + ")}</span>}
                      {shell.source && <span style={{ fontSize:"9px", color:"#1a3a2a" }}>{shell.source}</span>}
                    </div>
                    <div style={{ fontFamily:"'IBM Plex Sans'", fontSize:"13px", color:"#90b8d0", marginBottom:"2px" }}>{shell.title}</div>
                    <div style={{ fontSize:"10px", color:"#2a4a6a" }}>{shell.population}</div>
                  </div>
                ))}
              </div>

              {selectedShell && (
                <div>
                  <div style={{ fontSize:"10px", color:"#3a6a8a", marginBottom:"8px" }}>Shell preview — {selectedShell.id}</div>
                  <pre className="code-pre" style={{ fontSize:"11px", color:"#607890", marginBottom:"16px" }}>{selectedShell.shell.trim()}</pre>
                  {selectedShell.datasets?.some(ds => !ADAM_DATASETS[ds]) && (
                    <div style={{ padding:"10px 14px", background:"#1a1000", border:"1px solid #4a3000", borderRadius:"4px", marginBottom:"14px", fontSize:"11px", color:"#d0a030" }}>
                      ⚠ Missing: {selectedShell.datasets.filter(ds=>!ADAM_DATASETS[ds]).join(", ")} — upload or the agent will use available data.
                    </div>
                  )}
                  <button className="btn-primary" onClick={handleParse} disabled={loading}>
                    {loading ? <span className="pulse">⟳ Parsing...</span> : "▶ Run Ingestion Agent →"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── PARSE ── */}
          {step === "parse" && parsedMeta && (
            <div>
              <div style={{ marginBottom:"18px", display:"flex", alignItems:"center", gap:"12px" }}>
                <h2 style={{ fontFamily:"'IBM Plex Sans'", fontSize:"18px", fontWeight:600, color:"#d0e8f8" }}>Parsed Metadata</h2>
                <span className="badge b-ok">INGESTION COMPLETE</span>
              </div>
              <div className="mg" style={{ marginBottom:"16px" }}>
                {[["Output ID",parsedMeta.output_id,"#4fc3f7"],["Output Type",parsedMeta.output_type],
                  ["Title",parsedMeta.title,null,"1/-1"],["Population",parsedMeta.population],
                  ["R Filter",parsedMeta.population_filter,"#a8d8a8"],
                  ["Datasets",parsedMeta.required_datasets?.join(", ")],
                  ["Key Variables",parsedMeta.key_variables?.slice(0,8).join(", ")]
                ].map(([label,val,color,span]) => (
                  <div key={label} className="mi" style={span?{gridColumn:span}:{}}>
                    <div className="ml">{label}</div>
                    <div className="mv" style={color?{color}:{}}>{val}</div>
                  </div>
                ))}
              </div>
              <pre className="code-pre" style={{ marginBottom:"18px" }}>{JSON.stringify(parsedMeta.row_groups,null,2)}</pre>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? <span className="pulse">⟳ Generating...</span> : "▶ Run Code Generation Agent →"}
              </button>
            </div>
          )}

          {/* ── GENERATE ── */}
          {step === "generate" && (
            <div>
              <div style={{ marginBottom:"18px", display:"flex", alignItems:"center", gap:"12px" }}>
                <h2 style={{ fontFamily:"'IBM Plex Sans'", fontSize:"18px", fontWeight:600, color:"#d0e8f8" }}>Generated R Program</h2>
                <span className="badge b-ok">CODE READY</span>
              </div>
              <div style={{ borderBottom:"1px solid #1a2d45", marginBottom:"14px", display:"flex" }}>
                {[["generated","R PROGRAM"],["meta","METADATA"],["shell","TABLE SHELL"]].map(([t,l]) => (
                  <button key={t} className={`tab-btn ${codeTab===t?"on":"off"}`} onClick={() => setCodeTab(t)}>{l}</button>
                ))}
              </div>
              {codeTab==="generated" && <pre className="code-pre">{finalCode}</pre>}
              {codeTab==="meta" && <pre className="code-pre">{JSON.stringify(parsedMeta,null,2)}</pre>}
              {codeTab==="shell" && <pre className="code-pre" style={{ color:"#607890" }}>{selectedShell.shell.trim()}</pre>}
              <div style={{ marginTop:"18px" }}>
                <button className="btn-primary" onClick={handleExecute} disabled={loading}>
                  {loading ? <span className="pulse">⟳ Executing...</span> : "▶ Execute + QC Agent →"}
                </button>
              </div>
            </div>
          )}

          {/* ── EXECUTE ── */}
          {step === "execute" && (
            <div>
              <div style={{ marginBottom:"18px" }}>
                <h2 style={{ fontFamily:"'IBM Plex Sans'", fontSize:"18px", fontWeight:600, color:"#d0e8f8", marginBottom:"5px" }}>QC &amp; Self-Correction Loop</h2>
                <p style={{ fontSize:"11px", color:"#3a6a8a" }}>Runs R code, validates output, auto-corrects errors via Claude.</p>
              </div>
              {loading && (
                <div style={{ marginBottom:"18px", padding:"14px 16px", background:"#0a1525", border:"1px solid #1a3a5a", borderRadius:"4px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                    <div className="pulse" style={{ width:8, height:8, borderRadius:"50%", background:"#4fc3f7" }} />
                    <span style={{ fontSize:"12px", color:"#4fc3f7" }}>{loadingMsg}</span>
                  </div>
                  <div className="lbar" />
                </div>
              )}
              {qcAttempts.map((a, i) => (
                <div key={i} className={`arow ${a.success?"aok":"afail"}`}>
                  <span style={{ color:a.success?"#66bb6a":"#ef5350", fontSize:"14px" }}>{a.success?"✓":"✗"}</span>
                  <span style={{ color:"#3a5a7a", minWidth:70 }}>ATTEMPT {a.attempt}</span>
                  <span style={{ color:a.success?"#66bb6a":"#ef5350", fontFamily:"'IBM Plex Mono'", fontSize:"11px" }}>
                    {a.success ? "Execution successful — output validated" : (a.error?.slice(0,100)+"...")}
                  </span>
                </div>
              ))}
              {qcAttempts.length > 0 && !loading && (
                <div style={{ marginTop:"18px" }}>
                  <div style={{ fontSize:"9px", letterSpacing:"0.12em", color:"#2a4a6a", marginBottom:"8px" }}>FINAL R PROGRAM</div>
                  <pre className="code-pre">{finalCode}</pre>
                </div>
              )}
            </div>
          )}

          {/* ── OUTPUT ── */}
          {step === "output" && outputTable && (
            <div>
              <div style={{ marginBottom:"18px", display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
                <h2 style={{ fontFamily:"'IBM Plex Sans'", fontSize:"18px", fontWeight:600, color:"#d0e8f8" }}>Output Review</h2>
                <span className="badge b-ok">✓ QC PASSED</span>
                <span style={{ fontSize:"10px", color:"#2a5a3a" }}>{qcAttempts.length} attempt(s)</span>
              </div>
              <div style={{ borderBottom:"1px solid #1a2d45", marginBottom:"14px", display:"flex" }}>
                {[["table","RENDERED TABLE"],["rcode","FINAL R CODE"],["audit","AUDIT TRAIL"]].map(([t,l]) => (
                  <button key={t} className={`tab-btn ${codeTab===t?"on":"off"}`} onClick={() => setCodeTab(t)}>{l}</button>
                ))}
              </div>

              {codeTab==="table" && (
                <div className="card" style={{ padding:"24px", marginBottom:"16px" }}>
                  <div style={{ textAlign:"center", marginBottom:"18px", paddingBottom:"12px", borderBottom:"2px solid #1e3a5f" }}>
                    <div style={{ fontSize:"10px", color:"#3a6a8a", marginBottom:"3px" }}>{outputTable.id}</div>
                    <div style={{ fontFamily:"'IBM Plex Sans'", fontSize:"14px", color:"#c0d8f0", fontWeight:500 }}>{outputTable.title}</div>
                  </div>
                  <table className="tlf-table">
                    <thead><tr>{outputTable.headers.map((h,i) => <th key={i}>{h}</th>)}</tr></thead>
                    <tbody>
                      {outputTable.rows.map((row, i) => (
                        <tr key={i} className={row.isHeader?"hdr":""}>
                          <td style={{ color:row.isHeader?"#5090b8":"#90b0c8" }}>{row.label}</td>
                          {!row.isHeader && row.vals?.map((v,j) => <td key={j} className="val">{v}</td>)}
                          {row.isHeader && <td colSpan={outputTable.headers.length-1} />}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {outputTable.footnotes?.map((fn,i) => (
                    <div key={i} style={{ marginTop:i===0?"12px":"2px", paddingTop:i===0?"10px":0, borderTop:i===0?"1px solid #1a2d45":"none", fontSize:"10px", color:"#2a5a7a" }}>Note: {fn}</div>
                  ))}
                </div>
              )}

              {codeTab==="rcode" && <pre className="code-pre">{finalCode}</pre>}

              {codeTab==="audit" && (
                <div className="card" style={{ padding:"16px" }}>
                  {[
                    ["Output ID", outputTable.id],
                    ["Model", "claude-sonnet-4-20250514"],
                    ["Data Source", appMode==="upload"&&Object.keys(uploadedDatasets).length>0 ? "Uploaded files" : "CDISC Pilot (sample)"],
                    ["Datasets", Object.keys(ADAM_DATASETS).join(", ")],
                    ["QC Attempts", qcAttempts.length],
                    ["Status", "COMPLETED — READY FOR PROGRAMMER REVIEW"],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", gap:"16px", padding:"5px 0", fontSize:"11px", borderBottom:"1px solid #0d1a2a" }}>
                      <span style={{ color:"#3a6a8a", minWidth:160 }}>{k}</span>
                      <span style={{ color:"#90b8d0" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop:"18px", display:"flex", gap:"10px" }}>
                <button className="btn-primary" onClick={resetWorkflow}>↺ Run Another TLF</button>
                <button className="btn-ghost">↓ Export RTF (simulated)</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
