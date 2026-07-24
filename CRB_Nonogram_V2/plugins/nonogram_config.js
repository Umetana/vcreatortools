(function () {
  window.NONOGRAM_CONFIG = Object.assign(
    {
      POLL_DURATION_SECONDS: 15,
      RESULT_DURATION_SECONDS: 3,
      TOP_CANDIDATE_COUNT: 3,
      SHOW_ADMIN_UI: true,
    },
    window.NONOGRAM_CONFIG || {},
  );
})();
