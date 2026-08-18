const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

class PlainTextDOMParser {
    parseFromString(html) {
        const source = String(html);
        const childNodes = [];
        const tokenPattern = /<img\b[^>]*>|<br\s*\/?>|<[^>]*>|[^<]+/gi;
        let match;
        while ((match = tokenPattern.exec(source))) {
            const token = match[0];
            if (/^<img\b/i.test(token)) {
                const attributes = {};
                token.replace(/([\w-]+)="([^"]*)"/g, (_, name, value) => {
                    attributes[name.toLowerCase()] = value;
                    return _;
                });
                const classNames = (attributes.class || '').split(/\s+/).filter(Boolean);
                childNodes.push({
                    nodeType: ELEMENT_NODE,
                    tagName: 'IMG',
                    dataset: { src: attributes['data-src'] || '' },
                    classList: { contains: (name) => classNames.includes(name) },
                    getAttribute: (name) => attributes[name.toLowerCase()] || '',
                    childNodes: []
                });
            } else if (/^<br/i.test(token)) {
                childNodes.push({ nodeType: ELEMENT_NODE, tagName: 'BR', childNodes: [] });
            } else if (!token.startsWith('<')) {
                childNodes.push({ nodeType: TEXT_NODE, textContent: token });
            }
        }
        return {
            body: {
                childNodes
            }
        };
    }
}

const context = {
    window: {},
    DOMParser: PlainTextDOMParser,
    Node: { TEXT_NODE, ELEMENT_NODE },
    console,
    Date,
    Math
};
vm.createContext(context);
const sdkPath = path.join(__dirname, '..', 'vct_sdk.js');
vm.runInContext(fs.readFileSync(sdkPath, 'utf8'), context, { filename: sdkPath });

function normalize(data) {
    return context.window.VCT_SDK.normalize({ service: { id: 'youtube' }, data });
}

{
    const result = normalize({ comment: 'こんにちは', membership: { primary: 'メンバー歴1年' } });
    assert.equal(result.message.text, 'こんにちは');
    assert.equal(result.membership.primary, 'メンバー歴1年');
}

{
    const result = normalize({ comment: 'メンバー歴1年 こんにちは', membership: { primary: 'メンバー歴1年' } });
    assert.equal(result.message.text, 'メンバー歴1年 こんにちは');
}

{
    const result = normalize({ comment: 'メンバー歴1年 こんにちは', membership: { primary: 'メンバー歴1年', sub: '継続ありがとうございます' } });
    assert.equal(result.message.text, 'メンバー歴1年 こんにちは');
    assert.equal(result.membership.sub, '継続ありがとうございます');
}

{
    const result = normalize({ comment: '', membership: { sub: '新規メンバー' } });
    assert.equal(result.message.text, '');
    assert.equal(result.event.kind, 'membership_event');
}

{
    const result = normalize({ comment: '通常コメント', membership: {} });
    assert.equal(result.message.text, '通常コメント');
}

{
    const result = normalize({
        comment: 'そうだよねー',
        speechText: 'そうだよねー. from テストユーザー',
        hasGift: true,
        giftType: 'superchat',
        paidText: '¥1,000',
        price: 1000,
        currency: 'JPY'
    });
    assert.equal(result.message.text, 'そうだよねー');
    assert.equal(result.monetization.money.amount, 1000);
    assert.equal(result.monetization.gift.label, '');
    assert.equal(result.event.kind, 'superchat');
}

{
    const result = normalize({
        comment: '',
        speechText: '. from テストユーザー',
        giftType: 'subscribe',
        membership: { primary: '', sub: '〇〇〇 へようこそ！' },
        badges: [{ label: '新規メンバー' }]
    });
    assert.equal(result.message.text, '');
    assert.equal(result.message.html, '');
    assert.equal(result.event.kind, 'member_join');
    assert.equal(result.event.displayLabel, '新規メンバー');
    assert.equal(result.event.announcementText, '〇〇〇 へようこそ！');
    assert.equal(result.event.shouldShowMessage, false);
}

{
    const result = normalize({
        comment: '',
        giftType: 'milestonechat',
        membership: { primary: '', sub: '宝鐘海賊団 へようこそ！' },
        badges: [{ label: 'メンバー（2 か月）' }],
        isFirstTime: true
    });
    assert.equal(result.message.text, '');
    assert.equal(result.event.kind, 'membership_event');
    assert.equal(result.event.displayLabel, 'メンバーシップ');
    assert.equal(result.event.announcementText, '宝鐘海賊団 へようこそ！');
    assert.equal(result.event.shouldShowMessage, false);
    assert.equal(result.user.traits.firstTime, true);
}

{
    const result = normalize({
        comment: '草w',
        giftType: 'milestonechat',
        membership: { primary: 'メンバー歴Nか月', sub: 'メンバーシップ名' }
    });
    assert.equal(result.message.text, '草w');
    assert.equal(result.event.kind, 'member_milestone');
    assert.equal(result.event.displayLabel, 'メンバー歴Nか月');
    assert.equal(result.event.announcementText, '');
    assert.equal(result.event.shouldShowMessage, true);
}

{
    const result = normalize({
        comment: 'ジュエルを送りました',
        giftType: 'jewel',
        jewels: 5
    });
    assert.equal(result.monetization.jewels.available, true);
    assert.equal(result.monetization.jewels.count, 5);
    assert.equal(result.monetization.money.available, false);
    assert.equal(result.monetization.money.amount, 0);
}

{
    const result = normalize({
        comment: '<img class="gift-image" src="https://example.test/hiding-480.png" data-src="https://example.test/hiding-640.png" alt="" />隠れている人 を送信しました',
        giftType: 'jewel',
        jewels: 10,
        price: 10,
        paidText: '💎10'
    });
    assert.equal(result.monetization.jewels.count, 10);
    assert.equal(result.monetization.gift.label, '隠れている人');
    assert.equal(result.monetization.gift.imageUrl, 'https://example.test/hiding-640.png');
    assert.equal(result.monetization.gift.hasImage, true);
    assert.equal(result.event.displayLabel, '隠れている人');
}

{
    const result = normalize({
        comment: 'ジュエル 2 個 を使って 星 を送りました',
        giftType: 'jewel'
    });
    assert.equal(result.monetization.jewels.count, 2);
    assert.equal(result.monetization.gift.label, '星');
    assert.equal(result.monetization.gift.hasImage, false);
}

{
    const result = normalize({
        comment: '応援しています<img src="https://example.test/heart.png" alt="💓" />',
        hasGift: true,
        giftType: 'superchat',
        price: 500,
        currency: 'JPY',
        paidText: '￥500'
    });
    assert.equal(result.message.imageUrls[0], 'https://example.test/heart.png');
    assert.equal(result.monetization.gift.imageUrl, '');
    assert.equal(result.monetization.gift.hasImage, false);
}

console.log('VCT SDK tests: OK');
