// ================================
// VCT IndexedDB CommentRaid State
// ================================

(function (global) {

  const Core = global.__VCT_IDB_CORE__;
  if (!Core) {
    throw new Error('[VCT_IDB] __VCT_IDB_CORE__ is required. Load vct_idb_core.js before vct_idb_commentraid_state.js.');
  }

  const {
    hasNonEmptyString,
    normalizeTimestamp,
    normalizeString
  } = Core;

  const DB_NAME = 'vct_commentraid_state';
  const DB_VERSION = 1;
  const STORE_STATE = 'commentraid_state';
  const STATE_TYPES = new Set(['internal', 'shared']);
  const STATE_SCOPES = new Set(['global', 'stream', 'user', 'session']);
  let _stateDB = null;

  // ------------------------
  // State DB init
  // ------------------------
  async function initStateDB() {
    if (_stateDB) return _stateDB;

    if (!global.idb || typeof global.idb.openDB !== 'function') {
      throw new Error('[VCT_IDB] idb.openDB is required. Load idb.min.js before vct_idb_commentraid_state.js.');
    }

    _stateDB = await global.idb.openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        if (!db.objectStoreNames.contains(STORE_STATE)) {
          const stateStore = db.createObjectStore(STORE_STATE, {
            keyPath: 'stateKey'
          });

          stateStore.createIndex('templateKey', 'templateKey');
          stateStore.createIndex('scope', 'scope');
          stateStore.createIndex('stateType', 'stateType');
          stateStore.createIndex('updatedAt', 'updatedAt');
          return;
        }

        const stateStore = tx.objectStore(STORE_STATE);
        createIndexIfMissing(stateStore, 'templateKey', 'templateKey');
        createIndexIfMissing(stateStore, 'scope', 'scope');
        createIndexIfMissing(stateStore, 'stateType', 'stateType');
        createIndexIfMissing(stateStore, 'updatedAt', 'updatedAt');
      }
    });

    return _stateDB;
  }

  async function ensureStateDB() {
    return await initStateDB();
  }

  function createIndexIfMissing(store, indexName, keyPath, options) {
    if (!store.indexNames.contains(indexName)) {
      store.createIndex(indexName, keyPath, options);
    }
  }

  // ------------------------
  // State block: commentraid_state only
  // ------------------------
  function normalizeStateType(value) {
    const normalized = normalizeString(value).toLowerCase();
    return STATE_TYPES.has(normalized) ? normalized : '';
  }

  function normalizeStateScope(value) {
    const normalized = normalizeString(value).toLowerCase();
    return STATE_SCOPES.has(normalized) ? normalized : '';
  }

  function normalizeState(data) {
    const record = {
      stateKey: normalizeString(data.stateKey),
      templateKey: normalizeString(data.templateKey),
      scope: normalizeStateScope(data.scope),
      stateType: normalizeStateType(data.stateType),
      streamId: normalizeString(data.streamId),
      userKey: normalizeString(data.userKey),
      updatedAt: normalizeTimestamp(data.updatedAt) ?? Date.now(),
      data: data.data ?? {}
    };

    if (!record.stateKey) {
      throw new Error('[VCT_IDB] stateKey is required.');
    }

    if (!record.templateKey) {
      throw new Error('[VCT_IDB] templateKey is required.');
    }

    if (!record.scope) {
      throw new Error('[VCT_IDB] scope is required and must be one of global/stream/user/session.');
    }

    if (!record.stateType) {
      throw new Error('[VCT_IDB] stateType is required and must be one of internal/shared.');
    }

    return record;
  }

  async function saveState(data) {
    const db = await ensureStateDB();
    const record = normalizeState(data);
    await db.put(STORE_STATE, record);
    return record;
  }

  async function getState(stateKey) {
    const db = await ensureStateDB();
    if (!hasNonEmptyString(stateKey)) {
      return null;
    }

    return await db.get(STORE_STATE, stateKey);
  }

  global.__VCT_IDB_COMMENTRAID_STATE__ = {
    normalizeState,
    saveState,
    getState
  };

})(window);
