# candidate 13 B6 案B2 実装前確認 停止報告

- 日付: 2026-07-27
- 対象: B1受入・B4表示計画におけるpackage中核fileの実行依存
- 結果: 案B2の明示停止条件に該当
- コード変更: 0件
- package生成・複製: 0件
- API通信: 0回
- 追加費用: US$0

## 結論

B1とB4は、package生成時のSHAを記録として読むだけではない。現在の
`evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs`
を実行時に静的importし、同file内の処理を実際に使っている。

生成・公開を行う関数そのものは呼ばないが、厳密JSON復号、正式直列化、正規化、SHA計算、値検査をlive dependencyとして呼ぶ。このため、現在fileのSHA照合を外して生成時SHA `db3b596…` だけにすると、B1が実際に使う現在の処理を束縛しない状態になる。

kawafmmが指定した「実行時にimport・実行している場合は安全でないため報告して停止」に該当する。したがって、契約改訂案は起草せず、B6も実走しない。

## 事実

### B1

- B1 runnerはpackage中核fileから、厳密JSON復号、正式直列化、正規化、SHA計算をimportしている。
  - `run_presentation_caption_semantic_output_check_v001.mjs:15-20`
- その関数をjob、package manifest、package検査報告、Gemini回答の復号と、報告の直列化・SHA計算に使用する。
  - 同file `:72-82`, `:600-613`, `:803`, `:905`
- B1 coreも同じpackage中核fileをimportし、値検査と復号・直列化・正規化・SHA計算に使用する。
  - `presentation_caption_semantic_output_v001.mjs:1-8`
- B1は現在実行するpackage中核fileをdirect implementationの1つとして扱い、現物SHAとjob束縛を照合し、import graphも検査する。
  - 同file `:104-108`, `:3108-3124`
- B1には別途、package manifestに保存された生成時package中核SHAと、B1 jobのlive package中核SHAを同一と要求する箇所がある。
  - 同file `:2413-2425`

### B4

- B4 runnerは同じpackage中核fileを静的importし、復号・正式直列化・正規化・SHA計算を実際に使う。
  - `run_presentation_caption_display_pair_job_v001.mjs:40-46`, `:102-123`
- B4 coreも同fileを静的importし、値検査・復号・直列化・正規化・SHA計算を使う。
  - `presentation_caption_display_pair_v003.mjs:1-7`, `:247-270`
- B4 jobはこのfileを`sharedJsonContractCore`として現在SHAへ束縛する。
  - `caption-display-pair-static-preflight-jobs/DmWu0jVQfTE-candidate-13-caption-display-pair-b4-v003.json:81-85`
- 正式B4 runnerはjobに列挙された実装fileを読み、各現物SHAをjobのSHAと照合する。
  - `run_presentation_caption_display_pair_job_v001.mjs:463-479`

### 二つのSHAの意味

| SHA | 意味 |
|---|---|
| `db3b5968207479d8f6849c9995224140b8286844ed1c17b1e75c89ac718bf224` | B3正式package v001を生成した時点のpackage中核file |
| `c81ef4b9829d8bc3d5bc84a048eaae6886caec90cbb77b1635af916512cdd1b6` | B1/B4が現在importして使うpackage中核file |

前者は生成来歴を証明する。後者は、B1/B4が今この実行で使う処理を証明する。役割は同じではない。

## なぜ削除できないか

案B2のまま現在file SHA要求だけを削除すると、B1は`c81ef4b…`の処理を実行するのに、契約上は`db3b596…`の生成来歴だけを確認する状態になる。

package内容側のSHA検査を維持しても、回答を復号・正規化・採点するlive処理の差し替え検知は失われる。したがって「生成来歴照合が残るから改竄検知を失わない」とは言えない。

## 維持されたもの

- B3正式package v001: 不変
- B5固定request SHA-256:
  `7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2`
- B5成果物: 不変
- package v002: 作成しない
- 再束縛処理: 作成しない
- B1/B4契約・実装: 変更なし
- Gemini生成: 0回

## 推測

なし。static importと実際の関数呼出をコード上で確認した。

## 未確認

Gemini回答とB1/B4の実データ結果は未確認である。B6を実走していないため、回答内容・usage・費用も存在しない。

## 現在地

案B2は実装前条件を満たさなかったため打ち切る。同一箇所で3回目を掘らない裁定に従い、別のpatchや契約緩和は提案せず、計画をkawafmmへ戻す。

今回必要だった人間作業は、既に受領した案B2裁定1件だけ。追加確認作業は0件。
