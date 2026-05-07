(function () {
  function ensurePdfWorker() {
    if (typeof pdfjsLib === "undefined") return false;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    return true;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function init(book) {
    var src = book.getAttribute("data-pdf-src");
    if (!src) return;

    var root = book.closest(".project-flipbook") || book;
    var statusEl = root.querySelector(".project-flipbook-status");
    var stage = root.querySelector(".project-flipbook-stage");
    var canvas = root.querySelector(".project-flipbook-canvas");
    var prevBtn = root.querySelector("[data-flipbook-prev]");
    var nextBtn = root.querySelector("[data-flipbook-next]");
    var pageEl = root.querySelector("[data-flipbook-page]");
    var totalEl = root.querySelector("[data-flipbook-total]");

    function setStatus(msg, hide) {
      if (!statusEl) return;
      statusEl.textContent = msg || "";
      statusEl.hidden = !!hide;
    }

    function maxCanvasWidth() {
      var w = book.getBoundingClientRect().width || book.clientWidth || 900;
      return clamp(w - 2, 320, 980);
    }

    if (!ensurePdfWorker()) {
      setStatus("", true);
      return;
    }

    var pdf = null;
    var pageNum = 1;
    var numPages = 1;
    var renderToken = 0;

    function updateUi() {
      if (pageEl) pageEl.textContent = String(pageNum);
      if (totalEl) totalEl.textContent = String(numPages);
      if (prevBtn) prevBtn.disabled = pageNum <= 1;
      if (nextBtn) nextBtn.disabled = pageNum >= numPages;
      root.setAttribute("data-flipbook-at-start", pageNum <= 1 ? "1" : "0");
      root.setAttribute("data-flipbook-at-end", pageNum >= numPages ? "1" : "0");
    }

    function animateTurn(dir) {
      if (!stage) return;
      stage.classList.remove("is-turn-next", "is-turn-prev");
      // Force reflow so repeated clicks re-trigger animation
      void stage.offsetWidth;
      stage.classList.add(dir === "prev" ? "is-turn-prev" : "is-turn-next");
      window.setTimeout(function () {
        stage.classList.remove("is-turn-next", "is-turn-prev");
      }, 260);
    }

    function renderPage(n) {
      if (!pdf || !canvas) return;
      var token = ++renderToken;
      setStatus("Loading page…", false);
      updateUi();
      return pdf
        .getPage(n)
        .then(function (page) {
          if (token !== renderToken) return;
          var base = page.getViewport({ scale: 1 });
          var scale = maxCanvasWidth() / base.width;
          var viewport = page.getViewport({ scale: scale });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", "Page " + n + " of " + numPages);
          var ctx = canvas.getContext("2d");
          return page.render({ canvasContext: ctx, viewport: viewport }).promise;
        })
        .then(function () {
          if (token !== renderToken) return;
          setStatus("", true);
        })
        .catch(function () {
          if (token !== renderToken) return;
          setStatus("", true);
        });
    }

    function go(delta) {
      var next = clamp(pageNum + delta, 1, numPages);
      if (next === pageNum) return;
      pageNum = next;
      animateTurn(delta < 0 ? "prev" : "next");
      renderPage(pageNum);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        go(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        go(1);
      });
    }

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    });

    var resizeT = null;
    window.addEventListener("resize", function () {
      if (!pdf) return;
      if (resizeT) window.clearTimeout(resizeT);
      resizeT = window.setTimeout(function () {
        renderPage(pageNum);
      }, 120);
    });

    setStatus("Loading booklet…", false);
    pdfjsLib
      .getDocument(src)
      .promise.then(function (doc) {
        pdf = doc;
        numPages = doc.numPages || 1;
        pageNum = 1;
        updateUi();
        return renderPage(pageNum);
      })
      .catch(function () {
        setStatus("", true);
      });
  }

  var books = document.querySelectorAll(".project-flipbook[data-pdf-src]");
  for (var i = 0; i < books.length; i++) init(books[i]);
})();

