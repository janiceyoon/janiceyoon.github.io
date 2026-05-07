(function () {
  /**
   * Prev/next project in the same grid the visitor came from (referrer),
   * else first matching series on this site. Filenames are relative to /Website/.
   * sessionStorage keeps the same series while moving project → project (arrows).
   * Prev/next stop at the ends of that list (no wrap into other categories).
   */
  var SESSION_KEY = "jyoon-artwork-nav-series";
  var RETURN_KEY = "jyoon-project-return-url";

  /** Referrer substring → href from /Website/ root (same as project pages). */
  var LISTING_RETURN = [
    [/photography\.html/i, "creatives/photography.html"],
    [/publications\.html/i, "creatives/publications.html"],
    [/design\.html/i, "creatives/design.html"],
    [/graphics\.html/i, "creatives/graphics.html"],
    [/videography\.html/i, "creatives/videography.html"],
    [/portfolio\.html/i, "portfolio.html"],
    [/flute-series\.html/i, "creatives/flute-series.html"],
    [/installations\.html/i, "creatives/installations.html"],
    [/illustration\.html/i, "creatives/illustration.html"],
    [/creatives[/\\]index\.html/i, "creatives/index.html"],
    [/web\.html/i, "creatives/web.html"],
    [/index\.html/i, "index.html"],
  ];

  /** When no saved return URL, send user to the hub for the active series. */
  var SERIES_TO_LISTING = {
    photography: "creatives/photography.html",
    publications: "creatives/publications.html",
    design: "creatives/design.html",
    graphics: "creatives/graphics.html",
    videography: "creatives/videography.html",
    portfolio: "portfolio.html",
    homeHighlights: "index.html",
    fluteSeries: "creatives/flute-series.html",
    installations: "creatives/installations.html",
    illustration: "creatives/illustration.html",
    creativesIndex: "creatives/index.html",
    web: "creatives/web.html",
  };

  var SERIES = {
    photography: [
      "project-28.html",
      "project-4.html",
      "project-1.html",
      "project-3.html",
      "project-2.html",
    ],
    publications: [
      "project-1.html",
      "project-usc-gssc-pitch-2026.html",
      "project-27.html",
      "project-26.html",
      "project-3.html",
      "project-2.html",
    ],
    design: [
      "project-40.html",
      "project-skinmap.html",
      "project-37.html",
      "project-46.html",
      "project-42.html",
      "project-22.html",
      "project-39.html",
      "project-38.html",
      "project-41.html",
      "project-44.html",
      "project-43.html",
      "project-5.html",
      "project-8.html",
      "project-10.html",
      "project-12.html",
    ],
    homeHighlights: [
      "project-37.html",
      "project-2.html",
      "project-28.html",
      "project-5.html",
      "project-3.html",
      "project-6.html",
      "project-34.html",
      "project-20.html",
      "project-8.html",
      "project-7.html",
      "project-4.html",
      "project-10.html",
      "project-11.html",
      "project-12.html",
      "project-13.html",
      "project-19.html",
      "project-14.html",
      "project-16.html",
      "project-18.html",
      "project-9.html",
    ],
    portfolio: [
      "project-1.html",
      "project-2.html",
      "project-28.html",
      "project-5.html",
      "project-3.html",
      "project-6.html",
      "project-34.html",
      "project-20.html",
      "project-8.html",
      "project-7.html",
      "project-4.html",
      "project-10.html",
      "project-11.html",
      "project-12.html",
      "project-13.html",
      "project-19.html",
      "project-14.html",
      "project-16.html",
      "project-18.html",
      "project-9.html",
    ],
    graphics: [
      "project-5.html",
      "project-8.html",
      "project-10.html",
      "project-12.html",
    ],
    videography: ["project-20.html"],
    fluteSeries: [
      "project-32.html",
      "project-6.html",
      "project-9.html",
      "project-11.html",
      "project-13.html",
      "project-34.html",
      "project-35.html",
      "project-7.html",
      "project-36.html",
      "project-33.html",
      "project-30.html",
      "project-18.html",
      "project-14.html",
      "project-16.html",
    ],
    installations: [
      "project-31.html",
      "project-6.html",
      "project-9.html",
      "project-11.html",
      "project-13.html",
      "project-19.html",
      "project-14.html",
      "project-16.html",
      "project-18.html",
      "project-20.html",
    ],
    illustration: [
      "project-32.html",
      "project-34.html",
      "project-35.html",
      "project-7.html",
      "project-29.html",
      "project-36.html",
      "project-11.html",
      "project-33.html",
      "project-30.html",
    ],
    creativesIndex: [
      "project-31.html",
      "project-6.html",
      "project-9.html",
      "project-11.html",
      "project-13.html",
      "project-19.html",
      "project-14.html",
      "project-16.html",
      "project-18.html",
      "project-20.html",
      "project-32.html",
      "project-34.html",
      "project-35.html",
      "project-7.html",
      "project-36.html",
      "project-33.html",
      "project-30.html",
    ],
    web: ["project-skinmap.html"],
  };

  var REF_RULES = [
    [/photography\.html/i, "photography"],
    [/publications\.html/i, "publications"],
    [/design\.html/i, "design"],
    [/graphics\.html/i, "graphics"],
    [/videography\.html/i, "videography"],
    [/portfolio\.html/i, "portfolio"],
    [/flute-series\.html/i, "fluteSeries"],
    [/installations\.html/i, "installations"],
    [/illustration\.html/i, "illustration"],
    [/creatives[/\\]index\.html/i, "creativesIndex"],
    [/web\.html/i, "web"],
    [/index\.html/i, "homeHighlights"],
  ];

  /* When referrer is missing/ambiguous, prefer the work's primary category
     before broad aggregates (portfolio / homepage). This keeps "next work"
     aligned with the category grid ordering. */
  var FALLBACK_PRIORITY = [
    "design",
    "photography",
    "publications",
    "graphics",
    "videography",
    "fluteSeries",
    "installations",
    "illustration",
    "web",
    "creativesIndex",
    "portfolio",
    "homeHighlights",
  ];

  function currentFilename() {
    var path = (window.location.pathname || "").replace(/\\/g, "/");
    var m = path.match(/(project-(?:usc-gssc-pitch-2026|skinmap|\d+)\.html)$/i);
    return m ? m[1].toLowerCase() : null;
  }

  function referrerProjectFilename(ref) {
    if (!ref) return null;
    var m = ref.match(/(project-(?:usc-gssc-pitch-2026|skinmap|\d+)\.html)/i);
    return m ? m[1].toLowerCase() : null;
  }

  /**
   * If the visitor moved between two projects and only one category lists them
   * as immediate neighbors, use that category (avoids jumping into portfolio, etc.).
   */
  function inferSeriesFromNeighbor(refFile, curFile) {
    if (!refFile || !curFile || refFile === curFile) return null;
    var keys = Object.keys(SERIES);
    var matches = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var order = SERIES[key];
      if (!order || !order.length) continue;
      var ir = order.indexOf(refFile);
      var ic = order.indexOf(curFile);
      if (ir < 0 || ic < 0) continue;
      if (Math.abs(ir - ic) !== 1) continue;
      matches.push(key);
    }
    if (matches.length === 1) return matches[0];
    return null;
  }

  function isListingReferrer(ref) {
    return (
      /photography\.html/i.test(ref) ||
      /publications\.html/i.test(ref) ||
      /portfolio\.html/i.test(ref) ||
      /graphics\.html/i.test(ref) ||
      /design\.html/i.test(ref) ||
      /web\.html/i.test(ref) ||
      /videography\.html/i.test(ref) ||
      /flute-series\.html/i.test(ref) ||
      /installations\.html/i.test(ref) ||
      /illustration\.html/i.test(ref) ||
      /creatives[/\\]index\.html/i.test(ref) ||
      (/\/index\.html/i.test(ref) && !/\/creatives\//i.test(ref))
    );
  }

  function isProjectReferrer(ref) {
    return /project-(?:usc-gssc-pitch-2026|skinmap|\d+)\.html/i.test(ref);
  }

  function listingReturnHref(ref) {
    if (!ref) return null;
    var f = ref.replace(/\\/g, "/");
    for (var i = 0; i < LISTING_RETURN.length; i++) {
      if (LISTING_RETURN[i][0].test(f)) return LISTING_RETURN[i][1];
    }
    return null;
  }

  function getExitHref(seriesKey) {
    try {
      var stored = sessionStorage.getItem(RETURN_KEY);
      if (stored) return stored;
    } catch (e) {}
    if (seriesKey && SERIES_TO_LISTING[seriesKey]) return SERIES_TO_LISTING[seriesKey];
    return "portfolio.html";
  }

  function injectExitButton(main, href) {
    if (!main || !href) return;
    if (main.querySelector(".project-exit")) return;
    var a = document.createElement("a");
    a.className = "project-exit";
    a.href = href;
    a.setAttribute("aria-label", "Close and return to gallery");
    a.appendChild(document.createTextNode("\u00d7"));
    main.appendChild(a);
  }

  function pickSeriesKey(filename, ref) {
    ref = ref || "";
    var i;
    var k;

    try {
      if (isListingReferrer(ref)) {
        sessionStorage.removeItem(SESSION_KEY);
      } else if (isProjectReferrer(ref)) {
        var saved = sessionStorage.getItem(SESSION_KEY);
        if (saved && SERIES[saved] && SERIES[saved].indexOf(filename) >= 0) {
          return saved;
        }
        var refFile = referrerProjectFilename(ref);
        if (refFile) {
          var inferred = inferSeriesFromNeighbor(refFile, filename);
          if (inferred) return inferred;
        }
      }
    } catch (e) {}

    for (i = 0; i < REF_RULES.length; i++) {
      if (REF_RULES[i][0].test(ref)) {
        k = REF_RULES[i][1];
        if (SERIES[k] && SERIES[k].indexOf(filename) >= 0) return k;
      }
    }

    if (/\/creatives\//i.test(ref)) {
      k = "creativesIndex";
      if (SERIES[k] && SERIES[k].indexOf(filename) >= 0) return k;
    }

    for (i = 0; i < FALLBACK_PRIORITY.length; i++) {
      k = FALLBACK_PRIORITY[i];
      if (SERIES[k] && SERIES[k].indexOf(filename) >= 0) return k;
    }
    return null;
  }

  function setNavInset(nav) {
    var sb = document.querySelector(".site-sidebar");
    var w = sb && sb.offsetWidth ? sb.offsetWidth + 16 : 240;
    nav.style.setProperty("--artwork-jump-inset", w + "px");
  }

  function inject() {
    var filename = currentFilename();
    if (!filename) return;

    var main = document.querySelector(".site-shell-main");
    if (!main) return;

    var ref = document.referrer || "";
    if (isListingReferrer(ref)) {
      var listHref = listingReturnHref(ref);
      if (listHref) {
        try {
          sessionStorage.setItem(RETURN_KEY, listHref);
        } catch (e) {}
      }
    }

    var seriesKey = pickSeriesKey(filename, ref);
    try {
      if (seriesKey) sessionStorage.setItem(SESSION_KEY, seriesKey);
    } catch (e) {}

    injectExitButton(main, getExitHref(seriesKey));

    if (!seriesKey) return;

    var order = SERIES[seriesKey];
    var idx = order.indexOf(filename);
    if (idx < 0) return;

    var prevHref = idx > 0 ? order[idx - 1] : null;
    var nextHref = idx < order.length - 1 ? order[idx + 1] : null;
    if (!prevHref && !nextHref) return;

    var nav = document.createElement("nav");
    nav.className = "artwork-jump-nav";
    nav.setAttribute("aria-label", "Adjacent projects in this collection");

    if (prevHref) {
      var aPrev = document.createElement("a");
      aPrev.className = "artwork-jump-link artwork-jump-link--prev";
      aPrev.href = prevHref;
      aPrev.setAttribute("aria-label", "Previous artwork");
      aPrev.appendChild(document.createTextNode("\u2039"));
      nav.appendChild(aPrev);
    }
    if (nextHref) {
      var aNext = document.createElement("a");
      aNext.className = "artwork-jump-link artwork-jump-link--next";
      aNext.href = nextHref;
      aNext.setAttribute("aria-label", "Next artwork");
      aNext.appendChild(document.createTextNode("\u203a"));
      nav.appendChild(aNext);
    }

    main.appendChild(nav);
    setNavInset(nav);
    window.addEventListener(
      "resize",
      function () {
        setNavInset(nav);
      },
      { passive: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
