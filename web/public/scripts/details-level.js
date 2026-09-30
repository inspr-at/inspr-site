// Blocking, same-origin depth decision (INSPR-497). A stored or linked
// depth lands on <html> before the first paint, so a returning reader
// never sees one depth flash into another. Kept external so script-src
// 'self' covers it without a content hash; the release-id query prevents
// stale code. The Details switch module takes over once it loads.
(() => {
  const levels = ["simple", "standard", "technical"];
  let level = null;
  try {
    const linked = new URLSearchParams(window.location.search).get("details");
    if (levels.includes(linked)) level = linked;
  } catch {
    // The default works without URL access.
  }
  if (!level) {
    try {
      const stored = window.localStorage.getItem("inspr-details-level");
      if (levels.includes(stored)) level = stored;
      else if (window.localStorage.getItem("inspr-details") === "1") level = "technical";
    } catch {
      // Storage is optional.
    }
  }
  if (!level) return;
  const root = document.documentElement;
  root.setAttribute("data-details-level", level);
  if (level === "simple") root.setAttribute("data-details-compact", "");
})();
