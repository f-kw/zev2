# CURRENT_GOAL — 目的ファイル

本ファイルはkawafmmの言葉に基づく相談役のみが書き換える。Codexは作業着手時・停止からの再開時に読み、報告冒頭へ4項を転記する。転記できない・食い違う場合は停止。

## 1. 今の目的（1行・kawafmmの言葉）

Luna B6が正式入力に存在する発話ID・anchor IDだけを参照して候補を返すよう、候補生成の参照整合性を強化し、UNKNOWN_ANCHOR_IDによる候補消失を防ぐ。（2026-08-30 kawafmm）

## 2. 主計画上の現在位置

正式意味発話、コメント起点、Luna入力・B5・B6、一般区間化、一般人間品質評価、candidate review、候補非依存presentation execution、renderer、技術QCまでの経路は固定済み。更新済み探索条件によるB6はHTTP 200でraw候補2件を返したが、2件とも正式入力に存在しないanchor IDを参照し、strict validatorが正式候補への昇格を拒否した。現在は、AIに正式IDを自由記述させる構造をやめ、参照解決を決定論的コードへ移す段階。字幕の見た目は途中状態を保持する。

## 3. 今の作業とそれが目的へどう繋がるか

Lunaには正式入力配列上の拘束された参照値だけを返させ、ローカルコードがその値を正式anchor ID・発話IDへ一意に解決する。範囲外、重複、順序不整合、direction不整合は引き続きfail-closedとし、AI出力から未知IDを推測・補完しないことで、意味探索と参照解決の責務を分離する。

## 4. 今回やらないこと

Luna/OpenAI通信 / Gemini通信 / 今回raw候補の救済・補正・区間化・review MP4生成 / 新候補生成 / 正式selection昇格 / AI字幕区切り / presentation execution / 正式renderer・技術QC / 完成short化 / composition・main workflow接続 / 既存正式成果物の削除・上書き / push・remote操作
