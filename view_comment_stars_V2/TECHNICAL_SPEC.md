# View Comment Stars V2 Technical Spec

本ドキュメントは、`view_comment_stars_V2` の内部構造と星降り演出の実装メモです。

## 1. システム構成

- Core: Vue.js 3 (Composition API)
- SDK: OneSDK / VCT Core SDK v1.2.1
- Styling: Vanilla CSS + CSS Variables

## 2. フォルダ構成

- `index.html`: Vueテンプレートとライブラリ読み込みを定義。
- `main.js`: OneSDK購読、VCT解析、表示用データ整形、星演出データ生成を担当。
- `style.css`: コメントレイアウト、ギフト/メンバー/固定コメントの見た目、星降りアニメーションを定義。
- `config.js`: 実際に読み込まれる設定。
- `config_default.js`: 設定エディタのデフォルト復元用設定。
- `config_editor.html`: 設定変更用UI。
- `lib/vct_one_core.js`: VCT Core SDK v1.2.1。

## 3. データ処理

`main.js` の `parseComment()` は、利用可能であれば `VCT.parseStructured(raw)` を使います。

主な表示データ:

- ユーザー: `parsed.user.displayName` / `parsed.user.profileImage` / `parsed.user.badges` / `parsed.user.isOwner` / `parsed.user.isModerator`
- 本文: `parsed.message.parts`
- イベント: `parsed.event.kind` / `parsed.event.displayLabel` / `parsed.event.isSupport` / `parsed.event.isMembership`
- 固定コメント: `parsed.system.isSticky`
- 強調色: `parsed.style.colorStr`

OWNER/MOD は `buildUserFlags()` で表示用データに変換します。`isOwner` が true の場合は OWNER を優先し、MOD は同時表示しません。

## 4. 星降り演出

コメント追加時に `buildStars(comment)` が `STAR_MODE` を参照し、星データを生成します。

- `gift`: `comment.isSupport` のときだけ表示
- `special`: `comment.isSpecial` のとき表示
- `always`: すべてのコメントで表示
- `off`: 表示しない

生成した星データは各コメントの `stars` 配列に格納し、`index.html` の `.cmt__stars` レイヤーで描画します。

`STAR_DIRECTION` は `down-right` / `down-left` / `random` に対応します。CSSの `@keyframes star-shower` で、コメント上部から斜めに落下しながら明滅・軽い色相変化を行います。

## 5. 調整ポイント

- 星を増やす: `STAR_COUNT`
- 色味を変える: `STAR_COLORS`
- 向きを変える: `STAR_DIRECTION`
- 派手にする: `STAR_SIZE_MAX` と `STAR_COUNT` を上げる
- ゆっくり降らせる: `STAR_DURATION_MIN` / `STAR_DURATION_MAX` を上げる
- 密度を散らす: `STAR_DELAY_MAX` を上げる
