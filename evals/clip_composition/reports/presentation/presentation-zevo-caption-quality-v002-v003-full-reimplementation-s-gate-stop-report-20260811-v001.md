# ZEVO字幕品質v002 v003全面再実装 S局所ゲート停止報告v001

- 日付: 2026-08-11
- 対象: `ZEVO字幕品質v002 selection再読実値配線追補v003`
- 承認済み追補SHA-256: `632aa7fdec88da47fe8639fb10f74f390aa0cc5f191a114b797c08115bee4c9e`
- 停止位置: S工程の局所ゲート
- 結論: 正式6件は`0/6`。不合格1件で停止する規律に従い、同attemptの修正・再実行とA以降の実装を行っていない。

## 1. 入場条件の成立

1. 親契約、完全実装設v001、累積追補v002、全面再実装修正設v001、実値配線追補v003の現物SHA-256を照合した。
2. 停止時の部分実装5 pathは事前記録のSHA-256と一致した後に除去した。
3. 新規14 pathが全て未作成であることを確認してからS工程を開始した。
4. S工程の2 path以外は作成していない。
5. 既存5成果物treeの事前照合は5/5合格した。

## 2. 実装した範囲

| path | 処理の意味 | 停止時SHA-256 |
|---|---|---|
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` | 意味情報と表示様式の検証済み入力から、Geminiへ見せる最小境界候補とローカル再構築情報を作り、上書きなしで公開する入口 | `bcdd3b69bba6573ea65b5a75b931c7de4e88e33aa4e1467a0d69ee11af542cc8` |
| `evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs` | S工程の6検査ID、39 proof item、7違反code、厳密schema、公開経路を検査する局所ゲート | `882e56c921583773eb1e79dbe48b03367de2c607e7e036d3c3d5eb3201c74b57` |

`DECISIONS.md`には、本承認と「局所ゲート自体の期待schemaを承認文書byteから照合する」規則を記録した。

## 3. 実行条件

```text
cwd=/Users/kawafmm/workspace/zev2
Node=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node
TSX=/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs
NODE_OPTIONS=不存在
PATH=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
external communication=0
cost=US$0
```

実行command:

```text
env -u NODE_OPTIONS PATH=/Users/kawafmm/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node --import /Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/loader.mjs --test evals/clip_composition/presentation_output_caption_cue_source_package_v001.test.mjs
```

- 実行はテストfileの更新時刻 `2026-08-11T12:22:12+09:00` 以後、事後時刻 `2026-08-11T12:23:52+09:00` 以前に実施した。開始時刻の秒単位実測は未取得である。
- TAP実測durationは `558.357667 ms`。
- 本局所ゲートにChromium起動はなく、Chromium可否は本実行の事実として主張しない。

## 4. 観測結果

| 順 | 検査ID | 結果 | duration | 最初に保存できた不一致 |
|---:|---|---|---:|---|
| 1 | ZCQ001 | failed | 268.500166 ms | `ZCQ001-P-09-e55f181b8f6a`: 正式CLI正常経路の終了code、期待`0`に対し実測`2` |
| 2 | ZCQ002 | failed | 0.975417 ms | 合成正常fixtureのpackage構築、期待`passed`に対し実測`rejected` |
| 3 | ZCQ003 | failed | 0.405167 ms | ZCQ002と同じ合成正常fixtureのpackage構築が`rejected` |
| 4 | ZCQ004 | failed | 0.861584 ms | ZCQ002と同じ合成正常fixtureのpackage構築が`rejected` |
| 5 | ZCQ005 | failed | 149.136041 ms | `ZCQ005-P-01-45440c1d3fb3`: canonical SHA不一致の期待`CUE_SOURCE_INPUT_BINDING_INVALID`に対し実測`CUE_SOURCE_EXECUTION_FAILED` |
| 6 | ZCQ006 | failed | 0.58825 ms | ZCQ002と同じ合成正常fixtureのpackage構築が`rejected` |

集計:

```text
tests=6
passed=0
failed=6
cancelled=0
skipped=0
todo=0
process exit=1
```

## 5. 事実・推測・未確認

### 5.1 事実

- 正式CLIの正常を期待した経路は終了code 2で停止した。
- 合成正常fixtureを入れたpure package構築は`rejected`を返した。
- canonical SHA不一致fixtureは、期待した検査済み拒否ではなくfatal所有codeへ到達した。
- 最初の不合格を観測した同attemptでproduction、fixture、期待値を修正していない。
- A、L、P、R、F、Uの12 pathは未作成のままである。
- API通信、countTokens、generateContent、費用支出、正式描画は0件。

### 5.2 推測

- なし。複数の不合格を同一原因とみなさない。

### 5.3 未確認

- ZCQ001の終了code 2の内側stageとprimary code。不一致assertより後の子process stdoutは版付きTAPへ保存されていない。
- pure package構築が返したprimary codeとpath。検査はstatusの最初の不一致で停まった。
- canonical SHA不一致より前に別の読取・環境・実体照合が失敗したか、当該不一致の帰属が誤っているか。
- 三分法による帰属（productionが契約に届いていない / fixture・検査設営が契約とずれている / 契約矛盾）。

## 6. 証拠保持の限界

局所ゲートは実装対象2 path以外を作らない直列規律下で実行した。実行時にTAP全文の版付き保存pathは製造せず、コンソール観測だけを本報告へ転記した。正式46件に対する「TAP全文の版付き保存」はまだ開始前であり、その規律を代用したとは主張しない。

## 7. 停止と次の判断点

局所ゲート不合格により、承認済み停止条件が成立した。現在の2 pathと本停止報告を不合格証拠として保持し、変更・再実行・A工程への進行を行わず停止する。

次に必要なのは、保存済み2 pathと本観測記録だけを使った読み取り専用原因診断である。診断の承認なしに修正設計、実装、再実行へ進まない。
