(function (global) {
  const VCT_SDK_PATHS = [
    "./_lib/vct_sdk.js?v=2.0.3-dev",
    "../_vct_core/js/vct_sdk.js?v=2.0.3-dev"
  ];

  const APP_SCRIPTS = [
    "./js/defaults.js",
    "./js/config-store.js",
    "./js/info-rotator.js",
    "./js/comments.js",
    "./js/settings-ui.js",
    "./js/hud.js",
    "./js/debug.js"
  ];

  function hasVctSdk() {
    return !!(global.VCT_SDK && typeof global.VCT_SDK.normalize === "function");
  }

  function debugWarn(...args) {
    if (global.VCT_INFO_HUD_CONFIG?.DEBUG) console.warn("[VCT_InfoHUD]", ...args);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`script load failed: ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadVctSdk() {
    if (hasVctSdk()) return "preloaded";

    for (const src of VCT_SDK_PATHS) {
      try {
        await loadScript(src);
        if (hasVctSdk()) return src;
      } catch (err) {
        debugWarn(err.message || err);
      }
    }

    return null;
  }

  async function boot() {
    const loaded = await loadVctSdk();
    if (!loaded) throw new Error("vct_sdk.js was not loaded.");

    for (const src of APP_SCRIPTS) {
      await loadScript(src);
    }
  }

  boot().catch((err) => {
    debugWarn("boot failed", err);
  });
})(window);
