# 江戸前 Edomae

## 日本語

万華京ジパングの世界を、横から見た線画の地球として描く別プロジェクトです。地球をドラッグで回すと、
十の時代と八つの異界が地平線の向こうから現れます。いちばん手厚く描いたのは江戸の二つの時片です。

- **同じ世界・同じ暮らし** — 世界データと自律経済は `zipangu/` のものを読むだけ（書き換えず、保存もしません）。
  住人は商い、考え、旅に出るときは時層鳥居まで歩いてくぐり、着いた先の鳥居から歩いて出てきます。
- **銭が手から手へ** — 住人が商うと、店先の主人とのあいだで銭さし・小判（江戸）、貨幣や紙幣、切符（銀河鉄道）などが
  弧を描いて渡り、品物が返ってきて、二人が礼をします。浮かぶ金額は経済の実際の数字です（蛍銭など、その土地の通貨で）。
  桜の森では値をつけないので、礼だけが交わされます。
- **瓦版と新聞** — 読売が瓦版を掲げて呼び込み、数人が一枚をのぞき込みます。読み手にふれると紙をこちらへ向け、
  見出しを見せてくれます。見出しはこの経済で実際に起きた出来事の一行です。
- **生きものと人** — 縁台の猫（ふれると起きて伸びをする）、人のかかとについて歩く犬、通る人に飛び立つ雀、鶏とひよこ、
  荷を負う馬、月の兎。立ち話と会釈、風車を持った子ども、団子や焼芋の屋台、夕暮れに窓から呼ぶ人。
- **万世時計の昼と夜** — 不定時法の時刻に合わせて紙と空が移ろい、灯りが一つずつ点き、夜は銀河鉄道が空を渡ります。

動かし方：`python3 -m http.server` をリポジトリの根で起動して `/edomae/` を開きます。
確認用のURLフラグ：`?debug`（`window.__step(秒)` で1/60秒ずつ進める）、`?tau=0.5`（時刻の色を固定）、
`?speed=N`（経済の速さ）、`?at=<placeId>`（その時片から始める）。

**つぎに**：薄い時片（月の都・イーハトーヴ・昭和・夢十夜回廊・縄文）の暮らしをもっと描く／住人の連れの鳥と蝶を描く／
雨と雪／GPU のある実機で 60fps を確かめ、インクの揺らぎフィルタを軽くする方法を探す。

## English

A separate spin-off that draws the world of Kaleidoscope Zipangu as a line-art globe seen from the side.
Drag to turn it and the ten eras and eight realms come over the horizon; the two Edo places are drawn
richest.

- **Same world, same life.** It only reads `zipangu/`'s world data and autonomous economy (it never writes
  to them or saves anything). Residents trade and think, and travel by walking to their place's time-gate
  and stepping through it.
- **Money changing hands.** When a resident trades, strung coins or gold (Edo), coins and notes later, a
  green ticket on the Galaxy Railway and so on travel hand to hand with the keeper; the goods come back,
  both bow, and the economy's real amount floats up in the local currency. The cherry forest asks no
  price, so only a bow passes there.
- **Kawaraban and newspapers.** A crier calls out with sheets over his arm and a few people read one
  together. Tap a reader and they turn the sheet toward you: the headline is a real line from this economy.
- **Animals and people together.** A cat on the bench that wakes and stretches when tapped, dogs at their
  people's heels, sparrows that flush, hens and chicks, a packhorse, the moon's rabbit; neighbours chatting
  and bowing, a child with a pinwheel, dango and roast-potato stalls, someone calling from a window at dusk.
- **Day and night** follow the economy's unequal-hours clock; lights come on one by one and the Galaxy
  Railway crosses the night sky.

Run it: serve the repository root (`python3 -m http.server`) and open `/edomae/`. Flags: `?debug`,
`?tau=0.5`, `?speed=N`, `?at=<placeId>`. Checks: `bash edomae/tools/check.sh`.

**Next:** more everyday life in the thinner places (the Moon, Ihatov, Shōwa, the Ten Nights, Jōmon);
draw the residents' bird and butterfly companions; rain and snow; confirm 60 fps on a GPU-backed device
and find a lighter way to do the ink wobble.

Module contracts: [`js/INTERFACES.md`](js/INTERFACES.md). Third-party code: [`THIRD_PARTY.md`](THIRD_PARTY.md).
