# A-v002 proof観測装備 attempt-0003 診断・停止報告 v001

## 1. 結論

proof runner専用の最小観測装備は目的どおり働き、前回は`UNCLASSIFIED`だけだったfatalを、**開始時の入力再読における固定TSX実体の読取拒否**まで確定した。

原因は、固定TSXの登録pathが親directoryのsymlinkを含む論理pathである一方、proof runnerが「path文字列そのものが実体pathでなければ拒否する」workspace向けの安定読取処理を、そのままruntime実体にも使ったことにある。固定TSXの内容とSHAは正常である。

帰属は三分法のうち**実装欠陥**。fixture・job設営欠陥ではなく、契約矛盾でもない。

修正は契約を変えず、既存の`realpath`と既存のstreaming hashを使って、論理pathが指す実体を前後二回照合した上で実体を読む形に限定できる。ただし、この修正でrunner SHAが再び変わるため、失敗したv002 jobを保持したまま再実行するにはv003 jobという4 path目が必要になる。現在の上限は3 pathなので、実装せず停止した。

## 2. 事実

### 2.1 旧証拠の不可侵

| 対象 | SHA-256 | 結果 |
|---|---|---|
| 旧job v001 | `a07944411b08b72702c1d60b3792ceed7387f61f40d099f7eb7909b812a00e86` | 不変 |
| 初回fatal stdout | `1b19a0d01ff0fcce576e13bdfd547e857d987a671103fcd523ea49f7f07c87ba` | 不変 |
| 初回実行記録 | `184bdcdbb6c4dcc34ffcd0d9ada2427714883cff5727c86daa4fa847b0c85f6e` | 不変 |

旧jobと初回fatal証拠は上書き・削除していない。

### 2.2 観測装備と新job

- proof runner SHA-256: `ee0110e0be61996ace7c59f119f16b4b3354cef0e297ed0ea251c8d0b821cb12`
- 同test SHA-256: `a944a91ee40d1f83ed643d27342377e189f50fb5b4c710eeffaca941633c76bb`
- 局所検査: 10/10合格
- TAP SHA-256: `3a5dabf75cfbec7b930bd645f1980a74df03c7b628f21f65334106c7e52f5788`
- 新job v002 SHA-256: `b5c6b148431724a898d06e09aebdd2dc985aced8fcdc9a838c5dfa15d6633eee`
- 新旧jobはともに7,260 byteで、差分は`proof-runner`のSHA 1欄だけ。
- 新jobは正式serializerとbyte一致。
- 共通fatal schema、正常結果、検査済み拒否の結果形、既存計算は変更していない。

### 2.3 正式attempt

| 項目 | 観測 |
|---|---|
| attempt | `attempt-0003` |
| 実行回数 | 1回 |
| 終了code | 2 |
| stderr | 0 byte |
| stdout | 831 byte / SHA-256 `019d518d68e1cbdfc695deed237a04890c35f9697da4c15f5b007609bce785d2` |
| 共通観測 | `unknown / UNCLASSIFIED / target null`（従来どおり） |
| 呼出側段階 | `start-input-reread` |
| 開始時再読の内訳 | `runtime-binary` |
| 例外型 | `file-read` |
| 対象 | `/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs` |
| 対象SHA | `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8` |

checkpointは、依存初期化の入場・完了、開始時再読の入場まで記録され、開始時再読の完了は記録されていない。したがって、依存初期化ではなく開始時再読の途中で止まった。

正式proof出力rootは未使用のままで、六本の動画生成には入っていない。API通信0回、費用US$0。

## 3. 内側原因

固定TSXの論理pathは通常fileとして読め、内容SHAも登録値と一致する。一方、実体pathは次である。

`/Users/kawafmm/workspace/zev2/node_modules/.pnpm/tsx@4.22.3/node_modules/tsx/dist/cli.mjs`

proof runnerが呼ぶ既存の安定読取処理は、対象自身がsymlinkでないことだけでなく、`realpath(対象) === 対象path`も必須とする。このため、親directoryのsymlinkを通る固定TSX論理pathは内容をhashする前に拒否される。対象pathを同じ既存読取処理へ単独で渡す読み取り診断でも拒否を再現した。

この処理はworkspace内の正式成果物について差し替え窓を閉じる正本であり、その規則自体は正しい。誤りは、論理pathを正式に持ち得るruntime profileへ、用途を分けず直接適用したproof runner側にある。

## 4. 三分法

| 帰属候補 | 判定 | 根拠 |
|---|---|---|
| 実装が契約に届いていない | **該当** | runtimeの論理pathを実体へ解決せず、workspace成果物用の「論理path=実体path」条件へ直接渡した |
| job・fixture・設営の欠陥 | 非該当 | runtime profileのpath・SHAは既存正式登録値で、実体SHAも一致する。固定Node・固定TSX loader・NODE_OPTIONS不存在・native・Chromium起動可能も記録済み |
| 契約矛盾 | 非該当 | runtime bindingの論理pathと内容SHAを保持したまま、既存の実体解決とstable hashだけで検査可能 |

## 5. 修正候補

| 案 | 修正内容 | 契約影響 | 安全性 | path影響 | 判定 |
|---|---|---|---|---|---|
| A | proof runnerでruntime論理pathを実行前後に`realpath`し、両者一致を確認した上で、その実体を既存streaming hashへ渡す | なし | 論理pathのすり替えと実体byte差を両方拒否 | runner・test更新に加え、失敗v002を保持するv003 jobが必要 | **推奨** |
| B | 正式runtime profileのTSX pathを実体pathへ改訂 | 正式台帳・参照群へ影響 | 広い再束縛が必要 | 3 pathを大きく超える | 不採用 |
| C | 共通streaming hashをsymlink親許容へ緩和 | 多数工程へ影響 | workspace成果物の保護規則を弱める | 共通正本と全利用者へ波及 | 不採用 |

案Aは新しい読取計算を作らない。既存`realpath`と既存streaming hashだけを使い、前後の実体path一致を追加する。

## 6. 保証境界

- 今回の正式attemptは、開始時再読の`runtime-binary`について、実経路・対象path・SHAの伝播を証明した。
- proof runner先頭の静的importはCLI本体の開始前に評価されるため、その失敗は本局所観測の保証外である。
- 開始時再読の他5内訳は実装上の接続と閉語彙を確認したが、各失敗枝を正式attemptで全発火したとは主張しない。
- 生の例外文、stack、stderr、字幕本文、secretは観測成果物へ保存していない。

## 7. 教訓

live束縛による旧job拒否は正しく機能した。**観測装備の追加は実行者SHAを変えるため、診断用再実行には新しい正式jobが必要である。** live束縛を弱めたり例外扱いしたりしてはならない。

同じ理由で、今回の軽微修正後にも新しいrunner SHAを束縛したjobが必要になる。既に実行したv002 jobを上書きして失敗来歴を消すことはしない。

## 8. 停止理由と承認依頼

現在の変更上限は、runner・同test・新job v002の3 pathである。案Aを実装し、v002を失敗証拠として保持して再attemptするには、v003 jobという4 path目が必要になる。

次を承認対象として提示する。

1. path上限を3から4へ改訂する。
2. runnerと同testを案Aだけに限定して更新する。
3. v002 jobとattempt-0003証拠を不変保持する。
4. runnerの新SHAだけを差し替えたv003 jobを正式serializerで追加する。
5. 局所検査合格後、v003 jobで正式attemptを1回実行する。
6. 合格時だけ六本描画、QC、確認ページ、完成報告へ進む。fatal・拒否・QC不合格なら保存して停止する。

通信0・費用US$0、人間目視前tag禁止、O1自動接続予約は維持する。
