# CURRENT_GOAL — 目的ファイル

本ファイルはkawafmmの言葉に基づく相談役のみが書き換える。Codexは作業着手時・停止からの再開時に読み、報告冒頭へ4項を転記する。転記できない・食い違う場合は停止。

## 1. 今の目的（1行・kawafmmの言葉）

過去の字幕判断を持たない新しい正式selectionについて、AIによる正式な字幕区切り判断を生成し、その結果を既存の候補非依存execution flowへ接続してrenderer・QCまで通す。（2026-08-30 kawafmm）

## 2. 主計画上の現在位置

正式意味発話、コメント起点、Luna入力・B5・B6、試作動画、human review v004、一般human quality review result、一般区間化計画v002まで固定済み。さらに、正式selectionから字幕区切り結果、候補非依存presentation execution、renderer、技術QCまでの一般経路が2候補で成立し、実装・検査・commit・tagが完了した。Chromium障害は完了扱いとする。現在は、過去の字幕判断を持たない新しい正式selectionへAI字幕区切り判断を接続する段階。字幕の見た目は途中状態を保持する。

## 3. 今の作業とそれが目的へどう繋がるか

過去の字幕判断を持たない正式selection 1件について、確定済みの発話本文・順序・区間を変えず、AIに字幕の意味的区切りと行末だけを判断させる。AI出力を契約検査済みの正式字幕区切り成果物として固定し、既存の候補非依存presentation execution、renderer、技術QCまで実際に通す。

## 4. 今回やらないこと

新しい素材取得 / 素材利用条件の変更 / selectionされた前半・後半区間の変更 / 遠方接続の意味・candidate採否・発話内容・source provenance・renderer仕様の変更 / AI字幕判断の大量処理・無制限再試行・失敗後の有料再試行 / provenanceを弱める変更 / composition・main workflow接続 / 正式ショート化 / 既存正式成果物の削除・上書き / push・remote操作
