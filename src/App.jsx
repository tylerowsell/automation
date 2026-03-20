import { useState } from "react";
import { SAMPLE_ADAM_DATASETS, SAMPLE_TABLE_SHELLS } from "./config/sampleData.js";
import { parseUploadedFile } from "./parsers/fileDispatcher.js";
import { runIngestionAgent } from "./agents/ingestionAgent.js";
import { runCodeGenAgent } from "./agents/codeGenAgent.js";
import { runQcAgent } from "./agents/qcAgent.js";
import { buildOutputTable } from "./components/OutputTable.jsx";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import SelectStep from "./steps/SelectStep.jsx";
import ParseStep from "./steps/ParseStep.jsx";
import GenerateStep from "./steps/GenerateStep.jsx";
import ExecuteStep from "./steps/ExecuteStep.jsx";
import OutputStep from "./steps/OutputStep.jsx";

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:#080c18}
::-webkit-scrollbar-thumb{background:#1a3050;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#2a4a70}

/* Buttons */
.btn-primary{background:linear-gradient(135deg,#0060cc,#003fa0);color:#d8eeff;border:1px solid #0077ee40;padding:10px 24px;border-radius:5px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:500;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;transition:all .2s;box-shadow:0 1px 4px #00204080}
.btn-primary:hover:not(:disabled){background:linear-gradient(135deg,#0070dd,#004db0);box-shadow:0 0 18px #0066cc50,0 2px 6px #00204080;border-color:#0088ff60}
.btn-primary:disabled{opacity:.35;cursor:not-allowed}
.btn-ghost{background:transparent;color:#6a8aaa;border:1px solid #1a3050;padding:8px 18px;border-radius:5px;font-family:'IBM Plex Mono',monospace;font-size:11px;cursor:pointer;transition:all .2s}
.btn-ghost:hover{border-color:#2a5080;color:#90b0cc;background:#060e1a}
.btn-mode{background:transparent;border:none;padding:6px 13px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:10px;cursor:pointer;letter-spacing:.08em;transition:all .2s}
.btn-mode.active{background:#071828;color:#4fc3f7;border:1px solid #0055aa;box-shadow:inset 0 1px 2px #00204060}
.btn-mode.inactive{color:#2a5070;border:1px solid transparent}
.btn-mode.inactive:hover{color:#4a8090;background:#060e18}

/* Cards */
.card{background:#090d1c;border:1px solid #162035;border-radius:7px;box-shadow:0 1px 3px #00102040}
.shell-card{background:#090d1c;border:1px solid #162035;border-radius:7px;padding:14px 16px;cursor:pointer;transition:all .22s;position:relative}
.shell-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:7px 0 0 7px;background:transparent;transition:background .22s}
.shell-card:hover{border-color:#1a4070;background:#0a1220}
.shell-card:hover::before{background:#1a4070}
.shell-card.selected{border-color:#0077ee;background:#071828;box-shadow:0 0 22px #0055cc25}
.shell-card.selected::before{background:#0077ee}
.shell-card.up{border-color:#1a4030}.shell-card.up:hover{border-color:#20804a}.shell-card.up.selected{border-color:#00cc66}
.shell-card.up::before{background:#1a4030}.shell-card.up.selected::before{background:#00cc66}

/* Logs */
.log-line{font-size:10.5px;padding:1.5px 0;font-family:'IBM Plex Mono',monospace;line-height:1.65}
.log-agent{color:#38b0e8}.log-success{color:#56a866}.log-error{color:#d94040}.log-info{color:#607a8a}

/* Step indicators */
.step-dot{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0}
.step-active{background:linear-gradient(135deg,#0066cc,#004499);color:white;box-shadow:0 0 0 3px #0066cc30,0 0 10px #0066cc60}
.step-done{background:#0d2010;color:#56b866;border:1px solid #1a4025}
.step-pending{background:#080c18;color:#253a50;border:1px solid #111e30}

/* Code */
.code-pre{background:#050810;border:1px solid #111e30;border-radius:5px;padding:16px 18px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#90b8d8;overflow:auto;white-space:pre;line-height:1.75;max-height:460px}

/* TLF Table */
.tlf-table{width:100%;border-collapse:collapse;font-size:12px;font-family:'IBM Plex Mono',monospace}
.tlf-table caption{text-align:left;font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#c0d8f0;font-weight:500;padding-bottom:10px;caption-side:top}
.tlf-table th{background:#07101e;color:#6098b8;font-weight:500;padding:8px 14px;text-align:center;border-bottom:2px solid #1a2e48;white-space:pre-line;font-size:11px;letter-spacing:.02em}
.tlf-table th:first-child{text-align:left}
.tlf-table td{padding:5px 14px;border-bottom:1px solid #0e1928;color:#9ab8cc;font-size:11.5px}
.tlf-table td.val{text-align:center;color:#b0cce0}
.tlf-table tr.hdr td{color:#4080a8;font-weight:600;padding-top:13px;padding-bottom:3px;background:#06090f}
.tlf-table tr:last-child td{border-bottom:2px solid #1a2e48}
.tlf-table tr:hover:not(.hdr) td{background:#07101e}

/* Badges */
.pulse{animation:pulse 1.8s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:500;letter-spacing:.05em}
.b-tbl{background:#071828;color:#3888b8;border:1px solid #0d3050}
.b-ok{background:#071a0a;color:#3aaa50;border:1px solid #0d3515}
.b-up{background:#082015;color:#30b878;border:1px solid #0c4030}
.b-smp{background:#141006;color:#b09030;border:1px solid #302808}

/* Tabs */
.tab-btn{padding:8px 17px;font-size:11px;cursor:pointer;background:transparent;border:none;font-family:'IBM Plex Mono',monospace;letter-spacing:.05em;transition:all .15s;border-bottom:2px solid transparent}
.tab-btn.on{color:#4fc3f7;border-bottom-color:#4fc3f7}
.tab-btn.off{color:#2a4a60}
.tab-btn.off:hover{color:#5a8aaa}

/* Metadata grid */
.mg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mi{background:#050810;border:1px solid #111e30;border-radius:5px;padding:12px}
.ml{font-size:9px;letter-spacing:.12em;color:#2a5070;text-transform:uppercase;margin-bottom:5px}
.mv{font-size:12px;color:#7ab0cc}

/* QC attempt rows */
.arow{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:5px;margin-bottom:6px;font-size:11px}
.aok{background:#07120a;border:1px solid #143020}
.afail{background:#120808;border:1px solid #301414}

/* Loading bar */
.lbar{height:2px;background:linear-gradient(90deg,#004499,#0088ff,#00aaff,#004499);background-size:300% 100%;animation:slide 1.8s linear infinite;border-radius:1px}
@keyframes slide{0%{background-position:0%}100%{background-position:300%}}

/* Dataset chips */
.ds-chip{display:inline-flex;align-items:center;gap:6px;background:#07101e;border:1px solid #142840;border-radius:4px;padding:5px 10px;font-size:11px;font-family:'IBM Plex Mono',monospace}
.ds-rm{background:transparent;border:none;color:#cc3030;cursor:pointer;font-size:14px;line-height:1;padding:0}
.ds-rm:hover{color:#ee5050}
.ulok{font-size:11px;color:#56a866;font-family:'IBM Plex Mono';padding:2px 0}
.ulerr{font-size:11px;color:#d94040;font-family:'IBM Plex Mono';padding:2px 0;white-space:pre-wrap}

/* Compare view */
.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #162035;border-radius:7px;overflow:hidden}
.compare-pane{display:flex;flex-direction:column;overflow:hidden}
.compare-pane-header{padding:10px 16px;border-bottom:1px solid #162035;display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.1em;color:#2a5070;background:#060a14;flex-shrink:0}
.compare-pane-body{flex:1;overflow:auto;padding:16px}
.compare-divider{width:1px;background:#162035;flex-shrink:0}

textarea:focus{border-color:#0066cc !important;box-shadow:0 0 0 2px #0066cc18}
input:focus{border-color:#0066cc !important;outline:none}
input::placeholder{color:#152535}
textarea::placeholder{color:#152535;line-height:1.8}
`;

const STEPS = ["select", "parse", "generate", "execute", "output"];

export default function App() {
  // ── App-level state ──
  const [appMode, setAppMode] = useState("sample");
  const [language, setLanguage] = useState("python");
  const [langChangedWarning, setLangChangedWarning] = useState(false);

  // ── Upload state ──
  const [uploadedDatasets, setUploadedDatasets] = useState({});
  const [uploadedShells, setUploadedShells] = useState([]);
  const [uploadLog, setUploadLog] = useState([]);
  const [uploadProcessing, setUploadProcessing] = useState(false);

  // ── Workflow state ──
  const [step, setStep] = useState("select");
  const [selectedShell, setSelectedShell] = useState(null);
  const [parsedMeta, setParsedMeta] = useState(null);
  const [rCode, setRCode] = useState("");
  const [pyCode, setPyCode] = useState("");
  const [qcAttempts, setQcAttempts] = useState([]);
  const [outputTable, setOutputTable] = useState(null);
  const [outputHtml, setOutputHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [agentLogs, setAgentLogs] = useState([]);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeLoadingMsg, setRuntimeLoadingMsg] = useState("");

  // ── Active data ──
  const adamDatasets =
    appMode === "upload" && Object.keys(uploadedDatasets).length > 0
      ? uploadedDatasets
      : SAMPLE_ADAM_DATASETS;
  const tableShells =
    appMode === "upload" && uploadedShells.length > 0
      ? [...uploadedShells, ...SAMPLE_TABLE_SHELLS]
      : SAMPLE_TABLE_SHELLS;

  function addLog(type, msg) {
    setAgentLogs(prev => [...prev, { type, msg, ts: new Date().toISOString().slice(11, 19) }]);
  }

  // ── File upload handlers ──
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
          newLog.push({ ok: true, msg: `  + ${result.shells.filter(s => !s.parseError).length} shell(s) found inside ZIP` });
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

  // ── Workflow steps ──
  async function handleParse() {
    setLoading(true);
    setLoadingMsg("Ingestion Agent parsing table shell and ADaM spec...");
    try {
      const meta = await runIngestionAgent({ shell: selectedShell, adamDatasets, addLog });
      setParsedMeta(meta);
      setStep("parse");
    } catch (e) { addLog("error", `Parse failed: ${e.message}`); }
    setLoading(false);
  }

  async function handleGenerate() {
    setLoading(true);
    setLoadingMsg("Code Generation Agent synthesizing R + Python programs...");
    try {
      const { rCode: r, pyCode: py } = await runCodeGenAgent({ parsedMeta, adamDatasets, addLog });
      setRCode(r);
      setPyCode(py);
      setLangChangedWarning(false);
      setStep("generate");
    } catch (e) { addLog("error", `Code generation failed: ${e.message}`); }
    setLoading(false);
  }

  async function handleExecute() {
    setLoading(true);
    setQcAttempts([]);
    setStep("execute");
    setRuntimeLoading(false);
    setRuntimeLoadingMsg("");

    const result = await runQcAgent({
      language,
      rCode,
      pyCode,
      parsedMeta,
      adamDatasets,
      addLog,
      setLoadingMsg,
      setQcAttempts,
      onRuntimeLoading: msg => {
        setRuntimeLoading(true);
        setRuntimeLoadingMsg(msg);
        setLoadingMsg(msg);
      },
    });

    setRuntimeLoading(false);

    if (result.success) {
      setRCode(result.finalRCode);
      setPyCode(result.finalPyCode);
      setOutputHtml(result.outputHtml);
      setOutputTable(buildOutputTable(selectedShell, parsedMeta, adamDatasets));
      setStep("output");
    }
    setLoading(false);
  }

  function resetWorkflow() {
    setStep("select"); setSelectedShell(null); setParsedMeta(null);
    setRCode(""); setPyCode(""); setQcAttempts([]);
    setOutputTable(null); setOutputHtml(null);
    setAgentLogs([]); setLangChangedWarning(false);
  }

  function fullReset() {
    resetWorkflow();
    setUploadedDatasets({}); setUploadedShells([]);
    setUploadLog([]); setAppMode("sample");
  }

  const codeReady = step !== "select" && step !== "parse";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", fontFamily: "'IBM Plex Mono','Courier New',monospace", color: "#c8d8e8", display: "flex", flexDirection: "column" }}>
      <style>{GLOBAL_CSS}</style>

      <Header
        appMode={appMode} setAppMode={setAppMode}
        language={language} setLanguage={setLanguage}
        loading={loading} uploadProcessing={uploadProcessing}
        onReset={resetWorkflow} onFullReset={fullReset}
        codeReady={codeReady}
        onLanguageChange={() => setLangChangedWarning(true)}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 57px)" }}>
        <Sidebar
          step={step} appMode={appMode}
          uploadedDatasets={uploadedDatasets}
          uploadedShells={uploadedShells}
          agentLogs={agentLogs}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {/* Language-changed warning banner */}
          {langChangedWarning && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#1a1200", border: "1px solid #4a3800", borderRadius: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "#d0a030", fontSize: "12px" }}>
                ⚠ Language changed — regenerate code to apply
              </span>
              <button className="btn-primary" style={{ padding: "6px 14px", fontSize: "10px" }}
                onClick={() => { setLangChangedWarning(false); setStep("parse"); }}>
                Regenerate
              </button>
            </div>
          )}

          {step === "select" && (
            <SelectStep
              appMode={appMode}
              adamDatasets={adamDatasets}
              tableShells={tableShells}
              uploadedDatasets={uploadedDatasets} setUploadedDatasets={setUploadedDatasets}
              uploadedShells={uploadedShells} setUploadedShells={setUploadedShells}
              uploadLog={uploadLog} setUploadLog={setUploadLog}
              uploadProcessing={uploadProcessing} setUploadProcessing={setUploadProcessing}
              selectedShell={selectedShell} setSelectedShell={setSelectedShell}
              loading={loading}
              onRunIngestion={handleParse}
              onDatasetFiles={handleDatasetFiles}
              onShellFiles={handleShellFiles}
            />
          )}

          {step === "parse" && parsedMeta && (
            <ParseStep
              parsedMeta={parsedMeta}
              loading={loading}
              onRunCodeGen={handleGenerate}
              language={language}
            />
          )}

          {step === "generate" && (
            <GenerateStep
              rCode={rCode} pyCode={pyCode}
              parsedMeta={parsedMeta}
              selectedShell={selectedShell}
              language={language}
              loading={loading}
              onRunExecute={handleExecute}
            />
          )}

          {step === "execute" && (
            <ExecuteStep
              loading={loading} loadingMsg={loadingMsg}
              qcAttempts={qcAttempts}
              finalRCode={rCode} finalPyCode={pyCode}
              language={language}
              runtimeLoading={runtimeLoading}
              runtimeLoadingMsg={runtimeLoadingMsg}
            />
          )}

          {step === "output" && (
            <OutputStep
              outputTable={outputTable} outputHtml={outputHtml}
              finalRCode={rCode} finalPyCode={pyCode}
              qcAttempts={qcAttempts}
              appMode={appMode} adamDatasets={adamDatasets}
              language={language}
              onRunAnother={resetWorkflow}
              selectedShell={selectedShell}
            />
          )}
        </div>
      </div>
    </div>
  );
}
