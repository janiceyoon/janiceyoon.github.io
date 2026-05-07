(function () {
  /** True only on index.html (hero + main.home-narrative-main), not creatives hub. */
  function isHomeIndexWithNarrativeMain() {
    try {
      return (
        document.body &&
        document.body.classList.contains("home-narrative") &&
        !!document.querySelector("main.home-narrative-main")
      );
    } catch (e) {
      return false;
    }
  }

  function isCreativesPath() {
    var p = "";
    try {
      p = (window.location.pathname || "").replace(/\\/g, "/");
    } catch (e) {}
    var parts = p.split("/").filter(function (s) {
      return s.length > 0;
    });
    for (var i = 0; i < parts.length; i++) {
      if (String(parts[i]).toLowerCase() === "creatives") return true;
    }
    return false;
  }

  /** Same CD vertical slot as creatives category pages (not the real homepage hero). */
  function useCdRailUpLayout() {
    if (isHomeIndexWithNarrativeMain()) return false;
    if (isCreativesPath()) return true;
    try {
      return !!(document.body && document.body.classList.contains("about-page"));
    } catch (e) {
      return false;
    }
  }

  if (document.getElementById("site-cd-center")) return;

  if (useCdRailUpLayout()) {
    try {
      document.documentElement.setAttribute("data-cd-rail-up", "");
    } catch (e2) {}
  }

  /* Half-disc: fixed viewport slot (CSS); only the disc *rotates* — position never re-measured on resize/load */
  var spinSeconds = 11;
  var SPIN_MIN = 1.85;
  var SPIN_FACTOR = 0.72;
  /** Hover: gentle nudge — never jump to an extreme speed; calm the disc if it was already very fast */
  var HOVER_MULT = 0.93;
  var HOVER_CALM_FLOOR = 6.15;

  function cdSrc() {
    return (isCreativesPath() ? "../" : "") + "assets/home-cd.png?v=1";
  }

  var wrap = document.createElement("div");
  wrap.id = "site-cd-center";
  wrap.className = "site-cd-wrap";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "site-cd-btn";
  btn.id = "site-cd-center-disc";
  btn.setAttribute("aria-label", "Spinning CD — hover for a subtle speed change; click to speed up a little");

  var clip = document.createElement("span");
  clip.className = "site-cd-clip";

  var img = document.createElement("img");
  img.className = "site-cd-img";
  img.src = cdSrc();
  img.alt = "";
  img.width = 320;
  img.height = 320;
  img.decoding = "async";
  img.draggable = false;

  clip.appendChild(img);
  btn.appendChild(clip);
  wrap.appendChild(btn);

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function hoverSpinSeconds(base) {
    var b = Math.max(SPIN_MIN, base);
    var eased = b * HOVER_MULT;
    if (b < HOVER_CALM_FLOOR) return Math.max(eased, HOVER_CALM_FLOOR);
    return Math.max(SPIN_MIN, eased);
  }

  /** Sidebar rail labels (Creatives → … → Flute series), top-to-bottom order */
  function cdRailPulseTargets() {
    var nav = document.querySelector(".site-sidebar-nav");
    if (!nav) return [];
    var creatives = nav.querySelector("#lbl-sidebar-creatives");
    var group = creatives ? creatives.closest(".site-sidebar-group") : null;
    var subLinks = group ? group.querySelectorAll(".site-sidebar-sublist .site-sidebar-link") : [];
    var design = nav.querySelector("#lbl-sidebar-design");
    var seriesUl = nav.querySelector(":scope > ul:nth-child(3)");
    var seriesLinks = seriesUl ? seriesUl.querySelectorAll(":scope > li > a.site-sidebar-link") : [];
    var out = [];
    if (creatives) out.push(creatives);
    if (design) out.push(design);
    for (var i = 0; i < subLinks.length; i++) out.push(subLinks[i]);
    for (var j = 0; j < seriesLinks.length; j++) out.push(seriesLinks[j]);
    return out;
  }

  var railPulseTimer = null;
  var railPulseIndex = 0;

  function clearCdRailPulse() {
    if (railPulseTimer) {
      clearInterval(railPulseTimer);
      railPulseTimer = null;
    }
    try {
      document.querySelectorAll(".site-cd-rail-pop").forEach(function (n) {
        n.classList.remove("site-cd-rail-pop");
      });
    } catch (e) {}
  }

  function syncCdSpinVarToRoot() {
    try {
      if (prefersReducedMotion()) {
        document.documentElement.style.removeProperty("--site-cd-spin-duration");
        return;
      }
      var s = img.style.getPropertyValue("--site-cd-spin-duration");
      if (s) document.documentElement.style.setProperty("--site-cd-spin-duration", s);
    } catch (e2) {}
  }

  function railPulseStep() {
    var els = cdRailPulseTargets();
    if (!els.length) return;
    railPulseIndex = railPulseIndex % els.length;
    for (var i = 0; i < els.length; i++) {
      els[i].classList.toggle("site-cd-rail-pop", i === railPulseIndex);
    }
    railPulseIndex = (railPulseIndex + 1) % els.length;
  }

  function restartCdRailPulse() {
    clearCdRailPulse();
    if (prefersReducedMotion()) return;
    var els = cdRailPulseTargets();
    if (els.length < 5) return;
    var periodStr = img.style.getPropertyValue("--site-cd-spin-duration") || spinSeconds + "s";
    var period = parseFloat(periodStr, 10);
    if (!period || period < SPIN_MIN) period = Math.max(SPIN_MIN, spinSeconds);
    var intervalMs = Math.max(130, (period * 1000) / els.length);
    railPulseIndex = 0;
    railPulseStep();
    railPulseTimer = setInterval(railPulseStep, intervalMs);
  }

  function ensureCdSpinAnimation() {
    var a = img.style.animation || "";
    if (a.indexOf("site-cd-spin") === -1) {
      img.style.animation =
        "site-cd-spin var(--site-cd-spin-duration, 11s) linear infinite";
    }
  }

  function applySpinDuration() {
    if (prefersReducedMotion()) {
      clearCdRailPulse();
      try {
        document.documentElement.style.removeProperty("--site-cd-spin-duration");
      } catch (e) {}
      return;
    }
    var dur = Math.max(SPIN_MIN, spinSeconds);
    img.style.setProperty("--site-cd-spin-duration", dur + "s");
    ensureCdSpinAnimation();
    syncCdSpinVarToRoot();
    restartCdRailPulse();
  }

  /** Only retime spin (CSS transitions --site-cd-spin-duration). Do not reset animation or rail pulse — avoids hover glitch. */
  function applyHoverSpin() {
    if (prefersReducedMotion()) return;
    var dur = hoverSpinSeconds(spinSeconds);
    img.style.setProperty("--site-cd-spin-duration", dur + "s");
    syncCdSpinVarToRoot();
  }

  var cdPointerOver = false;

  btn.addEventListener(
    "click",
    function () {
      if (prefersReducedMotion()) return;
      spinSeconds = Math.max(SPIN_MIN, spinSeconds * SPIN_FACTOR);
      applySpinDuration();
    },
    { passive: true }
  );

  btn.addEventListener(
    "pointerenter",
    function () {
      if (cdPointerOver) return;
      cdPointerOver = true;
      applyHoverSpin();
    },
    { passive: true }
  );
  btn.addEventListener(
    "pointerleave",
    function () {
      cdPointerOver = false;
      applySpinDuration();
    },
    { passive: true }
  );

  var sidebarMount = document.querySelector(".site-sidebar");
  if (sidebarMount) {
    sidebarMount.insertBefore(wrap, sidebarMount.firstChild);
  } else {
    document.body.appendChild(wrap);
  }

  applySpinDuration();

  /** CD: left edge, vertically centered on Creatives→Flute cluster (overlaps rail type) */
  var alignCdRaf = null;
  function alignCdToCreativesCluster() {
    if (!btn) return;
    var nav = document.querySelector(".site-sidebar-nav");
    if (!nav) {
      try {
        btn.style.removeProperty("top");
      } catch (e0) {}
      return;
    }
    var lists = nav.querySelectorAll(":scope > ul");
    if (lists.length >= 3) {
      var r2 = lists[1].getBoundingClientRect();
      var r3 = lists[2].getBoundingClientRect();
      var top = Math.min(r2.top, r3.top);
      var bottom = Math.max(r2.bottom, r3.bottom);
      var cy = (top + bottom) / 2;
      btn.style.top = cy + "px";
      return;
    }
    var r = nav.getBoundingClientRect();
    btn.style.top = r.top + r.height / 2 + "px";
  }

  /** Homepage / About fully above the disc (margin on first list; CD re-centers on Creatives+Flute). */
  function syncHomeAboutAboveCd() {
    var nav = document.querySelector(".site-sidebar-nav");
    if (!nav || !btn) return;
    var lists = nav.querySelectorAll(":scope > ul");
    if (lists.length < 3) {
      try {
        if (lists[0]) lists[0].style.removeProperty("margin-bottom");
      } catch (e0) {}
      return;
    }
    var first = lists[0];
    try {
      first.style.removeProperty("margin-bottom");
    } catch (eRm) {}
    alignCdToCreativesCluster();
    var gapPx = 12;
    var totalMb = 0;
    for (var iter = 0; iter < 10; iter++) {
      var cdTop = btn.getBoundingClientRect().top;
      var firstBottom = first.getBoundingClientRect().bottom;
      if (firstBottom + gapPx <= cdTop + 0.5) break;
      var step = Math.min(28, Math.ceil(firstBottom + gapPx - cdTop));
      if (step < 4) break;
      totalMb += step;
      first.style.marginBottom = totalMb + "px";
      alignCdToCreativesCluster();
    }
    if (totalMb === 0) {
      try {
        first.style.removeProperty("margin-bottom");
      } catch (e1) {}
    }
  }

  function scheduleAlignCd() {
    if (alignCdRaf != null) cancelAnimationFrame(alignCdRaf);
    alignCdRaf = requestAnimationFrame(function () {
      alignCdRaf = null;
      alignCdToCreativesCluster();
      syncHomeAboutAboveCd();
    });
  }

  scheduleAlignCd();
  window.addEventListener("load", scheduleAlignCd, { passive: true });
  window.addEventListener("resize", scheduleAlignCd, { passive: true });

  try {
    if (typeof ResizeObserver !== "undefined") {
      var roNav = new ResizeObserver(scheduleAlignCd);
      var navEl = document.querySelector(".site-sidebar-nav");
      if (navEl) roNav.observe(navEl);
      if (sidebarMount) roNav.observe(sidebarMount);
    }
  } catch (eRo) {}

  try {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleAlignCd);
    }
  } catch (eFonts) {}

  /** Rail “Design” row — stable id across all pages */
  try {
    if (window.matchMedia) {
      var mqRm = window.matchMedia("(prefers-reduced-motion: reduce)");
      function onRmChange() {
        if (mqRm.matches) clearCdRailPulse();
        else applySpinDuration();
      }
      if (mqRm.addEventListener) mqRm.addEventListener("change", onRmChange);
      else if (mqRm.addListener) mqRm.addListener(onRmChange);
    }
  } catch (e3) {}
})();
