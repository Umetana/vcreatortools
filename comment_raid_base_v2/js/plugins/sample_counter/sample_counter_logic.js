/**
 * sample_counter: Raid 非依存の最小サンプルプラグイン
 */
(function () {
  if (!window.ENGINE) return;

  function ensureSampleCounterState(state) {
    state.sampleCounter = state.sampleCounter || {};
    state.sampleCounter.runtime = state.sampleCounter.runtime || {};
    state.sampleCounter.stats = state.sampleCounter.stats || {};
    state.sampleCounter.ui = state.sampleCounter.ui || {};
    state.sampleCounter.persist = state.sampleCounter.persist || {};
    return state.sampleCounter;
  }

  function updateCounterUi(s) {
    const titleEl = document.getElementById("sample-counter-title");
    const countEl = document.getElementById("sample-counter-count");
    if (titleEl) titleEl.textContent = s.ui.title || "SAMPLE COUNTER";
    if (countEl) countEl.textContent = s.ui.countText || "0";
  }

  const SampleCounterPlugin = {
    name: "SampleCounter",
    manifest: "./js/plugins/sample_counter/plugin_manifest.js",

    onInit(ctx, state, cfg) {
      const s = ensureSampleCounterState(state);
      const c = window.SAMPLE_COUNTER_CONFIG || {};
      const threshold = Number(c.THRESHOLD);

      // runtime: 一時情報
      s.runtime.threshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 5;

      // stats: 集計
      s.stats.count = Number(s.stats.count) || 0;
      s.stats.totalComments = Number(s.stats.totalComments) || 0;

      // ui: 表示
      s.ui.title = c.TITLE || "SAMPLE COUNTER";
      s.ui.countText = String(s.stats.count);

      // persist: 将来拡張の置き場のみ確保
      s.persist.needsSave = false;

      updateCounterUi(s);
    },

    afterComment(ctx, state, cfg) {
      const s = ensureSampleCounterState(state);
      s.stats.count++;
      s.stats.totalComments++;
      s.ui.countText = String(s.stats.count);
      s.persist.needsSave = true;
      updateCounterUi(s);

      if (s.stats.count % s.runtime.threshold === 0) {
        ctx.events.push({
          type: "count_milestone",
          motion: "float",
          text: `${s.stats.count} comments!`,
          color: "#7dd3fc",
          scale: 1.1
        });
      }
    }
  };

  window.ENGINE.use(SampleCounterPlugin);
})();

