/**
 * V-Creator Tools: OneComme Core SDK (VCT) v1.0.5
 * 
 * 共通のコメント解析ロジックを提供し、各テンプレートのコードを簡略化します。
 */

window.VCT = (function () {
    const DEFAULT_COLOR = { r: 255, g: 255, b: 255 };

    /**
     * HTML文字列をパースし、テキストと画像（絵文字）に分解する
     */
    function parseHtml(html) {
        if (!html) return { text: "", imgUrls: [], parts: [] };
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const parts = [];
        const imgUrls = [];

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const content = node.textContent;
                if (content) parts.push({ type: 'text', content });
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'IMG') {
                    const url = node.dataset.src || node.src;
                    const isSticker = node.classList.contains('gift-sticker') || node.classList.contains('gift-image');
                    parts.push({ type: 'emoji', url, alt: node.alt || '', isSticker });
                    imgUrls.push(url);
                } else if (node.tagName === 'BR') {
                    parts.push({ type: 'text', content: '\n' });
                } else {
                    node.childNodes.forEach(walk);
                }
            }
        }

        doc.body.childNodes.forEach(walk);

        // FX用のプレーンテキスト（画像を除外）
        const plainText = parts
            .filter(p => p.type === 'text')
            .map(p => p.content)
            .join("")
            .trim();

        return {
            text: plainText,
            imgUrls,
            parts
        };
    }

    /**
     * 色情報の文字列/オブジェクトを分解して {r, g, b} オブジェクトにする
     */
    function parseColor(val) {
        if (!val) return null;
        if (typeof val === 'object' && val.r !== undefined) return val;
        if (typeof val !== 'string') return null;

        const rgba = val.match(/rgba?\(\s*(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*,\s*|\s+)(\d+)/i);
        if (rgba) return { r: parseInt(rgba[1]), g: parseInt(rgba[2]), b: parseInt(rgba[3]) };

        const hex = val.match(/#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
        if (hex) return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16) };

        return null;
    }

    const isBlack = (col) => col && col.r === 0 && col.g === 0 && col.b === 0;

    /**
     * 先頭の !command を抽出し、本文と分離する
     */
    function parseLeadingCommand(text) {
        const source = typeof text === 'string' ? text.trim() : '';
        const match = source.match(/^!([^\s!]+)(?:\s+([\s\S]*))?$/u);

        if (!match) {
            return {
                exists: false,
                name: '',
                body: '',
                fullText: source
            };
        }

        return {
            exists: true,
            name: match[1],
            body: (match[2] || '').trim(),
            fullText: source
        };
    }

    /**
     * OneSDKの生データを解析して、使いやすいオブジェクトに変換する
     */
    function parse(raw) {
        const data = raw?.data || raw?.payload?.data || raw?.payload || raw;
        const config = window.CONFIG || {};

        // 1. メッセージ本文の取得
        let baseComment = data?.comment ?? data?.text ?? data?.message ?? data?.body ?? "";

        // メンバーシップ等のシステムメッセージ補完
        if (data?.membership) {
            const sysMsg = [data.membership.primary, data.membership.sub].filter(Boolean).join(' ');
            if (!baseComment || (sysMsg && !baseComment.includes(data.membership.sub))) {
                baseComment = sysMsg + (baseComment ? `<br>${baseComment}` : "");
            }
        }

        // Legacy互換用の本文は従来通り paidText を末尾へ補完する
        let legacyComment = baseComment;
        if (data?.hasGift && data.paidText && !legacyComment.includes(data.paidText)) {
            legacyComment += ` ${data.paidText}`;
        }

        const baseContent = parseHtml(baseComment);
        const parsedContent = parseHtml(legacyComment);
        const vctCommand = parseLeadingCommand(baseContent.text);

        // 2. 色の解析
        let color = null;
        const colors = data?.colors || raw?.payload?.data?.colors || raw?.colors;
        const useUserColor = config.USE_USER_COLOR !== false;

        // ギフト系の色を最優先
        if (colors) {
            color = parseColor(colors.headerBackgroundColor) ||
                parseColor(colors.bodyBackgroundColor) ||
                parseColor(colors.bodyTextColor);
        }

        // ユーザー色 or 白
        if (!data?.hasGift && !useUserColor) {
            color = { ...DEFAULT_COLOR };
        } else if (!color || isBlack(color)) {
            const normalColor = parseColor(raw?.color) || parseColor(raw?.payload?.color) || parseColor(data?.color);
            if (normalColor && !isBlack(normalColor)) color = normalColor;
        }

        if (!color || isBlack(color)) color = { ...DEFAULT_COLOR };

        const colorStr = `rgb(${color.r},${color.g},${color.b})`;

        // 3. 戻り値の構成
        return {
            id: data.id || `${raw.id || 'cmt'}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            user: data?.displayName || data?.name || "Anonymous",
            screenName: data?.screenName || null,
            profileImage: data?.profileImage || data?.originalProfileImage || "",
            badges: data?.badges || [],
            text: parsedContent.text,
            parts: parsedContent.parts,
            imgUrls: parsedContent.imgUrls,
            vctCommand,
            color,
            colorStr,
            hasGift: !!data?.hasGift,
            isSticky: !!data?.isSticky,
            membership: !!data?.membership,
            isAnonymous: !!data?.isAnonymous,
            isFirstTime: !!data?.isFirstTime,
            isRepeater: !!data?.isRepeater,
            isOwner: !!(data?.isOwner || data?.isBroadcaster),
            isModerator: !!data?.isModerator,
            raw: raw
        };
    }

    return {
        parse,
        parseHtml,
        parseColor,
        parseLeadingCommand
    };
})();
