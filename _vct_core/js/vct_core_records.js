// ================================
// VCT Core IndexedDB Record Builder
// ================================

(function (global) {
  function payloadOf(raw) {
    return raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw || {};
  }

  function eventTimestamp(raw) {
    const data = payloadOf(raw);
    return data?.timestamp || raw?.ts || null;
  }

  function originalEventId(raw) {
    const data = payloadOf(raw);
    return String(data?.id || raw?.id || '').trim();
  }

  function buildUserProfile(normalized, options = {}) {
    if (!normalized?.user || !normalized?.service) return null;

    const raw = normalized.raw || null;
    const roles = normalized.user.roles || {};
    const now = typeof options.now === 'function' ? options.now() : Date.now();

    return {
      platform: normalized.service.id || '',
      userId: normalized.user.id || '',
      userName: normalized.user.name || 'Anonymous',
      displayName: normalized.user.displayName || normalized.user.name || '',
      screenName: normalized.user.screenName || '',
      userIcon: normalized.user.profileImage || '',
      originalUserIcon: normalized.user.originalProfileImage || normalized.user.profileImage || '',
      isMember: !!roles.member,
      isModerator: !!roles.moderator,
      isOwner: !!roles.owner,
      streamId: options.streamId || '',
      eventAt: eventTimestamp(raw),
      updatedAt: now,
      rawProfile: raw
    };
  }

  function buildSupport(normalized, options = {}) {
    const money = normalized?.monetization?.money;
    const membership = normalized?.membership || {};
    const isMoneySupport = !!normalized?.event?.isSupport && !!money?.available && money.amount > 0;
    const isMembershipGift = !!membership.isGiftSender && membership.giftCount > 0;

    if (!isMoneySupport && !isMembershipGift) {
      return null;
    }

    const raw = normalized.raw || null;
    const data = payloadOf(raw);
    const user = normalized.user || {};
    const gift = normalized.monetization.gift || {};
    const platform = normalized.service?.id || '';
    const now = typeof options.now === 'function' ? options.now() : Date.now();
    const buildUserKey = typeof options.buildUserKey === 'function'
      ? options.buildUserKey
      : () => '';

    return {
      platform,
      streamId: options.streamId || '',
      originalEventId: originalEventId(raw),
      eventAt: eventTimestamp(raw),
      createdAt: now,
      updatedAt: now,
      userKey: buildUserKey({
        platform,
        userId: user.id || '',
        userName: user.displayName || user.name || 'Anonymous'
      }),
      userId: user.id || '',
      userName: user.displayName || user.name || 'Anonymous',
      userIcon: user.profileImage || '',
      amount: isMembershipGift ? membership.giftCount : money.amount,
      currency: isMembershipGift ? 'SPONSORGIFT' : (money.currency || ''),
      message: normalized.message?.text || '',
      giftType: gift.type || normalized.monetization.kind || '',
      giftLabel: gift.label || '',
      giftImageUrl: gift.imageUrl || '',
      supportColor: normalized.style?.colorString || '',
      rawType: isMembershipGift
        ? 'sponsorgift'
        : (data?.giftType || raw?.type || normalized.event.kind || ''),
      raw
    };
  }

  global.VCT_CORE_RECORDS = Object.freeze({
    buildUserProfile,
    buildSupport
  });
})(window);
