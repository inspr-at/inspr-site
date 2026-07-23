// Lightbox for product-view thumbnails: modal <dialog> with prev/next
// navigation, arrow-key support, backdrop/Esc/button close, page blur and
// scroll lock while open. External same-origin file — script-src 'self',
// no CSP hash churn.
(() => {
  "use strict";

  // Re-home the dialogs to <body>: the page-blur rule targets
  // `body.lightbox-open > :not(dialog)`, which only spares the lightbox
  // when the dialogs are direct body children.
  const dialogs = [...document.querySelectorAll("dialog.product-surface__dialog")];
  dialogs.forEach((d) => document.body.appendChild(d));

  const syncScrollLock = () => {
    const anyOpen = document.querySelector("dialog[open]") !== null;
    document.body.classList.toggle("lightbox-open", anyOpen);
  };

  const openDialog = (dialog) => {
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
      syncScrollLock();
    }
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const opener = event.target.closest("[data-lightbox-target]");
    if (opener) {
      openDialog(document.getElementById(opener.getAttribute("data-lightbox-target")));
      return;
    }

    const jump = event.target.closest("[data-lightbox-jump]");
    if (jump) {
      const current = jump.closest("dialog");
      const target = document.getElementById(jump.getAttribute("data-lightbox-jump"));
      current?.close();
      openDialog(target);
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

  // Arrow keys page through the views while a lightbox is open.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const open = dialogs.find((d) => d.open);
    if (!open) return;
    event.preventDefault();
    const dir = event.key === "ArrowLeft" ? "--prev" : "--next";
    open.querySelector(`.product-surface__dialog-nav${dir}`)?.click();
  });

  // 'close' does not bubble; capture it to release the scroll lock.
  document.addEventListener("close", syncScrollLock, true);
})();
