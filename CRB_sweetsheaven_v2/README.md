# CommentRaid - Sweets Heaven v2

コメントをスイーツに変換して、カロリーを積み上げていく配信用テンプレートです。

スイーツの落下演出、総カロリーゲージ、コメント変換ログを組み合わせて、配信の参加感を楽しく見せることを目的にしています。

## 特徴

- コメントごとにスイーツを1種類抽選し、画面に落下演出を表示します
- 各コメントで加算されたカロリーを `kcal` 単位で累積します
- 上部UIで総カロリーゲージと累積値を表示します
- 下部UIでコメント変換ログを表示します
- ギフト時は生成数と加算倍率が増え、ログに追加メッセージを付けられます
- スイーツ演出は絵文字だけでなく画像ファイル表示にも対応しています
- 基本は画像モードで運用しつつ、必要に応じて絵文字モードへ切り替えできます
- 画像が存在しない、または破損している場合でもエラーマーク事故を避けやすい構成です
- 上下UIは `config` またはトグルキーで非表示にでき、演出だけ表示する運用も可能です

## フォルダ構成

- `index.html`
  テンプレート本体です
- `data/config.js`
  ベーステンプレート向け設定です
- `data/sweets_config.js`
  Sweets Heaven 固有の設定です
- `plugins/sweets_logic.js`
  カロリー計算、ログ生成、状態更新を担当します
- `plugins/sweets_fx.js`
  スイーツの落下演出と kcal ポップアップを担当します
- `plugins/data/sweets_master.js`
  スイーツマスターデータです
- `plugins/ui.html`
  上下UIのHTMLです
- `plugins/style.css`
  UI見た目のスタイルです

## 基本の使い方

1. `data/sweets_config.js` を開きます
2. タイトルやカロリー表示、演出パラメータを必要に応じて調整します
3. 必要なら `plugins/data/sweets_master.js` でスイーツの種類や画像を編集します
4. わんコメからテンプレートを読み込み、表示確認します

## 主な設定

### UI表示

- `UI_TITLE`
  上部タイトル文字列
- `UI_LABEL`
  上部ラベル文字列
- `CALORIE_TEXT_SUFFIX`
  カロリー表示の単位
- `UI_DISPLAY_MODE`
  `full` `top_only` `bottom_only` `effect_only` を指定できます
- `UI_TOGGLE_KEY`
  実行中にUI表示モードを切り替えるキーです。例: `"F8"`
- `UI_TOGGLE_SEQUENCE`
  トグル時に巡回するモード配列です

### 演出

- `MAX_ACTIVE_SWEETS`
  同時表示するスイーツ演出の上限です
- `FALL_DURATION_MIN` `FALL_DURATION_MAX`
  落下時間の範囲です
- `SWAY_AMOUNT`
  横揺れの強さです
- `SWEET_BASE_SIZE`
  スイーツ画像や絵文字の基準サイズです
- `SWEET_DISPLAY_MODE`
  `image` `emoji` を指定できます。通常運用は `image` を想定しています
- `SWEET_SCALE_MIN` `SWEET_SCALE_MAX`
  通常コメント時のサイズ倍率です
- `GIFT_SWEET_SCALE_MIN` `GIFT_SWEET_SCALE_MAX`
  ギフト時のサイズ倍率です
- `KCAL_POPUP_FONT_SIZE`
  `+xxx kcal` ポップアップの文字サイズです

### ログ

- `MAX_LOG_CHARS`
  ログ1行あたりの最大文字数目安です
- `MAX_LOG_LINES`
  ログ表示行数です
- `LOG_FORMAT`
  現在は `battle_1line` を想定しています
- `GIFT_LOG_SUFFIX`
  ギフト時だけログ末尾に追加する文言です。例: `おまけ付き！`

### ゲージ

- `GAUGE_CYCLE_CALORIES`
  ゲージ1周分のカロリーです
- `GAUGE_PHASE_COLORS`
  周回ごとの基準色パレットです
- `RAINBOW_MILESTONE_CALORIES`
  虹演出を発火するカロリー区切りです
- `RAINBOW_DURATION_MS`
  虹演出の表示時間です

### ギフト

- `GIFT_TIERS`
  ギフト金額帯ごとのカロリー倍率と生成数です

## 画像対応

`plugins/data/sweets_master.js` の各要素で `imageFile` を指定すると、画像モード時に画像を表示できます。

例:

```js
{
  id: "donut",
  name: "ドーナツ",
  emoji: "🍩",
  imageFile: "donut.png",
  baseKcal: 320,
  variance: 0.3,
  spawnWeight: 1.0
}
```

相対パスを省略した場合は `./assets/food/` 配下の画像として扱われます。
`SWEET_DISPLAY_MODE: "emoji"` にすると、画像ではなく絵文字で表示します。

注意:

- 通常運用は `image` モードを推奨します
- 画像が存在しない、または破損している場合の見え方はブラウザ実装差の影響を受けることがあります
- OBS などのブラウザソースで絵文字表示の安定性を重視する場合は、必要に応じて `emoji` モードを使用してください

## UI表示モード

- `full`
  上部UIと下部UIを表示します
- `top_only`
  上部UIだけ表示します
- `bottom_only`
  下部UIだけ表示します
- `effect_only`
  UIを隠して落下演出とポップアップだけ表示します

`UI_TOGGLE_KEY: "F8"` のように設定すると、ファンクションキー `F8` で切り替えられます。

## ギフト時の挙動

- 通常コメントより多くのスイーツが出現します
- スイーツサイズが少し大きくなります
- 総加算カロリーが増えます
- ログ末尾に `GIFT_LOG_SUFFIX` を付けられます


## 📝 ライセンス

# コード

- 本プロジェクトのコード部分は **MIT License** の下で公開されています。
- 自由に使用・改変・再配布できます。

# わんコメ（OneComme）について

- 本プラグイン、及び**CommentRaid-Base**は **わんコメ（OneComme）** を利用して動作します。
- 使用にあたっては **わんコメの利用規約に準拠してください。**

## 画像・動画素材（./assets/）

- `./assets/` フォルダに含まれる素材は**AI生成画像を加工した配信演出用素材**です。

以下の条件で使用できます。

### 許可
- 本テンプレート内での使用
- 配信・動画・配信演出での利用
- 本パッケージ **そのままの再配布**

### 禁止
- 素材単体での配布
- 素材単体の再配布
- 素材の販売
- 素材集としての再利用

## 注意
- `./assets/` の素材は **プラグインの一部としてのみ提供されています。**
- 素材単体の利用や再配布は禁止されています。

## 補足

- 保存機能は `data/config.js` の `SAVE_PROGRESS` に従います
- 進捗リセットは `data/config.js` の `RESET_PROGRESS` に従います
- `CommentRaid - Sweets Heaven 仕様書.txt` は要点メモです。詳細は `README.md` と `TECHNICAL_SPEC.md` を参照してください


## 📜 CHANGELOG
v2.0.0 - Commentraid-base_V2 に合わせてパス等書き換え
v1.0.2 - 画像/絵文字表示モードと画像欠損時の安全性まわりを調整、UI状態初期化を安定化
v1.0.1 - 表示周りのカスタマイズ性とUIのオンオフ機能追加
v1.0.0 - 初回リリース


## 作者
Umetana
Virtual V-Tuber / V-Creator
Developer of V-Creator Tools
