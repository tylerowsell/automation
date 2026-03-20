# TLF·AGENTIC — Clinical Output Automation

A browser-based agentic application that automates the generation of clinical Tables, Listings, and Figures (TLFs) from ADaM datasets and table shells. Built with React + Vite, powered by the Claude API, and featuring live Python execution via Pyodide.

---

## Repo Structure

```
automation/
├── index.html                       # Entry point — loads Pyodide CDN script
├── vite.config.js                   # Vite config with COEP/COOP headers for Pyodide
├── package.json
│
└── src/
    ├── main.jsx                     # React root mount
    ├── App.jsx                      # Slim root: state, routing between steps (~180 lines)
    │
    ├── config/
    │   ├── apiConfig.js             # ANTHROPIC_API_KEY + callClaude() function
    │   └── sampleData.js            # SAMPLE_ADAM_DATASETS + SAMPLE_TABLE_SHELLS
    │
    ├── agents/
    │   ├── ingestionAgent.js        # Parses shell + ADaM spec → structured metadata JSON
    │   ├── codeGenAgent.js          # Generates R + Python programs in one Claude call
    │   └── qcAgent.js               # Self-correcting QC loop (Pyodide for Python, simulated for R)
    │
    ├── execution/
    │   ├── pyodideRunner.js         # Pyodide init + runPython(code) → {success, html, stdout}
    │   └── rSimulator.js            # Simulated R execution (labelled clearly — not real)
    │
    ├── parsers/
    │   ├── csvParser.js             # parseCSV()
    │   ├── xlsxParser.js            # xlsxBufferToDatasets(), xlsxBufferToShells()
    │   ├── xptParser.js             # parseXPT()
    │   ├── shellParser.js           # parseShellText()
    │   └── fileDispatcher.js        # parseUploadedFile() master dispatcher
    │
    ├── components/
    │   ├── Header.jsx               # Top nav: language toggle, mode toggle, reset
    │   ├── Sidebar.jsx              # Workflow steps + agent log panel
    │   ├── DropZone.jsx             # Drag-and-drop file upload
    │   ├── DataPreview.jsx          # Dataset preview table (first 5 rows)
    │   ├── PastePanel.jsx           # Paste from Excel panel
    │   ├── OutputTable.jsx          # Rendered TLF table + buildOutputTable() helper
    │   └── CodeViewer.jsx           # Tabbed code display component
    │
    └── steps/
        ├── SelectStep.jsx           # Shell selection UI + upload panel
        ├── ParseStep.jsx            # Parsed metadata display
        ├── GenerateStep.jsx         # Python + R code tabs
        ├── ExecuteStep.jsx          # QC loop display + Pyodide loading state
        └── OutputStep.jsx           # Output table + audit trail
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your Anthropic API key

Edit `src/config/apiConfig.js`:

```js
export const ANTHROPIC_API_KEY = "sk-ant-...";
```

> ⚠️ For local development only. Never commit a real API key.

### 3. Run the dev server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

> **Note:** The app uses `Cross-Origin-Embedder-Policy: require-corp` headers (required for Pyodide/SharedArrayBuffer). These are set in `vite.config.js` for the dev server. For production, configure your web server accordingly.

---

## How to Use

### Sample Mode (default)

The app ships with CDISC Pilot Study ADaM datasets (ADSL, ADAE, ADLB) and three pre-built table shells. No upload required.

1. Select a table shell from the list
2. Click **Run Ingestion Agent** — Claude parses the shell into structured metadata
3. Click **Run Code Generation Agent** — Claude generates both R and Python programs
4. Click **Execute + QC Agent** — Python runs live in the browser; errors are auto-corrected
5. Review the rendered output table and audit trail

### Upload Mode

Switch to **UPLOAD FILES** in the header to use your own data:

- **ADaM datasets**: Upload CSV, XLSX (multi-sheet), XPT, or ZIP
- **Table shells**: Upload XLSX (each sheet = one shell), TXT, or RTF
- **Paste from Excel**: Copy cells directly from Excel and paste into the app

### Language Toggle (🐍 PYTHON / 📊 R)

Select the active language in the header before running the workflow:

- **Python**: Code executes live in the browser via Pyodide. Output is rendered as a real HTML table.
- **R**: Code is generated for download and offline use. Execution is simulated in the app.

Both R and Python programs are always generated. Switching language after code is generated shows a "Regenerate" banner.

---

## How Pyodide Execution Works

[Pyodide](https://pyodide.org) is a Python runtime compiled to WebAssembly that runs inside the browser.

1. On first Python execution, the app loads Pyodide from CDN (~10 seconds, one-time per session)
2. `micropip` installs `pandas`, `numpy`, and `scipy` into the Pyodide environment
3. The generated Python code is executed via `pyodide.runPythonAsync(code)`
4. The code must assign its final HTML output to `OUTPUT_HTML` — this variable is read back by JavaScript and rendered with `dangerouslySetInnerHTML`
5. `stdout` is captured by redirecting `sys.stdout` to `io.StringIO()` before execution
6. On error, the error message is passed back to Claude for self-correction (up to 3 attempts)

The Pyodide instance is cached for the session — subsequent runs are fast (~1 second).

---

## How to Convert SAS7BDAT to CSV

SAS transport files (XPT) have partial browser support. SAS7BDAT files cannot be parsed in the browser at all. Convert them first:

**Using R (recommended):**
```r
library(haven)
write.csv(read_sas("adsl.sas7bdat"), "adsl.csv", row.names = FALSE)
# or
haven::write_csv(read_sas("adsl.sas7bdat"), "adsl.csv")
```

**Using SAS:**
```sas
PROC EXPORT DATA=adsl OUTFILE='adsl.csv' DBMS=CSV REPLACE;
RUN;
```

**Using Python:**
```python
import pyreadstat
df, meta = pyreadstat.read_sas7bdat("adsl.sas7bdat")
df.to_csv("adsl.csv", index=False)
```

---

## Notes for Clinical Programmers

- The generated **Python code** is fully self-contained — all ADaM data is embedded as inline Python dict literals so it runs without any file dependencies
- The generated **R code** requires your local R installation with: `tidyverse`, `dplyr`, `gtsummary` (or `Tplyr`), and `r2rtf`
- All code includes inline comments explaining clinical derivations
- The audit trail records model version, language, execution method, datasets used, and QC attempt count
- This tool is for **programming support** — all output must be reviewed by a qualified clinical programmer before use in regulatory submissions
