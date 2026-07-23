// Specs grid behaviors: pin/unpin cards, flip-all, ELI10 mode, glossary term
// targeting, and randomized layout with a FLIP-animated reshuffle. External
// same-origin file on purpose — script-src 'self', no CSP hash churn.
(() => {
  "use strict";

  const root = document.getElementById("specs");
  if (!root) return;
  const grid = root.querySelector(".specs__grid");
  const glossary = root.querySelector("[data-specs-glossary]");
  const flipAllBtn = root.querySelector("[data-specs-flip-all]");
  const prefersReduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tiles = () => [...root.querySelectorAll(".specs__tile")];

  // ── Pinning ────────────────────────────────────────────────────────────────
  const setPinned = (tile, pinned) => {
    tile.classList.toggle("is-pinned", pinned);
    tile.querySelector(".specs__flip")?.setAttribute("aria-pressed", String(pinned));
  };

  const allPinned = () => tiles().every((t) => t.classList.contains("is-pinned"));

  const syncFlipAll = () => {
    if (!flipAllBtn) return;
    const on = allPinned();
    flipAllBtn.setAttribute("aria-pressed", String(on));
    flipAllBtn.textContent = on ? "Unflip all" : "Flip all";
  };

  const toggleTile = (flip) => {
    const tile = flip.closest(".specs__tile");
    if (!tile) return;
    setPinned(tile, !tile.classList.contains("is-pinned"));
    syncFlipAll();
  };

  // ── Glossary ───────────────────────────────────────────────────────────────
  let activeTerm = null;
  const clearHits = () =>
    root.querySelectorAll(".specs__gloss-entry.is-hit").forEach((el) => el.classList.remove("is-hit"));

  const handleTerm = (btn) => {
    const id = btn.getAttribute("data-term");
    const entry = document.getElementById(`gloss-${id}`);
    if (!entry || !glossary) return;
    if (activeTerm === id) {
      clearHits();
      activeTerm = null;
      return;
    }
    clearHits();
    glossary.open = true;
    entry.classList.add("is-hit");
    activeTerm = id;
    entry.scrollIntoView({
      block: "nearest",
      behavior: prefersReduced() ? "auto" : "smooth",
    });
  };

  // ── Shuffle (randomize on load; FLIP-animate on demand) ───────────────────
  const shuffleOrder = () => {
    const kids = tiles();
    for (let i = kids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kids[i], kids[j]] = [kids[j], kids[i]];
    }
    kids.forEach((k) => grid.appendChild(k));
  };

  const shuffleAnimated = () => {
    if (prefersReduced()) {
      shuffleOrder();
      return;
    }
    const first = new Map(tiles().map((t) => [t, t.getBoundingClientRect()]));
    shuffleOrder();
    tiles().forEach((t) => {
      const f = first.get(t);
      const l = t.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (!dx && !dy) return;
      t.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0, 0)" },
        ],
        { duration: 680, easing: "cubic-bezier(0.45, 0, 0.2, 1)" },
      );
    });
  };

  // ── Events ─────────────────────────────────────────────────────────────────
  document.addEventListener("click", (event) => {
    const term = event.target.closest(".specs__term");
    if (term) {
      event.stopPropagation();
      // A word click pins the card first (a hover-flipped card would spin
      // away the moment the pointer moves toward the glossary), then opens
      // the glossary entry. It never unpins.
      const tile = term.closest(".specs__tile");
      if (tile && !tile.classList.contains("is-pinned")) {
        setPinned(tile, true);
        syncFlipAll();
      }
      handleTerm(term);
      return;
    }
    if (event.target.closest("[data-specs-flip-all]")) {
      const target = !allPinned();
      tiles().forEach((t) => setPinned(t, target));
      syncFlipAll();
      return;
    }
    const mode = event.target.closest("[data-specs-eli10]");
    if (mode) {
      const on = root.getAttribute("data-eli10") !== "true";
      root.setAttribute("data-eli10", String(on));
      mode.setAttribute("aria-pressed", String(on));
      return;
    }
    if (event.target.closest("[data-specs-shuffle]")) {
      shuffleAnimated();
      return;
    }
    const flip = event.target.closest(".specs__flip");
    if (flip && root.contains(flip)) {
      // The note text is a reading zone: a near-miss beside a glossary term
      // must not flip the card away. Flip/unpin only outside the note.
      if (event.target.closest(".specs__note")) return;
      toggleTile(flip);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      tiles().forEach((t) => setPinned(t, false));
      syncFlipAll();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    const el = event.target;
    if (!(el instanceof Element)) return;
    if (el.closest(".specs__term")) return; // real buttons handle themselves
    const flip = el.closest(".specs__flip");
    if (flip && root.contains(flip)) {
      event.preventDefault();
      toggleTile(flip);
    }
  });

  // Fresh order on every load.
  shuffleOrder();
  syncFlipAll();
})();
