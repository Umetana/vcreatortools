/**
 * Sweets Heaven Rule Pack Manifest
 */
window.RULE_MANIFEST = {
  // スクリプト（読み込み順序が重要なものは上に書く）
  scripts: [
    "./plugins/data/sweets_master.js",
    "./data/sweets_config.js",
    "./plugins/sweets_fx.js"
  ],

  // デザイン（CSS）
  styles: [
    "./plugins/style.css"
  ],

  // ユーザーインターフェース（HTML断片）
  ui: [
    "./plugins/ui.html"
  ]
};
