// ================================
// VCT Core Runtime
// ================================

(function (global) {
  const DEFAULT_CONFIG = {
    enabled: true,
    streamId: null,
    debug: false,
    saveUsers: true,
    saveSupports: true,
    oneSdkMode: 'diff'
  };

  const MIGRATION_MARKER_KEY = 'vct_idb_migration.v1.commentraid_to_vct_common_data';

  const state = {
    config: { ...DEFAULT_CONFIG },
    logger: null,
    usersSaved: 0,
    supportsSaved: 0,
    lastCommentAt: null,
    lastUserSavedAt: null,
    lastSupportSavedAt: null,
    coreStatus: 'waiting',
    oneSdkStatus: 'waiting',
    dbReady: false,
    dbError: null,
    dbStats: {
      usersTotal: null,
      supportsTotal: null,
      lastRefreshedAt: null
    },
    subscribers: new Map()
  };

  function getLogger() {
    return state.logger || global.VCT_LOGGER || console;
  }

  function logInfo(message) {
    const logger = getLogger();
    if (typeof logger.info === 'function') logger.info(message);
    else if (typeof logger.log === 'function') logger.log(message);
  }

  function logWarn(message) {
    const logger = getLogger();
    if (typeof logger.warn === 'function') logger.warn(message);
    else if (typeof logger.log === 'function') logger.log(message);
  }

  function logError(message) {
    const logger = getLogger();
    if (typeof logger.error === 'function') logger.error(message);
    else if (typeof logger.log === 'function') logger.log(message);
  }

  function fallbackStreamId() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  function getStreamId() {
    if (state.config.runtimeStreamId) {
      return state.config.runtimeStreamId;
    }

    if (state.config.streamId) {
      return state.config.streamId;
    }

    if (global.VCT_IDB && typeof global.VCT_IDB.getDefaultStreamId === 'function') {
      return global.VCT_IDB.getDefaultStreamId();
    }

    return fallbackStreamId();
  }

  function getDbInfo() {
    const core = global.__VCT_IDB_CORE__ || {};
    return {
      name: core.DB_NAME || 'vct_common_data',
      version: core.DB_VERSION || 'unknown'
    };
  }

  function readMigrationMarker() {
    try {
      const raw = global.localStorage?.getItem(MIGRATION_MARKER_KEY) || '';
      if (!raw) {
        return null;
      }

      const marker = JSON.parse(raw);
      return marker && marker.status === 'completed' ? marker : { invalid: true };
    } catch (err) {
      return { invalid: true };
    }
  }

  function formatMigrationStatus(marker) {
    if (!marker) {
      return {
        text: 'not completed or unavailable',
        status: 'warn'
      };
    }

    if (marker.invalid) {
      return {
        text: 'invalid marker',
        status: 'bad'
      };
    }

    if (marker.skipped) {
      return {
        text: `skipped: ${marker.skipped}`,
        status: 'warn'
      };
    }

    return {
      text: `completed (${marker.supports || 0}/${marker.users || 0})`,
      status: 'ok'
    };
  }

  function getStatus() {
    const marker = readMigrationMarker();

    return {
      config: { ...state.config },
      coreStatus: state.coreStatus,
      oneSdkStatus: state.oneSdkStatus,
      streamId: getStreamId(),
      dbInfo: getDbInfo(),
      dbReady: state.dbReady,
      dbError: state.dbError,
      dbStats: { ...state.dbStats },
      usersSaved: state.usersSaved,
      supportsSaved: state.supportsSaved,
      lastCommentAt: state.lastCommentAt,
      lastUserSavedAt: state.lastUserSavedAt,
      lastSupportSavedAt: state.lastSupportSavedAt,
      migration: formatMigrationStatus(marker)
    };
  }

  function emit(eventName, payload) {
    const handlers = state.subscribers.get(eventName);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        logError(`runtime subscriber error: ${err?.message || err}`);
      }
    });
  }

  function emitStatus() {
    emit('status', getStatus());
  }

  function on(eventName, handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }

    if (!state.subscribers.has(eventName)) {
      state.subscribers.set(eventName, new Set());
    }

    const handlers = state.subscribers.get(eventName);
    handlers.add(handler);

    if (eventName === 'status') {
      handler(getStatus());
    }

    return () => {
      handlers.delete(handler);
    };
  }

  async function refreshDbStats(options = {}) {
    const { silent = false } = options;

    if (!global.VCT_IDB) {
      return;
    }

    try {
      const [users, supports] = await Promise.all([
        global.VCT_IDB.getUsers(),
        global.VCT_IDB.getSupports()
      ]);

      state.dbStats.usersTotal = Array.isArray(users) ? users.length : 0;
      state.dbStats.supportsTotal = Array.isArray(supports) ? supports.length : 0;
      state.dbStats.lastRefreshedAt = Date.now();
      emitStatus();

      if (!silent) {
        logInfo(`DB stats refreshed: users=${state.dbStats.usersTotal}, supports=${state.dbStats.supportsTotal}`);
      }
    } catch (err) {
      logError(`DB stats refresh failed: ${err?.message || err}`);
      emitStatus();
    }
  }

  async function clearSupportsByCurrentStream() {
    const streamId = getStreamId();
    if (!streamId) {
      logWarn('streamId is empty; current stream supports clear skipped');
      return;
    }

    await global.VCT_IDB.clearSupports({ streamId });
    logInfo(`supports cleared for streamId: ${streamId}`);
    await refreshDbStats({ silent: true });
  }

  async function clearAllSupports() {
    await global.VCT_IDB.clearSupports();
    logInfo('all supports cleared');
    await refreshDbStats({ silent: true });
  }

  async function clearAllUsers() {
    await global.VCT_IDB.clearUsers();
    logInfo('all users cleared');
    await refreshDbStats({ silent: true });
  }

  async function handleIncomingComment(rawComment) {
    state.lastCommentAt = Date.now();
    emitStatus();

    const commentData = global.VCT ? global.VCT.parseCore(rawComment) : null;
    if (!commentData) {
      logWarn('comment parse returned empty');
      return;
    }

    if (state.config.saveUsers) {
      const userRecord = global.VCT.buildUserProfileRecord(commentData, {
        streamId: getStreamId(),
        now: () => Date.now()
      });
      await global.VCT_IDB.saveUserProfile(userRecord);
      state.usersSaved += 1;
      state.lastUserSavedAt = Date.now();
    }

    if (!state.config.saveSupports) {
      emitStatus();
      await refreshDbStats({ silent: true });
      return;
    }

    const supportRecord = global.VCT.buildSupportRecord(commentData, {
      streamId: getStreamId(),
      buildUserKey: global.VCT_IDB.buildUserKey,
      now: () => Date.now()
    });

    if (!supportRecord) {
      emitStatus();
      await refreshDbStats({ silent: true });
      return;
    }

    await global.VCT_IDB.saveSupport(supportRecord);
    state.supportsSaved += 1;
    state.lastSupportSavedAt = Date.now();
    logInfo(`support saved: ${supportRecord.userName} / ${supportRecord.amount}`);
    emitStatus();
    await refreshDbStats({ silent: true });
  }

  function setupOneSDK() {
    if (!global.OneSDK) {
      state.oneSdkStatus = 'not found';
      emitStatus();
      logError('OneSDK not found');
      return;
    }

    global.OneSDK.setup({
      mode: state.config.oneSdkMode || 'diff',
      permissions: ['comments', 'clear']
    });

    global.OneSDK.subscribe({
      action: 'comments',
      callback: (res) => {
        const list = Array.isArray(res) ? res : [res];
        list.forEach((rawComment) => {
          handleIncomingComment(rawComment).catch((err) => {
            logError(`comment handling error: ${err?.message || err}`);
          });
        });
      }
    });

    global.OneSDK.subscribe({
      action: 'clear',
      callback: () => {
        logInfo('OneSDK clear event received');
      }
    });

    state.oneSdkStatus = 'readying';
    emitStatus();
    global.OneSDK.ready()
      .then(() => {
        global.OneSDK.connect();
        state.oneSdkStatus = 'connected';
        emitStatus();
        logInfo('OneSDK connected');
      })
      .catch((err) => {
        state.oneSdkStatus = 'ready error';
        emitStatus();
        logError(`OneSDK ready error: ${err?.message || err}`);
      });
  }

  function init(config = {}, options = {}) {
    state.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    state.logger = options.logger || global.VCT_LOGGER || null;
    emitStatus();
    return api;
  }

  async function start() {
    emitStatus();

    if (!state.config.enabled) {
      state.coreStatus = 'disabled';
      emitStatus();
      logWarn('Core is disabled');
      return;
    }

    state.coreStatus = 'starting';
    emitStatus();

    if (!global.VCT_IDB) {
      state.dbError = 'VCT_IDB not found';
      state.coreStatus = 'boot error';
      emitStatus();
      throw new Error('VCT_IDB not found');
    }

    try {
      await global.VCT_IDB.initDB();
      state.dbReady = true;
      state.dbError = null;
      state.coreStatus = 'running';
      emitStatus();
      logInfo('VCT_IDB initialized');
      await refreshDbStats({ silent: true });
      emitStatus();

      setupOneSDK();
    } catch (err) {
      state.dbError = err?.message || String(err);
      state.coreStatus = 'boot error';
      emitStatus();
      throw err;
    }
  }

  const api = {
    init,
    start,
    getStatus,
    getStreamId,
    refreshDbStats,
    clearSupportsByCurrentStream,
    clearAllSupports,
    clearAllUsers,
    on
  };

  global.VCT_RUNTIME = api;
})(window);
