(function () {
  try {
    if (localStorage.getItem("jy-cursor") === "pearl") {
      localStorage.setItem("jy-cursor", "bubble");
    }
  } catch (e) {}

  var STORAGE_KEY = "jy-cursor";
  var LEGACY_CHERRY_KEY = "jy-cherry-cursor";
  /** Legacy toggle from when this theme was named "pearl" (now bubble cursor). */
  var LEGACY_PEARL_KEY = "jy-pearl-cursor";
  var LEGACY_PLUMERIA_KEY = "jy-plumeria-cursor";

  /** Same toggle + storage behavior for every theme (parity with original cherry). */
  var THEMES = [
    { id: "cherry", btnClass: "site-sidebar-cherry", label: "Cherry" },
    { id: "plumeria", btnClass: "site-sidebar-plumeria", label: "Plumeria" },
    { id: "sakura", btnClass: "site-sidebar-sakura", label: "Sakura" },
    { id: "bubble", btnClass: "site-sidebar-bubble", label: "Bubble" },
  ];

  function getTheme() {
    return document.documentElement.getAttribute("data-cursor");
  }

  function themeFromButton(el) {
    if (!el || !el.classList) return null;
    for (var i = 0; i < THEMES.length; i++) {
      if (el.classList.contains(THEMES[i].btnClass)) return THEMES[i].id;
    }
    return null;
  }

  function clearLegacyKeys() {
    try {
      localStorage.removeItem(LEGACY_CHERRY_KEY);
      localStorage.removeItem(LEGACY_PEARL_KEY);
      localStorage.removeItem(LEGACY_PLUMERIA_KEY);
    } catch (e) {}
  }

  function syncButtons() {
    var cur = getTheme();
    THEMES.forEach(function (t) {
      var on = cur === t.id;
      var label = t.label;
      document.querySelectorAll("." + t.btnClass).forEach(function (el) {
        el.setAttribute("aria-pressed", on ? "true" : "false");
        el.setAttribute(
          "aria-label",
          on
            ? label + " cursor on — click for normal mouse"
            : label + " cursor off — click for " + label.toLowerCase() + " mouse"
        );
      });
    });
  }

  function ensureClickMeHint() {
    var host = document.querySelector(".site-sidebar-cursor-cta");
    if (!host) return;
    if (host.querySelector(".site-sidebar-cursor-hint")) return;
    var hint = document.createElement("p");
    hint.className = "site-sidebar-cursor-hint";
    hint.textContent = "click me!";
    host.appendChild(hint);
  }

  function setTheme(name) {
    var root = document.documentElement;
    if (!name) {
      root.removeAttribute("data-cursor");
      try {
        localStorage.removeItem(STORAGE_KEY);
        clearLegacyKeys();
      } catch (e) {}
    } else {
      root.setAttribute("data-cursor", name);
      try {
        localStorage.setItem(STORAGE_KEY, name);
        clearLegacyKeys();
      } catch (e) {}
    }
    syncButtons();
    ensureClickMeHint();
  }

  var CURSOR_BTN_SELECTOR = THEMES.map(function (t) {
    return "." + t.btnClass;
  }).join(", ");

  document.addEventListener(
    "click",
    function (e) {
      var t =
        e.target &&
        e.target.closest &&
        e.target.closest(CURSOR_BTN_SELECTOR);
      if (!t) return;
      e.preventDefault();
      var name = themeFromButton(t);
      if (!name) return;
      if (getTheme() === name) setTheme(null);
      else setTheme(name);
    },
    false
  );

  syncButtons();
  ensureClickMeHint();
})();

/* Sidebar nav: last hovered link stays pink + bold until pointer leaves the nav (not just the text box) */
(function () {
  function bind() {
    var sidebar = document.querySelector(".site-shell .site-sidebar");
    var nav = sidebar && sidebar.querySelector(".site-sidebar-nav");
    if (!sidebar || !nav) return;

    function clearSticky() {
      nav.querySelectorAll("a.site-sidebar-sticky-hover").forEach(function (el) {
        el.classList.remove("site-sidebar-sticky-hover");
      });
    }

    nav.addEventListener(
      "pointerover",
      function (e) {
        var a = e.target.closest && e.target.closest("a");
        if (!a || !nav.contains(a)) return;
        clearSticky();
        a.classList.add("site-sidebar-sticky-hover");
      },
      false
    );

    nav.addEventListener(
      "pointerleave",
      function (e) {
        var rel = e.relatedTarget;
        if (rel && nav.contains(rel)) return;
        clearSticky();
      },
      false
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, false);
  } else {
    bind();
  }
})();

/* Keep sidebar scroll position across internal navigations so nav type stays in the same place */
(function () {
  var KEY = "jy-sidebar-scroll-y";

  function getSidebar() {
    return document.querySelector(".site-shell .site-sidebar");
  }

  function save() {
    var sb = getSidebar();
    if (!sb) return;
    try {
      sessionStorage.setItem(KEY, String(Math.round(sb.scrollTop)));
    } catch (e) {}
  }

  function restore() {
    var sb = getSidebar();
    if (!sb) return;
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw == null || raw === "") return;
      var y = parseInt(raw, 10);
      if (isNaN(y) || y < 0) return;
      requestAnimationFrame(function () {
        var max = Math.max(0, sb.scrollHeight - sb.clientHeight);
        sb.scrollTop = Math.min(y, max);
      });
    } catch (e) {}
  }

  var debTimer = null;
  function debouncedSave() {
    if (debTimer) clearTimeout(debTimer);
    debTimer = setTimeout(save, 80);
  }

  function bind() {
    var sb = getSidebar();
    if (!sb) return;
    restore();
    sb.addEventListener("scroll", debouncedSave, { passive: true });
    window.addEventListener("pagehide", save, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, false);
  } else {
    bind();
  }
})();

/* Prefetch same-origin pages on hover for snappier clicks (ignored if unsupported) */
(function () {
  var prefetched = Object.create(null);

  function prefetchHref(href) {
    if (!href || prefetched[href]) return;
    prefetched[href] = true;
    try {
      var l = document.createElement("link");
      l.rel = "prefetch";
      l.href = href;
      l.as = "document";
      document.head.appendChild(l);
    } catch (e) {}
  }

  function onPointerEnter(e) {
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a || !a.href) return;
    try {
      var u = new URL(a.href, window.location.href);
      if (u.origin !== window.location.origin) return;
      if (u.pathname === window.location.pathname && u.search === window.location.search) return;
      prefetchHref(u.href);
    } catch (err) {}
  }

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      document.querySelectorAll(
        ".site-sidebar-nav, .home-narrative-cover-stack, .home-highlights-heading"
      ).forEach(function (root) {
        root.addEventListener("pointerenter", onPointerEnter, true);
      });
    },
    false
  );
})();
