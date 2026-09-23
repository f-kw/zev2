# Pulse Accent（仮称）: 実在する音声ピークに合わせる短い拡大

作成日: 2026-09-17。branch: `codex/digest-pulse-accent`。base: `4395e312174075a573032cf1be918bd2cc78aeeb`。

## 1. 目的と到達点

内容に合う見た目の変化を増やし、Digestの単調さを減らすため、静的なColor / Scale / Panelに短い時間変化を一種類追加した。Scaleは字幕の全表示期間を拡大し、Pulseは実在する局所的な音声ピークの近くで一度だけ拡大して通常へ戻る。演出件数は目的にしていない。

全32字幕・27音声候補を新たに判断し、人間修正0の全161.033秒の実Digestを本番の共通描画・品質検査まで完了した。人間に提出する完成候補は1本である。通常版や機能の少ない版を人間比較のために再作成していない。

- 完成候補: `/private/tmp/zev-pulse-accent-fswa9cuw/completed/digest-color-panel-pulse-provisional.mp4`
- SHA-256: `bfaf7083d229c8649bac9eba1734074a4ef24e5881c50bf514d5d2527161419c`
- 1920×1080、30fps、4,831 frame。音声packet payloadは元動画と一致。
- Color 9件、Scale 0件、Panel 2件、Pulse 1件。単体動画としての見心地と正式採用は人間未判定。

PanelとPulseは仮称・試作デザインのままであり、人間の見心地・名称・デザインの正式採用は未判定。ColorとScaleは既存の採用済み表現として維持する。

## 2. 最小方式と有限仕様

一字幕の通常・中間・最大の3枚の実PNGを描き、固定された5区間を既存FFmpeg合成へ接続する。一般的なanimation engine、任意keyframe、frameごとの汎用renderer、新しい編集stageは作っていない。一字幕は論理上1件のまま、3状態のPNGと描画条件をそれぞれhashで束縛する。既存静的合成の引数は一致する。

現試作は1920×1080・30fps・下中央・通常96pxの字幕を対象とし、中間112px・最大128pxを描く。実在するピークのsample位置を整数演算で動画frameへ切り下げ、そこを基準に次の一回だけの切替を行う。

| 状態 | 根拠frameからの区間 | 長さ |
| --- | --- | ---: |
| 通常 | 変化前 | 元の字幕期間内 |
| 中間 | −4以上、−1未満 | 3 frame |
| 最大 | −1以上、＋3未満 | 4 frame |
| 中間 | ＋3以上、＋6未満 | 3 frame |
| 通常へ復帰 | ＋6以降 | 元の字幕期間内 |

変化は10 frame（約0.333秒）。既存の入退場4 frameのfadeを、状態連結後に元の字幕全期間へ一度だけ掛ける。拡大前後に不透明な通常状態を観測できないピークは不適格とする。端へ寄せる、短縮する、字幕時刻を動かす補正はしない。

3状態の外枠の横中心と下端は厳密に同じであることを検査し、安全域への収め直しで中心が動く場合は拒否する。各状態の行ごとの描画領域と字幕間の実際の時間重なりを調べる。最大表示が字幕の全期間続くものとして誤判定しない。大き過ぎる文字の縮小、改行追加、位置変更はしない。

## 3. 判断と保存の境界

PulseでAIが指定できる描画用の選択は、有限の表現名と実在する発火用ピークID一件である。説明に用いる補助根拠ピークは複数を認めるが、追加発火には使わない。倍率・frame・時間・曲線・座標・色・keyframe列・JSX・filter式は受け取らない。描画値はpresetが所有する。

判断時には全32字幕・全27音声候補・134局所ピークを今回の入力として読み直した。古い採否を正解ラベルとして渡していない。音声候補をまとめた区間の代表ピークではなく、元測定にある各構成ピークの実時刻を使う。候補と字幕の往復参照、ピークの所属、字幕の半開区間内に実際の頂点が存在すること、固定変化が収まることを検査する。

判断入力はv004、描画規則はv006へ進めた。旧版の暗黙変換はない。保存済み入力を開く際にも、元音声・音声候補・局所ピーク測定の実bytesとhashを検査し、保存されている時刻表を再構成して照合する。ピーク時刻の偽造や別ファイルへの差替えでは人間修正も保存できない。

固定通常計画 → 固定自動案 → 一件ごとの人間修正 → 実行計画を維持する。Normal / Color / Scale / Panel / Pulseは排他的で、部分指定はColorだけ。CLIのPulseは根拠を明示的に指定し、不足・不適格なら選択可能なIDを示して保存しない。Resetは再判断せず、保存済み自動案の根拠ピークまで戻す。

## 4. 実Digestの新しい判断

| 字幕の判断 | 件数 |
| --- | ---: |
| Color Accent | 9 |
| Scale Accent | 0 |
| Panel Accent（仮称） | 2 |
| Pulse Accent（仮称） | 1 |
| 通常 | 16 |
| 未解決 | 4 |
| 表現不能という最終判断 | 0 |

全32字幕・27候補への回答を検査して保存した。音声候補は選択10・不要5・未解決12。件数quota、等間隔、交互・ランダム配置はない。全期間拡大を選ばなかった結果を、その効果を動画へ入れるためだけに変更していない。未解決4字幕は通常の表示を保持する。

Pulseの実使用は **01:49.533–01:51.533「マジで怖い」**。根拠の局所頂点は **01:50.140**、元測定 `audio-peak-000729`、16kHzの1,762,240 sample位置である。根拠frameは3304、変化は3300–3309 frame、3310 frameで通常へ戻る。まとめた音声候補の代表頂点109.30秒は直前字幕に属するため、今回の発火位置には使用していない。

AIは、角度の使い方への抗議の直後に挟まる短い実感に、局所の立ち上がり・減衰と認識語が対応しているとして一度の変化を選んだ。110.94秒の補助的な頂点にも対応があるが、そこで二度目を発火させない。混合音の観測だけで発声起源を保証するものではない。

全32字幕について6通りの幾何を測定した。通常とPanelは全件可能。ScaleとPulse最大状態は9件で不適格。Pulseは幾何だけでなく、個々のピークに対して前後の固定時間が収まることも条件とする。別ピークが端に近いだけで同字幕の適格ピークまで排除しない。幾何と発火余白の両方が成立するのは16字幕・40字幕ピーク組であり、これは能力の可否であって意味上の採否ではない。

## 5. 検証

- 最終機能検査: 375/375合格。通常計画・固定案・一件修正・Reset・保存と読込・AI境界・CLI・有限合成を含む9ファイル。
- Color / Scale / Panelの回帰（実フォント描画を含む）: 23/23合格。
- Pulseの実フォント統合: 1/1合格。短文・2行の6状態PNG、90 frameの共通production合成、直前・最大・復帰の計6実frame、音声packet保持を検査。通常なら入るが最大では安全域を越える場合、行間衝突も拒否。
- 実合成された3故障（最大表示を通常へ差替え、8 frame時刻ずれ、通常へ復帰しない）を、完成frame検査がすべて拒否。
- 別の45 frameのlossless合成では、入退場・通常・中間・最大・中間・復帰・字幕外の全frameが該当する静的参照と一致。
- 共有型全体と判断Skill単独の厳密型検査が合格。
- 静的ページ出力の9対象検査が合格（無関係の27検査は未選択）。この別工程へPulseを誤って一枚PNGとして流す入力は明示拒否する。
- 実Digestの保存済み字幕で、Normal / Color / Scale / Panel / 別の適格ピークによるPulseの5修正経路からResetを実行し、元のピークと全32字幕の実行計画へ完全復元した。元の3入力ファイルはhash不変、再判断0、不適格な別字幕の代表ピークは保存0で拒否。完成動画へこの検査用修正は渡していない。
- 原音声・候補・局所ピークの改変、偽の埋込時刻、未知・別字幕・字幕外の頂点、根拠なし、自由描画値、旧版入力を拒否。

本番経路で全32字幕の完成フレームと字幕を除いた同条件の参照を検査し、Pulseには直前・最大・復帰の3実frameを追加検査した。32論理字幕・34実PNGを公開一式のhashへ束縛した。

別の完成物検証で、全32字幕の本文・改行・開始終了・位置設定・元動画対応、Prospectと保持区間を原計画と照合し、許可された演出変更以外がないことを確認した。通常表示20字幕のPNGは既存通常版とbyte一致し、Pulseの通常状態のPNGも既存通常版と同一。Color 9件・Panel 2件の全中点、およびPulseの3点について完成MP4の実画素を確認した。元音声packetのbytesは一致し、全4,831 frameが維持されている。

保存した生回答から固定案・実行計画・34実PNG・完成MP4・検査証拠まで独立担当が再照合し、必須修正はない。開始前の6作業treeのHEAD・branch・差分・staged・全未追跡一覧は30項目すべて保持した。

独立した意味点検では全32字幕・7文脈・全27候補・134頂点・70認識区間を読み、必須修正に当たる矛盾は見つからなかった。否定・推測・条件・本人の感想を保持している。音響の突出量は静かな谷との差であり、声の因果や通常より強い発声の証明ではない。回答の「通常の抑揚」等はAIの編集判断で、実際に試聴した事実として引用しない。

本番検査と並行した先行補助検査では、初回に音響測定元の字幕入り動画を参照背景へ使う設営誤りがあった。初回の参照距離判定を取り下げ、原本を保持し、描画開始記録に束縛された字幕無し動画でv002を再実行した。訂正後は3点とも意図した状態が一意最小である。完成MP4と本番検査の入力・処理には変更を加えていない。補助検査で全32字幕の本番QCを代替していない。

完成動画でのPulse検査は、直前通常・最大・復帰通常の3点である。同じ元frameと3状態の実PNGで作る参照画像に対し、各画素・RGB成分を等しく扱った絶対差の整数和を比較し、意図した状態が一意に最も近いことを要求する。同値は失敗とし、任意の許容係数や重みは使わない。実Digestの中間6 frameを含む全10 frameを毎回直接検査するという主張はしない。全必要状態の幾何・行・時間衝突、区間割当、全frame合成fixtureは別に検証している。

全32字幕の最初の参照入力記録から最後の対応画像まで、約147.0分が経過した（ファイル記録時刻による観測）。字幕ごとに同じ全タイムラインを先頭から再圧縮し、対象フレーム取得後に終了する既存の検査方式のため、後方の字幕ほど処理が長い。この区間には字幕間の画素検査とPulseの3点検査も含まれる。描画開始からの全所要時間や最終QC全体の時間ではない。検査を省略して完了扱いにはしていない。

途中22件までの独立した性能点検では、各参照で35入力・32字幕の合成設定を再構成し、対象frameを受け取ってから符号化を終了していた。保存ログの生成frame累計は36,299。1字幕目の画像準備は79.318秒、22字幕目は370.953秒だった。毎回4,831 frameすべてを最後まで処理するという意味ではない。Pulse固有の3地点・9参照画像はこの反復と別である。短縮案は検査の同等性を証明する必要がある未実施案として所見に分け、稼働中の検査や今回の判定条件は変更していない。

前のPanel工程では全32字幕の反実仮想参照作成は無効であり、別途、全32字幕の設定・画像と選択10字幕の完成フレームを検証していた。今回はPulseの完成3地点検査を必須にする同じ設定で、既存の全32件の参照再生成も有効になっている。この検査量の違いを除いた同条件の総所要時間比較はできない。直前の字幕画像検査終了記録から主動画合成終了記録までの保存時刻差は前回555.172秒・今回555.985秒だったが、FFmpeg専用timerや統制実験による値ではない。Pulseは画像入力が32枚から34枚になり、分割・5区間連結も加わるため、一回の合成に対する追加負荷の寄与をゼロと断定しない。

### 残る旧検査の不合格

旧renderer検査は12合格・7不合格で、古いtrust台帳との部品hash照合が残る。観測された8個の部品診断に対応するファイルは今回baseから変えていない。ただし今回は合成本体とQCを変更したため、前工程の『全診断bytesがbaseと同じ』という結論を流用しない。旧台帳や期待hashを都合よく更新しておらず、全project検査が合格したとは主張しない。別の実行資源fixtureは旧参照動画がこの作業treeに存在せず、1合格・1不合格である。この欠落を合格扱いしない。

## 6. 限界と範囲

技術検査は、音源分離、発声起源の認定、意味判断の正解率・再現率、人間の見心地、重要な画面情報を覆わないことを保証しない。Pulseの試作対象は上記の30fps・文字サイズ・配置に限定する。ユーザーが求める「単体の完成動画だけで効果が分かる」という明瞭さ、新表現の見心地、重要映像を覆わないかの人間判定は未完了。

外部への素材送信、有料API、新依存、新素材取得は0。既存ローカル音声測定とASRをbytes照合して再利用した。Digest正本、字幕本文・改行・表示時刻、Prospect、保持区間、元動画対応、音声を変更しない。DECISIONS、Goal文書、work-order、契約、main、tag、stable、releaseは変更しない。

## 7. 証拠と相談役監査

- `/private/tmp/zev-pulse-accent-fswa9cuw/authority/consultant-response-v001.txt` — `83786ed4b86774b074860db9be31fb0b527cad230cc815a55d2eacec08f6cf2d`
- `/private/tmp/zev-pulse-accent-fswa9cuw/judgments/horror-attempt-1/request.json` — `bbfe0f892719a1b19d3575fa38cf680907e51505957888bc693017c3e092638a`
- `/private/tmp/zev-pulse-accent-fswa9cuw/judgments/horror-attempt-1/response.json` — `1f8784e336e20cb84c103ac6d0fc8e82e8aa4905d70681744efc2d17c790eb6d`
- `/private/tmp/zev-pulse-accent-fswa9cuw/judgments/horror-attempt-1/decision-input.json` — `a8ec628bae522b93a9c9a53e7953f03b5640531a1b70a91a7758e8ce6301e720`
- `/private/tmp/zev-pulse-accent-fswa9cuw/judgments/horror-attempt-1/fixed-auto.json` — `9c6ec97276ca96ce83e660bf05bc9ddeb06b30fdb3dd70226140d4e63a7fa99a`
- `/private/tmp/zev-pulse-accent-fswa9cuw/judgments/horror-attempt-1/validation.json` — `d4117bcf38e5264d717e4da164694da80adede5ca315f59fc8156f6235711d40`
- `/private/tmp/zev-pulse-accent-fswa9cuw/judgment-verification-v001/summary.json` — `7556a675be713aee4e2b7431f9162f8b428e0b2259aff70b42141af29ce9fbd2`
- `/private/tmp/zev-pulse-accent-fswa9cuw/judgment-verification-v001/selection-summary.json` — `a1f94efe744b73af22b7c2a7b399cbb4fb997c994c7346d0dd655f9f5db1aa9b`
- `/private/tmp/zev-pulse-accent-fswa9cuw/real-cli-reset-v001/summary.json` — `9e08b008cd978cb65682970720949d0e31492318c91cc633ef5387aa4f2b2aad`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/final-test-evidence-v001.json` — `4b04d4c39802126a02ed92e4900bcb2e62a65bc4b714cd7acbe9dbd234dd70a3`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/renderer-implementation-v002.json` — `24b0ceab940971970062ca108e335254884158ab8657f595d0756834c1ab26c1`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/actual-judgment-independent-review-v001.json` — `c2719e07f9b23ea61f661aba07f907cbee24ecd3e637c2a237921cc4c3b9cc5f`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/real-input-preparation-verification-v001.json` — `9bb2d62a3f8b021f9941f11d394d929c9268c40d83c70f50f480d2a182d86ba1`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/early-pulse-output-check-v002/summary.json` — `777df29d779545fd4bc2243345f32e723537295a8e97c8ff8949dff31e2b2bfc`
- `/private/tmp/zev-pulse-accent-fswa9cuw/preservation-after-v001.json` — `e2a707c674195e71aa122325b787b31bf885a70be4b631466cbc42d366766b38`
- `/private/tmp/zev-pulse-accent-fswa9cuw/renders/horror-automatic-v001/summary.json` — `5afaf38f1820962eba90185088b16dd0de8a95b332e90a50022259e28da20594`
- `/private/tmp/zev-pulse-accent-fswa9cuw/completed-video-qc-v001/summary.json` — `206f6261a9ebe5566aa900400d582994ee9ca3d99d0ba728b87a1aeb4863dbf9`
- `/private/tmp/zev-pulse-accent-fswa9cuw/completed-video-qc-v001/completed-video-pixels.json` — `45ef29af7240bf4bbed92609c5fb1ee812a01e4ab9244bd069eaf2d2d31282a5`
- `/private/tmp/zev-pulse-accent-fswa9cuw/completed-video-qc-v001/overlay-and-plan-verification.json` — `b0ceb237f5444a92ac48ca19f95d6352ab5fe93ae71c45b5fa5d507861d3c9b9`
- `/private/tmp/zev-pulse-accent-fswa9cuw/completed-video-qc-v001/pulse-completed-frames.json` — `c451dbfbad5fa66dbca2bb9ca0053183349ca6390e4b317102720db1e9645c0c`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/final-independent-audit-v001.json` — `94c576e86c740eaebad8028939e698de5392cf3981acc2fd0fddb01450063f07`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/qc-runtime-readonly-v001.json` — `0b8f81287101c348257d57986d56c8ae975759fca25e3cf4a6e89846dc5728a7`
- `/private/tmp/zev-pulse-accent-fswa9cuw/reviews/qc-runtime-readonly-v002.json` — `4851bbda2f7107fadf169c18b7047f6f97eac2b4bf1862317b8df4059e1a097d`
- `/private/tmp/zev-pulse-accent-fswa9cuw/preservation-before-completion-v001.json` — `b2c318127d98fb0af04f431c12b01da8f4360a7069a19796a75fdf3edc266078`
- `/private/tmp/zev-pulse-accent-fswa9cuw/render-timing-final-v001.json` — `61c33238ee96d94a89785b18413dbe79cebb5b571c119371f91dcebe67bb4b12`
- `/private/tmp/zev-pulse-accent-fswa9cuw/final-validation-v001.json` — `46007885d82bcb28317342e3105f5ac41a7bf67b2c3c139faf4265c89bab1ea1`

ローカル素材と生判断はuploadしない。remoteから確認できる実装・検査・本報告と、ローカルで検証したMP4そのものを区別する。checkpoint push後、同じZEV進行管理4の会話へ結果を報告し、次タスクの明示指示を求める。

## 8. 相談役の最終監査と次工程

実装checkpoint `8f1bbd88b242ddb71366f5fae9bce52fee6181b8` をpushし、remoteの同branchが一致することを確認した。同じZEV進行管理4（現表示名ZEV Build Loop）へ報告し、完了した応答を取得した。相談役はPulseを技術第一完成として受理し、必須修正なしと判断した。人間の見心地・正式採用は未判定のまま維持する。

応答全文は `/private/tmp/zev-pulse-accent-fswa9cuw/consultant-response-v001.txt`、SHA-256 `f055d60681b2142ab93b45dba468201f860853c7ff88737f47812d60c205e7d5` に保存した。送信後は停止せず、次工程「反実仮想QC高速化の技術第一完成」のGPT_DECISIONを受領した。

次工程は今回の完成動画・描画・AI判断・保存三層を維持し、旧方式を比較用に残したまま、必要なframeを独立再構成するQC専用方式を調べる。全32字幕・Pulse3点の判定照合、指定された故障注入、専用timerによる同じ入力の時間・処理frame・子process比較が成立した場合だけ通常QCを切り替える。保証の低下や判定相違を未解決のまま採用しない。新演出、旧trust台帳更新、正式採用、main統合、tag、stable、releaseは範囲外である。
