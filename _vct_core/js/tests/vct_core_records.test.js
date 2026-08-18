const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {}, Date };
vm.createContext(context);
const recordsPath = path.join(__dirname, '..', 'vct_core_records.js');
vm.runInContext(fs.readFileSync(recordsPath, 'utf8'), context, { filename: recordsPath });

const Records = context.window.VCT_CORE_RECORDS;
const raw = {
  ts: '2026-08-16T01:02:03.000Z',
  service: { id: 'youtube' },
  data: {
    id: 'comment-1',
    timestamp: '2026-08-16T01:02:02.000Z',
    giftType: 'superchat'
  }
};

const base = {
  id: 'comment-1',
  service: { id: 'youtube', name: 'YouTube' },
  message: { text: '応援しています' },
  user: {
    id: 'user-1',
    name: 'テスト',
    displayName: '@test',
    screenName: 'test',
    profileImage: 'icon.png',
    originalProfileImage: 'original.png',
    roles: { owner: false, moderator: true, member: true }
  },
  monetization: {
    kind: 'superchat',
    money: { available: true, amount: 1000, currency: 'JPY', displayText: '¥1,000' },
    jewels: { available: false, count: 0, unit: 'jewel' },
    gift: { type: 'superchat', label: '', imageUrl: '', hasImage: false }
  },
  event: { kind: 'superchat', category: 'support', isSupport: true },
  style: { colorString: 'rgb(255, 0, 0)' },
  raw
};

{
  const record = Records.buildUserProfile(base, { streamId: 'stream-1', now: () => 1234 });
  assert.equal(record.platform, 'youtube');
  assert.equal(record.userId, 'user-1');
  assert.equal(record.isMember, true);
  assert.equal(record.isModerator, true);
  assert.equal(record.eventAt, '2026-08-16T01:02:02.000Z');
  assert.equal(record.updatedAt, 1234);
  assert.equal(record.rawProfile, raw);
}

{
  const record = Records.buildSupport(base, {
    streamId: 'stream-1',
    now: () => 1234,
    buildUserKey: ({ platform, userId }) => `${platform}:${userId}`
  });
  assert.equal(record.originalEventId, 'comment-1');
  assert.equal(record.userKey, 'youtube:user-1');
  assert.equal(record.amount, 1000);
  assert.equal(record.currency, 'JPY');
  assert.equal(record.message, '応援しています');
}

{
  const membershipGift = {
    ...base,
    monetization: {
      kind: 'sponsorgift',
      money: { available: false, amount: 0, currency: '', displayText: '' },
      jewels: { available: false, count: 0, unit: 'jewel' },
      gift: { type: 'sponsorgift', label: '', imageUrl: '', hasImage: false }
    },
    membership: { giftCount: 5, isGiftSender: true, isGiftReceiver: false },
    event: { kind: 'membership_gift', category: 'membership', isSupport: false, isMembership: true }
  };
  const record = Records.buildSupport(membershipGift, {
    streamId: 'stream-1',
    now: () => 1234,
    buildUserKey: ({ platform, userId }) => `${platform}:${userId}`
  });
  assert.equal(record.amount, 5);
  assert.equal(record.currency, 'SPONSORGIFT');
  assert.equal(record.rawType, 'sponsorgift');
  assert.equal(record.giftType, 'sponsorgift');
}

{
  const jewel = {
    ...base,
    monetization: {
      kind: 'jewel',
      money: { available: false, amount: 0, currency: '', displayText: '' },
      jewels: { available: true, count: 10, unit: 'jewel' },
      gift: { type: 'jewel', label: '星', imageUrl: '', hasImage: false }
    },
    event: { kind: 'jewel', category: 'support', isSupport: true }
  };
  assert.equal(Records.buildSupport(jewel), null);
}

console.log('VCT Core record tests: OK');
