# ZEVO字幕品質v002 v015 F局所正式attempt-0010 停止報告 v001

日付: 2026-08-14

## 1. 結論

F局所正式attempt-0010は、3検査すべてが共通の開始前hookで停止し、0/3となった。production処理、ZCQ042〜044の検査本体、描画処理には到達していない。

帰属は三分法の「fixture・検査設営欠陥」である。新しい版付きfixture rootを未使用にする確認を「rootが存在しないこと」として閉じた一方、現行testの開始前hookは「実directoryであるrun rootと、その中にある空のfixture rootが既に存在すること」を要求していた。事前確認の定義と正式testの実在前提が一致していない。

本再開後のF/Uで再び検査設営起因の不合格が出たため、最終歯止めを適用する。同attempt内修正、新attempt、修正案の実装、U以降の実行を行わず完全停止する。fixture製造独立工程化を既定案とする採否判断を人間へ戻す。

## 2. 事実

### 2.1 今回実施した限定修正

ZCQ044の各負例に、出力rootとstaging rootそれぞれについて次を明示する期待保持manifestを追加した。

- rootの期待状態: 存在 / 不存在 / 対象外
- 存在すべきfileのexact集合
- 存在してはならないfileのexact集合
- 期待するstatus / stage / primary code

従来の末尾一律条件「全保持rootに1 file以上」を削除し、各負例をそのmanifestとexact照合する構造へ置換した。rejection report書込み失敗枝は、staging root存在・entry 0件・rejection report不存在を期待する。

正式attempt前の事前整合検査は次を確認した。

- 負例宣言: 26件
- 宣言と実行箇所の対応: 26/26
- 同一root内の存在期待と不存在期待の衝突: 0件
- 未宣言rootを末尾集約が要求する経路: 0件
- manifestのfile集合閉包: 26件すべて合格

最初の事前整合検査v001は、改行された負例呼出し1件を抽出できずfailedとなった。記録を保持し、実在する改行形へ抽出を合わせたv002でpassedを得た。これは正式F attemptではない。

### 2.2 起動前checklist

次は合格した。

- native arm64
- 固定Node実体と登録SHA一致
- 固定TSX CLI絶対pathと登録SHA一致
- `NODE_OPTIONS`不存在
- 固定Nodeを先頭にし、`/opt/homebrew/bin`を含むPATH
- FFmpeg / FFprobeの実体と登録SHA一致
- 固定Chromiumのnative起動成功
- 競合する正式test / Remotion / Chromium process 0件
- 正式test sourceの構文合格
- 正式test出力rootとstaging rootが未使用

ただし、fixture rootについて「未使用」を「directory不存在」と判定した。これは正式testの開始前hookが要求する「存在する空directory」と不一致だった。

### 2.3 正式attempt-0010

| ID | 結果 | 到達点 |
| --- | --- | --- |
| ZCQ042 | hookFailed | test本体前。run rootの`lstat`でENOENT |
| ZCQ043 | hookFailed | 同じ共通hookで停止 |
| ZCQ044 | hookFailed | 同じ共通hookで停止 |

集計:

- tests: 3
- passed: 0
- failed: 3
- cancelled / skipped: 0 / 0
- 終了code: 1
- signal: null
- stderr: 0 byte
- 全所要時間: 約0.56秒

TAPが示す具体的停止は、版付きrun rootに対する最初の`lstat`のENOENTである。fixture、output、stagingの製造より前である。

## 3. 三分法

| 帰属候補 | 判定 | 根拠 |
| --- | --- | --- |
| production欠陥 | 該当しない | production入口へ未到達 |
| fixture・検査設営欠陥 | **該当** | 正式testが要求する既存空directoryを設営せず、事前確認も不存在を合格扱いした |
| 契約解釈が必要 | 該当しない | status、code、schema、正式成果物、描画規則の判断には到達していない |

前attempt-0009の個別期待と末尾集約期待の矛盾は、今回のmanifest事前整合検査では0件になった。しかし正式test本体へ未到達のため、負例26件の実処理、ZCQ044の35 proof、F局所3/3は未証明のままである。

## 4. 最終歯止め

本件は、再開後のF/Uで再発した検査設営起因の不合格である。裁定どおり次を行わない。

- 空directoryの追加作成
- testまたはpreflightの修正
- 同attemptの再実行
- 新しいF attempt
- U局所、正式46件、回帰、tree照合
- commit / stable tag

## 5. fixture製造独立工程化の採否材料

既定案は「F/Uのfixture製造と入場確認を、長時間の局所検査から分離した版付き工程として設計する」である。

| 比較軸 | 現行の検査内fixture製造を再調整 | fixture製造の独立工程化（既定案） |
| --- | --- | --- |
| 今回のroot前提 | test開始時の暗黙前提として設営 | 製造工程がroot状態を正式成果物として確定し、検査はreceiptを読む |
| case別manifest | test source内で保持 | 版付きfixture manifestとして製造時に閉包 |
| 正常・負例の成立確認 | 長時間testのhookと実行中へ混在 | test前にschema・path・root・期待成果物を独立検査可能 |
| 長時間枝との分離 | 不十分。設営欠陥が正式attemptで露出 | fixture成立後だけ描画・負例実枝へ入場できる |
| 現行path上限 | 17 path内に留まる | 最低でも製造runnerとそのtestの2 pathが必要で、19 path以上となる。schema・admissionを独立所有する場合はさらに増えるため完全実装設計でexact化が必要 |
| binding影響 | なし | 新runner実体、fixture manifest、admission receiptを正式に束縛するならimplementation / approved contract bindingの改訂が必要 |
| proof影響 | 既存ZCQ042〜044内 | 製造工程の正常・拒否・fatal ownerと、F/Uがreceiptを受ける証明の割当てが必要 |
| 工事の下限 | F test 1 pathの再調整と新attempt | 契約設計1件、完全実装設計1件、production/support最低1 path、test最低1 path、既存F/U入場配線の改訂、正式回帰一式 |
| 人間判断 | 再調整許可1件 | 境界・成果物・入場保証の設計裁定1回と、完全実装設計の承認1回が最低限必要 |
| 利点 | 小工事 | 同型のfixture設営停止をF/Uの長時間実行から構造的に分離できる |
| 不利点 | 同じtest内に前提が散在し続ける | 18 path目、binding、admission、proof会計の契約改訂を伴う |

工事見積は現物から確定できる下限だけを示した。新規path・検査ID・proof件数のexact値は、実現性調査で既存admissionとpublisherの再利用可否を現物照合するまで確定しない。推測値で埋めない。

## 6. 証拠

### 6.1 保持manifest事前整合

- failed v001: `presentation-zevo-caption-quality-v002-f-negative-preservation-manifest-preflight-20260814-v001.json`
  - SHA-256: `1e9cf97e6b5cf2081501967c3a444d42bc769eada0f259fc7b51e2f3e2f8306f`
- passed v002: `presentation-zevo-caption-quality-v002-f-negative-preservation-manifest-preflight-20260814-v002.json`
  - SHA-256: `07325b1f59abcd76cf81d73523bdac84840145f3205315ecce091c79941b9a71`

### 6.2 正式attempt-0010

証拠root:

- `test-runs/20260814-zevo-caption-quality-v002-v015-f-formal-attempt-0010/`

| file | SHA-256 |
| --- | --- |
| `preflight.json` | `b2f5ebb50445c327a5c2c6aad5464910bc88ff9d4b0ee387721683f28c42ab5e` |
| `tap.log` | `9a2a0f826d83745f5eb769abafbd94200e2c55d46b51bb58b21300cf6ab9abfd` |
| `stderr.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `exit-code.txt` | `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865` |
| `signal.txt` | `38e0b9de817f645c4bec37c0d4a3e58baecccb040f5718dc069a72c7385a0bed` |

## 7. 完了・未実施

| 工程 | 状態 |
| --- | --- |
| ZCQ044負例別manifest実装 | 実装済み、事前整合26/26。ただし正式test本体では未実証 |
| F attempt-0010 | **0/3、共通hookで停止** |
| U局所 | 未実施 |
| 正式46件 | 未実施 |
| 直接影響回帰 | 未実施 |
| green 287/287 | 未実施 |
| baseline 86/203 exact | 未実施 |
| 既存5 tree・A-v002記録対象tree照合 | 未実施 |
| commit / tag | 未実施・非承認範囲 |

## 8. 未確認

- 負例26件の実処理と保持manifest exact一致
- ZCQ044の35 proof
- F/U完了後の正式46件・回帰・tree不変
- fixture製造独立工程のexact path・binding・proof件数

## 9. 外部作用

- API通信: 0回
- countTokens: 0回
- generateContent: 0回
- 費用: US$0
- 正式描画: 0回
- commit: 0件
- stable tag: 0件
