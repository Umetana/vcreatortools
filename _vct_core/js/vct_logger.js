// ================================
// VCT Core Logger
// ================================

(function (global) {
  const DEFAULT_OPTIONS = {
    debug: false,
    maxLines: 80,
    prefix: '[VCT_Core]'
  };

  const state = {
    options: { ...DEFAULT_OPTIONS },
    lines: [],
    subscribers: new Set()
  };

  function init(options = {}) {
    state.options = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    return api;
  }

  function notify() {
    const lines = getLines();
    state.subscribers.forEach((handler) => {
      try {
        handler(lines);
      } catch (err) {
        console.error(`${state.options.prefix} logger subscriber error`, err);
      }
    });
  }

  function write(message, level = 'info') {
    const normalizedLevel = String(level || 'info').toLowerCase();
    const line = `[${new Date().toLocaleTimeString()}] ${normalizedLevel.toUpperCase()} ${message}`;
    state.lines.push(line);

    const maxLines = Number(state.options.maxLines) || DEFAULT_OPTIONS.maxLines;
    if (state.lines.length > maxLines) {
      state.lines.splice(0, state.lines.length - maxLines);
    }

    if (normalizedLevel === 'error') {
      console.error(state.options.prefix, message);
    } else if (normalizedLevel === 'warn') {
      console.warn(state.options.prefix, message);
    } else if (state.options.debug) {
      console.log(state.options.prefix, message);
    }

    notify();
  }

  function info(message) {
    write(message, 'info');
  }

  function warn(message) {
    write(message, 'warn');
  }

  function error(message) {
    write(message, 'error');
  }

  function getLines() {
    return state.lines.slice();
  }

  function clear() {
    state.lines = [];
    notify();
  }

  function subscribe(handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }

    state.subscribers.add(handler);
    handler(getLines());

    return () => {
      state.subscribers.delete(handler);
    };
  }

  const api = {
    init,
    info,
    warn,
    error,
    getLines,
    clear,
    subscribe
  };

  global.VCT_LOGGER = api;
})(window);
