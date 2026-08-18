/* Ms.Bridge V2 v0.6.0-dev - OneComme custom template
   - Subscribe OneSDK comments/meta
   - Send v1-style envelope with schema/eventType
   - Support comment payload format: raw | normalized | both
   - Generate normalized payloads with VCT_SDK.normalize()
   - Sequential delivery queue with short retries
*/

const STORAGE_KEY = "ms_bridge_v2_settings_v04";
const EVENT_SCHEMA = "msbridge.event.v1";
const BRIDGE_VERSION = "0.6.0-dev";
const MAX_QUEUE_SIZE = 200;
const MAX_SEND_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [250, 750];

function safeNow() { return Date.now(); }

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = String(html ?? "");
  return (div.textContent || "").trim();
}

function isLocalhostUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const host = (u.hostname || "").toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
    return (u.protocol === "http:" || u.protocol === "https:") && isLocal;
  } catch {
    return false;
  }
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, Math.trunc(x)));
}

function supportsRawPayload(format) {
  return format === "raw" || format === "both";
}

function supportsNormalizedPayload(format) {
  return format === "normalized" || format === "both";
}

function normalizeCommentFormat(format) {
  return (format === "raw" || format === "both") ? format : "normalized";
}

function buildSourceInfo() {
  return {
    app: "onecomme",
    bridge: "Ms.Bridge_V2",
    bridgeVersion: BRIDGE_VERSION,
    templateVersion: "v2"
  };
}

const app = Vue.createApp({
  setup() {
    document.body.removeAttribute("hidden");
  },
  data() {
    const defaults = {
      enabled: false,
      isRunning: true,
      endpoint: "http://127.0.0.1:3000/bridge",

      // raw comment send
      sendComment: false,
      commentFormat: "normalized", // normalized | both | raw
      // meta send
      sendMeta: false,
      metaCooldownMs: 1000,

      bg: { r: 255, g: 255, b: 255, a: 0.55 },
      fg: { r: 0, g: 0, b: 0 }
    };

    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { }

    const bridge = Object.assign({}, defaults, saved || {});
    // Unified server migration: replace the retired development port.
    if (bridge.endpoint === "http://127.0.0.1:3100/bridge" ||
        bridge.endpoint === "http://localhost:3100/bridge") {
      bridge.endpoint = defaults.endpoint;
    }
    bridge.bg = Object.assign({}, defaults.bg, (saved && saved.bg) || {});
    bridge.fg = Object.assign({}, defaults.fg, (saved && saved.fg) || {});

    bridge.commentFormat = normalizeCommentFormat(bridge.commentFormat);

    return {
      bridge,
      stats: { seen: 0, sent: 0, fail: 0, dropped: 0 },
      logs: [],
      commentCache: new Map(),
      commentIndex: 0,
      lastMetaAt: 0,
      sendQueue: [],
      queueBusy: false,
    };
  },
  computed: {
    panelStyle() {
      const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v)));
      const r = clamp(this.bridge.bg?.r ?? 255, 0, 255);
      const g = clamp(this.bridge.bg?.g ?? 255, 0, 255);
      const b = clamp(this.bridge.bg?.b ?? 255, 0, 255);
      const a = clamp(this.bridge.bg?.a ?? 0.55, 0, 1);
      const fr = clamp(this.bridge.fg?.r ?? 0, 0, 255);
      const fg = clamp(this.bridge.fg?.g ?? 0, 0, 255);
      const fb = clamp(this.bridge.fg?.b ?? 0, 0, 255);
      return { background: `rgba(${r},${g},${b},${a})`, color: `rgb(${fr},${fg},${fb})` };
    },
    endpointIsLocalhost() {
      return isLocalhostUrl(this.bridge.endpoint);
    }
  },
  watch: {
    bridge: {
      deep: true,
      handler() {
        const s = {
          enabled: !!this.bridge.enabled,
          isRunning: !!this.bridge.isRunning,
          endpoint: String(this.bridge.endpoint || "").trim(),

          sendComment: !!this.bridge.sendComment,
          commentFormat: normalizeCommentFormat(this.bridge.commentFormat),
          sendMeta: !!this.bridge.sendMeta,
          metaCooldownMs: clampInt(this.bridge.metaCooldownMs, 0, 60000),

          bg: this.bridge.bg,
          fg: this.bridge.fg,
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { }
      }
    }
  },
  methods: {
    start() {
      this.bridge.isRunning = true;
      this.log("info", "Start: 受付を開始しました");
    },
    stop() {
      this.bridge.isRunning = false;
      this.log("info", "Stop: 受付を停止しました");
    },
    reset() {
      this.stats = { seen: 0, sent: 0, fail: 0, dropped: 0 };
      this.logs = [];
      this.lastMetaAt = 0;
      this.commentCache = new Map();
      this.commentIndex = 0;
      this.log("info", "Reset: 状態を初期化しました");
    },
    log(level, msg) {
      const ts = new Date().toLocaleTimeString();
      this.logs.unshift({ level, msg, ts });
      if (this.logs.length > 60) this.logs.pop();
    },
    buildEnvelope(eventType, payload, sequence = {}) {
      const sentAt = new Date().toISOString();
      return {
        schema: EVENT_SCHEMA,
        eventType,
        sentAt,
        source: buildSourceInfo(),
        sequence: {
          commentIndex: sequence.commentIndex ?? null,
          receivedAt: sequence.receivedAt ?? safeNow(),
        },
        payload,
      };
    },
    buildCommentPayload(comment) {
      const format = normalizeCommentFormat(this.bridge.commentFormat);
      const payload = {};

      if (supportsRawPayload(format)) {
        payload.raw = comment;
      }

      if (supportsNormalizedPayload(format)) {
        try {
          const vctSdk = window.VCT_SDK || {};
          if (typeof vctSdk.normalize !== "function") {
            throw new Error("VCT_SDK.normalize() が利用できません");
          }
          payload.normalized = vctSdk.normalize(comment);
          payload.sdk = {
            name: "VCT SDK",
            version: vctSdk.VERSION || "unknown",
          };
        } catch (e) {
          payload.normalized = null;
          this.log("err", `normalized生成失敗: ${String(e?.message || e)}`);
        }
      }

      return payload;
    },
    buildCommentEvent(comment) {
      return this.buildEnvelope("comment", this.buildCommentPayload(comment), {
        commentIndex: comment?.commentIndex ?? null,
        receivedAt: safeNow(),
      });
    },
    buildMetaEvent(data) {
      return this.buildEnvelope("meta", { raw: data }, {
        receivedAt: safeNow(),
      });
    },
    enqueueEvent(ev, kind) {
      if (!this.bridge.enabled) return;
      if (!this.endpointIsLocalhost) {
        this.stats.fail += 1;
        this.log("err", "送信先がlocalhostではありません（ブロック）");
        return;
      }
      if (kind === "meta") {
        const now = safeNow();
        const cd = clampInt(this.bridge.metaCooldownMs, 0, 60000);
        if (cd > 0 && (now - this.lastMetaAt) < cd) return;
        this.lastMetaAt = now;
      }
      if (this.sendQueue.length >= MAX_QUEUE_SIZE) {
        this.stats.dropped += 1;
        this.log("err", `キュー上限(${MAX_QUEUE_SIZE})のため破棄: ${kind}`);
        return;
      }
      this.sendQueue.push({ ev, kind });
      this.processQueue();
    },
    async processQueue() {
      if (this.queueBusy) return;
      this.queueBusy = true;
      while (this.sendQueue.length > 0) {
        const item = this.sendQueue[0];
        let sent = false;
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
          try {
            const res = await fetch(this.bridge.endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.ev),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            sent = true;
            break;
          } catch (e) {
            lastError = e;
            if (attempt < MAX_SEND_ATTEMPTS) await wait(RETRY_DELAYS_MS[attempt - 1]);
          }
        }
        this.sendQueue.shift();
        if (sent) {
          this.stats.sent += 1;
        } else {
          this.stats.fail += 1;
          this.log("err", `送信失敗(${MAX_SEND_ATTEMPTS}回): ${String(lastError?.message || lastError)}`);
        }
      }
      this.queueBusy = false;
    },
    onNewComment(comment) {
      if (!this.bridge.isRunning) return;

      this.stats.seen += 1;
      if (this.bridge.sendComment) {
        const cev = this.buildCommentEvent(comment);
        this.enqueueEvent(cev, "comment");
      }
    },
    onNewMeta(data) {
      if (!this.bridge.isRunning) return;
      if (!this.bridge.sendMeta) return;

      const mev = this.buildMetaEvent(data);
      this.enqueueEvent(mev, "meta");

      const v = data?.data?.viewer ?? "-";
      const l = data?.data?.upVote ?? "-";
      const s = data?.data?.subscriberCount ?? "-";
      this.log("info", `META: 同接:${v} 高評価:${l} 登録者:${s}`);
    }
  },
  mounted() {
    OneSDK.setup({
      permissions: OneSDK.usePermission([OneSDK.PERM.COMMENT, OneSDK.PERM.META]),
    });

    OneSDK.subscribe({
      action: "comments",
      callback: (comments) => {
        comments.forEach((comment) => {
          const id = comment?.data?.id;
          if (!id) return;

          if (this.commentCache.has(id)) {
            comment.commentIndex = this.commentCache.get(id);
            return;
          }

          // 新規コメントの処理
          comment.commentIndex = this.commentIndex;
          this.commentCache.set(id, this.commentIndex);
          this.commentIndex += 1;

          this.onNewComment(comment);

          // キャッシュが肥大化しすぎないよう古いものを削除（最大1000件程度）
          if (this.commentCache.size > 1000) {
            const firstKey = this.commentCache.keys().next().value;
            this.commentCache.delete(firstKey);
          }
        });
      },
    });

    OneSDK.subscribe({
      action: "meta",
      callback: (data) => {
        this.onNewMeta(data);
      },
    });

    OneSDK.connect();

      this.log("info", "起動しました（comment/meta購読中）");
      if (!this.endpointIsLocalhost) this.log("err", "注意: endpointがlocalhostではありません（送信はブロックされます）");
  },
});

OneSDK.ready().then(() => {
  app.mount("#container");
});
