// INSPR-572: paimos.com's opening (the arc draws, then the words follow).
// It plays on a fresh arrival only: a new navigation from another site or a
// typed address. A reload, back or forward, a link to a section, a move within
// the site or reduced motion get the finished page at once. Nothing is
// stored; the decision reads the navigation type and the referrer's origin.
(() => {
  try {
    const entry = performance.getEntriesByType("navigation")[0];
    const fresh = !entry || entry.type === "navigate";
    let external = true;
    if (document.referrer) {
      try {
        external = new URL(document.referrer).origin !== location.origin;
      } catch {
        external = true;
      }
    }
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (fresh && external && !calm && !location.hash) document.documentElement.dataset.intro = "play";
  } catch {
    // Without the opening the page is simply already in its final state.
  }
})();
