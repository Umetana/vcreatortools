# Comment Raid Base v2.1.0-dev Visual Reference

本基盤は 1920x1080 (FHD) の固定キャンバスを前提としています。プラグイン開発時のレイアウト調整にご活用ください。

## 1. キャンバス座標系
- **全体サイズ**: 1920px x 1080px
- **基準点 (0, 0)**: 左上
- **レイヤー構造 (Z-Index)**:
  1.  `#fx`: 演出（ダメージ数字、エフェクト）- **最前面**
  2.  `#ui-root`: プラグインUI（HPバー、ボタン等）
  3.  `.comments`: 共通ログ表示エリア - **背面**

## 2. 標準UI要素のID (Raid系)
以下のIDを `ui.html` で使用すると、`script.js` の標準同期機能が自動適用されます。

| 要素 ID | 役割 | 同期内容 |
| :--- | :--- | :--- |
| `#boss-panel` | UI全体のコンテナ | 復活・撃破時のアニメーション適用 |
| `#boss-label` | ボス名などの見出し | `state.ui.status.label` を表示 |
| `#boss-bar-fill` | HPゲージ（メイン） | `state.ui.status.progress` で幅を制御 |
| `#boss-bar-lag` | HPゲージ（追従） | メインゲージを追ってスムーズに減少 |
| `#boss-hp-text` | HP数値テキスト | `state.ui.status.text` を表示 |

## 3. ログウィンドウの設計
レイドバトル標準のログウィンドウ（`ui.html` 内）は以下の構造になっています。

- `#log-viewport`: ログの表示窓（`overflow: hidden`）
- `#log-list`: 実際のログ行が追加されるコンテナ（上方向にスクロール）
- `.raid-log`: 各ログ行のクラス

## 4. 演出（FX）の発火点
`ctx.events.push` で発生する文字演出は、デフォルトで **画面中央付近（ボスの位置想定）** または **コメントの発生位置** に表示されます。

- **中央位置**: `top: 300px; left: 50%;` 付近
- **オフセット調整**: `script.js` 内の `FX.push` 呼び出し時の座標計算で変更可能です。
