window.CONFIG = {
  // === CommentRaid: Base Config ===
  // 導入したい「ルールパック」のメインプラグインを記述します
  PLUGINS: [
    "./js/plugins/_starter_kit/starter_logic.js"
  ],

  HIDE_DEFAULT_COMMENTS: true, // trueで表示を消す
  MAX_ACTIVE: 30,
  FONT_SIZE: 36,
  FX_INTENSITY: 1.0,         // 演出強度倍率
  USE_USER_COLOR: true,      // ユーザーカラーを反映するか (falseで通常コメは白)
  SAVE_PROGRESS: false,       // 進行状況（Lv）を保存し、次回起動時に再開するか
  RESET_PROGRESS: true,      // trueにして保存・リロードすると進捗をリセットします
  DEBUG: false,

};

// CSS変数制御
document.documentElement.style.setProperty(
  "--show-comments",
  CONFIG.HIDE_DEFAULT_COMMENTS ? "none" : "block"
);
