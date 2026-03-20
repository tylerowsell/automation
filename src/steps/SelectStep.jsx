import { useState } from "react";
import DropZone from "../components/DropZone.jsx";
import DataPreview from "../components/DataPreview.jsx";
import PastePanel from "../components/PastePanel.jsx";

// ─── Select Step — shell selection + upload panel ─────────────────────────────
export default function SelectStep({
  appMode,
  adamDatasets,
  tableShells,
  uploadedDatasets, setUploadedDatasets,
  uploadedShells, setUploadedShells,
  uploadLog, setUploadLog,
  uploadProcessing, setUploadProcessing,
  selectedShell, setSelectedShell,
  loading,
  onRunIngestion,
  onDatasetFiles,
  onShellFiles,
  adamSpec, onSpecFile,
}) {
  const [previewDs, setPreviewDs] = useState(null);

  return (
    <div>
      {/* ── Upload panel (upload mode only) ── */}
      {appMode === "upload" && (
        <div style={{ marginBottom: "28px", paddingBottom: "28px", borderBottom: "1px solid #1a2d45" }}>
          <h2 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "18px", fontWeight: 600, color: "#d0e8f8", marginBottom: "6px" }}>Upload Files</h2>
          <p style={{ fontSize: "11px", color: "#3a6a8a", lineHeight: 1.7, marginBottom: "20px" }}>
            Upload ADaM datasets and/or table shells. Supported: CSV, XLSX, XPT, ZIP (auto-extracts), TXT/RTF shells.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#2a4a6a", marginBottom: "8px" }}>ADAM DATASETS</div>
              <DropZone onFiles={onDatasetFiles} accept=".csv,.xlsx,.xls,.xpt,.sas7bdat,.zip"
                label="Drop datasets here or click" sublabel="CSV · XLSX · XPT · ZIP · SAS7BDAT*" icon="📊" />
              <div style={{ marginTop: "8px", fontSize: "9px", color: "#1e3a5a", lineHeight: 1.8 }}>
                CSV → filename = dataset name (e.g. adsl.csv → ADSL)<br />
                XLSX multi-sheet → each sheet = one dataset<br />
                ZIP → all supported files extracted automatically<br />
                *SAS7BDAT: convert to CSV first (see note)
              </div>
            </div>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#2a4a6a", marginBottom: "8px" }}>TABLE SHELLS</div>
              <DropZone onFiles={onShellFiles} accept=".xlsx,.xls,.txt,.rtf"
                label="Drop shells here or click" sublabel="XLSX (each sheet = shell) · TXT · RTF" icon="📋" />
              <div style={{ marginTop: "8px", fontSize: "9px", color: "#1e3a5a", lineHeight: 1.8 }}>
                XLSX → each worksheet parsed as one shell<br />
                TXT/RTF → plain text shell content<br />
                CDISC sample shells always available below<br />
                Uploaded shells appear at top of the list
              </div>
            </div>
          </div>

          {/* ADaM Spec upload */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#2a4a6a", marginBottom: "8px" }}>
              ADAM SPEC FILE <span style={{ color: "#1a3050" }}>(optional — improves code generation)</span>
            </div>
            <div
              style={{
                border: `1px ${adamSpec ? "solid" : "dashed"} ${adamSpec ? "#1a5030" : "#1a3050"}`,
                borderRadius: "5px", padding: "12px 16px", cursor: "pointer",
                background: adamSpec ? "#071a0e" : "#050810",
                transition: "all .2s", display: "flex", alignItems: "center", gap: "12px",
              }}
              onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".xlsx,.xls,.csv"; inp.onchange = e => { if (e.target.files[0]) onSpecFile(e.target.files[0]); }; inp.click(); }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) onSpecFile(e.dataTransfer.files[0]); }}
            >
              {adamSpec ? (
                <>
                  <span style={{ fontSize: "16px" }}>✓</span>
                  <div>
                    <div style={{ fontSize: "11px", color: "#3aaa50", fontFamily: "'IBM Plex Mono'" }}>{adamSpec.source}</div>
                    <div style={{ fontSize: "10px", color: "#1a5030" }}>
                      {adamSpec.variables.length} variables · {Object.keys(adamSpec.codelists).length} codelists
                    </div>
                  </div>
                  <button
                    className="btn-ghost"
                    style={{ marginLeft: "auto", padding: "3px 10px", fontSize: "10px" }}
                    onClick={e => { e.stopPropagation(); /* setAdamSpec(null) — handled by parent */ }}
                  >✕</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "20px", opacity: 0.5 }}>📑</span>
                  <div>
                    <div style={{ fontSize: "11px", color: "#2a5070", fontFamily: "'IBM Plex Mono'" }}>
                      Drop ADaM spec XLSX/CSV here
                    </div>
                    <div style={{ fontSize: "10px", color: "#1a3050" }}>
                      Variable labels · Codelists · Types — used by Data Analyst + Code Gen agents
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Paste panel */}
          <PastePanel
            onAddShell={(shell, msg) => {
              setUploadedShells(prev => [shell, ...prev]);
              setUploadLog(prev => [{ ok: true, msg }, ...prev]);
            }}
            onAddDataset={(name, dataset, msg) => {
              setUploadedDatasets(prev => ({ ...prev, [name]: dataset }));
              setUploadLog(prev => [{ ok: true, msg }, ...prev]);
            }}
          />

          {/* SAS conversion note */}
          <div style={{ padding: "10px 14px", background: "#100a06", border: "1px solid #3a2a1a", borderRadius: "4px", marginBottom: "14px" }}>
            <div style={{ fontSize: "10px", color: "#c09060", marginBottom: "4px", fontWeight: 600 }}>ℹ SAS7BDAT conversion</div>
            <pre style={{ fontSize: "10px", color: "#806040", fontFamily: "'IBM Plex Mono'" }}>{`# R (haven):
haven::write_csv(haven::read_sas("adsl.sas7bdat"), "adsl.csv")

# SAS:
PROC EXPORT DATA=adsl OUTFILE='adsl.csv' DBMS=CSV REPLACE; RUN;`}</pre>
          </div>

          {/* Upload log */}
          {uploadLog.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#2a4a6a", marginBottom: "6px" }}>UPLOAD LOG</div>
              <div className="card" style={{ padding: "10px 14px", maxHeight: "130px", overflowY: "auto" }}>
                {uploadLog.map((l, i) => <div key={i} className={l.ok ? "ulok" : "ulerr"}>{l.msg}</div>)}
              </div>
            </div>
          )}

          {/* Loaded datasets chips */}
          {Object.keys(uploadedDatasets).length > 0 && (
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#2a4a6a", marginBottom: "8px" }}>LOADED DATASETS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                {Object.entries(uploadedDatasets).map(([name, info]) => (
                  <div key={name} className="ds-chip" style={{ cursor: "pointer" }} onClick={() => setPreviewDs(previewDs === name ? null : name)}>
                    <span style={{ color: "#4fc3f7" }}>{name}</span>
                    <span style={{ color: "#3a6a8a" }}>{info.data.length}r</span>
                    <span style={{ color: "#2a4a6a", fontSize: "9px" }}>▾</span>
                    <button className="ds-rm" onClick={e => {
                      e.stopPropagation();
                      const c = { ...uploadedDatasets }; delete c[name]; setUploadedDatasets(c);
                    }}>×</button>
                  </div>
                ))}
              </div>
              {previewDs && uploadedDatasets[previewDs] && (
                <div className="card" style={{ marginBottom: "12px" }}>
                  <div style={{ padding: "8px 12px", borderBottom: "1px solid #1a2d45", fontSize: "10px", color: "#4fc3f7", display: "flex", justifyContent: "space-between" }}>
                    <span>{previewDs} — first 5 rows</span>
                    <span style={{ color: "#2a4a6a" }}>{(uploadedDatasets[previewDs].vars || Object.keys(uploadedDatasets[previewDs].data[0] || {})).length} variables</span>
                  </div>
                  <DataPreview dataset={uploadedDatasets[previewDs]} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Shell selection ── */}
      {appMode === "sample" && (
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontFamily: "'IBM Plex Sans'", fontSize: "20px", fontWeight: 600, color: "#d0e8f8", marginBottom: "6px" }}>Select Table Shell</h1>
          <p style={{ fontSize: "12px", color: "#3a6a8a", lineHeight: 1.6 }}>
            CDISC Pilot Study shells below — or switch to <strong style={{ color: "#4fc3f7" }}>UPLOAD FILES</strong> to use your own data and shells.
          </p>
        </div>
      )}

      {/* Active datasets */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#2a4a6a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
          ACTIVE DATASETS
          <span className={`badge ${appMode === "upload" && Object.keys(uploadedDatasets).length > 0 ? "b-up" : "b-smp"}`}>
            {appMode === "upload" && Object.keys(uploadedDatasets).length > 0 ? "UPLOADED" : "SAMPLE"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {Object.entries(adamDatasets).map(([ds, info]) => (
            <div key={ds} className="card" style={{ padding: "8px 12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#4fc3f7" }}>{ds}</div>
              <div style={{ fontSize: "9px", color: "#2a4a6a" }}>{info.data.length}r · {(info.vars || Object.keys(info.data[0] || {})).length}v</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shell list */}
      <div style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#2a4a6a", marginBottom: "10px" }}>
        TABLE SHELLS {uploadedShells.length > 0 && <span className="badge b-up" style={{ marginLeft: 6 }}>{uploadedShells.length} UPLOADED</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {tableShells.map(shell => (
          <div key={shell.id}
            className={`shell-card ${selectedShell?.id === shell.id ? "selected" : ""} ${shell.uploaded ? "up" : ""}`}
            onClick={() => setSelectedShell(shell)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: shell.uploaded ? "#40d090" : "#4fc3f7" }}>{shell.id}</span>
              <span className={`badge ${shell.uploaded ? "b-up" : "b-tbl"}`}>{shell.uploaded ? "UPLOADED" : shell.type.toUpperCase()}</span>
              {shell.datasets?.length > 0 && <span style={{ fontSize: "10px", color: "#2a5a7a" }}>{shell.datasets.join(" + ")}</span>}
              {shell.source && <span style={{ fontSize: "9px", color: "#1a3a2a" }}>{shell.source}</span>}
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans'", fontSize: "13px", color: "#90b8d0", marginBottom: "2px" }}>{shell.title}</div>
            <div style={{ fontSize: "10px", color: "#2a4a6a" }}>{shell.population}</div>
          </div>
        ))}
      </div>

      {selectedShell && (
        <div>
          <div style={{ fontSize: "10px", color: "#3a6a8a", marginBottom: "8px" }}>Shell preview — {selectedShell.id}</div>
          <pre className="code-pre" style={{ fontSize: "11px", color: "#607890", marginBottom: "16px" }}>{selectedShell.shell.trim()}</pre>
          {selectedShell.datasets?.some(ds => !adamDatasets[ds]) && (
            <div style={{ padding: "10px 14px", background: "#1a1000", border: "1px solid #4a3000", borderRadius: "4px", marginBottom: "14px", fontSize: "11px", color: "#d0a030" }}>
              ⚠ Missing: {selectedShell.datasets.filter(ds => !adamDatasets[ds]).join(", ")} — upload or the agent will use available data.
            </div>
          )}
          <button className="btn-primary" onClick={onRunIngestion} disabled={loading}>
            {loading ? <span className="pulse">⟳ Parsing...</span> : "▶ Run Ingestion Agent →"}
          </button>
        </div>
      )}
    </div>
  );
}
