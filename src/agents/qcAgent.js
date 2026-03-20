import { callClaude } from "../config/apiConfig.js";
import { simulateRExecution } from "../execution/rSimulator.js";
import { runPython, initPyodide } from "../execution/pyodideRunner.js";

// ─── QC Agent — self-correcting execution loop ────────────────────────────────
// For Python: real Pyodide execution with live error feedback
// For R:      simulated execution (R cannot run in the browser)

const MAX_ATTEMPTS = 3;

export async function runQcAgent({
  language,       // "python" | "r"
  rCode,
  pyCode,
  parsedMeta,
  addLog,
  setLoadingMsg,
  setQcAttempts,
  onPyodideLoading,
}) {
  addLog("agent", "[QC Agent] Starting execution loop...");
  const attempts = [];
  let currentRCode = rCode;
  let currentPyCode = pyCode;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    setLoadingMsg(`QC Agent — Attempt ${attempt + 1}/${MAX_ATTEMPTS}...`);
    addLog("info", `Attempt ${attempt + 1}: Running ${language === "python" ? "Python (Pyodide)" : "R (simulated)"}...`);

    let result;

    if (language === "python") {
      // Real Python execution via Pyodide
      try {
        result = await runPython(currentPyCode, msg => {
          onPyodideLoading?.(msg);
          setLoadingMsg(msg);
        });
      } catch (e) {
        result = { success: false, html: null, stdout: "", error: e.message };
      }
    } else {
      // R execution is simulated — add a small delay to mimic runtime
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
      result = simulateRExecution(attempt);
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
- All data must be defined inline (no file I/O)
- Last line must assign OUTPUT_HTML
- Use only pandas, numpy, scipy.stats
Return ONLY corrected Python code.`,
            `ERROR:\n${result.error}\n\nCODE:\n${currentPyCode}\n\nMETADATA:\n${JSON.stringify(parsedMeta, null, 2)}`,
            4000
          );
          currentPyCode = fixed.replace(/^```python\n?/i, "").replace(/```\s*$/i, "").trim();
        } else {
          const fixed = await callClaude(
            "Debug and fix this R clinical TLF code. Return ONLY corrected R code.",
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
