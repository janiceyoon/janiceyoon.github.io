(function () {
  var HIDE_MS = 300;

  document.querySelectorAll(".portfolio-header, .home-narrative-header").forEach(function (header) {
    var panel = header.querySelector(".portfolio-mega-panel--work");
    var triggers = header.querySelectorAll(".portfolio-nav-mega, .home-nav-mega");
    if (!panel || !triggers.length) return;

    var hideTimer = null;

    function openMenu() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      header.classList.add("mega-menu-open");
    }

    function scheduleClose() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        header.classList.remove("mega-menu-open");
        hideTimer = null;
      }, HIDE_MS);
    }

    triggers.forEach(function (el) {
      el.addEventListener("mouseenter", openMenu);
      el.addEventListener("mouseleave", scheduleClose);
    });
    panel.addEventListener("mouseenter", openMenu);
    panel.addEventListener("mouseleave", scheduleClose);
  });
})();
