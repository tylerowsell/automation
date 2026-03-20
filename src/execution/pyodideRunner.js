// ─── Pyodide Python Runner ────────────────────────────────────────────────────
// Loads Pyodide lazily on first use via CDN (script tag in index.html).
// Installs pandas, numpy, scipy via micropip, then caches the instance.

let pyodideInstance = null;
let initPromise = null;
let _isReady = false;

export function isPyodideReady() {
  return _isReady;
}

// Initialise Pyodide + packages (called lazily, only once per session)
export async function initPyodide(onProgress) {
  if (_isReady) return pyodideInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    onProgress?.("Loading Python runtime...");
    // loadPyodide is injected globally by the CDN script in index.html
    pyodideInstance = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/",
    });

    onProgress?.("Installing packages (pandas, numpy, scipy)...");
    await pyodideInstance.loadPackage("micropip");
    const micropip = pyodideInstance.pyimport("micropip");
    await micropip.install(["pandas", "numpy", "scipy"]);

    _isReady = true;
    onProgress?.("Python runtime ready");
    return pyodideInstance;
  })();

  return initPromise;
}

// Execute a Python code string and return { success, html, stdout, error }
export async function runPython(code, onProgress) {
  const py = await initPyodide(onProgress);

  // Redirect stdout so we can capture print() output
  await py.runPythonAsync(`
import sys, io
sys.stdout = io.StringIO()
`);

  let html = null;
  let stdout = "";

  try {
    await py.runPythonAsync(code);

    // Read OUTPUT_HTML variable (must be set by the generated script)
    html = py.globals.get("OUTPUT_HTML") ?? null;
    if (html && typeof html.toJs === "function") html = html.toJs();

    // Capture stdout
    stdout = await py.runPythonAsync("sys.stdout.getvalue()") ?? "";
  } catch (err) {
    // Still try to capture any partial stdout before the error
    try {
      stdout = await py.runPythonAsync("sys.stdout.getvalue()") ?? "";
    } catch {}
    return { success: false, html: null, stdout, error: err.message };
  }

  return { success: true, html: html ? String(html) : null, stdout, error: null };
}
