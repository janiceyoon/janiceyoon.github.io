(function () {
  if (!document.body || !document.body.classList.contains("portfolio-page")) return;
  if (document.getElementById("site-undo-btn")) return;

  var btn = document.createElement("button");
  btn.type = "button";
  btn.id = "site-undo-btn";
  btn.className = "site-undo-btn";
  btn.setAttribute("aria-label", "Back — return to the previous page");
  btn.setAttribute("title", "Back — previous page (⌘Z / Ctrl+Z)");
  btn.innerHTML =
    '<span class="site-undo-btn__glyph" aria-hidden="true">\u2190</span>';

  function goBack() {
    try {
      window.history.back();
    } catch (e) {}
  }

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    goBack();
  });

  document.body.appendChild(btn);

  function pulse() {
    btn.classList.add("site-undo-btn--pulse");
    if (btn._pulseTimer) clearTimeout(btn._pulseTimer);
    btn._pulseTimer = setTimeout(function () {
      btn.classList.remove("site-undo-btn--pulse");
    }, 420);
  }

  document.addEventListener(
    "click",
    function (e) {
      if (e.defaultPrevented) return;
      var t = e.target;
      if (!t || t === btn) return;
      if (typeof t.closest === "function" && t.closest("#site-undo-btn")) return;
      pulse();
    },
    true
  );

  document.addEventListener("keydown", function (e) {
    var mod = e.metaKey || e.ctrlKey;
    if (!mod || (e.key !== "z" && e.key !== "Z")) return;
    var el = document.activeElement;
    var tag = el && el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (el && el.isContentEditable) return;
    e.preventDefault();
    goBack();
  });
})();
