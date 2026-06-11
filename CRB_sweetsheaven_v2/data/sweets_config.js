/**
 * Sweets Heaven Configuration
 */
window.CONFIG_SWEETS = {
  // UI上部パネルのタイトル表示
  UI_TITLE: "SWEETS HEAVEN",
  // UI上部パネルのラベル表示
  UI_LABEL: "TOTAL CALORIES",
  // 総カロリー表示の単位
  CALORIE_TEXT_SUFFIX: "kcal",
  // UI表示モード: full | top_only | bottom_only | effect_only
  UI_DISPLAY_MODE: "full",
  // UI表示モード切替キー。例: "F8"。空文字で無効
  UI_TOGGLE_KEY: "F8",
  // トグルキー押下時に巡回するモード
  UI_TOGGLE_SEQUENCE: ["full", "effect_only"],
  // ゲージを何 kcal ごとに1周させるか
  GAUGE_CYCLE_CALORIES: 100000,
  // 10万 kcal ごとに切り替えるゲージ色
  GAUGE_PHASE_COLORS: [
    "#ff8fd7",
    "#ff7db7",
    "#ff8b6b",
    "#ffbc5e",
    "#ffe16b",
    "#9be36b",
    "#58d7a4",
    "#58c8ff",
    "#7a98ff",
    "#c285ff"
  ],
  // 虹演出を発動する累計 kcal の区切り
  RAINBOW_MILESTONE_CALORIES: 1000000,
  // 虹演出の継続時間(ms)
  RAINBOW_DURATION_MS: 10000,

  // 画面内に同時表示するスイーツ最大数
  MAX_ACTIVE_SWEETS: 30,
  // 落下演出の最短秒数
  FALL_DURATION_MIN: 1.5,
  // 落下演出の最長秒数
  FALL_DURATION_MAX: 2.5,
  // 左右のゆらゆら幅の基準値
  SWAY_AMOUNT: 20,
  // 出現位置の上限範囲（画面上部の何割までを使うか）
  SPAWN_AREA_RATIO: 0.25,
  // ログウインドウに入らないための下限ライン（画面高に対する割合）
  DESPAWN_FLOOR_RATIO: 0.7,
  // 1個あたりの最小落下距離
  FALL_DISTANCE_MIN: 220,
  // 1個あたりの最大落下距離
  FALL_DISTANCE_MAX: 420,
  // スイーツの表示モード: image | emoji
  SWEET_DISPLAY_MODE: "image",
  // 絵文字スイーツの基本サイズ(px)
  SWEET_BASE_SIZE: 100,
  // 通常コメント時の最小スケール
  SWEET_SCALE_MIN: 0.85,
  // 通常コメント時の最大スケール
  SWEET_SCALE_MAX: 1.1,
  // ギフトコメント時の最小スケール
  GIFT_SWEET_SCALE_MIN: 0.95,
  // ギフトコメント時の最大スケール
  GIFT_SWEET_SCALE_MAX: 1.3,
  // kcalポップアップのフォントサイズ
  KCAL_POPUP_FONT_SIZE: 45,

  // ログ1行の最大文字数
  MAX_LOG_CHARS: 32,
  // ログウインドウの最大表示行数
  MAX_LOG_LINES: 8,
  // ログの自動スクロール速度
  LOG_SCROLL_SPEED: 90,
  // ログ表示形式: battle_1line なら変化ログ、name_comment なら通常コメント表示
  LOG_FORMAT: "battle_1line", // "battle_1line", "name_comment"
  // ログに絵文字を表示するか
  LOG_SHOW_EMOJI: true,
  // 通常コメントのログにユーザー色を使うか
  LOG_USE_USER_COLOR: false,
  // ギフトコメントのログにギフト色を使うか
  LOG_USE_GIFT_COLOR: true,
  // ギフト時にログ末尾へ付ける追加文言
  GIFT_LOG_SUFFIX: "CALORIE BOOST!",

  // TOTAL CALORIES 表示の追従速度（大きいほど素早く追いつく）
  COUNTUP_LERP: 0.12,
  // スタンプ演出を使うか
  USE_STAMP: false,

  // ギフト種別ごとの kcal 倍率と生成数レンジ
  GIFT_TIERS: {
    // 通常コメント
    normal: { multiplierMin: 1.0, multiplierMax: 1.0, spawnMin: 1, spawnMax: 1 },
    // 小ギフト
    small: { multiplierMin: 1.5, multiplierMax: 1.5, spawnMin: 2, spawnMax: 4 },
    // 中ギフト
    medium: { multiplierMin: 2.0, multiplierMax: 3.0, spawnMin: 4, spawnMax: 8 },
    // 高額ギフト
    large: { multiplierMin: 3.0, multiplierMax: 5.0, spawnMin: 8, spawnMax: 15 },
    // 赤スパ相当
    premium: { multiplierMin: 3.0, multiplierMax: 5.0, spawnMin: 10, spawnMax: 30 }
  }
};

(function applySweetsConfigBridge() {
  window.CONFIG_RAID = window.CONFIG_SWEETS;
})();
