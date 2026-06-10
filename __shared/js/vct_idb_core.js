// ================================
// VCT IndexedDB Core
// ================================

(function (global) {

  // ------------------------
  // Constants
  // ------------------------
  const DB_NAME = 'vct_common_data';
  const DB_VERSION = 1;
  const LEGACY_DB_NAME = 'commentraid';
  const MIGRATION_MARKER_KEY = 'vct_idb_migration.v1.commentraid_to_vct_common_data';

  const STORE_SUPPORT = 'supports';
  const STORE_USER = 'users';

  const EVENT_AT_SOURCE = {
    DATA_TIMESTAMP: 'data.timestamp',
    ROOT_TS: 'root.ts',
    CREATED_AT: 'createdAt'
  };

  let _db = null;

  // ------------------------
  // Core helpers: internal only
  // ------------------------
  function hasNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function toNumber(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      const match = normalized.match(/-?\d+(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return fallback;
  }

  function normalizeTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? null : time;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  function normalizeString(value, fallback = '') {
    if (value == null) return fallback;
    return String(value).trim();
  }

  function normalizeName(name) {
    return normalizeString(name).toLowerCase();
  }

  function simpleHash(str) {
    const source = normalizeString(str);
    if (!source) return '';

    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      hash = ((hash << 5) - hash) + source.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash).toString(36);
  }

  function getDefaultStreamId() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    return `${y}${m}${d}`;
  }

  async function initDB() {
    if (_db) return _db;

    if (!global.idb || typeof global.idb.openDB !== 'function') {
      throw new Error('[VCT_IDB] idb.openDB is required. Load idb.min.js before vct_idb_core.js.');
    }

    _db = await global.idb.openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        applyCommonSchemaUpgrades(db, oldVersion, newVersion, tx);
      }
    });

    await migrateLegacyCommonData(_db);

    return _db;
  }

  async function ensureDB() {
    return await initDB();
  }

  function withStore(db, storeName, mode, callback) {
    const tx = db.transaction(storeName, mode);
    const result = callback(tx.store, tx);

    return Promise.resolve(result).then(async (value) => {
      await tx.done;
      return value;
    });
  }

  // ------------------------
  // Schema / upgrade block: internal only
  // ------------------------
  function objectStoreExists(db, storeName) {
    return db.objectStoreNames.contains(storeName);
  }

  function indexExists(store, indexName) {
    return store.indexNames.contains(indexName);
  }

  function getOrCreateStore(db, tx, storeName, options) {
    if (!objectStoreExists(db, storeName)) {
      return db.createObjectStore(storeName, options);
    }

    return tx.objectStore(storeName);
  }

  function createIndexIfMissing(store, indexName, keyPath, options) {
    if (!indexExists(store, indexName)) {
      store.createIndex(indexName, keyPath, options);
    }
  }

  function applyCommonSchemaUpgrades(db, oldVersion, newVersion, tx) {
    const supportStore = getOrCreateStore(db, tx, STORE_SUPPORT, {
      keyPath: 'eventKey'
    });

    createIndexIfMissing(supportStore, 'streamId', 'streamId');
    createIndexIfMissing(supportStore, 'eventAt', 'eventAt');
    createIndexIfMissing(supportStore, 'createdAt', 'createdAt');
    createIndexIfMissing(supportStore, 'userId', 'userId');
    createIndexIfMissing(supportStore, 'platform', 'platform');
    createIndexIfMissing(supportStore, 'rawType', 'rawType');

    const userStore = getOrCreateStore(db, tx, STORE_USER, {
      keyPath: 'userKey'
    });

    createIndexIfMissing(userStore, 'platform', 'platform');
    createIndexIfMissing(userStore, 'userId', 'userId');
    createIndexIfMissing(userStore, 'updatedAt', 'updatedAt');
  }

  // ------------------------
  // Legacy migration
  // ------------------------
  function getMigrationMarker() {
    try {
      const raw = global.localStorage?.getItem(MIGRATION_MARKER_KEY) || '';
      if (!raw) {
        return null;
      }

      const marker = JSON.parse(raw);
      if (marker && marker.status === 'completed') {
        return marker;
      }

      return null;
    } catch (err) {
      console.warn('[VCT_IDB] invalid migration marker ignored:', err);
      return null;
    }
  }

  function setMigrationMarker(summary) {
    try {
      const payload = JSON.stringify({
        status: 'completed',
        completedAt: Date.now(),
        ...summary
      });
      global.localStorage?.setItem(MIGRATION_MARKER_KEY, payload);
    } catch (err) {
      console.warn('[VCT_IDB] migration marker write skipped:', err);
    }
  }

  async function legacyDBExists() {
    const idbFactory = global.indexedDB;
    if (!idbFactory || typeof idbFactory.databases !== 'function') {
      return null;
    }

    try {
      const databases = await idbFactory.databases();
      return databases.some((db) => db && db.name === LEGACY_DB_NAME);
    } catch (err) {
      console.warn('[VCT_IDB] indexedDB.databases() check skipped:', err);
      return null;
    }
  }

  async function openLegacyDBIfNeeded() {
    const exists = await legacyDBExists();
    if (exists === false) {
      return null;
    }

    return await global.idb.openDB(LEGACY_DB_NAME);
  }

  function hasStore(db, storeName) {
    return db && db.objectStoreNames && db.objectStoreNames.contains(storeName);
  }

  function hasLegacyCommonStore(db) {
    return hasStore(db, STORE_SUPPORT) || hasStore(db, STORE_USER);
  }

  async function readLegacyRecords(db, storeName) {
    if (!hasStore(db, storeName)) {
      return [];
    }

    return await db.getAll(storeName);
  }

  async function putAll(db, storeName, records) {
    for (const record of records) {
      await db.put(storeName, record);
    }
  }

  async function migrateLegacyCommonData(db) {
    const marker = getMigrationMarker();
    if (marker && marker.status === 'completed') {
      return;
    }

    let legacyDB = null;
    try {
      legacyDB = await openLegacyDBIfNeeded();
      if (!legacyDB) {
        setMigrationMarker({ supports: 0, users: 0, skipped: 'legacy-db-not-found' });
        return;
      }

      if (!hasLegacyCommonStore(legacyDB)) {
        setMigrationMarker({ supports: 0, users: 0, skipped: 'legacy-common-stores-not-found' });
        return;
      }

      const supports = await readLegacyRecords(legacyDB, STORE_SUPPORT);
      const users = await readLegacyRecords(legacyDB, STORE_USER);

      if (supports.length === 0 && users.length === 0) {
        setMigrationMarker({ supports: 0, users: 0, skipped: 'no-common-records' });
        return;
      }

      await putAll(db, STORE_SUPPORT, supports);
      await putAll(db, STORE_USER, users);
      setMigrationMarker({ supports: supports.length, users: users.length });
    } catch (err) {
      console.error('[VCT_IDB] legacy migration failed:', err);
    } finally {
      if (legacyDB && typeof legacyDB.close === 'function') {
        legacyDB.close();
      }
    }
  }

  global.__VCT_IDB_CORE__ = {
    DB_NAME,
    DB_VERSION,
    LEGACY_DB_NAME,
    MIGRATION_MARKER_KEY,
    STORE_SUPPORT,
    STORE_USER,
    EVENT_AT_SOURCE,
    hasNonEmptyString,
    toNumber,
    normalizeTimestamp,
    normalizeString,
    normalizeName,
    simpleHash,
    getDefaultStreamId,
    initDB,
    ensureDB,
    withStore,
    migrateLegacyCommonData
  };

})(window);
