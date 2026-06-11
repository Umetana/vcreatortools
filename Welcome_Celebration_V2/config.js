window.CONFIG = {
  TEMPLATE_VERSION: "2.0.0",

  // v0.1: 加入/継続のみ。ギフト系は後で membership_gift / membership_gift_received を追加。
  ENABLED_EVENT_KINDS: [
    "member_join",
    "member_milestone"
  ],

  DISPLAY_DURATION: 5.2,
  CARD_SCALE: 1.0,
  FX_INTENSITY: 1.0,
  CONFETTI_ENABLED: true,
  CONFETTI_AMOUNT: 150,
  SPARKLES_ENABLED: true,
  SPARKLE_AMOUNT: 80,
  MAX_QUEUE: 8,

  HIDE_DEFAULT_COMMENTS: true,
  CLEAR_ON_ONESDK_CLEAR: true,
  DEBUG: false
};

document.documentElement.style.setProperty(
  "--show-comments",
  CONFIG.HIDE_DEFAULT_COMMENTS ? "none" : "block"
);
