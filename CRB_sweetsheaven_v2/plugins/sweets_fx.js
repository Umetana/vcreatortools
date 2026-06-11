/**
 * Sweets Heaven FX Plugin
 * Renders falling sweets and kcal popups without modifying the base engine.
 */
(function () {
  if (!window.FX) return;

  const originalPush = window.FX.push;
  const active = [];
  let overlay = null;
  let lastFrame = performance.now();

  function getConfig() {
    return window.CONFIG_SWEETS || {};
  }

  function ensureOverlay() {
    if (overlay && document.body.contains(overlay)) return overlay;

    overlay = document.createElement("div");
    overlay.id = "sweets-fx-layer";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9500";
    overlay.style.overflow = "hidden";
    document.body.appendChild(overlay);
    return overlay;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function getKcalPopupFontSize() {
    return Math.max(12, Number(getConfig().KCAL_POPUP_FONT_SIZE ?? 30));
  }

  function createSweetNode(event, x, y, scale) {
    const node = document.createElement("div");
    node.className = "sweets-fx-item";
    const baseSize = Number(getConfig().SWEET_BASE_SIZE ?? 46);
    const visualSize = Math.round(baseSize * scale);
    node.style.position = "absolute";
    node.style.left = "0";
    node.style.top = "0";
    node.style.width = `${visualSize}px`;
    node.style.height = `${visualSize}px`;
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    node.style.transformOrigin = "center center";
    node.style.filter = "drop-shadow(0 6px 10px rgba(0, 0, 0, 0.25))";
    node.style.opacity = "1";
    node.style.willChange = "transform, opacity";

    const applyEmoji = () => {
      node.textContent = event.emoji || "🍩";
      node.style.fontSize = `${visualSize}px`;
      node.style.lineHeight = "1";
      node.style.display = "flex";
      node.style.alignItems = "center";
      node.style.justifyContent = "center";
    };

    const displayMode = getConfig().SWEET_DISPLAY_MODE || "image";

    if (displayMode === "image" && event.imageSrc) {
      const img = document.createElement("img");
      img.onerror = () => {
        img.remove();
        applyEmoji();
      };
      img.alt = event.sweetName || "sweet";
      img.draggable = false;
      img.style.display = "block";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.src = event.imageSrc;
      node.appendChild(img);
    } else {
      applyEmoji();
    }

    return node;
  }

  function createKcalNode(kcal, x, y) {
    const node = document.createElement("div");
    node.className = "sweets-fx-kcal";
    const fontSize = getKcalPopupFontSize();
    node.textContent = `+${Math.round(kcal).toLocaleString()} kcal`;
    node.style.position = "absolute";
    node.style.left = "0";
    node.style.top = "0";
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(0.72)`;
    node.style.transformOrigin = "center center";
    node.style.fontFamily = "'Trebuchet MS', 'Segoe UI', sans-serif";
    node.style.fontSize = `${Math.round(fontSize)}px`;
    node.style.fontWeight = "900";
    node.style.letterSpacing = "0.03em";
    node.style.color = "#fff6d8";
    node.style.webkitTextStroke = `${Math.max(1, fontSize * 0.05).toFixed(2)}px rgba(110, 36, 18, 0.7)`;
    node.style.textShadow = "0 3px 12px rgba(91, 31, 10, 0.35)";
    node.style.opacity = "0";
    node.style.willChange = "transform, opacity";
    return node;
  }

  function spawnPopup(instance) {
    const layer = ensureOverlay();
    const popup = createKcalNode(instance.kcal, instance.x, instance.y - 8);
    layer.appendChild(popup);

    active.push({
      kind: "popup",
      node: popup,
      x: instance.x,
      y: instance.y - 8,
      age: 0,
      duration: 0.95,
      floatY: randomRange(36, 52)
    });
  }

  function trimSweetInstances() {
    const max = Number(getConfig().MAX_ACTIVE_SWEETS ?? 30);
    let sweetCount = active.filter((item) => item.kind === "sweet").length;
    if (sweetCount <= max) return;

    for (let i = 0; i < active.length && sweetCount > max; i++) {
      const item = active[i];
      if (item.kind !== "sweet") continue;
      item.node.remove();
      active.splice(i, 1);
      sweetCount--;
      i--;
    }
  }

  function spawnSweetInstance(event) {
    const cfg = getConfig();
    const layer = ensureOverlay();
    const spawnTop = window.innerHeight * clamp(Number(cfg.SPAWN_AREA_RATIO ?? 0.25), 0.05, 0.5);
    const floorRatio = clamp(Number(cfg.DESPAWN_FLOOR_RATIO ?? 0.7), 0.35, 0.95);
    const startX = randomRange(50, Math.max(60, window.innerWidth - 50));
    const startY = randomRange(-40, spawnTop);
    const duration = randomRange(Number(cfg.FALL_DURATION_MIN ?? 1.5), Number(cfg.FALL_DURATION_MAX ?? 2.5));
    const scale = randomRange(
      Number(event.isGift ? (cfg.GIFT_SWEET_SCALE_MIN ?? 0.95) : (cfg.SWEET_SCALE_MIN ?? 0.85)),
      Number(event.isGift ? (cfg.GIFT_SWEET_SCALE_MAX ?? 1.3) : (cfg.SWEET_SCALE_MAX ?? 1.1))
    );
    const drift = randomRange(-38, 38);
    const sway = randomRange(Number(cfg.SWAY_AMOUNT ?? 20) * 0.7, Number(cfg.SWAY_AMOUNT ?? 20) * 1.35);
    const frequency = randomRange(1.2, 2.1);
    const floorY = window.innerHeight * floorRatio;
    const fallDistance = randomRange(
      Number(cfg.FALL_DISTANCE_MIN ?? 220),
      Number(cfg.FALL_DISTANCE_MAX ?? 420)
    );
    const endY = Math.min(startY + fallDistance, floorY);

    const node = createSweetNode(event, startX, startY, scale);
    layer.appendChild(node);

    active.push({
      kind: "sweet",
      node,
      kcal: event.kcal,
      x: startX,
      y: startY,
      startX,
      startY,
      endY,
      drift,
      sway,
      frequency,
      scale,
      age: 0,
      duration
    });

    trimSweetInstances();
  }

  function updateSweet(item, dt) {
    item.age += dt;
    const t = clamp(item.age / item.duration, 0, 1);
    const eased = t * t * (3 - 2 * t);
    item.y = item.startY + (item.endY - item.startY) * eased;
    item.x = item.startX + item.drift * t + Math.sin(t * Math.PI * 2 * item.frequency) * item.sway;

    const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
    const rotate = Math.sin(t * Math.PI * 2 * item.frequency) * 8;
    item.node.style.opacity = String(clamp(fade, 0, 1));
    item.node.style.transform = `translate(${Math.round(item.x)}px, ${Math.round(item.y)}px) rotate(${rotate.toFixed(2)}deg) scale(${item.scale.toFixed(3)})`;

    if (t >= 1) {
      spawnPopup(item);
      item.node.remove();
      return false;
    }

    return true;
  }

  function updatePopup(item, dt) {
    item.age += dt;
    const t = clamp(item.age / item.duration, 0, 1);
    const y = item.y - item.floatY * t;
    const scale = 0.72 + Math.sin(Math.min(t, 0.35) / 0.35 * Math.PI) * 0.32;
    const opacity = t < 0.15
      ? t / 0.15
      : (t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1);

    item.node.style.opacity = String(clamp(opacity, 0, 1));
    item.node.style.transform = `translate(${Math.round(item.x)}px, ${Math.round(y)}px) scale(${scale.toFixed(3)})`;

    if (t >= 1) {
      item.node.remove();
      return false;
    }

    return true;
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastFrame) / 1000);
    lastFrame = now;

    for (let i = active.length - 1; i >= 0; i--) {
      const item = active[i];
      const alive = item.kind === "sweet" ? updateSweet(item, dt) : updatePopup(item, dt);
      if (!alive) active.splice(i, 1);
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.FX.push = function (data) {
    const cfg = getConfig();
    if (data.motion === "sweets_fall") {
      const count = clamp(
        Number(data.spawnCount || 1),
        1,
        Number(cfg.MAX_ACTIVE_SWEETS ?? 30)
      );

      for (let i = 0; i < count; i++) {
        spawnSweetInstance(data);
      }
      return;
    }

    originalPush(data);
  };

  console.log("[SweetsPlugin] Sweets FX loaded.");
})();
