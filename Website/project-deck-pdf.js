(function () {
  function ensurePdfWorker() {
    if (typeof pdfjsLib === "undefined") return false;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    return true;
  }

  function initWrap(wrap) {
    var section = wrap.closest(".project-deck-pdf");
    var statusEl = section ? section.querySelector(".project-deck-pdf-status") : null;
    var src = wrap.getAttribute("data-pdf-src");
    var pageLabel = wrap.getAttribute("data-pdf-page-label") || "Page";
    var webtoon = wrap.getAttribute("data-pdf-webtoon") === "1" || wrap.hasAttribute("data-pdf-webtoon");
    var quietFail =
      wrap.getAttribute("data-pdf-quiet-fail") === "1" || wrap.hasAttribute("data-pdf-quiet-fail");
    if (webtoon) wrap.classList.add("project-deck-pdf-pages--webtoon");

    function setStatus(msg, hide) {
      if (!statusEl) return;
      statusEl.textContent = msg || "";
      statusEl.hidden = !!hide;
    }

    if (!src) {
      setStatus("", true);
      return;
    }

    if (!ensurePdfWorker()) {
      if (quietFail) {
        setStatus("", true);
      } else {
        setStatus("PDF viewer did not load. Use the link above to open the PDF.");
      }
      return;
    }

    function maxCanvasWidth() {
      if (webtoon) {
        var w = wrap.getBoundingClientRect().width || wrap.clientWidth || 900;
        return Math.min(Math.max(w, 320), 960);
      }
      return Math.min(wrap.clientWidth || 880, 880);
    }

    function renderPage(pdf, num, numPages) {
      return pdf.getPage(num).then(function (page) {
        var base = page.getViewport({ scale: 1 });
        var scale = maxCanvasWidth() / base.width;
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement("canvas");
        canvas.className = "project-deck-pdf-page" + (webtoon ? " project-deck-pdf-page--webtoon" : "");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", pageLabel + " " + num + " of " + numPages);
        var ctx = canvas.getContext("2d");
        return page
          .render({ canvasContext: ctx, viewport: viewport })
          .promise.then(function () {
            wrap.appendChild(canvas);
          });
      });
    }

    pdfjsLib
      .getDocument(src)
      .promise.then(function (pdf) {
        var numPages = pdf.numPages;
        var chain = Promise.resolve();
        for (var i = 1; i <= numPages; i++) {
          (function (n) {
            chain = chain.then(function () {
              return renderPage(pdf, n, numPages);
            });
          })(i);
        }
        return chain.then(function () {
          setStatus("", true);
        });
      })
      .catch(function () {
        if (quietFail) {
          setStatus("", true);
        } else {
          setStatus("PDF could not be displayed here. Use the link above.");
        }
      });
  }

  var decks = document.querySelectorAll(".project-deck-pdf .project-deck-pdf-pages[data-pdf-src]");
  for (var d = 0; d < decks.length; d++) {
    initWrap(decks[d]);
  }
})();
