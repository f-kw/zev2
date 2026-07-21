# 初回実データ接続 preflight 実装仕様 v001

日付: 2026-07-21

状態: **S1+A承認済み。媒体取得・対応証明・合成実装・実数付きpreflightだけ実行可。人間確認以降は未承認。**

承認根拠: kawafmmが貼り付けた相談役レビュー「初回実データ接続ゲート設計v001」を、S1+Aで最終承認した。追加条件3件（層1凍結との整合、媒体対応検査の事前固定、残り3候補の別承認）を本仕様とDECISIONSへ反映した。

今回の人間作業: **0件。時間計測なし。**

## 1. 本来の目的と停止点

正式初見素材`DmWu0jVQfTE`のcandidate 13について、人間が過去に確認した外側境界と、将来の基礎映像生成に使う実行媒体が同じ内容・同じ時刻軸であることを実データで証明する。その上で、機械が先に示す2つの発話間を人間が`切る / 残す`と認定できる最小画面を、まだ人間へ渡さずpreflight状態まで作る。

今回作ってよい実物は次までである。

1. native 1080p実行媒体（旧720pとは別path）。
2. 媒体対応証明、source identity、basis edit plan、確認候補manifest。
3. candidate 13だけの確認UIとread-only配信入口。
4. schema・hash・画面状態の合成検査と、実媒体の入口・ブラウザ再生検査。
5. 実際の判断数、操作数、必須視聴範囲・合計尺を記したpreflight報告。

人間回答、正式な組立決定、基礎映像、時間対応表、演出指示、描画は作らない。preflightのどれかが不成立なら、確認ページを人間へ提示せず停止する。

## 2. 実行媒体の作り方

### 2.1 固定する由来

- 配信: `https://www.youtube.com/watch?v=DmWu0jVQfTE`
- 凍結済み取得情報: `evals/clip_composition/research/downloads/first-gate-unseen/DmWu0jVQfTE/DmWu0jVQfTE.info.json`
- 取得情報SHA-256: `633d2d7f5d3487b9ce0cce6ee3de045e35fb9a6dea66946d4a1bf0a233e92f02`
- 旧確認媒体: `evals/clip_composition/research/downloads/first-gate-unseen/DmWu0jVQfTE/DmWu0jVQfTE.mp4`
- 旧確認媒体SHA-256: `08306f79df970953da7dff51e8de0e4a7cdea46ca75f793ff7b860b30c1401d7`
- 旧映像由来: YouTube format 398、AV1、1280×720、60fps。
- 旧音声由来: YouTube format 251、Opus、48kHz、stereo。

### 2.2 新媒体の固定手順

新規取得するのは、凍結済み取得情報に存在するYouTube format 299のH.264・1920×1080・60fps映像だけとする。音声は旧確認媒体に入っているformat 251をstream copyし、新映像とMP4へmuxする。

- 映像・音声を再encodeしない。
- scale、crop、fps変換、速度変更、trim、`-shortest`を使わない。
- 旧確認媒体を上書きしない。
- 取得したformat 299単体、mux後の実行媒体、実行引数、入力hashを保存する。
- format 140のAACへ置き換えない。別の不可逆圧縮音声では、旧STTと人間境界の許容差0の移送証明が成立しない。

H.264+Opus MP4がブラウザで使えるとは推測しない。実ファイルで再生検査に落ちた場合、AACへ黙って変換せず、媒体契約の改訂へ戻る。

## 3. 媒体対応証明の合格条件

schemaは`presentation-source-media-equivalence-v001`。以下はすべて必須で、許容差・相関係数・独自閾値を置かない。

### 3.1 来歴

1. 凍結済み取得情報のvideo ID、channel ID、webpage URLが対象と一致する。
2. 新映像はformat 299、音声は旧確認媒体内format 251である。
3. 旧媒体、新映像単体、mux後媒体、取得情報、実行引数のpathとSHA-256を記録する。

同じvideo IDであることは補助情報であり、それだけでは合格にしない。

### 3.2 新媒体の正式入口

既存`inspectPresentationBaseMediaSourceV001`を変更せず通す。

- 映像1本、音声0または1本。
- 1920×1080、rotation 0。
- `r_frame_rate`と`avg_frame_rate`がともに60/1。
- 映像frame PTSが0から1frame刻み。
- 音声は48kHz stereoで、stream時計とpacket時計が一致する。

### 3.3 映像の時刻軸

旧媒体と新媒体で次を完全一致させる。

- 開始時刻0。
- 60fps。
- decodeできたframe数528,840。
- frame時計による終端8,814,000ms。
- 全frameの時刻列から作るcanonical SHA-256。

解像度とcodecが違うため画素hashは同一性条件にしない。container全体の小数durationではなく、frame時計を映像側の正本とする。

### 3.4 音声packetと波形

旧媒体と新媒体で次を完全一致させる。

1. codec、sample rate、channel数、layout、time base、start PTS、duration TS、初期padding、extradata。
2. 全packetの`pts / dts / duration / size / flags / skip_samples / discard_padding`列から作るcanonical SHA-256、packet数、packet終端。
3. packet payload連結のSHA-256。
4. 固定FFmpeg 8.0.1で48kHz stereo `f32le`へ全decodeしたbyte数とSHA-256。

packet内容とdecode後波形の片方だけが一致しても不合格とする。旧媒体の固定値は、開始0 sample、終端423,073,008 sample、440,701 packetである。

### 3.5 STTの移送

再STTは行わない。旧STTを作った音声と新媒体の音声が同じであることを、candidate 13を含むchunkでも再確認する。

- STT manifest: `f7d2c04f8f9e67e27ff5b461236f01d3b68bb4f53ba448c0c4b5387c95a6d03b`
- transcript: `c0e006b381d60c2160a4ef59787bd32e47257baf9acc77b8706d74b5c8d3556d`
- word timestamps: `ebf0190c9ce0fd96b4e1faa18717f41d73126fc914172474ac791df7f17ad065`
- 対象chunk: index 16、1,920,000–2,040,000ms。
- 保存済みFLAC SHA-256: `c29a293c3324b172a6e555c1eca242fe8749f93a190bb3281ea85451d2244054`
- 同じ抽出条件（16kHz、mono、signed 16-bit PCM）で得る期待SHA-256: `f5389c874cd8921324f9a1847921ac2da8bced99f490c1c629a0ba21780245c7`

新媒体から1,920,000–2,040,000msを同じ条件で抽出したPCM hashを期待値と完全一致させる。さらに、manifestが`partial:false`、74/74 chunk連続、全単語時刻が整数・正順・音声尺内、candidate 13の外側境界と2つの提示間の前後文字が存在することを検査する。

UIが将来chunk 16の外へ表示を広げる場合は、そのchunkも同じ音声照合を追加してから表示する。表示後の都合で照合範囲を広げない。

### 3.6 実ブラウザ再生

確認UIと同じread-only HTTP経路で、mux後の同じ実ファイルをMicrosoft Edgeへ載せる。`canPlayType`だけでは合格にしない。

- 実媒体のmetadata読込成功。
- natural size 1920×1080。
- candidate 13開始へのseek完了。
- play後に再生時刻が進む。
- media errorなし。
- UI manifestの媒体hashがsource identityと将来のbuild jobで使うhashに完全一致。

### 3.7 停止条件

3.1〜3.6の一つでも不成立なら、対応証明を`failed`で保存してUIを人間へ出さず停止する。数十msの許容、波形相関、同じvideo ID、同じ尺、別codecへのfallbackで通過させない。

## 4. artifactの連鎖

参照はすべて`path + fileSha256`で固定し、未知fieldを拒否する。canonical JSONは既存の正本を再利用する。

1. `presentation-source-media-equivalence-v001`: 旧媒体、新媒体、取得情報、STTの対応証明。
2. `presentation-real-data-source-identity-v001`: 実行媒体、媒体対応証明、STTを束縛するsource正本。
3. `presentation-real-data-basis-edit-plan-v001`: 既存人間結果のcandidate 13、外側境界、定性的な`remove_silence_and_fillers`を原文のまま参照する。具体cutを持たない。
4. `presentation-internal-trim-review-candidate-manifest-v001`: `layer1-trim-v001@deterministic-rule`を`review-position-presenter`として再実行し、2つの発話間を未回答で保存する。自動cutと120ms paddingを適用しない。
5. `presentation-internal-trim-human-review-result-v001`: 将来ブラウザからコピーされる未信頼結果。今回の実データでは作らない。
6. `presentation-assembly-decision-save-preflight-v001`: 将来の人間回答を再検査する停止ゲート。今回実装するのはschema・validator・合成testまでで、正式decision作成処理は作らない。

連鎖は`media equivalence → source identity → basis plan → candidate manifest → review result → save preflight`の一方向とする。人間回答より前のartifactが、後段のcutや最終区間列を先取りしない。

## 5. UIと作業量の固定

UIは1候補、発話間2件、最終承認1件だけとする。raw STTの発話まとまりを全文表示し、即席の句読点・固定秒数分割を使わない。

- 目的、見なくてよいもの、答えるもの、時間非計測を冒頭表示。
- 2件とも未回答開始で`切る / 残す`。
- 回答状態に関係なく修正・取消可能。
- 修正時だけ、前後の発話全文内で「前側の最後に残す文字」「後側の最初に残す文字」を選ぶ。
- 文字選択と再生を分離し、クリックで再生しない。
- 元候補、各間の前後、現在の編集結果、つなぎ目を、開始・終了・長さ付きの別名ボタンで再生。
- 仮状態だけをブラウザに持ち、サーバー保存しない。最後に人間可読要約と厳密JSONをコピー。

必須操作は8回、初期位置探索0回。修正した場合だけ実際に変更した端点数を位置探索回数として記録する。

実装前に固定した実尺は次のとおり。

| 対象 | 範囲 | 尺 |
|---|---:|---:|
| 元候補 | 00:32:00.260–00:33:28.506 | 88.246秒 |
| 間1の前後発話 | 00:32:00.260–00:32:57.670 | 57.410秒 |
| 間2の前後発話 | 00:32:29.982–00:33:28.506 | 58.524秒 |
| 編集後 | 判断により変化 | 82.598〜88.246秒 |

4回を全尺再生する初期経路の合計は286.778〜292.426秒。重複視聴を含む操作負荷の実数であり、uniqueな映像尺とは呼ばない。任意の再視聴、つなぎ目再生、修正、取消には上限を置かない。

## 6. 合成検査

1. 固定400ms規則から2候補・時刻・保護理由・フィラー0件が再現される。
2. 0/1/2 cutと全て残す場合の補集合、順序、非重複、外側内、hash決定性。
3. 未回答、追加編集必要、最終未承認では正式保存可能にならない。
4. 修正端点の実在・順序・全文周辺文字保存と、範囲外・逆転・重複の拒否。
5. 回答後も修正・取消でき、再読込後も仮状態で、正式保存されない。
6. 文字選択で再生せず、各再生ボタンが表示範囲で停止し、複数残存区間を順番に再生する。
7. 720p、媒体hash差替え、STT hash差替え、未知field、旧形式を拒否する。
8. JavaScript構文、必須文言、禁止情報、viewport、`HH:MM:SS.mmm`、コピーfallbackを検査する。
9. 判断3件、必須操作8回、位置探索0回、必須視聴範囲・合計尺をUI実態から再計算し、manifestと一致させる。

合成検査後も、実ブラウザで未回答・切る・残す・修正・取消・コピーの導線を機械操作で検査する。これは人間の判断ではない。

## 7. A成立後の非自動展開

candidate 13が成立しても、残り3公開候補へ自動展開しない。残りは発話間9件と最終承認3件、計12独立判断である。実操作数・必須視聴尺を再計算し、1セッション5判断前後へ分けた案とともに別承認を求める。

## 8. 承認範囲外

- 人間へ確認ページを渡すこと。
- 人間回答を正式保存すること。
- `presentation-base-media-assembly-decision-v001`を作ること。
- 基礎映像・timeline v002・演出指示・レンダラー出力を実生成すること。
- G4〜G7、LLM、STT再実走、本体接続。

今回のpreflight報告後、次に人間へ求める判断はcandidate 13の確認を開始してよいかの1件だけとする。
