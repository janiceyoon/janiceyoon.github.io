(function () {
  var backdrop = document.querySelector(".home-flower-backdrop");
  if (!backdrop) return;

  var slots = Array.prototype.slice.call(
    backdrop.querySelectorAll(".home-flower-slot[data-flower-drag]")
  );
  if (!slots.length) return;

  function pad() {
    return 6;
  }

  function isZeroOffset(x, y) {
    return Math.abs(x) < 0.5 && Math.abs(y) < 0.5;
  }

  function setSlotTranslate(slot, nx, ny) {
    /* Avoid identity transform on the slot — it creates a containing layer that can
       stall child transform animations in WebKit/Chromium until the first pointer hit. */
    if (isZeroOffset(nx, ny)) {
      slot.style.removeProperty("transform");
      return { dx: 0, dy: 0 };
    }
    slot.style.transform = "translate3d(" + nx + "px," + ny + "px,0)";
    return { dx: nx, dy: ny };
  }

  function constrainInsideBackdrop(slot, dx, dy) {
    if (isZeroOffset(dx, dy)) {
      return setSlotTranslate(slot, 0, 0);
    }
    var padv = pad();
    var maxIter = 8;
    var nx = dx;
    var ny = dy;
    var i = 0;
    while (i < maxIter) {
      i += 1;
      slot.style.transform = "translate3d(" + nx + "px," + ny + "px,0)";
      var b = backdrop.getBoundingClientRect();
      var s = slot.getBoundingClientRect();
      var ox = nx;
      var oy = ny;
      if (s.left < b.left + padv) nx += b.left + padv - s.left;
      if (s.top < b.top + padv) ny += b.top + padv - s.top;
      if (s.right > b.right - padv) nx -= s.right - (b.right - padv);
      if (s.bottom > b.bottom - padv) ny -= s.bottom - (b.bottom - padv);
      if (nx === ox && ny === oy) break;
    }
    return setSlotTranslate(slot, nx, ny);
  }

  function createSlotManager(slot) {
    var storageKey = slot.getAttribute("data-storage-key") || "jy-home-flower-xy";
    var dx = 0;
    var dy = 0;
    var activePointerId = null;
    var startClientX = 0;
    var startClientY = 0;
    var startDx = 0;
    var startDy = 0;

    function load() {
      try {
        var raw = localStorage.getItem(storageKey);
        if (!raw) return;
        var o = JSON.parse(raw);
        if (typeof o.dx === "number" && typeof o.dy === "number") {
          dx = o.dx;
          dy = o.dy;
        }
      } catch (e) {}
    }

    function save() {
      try {
        var c = constrainInsideBackdrop(slot, dx, dy);
        dx = c.dx;
        dy = c.dy;
        localStorage.setItem(storageKey, JSON.stringify({ dx: dx, dy: dy }));
      } catch (e2) {}
    }

    function apply() {
      var c = constrainInsideBackdrop(slot, dx, dy);
      dx = c.dx;
      dy = c.dy;
    }

    function onPointerDown(ev) {
      if (ev.button !== 0 && ev.pointerType === "mouse") return;
      if (activePointerId !== null) return;
      activePointerId = ev.pointerId;
      slot.classList.add("is-dragging");
      startClientX = ev.clientX;
      startClientY = ev.clientY;
      startDx = dx;
      startDy = dy;
      try {
        slot.setPointerCapture(ev.pointerId);
      } catch (err) {}
      ev.preventDefault();
    }

    function onPointerMove(ev) {
      if (activePointerId !== ev.pointerId) return;
      dx = startDx + (ev.clientX - startClientX);
      dy = startDy + (ev.clientY - startClientY);
      var c = constrainInsideBackdrop(slot, dx, dy);
      dx = c.dx;
      dy = c.dy;
    }

    function onPointerUp(ev) {
      if (activePointerId !== ev.pointerId) return;
      activePointerId = null;
      slot.classList.remove("is-dragging");
      try {
        slot.releasePointerCapture(ev.pointerId);
      } catch (err2) {}
      save();
    }

    load();
    apply();

    slot.addEventListener("pointerdown", onPointerDown);
    slot.addEventListener("pointermove", onPointerMove);
    slot.addEventListener("pointerup", onPointerUp);
    slot.addEventListener("pointercancel", onPointerUp);
    slot.addEventListener("lostpointercapture", function (ev) {
      if (activePointerId === ev.pointerId) {
        activePointerId = null;
        slot.classList.remove("is-dragging");
        save();
      }
    });

    return { apply: apply, save: save };
  }

  var managers = slots.map(createSlotManager);

  window.addEventListener(
    "resize",
    function () {
      managers.forEach(function (m) {
        m.apply();
        m.save();
      });
    },
    { passive: true }
  );
})();
