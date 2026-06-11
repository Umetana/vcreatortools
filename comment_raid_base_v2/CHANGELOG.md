# CHANGELOG - Comment Raid Base

## v2.0.0 (2026-06-12)
### Changed
- V1を残したまま `comment_raid_base_v2` としてフォーク。
- VCT SDK参照を旧同梱 `./__shared/js/vct_one_core.js` から共通 `../_vct_core/js/vct_one_core.js` (v1.2.1+) へ移行。
- `script.js` が legacy互換コメントに `event`, `structured`, `message`, `monetization`, `membershipInfo`, `service` を付与するように変更。
- `ENGINE.extractGiftPrice()` は利用可能な場合 `VCT.extractSupportAmount()` を優先。

## v1.1.1 (2026-03-14)
### Fixed
- **script.js**: ログの切り分け（名前と本文の分離）ロジックを改善しました。
  - お名前に「の」が含まれている場合に表示が崩れる不具合を修正。
  - 優先順位を「：」（通常コメント） > 「最後の『の』」（バトル演出）に整理。

## v1.1.0 (2026-03-12)
### Added
- **manifest方式の正式採用**: UI, CSS, Scripts をプラグイン側の manifest ファイルで一括管理できる仕組みを導入。
- **プラグイン間通信の強化**: `state.ui.status` を通じた UI への自動同期機能を実装。
- **責務の明確化**: Core (`js/core/`) は演出と基盤に特化し、ルールはプラグインが担当するアーキテクチャへ移行。

## v1.0.0 (2026-02-28)
### Added
- 初回リリース
- 基本的なレイドバトル機能の共通化
- FX演出、ログスクロール、HPバー同期機能の搭載
