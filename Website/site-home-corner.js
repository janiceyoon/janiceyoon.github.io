(function () {
  if (document.getElementById("site-home-corner")) return;

  function homeHref() {
    var p = "";
    try {
      p = (window.location.pathname || "").replace(/\\/g, "/");
    } catch (e) {}
    var parts = p.split("/").filter(function (s) {
      return s.length > 0;
    });
    for (var i = 0; i < parts.length; i++) {
      if (String(parts[i]).toLowerCase() === "creatives") {
        return "../index.html";
      }
    }
    return "index.html";
  }

  var a = document.createElement("a");
  a.id = "site-home-corner";
  a.className = "site-home-corner";
  a.href = homeHref();
  a.setAttribute("aria-label", "Homepage");
  a.innerHTML =
    '<svg class="site-home-corner-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M12 3 3 11.5h3.5V21H9v-6h6v6h4.5V11.5H21L12 3z"/>' +
    "</svg>";

  var skip = document.querySelector(".skip-link");
  if (skip && skip.parentNode) {
    skip.parentNode.insertBefore(a, skip.nextSibling);
  } else {
    document.body.insertBefore(a, document.body.firstChild);
  }
})();
