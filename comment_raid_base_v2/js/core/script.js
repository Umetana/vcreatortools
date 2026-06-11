/**
 * Comment Raid Base v2 - script.js
 * わんコメのコメントデータを受信し、演出（fx.js）へ橋渡しするスクリプト
 */

// ===== 0. 設定の統合ヘルパー =====
function getMergedConfig() {
  return { ...(window.CONFIG || {}), ...(window.CONFIG_RAID || {}) };
}

// ===== 1. デバッグ & 公式表示の制御 =====
(function setupDebugToggles() {
  const params = new URLSearchParams(location.search);
  const debug = params.get("debug") === "1" || params.get("debug") === "true";
  const cfg = getMergedConfig();
  const show = (debug || cfg.HIDE_DEFAULT_COMMENTS === false);

  // 初期の表示設定
  document.documentElement.style.setProperty("--show-comments", show ? "flex" : "none");
  document.documentElement.style.setProperty(
    "--log-center-offset",
    (cfg.LOG_CENTER_OFFSET ?? -50) + "%"
  );
  document.documentElement.style.setProperty(
    "--log-padding-left",
    (cfg.LOG_PADDING_LEFT ?? 0) + "px"
  );

  // 'D'キーで公式コメント表示をトグル
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "d") return;
    const current = getComputedStyle(document.documentElement).getPropertyValue("--show-comments").trim();
    const next = (current === "none") ? "flex" : "none";
    document.documentElement.style.setProperty("--show-comments", next);
  });
})();

// ===== 1.5 高負荷対策（難攻不落：間引き） =====
function createPerSecondLimiter(maxPerSec) {
  let windowStart = performance.now();
  let count = 0;

  return function allow() {
    const now = performance.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      count = 0;
    }
    if (count >= maxPerSec) return false;
    count++;
    return true;
  };
}

function isImpossibleMode() {
  const c = window.CONFIG || {};
  const cr = window.CONFIG_RAID || {};
  const d = (c.DIFFICULTY || cr.DIFFICULTY || "").toLowerCase();
  return d === "impossible"; // 難攻不落
}

function getEffectiveMaxProcessPerSec() {
  const c = window.CONFIG || {};
  const cr = window.CONFIG_RAID || {};
  const difficulty = (c.DIFFICULTY || cr.DIFFICULTY || "normal").toLowerCase();
  const preset = c.PRESETS?.[difficulty] || cr.PRESETS?.[difficulty] || {};

  // 優先順位: 個別設定 > プリセット > デフォルト(20)
  return c.MAX_PROCESS_PER_SEC ?? cr.MAX_PROCESS_PER_SEC ?? preset.MAX_PROCESS_PER_SEC ?? 20;
}

let allowProcess = createPerSecondLimiter(getEffectiveMaxProcessPerSec());

function parseCommentData(rawComment) {
  if (!window.VCT || typeof VCT.parse !== "function") {
    return extractCommentDataLegacy(rawComment);
  }

  const legacy = VCT.parse(rawComment);
  if (typeof VCT.parseStructured !== "function") {
    return legacy;
  }

  const structured = VCT.parseStructured(rawComment);
  return {
    ...legacy,
    structured,
    event: structured?.event || null,
    message: structured?.message || null,
    monetization: structured?.monetization || null,
    membershipInfo: structured?.membership || null,
    service: structured?.service || null
  };
}

// ===== 1.6 RaidログUI（DOM） =====
const RaidLog = (() => {
  const getElements = () => ({
    viewport: document.getElementById("log-viewport"),
    list: document.getElementById("log-list")
  });

  const lines = [];
  let offsetY = 0;

  function ellipsis(s, maxChars) {
    const str = String(s ?? "");
    if (str.length <= maxChars) return str;
    return str.slice(0, Math.max(0, maxChars - 3)) + "...";
  }

  function pushLine(html, color) {
    const { list } = getElements();
    if (!list) return;

    const div = document.createElement("div");
    div.className = "raid-log";

    // --- 改修: 文中の「の」でお名前が途切れないようにロジックを強化 ---
    let name = "", sep = "", body = "";
    
    // 優先順位1: 「：」で区切る（通常のコメント形式）
    // ※名前の中に「：」が含まれることは稀なため、最初に見つかった箇所で分割
    const colonIndex = html.indexOf("：");
    if (colonIndex !== -1) {
      name = html.substring(0, colonIndex);
      sep = "：";
      body = html.substring(colonIndex + 1);
    } else {
      // 優先順位2: 「の」で区切る（バトル演出形式: 〇〇の△△！）
      // ※名前の中に「の」が含まれるケースが多いため、一番最後に出現する「の」で分割する
      const lastNoIndex = html.lastIndexOf("の");
      if (lastNoIndex !== -1) {
        name = html.substring(0, lastNoIndex);
        sep = "の";
        body = html.substring(lastNoIndex + 1);
      }
    }

    if (sep) {
      const style = color ? ` style="color: ${color}"` : "";
      div.innerHTML = `<span class="name">${name}</span>${sep}<span class="body"${style}>${body}</span>`;
    } else {
      div.innerHTML = html;
      if (color) div.style.color = color;
    }

    list.appendChild(div);
    lines.push(div);

    const cfg = getMergedConfig();
    const maxLines = (cfg.MAX_LOG_LINES ?? 9);
    while (lines.length > maxLines) {
      const old = lines.shift();
      old?.remove();
    }
  }

  // スクロール処理
  let last = performance.now();
  function tick(now) {
    const { viewport, list } = getElements();
    if (!viewport || !list) {
      requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const cfg = getMergedConfig();
    const speed = cfg.LOG_SCROLL_SPEED ?? 90;
    offsetY -= speed * dt;

    const contentH = list.scrollHeight;
    const viewH = viewport.clientHeight;
    const minY = Math.min(0, viewH - contentH - 10);

    if (offsetY < minY) offsetY = minY;
    list.style.transform = `translateY(${offsetY}px)`;

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function getRichContent(commentData, cfg, showEmoji) {
    if (!showEmoji) return ellipsis(commentData.text, cfg.MAX_LOG_CHARS ?? 32);

    let html = "";
    if (commentData.parts && commentData.parts.length > 0) {
      html = commentData.parts.map(p => {
        if (p.type === 'text') return p.content;
        if (p.type === 'emoji') return `<img src="${p.url}" alt="${p.alt}">`;
        return "";
      }).join("");
    } else if (commentData.imgUrls && commentData.imgUrls.length > 0) {
      html = commentData.text + commentData.imgUrls.map(url => `<img src="${url}" alt="">`).join("");
    } else {
      html = ellipsis(commentData.text, cfg.MAX_LOG_CHARS ?? 32);
    }

    const plainLength = html.replace(/<[^>]*>/g, '').length;
    if (plainLength > (cfg.MAX_LOG_CHARS ?? 32)) {
      return ellipsis(commentData.text, cfg.MAX_LOG_CHARS ?? 32);
    }
    return html;
  }

  return {
    push(commentData, events) {
      const cfg = getMergedConfig();
      const name = commentData?.user || "Anonymous";
      const impossible = isImpossibleMode();
      const showEmoji = cfg.LOG_SHOW_EMOJI !== false && !impossible;
      
      let contentHtml = "";
      const logEvent = events?.find(e => e.log);
      
      if (logEvent) {
        contentHtml = logEvent.log;
      } else {
        contentHtml = getRichContent(commentData, cfg, showEmoji);
        contentHtml = `${name}：${contentHtml}`;
      }

      const useColor = commentData.hasGift ? cfg.LOG_USE_GIFT_COLOR : cfg.LOG_USE_USER_COLOR;
      pushLine(contentHtml, useColor ? commentData.colorStr : null);
      offsetY = Math.max(offsetY - 24, -99999);
    }
  };
})();

// ===== 2. OneSDK 購読処理 =====
OneSDK.subscribe({
  action: 'comments',
  callback: (comments) => {
    if (!comments || comments.length === 0) return;
    for (const c of comments) {
      const commentData = parseCommentData(c);
      const impossible = isImpossibleMode();
      let events = [];
      const accepted = (!impossible) || allowProcess();

      if (accepted) {
        events = ENGINE.onComment(commentData);
        if (window.FX && typeof FX.push === "function") {
          events.forEach(ev => FX.push(ev));
        }
      }

      // ★ログに流す (DOM)
      RaidLog.push(commentData, events);

      const skipHtml = impossible && window.CONFIG?.SKIP_HTML_LOG_ON_IMPOSSIBLE;
      if (!skipHtml) pushToHtml(commentData);
    }
  }
});

/**
 * 互換性のためのレガシー抽出（SDK読み込み失敗時用）
 */
function extractCommentDataLegacy(c) {
  const data = c?.data || c?.payload?.data || c?.payload || c;
  return {
    text: data?.comment || "",
    user: data?.displayName || data?.name || "",
    colorStr: "#ffffff",
    raw: c
  };
}

/**
 * HTML表示（デバッグ・簡易プレビュー用）
 */
function pushToHtml(data) {
  const container = document.querySelector('.comments');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'comment';
  div.style.setProperty('--user-color', data.colorStr);
  div.innerHTML = `${data.user ? `<div class="comment-name">${data.user}</div>` : ''}<div class="comment-text">${data.text}</div>`;
  container.prepend(div);
  while (container.children.length > 20) container.removeChild(container.lastChild);
}

// ===== Status UI 更新 (Generic Sync) =====
let lagRatio = 1;
let lastProgress = 1;
(function setupStatusUiLoop() {
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    let lastLevel = -1;
    function tick() {
      if (window.ENGINE && typeof ENGINE.update === "function") {
        ENGINE.update();
      }

      const state = (window.ENGINE && typeof ENGINE.getState === "function") ? ENGINE.getState() : null;
      const ui = state?.ui?.status;
      
      if (ui) {
        const elLabel = document.getElementById("boss-label");
        const elTitle = document.getElementById("boss-title");
        const elFill = document.getElementById("boss-bar-fill");
        const elLag = document.getElementById("boss-bar-lag");
        const elHpTxt = document.getElementById("boss-hp-text");
        const elPanel = document.getElementById("boss-panel");

        const ratio = clamp01(ui.progress ?? 0);

        // --- 次ステージ・ボスの出現検知 (V1.1改修) ---
        const isLevelChanged = (state.level !== lastLevel);
        
        if ((isLevelChanged || ratio > lastProgress + 0.6) && elPanel) {
          elPanel.classList.remove("boss-spawn");
          void elPanel.offsetWidth;
          elPanel.classList.add("boss-spawn");
          if (window.showRaidStamp) window.showRaidStamp("./assets/stamp_start.png");

          // UIへの反映が完了したタイミングで記録を更新（起動時の取りこぼし防止）
          lastProgress = ratio;
          lastLevel = state.level;
        } else if (elPanel) {
          // UIは存在するが変化がない通常の追従
          lastProgress = ratio;
          lastLevel = state.level;
        }

        if (elTitle) elTitle.textContent = ui.title || "";
        if (elLabel) elLabel.textContent = ui.label || "";
        if (elFill) {
          elFill.style.width = `${(ratio * 100).toFixed(2)}%`;
          if (ui.color) elFill.style.backgroundColor = ui.color;
        }
        /* 遅延ゲージ */
        if (elLag) {
          if (ratio > lagRatio) lagRatio = ratio;
          else lagRatio += (ratio - lagRatio) * 0.05;
          elLag.style.width = `${(lagRatio * 100).toFixed(2)}%`;
        }
        if (elHpTxt) elHpTxt.textContent = ui.text || "";

        // 特殊状態演出 (無敵など)
        if (elPanel) {
          const isInvincible = performance.now() < (state.invincibleUntil || 0);
          if (isInvincible) elPanel.classList.add("is-boss-invincible");
          else elPanel.classList.remove("is-boss-invincible");
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

  function showRaidStamp(defaultPath) {
    const el = document.getElementById("raid-stamp");
    if (!el) return;

    const cfg = getMergedConfig();
    if (cfg.USE_STAMP === false) return;

    // 個別設定があれば上書き、なければ引数のデフォルトパスを使用
    let imgSource = defaultPath;
    if (defaultPath.includes("start")) {
      imgSource = cfg.STAMP_START_URL || defaultPath;
    } else if (defaultPath.includes("defeat")) {
      imgSource = cfg.STAMP_DEFEAT_URL || defaultPath;
    }

    // エラーハンドラ (onerror) 付与：読み込めない場合は要素ごと隠す
    el.innerHTML = `<img src="${imgSource}" alt="" onerror="this.style.display='none'">`;

    // CSSアニメを毎回再トリガー
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  // ★グローバルに公開
  window.showRaidStamp = showRaidStamp;

  /**
   * 動画カットイン演出
   */
  window.playVideoEffect = (path) => {
    const v = document.getElementById("video-overlay");
    if (!v || !path) return;

    v.src = path;
    v.hidden = false;
    v.currentTime = 0;
    v.play().catch(err => {
      console.warn("[VIDEO] Playback failed:", err);
      v.hidden = true;
    });

    v.onended = () => {
      v.hidden = true;
      v.src = ""; // リソース解放
    };
    v.onerror = () => {
      console.warn("[VIDEO] Load error:", path);
      v.hidden = true;
    };
  };
})();

// ===== 5. 起動処理 =====
OneSDK.ready().then(() => {
  OneSDK.setup({ mode: 'diff' });
  document.body.removeAttribute('hidden');
  OneSDK.connect();
});
