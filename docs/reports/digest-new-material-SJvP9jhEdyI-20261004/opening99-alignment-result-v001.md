# 序盤99文字の本文固定LAN時刻合わせ — 一回の結果

記録 2026-10-05T14:29:15.912+00:00。親monaから、本人の既存LAN STT利用許可と今回32秒・一回の個別実行指示を受領。元2:57〜3:29の音声と原文99文字だけを、既存 `POST /align` へ送った。探索窓0〜32秒を指定し、旧各文字時刻を入力せず、音声認識・話者分離・本文修正・字幕再採用・正本時計変更・再製造は行っていない。

## 結果と処置

job `dc52cde6ef2f46ef99ac03578e84845b`。2026-10-05 14:22:21.042 UTC登録、14:22:21.400〜14:22:45.785 UTC処理。POST一回・新規受理・再利用なし。runner24.287秒、pipeline23.004秒。completedは保存完了で、品質は `needs_review`。99文字保持、欠落0、時刻null0、score null0、本文差分0。ただしscore0が33文字、低い正値が8文字。採用75文字にもscore0が26文字ある。

|原ID・文字|元音声に戻した候補時刻|長さ|score|
|---|---|---:|---:|
|89「て」|189.568〜199.814秒|10.246秒|0.998|
|94「感」|201.475〜201.495秒|0.020秒|0|
|95「じ」|201.495〜207.719秒|6.224秒|0.997|

旧原本ではID94「感」へ189.557〜199.800秒/10.243秒が割り当てられていた。今回もほぼ同じ音声区間が別の文字ID89「て」へ長く割り当てられた。「みたいな感じじゃない」は候補199.814〜208.360秒/8.546秒だが、直前の文字への長い割当てを伴うため改善・正解とは認めない。窓の変更反復はせず、今回候補は不採用・保存のみ。

## 再現入力と束縛

専用SSD root：`/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/stt-opening99-alignment-20261005-v001`。

- `source-02m57s-to-03m29s.wav`：1,024,078B、32秒、mono/16000Hz/PCM16、512000sample。SHA256 `fae2699681410393ad9df6455f126a4e088dce9618287da8a06c0d37de14b779`。入力0秒は元音声177000ms。
- `segments.json`：元原文99文字、単一探索区間0〜32秒、language ja。本文UTF-8 SHA256 `96444c837deead6134adf66a2ea7c529b30e63c4bc679818dd6c4c27902d1bd6`。
- `character-map.json`：元ID1〜47・72〜99は採用75文字、48〜71は除外済み文脈24文字。本文/ID/順序は維持。24文字を字幕へ戻す権限はない。APIのsourceKind adoptedは呼出側の固定本文という意味で、人間品質採用を発行しない。
- `source.json`：サーバーが保存した固定入力。`result.json`：実返却全文。`candidate-characters.json`：99文字すべての元ID・role・候補時刻・score、元原点への変換。`input.json`・`registration.json`・`status.json`・`execution.json`・`evidence-manifest.json`は入力/受付/完了/実行/SHAの束縛。

入力音声SHAはサーバー受付と一致、保存結果のSHAはサーバーresultSha256と一致、固定入力はsource checkpointと完全一致。原本responseのSHAを再照合し、採用75文字は現行meaningと元IDの一対一対応を照合した。元媒体はサイズ・mtime・inode不変（全元動画のSHA再計算はしていない）。候補時計は原点177000msを加算しただけで、正本への適用はない。

## 今回の実サーバー識別

WhisperX **3.8.6**、`interpolateMethod=ignore`、align CPU、returnCharAlignments true、offline true、ASR/話者分離なし。日本語wav2vec2モデルrevision `cf031e020336460d15a417eba710bbc5bb43be9a` は元原本と同一。今回はサーバーのモデル・コード・設定を変更していない。旧原本の3.8.4および02:02 UTCの保存コードと、今回実サーバーのバージョンを区別する。

- main.py SHA `4c0ac34d0fe5b8b4493b4f183df922b8c3f125583beac1099d193e16dc44e30c`
- stt_pipeline.py SHA `4e8889d34902c7f38dbe88dd63eb66df0ac6ee29a3f290d83ebfe82ce5915383`
- stt_alignment.py SHA `e4963404bf308f724f9e99770abc0c7850f0d55b59f1668ad2083d1abfe1f8f9`

上記は実応答metadata。配備Git commit/実ソースbytesは今回取得しておらず、SHAをGit版へ推測対応させない。

## サーバー側へ渡す不具合と次に必要な根拠

既存モデル・固定99文字・32秒探索窓でも、高scoreの一文字へ10.246秒/6.224秒が割り当てられ、採用範囲の文字にもscore0が残る。全文字が返ること、ignore指定、数値scoreだけでは発話同期は成立しない。この一件の音声・固定本文・実入力checkpoint・結果を再現入力として使い、長い割当て区間のalignmentフレーム/文字経路と実音声の対応を切り分ける。原因がモデルの経路選択、発話間の無音への割当て、原文と実発話の不一致のどれかは未確定。

次に必要なのは、この保存済み一件で長い時刻の由来を説明できる根拠と、修正後の局所結果の実発話対応である。追加の窓替え、別モデル比較、全文STT、本人の全尺採点や手動時刻再提出は今回の次作業にしない。文字の削除・均等補間・高scoreだけの採用で埋めない。実音声の発話開始/終了は今回実聴取で検証していないため、時計訂正や品質採用は未実施。

実装変更0、製造0、有料API0。今回クライアント/ffmpegは終了。約1.24MBの診断束は次のサーバー側調査に必要なKEEPで、不要生成物/削除0。旧成果・既存配信process・他者作業は変更していない。最終技術照合は2026-10-05 14:25:33.893 UTC。

[全文字の候補](opening99-alignment-candidate-characters-v001.json)・[照合結果](opening99-alignment-result-v001.json)・[実返却原本](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/stt-opening99-alignment-20261005-v001/result.json)・[入力音声](/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/stt-opening99-alignment-20261005-v001/source-02m57s-to-03m29s.wav)。状態：今回の一回診断は完了、字幕同期修正は未完了。次担当は親monaから既存LAN STT側の担当へ、この一件の切り分け範囲を渡す。
