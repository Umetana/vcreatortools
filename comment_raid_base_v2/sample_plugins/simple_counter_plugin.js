(() => {
  const simpleCounter = {
    onInit(ctx, state, cfg) {
      state.count = 0;

      // UI 初期化
      state.ui = state.ui || {};
      state.ui.status = {
        label: "Simple Counter",
        progress: 1,
        text: "0 comments"
      };
    },

    afterComment(ctx, state, cfg) {
      state.count++;

      // UI 更新
      state.ui.status.text = `${state.count} comments`;

      // 軽い演出
      ctx.events.push({
        motion: "float",
        text: "+1"
      });
    }
  };

  ENGINE.use(simpleCounter);
})();