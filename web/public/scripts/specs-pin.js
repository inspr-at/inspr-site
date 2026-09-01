// Specs grid behaviors: pin/unpin cards, flip-all, ELI10 mode, a live
// glossary-on-hover, and randomized layout with a FLIP-animated reshuffle.
// External same-origin file on purpose — script-src 'self', no CSP churn.
(() => {
  "use strict";

  const root = document.getElementById("specs");
  if (!root) return;
  const grid = root.querySelector(".specs__grid");
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
    // Labels come from the page so the shared script stays locale-neutral.
    flipAllBtn.textContent = on
      ? flipAllBtn.dataset.labelUnflip || "Unflip all"
      : flipAllBtn.dataset.labelFlip || "Flip all";
  };

  const toggleTile = (flip) => {
    const tile = flip.closest(".specs__tile");
    if (!tile) return;
    setPinned(tile, !tile.classList.contains("is-pinned"));
    syncFlipAll();
  };

  // ── Live help on hover ─────────────────────────────────────────────────────
  // Hovering a term marks the word and fills the bare live-help line under
  // the grid with the word plus its definition (carried on data-def).
  // Terms have no click behavior.
  const liveLine = root.querySelector("[data-specs-live]");
  const liveTerm = root.querySelector("[data-gloss-live-term]");
  const liveBody = root.querySelector("[data-gloss-live-body]");

  const showLive = (term) => {
    const body = term.getAttribute("data-def");
    if (!body || !liveLine) return;
    liveTerm.textContent = term.textContent.trim();
    liveBody.textContent = body;
    liveLine.classList.add("is-on");
  };

  const hideLive = () => {
    liveLine?.classList.remove("is-on");
  };

  document.addEventListener("mouseover", (event) => {
    if (!(event.target instanceof Element)) return;
    const term = event.target.closest(".specs__term");
    if (term && root.contains(term)) showLive(term);
  });

  document.addEventListener("mouseout", (event) => {
    if (!(event.target instanceof Element)) return;
    const term = event.target.closest(".specs__term");
    if (!term || !root.contains(term)) return;
    const into = event.relatedTarget instanceof Element ? event.relatedTarget.closest(".specs__term") : null;
    if (!into) hideLive();
  });

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
    if (!(event.target instanceof Element)) return;
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
    if (flip && root.contains(flip)) toggleTile(flip);
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
