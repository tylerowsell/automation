import { callClaude } from "../config/apiConfig.js";
import { runPython, initPyodide } from "../execution/pyodideRunner.js";
import { runR, initWebR } from "../execution/webRRunner.js";

// ─── QC Agent — self-correcting execution loop ────────────────────────────────
// Python: real Pyodide execution with live error feedback
// R:      real WebR execution with live error feedback

const MAX_ATTEMPTS = 3;

export async function runQcAgent({
  language,
  rCode,
  pyCode,
  parsedMeta,
  adamDatasets,
  addLog,
  setLoadingMsg,
  setQcAttempts,
  onRuntimeLoading,  // called while runtime is initialising
}) {
  addLog("agent", "[QC Agent] Starting execution loop...");
  const attempts = [];
  let currentRCode = rCode;
  let currentPyCode = pyCode;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    setLoadingMsg(`QC Agent — Attempt ${attempt + 1}/${MAX_ATTEMPTS}...`);
    addLog("info", `Attempt ${attempt + 1}: Running ${language === "python" ? "Python (Pyodide)" : "R (WebR)"}...`);

    let result;

    if (language === "python") {
      try {
        result = await runPython(currentPyCode, msg => {
          onRuntimeLoading?.(msg);
          setLoadingMsg(msg);
        }, adamDatasets);
      } catch (e) {
        result = { success: false, html: null, stdout: "", error: e.message };
      }
    } else {
      try {
        result = await runR(currentRCode, msg => {
          onRuntimeLoading?.(msg);
          setLoadingMsg(msg);
        }, adamDatasets);
      } catch (e) {
        result = { success: false, html: null, error: e.message };
      }
    }

    if (result.success) {
      addLog("success", `[QC Agent] Succeeded on attempt ${attempt + 1}`);
      attempts.push({ attempt: attempt + 1, success: true });
      setQcAttempts([...attempts]);
      return {
        success: true,
        attempts,
        finalRCode: currentRCode,
        finalPyCode: currentPyCode,
        outputHtml: result.html ?? null,
        stdout: result.stdout ?? "",
      };
    }

    addLog("error", `Attempt ${attempt + 1}: ${result.error}`);
    attempts.push({ attempt: attempt + 1, success: false, error: result.error });
    setQcAttempts([...attempts]);

    if (attempt < MAX_ATTEMPTS - 1) {
      addLog("agent", "[QC Agent] Requesting correction from Claude...");
      setLoadingMsg("QC Agent — Correcting...");

      try {
        if (language === "python") {
          const fixed = await callClaude(
            `Debug and fix this Python clinical TLF code for Pyodide execution.
Requirements:
- Load datasets using pd.read_csv('/datasets/DSNAME.csv') — files are pre-mounted
- Last line must assign OUTPUT_HTML as an HTML string
- Use only pandas, numpy, scipy.stats
Return ONLY corrected Python code, no explanation.`,
            `ERROR:\n${result.error}\n\nCODE:\n${currentPyCode}\n\nMETADATA:\n${JSON.stringify(parsedMeta, null, 2)}`,
            4000
          );
          currentPyCode = fixed.replace(/^```python\n?/i, "").replace(/```\s*$/i, "").trim();
        } else {
          const fixed = await callClaude(
            `Debug and fix this R clinical TLF code for WebR (browser) execution.
Requirements:
- Datasets are PRE-LOADED in the environment — do NOT call read.csv()
- Use dplyr and gt packages only
- Last line must assign: OUTPUT_HTML <- gt::as_raw_html(tbl)
Return ONLY corrected R code, no explanation.`,
            `ERROR:\n${result.error}\n\nCODE:\n${currentRCode}\n\nMETADATA:\n${JSON.stringify(parsedMeta, null, 2)}`,
            4000
          );
          currentRCode = fixed.replace(/^```[r\n]*/i, "").replace(/```\s*$/i, "").trim();
        }
        addLog("success", "[QC Agent] Correction applied");
      } catch (e) {
        addLog("error", `Correction failed: ${e.message}`);
        break;
      }
    }
  }

  addLog("error", "[QC Agent] Max attempts reached — flagging for manual review.");
  return {
    success: false,
    attempts,
    finalRCode: currentRCode,
    finalPyCode: currentPyCode,
    outputHtml: null,
    stdout: "",
  };
}
