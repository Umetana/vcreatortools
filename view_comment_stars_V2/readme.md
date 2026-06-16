# View Comment Stars V2 v2.0.0-dev

ギフトコメントに `★` が斜めに降り注ぐ、わんコメ用のGlass系カスタムテンプレートです。

VCT SDK (`vct_one_core.js`) v1.2.3 の `parseStructured()` / `event` レイヤーに対応し、コメント本文と支援・メンバーシップ情報を分離して表示します。

## 主な機能

- Glassmorphism風のコメント表示
- スパチャ、Super Sticker、メンバーシップ、メンギフ送信/受取、固定コメントの基本表示
- OWNER/MODのユーザー属性バッジ表示
- ギフト/メンバー系コメント枠の背景・枠線濃度調整
- ギフト・メンバー・固定コメントへの星降り演出
- `STAR_COLORS` による複数色の星パレット
- CSSの明滅・色相変化による煌めき表現
- `config_editor.html` による設定編集
- イベント種別ごとの本文表示フィルター
- YouTube自動翻訳文の表示切り替え

## 星降り演出

標準では `STAR_MODE: "special"` のため、支援イベント、メンバーシップ系イベント、固定コメントに星が降ります。

主な設定:

- `STAR_MODE`: `off` / `gift` / `special` / `always`
- `STAR_DIRECTION`: `down-right` / `down-left` / `random`
- `STAR_GLYPH`: 演出に使う文字。標準は `★`
- `STAR_COUNT`: 1コメントあたりの星数
- `STAR_COLORS`: カンマ区切りの星色パレット
- `STAR_SIZE_MIN` / `STAR_SIZE_MAX`: 星のサイズ範囲
- `STAR_DURATION_MIN` / `STAR_DURATION_MAX`: 落下時間
- `STAR_DELAY_MAX`: 星ごとの開始遅延
- `COMMENT_TRANSLATION_MODE`: `original` / `translated` / `both`

## 導入方法

1. わんコメの「テンプレート」フォルダを開きます。
2. `view_comment_stars_V2` フォルダを配置します。
3. わんコメの「テンプレート選択」から `View Comment Stars V2` を選択します。

## 設定エディタについて

`config_editor.html` は設定値の編集と `config.js` の生成に使えます。
ブラウザのセキュリティ制限により、直接読み込み・上書き保存が使えない場合は、`config.jsをダウンロード` で生成したファイルをテンプレートフォルダ内の `config.js` と入れ替えてください。

## ライセンス

MIT LICENSE

本テンプレートは改造・再配布自由です。
