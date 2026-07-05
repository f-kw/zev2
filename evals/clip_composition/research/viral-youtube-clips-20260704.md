# バズった切り抜き候補調査 2026-07-04

## 目的

STT前に、切り抜き区間選択評価のfixture候補にできるYouTube動画を集める。ここでは動画解析、STT、runtime書き込み、本体キュー接続は行わない。

## 調査方法

- Web検索で「バズった切り抜き」の方向性を確認。
- `yt-dlp` のYouTube検索メタデータで、再生数、尺、投稿日、チャンネル、URLを取得。
- 候補動画の説明欄から、元動画らしきYouTube URLを抽出。

`yt-dlp` はYouTube challenge警告を出したが、メタデータと説明欄URLは取得できた。動画ファイルはダウンロードしていない。

## 第一候補

[『笑い声がトルコ行進曲』の女](https://www.youtube.com/watch?v=IMQYaT_RWRA)

- チャンネル: 月ノ美兎切り抜きch
- 投稿日: 2022-10-08
- 尺: 19秒
- 調査時点の再生数: 5,305,609
- 説明欄の元動画候補:
  - https://www.youtube.com/watch?v=8uuQldLptRE
  - https://www.youtube.com/watch?v=LBBRk8blLV0
  - https://youtu.be/Rfsj5uHy_Bs
- ローカル保存:
  - 動画: `evals/clip_composition/research/downloads/IMQYaT_RWRA/IMQYaT_RWRA.mp4`
  - メタデータ: `evals/clip_composition/research/downloads/IMQYaT_RWRA/IMQYaT_RWRA.info.json`
  - サムネイル: `evals/clip_composition/research/downloads/IMQYaT_RWRA/IMQYaT_RWRA.webp`
- 保存済み動画: 640x360、18.622秒、約1.1MB、映像h264、音声aac
- 理由: 短尺で非常に伸びており、STT後に元動画内の対応区間を探しやすい。最初のfixture候補として扱いやすい。

## 次点候補

[現役Vtuberで登録者数が世界2位になったことについて正直な感想を述べるマリン船長](https://www.youtube.com/watch?v=UpRyakf5j80)

- 尺: 43秒
- 調査時点の再生数: 1,328,330
- 元動画候補: https://youtu.be/kNX-wQTvsws
- 理由: 短尺で100万再生超え。元動画候補が1件で照合しやすい。

[【雑談】”同接100人いたら食べていけるの？” リスナーの質問に答える渋ハル](https://www.youtube.com/watch?v=r_ztjHaHmcg)

- 尺: 125秒
- 調査時点の再生数: 1,382,624
- 元動画候補: https://youtu.be/-DwSCDMCWDQ
- 理由: 質問への回答型で、単独意味が通る切り抜き区間を作りやすい可能性がある。

## 保留候補

- [イブラヒムVSリスナーの爆笑スパチャ芸 Part3](https://www.youtube.com/watch?v=G50fk92iQts): 3,045,572再生、616秒。強いが複数元動画のまとめ。
- [葛葉だけ配信中だと思ってる中ヤバい言動を連発するドッキリ](https://www.youtube.com/watch?v=NXiltvIO99w): 3,505,896再生、250秒。人気短編の構成参考向き。
- [【まとめ】笑ってはいけないお嬢のダジャレ集](https://www.youtube.com/watch?v=moXVHhE7lI0): 1,099,619再生、567秒。複数元動画まとめで照合コストが高い。
- [【特別編】歴代にじさんじ爆笑シーンまとめ](https://www.youtube.com/watch?v=4Rcotk_nn04): 5,353,717再生、1587秒。強いが長尺総集編。

## STT後にやること

詳細手順は `evals/clip_composition/STT_ALIGNMENT_PLAN.md` に固定する。

1. 第一候補の切り抜き動画をSTTする。BGM、SE、切り抜き師が追加した音声やナレーションで認識率が落ちる前提で扱う。
2. 説明欄にある元動画候補をSTTする。元動画側は単語レベルのタイムスタンプ付きで出す。
3. 切り抜きを約30秒単位のチャンクに分割し、チャンク単位で元動画候補3本の全域を探索する。
4. 照合前に、ひらがな化、数字表記統一、全角半角統一などの正規化を行う。
5. 切り抜きが複数の元動画をまたぐ可能性を正常系として扱う。
6. STT照合候補に対して、切り抜き全体と発話部分を分けた音声比較を行う。
7. 逆引きされた区間をそのまま固定せず、音声比較の結果から元配信側の候補区間を選ぶ。
8. 音声確認済みの区間を `expectedCuts` 候補にする。チャンクごとの一致度も一緒に記録する。
9. 固定テーマは現行システムに生成させず、音声確認済みの正解候補区間から人間が逆算して書く。
10. 目視確認は最終データセットQAとして行い、必要なら開始位置と終了位置を微調整する。

## 2026-07-05 STT・照合結果

ローカルSTTサーバー `http://192.168.1.8:8000` で、切り抜き1本と説明欄の参照候補3本をSTTした。

保存した参照候補:

- `8uuQldLptRE`: 91分33秒の元配信候補。`evals/clip_composition/research/downloads/IMQYaT_RWRA/sources/8uuQldLptRE/8uuQldLptRE.mp4`
- `LBBRk8blLV0`: 3分25秒の音楽候補。`evals/clip_composition/research/downloads/IMQYaT_RWRA/sources/LBBRk8blLV0/LBBRk8blLV0.mp4`
- `Rfsj5uHy_Bs`: 4分9秒の再編集候補。`evals/clip_composition/research/downloads/IMQYaT_RWRA/sources/Rfsj5uHy_Bs/Rfsj5uHy_Bs.mp4`

STT保存先:

- 切り抜き: `evals/clip_composition/stt/IMQYaT_RWRA/clip/`
- 元配信候補: `evals/clip_composition/stt/IMQYaT_RWRA_8uuQldLptRE/source/`
- 音楽候補: `evals/clip_composition/stt/IMQYaT_RWRA_LBBRk8blLV0/source/`
- 再編集候補: `evals/clip_composition/stt/IMQYaT_RWRA_Rfsj5uHy_Bs/source/`

チャンク照合結果:

- 切り抜き側は18.622秒なので、30秒チャンクは1件。
- 全体最上位は再編集候補 `Rfsj5uHy_Bs` の 2:33.309 - 2:44.196。
- 元配信候補 `8uuQldLptRE` の参照元別最上位は 33:18.363 - 33:26.530。
- 音楽候補 `LBBRk8blLV0` は発話照合の候補として弱い。

照合出力:

- `evals/clip_composition/outputs/alignment-IMQYaT_RWRA_v001.json`
- `evals/clip_composition/reports/alignment-IMQYaT_RWRA_v001.md`
- `evals/clip_composition/outputs/audio-compare-IMQYaT_RWRA_v001.json`
- `evals/clip_composition/reports/audio-compare-IMQYaT_RWRA_v001.md`

音声比較結果:

- 切り抜き全体の直接波形は、BGMとSEの重なりで参照元候補と強く一致しなかった。
- 発話部分だけを見ると、元配信候補 `8uuQldLptRE` の音量包絡相関が最も高い。
- 切り抜き発話 `0:01.313 - 0:05.338` は、元配信候補 `33:22.113 - 33:26.138` 付近に対応する可能性が高い。
- STT上の全体最上位は再編集候補だったが、音声比較では元配信候補が強いため、expectedCuts候補は `8uuQldLptRE` 側を優先する。

fixture候補:

- `evals/clip_composition/fixtures/IMQYaT_RWRA_audio_v001/`
- `evals/clip_composition/expected/IMQYaT_RWRA_audio_v001.json`
- 期待区間: `8uuQldLptRE` の `33:18.363 - 33:26.530`
- 音声比較の芯: `8uuQldLptRE` の `33:22.113 - 33:26.138`
- 固定テーマ: 「笑い声がトルコ行進曲に聞こえる女騎士いじり」
- 現在の評価結果: `evals/clip_composition/reports/IMQYaT_RWRA_audio_v001/clip_composition_prompt_v001/20260705-123725/summary.md`
- 3回実行では、現在のrule-based compositionが期待区間と同じ `1998363ms - 2006530ms` を選び、揺れは0ms。

目視確認用クリップ:

- `evals/clip_composition/outputs/visual-check/IMQYaT_RWRA/source_8uuQldLptRE_33m12s_22s.mp4`
- `evals/clip_composition/outputs/visual-check/IMQYaT_RWRA/source_Rfsj5uHy_Bs_2m28s_22s.mp4`

未確定:

- `expectedCuts` は音声確認済み候補として使える状態。
- 元配信候補の 33:18.363 - 33:26.530 は、最終データセットQAで目視と聴取により開始位置と終了位置を微調整する余地がある。
- 固定テーマは、この音声確認済み区間から人間が逆算して書いた。

## 未確定

- 説明欄のURLが本当に対応元動画かは未確認。
- 切り抜き動画が字幕・音声加工・BGM入りの場合、STT照合に補正が必要になる可能性がある。
- 元動画内の対応時刻は音声比較で候補化済み。最終QAでは開始位置と終了位置だけ確認する。
- 切り抜き側に元動画へ存在しないSE由来テキストや追加音声が混ざる可能性がある。
- 最初のfixtureでは、音声確認済みの期待区間としてプロンプト評価に使い、最終QAで目視確認結果を追記する。

## 2026-07-05 第二候補の保存状況

第二候補として、元動画候補が1本の `r_ztjHaHmcg` を進めた。

保存した動画:

- 切り抜き: `evals/clip_composition/research/downloads/r_ztjHaHmcg/r_ztjHaHmcg.mp4`
- 元動画候補: `evals/clip_composition/research/downloads/r_ztjHaHmcg/sources/-DwSCDMCWDQ/-DwSCDMCWDQ.mp4`

保存したSTT対象定義:

- `evals/clip_composition/stt-targets/r_ztjHaHmcg.json`

STT進捗:

- 切り抜き側STTは完了し、単語タイムスタンプ付きで保存済み。
- 元動画側STTは、80分音声を1本で送ったところ接続が切れた。
- 分割STT用の `run_local_stt_chunked.ts` を追加したが、実行時点ではローカルSTTサーバー `http://192.168.1.8:8000` がタイムアウトしている。
- 再開手順は `evals/clip_composition/reports/stt-progress-r_ztjHaHmcg_v001.md` に記録した。

STT停止中の補助:

- 音声粗スキャンを `evals/clip_composition/reports/audio-scan-r_ztjHaHmcg_v001.md` に保存した。
- 最上位候補は元動画 `-DwSCDMCWDQ` の `11:37.000 - 13:35.500`。
- 切り抜き全体に合わせた確認開始候補は `11:34.445`。
- Web版Geminiまたは人間確認用の横並び動画を `evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/gemini_pair_audio_scan_v001_r_ztjHaHmcg_vs_-DwSCDMCWDQ_11m34s.mp4` に作った。
- この音声粗スキャンは `expectedCuts` として固定しない。元動画側STTと目視確認の前段の候補位置として扱う。

### 2026-07-05 第二候補の追加確認

音声粗スキャン最上位の `11:34.445 - 13:39.717` は、Web版Gemini Flashで同一元ネタではないと判定された。切り抜きの話題は「同接100人」と「2018年のアナリティクス」だが、11分台候補は引っ越し・回線・PC契約寄りの別話題だった。

その後、元動画 `-DwSCDMCWDQ` のYouTube自動字幕を保存し、評価環境用STT形式に変換して30秒チャンク照合を行った。結果として、元動画の `36:19` 付近から `40:33` 付近が本命候補になった。

チャンク別の対応:

- 切り抜き `0:02.555 - 0:32.555` → 元動画音声候補 `36:19.930 - 36:49.930`
- 切り抜き `0:32.555 - 1:02.555` → 元動画音声候補 `38:29.360 - 38:59.360`
- 切り抜き `1:02.555 - 1:32.555` → 元動画音声候補 `39:21.159 - 39:51.159`
- 切り抜き `1:32.555 - 2:01.147` → 元動画音声候補 `40:04.730 - 40:33.322`

判断:

- 元動画 `-DwSCDMCWDQ` 自体は正しい可能性が高い。
- ただし、切り抜きは元動画の待ち時間や別コメントへの反応を詰めた編集であり、単一の連続区間ではなさそう。
- 単一区間の `expectedCuts` に固定すると、切り抜きに含まれない元動画の間が混ざる。
- 2件目fixtureとして使う場合は、複数区間対応をexpected側に持つか、この候補を保留して連続区間の短尺切り抜きを選び直す。

保存先:

- `evals/clip_composition/reports/r_ztjHaHmcg-youtube-auto-alignment-v001.md`
- `evals/clip_composition/outputs/alignment-r_ztjHaHmcg_youtube_auto_v001.json`
- `evals/clip_composition/outputs/audio-compare-chunks-r_ztjHaHmcg_youtube_auto_v001.json`
- `evals/clip_composition/outputs/r_ztjHaHmcg/visual_verification/20260705-gemini-web-flash-audio-scan-v001.json`

## 2026-07-05 単一区間向きの次点候補

`r_ztjHaHmcg` は元動画自体は正しそうだが、切り抜き側が複数箇所を詰めているため、現行の単一区間評価fixtureとしては保留した。代わりに、元動画候補が1本で短尺の `UpRyakf5j80` を調べた。

保存したもの:

- 切り抜き音声: `evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.m4a`
- 切り抜き自動字幕: `evals/clip_composition/research/downloads/UpRyakf5j80/subtitles/UpRyakf5j80.ja-orig.json3`
- 元動画自動字幕: `evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/subtitles/kNX-wQTvsws.ja-orig.json3`
- 字幕STT変換結果: `evals/clip_composition/stt/UpRyakf5j80_youtube_auto/` と `evals/clip_composition/stt/UpRyakf5j80_kNX-wQTvsws_youtube_auto/`
- チャンク照合結果: `evals/clip_composition/outputs/alignment-UpRyakf5j80_youtube_auto_v001.json`
- 照合メモ: `evals/clip_composition/reports/UpRyakf5j80-youtube-auto-alignment-v001.md`
- STT対象定義: `evals/clip_composition/stt-targets/UpRyakf5j80.json`

字幕照合の結果:

- 切り抜き `0:00.000 - 0:30.000` → 元動画 `kNX-wQTvsws` の `3:09:22.439 - 3:09:57.300`
- 切り抜き `0:30.000 - 0:44.390` → 元動画 `kNX-wQTvsws` の `3:09:51.899 - 3:10:05.460`

判断:

- 2チャンクが同じ連続範囲に集まっており、単一区間fixture候補として有望。
- `yt-dlp` 更新後に元動画の候補周辺55秒を取得でき、切り抜き全体の音声比較で `3:09:24.500 - 3:10:07.178` が強く一致した。
- Web版Gemini Flashで左右比較動画を確認し、同一元ネタかつ切り抜き内容を含むと判定された。
- `UpRyakf5j80_clip_audio_v001` としてfixture化し、expectedCutsに固定した。
- 固定テーマは、確認済みの正解区間から「登録者数世界2位扱いへの照れと順位変動への冷静な反応」と逆算して書いた。

評価結果:

- 期待区間: 元動画 `kNX-wQTvsws` の `3:09:24.500 - 3:10:07.178`
- fixture: `evals/clip_composition/fixtures/UpRyakf5j80_clip_audio_v001/`
- expected: `evals/clip_composition/expected/UpRyakf5j80_clip_audio_v001.json`
- 3回実行summary: `evals/clip_composition/reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v001/20260705-184034/summary.md`
- 現在のrule-based compositionは3回とも同じ `3:09:22.439 - 3:10:09.170` を選び、期待区間を約2秒ずつ広く含んだ。
