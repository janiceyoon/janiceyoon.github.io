(function () {
  var roots = document.querySelectorAll(".home-bubble-float");
  if (!roots.length) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var instances = [];

  function clamp(n, lo, hi) {
    if (typeof n !== "number" || n !== n) return 0;
    return Math.max(lo, Math.min(hi, n));
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function maxOffset() {
    return {
      x: Math.min(420, window.innerWidth * 0.42),
      y: Math.min(380, window.innerHeight * 0.38),
    };
  }

  function sidebarDividerX() {
    var sb = document.querySelector(".site-sidebar");
    if (!sb || typeof sb.getBoundingClientRect !== "function") return null;
    var r = sb.getBoundingClientRect();
    if (!r.width) return null;
    return r.right;
  }

  function createBubble(root) {
    var bob = root.querySelector(".home-bubble-float-bob");
    var img = root.querySelector(".home-bubble-float-img");
    var storageKey =
      root.getAttribute("data-storage-key") || "jy-home-bubble-xy";
    var activePointerId = null;
    var startClientX = 0;
    var startClientY = 0;
    var startPointerDisplayX = 0;
    var startPointerDisplayY = 0;
    var dragging = false;
    var popping = false;
    var dragStartMs = 0;
    var movedPastTap = false;
    var lastTap = { t: 0, x: 0, y: 0 };
    var defX = parseFloat(root.getAttribute("data-default-x"));
    var defY = parseFloat(root.getAttribute("data-default-y"));
    var userOX = defX === defX ? defX : 0;
    var userOY = defY === defY ? defY : 0;
    var velX = 0;
    var velY = 0;
    var dragTargetX = 0;
    var dragTargetY = 0;
    var dragSpring = 38;
    var lastPhysicsMs = 0;
    var lastMoveX = 0;
    var lastMoveY = 0;
    var lastMoveT = 0;
    var lastSaveMs = 0;
    var lastWallPopMs = 0;
    var wallPopTimer = null;
    var wallPopCooldownMs = 380;
    var bounceDamp = 0.993;
    var maxSpeed = 148;

    function bounds() {
      var m = maxOffset();
      var maxX = m.x;
      var minX = -m.x;
      var line = sidebarDividerX();
      if (line != null && line === line) {
        var rw = root.getBoundingClientRect().width;
        var halfW = rw > 12 ? rw * 0.5 : 100;
        var gap = 10;
        minX = line - window.innerWidth * 0.5 + halfW + gap;
        if (minX > maxX - 36) minX = maxX - 36;
      }
      return { minX: minX, maxX: maxX, minY: -m.y, maxY: m.y };
    }

    function randomDriftVelocity() {
      var ang = Math.random() * Math.PI * 2;
      var sp = 17 + Math.random() * 24;
      velX = Math.cos(ang) * sp;
      velY = Math.sin(ang) * sp;
    }

    function clearWallPopVisual() {
      if (wallPopTimer) {
        clearTimeout(wallPopTimer);
        wallPopTimer = null;
      }
      root.classList.remove("is-wall-pop");
    }

    function triggerWallPopVisual(now) {
      if (popping) return;
      if (now - lastWallPopMs < wallPopCooldownMs) return;
      lastWallPopMs = now;
      root.classList.remove("is-wall-pop");
      void root.offsetWidth;
      root.classList.add("is-wall-pop");
      if (wallPopTimer) clearTimeout(wallPopTimer);
      var clearMs = reduced ? 400 : 700;
      wallPopTimer = window.setTimeout(function () {
        wallPopTimer = null;
        root.classList.remove("is-wall-pop");
      }, clearMs);
    }

    function beginPop() {
      if (popping) return;
      popping = true;
      lastTap.t = 0;
      clearWallPopVisual();
      if (dragging) {
        var cap = activePointerId;
        dragging = false;
        activePointerId = null;
        root.classList.remove("is-dragging");
        try {
          if (cap != null) root.releasePointerCapture(cap);
        } catch (err) {}
      }
      root.classList.remove("is-spawning");

      function afterPop() {
        root.classList.remove("is-popping");
        userOX = defX === defX ? defX : 0;
        userOY = defY === defY ? defY : 0;
        randomDriftVelocity();
        save();
        applyTransform(userOX, userOY);
        if (reduced) {
          popping = false;
          return;
        }
        root.classList.add("is-spawning");
        var spawnDone = false;
        function afterSpawn(ev) {
          if (spawnDone) return;
          if (ev && ev.animationName) {
            var sn = ev.animationName;
            if (sn !== "home-bubble-user-spawn" && sn !== "home-bubble-user-spawn-reduce") {
              return;
            }
          }
          spawnDone = true;
          if (bob) bob.removeEventListener("animationend", afterSpawn);
          root.classList.remove("is-spawning");
          popping = false;
        }
        if (bob) {
          bob.addEventListener("animationend", afterSpawn);
          window.setTimeout(function () {
            afterSpawn(null);
          }, 900);
        } else {
          popping = false;
        }
      }

      if (reduced) {
        root.classList.add("is-popping");
        var reducePopDone = false;
        function onReducePopEnd(ev) {
          if (reducePopDone) return;
          if (ev && ev.animationName && ev.animationName !== "home-bubble-user-pop-reduce") {
            return;
          }
          reducePopDone = true;
          if (bob) bob.removeEventListener("animationend", onReducePopEnd);
          afterPop();
        }
        if (bob) {
          bob.addEventListener("animationend", onReducePopEnd);
          window.setTimeout(function () {
            onReducePopEnd(null);
          }, 400);
        } else {
          afterPop();
        }
        return;
      }

      root.classList.add("is-popping");
      var popDone = false;
      function onPopEnd(ev) {
        if (popDone) return;
        if (ev && ev.animationName) {
          var pn = ev.animationName;
          if (pn !== "home-bubble-user-pop" && pn !== "home-bubble-user-pop-reduce") {
            return;
          }
        }
        popDone = true;
        if (bob) bob.removeEventListener("animationend", onPopEnd);
        afterPop();
      }
      if (bob) {
        bob.addEventListener("animationend", onPopEnd);
        window.setTimeout(function () {
          onPopEnd(null);
        }, 860);
      } else {
        afterPop();
      }
    }

    function load() {
      try {
        var raw = localStorage.getItem(storageKey);
        if (!raw) {
          randomDriftVelocity();
          return;
        }
        var o = JSON.parse(raw);
        var b = bounds();
        if (typeof o.x === "number" && typeof o.y === "number") {
          userOX = clamp(o.x, b.minX, b.maxX);
          userOY = clamp(o.y, b.minY, b.maxY);
        }
        if (typeof o.vx === "number" && typeof o.vy === "number") {
          velX = clamp(o.vx, -maxSpeed, maxSpeed);
          velY = clamp(o.vy, -maxSpeed, maxSpeed);
          if (Math.abs(velX) + Math.abs(velY) < 8) {
            randomDriftVelocity();
          }
        } else {
          randomDriftVelocity();
        }
      } catch (e) {
        randomDriftVelocity();
      }
    }

    function save() {
      try {
        var b = bounds();
        userOX = clamp(userOX, b.minX, b.maxX);
        userOY = clamp(userOY, b.minY, b.maxY);
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            x: userOX,
            y: userOY,
            vx: velX,
            vy: velY,
          })
        );
      } catch (e) {}
    }

    function applyTransform(displayX, displayY) {
      var b = bounds();
      var dx = clamp(displayX, b.minX, b.maxX);
      var dy = clamp(displayY, b.minY, b.maxY);
      root.style.transform =
        "translate3d(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px), 0)";
    }

    function setTiltFromPointer(clientX, clientY) {
      if (!img || reduced || popping) return;
      if (typeof clientX !== "number" || typeof clientY !== "number") return;
      var nx = (clientX / window.innerWidth - 0.5) * 2;
      var ny = (clientY / window.innerHeight - 0.5) * 2;
      var ry = Math.max(-14, Math.min(14, nx * 12));
      var rx = Math.max(-10, Math.min(10, -ny * 8 - 4));
      root.style.setProperty("--bubble-rx", rx + "deg");
      root.style.setProperty("--bubble-ry", ry + "deg");
    }

    function onPointerDown(e) {
      if (popping) {
        e.preventDefault();
        return;
      }
      if (e.button !== 0 && e.pointerType !== "touch" && e.pointerType !== "pen") {
        return;
      }
      if (e.pointerType === "mouse" && e.detail === 2) {
        e.preventDefault();
        beginPop();
        return;
      }
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        var now = performance.now();
        if (
          lastTap.t > 0 &&
          now - lastTap.t < 420 &&
          dist(e.clientX, e.clientY, lastTap.x, lastTap.y) < 52
        ) {
          e.preventDefault();
          beginPop();
          return;
        }
      }
      dragging = true;
      activePointerId = e.pointerId;
      root.classList.add("is-dragging");
      velX = 0;
      velY = 0;
      lastPhysicsMs = 0;
      dragTargetX = userOX;
      dragTargetY = userOY;
      movedPastTap = false;
      dragStartMs = performance.now();
      startClientX = e.clientX;
      startClientY = e.clientY;
      startPointerDisplayX = userOX;
      startPointerDisplayY = userOY;
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
      lastMoveT = performance.now();
      try {
        root.setPointerCapture(e.pointerId);
      } catch (err) {}
      e.preventDefault();
    }

    function pointerMove(e) {
      if (!dragging) return;
      if (typeof e.clientX !== "number" || typeof e.clientY !== "number") return;
      if (dist(e.clientX, e.clientY, startClientX, startClientY) > 14) {
        movedPastTap = true;
      }
      var b = bounds();
      var dx = e.clientX - startClientX;
      var dy = e.clientY - startClientY;
      var px = clamp(startPointerDisplayX + dx, b.minX, b.maxX);
      var py = clamp(startPointerDisplayY + dy, b.minY, b.maxY);
      dragTargetX = px;
      dragTargetY = py;
      if (reduced) {
        userOX = px;
        userOY = py;
        applyTransform(px, py);
      }
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
      lastMoveT = performance.now();
    }

    function pointerUp(e) {
      if (!dragging) return;
      if (activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) {
        return;
      }
      dragging = false;
      activePointerId = null;
      root.classList.remove("is-dragging");
      try {
        if (e.pointerId != null) root.releasePointerCapture(e.pointerId);
      } catch (err) {}
      var cx =
        typeof e.clientX === "number" && e.clientX === e.clientX
          ? e.clientX
          : startClientX;
      var cy =
        typeof e.clientY === "number" && e.clientY === e.clientY
          ? e.clientY
          : startClientY;
      var b = bounds();
      var rdx = cx - startClientX;
      var rdy = cy - startClientY;
      userOX = clamp(startPointerDisplayX + rdx, b.minX, b.maxX);
      userOY = clamp(startPointerDisplayY + rdy, b.minY, b.maxY);
      dragTargetX = userOX;
      dragTargetY = userOY;

      var mdt = performance.now() - lastMoveT;
      if (mdt > 0 && mdt < 95) {
        var sx = (cx - lastMoveX) / mdt;
        var sy = (cy - lastMoveY) / mdt;
        velX = clamp(sx * 285, -maxSpeed, maxSpeed);
        velY = clamp(sy * 285, -maxSpeed, maxSpeed);
      } else {
        randomDriftVelocity();
      }

      lastPhysicsMs = 0;
      lastMoveT = 0;
      save();

      var dur = performance.now() - dragStartMs;
      var tapDist = dist(cx, cy, startClientX, startClientY);
      var pt = e.pointerType;
      if (
        (pt === "touch" || pt === "pen") &&
        !movedPastTap &&
        dur < 320 &&
        tapDist < 16
      ) {
        lastTap = { t: performance.now(), x: cx, y: cy };
      } else {
        lastTap.t = 0;
      }
    }

    function frame() {
      if (popping) return;
      var now = performance.now();
      if (dragging && !reduced) {
        if (!lastPhysicsMs) lastPhysicsMs = now;
        var dtd = Math.min(0.055, (now - lastPhysicsMs) / 1000);
        lastPhysicsMs = now;
        if (dtd > 0) {
          var follow = Math.min(1, dragSpring * dtd);
          userOX += (dragTargetX - userOX) * follow;
          userOY += (dragTargetY - userOY) * follow;
          applyTransform(userOX, userOY);
        }
        return;
      }
      if (reduced) return;
      if (!lastPhysicsMs) lastPhysicsMs = now;
      var dt = Math.min(0.055, (now - lastPhysicsMs) / 1000);
      lastPhysicsMs = now;
      if (dt <= 0) return;

      var b = bounds();
      userOX = clamp(userOX, b.minX, b.maxX);
      userOY = clamp(userOY, b.minY, b.maxY);

      userOX += velX * dt;
      userOY += velY * dt;
      var hit = false;
      if (userOX > b.maxX) {
        userOX = b.maxX;
        velX = -Math.abs(velX) * bounceDamp;
        hit = true;
      } else if (userOX < b.minX) {
        userOX = b.minX;
        velX = Math.abs(velX) * bounceDamp;
        hit = true;
      }
      if (userOY > b.maxY) {
        userOY = b.maxY;
        velY = -Math.abs(velY) * bounceDamp;
        hit = true;
      } else if (userOY < b.minY) {
        userOY = b.minY;
        velY = Math.abs(velY) * bounceDamp;
        hit = true;
      }

      if (hit) {
        triggerWallPopVisual(now);
      }

      var sp = Math.sqrt(velX * velX + velY * velY);
      if (sp > maxSpeed) {
        var k = maxSpeed / sp;
        velX *= k;
        velY *= k;
      }

      if (hit || now - lastSaveMs > 2200) {
        lastSaveMs = now;
        save();
      }

      applyTransform(userOX, userOY);
    }

    load();
    applyTransform(userOX, userOY);

    root.addEventListener("pointerdown", onPointerDown, false);
    root.addEventListener(
      "dblclick",
      function (e) {
        e.preventDefault();
        beginPop();
      },
      false
    );

    function abortInteraction() {
      if (!dragging) return;
      dragging = false;
      var cap = activePointerId;
      activePointerId = null;
      root.classList.remove("is-dragging");
      try {
        if (cap != null) root.releasePointerCapture(cap);
      } catch (err) {}
      lastPhysicsMs = 0;
      randomDriftVelocity();
    }

    return {
      frame: frame,
      pointerMove: pointerMove,
      pointerUp: pointerUp,
      setTiltFromPointer: setTiltFromPointer,
      abortInteraction: abortInteraction,
    };
  }

  roots.forEach(function (el) {
    instances.push(createBubble(el));
  });

  function isBubbleCursorMode() {
    return document.documentElement.getAttribute("data-cursor") === "bubble";
  }

  var bubbleRafId = null;

  function clearWorkOverlapClasses() {
    for (var ci = 0; ci < roots.length; ci++) {
      roots[ci].classList.remove("is-behind-work-tile");
    }
  }

  var isViewportScrolling = false;
  var scrollSettleTimer = null;
  function markViewportScrolling() {
    isViewportScrolling = true;
    if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
    scrollSettleTimer = window.setTimeout(function () {
      scrollSettleTimer = null;
      isViewportScrolling = false;
    }, 140);
  }

  window.addEventListener("scroll", markViewportScrolling, { passive: true, capture: true });
  window.addEventListener("wheel", markViewportScrolling, { passive: true, capture: true });

  function bubbleAnimationFrame() {
    if (!isBubbleCursorMode()) {
      bubbleRafId = null;
      clearWorkOverlapClasses();
      return;
    }
    instances.forEach(function (inst) {
      inst.frame();
    });
    if (isViewportScrolling) {
      clearWorkOverlapClasses();
    } else {
      updateBubblesWorkOverlap();
    }
    bubbleRafId = requestAnimationFrame(bubbleAnimationFrame);
  }

  function startBubbleLoop() {
    if (reduced) return;
    if (!isBubbleCursorMode()) return;
    if (bubbleRafId != null) return;
    bubbleRafId = requestAnimationFrame(bubbleAnimationFrame);
  }

  function stopBubbleLoop() {
    if (bubbleRafId != null) {
      cancelAnimationFrame(bubbleRafId);
      bubbleRafId = null;
    }
    clearWorkOverlapClasses();
    instances.forEach(function (inst) {
      inst.abortInteraction();
    });
  }

  function syncBubbleCursorActivity() {
    if (isBubbleCursorMode()) {
      startBubbleLoop();
    } else {
      stopBubbleLoop();
    }
  }

  var workTileRectsScratch = [];

  function updateBubblesWorkOverlap() {
    var main = document.querySelector(".site-shell-main");
    if (!main) {
      for (var zi = 0; zi < roots.length; zi++) {
        roots[zi].classList.remove("is-behind-work-tile");
      }
      return;
    }
    var tiles = main.querySelectorAll("a.tile");
    var rects = workTileRectsScratch;
    rects.length = 0;
    var ti;
    for (ti = 0; ti < tiles.length; ti++) {
      var el = tiles[ti];
      if (!el || !el.getBoundingClientRect) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      rects.push(r);
    }
    if (!rects.length) {
      for (ti = 0; ti < roots.length; ti++) {
        roots[ti].classList.remove("is-behind-work-tile");
      }
      return;
    }
    for (ti = 0; ti < roots.length; ti++) {
      var root = roots[ti];
      if (
        root.classList.contains("is-dragging") ||
        root.classList.contains("is-popping") ||
        root.classList.contains("is-spawning") ||
        root.classList.contains("is-wall-pop")
      ) {
        root.classList.remove("is-behind-work-tile");
        continue;
      }
      var br = root.getBoundingClientRect();
      if (br.width < 4 || br.height < 4) {
        root.classList.remove("is-behind-work-tile");
        continue;
      }
      var hit = false;
      var ri;
      for (ri = 0; ri < rects.length; ri++) {
        var t = rects[ri];
        if (br.left < t.right && br.right > t.left && br.top < t.bottom && br.bottom > t.top) {
          hit = true;
          break;
        }
      }
      root.classList.toggle("is-behind-work-tile", hit);
    }
  }

  function globalPointerMove(e) {
    instances.forEach(function (inst) {
      inst.pointerMove(e);
    });
    if (!reduced && isBubbleCursorMode() && !isViewportScrolling) {
      instances.forEach(function (inst) {
        inst.setTiltFromPointer(e.clientX, e.clientY);
      });
    }
  }

  function globalPointerUp(e) {
    instances.forEach(function (inst) {
      inst.pointerUp(e);
    });
  }

  window.addEventListener("pointermove", globalPointerMove, { passive: true });
  document.addEventListener("pointerup", globalPointerUp, true);
  document.addEventListener("pointercancel", globalPointerUp, true);

  if (!reduced) {
    instances.forEach(function (inst) {
      inst.setTiltFromPointer(
        window.innerWidth / 2,
        window.innerHeight / 2
      );
    });
  }

  syncBubbleCursorActivity();

  try {
    new MutationObserver(function () {
      syncBubbleCursorActivity();
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-cursor"],
    });
  } catch (err) {}
})();
