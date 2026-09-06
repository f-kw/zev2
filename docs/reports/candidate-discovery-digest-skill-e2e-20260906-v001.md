# 候補探索Skillからダイジェスト実動画へのE2E

## 現在地と着工根拠

2026-09-06「ZEV進行管理２」経由のkawafmm承認済み続行指示に基づく。目的は、既存素材の確定発話列から候補探索Skillが新しく見どころを提案し、固定planと決定的executorが検査・採用し、既存字幕Skill・Core・実動画・technical QCへ通すこと。調査で完了にせず、接続上の判断を解決して同じ着工範囲で第一完成まで続行する。

第2 Skillは `44db92f52caaf96aca85216f510dcb29590ac831` で結果を正式記録・push済み。独立実装、表示Skillの無変更再利用、検査・昇格・Core接続、技術検査は成功。本文・字幕区切り・表示時刻・完成動画は同一で、今回素材での可視品質改善は確認できず。人間A/B比較を撤回し、HUMAN_DECISIONを残さず技術実証として閉じた。Driveの同一report・review・MANIFESTも更新し、取得byteとの一致を確認した。

ダイジェスト側は既存処理の現物調査と接続検査まで。新規Skill判断、採用、描画、品質合格をまだ主張しない。

## 再利用する既存処理と制約

| 対象 | 現物から確認した処理・制約 |
| --- | --- |
| `evals/clip_composition/prompts/theme_generation_prompt_v002.md` | 書き起こしから、導入・展開・反応・結論を持つ具体的な見どころを探し、根拠発話を示す既存の問い。今回もこの編集基準を包み、自由時刻を返す部分は使わず既存発話IDに限定する |
| `runner/src/steps/theme-options.ts` | 書き起こしからの決定的な先頭抽出は存在するが、新しい意味判断の代用にはならない |
| `runner/src/distant-connection-common-utterance-artifact-v001.ts` | 既存の発話集約、元本文・元発話ID・順序・時刻・SHAの検査を再利用できる。新しい集約係数を設けない |
| `runner/src/steps/composition.ts` | 選んだ発話IDから構成区間を解決する既存処理。Skillの自由時刻生成は不要 |
| `runner/src/distant-connection-edit-plan-projection-v001.ts` | 遠方接続の2場面と旧判断来歴に限定されるため、新しいダイジェスト判断をこの形式の過去判断と偽って接続しない |
| `runner/src/skills/caption-display-boundaries-v001.ts` | 採用後の確定本文から表示終端・行末を選ぶ既存Skillを無変更で呼び出せる。意味まとまりSkillは必要性がない限り呼ばない |
| `evals/clip_composition/presentation_instruction_artifact_v002.mjs` | 確定本文片の列から表示の正式注文書を作る既存Core。字幕の対象containerと全文被覆の対応を保持する必要がある |
| `evals/clip_composition/presentation_base_media_build_v003.mjs` | 現行の映像区間化、音声sample grid、mux、媒体検査、timeline QCを再利用できる。ただし公開job入口の採用記録は、具体的区間を含むpayloadのSHAに束縛した人間承認だけを受理する |
| `evals/clip_composition/run_presentation_output_base_media_job_v001.mjs` | 専用の入力検査の後で既存の映像・音声製造関数を呼ぶ構成は既にある。ただし旧意味境界・保持atomの来歴に束縛されており、今回の新しい候補判断を旧B5/B6の検査証拠として流用できない |
| `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs` | 承認範囲内の機械記録という区分が存在する。これを具体的区間の人間確認済みと同一視しない |

素材候補は既存の `ymUsGrT6EaA`。元動画は `evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4`。確定書き起こしは `evals/clip_composition/stt/ymUsGrT6EaA_local30_v001/source/transcript.json`、SHA-256は `28938e70d267c617a50568f2782c541c9d6814eda7537349fefae1b45053960f`。既存の共通発話artifactは `evals/clip_composition/outputs/work-distant-connection-comparison-input-ymUsGrT6EaA-v001/common-utterance-artifact-v001.json` で、元の10,723本文片を431発話に束縛している。既に選ばれた2場面だけを入力にせず、この全確定発話列から新しく候補を判断する。動画解析をCodexで代行せず、今回の問いは許可された確定発話列の意味判断に限定する。

## GPT_DECISION：固定planの採用と既存Coreの接続

### 依頼する判断

今回の指示にある「固定plan / 決定的executorによる採用」と、architecture第4・9・10・11節の承認責務を、次の最小形で満たせるかを判断してほしい。特に、既存の個別区間人間承認形式を偽装せず、今回の事前許可に束縛した採用記録から既存Coreの製造関数を再利用する専用adapterが着工範囲に適合するかが判断点である。

### 推奨する最小形

1. 固定planは「内容上重要または見どころになる複数箇所を短いダイジェストにする」という承認済み要求、既存素材・確定発話列、候補探索と表示区切りSkill、API禁止、既存出力規約を固定する。候補ID・採用区間を事前に埋めない。独自の候補数上限、尺上限、係数を設けず、今回許可された構成条件を使用する。
2. 候補探索Skillは現Codexのローカル新規判断で、既存の発話IDによる見どころの根拠と、必要な文脈を含む連続発話範囲を提案する。時刻、最終順、採用済み印、renderer値を返さない。
3. 独立validatorはID存在・素材所属・順序・区間被覆・根拠包含・重複/重なりなしを検査する。固定planの構成条件を満たす検査済み候補をexecutorが採用し、元素材順に並べる。必要な前後範囲は提案された文脈ID列を検査して決定し、時刻は元発話の正式位置からのみ解決する。候補数は採用集合の件数、最終尺は正式区間と既存frame投影から決まる。Skill resultを直接正式値にしない。
4. 採用正本は、今回の事前許可・固定plan・入力・新規Skill result・検査結果へSHAで束縛した機械による昇格として記録する。人間が具体的候補を目視済み、個別区間payloadを承認済みとは記録しない。意味の妥当性をvalidatorが合格にしたとも主張しない。
5. 専用adapterはこの採用正本と正式区間を厳格に検査してから、現行v003の既存映像区間化・音声配置・mux・媒体/timeline QCを呼ぶ。旧入口の人間承認validatorは変更しない。旧承認形式の偽造や旧B5/B6の来歴偽装をしない。もしこの新しい入力接続自体が契約変更に当たり着工範囲外なら、代案を勝手に実装せず、この一点を明示してほしい。
6. 採用した本文片・発話ID・timelineの対応を保持した字幕入力を作り、表示区切りSkillを無変更で実呼出しする。既存の正式時刻投影・注文書・renderer admission・実レイアウト・描画・technical QCを通す。必要なschema対応を偽装せず、接続が閉じないときは原因を検査する。
7. 採用範囲・元動画SHA・編集仕様・基礎映像・字幕・完成動画を一つの来歴記録で追跡し、候補の選択が実際の映像内容に反映されたことを検証する。比較のための無意味な別動画は作らない。人間には完成したダイジェストの見どころ妥当性、不要部分、文脈不足、全体の見やすさだけを依頼する。

第1層事項を相談役承認で変更してよいかを求めるものではない。今回の明示的着工指示と現行architectureの範囲内で上記接続が成立するかを先にGPT_DECISIONとする。通常の実装・test・renderer配線修正は、回答後も同じ着工範囲で自律的に進める。

## 現時点の検証

- 既存の共通発話validatorを実際の書き起こしbyteへ適用し、431発話・10,723本文片のID、順序、本文、正式時刻、元書き起こしSHA、決定的再構築との一致を確認した。
- 第2 Skillの既存executorによる由来・正式値再現・完成動画SHA再照合は合格。実行当時のmanifestにある未判定欄は履歴として保持し、現在のHUMAN_DECISIONと扱わない。
- 現行v003の採用記録validatorを描画なしで直接呼び、機械記録区分を与えると承認不適合だけで拒否されることを確認した。これは期待どおりの契約拒否であり、緩和する根拠にしない。合成検査payloadはメモリ上のみで、承認recordや成果物として保存・実行していない。
- 第3 Skillの実装・新規判断・実動画・technical QCは未実行。今回のcheckpointは第2 Skill終了とダイジェスト接続判断の現物を固定するための監査資料であり、第一完成ではない。
- API、新provider、新素材、Goal/DECISIONS変更、第4 Skill、renderer/style規約変更は0件。作業開始前からの別作業13pathを変更・commit対象にしない。
