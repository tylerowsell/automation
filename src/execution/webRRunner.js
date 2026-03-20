// ─── WebR R Runner ────────────────────────────────────────────────────────────
// Loads WebR lazily via dynamic import on first R execution.
// Installs dplyr, tidyr, gt via the WebR CRAN mirror.
// Datasets are pre-loaded into the R global environment via textConnection
// so generated code can reference them directly (e.g. adsl, ADSL).

let webRInstance = null;
let initPromise = null;
let _isReady = false;

export function isWebRReady() {
  return _isReady;
}

// Convert an array of row objects to a CSV string
function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = val => {
    const s = val == null ? "" : String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map(row => headers.map(h => escape(row[h])).join(","))].join("\n");
}

// Initialise WebR + packages (called lazily, only once per session)
export async function initWebR(onProgress) {
  if (_isReady) return webRInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    onProgress?.("Loading R runtime (WebR)...");
    const { WebR } = await import("https://webr.r-wasm.org/latest/webr.mjs");
    webRInstance = new WebR();
    await webRInstance.init();

    onProgress?.("Installing R packages (dplyr, tidyr, gt) — first run only...");
    await webRInstance.installPackages(["dplyr", "tidyr", "gt"]);

    _isReady = true;
    onProgress?.("R runtime ready");
    return webRInstance;
  })();

  return initPromise;
}

// Pre-load each ADaM dataset into the R global environment using textConnection.
// Assigns both UPPERCASE (e.g. ADSL) and lowercase (e.g. adsl) names.
export async function preloadDatasetsR(datasets) {
  const webR = await initWebR();
  for (const [name, info] of Object.entries(datasets)) {
    const csv = toCSV(info.data || []);
    const csvJson = JSON.stringify(csv); // safely escape for R string
    await webR.evalRVoid(`
      local({
        con <- textConnection(${csvJson})
        df <- read.csv(con, stringsAsFactors = FALSE)
        close(con)
        assign("${name}", df, envir = .GlobalEnv)
        assign("${name.toLowerCase()}", df, envir = .GlobalEnv)
      })
    `);
  }
}

// Execute an R code string; return { success, html, error }
// datasets (optional): pre-loaded into R global env before execution
export async function runR(code, onProgress, datasets = null) {
  const webR = await initWebR(onProgress);

  if (datasets) {
    await preloadDatasetsR(datasets);
  }

  try {
    await webR.evalRVoid(code);
    // Retrieve OUTPUT_HTML — must be a character string set by the generated code
    const htmlVal = await webR.evalRString('paste0(as.character(OUTPUT_HTML), collapse = "")');
    return { success: true, html: htmlVal || null, error: null };
  } catch (err) {
    return { success: false, html: null, error: err.message };
  }
}
