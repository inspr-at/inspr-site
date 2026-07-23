// Specs tiles: click pins a card on its back face (aria-pressed reflects it),
// click again releases, Escape releases every pinned card. External same-origin
// file on purpose — script-src 'self' covers it, no CSP hash churn.
(() => {
  "use strict";

  const setPinned = (tile, pinned) => {
    tile.classList.toggle("is-pinned", pinned);
    const flip = tile.querySelector(".specs__flip");
    if (flip) flip.setAttribute("aria-pressed", pinned ? "true" : "false");
  };

  document.addEventListener("click", (event) => {
    const flip = event.target.closest(".specs__flip");
    if (!flip) return;
    const tile = flip.closest(".specs__tile");
    if (!tile) return;
    setPinned(tile, !tile.classList.contains("is-pinned"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document
      .querySelectorAll(".specs__tile.is-pinned")
      .forEach((tile) => setPinned(tile, false));
  });
})();
