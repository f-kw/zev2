# candidate 13 基本テロップ解決パッケージ対生成 段階実装設計 v001

- 作成日: 2026-07-22
- 状態: **設計提示。未承認・未実装・未実走**
- 主線: 正式残存source atom 354件から、基本テロップだけの指示書と専用解決パッケージを一対で生成する
- 対象: `DmWu0jVQfTE` candidate 13
- 人間作業: 本設計の確認1件。媒体視聴なし。時間計測なし

## 1. 結論

次工程では、354件の文字時刻データを語データへ置き換えない。

354件を本文・時刻・話者証拠の唯一の正本として残し、その上へ次の三つを別々に重ねる。

1. `Intl.Segmenter`による各分割候補がどの文字IDから成るかを示す、決定的な**機械境界証拠**。
2. 分割候補を意味の読めるテロップ単位と改行へ編成した、生成系統付きの**表示計画候補**。
3. 承認済みプリセットで事前に置けることを調べる**配置事前検査**と、実描画PNGで画面外や重なりがないことを確定する**描画後証拠**。

表示計画候補はWeb版Geminiへ一度だけ作らせる。モデルには分割候補IDだけを選ばせ、本文・時刻・ID・改行後本文は決定的なコンパイラが正本から組み立てる。モデルに生の時刻、本文の書き換え、削除、プリセット選択をさせない。

解決パッケージと指示書は、同じ固定入力と同じ表示計画から一対で生成する。空の解決パッケージを先に凍結したり、後から別の指示書へ使い回したりしない。

初の描画は基本テロップだけとする。

- G4〜G7: 付けない。
- 外部素材: 付けない。
- SE: 付けない。
- プリセット: `normal-landscape-readable-pop-v001`で固定。
- 評価: 「読める・発話とズレない・欠けない」の三点だけ。

地味であること、タイトル・サムネイル・冒頭のつかみが無いことを不合格理由にしない。

## 2. 本来の目的の再確認

目的は、既存rendererを形式上通すことではない。

目的は、人間が採用したcandidate 13の映像へ、元発話から追跡可能な基本テロップを載せ、初めて実データで「選択→組立→指示→描画」の配管を一本通すことである。

そのため、次を禁止する。

- `character-timestamp`を`word-timestamp`と名付け直して、現行G2の未検査項目を消す。
- 固定文字数や独自の重みで、意味上の表示区切りを作ったことにする。
- 表示を成立させるために、STT本文の誤字修正、句読点追加、表記正規化、フィラー削除を行う。
- 画面に収まらない結果をrenderer側で黙って縮小・再改行する。
- 一つのcueを、切除済み区間をまたいで表示する。
- candidate 13の結果を見てから、モデル入力、prompt、プリセット、許容条件を変更して再実行する。

## 3. 「相談役の注意3点」の取り込み

会話上で「相談役の注意3点」と呼ばれた原文は、独立したartifactとしてリポジトリ内に残っていない。出所を捏造しないため、本設計では、承認済みの接続準備監査に明記された次の三点を、照合可能な注意事項として取り込む。原文引用だったとは主張しない。

### 注意1: 文字正本と機械境界証拠を分離する

文字354件を捨てない。分割候補は文字ID列から作る派生証拠であり、最終テロップも文字ID列へ戻して本文と時刻を組み立てる。分割候補へ単一の話者値を多数決で付けない。`Intl.Segmenter`の境界を、日本語として正しい語境界だと自動認定しない。

### 注意2: G2の三つの問いを別々に扱う

次を一つの`word-timestamp`ラベルで一括合格にしない。

- 機械が示した分割境界が文字正本と矛盾していないか。また、人間が読んで語途中に見えないか。
- 意味の読める表示単位か。
- 実画面で読める配置か。

機械境界は決定的な完全対応、語としての自然さは初描画時の人間可読性確認、表示単位は生成系統付き候補、配置は事前の幾何検査と描画後の実PNG検査で、それぞれ別の証拠を残す。完全対応が証明するのは文字の欠落・重複がないことであり、日本語としての語境界の正しさではない。

### 注意3: 指示書と解決パッケージを対生成する

各cueに専用targetと`speech-caption`指示を一件ずつ作り、未参照target、未参照cue、指示の無いtargetを残さない。基礎映像の二つの時間対応区間をまたぐcueを禁止する。

貼付原文が上記と異なる場合は、実装承認前に差分を設計追補として固定する。確認できない原文を推測して承認済み条件へ偽装しない。

## 4. 正式入力

実装後の正式jobは、次をpathと実byte SHA-256で固定する。設計段階では読み取りだけに使い、変更しない。

| 処理上の意味 | 正式入力 | 現在の値 |
|---|---|---|
| 残存する文字と時刻 | `outputs/presentation/retained-source-atoms/DmWu0jVQfTE-candidate-13-v001/source-atoms.json` | 354件、区間別248/106件、`character-timestamp` |
| 抽出来歴 | 同directoryの`generation-manifest.json` | 正式job・実装・入力hashを束縛済み |
| 抽出合格記録 | 同directoryの`validation-report.json` | missing/extra/切除混入/境界部分交差=0 |
| 完成映像への時間対応 | `outputs/presentation/base-media/DmWu0jVQfTE-candidate-13-v002/timeline.json` | segment 1=`frame [0,1722)`、segment 2=`frame [1722,2535)` |
| 基礎映像 | 同directoryの`base-media.mp4` | 2,535 frame、4,056,000 sample |
| 承認済み見た目 | `registries/presentation/normal-landscape-preset-registry-v001/` | `normal-landscape-readable-pop-v001` |
| 素材台帳 | 同registryの素材index | 空。初描画では素材参照0件 |

正式残存source atomの固定値は次である。

- artifact ID: `DmWu0jVQfTE-candidate-13-retained-source-atoms-v001`
- source ref: `youtube:DmWu0jVQfTE`
- source provenance: `youtube-format299-video+frozen-format251-audio-v001`
- raw source atoms canonical SHA-256: `cd76bfd2fe7ab3b5156433f6d9e2229b20c3d3bbd7d94f2b9e9abbc804a6efb3`
- speech group: 126 / 122 / 106文字
- raw speaker evidence: `SPEAKER_00` 325件、`unknown` 29件

## 5. 成果物の分離

一つの巨大JSONを正本にしない。機械境界生成、モデル実走、対生成を別の停止点に分ける。最後の対生成jobは、それまでに固定した成果物を同じ所有lock下で読み、解決パッケージ・指示書・生成記録・検査記録を全件検査後に一括公開する。

### 5.1 機械境界証拠

schema: `presentation-segmenter-boundary-evidence-v001`

各分割候補は次を持つ。

- 一意な分割候補ID。
- 親のtimeline segment IDと発話まとまりID。
- 元の連続した文字atom ID列。
- 文字を厳密連結した本文。
- 先頭文字の開始anchorと末尾文字の終了anchor。
- `Intl.Segmenter`が返した種別。語以外の区切りも捨てず、別種別として保持する。

分割候補は話者の単一値を持たない。必要な場合は元文字IDからraw話者証拠を参照する。`SPEAKER_00`と`unknown`が混在する候補を、多数決・既知話者化・途中分割で救済しない。

### 5.2 表示計画候補

schema: `presentation-caption-semantic-plan-v001`

モデル出力は、timeline segmentと発話まとまりの交差で作るcontainerごとに、cue列と各cueの1〜2個の**行末分割候補ID**だけを持つ。全候補IDを列挙させず、直前の行末の次から今回の行末までをcompilerが連続範囲として展開する。省略を許さない今回の契約だから成立する形式であり、除外を表せない`from-to`文字列の流用ではない。

持たせないもの:

- 本文。
- 開始・終了時刻。
- source文字atom ID。
- プリセットID。
- 素材参照。
- G4〜G7の種類。
- 任意のスコア・重み・信頼度係数。

モデルが出したID列以外は、後段が正本から決定的に解決する。分割候補は意味判断の選択肢であって、「真の単語」としては扱わない。

### 5.3 決定的な表示計画

schema: `presentation-caption-display-plan-v001`

コンパイラが、分割候補IDを元文字atom IDへ戻し、次を作る。

- cue ID。
- target ID。
- 1〜2行の文字atom ID列。
- 各行の厳密な元本文。
- cue先頭文字のstart anchor。
- cue末尾文字のend anchor。
- source時刻とtimeline segment ID。

IDはモデルに作らせず、segment順・cue順から決定的に採番する。

### 5.4 専用解決パッケージと指示書

新しい正式入口をv003として設計する。v002を読み替える後方互換分岐は作らない。

- `presentation-resolution-package-v003`
- `presentation-instruction-bundle-v003`
- `presentation-caption-check-v003`
- `presentation-resolution-instruction-pair-generation-manifest-v001`

上記は必要な契約群の版名を予約したものであり、この設計書だけでは実装承認に足るfield-level契約ではない。各schemaの必須field・型・相互参照、`pending_human_review`から人間認定後への状態遷移、違反コード集合と固定順は、機械境界証拠の実装完了後に別の契約設計として提示し、承認を得てから実装する。実装者が本文からfieldを推測してv003を作ることを禁止する。

解決パッケージのsource atomは354件の文字正本である。各cueについて、caption target一件と`speech-caption`指示一件を作る。

指示の固定値:

- 種類: `speech-caption`
- 発火点: cue先頭文字のstart anchor
- 表示終了: cue末尾文字のend anchor
- preset ID: `normal-landscape-readable-pop-v001`
- material refs: 空配列
- simultaneous group: 空配列

全cueを一つのcaption contractへ収める。cue一件を複数target・複数指示へ使わず、targetと指示を一対一にする。

全354文字はcaption target群のどれか一つに必ず所属する。targetへ一度も登録されない文字、複数targetへ登録される文字、削除許可へ入る文字を一件でも検出したら停止する。現行v002が検出しない「sourceにはあるが、どのtargetにも入らない文字」をv003の必須検査へ追加する。

### 5.5 配置事前検査と描画後証拠

事前検査schema: `presentation-caption-layout-preflight-v001`

承認済みpreset registry、font file、canvas、safe areaを実byte hashで固定し、rendererが使う幾何モデルと同じ検査を描画前に実行する。

検査すること:

- 各行が承認済みの表示幅上限36単位を超えない。幅は既存固定規則「U+0000〜U+00FF=1、それ以外のUnicode code point=2」で元本文から機械計算し、モデル申告値を使わない。
- 2行を超えない。
- 事前幾何モデル上の外枠がsafe areaを越えない。
- 同一cue内の行が重ならない。
- 各cueの本文が0文字でない。
- 指定プリセットが実際に解決されたプリセットと一致する。

表示幅36単位・2行と文字幅規則は今回新たに作る係数ではなく、人間がpreviewで承認した`caption-core-v001`と現行rendererの既存契約値である。ただし、事前幾何モデルだけを実配置合格と呼ばない。

現行の事前layout inspectorは実フォントで描いたPNGを測る検査ではない。真の描画証拠は、後続rendererが各overlayを実際に二度描き、font fallbackなし、byte決定性、alpha bounds、行の正の交差、safe area、最終動画の欠落を調べた結果で初めて成立する。したがって、解決パッケージ対生成の時点では`layout_preflight_passed`まで、実描画前は`rendered_layout_qc=pending`と正直に記録する。

## 6. 機械境界証拠の決定的な作り方

### 6.1 分割単位

次の境界を越えて文字を連結しない。

1. timeline segment境界。
2. 発話まとまり境界。

各まとまり内の本文を元文字順に連結し、`Intl.Segmenter('ja', { granularity: 'word' })`へ渡す。

### 6.2 文字への逆写像

`Intl.Segmenter`のindexはUTF-16 code unit基準なので、元文字atomごとのUTF-16範囲を先に構築する。segmenter境界がatom内部へ落ちた場合は救済せず停止する。

各文字atomはちょうど一つの分割候補へ所属しなければならない。欠落、重複、順序逆転、非連続ID、segmentまたぎ、発話またぎは不成立とする。

分割候補本文は、構成文字本文の厳密連結と完全一致しなければならない。Unicode正規化を行わない。

### 6.3 実行環境の束縛

正式な生成記録に次を残す。

- 解決後のNode実行file path。
- Node binary SHA-256。
- Node version。
- ICU version。
- locale=`ja`。
- granularity=`word`。
- segmenter出力全体のcanonical SHA-256。
- 全分割候補の構成文字ID列canonical SHA-256。

候補13の読み取り診断では354文字から205分割候補を作れ、全文字の厳密対応に成功している。この205件は正式期待値として実装後のjobへ固定するが、設計書だけを根拠に正式成果物とは呼ばない。この診断は文字の欠落・重複がないことだけを示し、205箇所すべてが日本語として自然な語境界であるとは示さない。

## 7. 意味上の表示計画を作るモデル契約

### 7.1 生成系統

- 生成系統: `caption-plan-v001@gemini-web-flash`
- 実行面: Microsoft Edge上のWeb版Gemini
- run: 1
- 入力: 3 containerを一つにした単一payload。窓分割・後段統合なし
- 対象: candidate 13の一件だけ
- 事前固定: prompt本文、prompt hash、入力manifest、モデル表示名、窓数、出力schema
- 実行後: 出力保存後に、その処理で開いたGeminiタブを閉じる

実走時に画面で確認できた実モデル名を記録する。モデル名を確認できない場合は実行せず停止する。

今回の意味判断は354文字・205分割候補の一つの入力を、連続した表示境界へ分ける限定作業である。現行の評価対象であるGemini Web Flashで開始し、初回から強いモデルへの差し替えは要求しない。形式不成立や意味不成立が出ても、同じ版のまま強いモデルへ無断で切り替えず、人間へ別版の判断を求める。

### 7.2 モデルへ渡す情報

渡すもの:

- timeline segment ID。
- 発話まとまりID。
- 分割候補IDと本文を元順に並べた列。
- 同じ分割候補の連結による発話全文。
- approved presetの上限: 一行の表示幅36単位、最大2行。各分割候補には、正本本文から既存規則で計算した表示幅を併記する。
- 「意味の読める短い単位」「機械分割候補の途中で切らない」「全分割候補を順番どおり一度だけ使う」という仕事の説明。機械分割が日本語として不自然な可能性は既知限界として残す。

渡さないもの:

- 教師切り抜き、expectedCuts、既存教師テロップ。
- 人間がどこで区切るかという正解例。
- candidate-rankingの人間ラベル。
- G4〜G7正解候補。
- 生のmillisecond値。
- 描画済み動画。

### 7.3 出力契約

モデルは、完全な順序付きpartitionを定義する行末分割候補IDだけを返す。

- top-level statusは`complete`または`abstained`だけ。確信が持てない場合は`abstained`を返せる。
- `complete`では、container内で行末IDを厳密昇順に並べ、最後の行末IDをcontainer最終分割候補IDと一致させる。
- cueとlineの両方で元順を保つ。compiler展開後に全分割候補IDを一度だけ使用する。
- 一つのcueは一つのtimeline segment・一つの発話まとまり内に収める。
- 一つのlineは承認済み表示幅上限36単位以内。合計値はcompilerが元本文から再計算する。
- 一つのcueは1〜2行。
- 削除、追加、並べ替え、自由な開始ID、`from-to`文字列を禁止する。
- text、時刻、理由文、スコアを出力しない。

意味上の区切りを表示幅だけで決めない。36単位は承認済み配置の上限であって、36単位まで詰める目標ではない。

### 7.4 一回性と停止条件

`abstained`、未知ID、終端不足、終端重複、順序逆転、container違い、3行以上、表示幅36単位超過、schema外fieldが一件でもあれば不成立として停止する。compiler展開後に欠落・重複・segmentまたぎ・発話またぎがないことも再検査する。

結果を見てprompt、入力、上限、モデルを変えて同じ版を再実行しない。再実行が必要なら、失敗理由と変更点を人間へ申告し、版を分けて別承認を求める。

ブラウザ・通信障害でモデル出力を一件も受領できなかった場合も、自動再試行せず停止する。

### 7.5 入力漏洩検査

入力manifestは正式残存source atom、機械境界証拠、承認済みpresetの表示上限だけをallowlistにする。expected、教師clip、教師テロップ、人間評価、過去の表示計画が入力に含まれたら実行前に停止する。

## 8. G2の合否表現を正す

現行v002は`character-timestamp`なら三項目すべてを限界付き、`word-timestamp`なら三項目すべてを合格相当に扱う。v003では次を独立させる。

| 検査対象 | 描画前の状態 | 根拠 |
|---|---|---|
| 機械境界証拠の整合 | `segmenter_boundary_evidence_passed`必須 | 分割候補と全354文字の完全対応。欠落・重複がないことだけを証明 |
| 日本語として自然な切れ目 | `pending_human_review` | `Intl.Segmenter`の境界は候補であり、初描画の「読める」確認で判定 |
| 表示計画の構造 | `passed`必須 | 全分割候補IDの一回使用、順序、1〜2行、segment内完結 |
| 意味上の読みやすさ | `pending_human_review` | 版付きモデル候補。機械正解はまだ無い |
| 配置事前検査 | `passed`必須 | 承認済みpresetと既存幾何モデルによる外枠検査 |
| 実描画の配置・欠落 | `pending_render_qc` | 後続rendererの実PNG・最終動画QCでのみ確定 |

`pending_human_review`を`passed`と呼ばない。日本語として自然な切れ目と意味の読みやすさは、描画物を見ないと判定できないため、正式な公開物ではなく**人間確認用描画**だけを許す状態を新設する。人間への問いは増やさず、初描画の「読める」に両方を含める。

人間確認用描画のmanifestには、次を必須記録する。

- `reviewOnly: true`
- `semanticReadability: pending_human_review`
- `renderedLayoutQc: pending_render_qc`
- 解決パッケージID/hash
- 指示書ID/hash
- 機械境界証拠ID/hash
- 表示計画ID/hashと生成系統
- renderer版
- preset registry版
- material registry版

公開可能・正式合格とは記録しない。既存renderer v002の`passed_with_declared_limit`拒否は維持し、v002へ例外を足さない。将来の描画設計で、v003の人間確認用入口を別契約として追加する。

## 9. 解決パッケージと指示書の対生成

一つの正式jobが、固定済み表示計画から次を同時に組み立てる。

1. 354文字をsource atomとして保持した解決パッケージ。
2. 全cueを持つcaption contract。
3. cueごとのcaption target。
4. cueごとの`speech-caption`指示。
5. 機械境界・表示計画・preset・入力を束縛する生成manifest。
6. G1〜G3、指示書外枠、timeline対応、配置事前検査のvalidation report。

生成manifestは、現行v002の`sourceArtifacts`へ異なる証拠を同じsourceRefで詰め込まない。次を役割別の別欄に持つ。

- 一次source: 正式354文字artifact一件。
- 派生証拠: 機械境界成果物一件。
- 意味計画: 固定prompt、固定入力、Geminiのraw output、検査済みplanの各path/hash。
- 実行来歴: 生成系統、実モデル名、run番号、実行日、prompt台帳版。
- 接続先: timeline、preset registry、preset validation index、空material index、trust bindingの各path/hash。
- 出力: resolution package、instruction set、bundle、validation reportのcanonical hashとfile hash。

対生成は、解決パッケージをメモリ上で作ってcanonical hashを確定し、そのhashを参照する指示書を作る。両方とmanifest・検査記録を同じtransactionで原子的に公開する。片方だけの公開を許さない。

生成順は次で固定する。

1. 全入力の実byte hashとschemaを検査する。
2. 機械境界証拠の完全対応を検査する。
3. 固定したGemini raw outputの実byte hashを照合し、行末ID列と、それを展開した完全partitionを検査する。
4. 文字IDへ戻して本文・anchor・cue・target・指示を決定的に構築する。
5. G1〜G3 v003を検査する。
6. 指示書外枠v003を検査する。
7. cueがtimeline segment内に完全包含されることを検査する。
8. presetを固定して配置事前検査を行い、実PNGによる描画後検査は未実行と明記する。
9. 全出力hashを計算し、一時directoryから原子的に公開する。

一段でも不成立なら正式出力を公開しない。

## 10. 実装ゲート

### 10.1 ゲートA: 今回の設計承認で実装してよい範囲

評価環境内だけへ、次の二部品を新規実装する。

1. 文字正本から機械境界証拠を作る決定的generator・checker。
2. 実行環境・入力hash・期待件数を固定し、正式outputを書かずにcandidate 13の読み取り専用preflightを行うrunner。

ゲートAは意味上の表示計画、v003解決パッケージ、指示書、配置検査を作らない。`Intl.Segmenter`による分割候補と354文字の完全対応を検査するだけで、日本語として自然な切れ目を合格認定しない。

### 10.2 ゲートB: 次の設計提示まで実装禁止

ゲートAの完了報告後、次をfield-level契約として一枚に固定して提示する。

- `presentation-resolution-package-v003`、`presentation-instruction-bundle-v003`、`presentation-caption-check-v003`、対生成manifestの必須field・型・相互参照。
- 機械境界証拠、意味計画、表示計画、解決パッケージ、指示書の版参照関係。
- 意味可読性と自然な切れ目が未認定の状態、人間確認用描画を許す状態、人間認定後の状態遷移。
- 各checkerの違反コード集合、固定順、CLI終了コード。
- source-onlyのGemini入力、leak検査、raw出力、compiler、配置事前検査、原子的対生成の責務境界。

この契約設計が承認されるまで、prompt builder、Gemini出力checker、表示計画compiler、caption checker v003、instruction bundle v003、resolution package v003、layout checker、正式対生成runnerを実装しない。

promptを追加する場合は、prompt本体とprompt版台帳を同一コミットで更新する。既存v002コードは実験記録として保持し、新jobから呼ばない。v003がv002入力を推測変換する後方互換を作らない。

## 11. 合成検査

ゲートAの実装完了条件は§11.1である。§11.2〜11.3は、ゲートBのfield-level契約を作るときに落としてはいけない検査要求であり、今回の実装承認には含めない。件数は各実装後に実数で報告し、設計段階で都合のよい固定件数を作らない。

### 11.1 機械境界証拠（ゲートA）

- 正常な日本語。
- 句読点・空白等の非word-like要素を欠落なく保持。
- surrogate pair、結合文字を含む入力。
- segmenter境界が一つのatom内部へ落ちる入力。
- 元文字の欠落、重複、時刻逆転。
- 元文字の正の時刻重なりは、既存契約どおり拒否でなく観測として記録し、文字列順を時刻から推測修正しない。
- timeline segmentまたぎ、発話まとまりまたぎ。
- raw話者が一分割候補内で混在する入力を、話者決定せず保持。
- Node/ICU/locale/granularity/hash不一致。
- 同一入力の決定性。

### 11.2 モデル出力とcompiler（ゲートBの次回契約要件）

- `abstained`、未知の行末ID、最終語まで届かない行末列、行末の重複・逆順。
- compiler展開後の欠落、重複、逆順。
- segmentまたぎ、発話またぎ。
- 空cue、空line、3行以上。
- 表示幅36単位を超えるline。
- text、時刻、理由、スコア等の禁止field。
- 元本文の厳密連結不一致。
- 354文字のうち、どのcaption targetにも属さない文字、または複数targetへ属する文字。
- cue開始・終了anchorのずれ。
- 同一cueの複数target、同一targetの複数指示。
- 切除済み区間の文字参照。
- timelineに完全包含されないcue。

### 11.3 契約・配置・job（ゲートBの次回契約要件）

- 機械境界証拠なしで意味計画だけを合格させる入力。
- 粒度名だけ`word-timestamp`へ変えた入力。
- 意味未認定状態を公開用合格へ昇格する入力。
- preset、font、registry、入力artifactのhash差し替え。
- 固定prompt、固定入力、Gemini raw output、検査済みplanのhash差し替え。
- 解決パッケージと指示書の相互ID・canonical hash不一致、片方だけの公開。
- 画面外、行同士の重なり、空表示。
- 指定presetと実適用presetの不一致。
- `speech-caption`以外の指示、空でない素材参照、G4〜G7指示を初描画policyが拒否すること。
- 既存出力、他者lock、途中差し替え、公開直前差し替え。
- 正常終了0、契約不成立1、使い方誤り2のCLI終了コード。
- 既存G1〜G3、instruction、timeline、base-media、rendererの全回帰が不変。
- 新v003入口がv002入力を拒否し、既存v002入口は既存v002回帰だけを従来どおり通す。

## 12. candidate 13読み取り専用preflight

ゲートAの実装・合成検査の後、正式354件を読み取り専用で通し、次を報告して停止する。

- 入力hashが§4と一致する。
- 354文字が一度ずつ機械境界証拠へ所属する。
- 分割候補数が既存診断の205件と一致する。
- segment別138/67件と一致する。
- 混在raw話者を含む分割候補12件、`unknown`だけの分割候補11件を、話者推定なしで保持する。
- 分割候補本文の全連結がsegmentごとの元本文と一致する。
- 正式output directoryへ何も書いていない。

このpreflightの205件は機械分割の決定性と文字の完全対応を確認する値であり、日本語として正しい語境界数でも意味cue数の期待値でもない。cue数・行数を事前に独自固定しない。

## 13. 段階と停止点

### 今回求める承認

本設計の全体方針と、ゲートAの実装承認だけ。ゲートB以降は説明のための設計予告であり、実装承認に含めない。

### 設計承認後に進める範囲

- §10.1の機械境界証拠generator・checkerと読み取り専用runnerの実装。
- §11.1の合成検査。
- §12の読み取り専用preflight。
- ゲートAの実装完了報告。

ここで停止する。

### さらに別承認が必要なもの

- ゲートBのfield-level契約設計と、その後の実装。
- candidate 13の正式機械境界成果物生成。
- Web版Geminiのprompt入力生成とrun 1実走。
- 表示計画・指示書・解決パッケージの正式対生成。
- renderer v003の人間確認用入口の設計・実装。
- 実動画描画。
- 人間による「読める・ズレない・欠けない」の三判定。
- G4〜G7、素材、SE、タイトル、サムネイル、冒頭のつかみ。
- callback、層2、残りcandidate 11・12・36、新素材。

## 14. 人間作業量

- 本設計の確認: **1判断**。媒体視聴なし。時間計測なし。
- 承認後のゲートA実装・合成検査・読み取り専用preflight: **0件**。
- 正式生成とGemini実走: 人間作業0件だが、別の実行承認1件。
- 初描画後: 一つの動画に対する「読める・ズレない・欠けない」の3判断を1セッションで依頼する予定。時刻入力、編集作業、時間計測は要求しない。媒体ができた段階で実際の視聴尺と操作回数を先に申告する。

## 15. 完了報告に含める内容

- 機械境界証拠generator・checkerの合成検査件数と全違反コードの発火確認。
- ゲートAが触れる既存回帰の件数と結果。
- 決定性、CLI終了コード、入力hash固定、正式output不作成の結果。
- candidate 13読み取り専用preflightの354文字・205分割候補の完全対応。
- 完全対応は文字の欠落・重複なしを示すだけで、自然な語境界を合格認定していないこと。
- 実装で新たに判明した制限。
- v003契約・対生成器・正式成果物・Gemini・描画をまだ実装・実行していないこと。
- 人間作業0件。

## 16. 承認文案

> candidate 13 基本テロップ解決パッケージ対生成 段階実装設計v001の全体方針と、ゲートAを承認する。文字354件を唯一の正本として維持し、機械境界証拠・意味表示計画・配置事前検査・描画後証拠を分離する。`character-timestamp`を`word-timestamp`へ名付け直して現行G2を通すこと、`Intl.Segmenter`と文字の完全対応を自然な語境界の証明と呼ぶこと、固定文字数を意味分割へ読み替えること、本文・時刻・話者を推測修正することを禁止する。今回の実装範囲は、機械境界証拠generator・checker、合成検査、candidate 13の読み取り専用preflightだけとする。v003各schemaのfield・版参照・状態遷移・違反コードを固定する契約設計と、その実装は次の別承認とする。正式機械境界成果物、Web Gemini実走、指示書・解決パッケージ正式生成、renderer v003、人間確認用描画も別承認とする。初の一本は基本テロップのみで、評価は読める・ズレない・欠けないに限定する。前振りは凍結のまま、他の新規作業へ進まない。

## 17. 改訂履歴

- 2026-07-23 / kawafmm承認: `evals/clip_composition/reports/presentation/presentation-gate-a-implementation-contract-addendum-20260723-v001.md`を承認。本設計の§5.1、§10.1、§11冒頭・§11.1、§12、§15は、同追補§2に列挙した範囲で改訂承認された。実装時は、本設計v001と承認済み追補v001を一組の正本として読む。設計本文は履歴保持のため書き換えず、承認済み追補への案内だけを追加した。
