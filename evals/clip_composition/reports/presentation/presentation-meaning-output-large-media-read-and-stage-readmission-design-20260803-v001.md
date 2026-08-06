# 大容量媒体読取修正・工程再入場v002 設計v001

- 日付: 2026-08-03
- 対象: 意味／表現分離の初回実データrun、timeline-decision工程
- 実行入力記録SHA-256: `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680`
- 本文書の範囲: 読み取り診断、限定修正設計、同じ実行入力記録で再開するための最小契約改訂
- 本文書で行わないこと: 実装、検査再実行、正式job再作成、API通信、B5/B6、描画、既存成果物変更

## 1. 結論

大容量媒体の読取欠陥そのものは、既存の違反code集合を変えずに修正できる。

- 正式媒体のSHA不一致は、既存の`SOURCE_MEDIA_BINDING_MISMATCH`で拒否する。
- source identityやretained sourceの内容不正は、既存の`SOURCE_IDENTITY_INVALID`で拒否する。
- `ERR_FS_FILE_TOO_LARGE`、open/read/close失敗、読取中の実体変化など、内容を観測しきれないI/O・資源失敗は、違反codeを付けず`fatal`、終了code 2とする。
- 既存9違反codeの名称、順序、意味は変えない。

ただし、修正後に同じ実行入力記録から再開するには契約改訂が必要である。既発行の第1工程入場receiptが旧timeline jobを束縛しており、現行v001は同じ工程のreceiptを再発行できない。

したがって、実装へ進む前に次の二つを一組で承認する必要がある。

1. 既存streaming hash処理を唯一の正本として共用する限定修正。
2. 同じ実行入力記録を保ったまま、新しいjobを版付きで再入場させる工程入場v002。

## 2. 事実

### 2.1 媒体と停止原因

| 観測 | 値 |
|---|---|
| 正式元媒体 | `evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4` |
| byte数 | `3,288,164,785` |
| 記録SHA-256 | `8359f59d8c205fb815c9165f5a464ec4bb9f109f9d91384b80e571410dc2fa25` |
| streamingで実測したSHA-256 | 記録値と一致 |
| 現行読取 | 同一FileHandleの`readFile()`で媒体全体を一つのBufferへする |
| 内側失敗 | Node.js `ERR_FS_FILE_TOO_LARGE` |
| 現行の外側報告 | `SOURCE_IDENTITY_INVALID`、終了code 1 |

source identity、STT、retained source atomの小さい来歴ファイルも記録SHAと一致している。入力内容の不正は観測されていない。

### 2.2 既存streaming hash正本

`run_presentation_output_base_media_job_v001.mjs`の既存処理は、次を全て行う。

1. 非symlinkの通常fileか確認する。
2. hard link数が1であることを確認する。
3. realpathが期待pathと一致することを確認する。
4. 同じFileHandleから1 MiBずつ読み、SHA-256を更新する。
5. 読取前後のdevice、inode、size、mtime、ctime、link数が一致することを確認する。
6. close後にもpath実体が同じであることを確認する。

この安全条件はtimelineの現行安定読取と一致する。新しいchunk算法を作る必要はない。

`presentation_first_real_data_gate_v001.mjs`にもstreaming読取入口があるが、workspace rootがmodule内で固定され、timeline検査の一時workspaceを受けられない。またhard link数1の条件も現在のtimelineと同じ形では固定していないため、そのままの差し替えには使わない。

### 2.3 現在の入場receipt

| 成果物 | 束縛値 |
|---|---|
| timeline実装の旧SHA | `d113c3ffd683353e08d8de070eaa9ba33e0b61f5cc3ede698bd483f9ec274c1e` |
| timeline job SHA | `e53de3623e89fe90a1e8ab8396e8a9a4dddadc30de8367ceaf5f0dff45c3b6dc` |
| 既存receipt | `.../admissions/01-timeline-decision/stage-admission-receipt.json` |

現行v001はreceipt出力先を実行入力記録と工程名だけから決め、`oneShot=true`、`allowOverwrite=false`、no-replace公開を要求する。別job IDを作っても出力先は同じである。

timeline実装を修正するとjob内のlive実装SHAも更新が必要になるため、既存receiptは新jobの入場証明として流用できない。既存receiptの上書きも契約違反である。

## 3. 帰属

### 事実

- production欠陥1: 媒体SHA検査が大容量媒体を一括読取する。
- production欠陥2: 内容を観測できなかった資源失敗を、内容不正として報告する。
- 契約欠陥1: 既に入場済みだが成果物生成前に停止した工程を、同じ実行入力記録のまま再入場させる版付き経路がない。

### 推測

- なし。

### 未確認

- 修正後の正式媒体読取が合格するかは、実装後の新attemptまで未確認である。
- B5以降の結果は未確認である。API通信はまだ0回である。

## 4. 大容量読取の限定修正

### 4.1 共用の向き

既存の安定streaming hash処理を、現在それを持つ基礎映像runnerからtimeline coreへbyte同義で移す。基礎映像runnerはtimeline coreから同じ関数をimportして使う。

この向きにすると、既に存在する依存方向を維持でき、循環importを作らない。timeline jobが既に束縛するtimeline core内に処理が収まるため、timeline jobの実装束縛2件を増やさない。

公開する純粋な読取入口は次の意味を持つ。

```text
入力: workspace rootとworkspace内の相対file path
出力: SHA-256とbyte数
失敗: unsafe path、open/read/close、読取中の実体変化をthrow
```

新しいhash算法、別buffer実装、外部command呼出しは作らない。

### 4.2 timelineでの利用箇所

- source mediaの最初のSHA照合。
- 正式成果物公開直前のsource media再照合。

JSON本文が必要な小さい入力は、現行の安定Buffer読取を維持する。媒体だけをstreaming SHA観測へ分ける。

追跡対象には読取方式を内部情報として持たせ、公開直前再照合でも媒体をBuffer化しない。同じ媒体について初回と再読の両方をstreaming正本へ通す。

### 4.3 失敗帰属

| 状態 | 正式な扱い |
|---|---|
| SHAの計算完了後、宣言SHAと不一致 | `SOURCE_MEDIA_BINDING_MISMATCH`、終了1 |
| source identity JSONのshape・参照関係が不正 | `SOURCE_IDENTITY_INVALID`、終了1 |
| open/read/close失敗、資源不足、読取中の実体変化 | `fatal`、違反0件、終了2 |
| 公開処理の失敗 | 現行どおり`MEANING_PUBLICATION_FAILED` |

現行CLIのfatal外形`{"status":"fatal","violations":[]}`は変えない。内側stageの正式schema追加は、登録済みのfatal観測性改訂と同じ別課題であり、本修正へ混ぜない。本attemptではTAPと完了・停止報告で`source-media-read`段階を記録する。

## 5. 工程入場v002

### 5.1 目的

実行入力記録のbyteとSHAを変えず、修正後の新jobを新しいreceiptへ束縛する。既存v001 receiptは停止attemptの証拠として不変保持する。

### 5.2 forward-only方式

- 新schemaは`presentation-meaning-output-stage-admission-job-v002`と`presentation-meaning-output-stage-admission-receipt-v002`。
- v001からの変換、fallback、既存receiptの上書きは行わない。
- 本runでこれ以後に作る10工程の入場証拠はv002だけを使う。
- 既存v001 receiptはv002のselected receipt集合へ混ぜない。

### 5.3 attempt

v002 jobはv001の10 keyへ`attempt`を加えたexact 11 key、v002 receiptはv001の8 keyへ`attempt`を加えたexact 9 keyとする。どちらの`attempt`も次のexact objectである。

```json
{
  "attemptOrdinal": 1,
  "supersedesReceipt": null
}
```

- `attemptOrdinal`は1以上の安全な整数。
- attempt 1は`supersedesReceipt=null`。
- attempt 2以降は、同じ実行入力記録・同じ工程の直前v002 receiptを4項目JSON bindingで束縛する。
- 今回のtimeline再入場はv002としてのattempt 1である。既存v001 receiptとの暗黙変換や連番共有をしない。

出力先は次へ固定する。

```text
<record root>/admissions-v002/<2桁工程番号>-<工程名>/attempt-<4桁番号>/stage-admission-receipt.json
```

今回の第1工程は`.../admissions-v002/01-timeline-decision/attempt-0001/`である。

### 5.4 receiptの保証

v002 receiptは次だけを保証する。

- v001実行入力記録の同じSHAを読んだ。
- 新timeline jobのbyte SHAとcanonical SHAを読んだ。
- jobが担当するsource、区間、上流bindingが実行入力記録と一致した。
- 入場検査の開始時と公開直前で、record、job、上流入力、実装bindingが変わっていない。
- receipt出力先が未使用で、上書きなしで公開された。

過去の失敗原因が修正されたことはreceiptだけでは保証しない。それは正式検査と新timeline attemptが証明する。

### 5.5 receipt集合

v002の全工程receipt集合は、各工程について選択されたv002 receiptを1件だけ受け、次を検査する。

- 工程が固定10件・固定順である。
- 全件が同じv001実行入力記録SHAを束縛する。
- attempt 2以降のreceiptは、生成時に直前attemptのreceipt byteとbindingが一致したことを検査済みである。
- v001 receipt、異なるrecord、異なる工程のreceiptを受理しない。

## 6. 変更file上限

実装変更は最大7 fileとする。

| file | 変更 |
|---|---|
| `presentation_timeline_composition_decision_v001.mjs` | 既存streaming処理の移設先、媒体初回・再読、fatal帰属 |
| `run_presentation_output_base_media_job_v001.mjs` | local処理を削除しtimeline coreの同一処理を使用 |
| `presentation_meaning_output_run_input_record_v001.mjs` | v002 job・receipt・attempt・receipt集合の純粋契約 |
| `run_presentation_meaning_output_run_input_record_v001.mjs` | v002入場の安定読取とno-replace公開 |
| `presentation_meaning_information_package_v001.test.mjs` | timeline実経路の媒体照合・帰属検査 |
| `presentation_output_base_media_v001.test.mjs` | 共用後も基礎映像側の結果が変わらない検査 |
| `presentation_meaning_output_run_input_record_v001.test.mjs` | v002 attempt・path・束縛・no fallback検査 |

8 file目、新しいhash reader、既存正式成果物の変更が必要になった場合は停止する。

## 7. 検査

### 7.1 大容量読取

1. 同じfileを移設前後の正本で読み、SHAとbyte数が一致する。
2. 正しい媒体SHAは合格する。
3. 読取完了後のSHA不一致は`SOURCE_MEDIA_BINDING_MISMATCH`になる。
4. source identity内容不正は`SOURCE_IDENTITY_INVALID`になる。
5. `ERR_FS_FILE_TOO_LARGE`を含む資源失敗分類は`fatal`、違反0件、終了2になる。
6. symlink、hard link、読取中の実体変化は内容不正へ変換されずfatalになる。
7. 公開直前再読も媒体を一括Buffer化しない。
8. 既存9 codeのexport集合と固定順が完全一致する。
9. 基礎映像側の既存処理結果projectionが共用前後でbyte一致する。

3 GBの合成fixtureは作らない。正式3.29 GB媒体を正式timeline新attemptで一度読み、記録SHAとの一致と成果物生成を確認する。

### 7.2 工程入場v002

1. exact schema以外を拒否する。
2. attempt 1とnullの組合せを受理する。
3. attempt 2以降で直前v002 receipt bindingが無い場合を拒否する。
4. attempt番号、path、receipt IDの不一致を拒否する。
5. record SHA、job SHA、工程、上流値の不一致を既存codeで拒否する。
6. 既存出力先と上書きを拒否する。
7. v001 receiptをv002として受理・変換しない。
8. 10工程のselected receipt集合とattempt chainを固定順で検査する。
9. 同一入力のreceipt byteが決定的に一致する。

### 7.3 実行順

1. 関連検査を新attemptとして実行し、TAP全文と全ID結果を版付き保存する。
2. 不合格が1件でもあれば同attemptで直さず停止する。
3. 合格時のみ既存gate `287/287`を実行する。
4. 既知baseline `64/181`不変を確認する。
5. 既存横型2本・縦型1本のtree SHAを照合する。
6. 同じ実行入力記録SHAを束縛するv002 timeline jobと入場receiptを新規公開する。
7. 正式timelineを1回実行する。旧job、旧receipt、旧停止記録は不変保持する。
8. timeline合格後だけ、既発効のB5最大2回、B6一回、US$0.50上限、二形式描画・QCへ進む。

## 8. 人間作業と費用

- 今ここで必要な人間判断: 本設計の承認1件。
- 固定5項目の再確認: 0件。
- cropの再認定: 0件。
- API通信: 実装・検査中は0回。
- 実データ再開後: 既承認どおりcountTokens最大2回、generateContent 1回、総支出上限US$0.50。
- 次の人間作業: 成功時の完成動画2本の目視だけ。

## 9. 停止条件

- 既存9違反codeの追加・名称変更・順序変更が必要になる。
- 8 file目が必要になる。
- streaming hashを別実装として複製する必要が出る。
- v001 receiptの上書き、変換、fallbackが必要になる。
- 同じ実行入力記録SHAを維持できない。
- 正式媒体、固定5項目、既存3本の成果物にbyte差が出る。
- 検査が1件でも不合格になる。
- B5見積りがUS$0.50を超える、通信失敗、回答不受理、物理検査不合格、QC不合格になる。

## 10. 承認依頼文

> 大容量媒体読取修正・工程再入場v002設計v001を承認する。既存基礎映像runnerの安定streaming hash処理をtimeline coreへ移して唯一の正本とし、基礎映像runnerとtimelineの媒体初回・公開直前再照合が同じ処理を使う。既存9違反codeは不変とし、媒体SHA不一致は`SOURCE_MEDIA_BINDING_MISMATCH`、source identity内容不正は`SOURCE_IDENTITY_INVALID`、I/O・資源・読取中実体変化は違反0件のfatal・終了2へ帰属させる。工程入場v002は、既存v001 receiptを不変保持し、同じ実行入力記録SHAのまま版付きattempt rootへ新job receiptをno-replace公開するforward-only契約とする。最大7 fileの限定実装、関連検査TAP、既存gate 287/287、baseline 64/181不変、既存3本tree SHA照合までを承認する。全合格時は同じ実行入力記録からtimelineを一回実行し、合格後だけ既発効のB5最大2回・B6一回・US$0.50上限・横型／縦型描画QCまで連続して完成報告で停止する。不合格一件、code改訂、8 file目、reader複製、既存成果物差が出た場合は同attemptで直さず停止する。

## 11. 現在の停止点

契約改訂が必要と判明したため、実装、検査、job再作成、API通信には進んでいない。本設計の承認待ちで停止する。
