(() => {
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d");

  // ===== 0. 設定の統合ヘルパー =====
  function getMergedConfig() {
    return { ...(window.CONFIG || {}), ...(window.CONFIG_RAID || {}) };
  }

  // リサイズ処理
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const items = [];
  const textCache = new Map();

  /**
   * 画像の事前ロードとスプライト化 (キャッシュ)
   */
  function ensureImageSprite(url, size) {
    if (!url) return null;
    const key = `IMG|${url}`;
    if (textCache.has(key)) return textCache.get(key);

    const img = new Image();
    img.onload = () => {
      const h = Math.floor(size * 1.2);
      const w = Math.floor(h * (img.width / img.height));
      const sCanvas = (typeof OffscreenCanvas !== "undefined")
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement("canvas"), { width: w, height: h });
      sCanvas.getContext("2d").drawImage(img, 0, 0, w, h);
      textCache.set(key, { canvas: sCanvas, w, h });
    };
    img.src = url;
    return null;
  }

  /**
   * 演出オブジェクトの生成
   */
  function spawn(data) {
    const cfg = getMergedConfig();
    const baseFontSize = cfg.FONT_SIZE || 36;
    const imgSize = baseFontSize * 1.5;

    // 1. デフォルト設定 (float)
    const item = {
      type: data.type || "comment",
      text: String(data.text || ""),
      color: data.color || { r: 255, g: 255, b: 255 },
      x: data.x ?? Math.random() * window.innerWidth,
      y: data.y ?? -50,
      vx: data.vx ?? (Math.random() - 0.5) * 50,
      vy: data.vy ?? (200 + Math.random() * 100),
      life: 1.0,
      duration: data.duration ?? cfg.EFFECT_DURATION ?? 3.0,
      scale: data.scale ?? (0.8 + Math.random() * 0.4),
      emojiUrl: (data.imgUrls && data.imgUrls.length > 0) ? data.imgUrls[0] : (data.emojiUrl || null),
      imgSize: imgSize,
      gravity: false,
      shake: false
    };

    // 2. モーション・プリセットの適用
    const motion = data.motion || data.type; // 互換性のため type も見る

    if (motion === "pop" || motion === "hit") {
      item.gravity = true;
      item.x = data.x ?? (window.innerWidth / 2 + (Math.random() - 0.5) * 200);
      item.y = data.y ?? (window.innerHeight / 2 + (Math.random() - 0.5) * 100);
      item.vx = data.vx ?? ((Math.random() - 0.5) * 300);
      item.vy = data.vy ?? (-400 - Math.random() * 200);
      item.duration = data.duration ?? 0.8;
      item.scale = data.scale ?? (1.5 + Math.random() * 0.5);
      if (!data.color) item.color = { r: 255, g: 255, b: 0 };
    } else if (motion === "float") {
      // デフォルト設定のまま (下から上へ流れる)
      // 明示的に指定したい開発者のためにブロックを用意
    } else if (motion === "shake" || motion === "defeat") {
      item.shake = true;
      item.x = data.x ?? (window.innerWidth / 2);
      item.y = data.y ?? (window.innerHeight / 2);
      item.vx = 0;
      item.vy = 0;
      item.duration = data.duration ?? 3.0;
      item.scale = data.scale ?? 3.0;
      if (!data.color) item.color = { r: 255, g: 50, b: 50 };
    } else if (motion === "flash") {
      item.type = "flash"; // 描画ロジックで使う
      item.duration = data.duration ?? cfg.FLASH_DURATION ?? 0.25;
    } else if (motion === "center_float" || motion === "guard") {
      item.x = data.x ?? (window.innerWidth / 2);
      item.y = data.y ?? (window.innerHeight / 2 - 50);
      item.vx = 0;
      item.vy = data.vy ?? -50;
      item.duration = data.duration ?? 1.2;
      item.scale = data.scale ?? 1.2;
      if (!data.color) item.color = { r: 150, g: 150, b: 255 };
    }

    // 画像の事前ロード開始
    if (data.imgUrls) {
      for (const url of data.imgUrls) {
        ensureImageSprite(url, imgSize);
      }
    }

    items.push(item);

    const max = cfg.MAX_ACTIVE || 30;
    while (items.length > max) items.shift();
  }

  /**
   * 座標・状態の更新
   */
  function update(dt) {
    const cfg = getMergedConfig();
    const intensity = cfg.FX_INTENSITY || 1.0;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];

      // 重力処理
      if (item.gravity) {
        item.vy += 1200 * dt; // 重力
      }

      item.y += item.vy * dt * intensity;
      item.x += item.vx * dt * intensity;
      item.life -= dt / item.duration;

      if (item.life <= 0 || item.y > canvas.height + 200) {
        items.splice(i, 1);
      }
    }
  }

  /**
   * 描画
   */
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. スペシャル演出：フラッシュ（最背面）
    const flashItem = items.find(it => it.type === "flash");
    if (flashItem) {
      ctx.save();
      ctx.globalAlpha = flashItem.life;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    const cfg = getMergedConfig();
    const baseFontSize = cfg.FONT_SIZE || 36;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    for (const item of items) {
      if (item.type === "flash") continue; // フラッシュは描画済み

      const fontSize = baseFontSize * item.scale;
      ctx.font = `italic bold ${fontSize}px sans-serif`;
      ctx.globalAlpha = Math.min(1.0, item.life * 2); // 最後にパッと消えるように

      let drawX = item.x;
      let drawY = item.y;

      // 特殊演出: 画面揺れ（個別の座標のみ）
      if (item.shake) {
        drawX += (Math.random() - 0.5) * 10;
        drawY += (Math.random() - 0.5) * 10;
      }

      // 画像（スタンプ）がある場合
      if (item.emojiUrl) {
        const sprite = ensureImageSprite(item.emojiUrl, item.imgSize);
        if (sprite) {
          const s = item.scale;
          ctx.drawImage(sprite.canvas, drawX - (sprite.w * s) / 2, drawY - (sprite.h * s) / 2, sprite.w * s, sprite.h * s);
        }
      }

      // テキストを表示
      if (item.text) {
        const textY = (item.emojiUrl && item.type === "comment")
          ? drawY + (item.imgSize * item.scale * 0.7)
          : drawY;

        // ふちどり
        ctx.lineWidth = fontSize / 8;
        ctx.strokeStyle = "black";
        ctx.strokeText(item.text, drawX, textY);

        // 本体
        ctx.fillStyle = `rgb(${item.color.r},${item.color.g},${item.color.b})`;
        ctx.fillText(item.text, drawX, textY);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // アニメーションループ
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 公開API
  window.FX = {
    push: spawn,
    clear: () => items.length = 0,
    reset: () => items.length = 0
  };
})();
