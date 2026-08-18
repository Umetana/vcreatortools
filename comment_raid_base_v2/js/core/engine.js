/**
 * CommentRaid Engine V2.1.0-dev (Base Edition)
 * A lightweight dispatcher that manages plugins and shared state.
 */
window.ENGINE = (function () {

  let state = {};
  let cfg = {};
  let plugins = [];

  function getPluginName(plugin, fallback = "anonymous") {
    return plugin?.name || fallback;
  }

  function toErrorText(err) {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
      return JSON.stringify(err);
    } catch (_) {
      return String(err);
    }
  }

  /**
   * Dynamically loads a script file.
   */
  async function loadScript(url) {
    if (document.querySelector(`script[src="${url}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load error: ${url}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Dynamically loads a CSS file.
   */
  async function loadStyle(url) {
    if (document.querySelector(`link[href="${url}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Style load error: ${url}`));
      document.head.appendChild(link);
    });
  }

  /**
   * Fetches an HTML snippet and injects it into the DOM.
   */
  async function loadUI(url, targetId = "ui-root") {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`UI fetch error: ${response.status}`);
      const html = await response.text();
      const target = document.getElementById(targetId);
      if (target) {
        target.insertAdjacentHTML("beforeend", html);
      } else {
        console.warn(`[ENGINE] UI target not found: ${targetId}`);
      }
    } catch (e) {
      console.error(`[ENGINE] loadUI error: ${url}`, e);
    }
  }

  async function resolvePlugins() {
    const configPlugins = window.CONFIG?.PLUGINS || [];
    const manifestPlugins = window.PLUGIN_MANIFEST?.plugins || [];
    const initialUrls = [...new Set([...configPlugins, ...manifestPlugins])];
    
    // 1. Load initial entry plugins
    for (const url of initialUrls) {
      try {
        await loadScript(url);
      } catch (e) {
        console.error(`[ENGINE] Entry plugin load error: ${url}`, e);
      }
    }

    // 2. Resolve dependencies & manifests recursively
    const loadedUrls = new Set(initialUrls);

    async function loadList(list, sourceName, type = "script") {
      if (!list || !Array.isArray(list)) return;
      for (const url of list) {
        if (type === "script" && loadedUrls.has(url)) continue;
        try {
          if (type === "script") {
            await loadScript(url);
            loadedUrls.add(url);
          } else if (type === "style") {
            await loadStyle(url);
          } else if (type === "ui") {
            await loadUI(url);
          }
        } catch (e) {
          console.error(
            `[ENGINE] Asset load failed | source=${sourceName} | type=${type} | url=${url} | error=${toErrorText(e)}`,
            e
          );
        }
      }
    }

    let processedCount = 0;
    while (processedCount < plugins.length) {
      const p = plugins[processedCount];
      const pluginName = getPluginName(p, `plugin#${processedCount}`);
      
      try {
        // A. Style
        if (p.style) {
          try {
            await loadStyle(p.style);
          } catch (e) {
            console.error(
              `[ENGINE] Plugin style load failed | plugin=${pluginName} | url=${p.style} | error=${toErrorText(e)}`,
              e
            );
          }
        }

        // B. UI
        if (p.ui) {
          try {
            await loadUI(p.ui);
          } catch (e) {
            console.error(
              `[ENGINE] Plugin UI load failed | plugin=${pluginName} | url=${p.ui} | error=${toErrorText(e)}`,
              e
            );
          }
        }

        // C. Manifest (External or Array)
        if (typeof p.manifest === "string") {
          try {
            await loadScript(p.manifest);
          } catch (e) {
            console.error(
              `[ENGINE] Manifest script load failed | plugin=${pluginName} | url=${p.manifest} | error=${toErrorText(e)}`,
              e
            );
            processedCount++;
            continue;
          }

          const manifest = window.RULE_MANIFEST;
          if (manifest) {
            if (Array.isArray(manifest)) {
              // Legacy Array format
              await loadList(manifest, `${pluginName} (external manifest)`);
            } else if (typeof manifest === "object") {
              // Consolidated Object format
              console.log(`[ENGINE] Processing consolidated manifest | plugin=${pluginName}`);
              if (manifest.scripts) await loadList(manifest.scripts, pluginName, "script");
              if (manifest.styles) await loadList(manifest.styles, pluginName, "style");
              if (manifest.ui) await loadList(manifest.ui, pluginName, "ui");
            }
            window.RULE_MANIFEST = null;
          } else {
            console.warn(
              `[ENGINE] Manifest script loaded but RULE_MANIFEST is empty | plugin=${pluginName} | url=${p.manifest}`
            );
          }
        } else if (Array.isArray(p.manifest)) {
          await loadList(p.manifest, `${pluginName} (manifest array)`);
        }

        // D. Core Dependencies
        if (p.dependencies) {
          await loadList(p.dependencies, `${pluginName} (deps)`);
        }
      } catch (e) {
        console.error(
          `[ENGINE] Plugin resolve step failed | plugin=${pluginName} | error=${toErrorText(e)}`,
          e
        );
      }
      processedCount++;
    }
  }

  async function init() {
    console.log("[ENGINE] Starting initialization phase...");
    
    // 0. Base configuration
    Object.assign(cfg, window.CONFIG || {});

    // 1. Dynamic loading
    try {
      await resolvePlugins();
    } catch (e) {
      console.error("[ENGINE] Plugin resolution failed:", e);
    }

    // 2. Initialize all registered plugins
    console.log(`[ENGINE] Initializing ${plugins.length} plugins...`);
    const ctx = { now: performance.now() };
    runHooks("onInit", ctx);
    
    console.log("[ENGINE] System Ready. Registered:", plugins.map(p => p.name || "anon"));
  }

  function update() {
    const ctx = { now: performance.now() };
    runHooks("onUpdate", ctx);
  }

  /**
   * Main entry point for comment processing.
   */
  function onComment(commentData) {
    if (plugins.length === 0) {
      console.warn("[ENGINE] No plugins to process comment.");
    }
    
    const ctx = {
      commentData,
      events: [],
      dmg: 0,
      attack: null,
      terminated: false,
      isBossAction: false,
      now: performance.now()
    };

    runHooks("beforeComment", ctx);
    if (ctx.terminated) return ctx.events;

    runHooks("onProcessAttack", ctx);
    if (ctx.terminated) return ctx.events;

    runHooks("onCalculateDamage", ctx);
    runHooks("afterCalculateDamage", ctx);
    runHooks("afterComment", ctx);

    return ctx.events;
  }

  /**
   * Executes a named hook across all registered plugins.
   */
  function runHooks(hookName, ctx) {
    for (let i = 0; i < plugins.length; i++) {
      const plugin = plugins[i];
      const pluginName = getPluginName(plugin, `plugin#${i}`);
      let hook = null;
      try {
        hook = plugin?.[hookName];
      } catch (e) {
        console.error(
          `[ENGINE] Hook resolve error | plugin=${pluginName} | hook=${hookName} | error=${toErrorText(e)}`,
          e
        );
        continue;
      }
      if (typeof hook !== "function") continue;
      try {
        const result = hook.call(plugin, ctx, state, cfg);
        if (result && typeof result.then === "function") {
          result.catch((e) => {
            console.error(
              `[ENGINE] Async hook error | plugin=${pluginName} | hook=${hookName} | error=${toErrorText(e)}`,
              e
            );
          });
        }
      } catch (e) {
        console.error(
          `[ENGINE] Hook error | plugin=${pluginName} | hook=${hookName} | error=${toErrorText(e)}`,
          e
        );
      }
    }
  }

  // --- Utility Helpers ---
  function parsePriceValue(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return Number.isFinite(val) ? val : 0;
    if (typeof val === "string") {
      const normalized = val.replace(/,/g, "").replace(/[^\d.-]/g, "");
      if (!normalized) return 0;
      const n = parseFloat(normalized);
      return Number.isFinite(n) ? n : 0;
    }
    if (typeof val === "object") {
      const micros = parsePriceValue(val.amountMicros);
      if (micros > 0) return micros / 1000000;
      const amount = parsePriceValue(val.amount);
      if (amount > 0) return amount;
    }
    return 0;
  }

  function extractGiftPrice(commentData) {
    const money = commentData?.monetization?.money || {};
    if (money.available !== true) return 0;
    return parsePriceValue(money.amount);
  }

  function getState() {
    return { ...state };
  }

  function use(plugin) {
    if (!plugin) return this;
    if (plugin.name && plugins.some(p => p.name === plugin.name)) {
      return this;
    }
    plugins.push(plugin);
    console.log(`[ENGINE] Plugin Registered: ${plugin.name || "anonymous"}`);
    return this;
  }

  // 自動起動: DOMContentLoaded か load の早い方で
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  } else {
    setTimeout(init, 0);
  }

  return {
    init,
    use,
    onComment,
    update,
    getState,
    extractGiftPrice
  };

})();
