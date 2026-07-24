window.CONFIG = {
  PLUGINS: ["./plugins/nonogram_logic.js"],
  HIDE_DEFAULT_COMMENTS: true,
  MAX_PROCESS_PER_SEC: 120,
  FX_INTENSITY: 1,
  DEBUG: false,
};

window.NONOGRAM_CONFIG = {
  POLL_DURATION_SECONDS: 15,
  RESULT_DURATION_SECONDS: 3,
  TOP_CANDIDATE_COUNT: 3,
  SHOW_ADMIN_UI: true,
};

document.documentElement.style.setProperty("--show-comments", "none");
