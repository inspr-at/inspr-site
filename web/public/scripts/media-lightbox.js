// Lightbox for product-view thumbnails: opens the matching <dialog> as a
// modal, closes on the close button, backdrop click or Esc (native), and
// locks body scroll while open. External same-origin file — script-src
// 'self' covers it, no CSP hash churn.
(() => {
  "use strict";

  const syncScrollLock = () => {
    const anyOpen = document.querySelector("dialog[open]") !== null;
    document.body.classList.toggle("lightbox-open", anyOpen);
  };

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-lightbox-target]");
    if (opener) {
      const dialog = document.getElementById(opener.getAttribute("data-lightbox-target"));
      if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
        syncScrollLock();
      }
      return;
    }
    const closer = event.target.closest("[data-lightbox-close]");
    if (closer) {
      closer.closest("dialog")?.close();
      return;
    }
    // A click on the dialog element itself (not its content) is the backdrop.
    if (event.target instanceof HTMLDialogElement && event.target.open) {
      event.target.close();
    }
  });

  // 'close' does not bubble; capture it to release the scroll lock.
  document.addEventListener("close", syncScrollLock, true);
})();
