# 設定画と四画面の検証 — 2026-10-10

全128主題の設定画、住人32人の4姿勢を原寸PNGで採用。正本world/*.jsonは変更していません。素材の原典・実生成プロンプト・改訂・目視記録は各VISUALS/PROMPTS資料に保存しています。

## 実ブラウザ

Chromiumで1280×800と390×844の地図・図鑑・相場・案内を確認し、全8画面でJavaScriptエラー0、横はみ出し0。画像読込、地図の選択と拡大、相場のホバー・フォーカス・通常タップを検証しました。

- 地図はCanvasのdrawImage呼出しを記録し、通常倍率でも原画生物と32人の行動シートを実際に描画。選択時片の案内内に江戸算額の景観PNGを読込。
- 相場チャートはHome=最初の観測、右キー=次、End=最新。初期31実観測、直近半日は25点。集計範囲、実観測の時刻、現在価格の基準比と期間内変化を別表示。
- hasTouch/isMobileの390幅contextで4番目の品目へスクロールし、通常tapで選択。1.2秒後にもチャートを表示したまま保持、価格線をタップして観測点12を選択。リストへ戻すボタンで縮小。force操作なし。
- 時斑はclock.koku=9→3へ局所点灯が移り、停止後は3を保持。算珠はphase=0とphase=.5で背珠の局所描画が変化。
- 万華蝶の羽打ちごとにseedが変わり、停止後は同じseedを保持。外形と十本金輪のPNGは無加工。
- 雷蛍は両国・国友・黒輪の独立した地区群。地域選択と地区は東4秒／西2秒を使用。
- reduced-motionでは左右の翅と本体のanimationName=none、万華蝶のseedを保持。
- 金鶏・銀杏鳥・静兎・鯱のpresenceは純粋モジュールで季節／刻／実初鳴き祭の開始・翌朝を検証。圧縮暦であり、実日付の元旦を新設していません。

変更前後の画面はローカルのoutput/playwright/ui-before-{desktop,mobile}-{map,bestiary,market,about}.pngとui-after-...png。選択地図はui-after-desktop-map-selected.png、案内途中はui-after-{desktop,mobile}-about-mid.png、実タップはui-final-real-touch-chart.png。スクリーンショットとdistはGitに同梱しません。

## チェックと配布

bash scripts/check.shを通過。Macの上位CommonJS package.jsonとtmp実パスの影響を避けるため、README記載の/private/tmpコピー＋TMPDIR=/private/tmpでbash zipangu/tools/check.shを実行し、world、抽出器、経済シミュレーション、128PNGと32pose、観測履歴、presence、構文をすべて通過。

node zipangu/tools/build-single.mjsは全原寸PNG・32行動画・アルビレオの対の両素材を埋め込んだ単一HTMLを生成。418MB程度となるため通常は遅延読込する静的配信を利用し、原画を劣化させません。

## 表現範囲

景観18点は静止コンセプト画、万世時計と地図が時間連動を担います。漏刻亀の水流、まどか蜻蛉の円、望月兎の上げ杵、誓いを果たした百年百合は特定瞬間・状態の設定画で、追加画にない動作や未達契約状態を再現したとは称しません。価格はこの街のシミュレーション内の観測で、架空OHLC・出来高や現実の金融データを加えていません。
