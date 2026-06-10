// ================================
// VCT IndexedDB Common Data
// ================================

(function (global) {

  const Core = global.__VCT_IDB_CORE__;
  if (!Core) {
    throw new Error('[VCT_IDB] __VCT_IDB_CORE__ is required. Load vct_idb_core.js before vct_idb_common.js.');
  }

  const {
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
    ensureDB
  } = Core;

  // ------------------------
  // Common data block: supports
  // ------------------------
  function resolveEventAt(data, createdAt) {
    const candidates = [
      { value: data.eventAt, source: data.eventAtSource || null },
      { value: data.timestamp, source: EVENT_AT_SOURCE.DATA_TIMESTAMP },
      { value: data.raw?.ts, source: EVENT_AT_SOURCE.ROOT_TS }
    ];

    for (const candidate of candidates) {
      const normalized = normalizeTimestamp(candidate.value);
      if (normalized != null) {
        return {
          eventAt: normalized,
          eventAtSource: candidate.source || EVENT_AT_SOURCE.DATA_TIMESTAMP
        };
      }
    }

    return {
      eventAt: createdAt,
      eventAtSource: EVENT_AT_SOURCE.CREATED_AT
    };
  }

  function buildSupportEventKey(data) {
    const platform = normalizeString(data.platform);
    const originalEventId = normalizeString(data.originalEventId);
    const streamId = normalizeString(data.streamId);
    const userId = normalizeString(data.userId);
    const userName = normalizeName(data.userName);
    const rawType = normalizeString(data.rawType);
    const amount = toNumber(data.amount, 0);
    const eventAt = normalizeTimestamp(data.eventAt);
    const messageHash = simpleHash(data.message);

    if (platform && originalEventId) {
      return `${platform}:${originalEventId}`;
    }

    if (platform && streamId && userId && eventAt != null) {
      return `${platform}:${streamId}:${userId}:${eventAt}:${rawType}`;
    }

    if (platform && streamId && userName && eventAt != null) {
      return `${platform}:${streamId}:${userName}:${amount}:${messageHash}:${eventAt}`;
    }

    return '';
  }

  function normalizeSupport(data) {
    const createdAt = normalizeTimestamp(data.createdAt) ?? Date.now();
    const { eventAt, eventAtSource } = resolveEventAt(data, createdAt);

    const record = {
      eventKey: normalizeString(data.eventKey),
      platform: normalizeString(data.platform),
      streamId: normalizeString(data.streamId, getDefaultStreamId()),
      originalEventId: normalizeString(data.originalEventId),
      eventAt,
      eventAtSource: normalizeString(data.eventAtSource || eventAtSource, eventAtSource),
      createdAt,
      updatedAt: normalizeTimestamp(data.updatedAt) ?? createdAt,

      userKey: normalizeString(data.userKey),
      userId: normalizeString(data.userId),
      userName: normalizeString(data.userName, 'Unknown'),
      userIcon: normalizeString(data.userIcon),

      amount: toNumber(data.amount, 0),
      currency: normalizeString(data.currency),

      message: normalizeString(data.message),
      giftType: normalizeString(data.giftType),
      giftLabel: normalizeString(data.giftLabel),
      giftImageUrl: normalizeString(data.giftImageUrl),
      supportColor: normalizeString(data.supportColor),

      rawType: normalizeString(data.rawType),
      raw: data.raw ?? null
    };

    if (!record.userKey) {
      record.userKey = buildUserKey({
        platform: record.platform,
        userId: record.userId,
        userName: record.userName
      });
    }

    if (!record.eventKey) {
      record.eventKey = buildSupportEventKey(record);
    }

    if (!record.eventKey) {
      throw new Error('[VCT_IDB] Failed to build support eventKey.');
    }

    return record;
  }

  async function saveSupport(data) {
    const db = await ensureDB();
    const record = normalizeSupport(data);
    const existing = await db.get(STORE_SUPPORT, record.eventKey);

    if (existing) {
      record.createdAt = existing.createdAt ?? record.createdAt;
      record.updatedAt = Date.now();
    }

    await db.put(STORE_SUPPORT, record);
    return record;
  }

  async function getSupports(options = {}) {
    const db = await ensureDB();

    const {
      streamId = null,
      limit = null,
      order = 'desc'
    } = options;

    let results = [];

    if (streamId) {
      const tx = db.transaction(STORE_SUPPORT, 'readonly');
      const index = tx.store.index('streamId');
      results = await index.getAll(streamId);
    } else {
      results = await db.getAll(STORE_SUPPORT);
    }

    results.sort((a, b) => {
      const aTime = a.eventAt ?? a.createdAt ?? 0;
      const bTime = b.eventAt ?? b.createdAt ?? 0;
      if (order === 'desc') {
        if (bTime !== aTime) return bTime - aTime;
      } else if (aTime !== bTime) {
        return aTime - bTime;
      }

      return String(a.eventKey || '').localeCompare(String(b.eventKey || ''));
    });

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async function deleteSupport(eventKey) {
    const db = await ensureDB();
    if (!hasNonEmptyString(eventKey)) {
      return false;
    }

    const exists = await db.get(STORE_SUPPORT, eventKey);
    if (!exists) {
      return false;
    }

    await db.delete(STORE_SUPPORT, eventKey);
    return true;
  }

  async function clearSupports(options = {}) {
    const db = await ensureDB();
    const { streamId = null } = options;

    if (!streamId) {
      return await db.clear(STORE_SUPPORT);
    }

    const tx = db.transaction(STORE_SUPPORT, 'readwrite');
    const index = tx.store.index('streamId');

    let cursor = await index.openCursor(streamId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  // ------------------------
  // Common data block: users
  // ------------------------
  const RECENT_STREAM_IDS_LIMIT = 5;

  function buildUserKey(data) {
    const platform = normalizeString(data.platform);
    const userId = normalizeString(data.userId);
    const displayName = normalizeName(data.displayName || data.userName);

    if (platform && userId) {
      return `${platform}:${userId}`;
    }

    if (platform && displayName) {
      return `${platform}:name:${displayName}`;
    }

    return '';
  }

  function normalizeRecentStreamIds(value, priorityStreamId = '') {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set();
    const normalized = [];
    const candidates = [
      normalizeString(priorityStreamId),
      ...source.map((streamId) => normalizeString(streamId))
    ];

    for (const streamId of candidates) {
      if (!streamId || seen.has(streamId)) {
        continue;
      }

      seen.add(streamId);
      normalized.push(streamId);

      if (normalized.length >= RECENT_STREAM_IDS_LIMIT) {
        break;
      }
    }

    return normalized;
  }

  function normalizeUserProfile(data) {
    const updatedAt = normalizeTimestamp(data.updatedAt) ?? Date.now();
    const lastSeenAt = normalizeTimestamp(data.lastSeenAt) ?? updatedAt;
    const lastEventAt = normalizeTimestamp(data.eventAt);
    const firstSeenAt = normalizeTimestamp(data.firstSeenAt) ?? lastSeenAt;
    const incomingStreamId = normalizeString(data.streamId);
    const lastSeenStreamId = normalizeString(data.lastSeenStreamId || incomingStreamId);

    const profile = {
      userKey: normalizeString(data.userKey),
      platform: normalizeString(data.platform),
      userId: normalizeString(data.userId),
      userName: normalizeString(data.userName, 'Unknown'),
      displayName: normalizeString(data.displayName),
      screenName: normalizeString(data.screenName),
      userIcon: normalizeString(data.userIcon),
      originalUserIcon: normalizeString(data.originalUserIcon),
      isMember: !!data.isMember,
      isModerator: !!data.isModerator,
      isOwner: !!data.isOwner,
      firstSeenAt,
      lastSeenAt,
      lastEventAt,
      lastSeenStreamId,
      recentStreamIds: normalizeRecentStreamIds(data.recentStreamIds, incomingStreamId || lastSeenStreamId),
      updatedAt,
      rawProfile: data.rawProfile ?? null
    };

    if (!profile.userKey) {
      profile.userKey = buildUserKey(profile);
    }

    if (!profile.userKey) {
      throw new Error('[VCT_IDB] Failed to build userKey.');
    }

    return profile;
  }

  function mergeUserProfile(existing, incoming) {
    if (!existing) {
      return incoming;
    }

    const incomingStreamId = normalizeString(incoming.lastSeenStreamId);
    const recentStreamIds = incomingStreamId
      ? normalizeRecentStreamIds(existing.recentStreamIds, incomingStreamId)
      : normalizeRecentStreamIds(existing.recentStreamIds);

    const merged = {
      ...existing,
      ...incoming,
      firstSeenAt: existing.firstSeenAt ?? incoming.firstSeenAt,
      lastSeenAt: incoming.lastSeenAt ?? existing.lastSeenAt,
      lastSeenStreamId: incomingStreamId || existing.lastSeenStreamId || '',
      recentStreamIds,
      updatedAt: incoming.updatedAt ?? Date.now(),
      lastEventAt: Math.max(
        normalizeTimestamp(existing.lastEventAt) ?? 0,
        normalizeTimestamp(incoming.lastEventAt) ?? 0
      ) || null
    };

    if (!hasNonEmptyString(incoming.userName)) {
      merged.userName = existing.userName;
    }

    if (!hasNonEmptyString(incoming.displayName)) {
      merged.displayName = existing.displayName;
    }

    if (!hasNonEmptyString(incoming.screenName)) {
      merged.screenName = existing.screenName;
    }

    if (!hasNonEmptyString(incoming.userIcon)) {
      merged.userIcon = existing.userIcon;
    }

    if (!hasNonEmptyString(incoming.originalUserIcon)) {
      merged.originalUserIcon = existing.originalUserIcon;
    }

    if (incoming.rawProfile == null) {
      merged.rawProfile = existing.rawProfile ?? null;
    }

    return merged;
  }

  async function saveUserProfile(data) {
    const db = await ensureDB();
    const profile = normalizeUserProfile(data);
    const existing = await db.get(STORE_USER, profile.userKey);
    const merged = mergeUserProfile(existing, profile);

    await db.put(STORE_USER, merged);
    return merged;
  }

  async function getUserProfile(userKey) {
    const db = await ensureDB();
    if (!hasNonEmptyString(userKey)) {
      return null;
    }

    return await db.get(STORE_USER, userKey);
  }

  async function getUsers(options = {}) {
    const db = await ensureDB();
    const {
      platform = null,
      limit = null,
      order = 'desc'
    } = options;

    let results = [];

    if (platform) {
      const tx = db.transaction(STORE_USER, 'readonly');
      const index = tx.store.index('platform');
      results = await index.getAll(platform);
    } else {
      results = await db.getAll(STORE_USER);
    }

    results.sort((a, b) => {
      const aTime = a.lastSeenAt ?? a.updatedAt ?? 0;
      const bTime = b.lastSeenAt ?? b.updatedAt ?? 0;
      if (order === 'desc') {
        if (bTime !== aTime) return bTime - aTime;
      } else if (aTime !== bTime) {
        return aTime - bTime;
      }

      return String(a.userKey || '').localeCompare(String(b.userKey || ''));
    });

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async function clearUsers() {
    const db = await ensureDB();
    return await db.clear(STORE_USER);
  }

  global.__VCT_IDB_COMMON__ = {
    buildSupportEventKey,
    normalizeSupport,
    saveSupport,
    getSupports,
    deleteSupport,
    clearSupports,
    buildUserKey,
    normalizeUserProfile,
    saveUserProfile,
    getUserProfile,
    getUsers,
    clearUsers
  };

})(window);
