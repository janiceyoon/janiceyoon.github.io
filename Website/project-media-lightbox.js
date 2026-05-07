(function () {
  var lb = null;
  var lbImg = null;
  var closeBtn = null;

  function close() {
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    lb.setAttribute("aria-hidden", "true");
  }

  function ensure() {
    if (lb) return;
    lb = document.createElement("div");
    lb.className = "project-page-lightbox";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Enlarged image");

    var backdrop = document.createElement("div");
    backdrop.className = "project-page-lightbox-backdrop";

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "project-page-lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "\u00d7";

    var stage = document.createElement("div");
    stage.className = "project-page-lightbox-stage";
    lbImg = document.createElement("img");
    lbImg.className = "project-page-lightbox-img";
    lbImg.alt = "";
    stage.appendChild(lbImg);

    lb.appendChild(backdrop);
    lb.appendChild(closeBtn);
    lb.appendChild(stage);
    document.body.appendChild(lb);

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    lbImg.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb && !lb.hidden) close();
    });
  }

  function open(src, alt) {
    if (!src) return;
    ensure();
    lbImg.src = src;
    lbImg.alt = alt || "";
    lb.hidden = false;
    lb.setAttribute("aria-hidden", "false");
    closeBtn.focus();
  }

  function eligibleAutoImage(img) {
    if (!img) return false;
    if (img.hasAttribute("data-no-lightbox")) return false;
    if (img.closest(".project-page-lightbox")) return false;
    if (img.closest(".site-sidebar") || img.closest(".site-footer")) return false;
    if (img.closest(".viewer-thumbs") || img.closest("[data-zine-thumbs]")) return false;
    if (img.closest(".zine-flipbook") || img.closest("[data-zine-flipbook]")) return false;
    if (img.closest("a, button")) return false;
    var main = img.closest("main.project");
    if (!main) return false;
    if (img.closest(".home-bubble-float") || img.closest(".home-flower-backdrop") || img.closest(".home-sakura-branch"))
      return false;
    return true;
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".project-lightbox-trigger");
    if (!btn) return;
    var src = btn.getAttribute("data-project-lightbox-src");
    if (!src) return;
    e.preventDefault();
    var alt = btn.getAttribute("data-project-lightbox-alt") || "";
    open(src, alt);
  });

  // Auto-lightbox: click any project image to zoom (unless explicitly opted out).
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    var img = e.target && e.target.tagName === "IMG" ? e.target : null;
    if (!eligibleAutoImage(img)) return;
    var src = img.currentSrc || img.src;
    if (!src) return;
    e.preventDefault();
    open(src, img.getAttribute("alt") || "");
  });
})();
