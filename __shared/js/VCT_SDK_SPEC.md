# V-Creator Tools: OneComme Core SDK (VCT) Technical Spec v1.0.5

## 1. 概要
`vct_one_core.js` は、わんコメの `OneSDK` から送られてくる生データを、テンプレート開発で扱いやすい形式に解析・整形するための共有ライブラリです。
`DOMParser` による絵文字の分離、色の優先順位判定、システムメッセージの補完などを自動で行います。

## 2. 導入方法
テンプレートの `index.html` の `onesdk.js`（および `config.js`）の後、メインスクリプト（`main.js` 等）の前に読み込みます。

```html
<script src="../__origin/js/onesdk.js"></script>
<script src="./config.js"></script>
<!-- SDKの読み込み -->
<script src="../__shared/js/vct_one_core.js"></script>
<script src="./main.js"></script>
```

## 3. API リファレンス

### `window.VCT.parse(rawComment)`
OneSDKの `comments` アクション等で受け取った生のコメントオブジェクトを解析します。

**引数:**
- `rawComment` (Object): OneSDKから渡されるコメント1件分のデータ。

**戻り値:**
解析済みの `CommentObject`。構造は以下の通りです。

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | String | ユニークID（OneSDKのID優先、なければ自動生成） |
| `user` | String | 表示名（displayName > name） |
| `profileImage` | String | プロフィールアイコンのURL |
| `badges` | Array | メンバーバッジ等の配列 |
| `text` | String | 画像を除外した純粋なテキスト本文 |
| `parts` | Array | テキストと絵文字を分解した配列（後述） |
| `imgUrls` | Array | メッセージに含まれる画像URLのリスト |
| `vctCommand` | Object | 先頭 `!command` の抽出結果。既存本文は変更せず補助情報として付与 |
| `color` | Object | 解析された色（`{r, g, b}`） |
| `colorStr` | String | `rgb(255, 255, 255)` 形式の色文字列 |
| `hasGift` | Boolean | ギフト・スパチャ判定 |
| `isSticky` | Boolean | 固定コメント判定 |
| `membership` | Boolean | メンバーシップ関連判定 |
| `isOwner` | Boolean | 配信者（オーナー）判定 [NEW] |
| `isModerator` | Boolean | モデレーター判定 [NEW] |
| `raw` | Object | 解析前の生データ |

### `CommentObject.parts` の構造
リスト表示などで「テキストと絵文字を正しい並び順で出したい」場合に使用します。
[
  { type: 'text', content: 'こんにちは！' },
  { type: 'emoji', url: 'https://...', alt: 'emoji_smile', isSticker: false },
  { type: 'emoji', url: 'https://...', alt: 'test_sticker', isSticker: true }
]
```

### `CommentObject.vctCommand` の構造
先頭コマンドを使うテンプレート向けの補助オブジェクトです。既存の `text` や `parts` は書き換えません。
`vctCommand` は、`paidText` などの Legacy互換用追記を行う前のベース本文から抽出されます。

```js
{
  exists: true,
  name: '支援',
  body: '新衣装お披露目！',
  fullText: '!支援　新衣装お披露目！'
}
```

- `name`: `!` を除いたコマンド名。日本語を含めて取得可能
- `body`: 区切り空白以降の本文
- `fullText`: 判定対象になった元テキスト
- 区切り空白は半角スペースだけでなく、全角スペースやタブも許容

## 4. 特殊仕様
- **システムメッセージ補完**: メンギフやマイルストーンなど、本文が空でシステム情報だけがある場合、それらを結合して `text` および `parts` にセットします。
- **スパチャ金額**: 金額テキスト（`paidText`）が存在し、本文に含まれていない場合は自動的に末尾へ追加されます。
- **色判定ロジック**:
  1. ギフト背景色・文字色
  2. （`CONFIG.USE_USER_COLOR` が true の場合）ユーザーカラー
  3. 白 (`rgb(255, 255, 255)`)
  の順に優先されます。

## 5. 実装例
```javascript
OneSDK.subscribe({
  action: 'comments',
  callback: (comments) => {
    comments.forEach(raw => {
      // 解析の実行
      const data = VCT.parse(raw);
      
      console.log(`${data.user}: ${data.text}`);
      console.log('解析された色:', data.colorStr);
    });
  }
});
```

## 6. 変更履歴
- **v1.0.5**: `vctCommand` を追加。先頭 `!command` を非破壊で分離し、日本語コマンドと全角スペース区切りにも対応。`vctCommand` は `paidText` 追記前のベース本文から抽出。
- **v1.0.4**: `Super Sticker` 判定を追加。`gift-sticker` または `gift-image` クラスを持つ画像をステッカーとして識別し、`parts` 内に `isSticker` フラグを付与。
- **v1.0.3**: `isOwner`, `isModerator` フラグを追加（配信者やモデレーターの判定を容易に）。
- **v1.0.2**: `parseColor` 関数に `rgba` のパースロジックを修正。
- **v1.0.1**: `parseColor` 関数に `rgba` のパースロジックを追加。
- **v1.0.0**: 初版リリース。
