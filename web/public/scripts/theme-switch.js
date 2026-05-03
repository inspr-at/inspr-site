// Theme switch click handler.
// Served from /public/ so Astro never inlines it — CSP `script-src 'self'`
// allows it under origin without needing a hash pin.
//
// State machine: auto → light → dark → auto.
// Persisted in localStorage under key 'inspr-theme'.
// Pre-paint sync (FOUC prevention) lives in Base.astro head as a tiny
// hash-pinned inline script that mirrors readStored() below.
(function () {
  "use strict";
  var STATES = ["auto", "light", "dark"];
  var KEY = "inspr-theme";

  function readStored() {
    try {
      var v = localStorage.getItem(KEY);
      return STATES.indexOf(v) !== -1 ? v : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function apply(state) {
    try { localStorage.setItem(KEY, state); } catch (e) {}
    var html = document.documentElement;
    if (state === "auto") {
      delete html.dataset.theme;
    } else {
      html.dataset.theme = state;
    }
    var buttons = document.querySelectorAll("[data-theme-switch]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].dataset.themeState = state;
    }
    var labels = document.querySelectorAll("[data-theme-label]");
    for (var j = 0; j < labels.length; j++) {
      labels[j].textContent = state;
    }
  }

  function init() {
    apply(readStored());
    var buttons = document.querySelectorAll("[data-theme-switch]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var idx = STATES.indexOf(readStored());
        apply(STATES[(idx + 1) % STATES.length]);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
