# candidate 13 基本テロップ B2 R1・R2・R3全件検査 停止報告 v001

- 日付: 2026-07-24
- 結論: **package側の正式全件検査が132件中105合格・27不合格となったため、夜間停止規律に従って停止した**
- 主線: R1字句検査、R2案A、R3大容量分割読取の実装と全件再検査
- 副線: なし
- 人間作業: 0件・時間計測なし

## 1. 本来の目的

目的は検査を合格に見せることではない。

承認済みの三修正を契約どおり実装し、以前の不合格を説明したR1・R2・R3が
実際のproduction経路でも解消したかを、一度の全件検査で確かめることである。

今回、最初のpackage側全件検査が不合格だった。したがって、105件を部分合格とせず、
不合格後の修正・再実行、意味回答側検査、既存回帰、candidate 13 preflightへ
進んでいない。

## 2. 検査前に実装した範囲

### 2.1 R1: 実行されるJavaScriptだけを調べる字句検査

- コメント、文字列、テンプレートのraw部分、正規表現の字面を禁止呼出しと誤認しない。
- 通常member、optional member、spread、承認済み数値表現を区別する。
- dynamic import、CommonJS require、module読込時に実行されるfile I/Oは拒否する。
- package側と意味回答側で同じ字句規則を持つ。

### 2.2 R2: 壊れた子を親集計へ部分利用しない案A

- 子のshapeが不成立なら、その子を対応元文字数・境界候補数の両集計から除外する。
- 件数だけが不正なら、不正な種類の親集計だけを成立不能とする。
- 除外した事実は子自身の違反として残し、隠蔽しない。
- container数と配列長の独立検査は維持する。

### 2.3 R3: 大容量fileの版付き分割読取

- 同一の読取handleからchunkを順番に取得し、SHA-256とbyte数を逐次計算する。
- 監視treeのregular fileを一つのBufferへ全量保持しない。
- open前、open直後、読取後のfile状態照合とclose失敗の扱いを維持する。
- package側と意味回答側のproduction runnerを同じ読取形式へ揃える。

実装前の静的確認では、構文成立、差分の空白不良なし、R1/R2/R3の重大指摘なしを
確認した。ただし、静的確認は正式全件検査の代わりではない。

## 3. 公式package全件検査

実行したのは次の1回だけである。

```text
/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node
  --test
  --test-reporter=tap
  --test-reporter-destination=evals/clip_composition/reports/presentation/test-runs/20260724-caption-b2-r1-r2-r3-v001/package.tap
  evals/clip_composition/test_presentation_caption_semantic_source_package_v001.mjs
```

| 項目 | 結果 |
|---|---:|
| 全検査 | 132 |
| 合格 | 105 |
| 不合格 | 27 |
| skipped | 0 |
| cancelled | 0 |
| todo | 0 |
| 終了コード | 1 |
| 実行時間 | 約51.85秒 |

TAP全文:

- path:
  `evals/clip_composition/reports/presentation/test-runs/20260724-caption-b2-r1-r2-r3-v001/package.tap`
- SHA-256:
  `b91a7fd8dbe30e708101a441a8f15aed67cdcfdd37a55957d052358a43671a24`

## 4. R1・R2・R3別の結果

### 4.1 R1は不成立

拒否すべき34例は34/34で拒否できた。一方、受理すべき次の7検査は全て不合格だった。

1. 関数・block arrow・concise arrow内の遅延file I/O。
2. 通常member・optional member後の除算。
3. spread三形とspread直後の正規表現。
4. 正規表現・コメント・文字列・template raw内の禁止語。
5. 承認済み数値五形。
6. 制御条件内とstatement開始の正規表現。
7. 実package 2 source。

読み取りだけの静的診断で、共通する先行原因を特定した。

- production package runnerの先頭byteは`#!/usr/bin/env node`である。
- R1 scannerはJavaScript本体を先頭から走査するが、hashbangを処理する規則を持たない。
- `#`はどの受理分岐にも入らず、字句不成立になる。
- 受理例1〜6は全てこのrunner sourceへ例を追記して調べるため、追記した例へ到達する前に
  元runnerのhashbangで失敗する。

したがって今回の停止根は、R1の既知目的とは別の第四原因ではなく、
**R1 scannerの受理契約に、production runnerが実際に持つhashbangが未定義だった**
というR1内部の実装契約不足である。

この不足を独自判断で「hashbangを許可する」または「runnerから削除する」の
どちらかへ寄せることは、新しい契約判断になるため行っていない。

### 4.2 R2関連は13/13合格（案A固有は12/12）

job投影の正常契約1検査と、R2案Aを直接調べる12検査は全て合格した。

- 件数不正の子を該当親集計へ部分利用しない。
- 両件数不正で子違反だけを返す。
- 一方の件数が不正でも、他方の独立した親不一致を検出する。
- 未知field、field順違反、件数欠落、shapeと数値不正の併存、非objectを
  子全体として除外する。
- 全子が有効な場合の二種類の親合計不一致を検出する。
- container数と配列長の独立検査を維持する。

これはR2案A単体の実装が固定契約どおり動いた証拠である。ただし、
package全体が不合格なので、B2全体の合格へ拡張しない。

### 4.3 R3の基礎経路は合格、正式公開経路は未到達

次の4検査は合格した。

1. production読取handleの固定入口、同期one-use、AsyncIterableの同一内容。
2. 3.38GB実fileのchunk SHA-256・byte数と独立helperの完全一致。
3. 空file、one chunk、multi chunk、端数chunkで同じ監視投影hash。
4. open、不正chunk、短過読、読取後変化、close失敗のuntrusted化。

一方、準備投影とproduction開始投影の一致、正式公開媒体のopen/read失敗帰属、
公開失敗後の最終job再読取、production CLIのchunk投影を調べる統合4検査は
不合格だった。公開失敗後の再読取検査の実出力は、意図したR3段へ進む前に
`implementationBinding / IMPLEMENTATION_MISMATCH`で停止している。
周辺の正式runner検査も同じく`implementationBinding`で先行停止した。

よって、今回の実測からはR3の基礎分割読取が動いたことまでは言えるが、
正式公開経路のR3契約が成立したとは認定できない。R1を直さずR3だけを再実行して
結論を作ることも行っていない。

## 5. 不合格27件の帰属

| 帰属 | 件数 | 状態 |
|---|---:|---|
| R1の受理契約を直接調べる検査 | 7 | hashbang未定義により不合格 |
| R1先行失敗で後続の固有違反・build・publication・CLIへ到達しない検査 | 20 | 下流結果を未成立として保持 |
| R2関連のjob投影検査 | 0不合格 / 13合格 | 案A固有12件を含め契約どおり |
| R3基礎分割読取の直接検査 | 0不合格 / 4合格 | 基礎経路のみ確認 |

後続20件には、表示台帳の不正、正常preflight、build失敗、正式公開段階、
R3正式失敗帰属、production CLI、違反コード観測集合が含まれる。
これらを個別の新原因と数える根拠はない。TAPでは、意図した違反が出ない、
または期待した段階より前の`implementationBinding`で止まる形が共通している。

ただし、R1解消後に20件が全て合格するとは推測しない。今回は到達していないため、
独立した下流欠陥の有無も未確定である。

## 6. 夜間停止条件との対応

次の停止条件が成立した。

- 事前固定したpackage全件合格を満たさなかった。
- production runnerの実在hashbangという、R1契約に無い判断対象が出た。
- R1先行停止により、正式公開経路を含む後続検査の結果を確定できなかった。

そのため、次を行っていない。

- R1へのhashbang対応またはrunnerからの削除
- package検査の修正・部分再実行・全件再実行
- 意味回答側B2全検査
- ゲートA回帰
- 残存source atom回帰
- candidate 13 preflight jobの生成
- candidate 13読み取り専用preflight
- B2完了報告
- 次ゲート承認依頼
- 正式package、prompt、Gemini、表示計画、指示書、描画

既存の正式成果物、凍結fixture、expected、candidate 13基礎映像は変更していない。

## 7. 現在地と次の判断

R2案Aは関連検査に合格し、R3は3.38GBを含む基礎分割読取まで到達した。
B2全体は、R1 scannerがproduction runner自身を受理できず停止中である。

次に再開する場合は、R1のhashbangを

1. runner先頭に限る正規のJavaScript hashbangとしてscannerが受理する、または
2. production runnerからhashbangを除く

のどちらで正本化するかを、修正設計として先に固定する必要がある。
その承認なしにコード変更・再実行へ進まない。

本停止報告の確認に、人間の媒体視聴、時刻入力、判定セッションは不要である。
