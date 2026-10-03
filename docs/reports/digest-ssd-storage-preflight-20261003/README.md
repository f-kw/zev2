# Digest一件製造 — SSD保存先の確認と停止結果

保存先をSSDへ変えるだけでは、保護を保った正式製造は成立しない。今回の候補5pathに加えてCoreの保存先配線が必要であり、現在のExFAT SSDでは正式保存に必要なhard linkと読取専用保護が成立しなかった。指示された範囲外修正の停止条件に従い、実装・候補trust・背景/音声/字幕画像/動画の製造を始めず、最小変更案を返す。

## 受領範囲と開始状態

ユーザーの2026-10-03 06:33:44 UTC「OK 必要な作業をしてくれ」を根拠に、mona側から今回一件の実行指示を受領。途中ファイルを含むSSD保存が小さな限定修正で成立するか確認し、成立した場合だけ保存済み15:23計画のNormal一本を正式製造/QCする範囲である。保存先対応で候補4technical＋監視以外への修正が必要なら箇所・理由・最小差分を示して停止する。旧相談役CUA往復、外部Codex2への送信、新素材/STT/API費用/演出追加/公開/旧成果削除は含まない。

- 開始branch main、HEAD `019e98076eef6b27be6aff5110ec0c5d8e5096c1`、staged/tracked/untracked変更なし。
- GitHub最新mainを再取得し `745c81c1d66312af0138b0e0b4362a590622ccab` を確認。origin/mainとの差分は6件の運用文書だけ。他者変更を保持してff同期、branch/worktree/reset/stashなし。
- 既存「Codex2」は開始時の正式task読取でidle。他のzev2 taskはnotLoadedでactive表示なし。製造worker/ffmpegはprocess読取で観測なし。旧Codex2のCUA常駐processは存在し、他者processとして保持した。
- AGENTS、固定入口、同SHA HANDOVER、CURRENT_GOAL、FORMAL_HANDOFF_DECISION/PLAN、関連README、cleanup/work-log policyを読んだ。`.agents/skills`は存在せず、既存月別session logも0件。メモリによる代替判断なし。
- 保存候補のmanifest/correspondence/traces/readbackの実bytes SHAは正本の4値と一致（06:41:18 UTC）。元ID/本文/時計/9trace/正常ownerを変更・再判断していない。

## SSDの実確認

2026-10-03 06:37 UTC読取：`/Volumes/KIOXIA`、`/dev/disk4s2`、ExFAT、volume UUID `0E5DC84B-1E22-3C9B-9E3B-220EBA8607C1`。小probeのdeviceは16777238、開始空き2,000,300,277,760bytes。内蔵repoの06:44:14 UTC空きは12,763,258,880bytes、device16777234。両deviceを合算していない。

06:43:44 UTCに今回専用の新規directoryで4096byteのみを試験。既存SSD内容は走査/移動/変更していない。媒体や製造用の偽receiptではない。

| 操作 | 実結果 |
|---|---|
| 保存・fsync・再読・SHA | 一致 |
| exclusive createで既存fileを拒否 | 成功 |
| 同directory rename後再読 | 一致。no-replace原子的publicationの証明ではない |
| chmod 0444後のread | 一致 |
| chmod 0444でwrite-openを拒否 | 不成立。実mode 0700でwrite-openが成功 |
| hard link | 失敗、ENOTSUP/errno45 |
| 自作probe cleanup | エラー0、専用directory残存なし |

この小試験は持続速度、全工程のSSD保存、実glyph、媒体QCを保証しない。snapshot/grid/PCM/背景/PNG/QC/JSONを正式経路で作って再読する試験は未実施。現在の保護/publication不成立を先に止めた。06:44:14 UTCのSSD空きは2,000,299,753,472bytes。probe直後のfreeは開始と同値だが、後のfilesystem管理領域変動を論理4096byte回収量へ換算しない。

## 保存先対応の最小差分案（未実装）

全域ROOT差替え、一般trust/root/default変更、拒否からのfallback、symlinkを使わない。元入力/font/code/Gitはrepo、今回生成prefixだけ固定SSD領域へ解決する計画専用storage contextを新adapterで検証し、既存Coreとfile callerへ明示伝達する。計画manifest/実許可record/実装SHA/論理prefix/物理root/deviceを一致させる。別plan/root/device/SHA、path逸脱、欠落を拒否し、repoへの自動fallbackは設けない。

| path | 具体的な最小変更案 |
|---|---|
| **追加必須** `evals/clip_composition/adopted_media_manufacturing_v001.mts` | 54行abs、77–95行snapshot/work/video/PCM、110/156/169行publish、305行timeline再読、344–352行renderer/結果再読へ今回contextを伝える。入力/canonical code/Git参照はrepoに固定。buildAdoptedBaseMediaV001、assembleAdoptedCaptionCoreV001、renderer実行に生成先resolve/readBound/publishの限定注入が必要。 |
| 候補内新 `runner/src/digest-formal-handoff-v001.ts` | 本人指示/計画/manifest/実コード/root/deviceを検証して限定contextを作る。候補4bindingを保持し、出力prefixのみSSDに対応付ける。新製造recordは未作成。 |
| 候補内 `run_presentation_instruction_renderer_job_v002.ts` | 113–116行resolverと参照検査552–595/608–619、出力保存/再読288–309、receipt/layout368–415、描画入力435–452へ同contextを渡す。code/font/元入力のrootは変えない。 |
| 候補内 `render_presentation_v002.mjs` | 出力安全性75–76/293–362、予約/所有lock/親directory検査1354–1410/1564–1639を今回出力領域へ配線。scratch/staging2256–2264は出力親配下。子spawn189/239の固定TMPDIR `/private/tmp` は今回専用tempへ明示伝達する。 |
| 候補内 `original-resolution-low-memory-composite.mjs` | 旧固定17613frame/307状態/背景を今回明示frame/overlayRecordsへ接続。既存graph/有限分割/連続encoderを保持。 |
| 候補内 `original-resolution-full-supervisor-v002.py` | 今回出力deviceと監視deviceを一致させ、新計画permitで既存停止条件を使う。旧resumeを偽装しない。 |

したがって、最小でも候補の4technical＋監視1から**5technical＋監視1**へ広がる。共通 `run_candidate_discovery_digest_skill_e2e_v001.mts` のROOT/readBound/publishそのものを一般化する必要はない案だが、実装・型検査・正式再読をしていないので成立済みとはしない。

## ExFATで止まる具体的な箇所

`presentation_renderer_admission_receipt_v002.mjs:617–675` は同directoryのstagingをexclusive/no-followで保存後、650行で `link(stagingAbsolute, outputAbsolute)` を使う。これは正式admission記録の既存保存方式で、probeでhard link未対応を実確認した。単純renameへの置換では既存出力を上書きしない原子的保存と同じ保証にならず、一般fallbackは不可。

`adopted_media_manufacturing_v001.mts:80–83` はsnapshot copy後chmod0444とSHA確認をする。ExFAT probeではread-only保護が成立しなかった。copy後hashだけを保護代替として扱わない。

保護とhard linkの要件を満たす専用保存領域を具体化すれば、publisher自体を変えずに上記追加Core pathの限定配線を検討できる。現ExFATのまま進めるならpublisherとsnapshot保護の保存契約変更が別途必要で、今回範囲で実装しない。APFS等の領域、新disk imageやmountなどを採る場合も具体的scope/容量/監視を決める必要があり、format/image/mountは実施していない。

共有overlay sessionには別のtmp/hardlink経路があるが、今回の正式file callerはjob427–432→renderer793–814のCLI adapterを使う。未使用sessionを今回の必須改修へ加えない。video/audio builderと既存QCは呼出側のabsolute path/tempを受けるため、読取確認した範囲では共通実装変更は不要。

## 未評価・負担・次状態

- 実装：変更0。候補trust/実製造record/正式出力root未作成。製品6/設営29の既存履歴を維持、新設営30を計上していない。
- 技術QC：4096byte filesystem probeだけ実施。lint/typecheck/renderer/QC/full pipeline未実施を合格にしない。code変更がないため製品suiteは再実行していない。
- 実視聴品質：新動画0本、未確認。見心地・構成・可読性の採用をしていない。人間の過去レビュー/全字幕採点を再要求していない。
- 制作負担：今回は保存先preflightと差分特定のみ。初回準備/製造処理/人間介入の制作計測は未実施。製造時間を調査時間へ付け替えない。開始から報告固定までの経過はsession logに記録する。
- 06:39–40 UTC、shellの3readが `exec-server transport disconnected`。重複起動なしで停止後、06:41:18 UTCにrepo読取復旧。後のtask再読は `Transport closed` で失敗。現在のCodex2状態は開始時idleから推測更新しない。
- 親会話への途中の可視メッセージ送信はautomatic approval reviewが拒否し未送信。理由は外部Codex2/旧相談役往復を範囲外とする指示から既存thread送信許可を確認できないため。迂回/再送なし。最終報告で結果を返す。
- 次担当は相談役。追加Core pathの限定scopeと、既存の保護を満たす実保存領域を具体化するまで stopped-gpt。明示指示なく製造や別エピックを開始しない。過去の受理済み字幕/計画を再実行しない。

観測の実code SHAと4候補binding、SSD probe原本は [evidence.json](evidence.json)。これは製造承認record/成功receiptではない。
