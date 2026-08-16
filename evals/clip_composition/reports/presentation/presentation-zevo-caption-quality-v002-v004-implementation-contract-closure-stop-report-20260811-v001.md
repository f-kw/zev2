# ZEVO字幕品質v002 v004実装 契約閉包停止報告 v001

- 日付: 2026-08-11 JST
- 起点HEAD: `542b35684a3ad67dbab042ca2bb3bff022e42023`
- 対象正本: `presentation-zevo-caption-quality-v002-atomic-publication-b6-owner-scope-revision-addendum-20260811-v004.md`
- 対象正本SHA-256: `39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade`
- 結論: 実装前のcode所有閉包で未所有枝を一件検出したため、S正式attemptを開始せず停止した
- 外部通信: 0回
- 費用: US$0

## 1. 30秒版

B6は、正式jobと固定requestが正しくても、実行環境に`GEMINI_API_KEY`が無い場合はHTTP requestを開始する前にfatal停止する。現行productionはこの枝を`CUE_PROVIDER_TRANSPORT_FAILED`へ置いている。一方、承認済み追補v004は同codeを「HTTP request開始からresponse byte取得までのnetwork・timeout・non-responseだけ」に限定した。

したがって、API key不存在枝は追補v004の48 codeのどれにも正しく所有されない。既存codeへ黙って寄せると承認済みcodeの意味を変えるため、48/48所有と実発火を実装で捏造せず停止した。

## 2. 確定した観測

| 観測 | 実体 |
|---|---|
| 現行productionのAPI key読取 | `run_presentation_output_caption_cue_b5_b6_v001.mjs:2226`で実行環境から読む |
| API key不存在時点 | HTTP endpoint製造・transport呼出しより前 |
| 現行外側code | 同file 2228–2230で`CUE_PROVIDER_TRANSPORT_FAILED` |
| 現行内側stage/code | `provider-transport` / `network-transport` |
| v004のtransport所有 | v004 §6.2–§6.3で、HTTP request開始後のnetwork・timeout・non-responseだけ |
| v004が追加した通信前code | `CUE_B6_INPUT_REREAD_FAILED`。B5 13成果物と固定requestの再読失敗だけを所有 |
| code閉包条件 | 48 codeのowner集合・production実枝集合・実発火集合を48/48でexact一致 |

## 3. 三分法

| 区分 | 判定 | 根拠 |
|---|---|---|
| productionが承認済み契約へ届かない | 単独原因ではない | 現行productionの写像は、v004より前の広いprovider transport所有に沿っていた。v004の純化を実装するには、この枝の新しい所有先が必要 |
| fixture・検査設営の欠陥 | 該当しない | 実在するproduction分岐と承認済み文書byteの比較で発見した。fixtureを直して消える枝ではない |
| 契約の矛盾・未閉包 | **該当** | v004は通信前再読二群とHTTP開始後三群を閉じたが、その間にある認証情報不存在の通信前fatalを列挙していない。既存codeのどれへ置くかは契約解釈を要する |

帰属は「v004のB6失敗code所有表に残った一枝の未閉包」である。API通信、provider応答、正式成果物の内容による失敗ではない。

## 4. 実装の到達点

v004 §10の第1手と、第2手の途中まで進んだ。

| 工程 | 状態 | 証拠 |
|---|---|---|
| 正本・開始SHA再照合 | 完了 | v004、S/A 4 pathが承認時SHAと一致 |
| DECISIONSへのv004承認記録 | 完了 | v004 SHA、17 path、48 code、488 proof、実装範囲を記録 |
| atomic JavaScript入口 #15 | 部分実装、未検査 | SHA `7dac5ada527c2f73b08c385a119e921c1e3777054b99c5679175a1b8b00e41c6` |
| native source #16 | 部分実装、compile成功 | SHA `6c237ceac499a83db74324165d630e14857a86165267cdbbc88c46b92c01150c` |
| Darwin arm64実行体 #17 | 固定commandで製造、未機能検査 | SHA `15f73dcf286ebed88300bb7ad8366f2b31631288816ceb4c9edd3f509d71e02c`、Mach-O arm64、mode `0555` |
| 隔離再build byte一致 | 未実施 | 契約未閉包検出後に進めていない |
| APFS成功・late collision実発火 | 未実施 | 同上 |
| S/A production・test変更 | 0件 | 停止時4 SHAを維持 |
| S/A正式attempt | 0回 | TAP新規生成なし |
| L/P/R/F/U | 未作成 | v004開始時と同じ |

#15〜#17は完了実装とは扱わない。現状byteとSHAを停止証拠として保持し、次の裁定なしに追記・削除・正式job束縛を行わない。

## 5. 修正方向の比較

| 案 | 修正方向 | code意味 | 数量・証明への影響 | 判定 |
|---|---|---|---|---|
| A | API key不存在専用の外側codeを新設し、HTTP 0回の実行環境fatalとして所有させる | transport codeの純化を維持できる | code件数・owner/実発火表・proof置換の版付き追補が必要 | **推奨** |
| B | `CUE_PROVIDER_TRANSPORT_FAILED`の意味を、HTTP開始前の認証情報不存在まで再び広げる | v004 §6.3の純化を一部撤回する | 数量変更は小さいが、今回の設計目的と衝突 | 非推奨 |
| C | `CUE_B6_JOB_INVALID`または`CUE_B6_INPUT_REREAD_FAILED`へ寄せる | 有効jobをjob不正と呼ぶ、または認証情報をfile再読失敗と呼ぶ | status/stage/codeの意味が事実と一致しない | 不採用 |

案Aの場合も、code名、挿入順、CLI stage、failure reportのinner code、owner検査、proof件数を本報告だけで仮置きしない。版付き最小追補で値レベル閉包してから実装を再開する。

## 6. 停止判断

追補v004 §11は、48 codeのownerが一件でも閉じない場合、および新たな契約解釈が必要な場合に、同attemptで直さず停止するよう定めている。本件は両方に該当する。

よって、atomic実体の機能検査、S→A→L→P→R→F→U、正式46件、回帰、API通信、描画へ進まない。既存正式成果物・stable tagは変更していない。

## 7. 次の裁定依頼

推奨案Aを採る場合は、「API key不存在をHTTP 0回の独立fatalとして所有する最小追補」の起草承認が必要である。追補提示後に、#15〜#17の部分実装を保持して続行するか、SHA証拠を残して再作成するかも同時に固定する。
