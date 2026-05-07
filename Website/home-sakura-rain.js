(function () {
  function assetUrl(pathFromSiteRoot) {
    try {
      var p = location.pathname || "";
      if (/\/creatives\//.test(p) || /\/creatives\/?$/.test(p)) {
        return "../" + pathFromSiteRoot;
      }
    } catch (e) {}
    return pathFromSiteRoot;
  }

  var root = document.getElementById("home-sakura-rain");
  if (!root) return;

  var prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  var petalSrc = assetUrl("assets/home-sakura-rain-petal.png?v=2");

  var N = 28;
  for (var i = 0; i < N; i++) {
    var wrap = document.createElement("span");
    wrap.className = "home-sakura-flake";

    var left = 4 + Math.random() * 88;
    var delay = -(Math.random() * 16);
    var dur = 7.5 + Math.random() * 8.5;
    /* ~78% small petals; ~22% noticeably larger */
    var w;
    if (Math.random() < 0.78) {
      w = 14 + Math.random() * 16;
    } else {
      w = 34 + Math.random() * 38;
    }

    wrap.style.left = left + "%";
    wrap.style.animationDelay = delay + "s";
    wrap.style.animationDuration = dur + "s";
    wrap.style.setProperty("--flake-w", w + "px");
    wrap.style.setProperty(
      "--rz0",
      (-18 + Math.random() * 36).toFixed(2) + "deg"
    );
    wrap.style.setProperty(
      "--rz1",
      (18 + Math.random() * 48).toFixed(2) + "deg"
    );
    wrap.style.setProperty(
      "--rx0",
      (28 + Math.random() * 22).toFixed(2) + "deg"
    );
    wrap.style.setProperty(
      "--rx1",
      (-4 + Math.random() * 16).toFixed(2) + "deg"
    );
    wrap.style.setProperty(
      "--ry0",
      (-22 + Math.random() * 16).toFixed(2) + "deg"
    );
    wrap.style.setProperty(
      "--ry1",
      (8 + Math.random() * 28).toFixed(2) + "deg"
    );

    var img = document.createElement("img");
    img.className = "home-sakura-flake-img";
    img.src = petalSrc;
    img.alt = "";
    img.width = 512;
    img.height = 341;
    img.decoding = "async";
    img.draggable = false;
    wrap.appendChild(img);
    root.appendChild(wrap);
  }
})();
