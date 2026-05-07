(function () {
  var tiles = document.querySelectorAll(".tile--hover-video-preview");
  if (!tiles.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  function bind(tile) {
    var video = tile.querySelector("video.tile-video--hover-preview");
    if (!video) return;

    function play() {
      var p = video.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    }

    function stop() {
      video.pause();
      try {
        video.currentTime = 0;
      } catch (e) {}
    }

    tile.addEventListener("pointerenter", play);
    tile.addEventListener("pointerleave", stop);
    tile.addEventListener("focusin", play);
    tile.addEventListener("focusout", stop);
  }

  for (var i = 0; i < tiles.length; i++) {
    bind(tiles[i]);
  }
})();
