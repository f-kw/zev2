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

1. 第一候補の切り抜き動画をSTTする。
2. 説明欄にある元動画候補をSTTする。
3. 切り抜き動画の発話列が元動画内のどこに出るか照合する。
4. 対応できた元動画区間を `expectedCuts` にする。
5. その元動画の文字起こしと固定テーマをfixture化する。

## 未確定

- 説明欄のURLが本当に対応元動画かは未確認。
- 切り抜き動画が字幕・音声加工・BGM入りの場合、STT照合に補正が必要になる可能性がある。
- 元動画内の対応時刻はまだ確定していない。
