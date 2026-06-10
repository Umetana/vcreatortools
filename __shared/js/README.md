# V-Creator Tools Shared JavaScript

このディレクトリには、VCT 系テンプレートや関連テンプレートから共通利用する JavaScript ライブラリを配置しています。

## 含まれるもの

### `vct_one_core.js`
OneComme / OneSDK から受け取るコメントデータを、テンプレート側で扱いやすい形式へ解析・整形する共通ライブラリです。

主な役割:
- コメント本文の整形
- 絵文字 / 画像パーツの分離
- 色情報の解釈
- システムメッセージや支援系情報の補完

詳細仕様:
- [VCT_SDK_SPEC.md](./VCT_SDK_SPEC.md)

### `vct_idb.js`
VCT 系テンプレートや CommentRaid 系テンプレートで共有する IndexedDB ラッパーです。

主な役割:
- 支援イベント履歴の保存
- ユーザープロフィールの保存
- プラグイン / テンプレート状態の保存

詳細仕様:
- [VCT_IDB_SPEC.md](./VCT_IDB_SPEC.md)

## ライセンス

このディレクトリ内の VCT 関連ライブラリは MIT License です。

- ライセンス本文: [LICENSE](./LICENSE)

## サードパーティ

IndexedDB ラッパーとして同梱している `idb` ライブラリのライセンスは以下を参照してください。

- [../lib/idb/LICENSE_idb.txt](../lib/idb/LICENSE_idb.txt)

## メモ

この README は「これらのファイルが何か」を簡潔に案内するための入口文書です。
API やデータ構造の詳細、変更履歴は各 SPEC を参照してください。
