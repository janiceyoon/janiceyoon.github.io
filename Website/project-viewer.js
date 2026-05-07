(function () {
  function isTypingTarget(el) {
    if (!el) return false;
    var n = el.nodeName;
    if (n === "INPUT" || n === "TEXTAREA" || n === "SELECT") return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest("[contenteditable='true']")) return true;
    return false;
  }

  var editorialLightboxKeyBound = false;

  function bindEditorialLightboxKeys() {
    if (editorialLightboxKeyBound) return;
    editorialLightboxKeyBound = true;
    document.addEventListener("keydown", function (e) {
      var lb = document.querySelector(".editorial-lightbox:not([hidden])");
      if (!lb) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        lb.hidden = true;
        lb.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        var prev = lb.querySelector("[data-editorial-lb-prev]");
        if (prev) prev.click();
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        var next = lb.querySelector("[data-editorial-lb-next]");
        if (next) next.click();
        e.preventDefault();
      }
    });
  }

  /** Lightbox only on the grid (no on-page arrows; prev/next belong between artworks elsewhere). */
  function attachEditorialChrome(root, scroll, slides, mainHref) {
    var spreads = Array.prototype.slice.call(scroll.querySelectorAll(".editorial-spread"));
    var n = spreads.length;
    if (!n) return;

    var lb = document.createElement("div");
    lb.className = "editorial-lightbox";
    lb.hidden = true;
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-label", "Expanded project image");

    var backdrop = document.createElement("div");
    backdrop.className = "editorial-lightbox-backdrop";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "editorial-lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.appendChild(document.createTextNode("\u00d7"));

    var prevLb = document.createElement("button");
    prevLb.type = "button";
    prevLb.className = "editorial-lightbox-arrow editorial-lightbox-arrow--left";
    prevLb.setAttribute("aria-label", "Previous image");
    prevLb.setAttribute("data-editorial-lb-prev", "");
    prevLb.appendChild(document.createTextNode("\u2039"));

    var nextLb = document.createElement("button");
    nextLb.type = "button";
    nextLb.className = "editorial-lightbox-arrow editorial-lightbox-arrow--right";
    nextLb.setAttribute("aria-label", "Next image");
    nextLb.setAttribute("data-editorial-lb-next", "");
    nextLb.appendChild(document.createTextNode("\u203a"));

    var stage = document.createElement("div");
    stage.className = "editorial-lightbox-stage";
    var lbImg = document.createElement("img");
    lbImg.className = "editorial-lightbox-img";
    lbImg.alt = "";
    stage.appendChild(lbImg);

    var figmaLink = null;
    if (mainHref) {
      figmaLink = document.createElement("a");
      figmaLink.className = "editorial-lightbox-figma";
      figmaLink.href = mainHref;
      figmaLink.target = "_blank";
      figmaLink.rel = "noopener noreferrer";
      figmaLink.textContent = "Open prototype in new tab \u2192";
      figmaLink.hidden = true;
      stage.appendChild(figmaLink);
    }

    lb.appendChild(backdrop);
    lb.appendChild(closeBtn);
    lb.appendChild(prevLb);
    lb.appendChild(stage);
    lb.appendChild(nextLb);
    if (n <= 1) {
      prevLb.hidden = true;
      nextLb.hidden = true;
    }
    /* Append to body so position:fixed covers the viewport. Inside .site-shell-main, overflow-x:hidden
       traps the overlay beside the sidebar and the ribbon pseudo-elements read as a red seam. */
    document.body.appendChild(lb);

    var lbIdx = 0;

    function hideLb() {
      lb.hidden = true;
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    function showLb(i) {
      lbIdx = (i + n) % n;
      var s = slides[lbIdx];
      lbImg.src = s.src;
      lbImg.alt = s.alt;
      if (figmaLink) {
        figmaLink.hidden = lbIdx !== 0;
      }
      lb.hidden = false;
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    spreads.forEach(function (fig, i) {
      fig.addEventListener("click", function () {
        showLb(i);
      });
    });

    backdrop.addEventListener("click", hideLb);
    closeBtn.addEventListener("click", hideLb);
    prevLb.addEventListener("click", function (e) {
      e.stopPropagation();
      showLb(lbIdx - 1);
    });
    nextLb.addEventListener("click", function (e) {
      e.stopPropagation();
      showLb(lbIdx + 1);
    });

    lbImg.addEventListener("click", function (e) {
      if (e.button != null && e.button !== 0) return;
      e.stopPropagation();
      if (n <= 1) {
        hideLb();
        return;
      }
      var rect = lbImg.getBoundingClientRect();
      if (rect.width <= 0) return;
      var x = e.clientX - rect.left;
      if (x < rect.width / 2) showLb(lbIdx - 1);
      else showLb(lbIdx + 1);
    });
    lbImg.style.cursor = n > 1 ? "pointer" : "zoom-out";
    if (n > 1) {
      lbImg.title = "Tap left for previous, right for next";
    } else {
      lbImg.title = "Tap to close";
    }

    bindEditorialLightboxKeys();
  }

  /** Image-only galleries → editorial grid (CSS); chrome added in JS. */
  function buildEditorialLayout(root, main, thumbs) {
    var startCover = root.hasAttribute("data-viewer-start-cover");
    var mainHref = root.getAttribute("data-main-href") || "";
    var slides = [];

    if (startCover) {
      slides.push({
        src: main.getAttribute("src") || "",
        alt: main.getAttribute("alt") || "",
        loading: main.getAttribute("loading") || "eager",
      });
    }

    thumbs.forEach(function (btn) {
      var src = btn.getAttribute("data-src");
      if (!src) return;
      slides.push({
        src: src,
        alt: btn.getAttribute("data-alt") || "",
        loading: "lazy",
      });
    });

    if (!slides.length) return false;

    var scroll = document.createElement("div");
    scroll.className = "editorial-scroll";
    scroll.setAttribute("role", "list");
    scroll.setAttribute("aria-label", "Project images");

    slides.forEach(function (s, i) {
      var fig = document.createElement("figure");
      fig.className = "editorial-spread";
      fig.setAttribute("role", "listitem");

      var img = document.createElement("img");
      img.className = "editorial-spread-img";
      img.src = s.src;
      img.alt = s.alt;
      img.loading = i < 2 ? s.loading || "lazy" : "lazy";
      img.decoding = "async";
      fig.appendChild(img);

      scroll.appendChild(fig);
    });

    root.innerHTML = "";
    root.classList.add("viewer--editorial");
    root.removeAttribute("data-viewer");
    root.appendChild(scroll);
    attachEditorialChrome(root, scroll, slides, mainHref);
    return true;
  }

  var viewerStates = [];

  document.querySelectorAll("[data-viewer]").forEach(function (root) {
    var thumbs = Array.prototype.slice.call(root.querySelectorAll(".viewer-thumb"));
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    if (!thumbs.length) return;

    var stack = root.querySelector("[data-main-stack]");
    var main = root.querySelector("[data-main]");

    if (stack) {
      var slides = Array.prototype.slice.call(stack.querySelectorAll("[data-slide]"));
      if (slides.length !== thumbs.length) return;

      var state = {
        root: root,
        idx: 0,
        thumbs: thumbs,
        slides: slides,
        stack: stack,
      };

      function setIndex(nextIdx) {
        state.idx = (nextIdx + thumbs.length) % thumbs.length;
        slides.forEach(function (el, i) {
          el.hidden = i !== state.idx;
        });
        slides.forEach(function (el) {
          if (el.tagName === "VIDEO") el.pause();
        });
        thumbs.forEach(function (t, i) {
          var active = i === state.idx;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-current", active ? "true" : "false");
        });
      }

      state.setIndex = setIndex;
      viewerStates.push(state);

      thumbs.forEach(function (btn, i) {
        btn.addEventListener("click", function () {
          setIndex(i);
        });
      });
      if (prev) prev.addEventListener("click", function () { setIndex(state.idx - 1); });
      if (next) next.addEventListener("click", function () { setIndex(state.idx + 1); });
      return;
    }

    var editorialOff = root.getAttribute("data-viewer-editorial") === "false";
    var thumbsHaveSrc = thumbs.every(function (t) {
      return !!(t.getAttribute && t.getAttribute("data-src"));
    });
    if (!editorialOff && main && main.tagName === "IMG" && thumbsHaveSrc) {
      if (buildEditorialLayout(root, main, thumbs)) return;
    }

    if (!main) return;

    var startCover = root.hasAttribute("data-viewer-start-cover");
    var coverSrc = main.getAttribute("src") || "";
    var coverAlt = main.getAttribute("alt") || "";
    var n = thumbs.length;

    var state = {
      root: root,
      idx: startCover ? -1 : 0,
      thumbs: thumbs,
      main: main,
    };

    function setIndex(nextIdx) {
      if (startCover && nextIdx === -1) {
        state.idx = -1;
        main.src = coverSrc;
        main.alt = coverAlt;
        thumbs.forEach(function (t) {
          t.classList.toggle("is-active", false);
          t.setAttribute("aria-current", "false");
        });
        return;
      }
      state.idx = (nextIdx + n) % n;
      var btn = thumbs[state.idx];
      var src = btn.getAttribute("data-src");
      var alt = btn.getAttribute("data-alt") || "";

      main.src = src;
      main.alt = alt;

      thumbs.forEach(function (t, i) {
        var active = i === state.idx;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-current", active ? "true" : "false");
      });
    }

    function goPrev() {
      if (startCover && state.idx === -1) setIndex(n - 1);
      else if (startCover && state.idx === 0) setIndex(-1);
      else setIndex(state.idx - 1);
    }

    function goNext() {
      if (startCover && state.idx === -1) setIndex(0);
      else setIndex(state.idx + 1);
    }

    state.setIndex = setIndex;
    if (startCover) {
      state.goPrev = goPrev;
      state.goNext = goNext;
    }
    viewerStates.push(state);

    main.addEventListener("click", function () {
      var ti = state.idx;
      if (ti >= 0 && ti < thumbs.length) {
        var slideOpen = thumbs[ti].getAttribute("data-open-href");
        if (slideOpen) {
          window.open(slideOpen, "_blank", "noopener,noreferrer");
          return;
        }
      }
      var href = root.getAttribute("data-main-href");
      if (href) {
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      if (startCover) goNext();
      else setIndex(state.idx + 1);
    });

    thumbs.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        setIndex(i);
      });
    });
    if (prev) {
      prev.addEventListener("click", function () {
        if (startCover) goPrev();
        else setIndex(state.idx - 1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        if (startCover) goNext();
        else setIndex(state.idx + 1);
      });
    }

    if (startCover) {
      setIndex(-1);
    } else {
      var rawInitial = root.getAttribute("data-viewer-initial-index");
      if (rawInitial != null && rawInitial !== "") {
        var initialIdx = parseInt(rawInitial, 10);
        if (!isNaN(initialIdx) && initialIdx >= 0 && initialIdx < n) {
          setIndex(initialIdx);
        }
      }
    }
  });

  if (viewerStates.length === 0) return;

  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (isTypingTarget(e.target)) return;

    var state = null;
    for (var i = 0; i < viewerStates.length; i++) {
      if (viewerStates[i].root.contains(document.activeElement)) {
        state = viewerStates[i];
        break;
      }
    }
    if (!state) state = viewerStates[0];

    e.preventDefault();
    if (e.key === "ArrowLeft") {
      if (state.goPrev) state.goPrev();
      else state.setIndex(state.idx - 1);
    } else {
      if (state.goNext) state.goNext();
      else state.setIndex(state.idx + 1);
    }
  });
})();
