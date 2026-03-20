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
  const [pyodideLoading, setPyodideLoading] = useState(false);

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
    setPyodideLoading(false);

    const result = await runQcAgent({
      language,
      rCode,
      pyCode,
      parsedMeta,
      adamDatasets,
      addLog,
      setLoadingMsg,
      setQcAttempts,
      onPyodideLoading: msg => {
        setPyodideLoading(true);
        setLoadingMsg(msg);
      },
    });

    setPyodideLoading(false);

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
              pyodideLoading={pyodideLoading}
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
