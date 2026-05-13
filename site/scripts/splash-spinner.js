// Splash spinner — Five-Petal Spiral.
// Source: https://paidax01.github.io/math-curve-loaders/ (Five-Petal Spiral).
// Served as /scripts/splash-spinner.js so CSP `script-src 'self'` covers it
// without a hash pin — keeping the spinner editable doesn't churn the CSP.
//
// Honors `prefers-reduced-motion: reduce` by rendering one static frame
// and exiting the rAF loop.
(function () {
  "use strict";
  var SVG_NS = "http://www.w3.org/2000/svg";

  var config = {
    particleCount: 85,
    trailSpan: 0.3,
    durationMs: 5000,
    rotationDurationMs: 60000,
    pulseDurationMs: 5000,
    strokeWidth: 2.5,
    spiralR: 5,
    spiralr: 1,
    spirald: 2.5,
    spiralScale: 3,
    spiralBreath: 0.25,
  };

  function point(progress, detailScale) {
    var t = progress * Math.PI * 2;
    var d = config.spirald + detailScale * 0.25;
    var k = (config.spiralR - config.spiralr) / config.spiralr;
    var baseX =
      (config.spiralR - config.spiralr) * Math.cos(t) + d * Math.cos(k * t);
    var baseY =
      (config.spiralR - config.spiralr) * Math.sin(t) - d * Math.sin(k * t);
    var scale = config.spiralScale + detailScale * config.spiralBreath;
    return { x: 50 + baseX * scale, y: 50 + baseY * scale };
  }

  function normalize(p) {
    return ((p % 1) + 1) % 1;
  }

  function buildPath(detailScale, steps) {
    steps = steps || 480;
    var parts = [];
    for (var i = 0; i <= steps; i++) {
      var p = point(i / steps, detailScale);
      parts.push((i === 0 ? "M" : "L") + " " + p.x.toFixed(2) + " " + p.y.toFixed(2));
    }
    return parts.join(" ");
  }

  function init() {
    var group = document.querySelector("[data-splash-group]");
    var path = document.querySelector("[data-splash-path]");
    if (!group || !path) return;
    path.setAttribute("stroke-width", String(config.strokeWidth));

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var particles = [];
    for (var i = 0; i < config.particleCount; i++) {
      var c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("fill", "currentColor");
      group.appendChild(c);
      particles.push(c);
    }

    function renderFrame(time) {
      var progress = (time % config.durationMs) / config.durationMs;
      var pulseProgress = (time % config.pulseDurationMs) / config.pulseDurationMs;
      var detailScale =
        0.52 + ((Math.sin(pulseProgress * Math.PI * 2 + 0.55) + 1) / 2) * 0.48;
      var rotation = -((time % config.rotationDurationMs) / config.rotationDurationMs) * 360;
      group.setAttribute("transform", "rotate(" + rotation + " 50 50)");
      path.setAttribute("d", buildPath(detailScale));
      for (var j = 0; j < particles.length; j++) {
        var tail = j / (particles.length - 1);
        var pt = point(normalize(progress - tail * config.trailSpan), detailScale);
        var fade = Math.pow(1 - tail, 0.56);
        particles[j].setAttribute("cx", pt.x.toFixed(2));
        particles[j].setAttribute("cy", pt.y.toFixed(2));
        particles[j].setAttribute("r", (0.9 + fade * 2.7).toFixed(2));
        particles[j].setAttribute("opacity", (0.04 + fade * 0.96).toFixed(3));
      }
    }

    if (reduceMotion) {
      renderFrame(0);
      return;
    }

    var startedAt = performance.now();
    function loop(now) {
      renderFrame(now - startedAt);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
