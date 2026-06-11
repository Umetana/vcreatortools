/**
 * プラグイン名: スターターキット (ロジック型)
 * 概要: 新しいゲームルールを作成するための最小構成テンプレートです。
 */
(function() {
  if (!window.ENGINE) return;

  /**
   * 共有 state の中に Starter 専用名前空間を用意します。
   * Core API は増やさず、plugin 側で衝突回避するための基本パターンです。
   */
  function ensureStarterState(state) {
    state.starter = state.starter || {};
    state.starter.runtime = state.starter.runtime || {};
    state.starter.stats = state.starter.stats || {};
    state.starter.ui = state.starter.ui || {};
    state.starter.persist = state.starter.persist || {};
    return state.starter;
  }

  const StarterLogicPlugin = {
    name: "StarterLogic", // プラグインの一意の名前

    /**
     * すべての構成パーツ（Logic, Config, UI, Style）を外部マニフェストファイルで一括管理します。
     */
    manifest: "./js/plugins/_starter_kit/plugin_manifest.js",

    /**
     * 初期化時に一度だけ実行されます。
     * @param {Object} ctx - コンテキスト (now: 現在時刻)
     * @param {Object} state - エンジン全体の共有ステート
     * @param {Object} cfg - 統合された設定オブジェクト
     */
    onInit(ctx, state, cfg) {
      console.log("[Starter] Plugin Initialized.");

      const s = ensureStarterState(state);
      const c = window.STARTER_CONFIG || {};
      const threshold = Number(c.THRESHOLD);

      // runtime: コメントごとに変わる一時情報
      s.runtime.threshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 10;
      s.runtime.lastDamage = 0;
      s.runtime.lastSpecialAt = 0;

      // stats: ゲーム進行で増える集計値
      s.stats.count = Number(s.stats.count) || 0;
      s.stats.totalComments = Number(s.stats.totalComments) || 0;
      s.stats.totalDamage = Number(s.stats.totalDamage) || 0;

      // ui: UI表示用の値
      s.ui.counterText = String(s.stats.count);

      // persist: 将来の永続化用メタ情報（置き場だけ先に確保）
      s.persist.version = 1;
      s.persist.needsSave = false;

      const counterEl = document.getElementById("starter-count");
      if (counterEl) counterEl.textContent = s.ui.counterText;

      if (c.MESSAGE) console.log(`[Starter] ${c.MESSAGE}`);
    },

    /**
     * エンジンの毎フレーム更新時に実行されます。
     */
    onUpdate(ctx, state, cfg) {
      // 継続的な処理（タイマー等）をここに書きます
    },

    /**
     * コメント受信時に、ダメージ計算などの「前」に実行されます。
     * ctx.terminated = true をセットすると、そのコメントの処理を中断できます。
     */
    beforeComment(ctx, state, cfg) {
      // 特定のコメントを無視したい場合などに使用
    },

    /**
     * ダメージ計算ロジック。
     * ここでは「計算」に集中し、state の反映は afterComment に寄せます。
     */
    onCalculateDamage(ctx, state, cfg) {
      const s = ensureStarterState(state);
      const comment = ctx.commentData || {};
      const text = String(comment.text || "");

      // 例: 文字数に応じてダメージを与える
      ctx.dmg = text.length;

      // 攻撃名（ログ用）をセット
      ctx.attack = { name: "パワー・オブ・ワード" };

      // 計算結果のメモ（runtime）
      s.runtime.lastDamage = ctx.dmg;

      console.log(`[Starter] Processed comment: ${text} -> ${ctx.dmg} dmg`);
    },

    /**
     * コメント処理の最終反映を担当します。
     * 推奨: 演出は FX.push 直呼びではなく ctx.events.push で要求します。
     */
    afterComment(ctx, state, cfg) {
      const s = ensureStarterState(state);

      // stats 更新
      s.stats.count++;
      s.stats.totalComments++;
      s.stats.totalDamage += Math.max(0, Number(ctx.dmg) || 0);

      // ui 更新
      s.ui.counterText = String(s.stats.count);
      const counterEl = document.getElementById("starter-count");
      if (counterEl) counterEl.textContent = s.ui.counterText;

      // 将来 localStorage へ保存する場合のフラグ置き場
      s.persist.needsSave = true;

      // 一定回数ごとに演出を出す（既存デモ挙動を維持）
      if (s.stats.count >= s.runtime.threshold) {
        s.stats.count = 0;
        s.ui.counterText = "0";
        if (counterEl) counterEl.textContent = s.ui.counterText;
        s.runtime.lastSpecialAt = ctx.now;
        console.log("[Starter] Threshold reached!");

        // 推奨ルート: ctx.events に積む -> script.js -> FX.push
        ctx.events.push({
          type: "hit",
          text: "SPECIAL!",
          motion: "pop",
          scale: 2.0,
          color: { r: 255, g: 255, b: 0 }
        });
      }
    }
  };

  // エンジンに登録
  window.ENGINE.use(StarterLogicPlugin);
})();
