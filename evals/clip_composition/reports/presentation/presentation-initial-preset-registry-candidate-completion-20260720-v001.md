# 通常動画向け 初期プリセット台帳候補・認定preview 実装完了報告 v001

日付: 2026-07-20

状態: **人間認定待ち。正式プリセット台帳、正式空素材index、信頼binding、正式レンダラーは未作成。**

## 1. 結論

承認済み設計どおり、通常横長動画向けの固定1プリセット候補と、その見た目・終了方針・素材方針を人間が確認する実描画previewを作成した。

- 候補プリセットID: `normal-landscape-readable-pop-v001`
- 形式: 1920×1080 / 30fps / 音声あり
- preview尺: 26.875秒
- 見本: 演出指示書の10種類を固定順で各1区間
- 外部素材: 正式登録0件
- G7: preview専用の合成カードだけを見本表示。正式素材・実指示・信頼bindingには入れていない
- 人間確認: 5判断・1セッション、目安5〜10分、時間計測なし

この成果物は認定媒体であり、正式レンダラーの実装・受入合格を意味しない。

## 2. 作成物

### 実装・候補入力

- `evals/clip_composition/build_presentation_initial_preset_review.mjs`
- `evals/clip_composition/inspect_presentation_preset_layout.ts`
- `evals/clip_composition/presentation_initial_preset_review.test.mjs`
- `evals/clip_composition/candidates/presentation/normal-landscape-readable-pop-v001.json`
- `evals/clip_composition/candidates/presentation/normal-landscape-readable-pop-preview-plan-v001.json`

### 人間確認一式

- `evals/clip_composition/outputs/presentation/initial-preset-registry-candidate-20260720-v001/review.html`
- `evals/clip_composition/outputs/presentation/initial-preset-registry-candidate-20260720-v001/media/normal-landscape-readable-pop-preview-v001.mp4`
- `evals/clip_composition/outputs/presentation/initial-preset-registry-candidate-20260720-v001/preview-manifest.json`
- 同ディレクトリ内の候補台帳、薄い検査index、空素材index、代表frame、透明描画

## 3. 処理の意味

1. 人間が実際に見る完全な候補台帳から、既存の演出指示書検査に渡す薄いプリセットindexを決定的に生成する。
2. 素材登録0件の候補indexを作り、G7以外の9種類が成立し、G7の実指示だけが素材不足で明示失敗することを既存検査器で確認する。
3. 承認済み配信者の取得済み元配信を背景にし、候補台帳の固定値だけで10種類を描画する。
4. 実文字の行数・行同士の正の交差、安全領域、実描画の存在、フォント読込、代表画像の決定性、動画・音声・尺を、人間へ渡す前に機械検査する。
5. 人間は1ページで動画と10チャプターを見て、Q1〜Q5を後から変更し、結果をコピーできる。時刻入力、時間計測、サーバー保存は置かない。

## 4. 実装中に止めた不具合

- 初回候補では、描画部品の文字幅計算により、明示した二行がさらに分割され、行同士が正に交差した。文字を場面ごとに縮小せず、候補台帳の固定改行幅と行送りを修正した。
- 補足カードの実描画が右の安全領域を越えたため、候補台帳の固定位置を内側へ修正した。
- 透明画像の外接領域取得で、画像の仮想キャンバス座標を読まず切り抜き後の原点だけを読んでいた。実座標を読む検査へ修正した。
- 元配信ファイルが2GiBを超えるため、一括読込によるhash計算を止め、ストリームでSHA-256を計算するようにした。

いずれも人間へ壊れた媒体を渡す前のpreflightで検出・修正した。

## 5. 検証結果

- 既存G1〜G3検査: 24/24 pass
- 既存演出指示書外枠・接続検査: 27/27 pass
- 今回の候補台帳・認定媒体検査: 9/9 pass
- 合計: **60/60 pass**
- 演出指示書外枠違反コード109件の既存全発火確認を維持
- 10種類すべて実描画あり
- 実文字の二行正交差: 0件
- 安全領域外: 0件
- 管理fontと偽の代替fontの描画差: あり（黙示fallbackなし）
- 代表画像の再描画hash: 一致
- MP4: H.264 1920×1080、AAC音声あり、26.875秒
- 外部取得・新規LLM実走: なし

## 6. 人間に判断してほしいこと

1. 見た目を初期候補として採用できるか。チェック項目は、敗北した素の基本テロップ不使用、可読性、種類ごとの最低限の変化。
2. 通常発話は発話計画の終端、他9種類は対象の最終発話要素で終了する方針を承認するか。
3. 初期コメント・話者名札は文字だけ、G7だけ実素材必須という方針を承認するか。
4. 素材登録0件で開始し、G7実指示を止める方針を承認するか。
5. previewと上記4方針を一組として正式台帳v001へ昇格してよいか。

Q1〜Q4の一括承認は用意したが、Q5は独立操作のままにした。

## 7. 停止点

人間回答まで停止する。全5問が承認された場合だけ、見た候補の内容を変えずに正式台帳と正式空素材indexへ昇格し、両indexのhashを持つ信頼bindingを同一コミットで固定する。1件でも修正なら正式化せず、修正版previewを別履歴として作る。

副線のGT-03文書判定・話者欄契約改訂候補は、別成果物・別コミットであり、この報告の承認判断へ混ぜない。

