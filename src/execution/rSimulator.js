// ─── Simulated R Execution ────────────────────────────────────────────────────
// NOTE: R code is NOT executed in the browser. This simulator mimics the
// experience of running R locally for demo purposes — errors are random
// to illustrate the self-correction QC loop.
export function simulateRExecution(attempt) {
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
