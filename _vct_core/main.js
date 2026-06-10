(() => {
  const CONFIG = Object.assign({}, window.VCT_CORE_CONFIG || {});

  async function boot() {
    const logger = window.VCT_LOGGER.init({
      debug: !!CONFIG.debug,
      maxLines: 80,
      prefix: '[VCT_Core]'
    });

    const runtime = window.VCT_RUNTIME.init(CONFIG, { logger });
    window.VCT_UI.init({ runtime, logger });

    await runtime.start();
  }

  window.addEventListener('DOMContentLoaded', () => {
    boot().catch((err) => {
      const message = err?.message || String(err);
      if (window.VCT_LOGGER) {
        window.VCT_LOGGER.error(`boot error: ${message}`);
      } else {
        console.error('[VCT_Core] boot error:', err);
      }
    });
  });
})();
