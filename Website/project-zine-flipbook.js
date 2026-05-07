(async function () {
  var root = document.querySelector("[data-zine-flipbook]");
  if (!root) return;

  var wrap = root.querySelector(".zine-flipbook__stack");
  var btnPrev = root.querySelector("[data-zine-prev]");
  var btnNext = root.querySelector("[data-zine-next]");
  var label = root.querySelector("[data-zine-counter]");
  var thumbsHost = root.querySelector("[data-zine-thumbs]");
  if (!wrap || !btnPrev || !btnNext || !label) return;

  function parsePageList() {
    try {
      return JSON.parse(root.getAttribute("data-pages") || "[]");
    } catch (e) {
      return [];
    }
  }

  /**
   * Default: consecutive spreads (0–1), (2–3), … + trailing single if odd.
   * With data-zine-cover-solo on root: cover alone (0), then (1–2), (3–4), … + trailing single if needed.
   */
  function buildViewsFromCount(count) {
    var out = [];
    if (!count) return out;
    var coverSolo = root.hasAttribute("data-zine-cover-solo");
    if (!coverSolo) {
      var j = 0;
      while (j < count) {
        if (j === count - 1) {
          out.push({ type: "single", indices: [j] });
          break;
        }
        out.push({ type: "spread", indices: [j, j + 1] });
        j += 2;
      }
      return out;
    }
    if (count === 1) {
      out.push({ type: "single", indices: [0] });
      return out;
    }
    out.push({ type: "single", indices: [0] });
    var i = 1;
    while (i < count) {
      if (i === count - 1) {
        out.push({ type: "single", indices: [i] });
        break;
      }
      out.push({ type: "spread", indices: [i, i + 1] });
      i += 2;
    }
    return out;
  }

  function describeView(view, viewIdx, totalViews) {
    var step = viewIdx + 1;
    var counterPages = root.hasAttribute("data-zine-counter-pages");
    if (counterPages) {
      if (view.type === "single") return String(view.indices[0] + 1) + " / " + pageCount;
      return String(view.indices[0] + 1) + "–" + String(view.indices[1] + 1) + " / " + pageCount;
    }
    if (view.type === "single" && view.indices[0] === 0) return step + " / " + totalViews + " · Cover";
    if (view.type === "single") return step + " / " + totalViews + " · Page " + (view.indices[0] + 1);
    return step + " / " + totalViews + " · Pages " + (view.indices[0] + 1) + "–" + (view.indices[1] + 1);
  }

  var pdfUrl = root.getAttribute("data-pdf") || "";
  var fallbackUrls = parsePageList();
  var displayPngOnly = root.hasAttribute("data-zine-display-png");
  var spreadHalfTurn = root.hasAttribute("data-zine-spread-half-turn");
  /** PNG booklets: load all page images eagerly so spreads are not blank while flipping */
  var eagerPageLoading = displayPngOnly;
  var sourceType = "fallback";
  var pageCount = fallbackUrls.length;
  var pdf = null;
  var pdfjsLib = null;

  if (displayPngOnly && fallbackUrls.length > 0) {
    pageCount = fallbackUrls.length;
    sourceType = "fallback";
    pdf = null;
  } else if (pdfUrl && typeof window.pdfjsLib !== "undefined") {
    try {
      label.textContent = "Loading booklet...";
      pdfjsLib = window.pdfjsLib;
      if (typeof pdfjsLib.GlobalWorkerOptions !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
      var loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
      pdf = await loadingTask.promise;
      pageCount = pdf.numPages;
      sourceType = "pdf";
      if (fallbackUrls.length > 0) {
        if (pageCount > fallbackUrls.length) {
          pageCount = fallbackUrls.length;
        } else if (pageCount < fallbackUrls.length) {
          pdf = null;
          pageCount = fallbackUrls.length;
          sourceType = "fallback";
        }
      }
    } catch (e) {
      pdf = null;
      label.textContent = "";
    }
  }

  if (!pageCount) {
    label.textContent = "Unable to load booklet pages.";
    btnPrev.disabled = true;
    btnNext.disabled = true;
    return;
  }

  var views = buildViewsFromCount(pageCount);
  var currentIndex = 0;
  var animating = false;
  var reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pageImageCache = {};
  var initialSpreadReady = true;
  /** Spread: outer ~22% = turn page; center = fold like a booklet */
  var SPREAD_EDGE = 0.22;
  var swipeTouchStartX = null;
  var swipeTouchStartY = null;
  var ignoreClicksUntil = 0;

  function preloadUrl(url) {
    if (!url) return Promise.resolve();
    return new Promise(function (resolve) {
      try {
        var im = new Image();
        im.decoding = "async";
        im.onload = function () {
          if (im.decode) {
            im.decode().then(resolve).catch(resolve);
          } else {
            resolve();
          }
        };
        im.onerror = function () {
          resolve();
        };
        im.src = url;
      } catch (e) {
        resolve();
      }
    });
  }

  function preloadPageIndex(pageIndex) {
    return loadPageImage(pageIndex).then(function (src) {
      return preloadUrl(src);
    });
  }

  var warmT = null;
  function warmAdjacentViews() {
    if (!displayPngOnly) return;
    if (!views || !views.length) return;
    if (warmT) window.clearTimeout(warmT);
    warmT = window.setTimeout(function () {
      try {
        var cur = views[currentIndex];
        var next = views[currentIndex + 1];
        var prev = views[currentIndex - 1];
        var indices = [];
        if (cur && cur.indices) indices = indices.concat(cur.indices);
        if (next && next.indices) indices = indices.concat(next.indices);
        if (prev && prev.indices) indices = indices.concat(prev.indices);
        // De-dupe
        var seen = {};
        var uniq = [];
        for (var i = 0; i < indices.length; i++) {
          var k = String(indices[i]);
          if (seen[k]) continue;
          seen[k] = 1;
          uniq.push(indices[i]);
        }
        Promise.all(uniq.map(preloadPageIndex)).catch(function () {});
      } catch (e) {}
    }, 40);
  }

  async function renderPdfPageDataUrl(pageIndex) {
    if (!pdf) return "";
    var page = await pdf.getPage(pageIndex + 1);
    var viewport = page.getViewport({ scale: 1.15 });
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function loadPageImage(pageIndex) {
    if (pageImageCache[pageIndex]) return pageImageCache[pageIndex];
    pageImageCache[pageIndex] = (async function () {
      if (displayPngOnly && fallbackUrls[pageIndex]) {
        return fallbackUrls[pageIndex];
      }
      if (sourceType === "pdf") {
        try {
          var src = await renderPdfPageDataUrl(pageIndex);
          if (src) return src;
        } catch (e) {}
      }
      return fallbackUrls[pageIndex] || "";
    })();
    return pageImageCache[pageIndex];
  }

  function hydrateImage(img, pageIndex, altOverride) {
    var zineTitle = (root.getAttribute("data-zine-title") || "Booklet").trim() || "Booklet";
    var alt =
      altOverride !== undefined && altOverride !== null
        ? altOverride
        : zineTitle + " — page " + (pageIndex + 1) + " of " + pageCount;
    img.alt = alt;
    if (displayPngOnly && fallbackUrls[pageIndex]) {
      var syncUrl = fallbackUrls[pageIndex];
      pageImageCache[pageIndex] = Promise.resolve(syncUrl);
      img.src = syncUrl;
      if ((pageIndex === 0 || pageIndex === pageCount - 1) && "fetchPriority" in img)
        img.fetchPriority = "high";
      return;
    }
    loadPageImage(pageIndex).then(function (src) {
      if (src) img.src = src;
      img.alt = alt;
      if ((pageIndex === 0 || pageIndex === pageCount - 1) && "fetchPriority" in img)
        img.fetchPriority = "high";
    });
  }

  var thumbButtons = [];

  var pageLightbox = null;
  var pageLightboxImg = null;
  var pageLightboxCloseBtn = null;

  function closePageLightbox() {
    if (!pageLightbox || pageLightbox.hidden) return;
    pageLightbox.hidden = true;
    pageLightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function ensurePageLightbox() {
    if (pageLightbox) return;
    pageLightbox = document.createElement("div");
    pageLightbox.className = "zine-page-lightbox";
    pageLightbox.hidden = true;
    pageLightbox.setAttribute("aria-modal", "true");
    pageLightbox.setAttribute("role", "dialog");
    pageLightbox.setAttribute("aria-label", "Cover — full size");

    var back = document.createElement("div");
    back.className = "zine-page-lightbox-backdrop";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "zine-page-lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.appendChild(document.createTextNode("\u00d7"));
    pageLightboxCloseBtn = closeBtn;

    var stage = document.createElement("div");
    stage.className = "zine-page-lightbox-stage";
    pageLightboxImg = document.createElement("img");
    pageLightboxImg.className = "zine-page-lightbox-img";
    pageLightboxImg.alt = "";
    stage.appendChild(pageLightboxImg);

    pageLightbox.appendChild(back);
    pageLightbox.appendChild(closeBtn);
    pageLightbox.appendChild(stage);
    document.body.appendChild(pageLightbox);

    back.addEventListener("click", closePageLightbox);
    closeBtn.addEventListener("click", closePageLightbox);
    pageLightboxImg.addEventListener("click", function (e) {
      e.stopPropagation();
      closePageLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (!pageLightbox || pageLightbox.hidden) return;
      if (e.key === "Escape") {
        closePageLightbox();
        e.preventDefault();
      }
    });
  }

  function openCoverLightbox(pageIndex, sourceImg) {
    ensurePageLightbox();
    function applySrc(src) {
      if (!src) return;
      pageLightboxImg.src = src;
      pageLightboxImg.alt =
        (sourceImg && sourceImg.getAttribute && sourceImg.getAttribute("alt")) || "Cover";
      pageLightbox.hidden = false;
      pageLightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      pageLightboxCloseBtn.focus();
    }
    var immediate = sourceImg && (sourceImg.currentSrc || sourceImg.src);
    if (immediate) {
      applySrc(immediate);
      return;
    }
    loadPageImage(pageIndex).then(applySrc);
  }

  function syncSpreadFoldAria(spread, pLeft, pRight) {
    if (!spread) return;
    var folded = spread.classList.contains("zine-flipbook__spread--folded");
    spread.setAttribute("aria-expanded", folded ? "false" : "true");
    spread.setAttribute(
      "aria-label",
      folded
        ? "Spread folded closed — pages " + pLeft + " and " + pRight + " — click or press Space to open"
        : "Spread — pages " + pLeft + " and " + pRight + " — click or press Space to fold closed"
    );
  }

  function unfoldTopSpreadIfAny() {
    var top = wrap.lastElementChild;
    if (!top) return;
    var sp = top.querySelector(".zine-flipbook__spread--folded");
    if (sp) {
      sp.classList.remove("zine-flipbook__spread--folded");
      var viewIdx = parseInt(top.getAttribute("data-view-index") || "-1", 10);
      if (viewIdx >= 0 && views[viewIdx] && views[viewIdx].type === "spread") {
        syncSpreadFoldAria(sp, views[viewIdx].indices[0] + 1, views[viewIdx].indices[1] + 1);
      }
    }
  }

  function thumbAriaLabel(viewIdx) {
    var view = views[viewIdx];
    var step = viewIdx + 1;
    var total = views.length;
    if (view.type === "single" && view.indices[0] === 0) return "Go to view " + step + " of " + total + ", cover";
    if (view.type === "single") return "Go to view " + step + " of " + total + ", page " + (view.indices[0] + 1);
    return "Go to view " + step + " of " + total + ", pages " + (view.indices[0] + 1) + "–" + (view.indices[1] + 1);
  }

  function viewIndexForPage(pageIndex) {
    for (var v = 0; v < views.length; v++) {
      var inds = views[v] && views[v].indices;
      if (!inds) continue;
      for (var i = 0; i < inds.length; i++) {
        if (inds[i] === pageIndex) return v;
      }
    }
    return 0;
  }

  function buildThumbs() {
    if (!thumbsHost) return;
    thumbsHost.textContent = "";
    thumbButtons = [];
    var thumbsPages = root.hasAttribute("data-zine-thumbs-pages");
    if (thumbsPages) {
      for (var p = 0; p < pageCount; p++) {
        var btnP = document.createElement("button");
        btnP.type = "button";
        btnP.className = "viewer-thumb";
        btnP.setAttribute("aria-label", "Go to page " + (p + 1) + " of " + pageCount);
        btnP.setAttribute("data-thumb-page", String(p));
        btnP.setAttribute("data-thumb-view", String(viewIndexForPage(p)));
        var imgP = document.createElement("img");
        imgP.decoding = "async";
        imgP.loading = p <= 4 ? "eager" : "lazy";
        btnP.appendChild(imgP);
        thumbsHost.appendChild(btnP);
        thumbButtons.push(btnP);
        hydrateImage(imgP, p, "");
        (function (pageIdx) {
          btnP.addEventListener("click", function () {
            if (animating) return;
            currentIndex = viewIndexForPage(pageIdx);
            renderStack();
            updateUi({ scrollThumb: true });
          });
        })(p);
      }

      // Ensure the strip starts at the beginning on entry (avoid “landing” mid-strip).
      try {
        thumbsHost.scrollLeft = 0;
      } catch (e) {}
      return;
    }

    for (var v = 0; v < views.length; v++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "viewer-thumb";
      btn.setAttribute("aria-label", thumbAriaLabel(v));
      var img = document.createElement("img");
      img.decoding = "async";
      img.loading = v === 0 || v === views.length - 1 || v <= 4 ? "eager" : "lazy";
      btn.appendChild(img);
      thumbsHost.appendChild(btn);
      thumbButtons.push(btn);
      hydrateImage(img, views[v].indices[0], "");
      (function (idx) {
        btn.addEventListener("click", function () {
          if (animating) return;
          currentIndex = idx;
          renderStack();
          updateUi({ scrollThumb: true });
        });
      })(v);
    }

    // Ensure the strip starts at the beginning on entry (avoid “landing” mid-strip).
    try {
      thumbsHost.scrollLeft = 0;
    } catch (e) {}
  }

  function buildSheet(viewIdx) {
    var view = views[viewIdx];
    var sheet = document.createElement("div");
    sheet.className = "zine-flipbook__sheet " + (view.type === "spread" ? "zine-flipbook__sheet--spread" : "zine-flipbook__sheet--single");
    sheet.setAttribute("data-view-index", String(viewIdx));

    if (view.type === "single") {
      var inner = document.createElement("div");
      inner.className = "zine-flipbook__single-inner";
      var img = document.createElement("img");
      img.decoding = view.indices[0] === 0 ? "sync" : "async";
      img.loading =
        eagerPageLoading || viewIdx <= 1 || viewIdx === views.length - 1 ? "eager" : "lazy";
      inner.appendChild(img);
      sheet.appendChild(inner);
      hydrateImage(img, view.indices[0]);
      if (view.indices[0] === 0) {
        img.addEventListener("dblclick", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          openCoverLightbox(0, img);
        });
        img.title = "Double-click cover for full size · Click to turn the page";
      }
    } else {
      var spread = document.createElement("div");
      spread.className = "zine-flipbook__spread";
      if (spreadHalfTurn) {
        spread.setAttribute("role", "group");
        spread.setAttribute(
          "aria-label",
          "Spread — pages " +
            (view.indices[0] + 1) +
            " and " +
            (view.indices[1] + 1) +
            " — click to go forward; on the last spread, click to go back"
        );
        spread.title = "Click to go forward · On the last spread, click to go back";
      } else {
        spread.setAttribute("role", "button");
        spread.setAttribute("tabindex", "0");
        spread.setAttribute("aria-expanded", "true");
        spread.setAttribute(
          "aria-label",
          "Spread — pages " + (view.indices[0] + 1) + " and " + (view.indices[1] + 1) + " — click or press Space to fold closed"
        );
        spread.title = "";
        spread.addEventListener("keydown", function (ev) {
          if (ev.key === " " || ev.key === "Enter") {
            ev.preventDefault();
            spread.classList.toggle("zine-flipbook__spread--folded");
            syncSpreadFoldAria(spread, view.indices[0] + 1, view.indices[1] + 1);
          }
        });
      }
      for (var i = 0; i < view.indices.length; i++) {
        var half = document.createElement("div");
        half.className = "zine-flipbook__half";
        var im = document.createElement("img");
        im.decoding = "async";
        im.loading =
          eagerPageLoading || viewIdx <= 1 || viewIdx === views.length - 1 ? "eager" : "lazy";
        half.appendChild(im);
        spread.appendChild(half);
        hydrateImage(im, view.indices[i]);
      }
      sheet.appendChild(spread);
    }
    return sheet;
  }

  function updateUi(opts) {
    opts = opts || {};
    label.textContent = describeView(views[currentIndex], currentIndex, views.length);
    btnPrev.disabled = currentIndex <= 0;
    btnNext.disabled = currentIndex >= views.length - 1;
    btnPrev.setAttribute("aria-disabled", btnPrev.disabled ? "true" : "false");
    btnNext.setAttribute("aria-disabled", btnNext.disabled ? "true" : "false");
    var thumbsPages = root.hasAttribute("data-zine-thumbs-pages");
    if (!thumbsPages) {
      for (var t = 0; t < thumbButtons.length; t++) {
        thumbButtons[t].classList.toggle("is-active", t === currentIndex);
      }
      if (opts.scrollThumb && thumbButtons[currentIndex]) {
        var inlineMode = currentIndex === 0 ? "start" : "center";
        var behaviorMode = opts.immediate ? "auto" : "smooth";
        thumbButtons[currentIndex].scrollIntoView({ inline: inlineMode, block: "nearest", behavior: behaviorMode });
      }
      return;
    }

    // Page thumbs: highlight the pages that belong to the current view (spread highlights 2 thumbs).
    var activePages = {};
    var cur = views[currentIndex];
    if (cur && cur.indices) {
      for (var ap = 0; ap < cur.indices.length; ap++) activePages[String(cur.indices[ap])] = 1;
    }
    for (var t2 = 0; t2 < thumbButtons.length; t2++) {
      var pStr = thumbButtons[t2].getAttribute("data-thumb-page");
      thumbButtons[t2].classList.toggle("is-active", !!activePages[pStr]);
    }
    if (opts.scrollThumb) {
      var targetPage = cur && cur.indices && cur.indices.length ? cur.indices[0] : 0;
      var targetBtn = thumbButtons[targetPage];
      if (targetBtn) {
        var inlineMode2 = targetPage === 0 ? "start" : "center";
        var behaviorMode2 = opts.immediate ? "auto" : "smooth";
        targetBtn.scrollIntoView({ inline: inlineMode2, block: "nearest", behavior: behaviorMode2 });
      }
    }
  }

  function syncStackSingleViewLayout() {
    var cur = views[currentIndex];
    var isSingle = cur && cur.type === "single";
    wrap.classList.toggle("zine-flipbook__stack--single-view", !!isSingle);
    var lastVi = views.length - 1;
    var wideSoloEnds =
      isSingle &&
      cur.indices &&
      (currentIndex === 0 || currentIndex === lastVi);
    wrap.classList.toggle("zine-flipbook__stack--wide-solo-ends", !!wideSoloEnds);
  }

  function renderStack() {
    wrap.textContent = "";
    for (var i = views.length - 1; i >= currentIndex; i--) wrap.appendChild(buildSheet(i));
    syncStackSingleViewLayout();
    updateUi();
    warmAdjacentViews();
  }

  function goNext() {
    if (currentIndex >= views.length - 1 || animating) return;
    if (currentIndex === 0 && !initialSpreadReady) return;
    if (reduced) {
      currentIndex++;
      renderStack();
      return;
    }
    var top = wrap.lastElementChild;
    if (!top) return;
    unfoldTopSpreadIfAny();
    animating = true;
    var cleared = false;
    function finishFlipOut() {
      if (cleared) return;
      cleared = true;
      window.clearTimeout(safetyTimer);
      top.removeEventListener("transitionend", onTransitionEnd);
      currentIndex++;
      renderStack();
      animating = false;
    }
    var safetyTimer = window.setTimeout(finishFlipOut, 950);
    function onTransitionEnd(ev) {
      if (ev.propertyName !== "transform") return;
      finishFlipOut();
    }
    top.addEventListener("transitionend", onTransitionEnd);
    top.classList.add("zine-flipbook__sheet--flip-out");
  }

  function goPrev() {
    if (currentIndex <= 0 || animating) return;
    if (reduced) {
      currentIndex--;
      renderStack();
      return;
    }
    unfoldTopSpreadIfAny();
    animating = true;
    var p = currentIndex - 1;
    var sheet = buildSheet(p);
    sheet.classList.add("zine-flipbook__sheet--flip-in-start");
    wrap.appendChild(sheet);
    void sheet.offsetWidth;
    sheet.classList.remove("zine-flipbook__sheet--flip-in-start");
    var clearedIn = false;
    function finishFlipIn() {
      if (clearedIn) return;
      clearedIn = true;
      window.clearTimeout(safetyTimerIn);
      sheet.removeEventListener("transitionend", onTransitionEndIn);
      currentIndex = p;
      renderStack();
      animating = false;
    }
    var safetyTimerIn = window.setTimeout(finishFlipIn, 950);
    function onTransitionEndIn(ev) {
      if (ev.propertyName !== "transform") return;
      finishFlipIn();
    }
    sheet.addEventListener("transitionend", onTransitionEndIn);
  }

  btnNext.addEventListener("click", goNext);
  btnPrev.addEventListener("click", goPrev);
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
  });

  /* Spread (half-turn): click advances to next. Other spread mode: edges turn, center folds. Single: halves turn. */
  wrap.addEventListener("click", function (e) {
    if (Date.now() < ignoreClicksUntil) return;
    if (animating) return;
    if (e.button !== 0) return;
    var topSheet = wrap.lastElementChild;
    if (!topSheet) return;

    var sheetRect = topSheet.getBoundingClientRect();
    if (sheetRect.width <= 0) return;
    var px = (e.clientX - sheetRect.left) / sheetRect.width;

    var spread = e.target.closest(".zine-flipbook__spread");
    if (spread && topSheet.contains(spread) && topSheet.classList.contains("zine-flipbook__sheet--spread")) {
      e.preventDefault();
      if (spreadHalfTurn) {
        if (currentIndex >= views.length - 1) goPrev();
        else goNext();
        return;
      }
      if (px < SPREAD_EDGE) {
        goPrev();
        return;
      }
      if (px > 1 - SPREAD_EDGE) {
        goNext();
        return;
      }
      spread.classList.toggle("zine-flipbook__spread--folded");
      var vi = parseInt(topSheet.getAttribute("data-view-index") || "-1", 10);
      if (vi >= 0 && views[vi] && views[vi].type === "spread") {
        syncSpreadFoldAria(spread, views[vi].indices[0] + 1, views[vi].indices[1] + 1);
      }
      return;
    }
    if (topSheet.classList.contains("zine-flipbook__sheet--spread")) return;
    if (px < 0.5) goPrev();
    else if (currentIndex >= views.length - 1) goPrev();
    else goNext();
  });

  wrap.addEventListener(
    "touchstart",
    function (e) {
      if (animating || e.touches.length !== 1) return;
      swipeTouchStartX = e.touches[0].clientX;
      swipeTouchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  wrap.addEventListener(
    "touchend",
    function (e) {
      if (swipeTouchStartX == null || !e.changedTouches || !e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - swipeTouchStartX;
      var dy = e.changedTouches[0].clientY - swipeTouchStartY;
      swipeTouchStartX = null;
      swipeTouchStartY = null;
      if (animating) return;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.1) return;
      ignoreClicksUntil = Date.now() + 420;
      if (dx < 0) goNext();
      else goPrev();
    },
    { passive: true }
  );

  root.addEventListener(
    "wheel",
    function (e) {
      if (animating) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.35) return;
      if (Math.abs(e.deltaX) < 8) return;
      e.preventDefault();
      if (e.deltaX > 0) goNext();
      else goPrev();
    },
    { passive: false }
  );

  buildThumbs();
  renderStack();
  // On initial load, keep the first view’s thumbnails visible.
  updateUi({ scrollThumb: true, immediate: true });
  warmAdjacentViews();

  // Force the thumbnail strip to the beginning on entry, even if the browser restores a previous scroll position.
  if (thumbsHost) {
    var forceStart = function () {
      try {
        thumbsHost.scrollLeft = 0;
      } catch (e) {}
      updateUi({ scrollThumb: true, immediate: true });
    };
    forceStart();
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(forceStart);
      requestAnimationFrame(function () {
        requestAnimationFrame(forceStart);
      });
    } else {
      window.setTimeout(forceStart, 0);
      window.setTimeout(forceStart, 60);
    }
  }

  function resetToBeginning() {
    if (animating) return;
    currentIndex = 0;
    renderStack();
    if (thumbsHost) {
      try {
        thumbsHost.scrollLeft = 0;
      } catch (e) {}
    }
    updateUi({ scrollThumb: true, immediate: true });
  }

  // If the browser restores this page from back/forward cache, reset to the beginning
  // so the thumbnail strip shows the first slides on entry (not the middle).
  window.addEventListener("pageshow", function (e) {
    if (e && e.persisted) resetToBeginning();
  });

  // Smooth entry: pre-load + decode the first spread (cover → pages 2–3) so it doesn't "glitch" on first turn.
  if (displayPngOnly && root.hasAttribute("data-zine-cover-solo") && views[1] && views[1].type === "spread") {
    initialSpreadReady = false;
    btnNext.disabled = true;
    btnNext.setAttribute("aria-disabled", "true");
    Promise.all([0, views[1].indices[0], views[1].indices[1]].map(preloadPageIndex)).then(function () {
      initialSpreadReady = true;
      updateUi();
    });
  }
})();
