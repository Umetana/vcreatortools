# vct_one_core.js v1.2.1 移行計画

## 目的
`VCT_SB_V1` / `VCT_SB_V1_UI` を `vct_one_core.js` v1.2.1 の `parseCore` / `event` / `buildSupportRecord` ベースへ段階移行する。

## 方針
1. 本体は受信コメントを `VCT.parseCore(rawComment)` で解析する。
2. 支援判定は Legacy の `hasGift` ではなく `core.event.isSupport` を使う。
3. `supports` レコード生成は `VCT.buildSupportRecord(coreComment, options)` に集約する。
4. 表示専用の整形、カード描画、既存DB読み込みは維持する。
5. UI側は `VCT_IDB` の `supports/users` を読む管理画面として扱い、保存レコード形が変わらない限り大きく変更しない。

## 今回完了
- `VCT_SB_V1/main.js`
  - `VCT.parse(rawComment)` 依存を `VCT.parseCore(rawComment)` に変更
  - `commentData.hasGift` 判定を `coreComment.event.isSupport` 判定に変更
  - 独自 `buildSupportRecord` を `VCT.buildSupportRecord` 呼び出しへ変更
  - 独自の amount/currency/message 抽出を削除
  - 表示側の `resolveSupportGift` フォールバックは、既存DBレコード互換のため残置
- `_vct_core/js/vct_one_core.js`
  - `sponsorgift` / `membership_gift` を `supports` 保存対象として扱うため `event.isSupport` を付与
  - メンバーシップギフトは `event.giftCount` を `supports.amount` に保存するよう補正
- `VCT_SB_V1_UI`
  - `supports/users` 読み取り中心で、今回の生成経路変更による必須差分なし
  - `index.html` は v1.2.1 コアと IDB 分割モジュールを読み込み済み
- 動作確認
  - superchat の本体表示と UI 表示を確認済み
  - supersticker の本体表示と UI 表示を確認済み
  - sponsorgift / メンバーシップギフト送信の本体表示と UI 表示を確認済み

## 次の段階
1. UIの詳細画面やフィルタで `event.kind` を使う価値があるか、保存レコード拡張とセットで検討する。
2. `supports` レコードへ `eventKind` / `eventCategory` / `giftCount` などを保存するか、メリットとデメリットを見てからコア側仕様として判断する。

## 判断メモ
- README には、保存担当は `VCT_Core` で本体は即時表示のみ、という責務分離を明記済み。
- 現在のUIは `rawType`、金額/件数、通貨、platform、streamId、日付、ユーザー条件で主要確認ができる。
- `event.kind` は現状の `supports` レコードに保存されていないため、今すぐUIフィルタへ足す優先度は高くない。
- `eventKind` などを保存するメリット
  - `superchat` / `supersticker` / `membership_gift` などをコア分類名で安定表示できる。
  - 将来、rawType の揺れを吸収したフィルタや集計に使いやすい。
  - 詳細画面で「コアがどう判定したか」を確認しやすい。
- `eventKind` などを保存するデメリット
  - `supports` スキーマの拡張になり、既存データとの混在を考える必要がある。
  - UI側の表示/フィルタ/集計の選択肢が増え、現状用途には少し過剰になりやすい。
  - Core分類仕様を変えた場合、過去レコードの意味づけと揃える方針が必要になる。
- giftreceived / milestonechat / member_join はギフト支援とは異なるため、現時点では `supports` 対象外でよい。
- 他テンプレートへの横展開は、現状 `VCT_SB_V1` 以外で同じギフト履歴用途がないため急がない。リスモンはDB利用予定があってもギフト履歴処理が主目的ではない。

## 注意
- OBS と Chrome は IndexedDB が別管理のため、OBS側で保存された履歴はChrome側UIには出ない。
- Chrome側で履歴保存とUI確認を行う場合は、Chrome側でも保存担当の `VCT_Core` を開いておく必要がある。
- `VCT_SB_V1` 本体は保存責務を持たず、起動中に届いた支援イベントの即時表示だけを行う。
