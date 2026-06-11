/**
 * Welcome Celebration V2 - engine.js
 * メンバー加入/継続イベントを全画面祝祭 event に変換する。
 */

window.ENGINE = (function () {
  const EVENT_META = {
    member_join: {
      label: "NEW MEMBER",
      headline: "WELCOME!",
      message: "ようこそ",
      tone: "join"
    },
    member_milestone: {
      label: "MEMBER ANNIVERSARY",
      headline: "THANK YOU!",
      message: "いつもありがとう",
      tone: "milestone"
    }
  };

  function getEnabledKinds() {
    const configured = window.CONFIG?.ENABLED_EVENT_KINDS;
    if (Array.isArray(configured) && configured.length > 0) return new Set(configured);
    return new Set(Object.keys(EVENT_META));
  }

  function resolveDisplayName(comment) {
    return comment?.userDetail?.displayName
      || comment?.user
      || comment?.structured?.user?.displayName
      || "Anonymous";
  }

  function resolveEventLabel(comment, meta) {
    return comment?.event?.displayLabel
      || comment?.membershipDetail?.primary
      || comment?.membershipDetail?.sub
      || meta.label;
  }

  function resolveMembershipMessage(comment, meta) {
    if (comment?.event?.kind === "member_join") {
      return comment?.membershipDetail?.sub
        || comment?.message?.text
        || comment?.text
        || meta.message;
    }

    return comment?.membershipDetail?.primary
      || comment?.event?.displayLabel
      || meta.message;
  }

  function onComment(comment) {
    const kind = comment?.event?.kind || "";
    const meta = EVENT_META[kind];

    if (!meta || !getEnabledKinds().has(kind)) return [];

    return [{
      type: "welcome-celebration",
      kind,
      tone: meta.tone,
      label: meta.label,
      headline: meta.headline,
      message: resolveMembershipMessage(comment, meta),
      eventLabel: resolveEventLabel(comment, meta),
      user: resolveDisplayName(comment),
      iconUrl: comment?.profileImage || "",
      color: comment?.color || { r: 11, g: 128, b: 67 },
      colorStr: comment?.colorStr || "rgb(11,128,67)",
      life: window.CONFIG?.DISPLAY_DURATION || 5.0,
      event: comment?.event || null,
      structured: comment?.structured || null,
      raw: comment?.raw || null
    }];
  }

  return { onComment };
})();
