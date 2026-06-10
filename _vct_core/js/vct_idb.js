// ================================
// VCT IndexedDB Compatibility Entry
// ================================

(function (global) {

  const CoreAPI = global.__VCT_IDB_CORE__;
  const CommonDataAPI = global.__VCT_IDB_COMMON__;
  const StateAPI = global.__VCT_IDB_COMMENTRAID_STATE__ || {};

  if (!CoreAPI) {
    throw new Error('[VCT_IDB] __VCT_IDB_CORE__ is required. Load vct_idb_core.js before vct_idb.js.');
  }

  if (!CommonDataAPI) {
    throw new Error('[VCT_IDB] __VCT_IDB_COMMON__ is required. Load vct_idb_common.js before vct_idb.js.');
  }

  // window.VCT_IDB is the stable public surface. Keep existing names compatible.
  global.VCT_IDB = {
    initDB: CoreAPI.initDB,
    getDefaultStreamId: CoreAPI.getDefaultStreamId,

    buildSupportEventKey: CommonDataAPI.buildSupportEventKey,
    normalizeSupport: CommonDataAPI.normalizeSupport,
    saveSupport: CommonDataAPI.saveSupport,
    getSupports: CommonDataAPI.getSupports,
    deleteSupport: CommonDataAPI.deleteSupport,
    clearSupports: CommonDataAPI.clearSupports,

    buildUserKey: CommonDataAPI.buildUserKey,
    normalizeUserProfile: CommonDataAPI.normalizeUserProfile,
    saveUserProfile: CommonDataAPI.saveUserProfile,
    getUserProfile: CommonDataAPI.getUserProfile,
    getUsers: CommonDataAPI.getUsers,
    clearUsers: CommonDataAPI.clearUsers,

    ...StateAPI
  };

})(window);
