# 竜宮・遠野・物語世界ほかの生き物19種 制作記録

原典: source/zipangu/world/creatures.json（description/ecology/visual）。具体の形/物語に矛盾するgeneric visual.shapeは本文の生物構造を優先する。built-in image_genで個別一呼び出し、真正alphaを保持しraw assets/creaturesに保存。正本未指定の画角/素材細部は意匠提案、経済役割を増設しない。採取は落ちたものだけ。クラムボン、座敷童子、静兎、百年百合は販売描写/価格なし。シートは不要、固有motionをページへ提案する。

最初6点は自己目視・1254x1254RGBA/alpha0..255・alpha32閾値で全形余白確認済。残13点は生成中であり、保存/検証済とは数えない。

## 極楽蜘蛛 (gokuraku_gumo)

採用可能: assets/creatures/gokuraku_gumo.png

原典: 蓮の葉の上に一匹ずつ住む、小指の爪ほどの蜘蛛。体は磨いた銀のようで、丸い背には蓮の花びらのような淡い桃色の模様が六枚、花の形に並ぶ。八本の脚は細い硝子棒のように透けていて、関節ごとに朝露の玉が一粒ずつ光る。蓮の葉の縁から銀の糸を一本だけ垂らし、その糸は鋼より強く羽より軽く、月の光を受けると根元から先へ七色がゆっくり流れていく。糸を伝って降りるとき、琴の弦をはじいたような高い音がひとつだけ鳴る。

動き推奨: 一本の糸方向へ微かな上下動、関節露玉は局所反射。自由な糸張り替えを表す。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT gokuraku_gumo: ONE actual SPIDER, eight translucent slender glass-rod legs with one dew bead at each joint; polished silver round abdomen bears EXACT SIX pale pink lotus-petal markings in flower arrangement. Tiny nail-sized animal magnified as natural-history specimen, visibly two main body sections, no insect antennae or beetle shell. Perched on ONE modest lotus-leaf edge, from leaf ONE SINGLE silver silk thread hangs, restrained seven-color progression down thread. Wholethread ends inframe. No cage/harness, no building elevator contraption.
Canonical description: 蓮の葉の上に一匹ずつ住む、小指の爪ほどの蜘蛛。体は磨いた銀のようで、丸い背には蓮の花びらのような淡い桃色の模様が六枚、花の形に並ぶ。八本の脚は細い硝子棒のように透けていて、関節ごとに朝露の玉が一粒ずつ光る。蓮の葉の縁から銀の糸を一本だけ垂らし、その糸は鋼より強く羽より軽く、月の光を受けると根元から先へ七色がゆっくり流れていく。糸を伝って降りるとき、琴の弦をはじいたような高い音がひとつだけ鳴る。
Ecology and conceptual fidelity: 内之浦の山あいの蓮池に住み、蓮の花粉と葉にたまった朝露をなめて暮らす。一匹が垂らす糸はいつも一本だけで、満月ごとに古い糸を自分で切り離して新しい糸に張り替える。新しい糸は撚り手の座が索へそっと撚り足し、切り離された「落ち糸」は蓮の葉に巻きつき、撚り手の座が満月の翌朝に巻き取る。蜘蛛糸の索は、何千匹もの蜘蛛の生きた糸を撚り合わせたもので、蜘蛛たちは索の根元の蓮池で暮らしつづける。誰かが索を独り占めしようとする（順番を抜かす、他人を押しのける、索に自分の名を刻む）と、蜘蛛たちはいっせいに糸をゆるめ、索は蓮の花のようにほどけて昇降籠をゆっくり地上へ戻す。時間の階層では、満月ごとの張り替え（落ち糸の供給）と、毎日の昇降（譲り札）に効く。
Palette #DCE1E8 #F4B6C8 #9AD8EC #FFF6E0 #3E4A6B. Fullform fullycontained.
```

## 方丈宿借 (hojo_yadokari)

採用可能: assets/creatures/hojo_yadokari.png

原典: 一丈四方の殻を背負う、大きな朱色のヤドカリ。甲羅は塗りたての琺瑯のようにつやつやと赤く、象牙色の長い触角が二本、潮風に揺れる。右の大鋏は真鍮の打ち出し細工のように鈍く光り、左の小鋏は器用で、方丈規格の掛け金を外したり留めたりできる。背負っているのは使われなくなった方丈カプセルで、丸窓からは中に飾った海藻とビー玉がのぞく。浅瀬を歩くと八本の脚がちゃぷ、ちゃぷと鳴り、満ち潮のときはカプセルの丸窓だけが水面に出て、灯台のように夕日を返す。

動き推奨: 浅瀬の短い横移動、カプセル丸窓の静かな傾き。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT hojo_yadokari: ONE enormous vermilion HERMIT CRAB, glossy enamel-red crustacean, TWO long ivory antennae, brass-work RIGHT large claw, small agile LEFT claw, EIGHT walking legs as explicitly fictional description. Occupied shell is ONE cubic old Hōjō capsule on back, roundwindow showing SEAWEED AND GLASS MARBLES, real shell-weight resting firmly onbody. Closed intactcapsule, latchvisible. No human occupant or underwaterbackground, no raccoon appearance despite visualshapehint.
Canonical description: 一丈四方の殻を背負う、大きな朱色のヤドカリ。甲羅は塗りたての琺瑯のようにつやつやと赤く、象牙色の長い触角が二本、潮風に揺れる。右の大鋏は真鍮の打ち出し細工のように鈍く光り、左の小鋏は器用で、方丈規格の掛け金を外したり留めたりできる。背負っているのは使われなくなった方丈カプセルで、丸窓からは中に飾った海藻とビー玉がのぞく。浅瀬を歩くと八本の脚がちゃぷ、ちゃぷと鳴り、満ち潮のときはカプセルの丸窓だけが水面に出て、灯台のように夕日を返す。
Ecology and conceptual fidelity: 東京湾の海上都市の浅瀬に住み、幹の根元につく海藻と、潮が運んでくる貝殻のかけらをついばむ。体が育ったり、背のカプセルの継ぎ目がゆるんだりすると、浅瀬市に並ぶ中古カプセルを大鋏でこつこつ叩いて吟味し、いちばん具合のよいものに住み替える。手放した古殻は鋏で継ぎ目を叩き締められていて、中古市場で「宿借上がり」と呼ばれる。叩いた音の響きで、そのカプセルが何年、どの幹や環に付いていたかを言い当てる来歴の目利きでもある。明け六つと暮れ六つの干潮に浅瀬市へ現れ、数年に一度住み替える。
Palette #E0552B #F28C28 #F4F1E8 #C9A24A #2C4A6E. Fullform fullycontained.
```

## 道粘菌 (michi_nenkin)

採用可能: assets/creatures/michi_nenkin.png

原典: 万華京の地下水路に広がる、黄金色の粘菌の巨大な網。太い筋は帯ほど、細い筋は絹糸ほどで、葉脈のように枝分かれしながら暗渠の壁と床を覆っている。網の中では金色の流れがゆっくりと行きつ戻りつ脈打ち、そのたびに筋がかすかに明るくなる。行き止まりの枝は日ごとに痩せて消え、よく使われる道ほど太く、まぶしくなる。湿った土と炒った麦のようなにおいがする。粘菌は植物ではないが、この図鑑では分類の便宜上、植物の項に置く。

動き推奨: 流れの弱い往復・微脈動。静的網全体を動物の足歩きにしない。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT michi_nenkin: ONE golden slime-mold PLASMODIUM network, branching leaf-vein tubular strands of varied thickness and rounded protoplasm strands, thick fruitful connections and faint thinning dead ends. Include two modest oatmeal grains at entry/exit, connected through gold branched tubes. Flat broad network transparent around/between everystrand. No rooted tree/flower/brain/head/face. It is neither a plant nor fungalmushroom. Golden flow suggested by tonal differences, not arrowlabels or computer map UI. No original city diagram invented.
Canonical description: 万華京の地下水路に広がる、黄金色の粘菌の巨大な網。太い筋は帯ほど、細い筋は絹糸ほどで、葉脈のように枝分かれしながら暗渠の壁と床を覆っている。網の中では金色の流れがゆっくりと行きつ戻りつ脈打ち、そのたびに筋がかすかに明るくなる。行き止まりの枝は日ごとに痩せて消え、よく使われる道ほど太く、まぶしくなる。湿った土と炒った麦のようなにおいがする。粘菌は植物ではないが、この図鑑では分類の便宜上、植物の項に置く。
Ecology and conceptual fidelity: 【史実】粘菌の変形体はアメーバのように動いて餌を取り込み、乾くと休眠の菌核になり、条件がそろうと子実体をつくって胞子をとばす。実験室ではオートミールで飼われることが多い。【創作】道粘菌は堂島時層会所の大水盤の水路に沿って育った一つの大きな株で、刻輪広場の石畳の下まで網を広げている。粘菌番が地図盤の上の出発点と行き先にオートミールの粒を置くと、一刻のうちに最短で揺れの少ない道を金色の筋で結ぶ。報酬はオートミールで、祭りの前ほど求めが多くなり、借り賃が上がる。夏の土用には子実体の小さな金の傘をいっせいに立てる。時間の階層では、毎tickの経路選びと、毎日の道絵図に効く。
Palette #F2C230 #FFE58A #8A6414 #2A2010. Fullform fullycontained.
```

## 灯守提灯 (tomoshibi_chochin)

採用可能: assets/creatures/tomoshibi_chochin.png

原典: ひと抱えほどの丸い祭り提灯に命が宿ったもの。白い和紙の胴を細い竹の輪が幾重にも横に巻き、上下には黒漆の輪。胴の中では、赤い絵具で魚や貝や海草を描いた白い蝋燭が一本、ゆらゆらと燃えている。胴をふくらませたりすぼめたりして息をし、そのたびに光が明るくなったり暗くなったりする。地面から膝ほどの高さに浮かんで人のあとをふわふわとついてきて、祭囃子を小さく口ずさむ。笑うと、胴の和紙にほんのり桜色の灯が差す。

動き推奨: 低い浮遊、scale1〜1.02のゆっくり呼吸、内灯の控えめ明滅。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT tomoshibi_chochin: ONE living ROUND WHITE WASHI FESTIVAL LANTERN with many thin horizontal bamboo ribs, BLACK LACQUER top/bottom rings. SINGLE WHITE CANDLE visible softly through translucentpaper, candle has RED paintings of FISH/SHELLS/SEAWEED and a small contained orange flame. Washibody expands breathlike curved ribs, hoveringreadable usingfree nofeet silhouette. No eyes/mouth/arms/legs, no monster face invented, no price. Lightinsidepaper gently pinkwarm, no exteriorglow aura.
Canonical description: ひと抱えほどの丸い祭り提灯に命が宿ったもの。白い和紙の胴を細い竹の輪が幾重にも横に巻き、上下には黒漆の輪。胴の中では、赤い絵具で魚や貝や海草を描いた白い蝋燭が一本、ゆらゆらと燃えている。胴をふくらませたりすぼめたりして息をし、そのたびに光が明るくなったり暗くなったりする。地面から膝ほどの高さに浮かんで人のあとをふわふわとついてきて、祭囃子を小さく口ずさむ。笑うと、胴の和紙にほんのり桜色の灯が差す。
Ecology and conceptual fidelity: 【創作】祭りの夜、赤い絵の蝋燭を灯した提灯が逢う刻の鐘を最後まで聴き届けると、ときどき命が宿る。糧は蝋と物語で、道中に話を一つ聞かせてもらうごとに、蝋燭が少し長持ちする。迷子や、ほかの時代へ迷い込んだ旅人を見つけると、その人の生まれた時片の色を和紙に映して道を照らし、元の時代へ送り届ける。朝になると軒先にぶら下がって眠り、燃え残りの蝋を一滴、軒下に落とす。時間の階層では、暮れ六つから夜明けまでの迷子案内と、祭りの夜の需要に効く。
Palette #E23B2E #FFE6B8 #24222E #FFB04A. Fullform fullycontained.
```

## 栞雀 (reiwa_shiori_suzume)

採用可能: assets/creatures/reiwa_shiori_suzume.png

原典: 手のひらに乗るほどの小さな雀。羽の一枚一枚が古い和紙の頁を細く折りたたんだもので、どの羽にも明朝体の文字がひとつずつ刷られている。翼をたたむと本の小口のように細い縞が並び、胸には朱の蔵書印がひとつ、駒鳥の胸のように押されている。尾は一本の絹の栞紐で、飛ぶとひらひらとなびく。鳴き声はちゅんではなく、小さな声で物語の一文を読み上げる。

動き推奨: 短い跳ね歩き、栞紐の揺れ。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT reiwa_shiori_suzume: ONE palm-sized SPARROW in natural bird anatomy, twofeet/shortconicalbill/onepairwings, everyfeather an individually folded narrow OLD WASHIPAGE with one small mincho-style Japanese glyph perfeather, nonquotedfictional lettering. Foldedwing side-threequartershows book-edge thin stripes; chest SINGLE VERMILION exlibrisstamp. TAIL is ONE flowing SILK BOOKMARK CORD, not featherfan and no extra tails. No literal book body, no humanoid, no quotedpassage.
Canonical description: 手のひらに乗るほどの小さな雀。羽の一枚一枚が古い和紙の頁を細く折りたたんだもので、どの羽にも明朝体の文字がひとつずつ刷られている。翼をたたむと本の小口のように細い縞が並び、胸には朱の蔵書印がひとつ、駒鳥の胸のように押されている。尾は一本の絹の栞紐で、飛ぶとひらひらとなびく。鳴き声はちゅんではなく、小さな声で物語の一文を読み上げる。
Ecology and conceptual fidelity: 【創作】青空書庫の梁に巣をかけ、群れで暮らす。朝の朗読で頁から立ちのぼる細かな墨の粉「読み粉」を食べる。明け六つに群れで地上へ降り、その日に頁から降りてくる物語の一文を、街角や人の肩で囀って知らせる。作者と訳者がともに世を去り、物語が皆のものになった作品の文しか口にできず、まだ誰かのものである物語のことを尋ねられると、黙って羽ばたくだけになる。春の換羽で落ちた羽は、一枚ずつ文字の刷られた紙片になる。【経済での役割】その日の降書、つまり物語の住人がどこへ散歩に出るかを知らせる情報の担い手で、抜け羽は青空版が正しい刷りであることを示す栞になる（検定）。時間の階層では、明け六つの知らせと春の換羽に効く。
Palette #F4ECD8 #2A2A2E #C8463A #86B6DA. Fullform fullycontained.
```

## クラムボン (kurambon)

採用可能: assets/creatures/kurambon.png

原典: 誰も正体を知らない。谷川の底の青じろい水の中で、つぶつぶ流れる泡にまぎれて、かぷかぷと笑う何か。笑い声のしたあたりの泡だけが水銀のように光り、ゆれながら斜めに上っていく。跳ねて笑うと、底の白い磐に映る光の網が、いっしゅん結び目のようにきゅっと締まる。写し絵に撮ろうとすると泡ごと消え、幻燈透翅の翅を透かしても、形だけはどうしても映らない。見えるのはいつも、泡ひと粒ほどの光だけである。

動き推奨: 泡だけを斜め上へ静かに上昇/透明度変化、正体/顔を追加しない。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT kurambon: Conceptual VISUAL PHENOMENON ONLY: nobody knows shape. A sparse diagonal ascending cluster of transparent pale-blue STREAM BUBBLES, just THREE or FIVE small silvery-mercury highlights amongordinary clearbubbles; very subtle refractedlightnet knot behindlowestbubble, no definedsolidorganism. No face/eyes/mouth/smile, no animal outline/spherecreature/jellyfish/fish. No riverlandscapebackdrop, bubblesandminimalcausticstrands onlyonalpha. Unknownidentity remainsunknown. No sale/pricetag/specimenjar.
Canonical description: 誰も正体を知らない。谷川の底の青じろい水の中で、つぶつぶ流れる泡にまぎれて、かぷかぷと笑う何か。笑い声のしたあたりの泡だけが水銀のように光り、ゆれながら斜めに上っていく。跳ねて笑うと、底の白い磐に映る光の網が、いっしゅん結び目のようにきゅっと締まる。写し絵に撮ろうとすると泡ごと消え、幻燈透翅の翅を透かしても、形だけはどうしても映らない。見えるのはいつも、泡ひと粒ほどの光だけである。
Ecology and conceptual fidelity: 何を食べ、どこで眠るのかは誰にもわからない。五月の晴れた日中に笑い声がいちばん多く、十二月の月夜にはしんと黙る。笑い声のする川はよく澄み、澄んだ水では雷蛍の幼虫が育つので、クラムボンの声が多い年は、下流に来る雷蛍もよく光るといわれる。【経済での役割】値段をつけない。ただし笑い声の数は谷川の澄み具合の目安として、谷川の番人が毎節気に記録し、雷蛍の暮らしを気づかう人々に無償で知らせる。【時間の階層】一刻ごとに笑ったり黙ったりし、立夏から小満のころに最も多く聞かれる。
Palette #E4F6F9 #9FD3E0 #5FA8C2 #F5E6A8. Fullform fullycontained.
```

## 2026-10-10 追加13種・生成完了の節目

全19主題を生成保存、自己目視/1254²RGBA alpha0..255確認。17点採用可能、極楽蜘蛛の五→六花弁、鯱の松木→松枝形の魚背鰭の2局所修正が未採用。原画像は比較稿を保持。青茎百合は摘まず根/白土ごと描き、島負い亀は背の島林と甲羅を物理的に直結。座敷童子は担当住人refで同一髪型/紅絞りを揃え、白銅狐は野生種なので衣装付き住人とは別の自然毛色を描く。

### 甘露雁 (kenji_kanro_gan)

ready: assets/creatures/kenji_kanro_gan.png。目視: 原典の識別材質/全形確認。原典: 天の川の上をV字の列で渡る、光でできた雁。羽はうすい飴色で、内側から黄いろくあかりのように光り、首をのばして羽ばたくたびに金粉のような光の粒がこぼれる。鳴き声は遠い笛のように澄んだ「かう、かう」。群れが燈台の前を横切ると、灯が規則以外にまたたく。砂の上に降りると、足がふれたところから自分とそっくりの光の形を砂に残して、またすっと浮き上がる。

動き推奨: 両翅の小さな傾きとゆっくり飛行。光由来の体だが強い外光輪は足さない。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT kenji_kanro_gan: ONE FREE FLYING GOOSE with longneck typical goose notcrane, two broad fullyshownwings and twotuckedbirdfeet; madeof faint translucent amber-goldlight, individual featherstructure meticulously defined. Softyellowfromwithin, onlyfewtinygoldparticlesunderwings allowed. Not a cookie, no severedwing nor capture, nobooksceneortrain. Singularinflight forsprite; goose shape unmistakable.
Canonical description: 天の川の上をV字の列で渡る、光でできた雁。羽はうすい飴色で、内側から黄いろくあかりのように光り、首をのばして羽ばたくたびに金粉のような光の粒がこぼれる。鳴き声は遠い笛のように澄んだ「かう、かう」。群れが燈台の前を横切ると、灯が規則以外にまたたく。砂の上に降りると、足がふれたところから自分とそっくりの光の形を砂に残して、またすっと浮き上がる。
Ecology and conceptual fidelity: 天の川の流れに浮かぶ星屑を吸い、白鳥区と鷲の停車場のあいだを夜ごとに往復する。白鳥の停車場の二十分停車のころに河原へ降りて休み、飛び立つとき、体の形どおりの光の跡（抜け影）を砂に残す。抜け影は二三度明るくなったり暗くなったりしたのち、扁べったい飴色の菓子に固まる。秋分と七夕のころ群れが大きくなる。【経済での役割】抜け影が駅前名物のお菓子の雁になり、夜の旅人の食べ物を支える。【時間の階層】毎夜の二十分停車に降り、一年では秋分と七夕に群れがふくらむ。
Palette #F6D58E #E8A64B #FFF4D6 #2A2F5C. Fullform fullycontained.
```

### どんぐり衆 (kenji_donguri_shu)

ready: assets/creatures/kenji_donguri_shu.png。目視: 原典の識別材質/全形確認。原典: 黄金いろにぴかぴか光る、赤いずぼんをはいたどんぐりたち。頭のとがったもの、まるいもの、大きいもの、せいの高いものと形はまちまちで、三百でもきかない数が、草のあいだから蟻のように出てきては「わあわあ」と言い争う。集まると草の中でパチパチと塩のはぜるような音がする。叱られるとしいんと静まり、陽が当たると全員がいっせいにきらりと光る。

動き推奨: 代表小群の小さなbounce、互いに話す姿。数百全個体を描いたものではない。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT kenji_donguri_shu: FIVE GOLDEN ACORN FOLK as representative subgroup ofhundreds canonicalcolony, varied pointed/round/tall/large acornshapes, each wears SIMPLE RED TROUSERS and tinyfeet. Acorncaps and actual woodygrain renderedgold, faces minimaloriginal small inkeyes. Group busily disagreeingwithgestures, no hostile violence. Oneordinarysmallbrown fallenchildacorn byfoot, notbirthfromcutbody. No goldcoins/labels/sellstall. All five complete separate silhouettes notcrowdoverflow.
Canonical description: 黄金いろにぴかぴか光る、赤いずぼんをはいたどんぐりたち。頭のとがったもの、まるいもの、大きいもの、せいの高いものと形はまちまちで、三百でもきかない数が、草のあいだから蟻のように出てきては「わあわあ」と言い争う。集まると草の中でパチパチと塩のはぜるような音がする。叱られるとしいんと静まり、陽が当たると全員がいっせいにきらりと光る。
Ecology and conceptual fidelity: 榧と楢の森にかこまれた黄金の草地に住み、日当たりのいい場所を好む。白露から霜降にかけていちばん元気で、毎年「だれがいちばんえらいか」の争いを始める。晩秋になると、それぞれが小さな子どんぐりをひとつずつ草の上に落とす。草地を出た子どんぐりは光がうすれてあたりまえの茶いろに戻り、植えれば芽を出す。【経済での役割】子どんぐりが黄金のどんぐりとして裁判所の謝礼になり、外では植林の種になる。【時間の階層】一年ごとの秋の裁判期に騒ぎ、晩秋に子どんぐりを落とす。
Palette #E3B23C #B8432F #7A5A2E #F6E7B0. Fullform fullycontained.
```

### 座敷童子 (zashiki_warashi)

ready: assets/creatures/zashiki_warashi.png。目視: 原典の識別材質/全形確認。原典: 十二、三歳ほどの童の姿をした家の精。おかっぱ頭に、裾が少し長すぎる紅絞りの小袖を着て、足は裸足である。廊下を走る小さな足音が先に聞こえ、あとから、障子に丸い頭の影が一瞬だけ映る。見られるのをいやがらないが、じっと見つめられると、すっと壁の向こうへ溶ける。囲炉裏の灰には小さな足跡が一列に残り、つかまえようとした手は、いつもお手玉ひとつ分だけ届かない。灯りを抱いているように、輪郭が橙にほのかに光る。

動き推奨: 軽い一歩/低い上下、販売や捕獲・収集ボタンなし。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
Use reference clothed resident for SAME house-spirit identity, black bob hairstyle and rich VERMILION SHIBORI KOSODE withwhitecirculardyemarks. Depict ONE twelve/thirteen-year-old appearing HOUSE SPIRIT, same open friendlyface but olderchildnormal proportions, black bobhair, slightlyoverlongrobes, BAREFEET, ONE small beanbagheldgently. Entirehead/robe/feetshown withgeneroustransparentmargins. Softwarmorange atoutlineonly, notsmokycloud. No applianceghost/coins/cages/prices, notforsale andnot collectable. Freegentlewalkingstep, quietsmile. Canonical description: 十二、三歳ほどの童の姿をした家の精。おかっぱ頭に、裾が少し長すぎる紅絞りの小袖を着て、足は裸足である。廊下を走る小さな足音が先に聞こえ、あとから、障子に丸い頭の影が一瞬だけ映る。見られるのをいやがらないが、じっと見つめられると、すっと壁の向こうへ溶ける。囲炉裏の灰には小さな足跡が一列に残り、つかまえようとした手は、いつもお手玉ひとつ分だけ届かない。灯りを抱いているように、輪郭が橙にほのかに光る。
Ecology: 宿るのは、いちばん楽しそうな音のする家。笑い声、遊びの音、こぼれたお茶の湯気に引かれて、ふらりと居つく。退屈な家、愚痴の多い家、宣伝に自分の名を使う家からは、ふいといなくなる。お供えは小豆の餅をひとつかみだけ。【経済での役割】売れず、買えず、集められもしない運の担い手で、居場所が会所の掲示板で毎日の先行指標として読まれる。ザシキが去った店は数日で相場が冷え、宿った店には理由の分からない黒字が出る。【時間の階層】毎日（宿り番が朝の足跡を帳に写す）、毎週（宿替え）。
Palette #c8452f #f5ead4 #e8a24a #6b4a35.
```

### 河童水車守 (kappa_suishamori)

ready: assets/creatures/kappa_suishamori.png。目視: 原典の識別材質/全形確認。原典: 子どもの腰ほどの背丈の河童。背には苔が生えたような深い緑の甲羅、頭には淡い青緑に光る皿をのせている。顔は柿のように赤く、くちばしの先は丸い。指のあいだの水かきは大きく、掌は厚く、水車の軸受けに耳をあてる格好がよく似合う。腰の道具袋には木槌と羽根板の予備ときゅうりの種が入っている。皿の水がきらりと揺れるたびに、近くの水車の回りが、ほんの少し整う。

動き推奨: 耳を澄ます静かな上半身傾き、皿の水の微かな反射。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT kappa_suishamori: ONE small WATERWHEEL-KEEPER KAPPA with moss-deepgreen turtle shell onback, turquoise water-filledHEADDISH, persimmonRED face and ROUND tipped BEAK, largewebbedhands thickpalms, barewebbedfeet. Waisttoolpouch showswoodenmallet/SPAREwaterwheelpaddleboard/cucumberseeds. Leaning slightly with onehandcuppedatear listeningtoimaginaryaxis, noextraactualwheelneeded. Nothumanfrog/genericgreenkappa, no modernmachine.
Canonical description: 子どもの腰ほどの背丈の河童。背には苔が生えたような深い緑の甲羅、頭には淡い青緑に光る皿をのせている。顔は柿のように赤く、くちばしの先は丸い。指のあいだの水かきは大きく、掌は厚く、水車の軸受けに耳をあてる格好がよく似合う。腰の道具袋には木槌と羽根板の予備ときゅうりの種が入っている。皿の水がきらりと揺れるたびに、近くの水車の回りが、ほんの少し整う。
Ecology and conceptual fidelity: 淵の岩のくぼみに住み、昼は日で皿が乾くので浅い洗い場で休み、夕方から夜に働く。きゅうりと、川の小さな魚を捕りすぎない程度に食べ、雨の前の湿った風を好む。水車の軸のきしみを耳で聞き分け、羽根板が一枚傷んでも夜のうちに替える。【経済での役割】発電水車と算水路と糸車場の保守を請け負う職人で、時層をまたぐ水利権の仲買人でもある。保守の報酬はきゅうりと蛍銭で、きゅうりは半分を畑に植え戻す。【時間の階層】毎日（夕方から夜に点検）、一節気ごとの契約更新、梅雨と秋の長雨には総出。
Palette #5f7f35 #2f4a2a #b9d38a #d66a45 #e7efc9. Fullform fullycontained.
```

### 白銅狐 (hakudo_kitsune)

ready: assets/creatures/hakudo_kitsune.png。目視: 原典の識別材質/全形確認。原典: 灰褐色の背に、胸から腹にかけて雪のように白い毛をもつ狐。四本の足は靴下をはいたように黒く、尾はふさふさと長い。雪の夜には、その尾の先だけが白銅貨の色（銀白に、わずかに温かい赤み）にぼうっと光り、歩くたび、遠くで小さな硬貨が触れ合うような澄んだ音がする。子狐の前足には、人間の子の手のかたちをした淡い影が、ときどき重なって見える。目は琥珀色で、客の目をまっすぐには見ず、まず相手の手元を見る。

動き推奨: 短い四足歩行、尾先の銀白暖色は局所だけ。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT hakudo_kitsune: ONE wild real FOX fullquadruped anatomy, GRAYBROWN BACK, SNOWWHITE CHEST and BELLY, FOUR BLACK SOCK feet, longbushytail with SILVERWHITE warmreddish NICKEL-COPPER tailTIP gentlylight. Amber eyes lookrespectfullytowardfrontground, notatviewer. One tail only, nospirittails, no robe/glasses/coins/accessories. This species is distinct fromclothedresidentKITSUNE-X, followwilddescriptions.
Canonical description: 灰褐色の背に、胸から腹にかけて雪のように白い毛をもつ狐。四本の足は靴下をはいたように黒く、尾はふさふさと長い。雪の夜には、その尾の先だけが白銅貨の色（銀白に、わずかに温かい赤み）にぼうっと光り、歩くたび、遠くで小さな硬貨が触れ合うような澄んだ音がする。子狐の前足には、人間の子の手のかたちをした淡い影が、ときどき重なって見える。目は琥珀色で、客の目をまっすぐには見ず、まず相手の手元を見る。
Ecology and conceptual fidelity: 雑木林と杉林の巣穴に家族で暮らし、秋から冬にかけて町はずれの小路に現れる。野ネズミや木の実を食べ、春と秋の換毛期には、自然に抜けた毛が巣穴のまわりに落ちる。人の市場には夜、軒の灯を確かめてから近づく。【経済での役割】人と生き物のあいだの両替商。落鱗・落ち毛・落ち羽といった生き物由来の落ちものを、人の市場へ公正な値で出す仲立ちをし、お金を先に見せる手袋条約の保証人になる。【時間の階層】毎晩の夜市、初雪のころに最も多く、換毛期の春と秋に落ち毛が集まる。
Palette #9a8f7e #d9d6cf #f4efe4 #3d342b #d8c6b0. Fullform fullycontained.
```

### 静兎 (tono_shijima_usagi)

ready: assets/creatures/tono_shijima_usagi.png。目視: 原典の識別材質/全形確認。原典: 雪のように白い小さな兎で、耳の内側と鼻先だけが、桜の花びらの色にうっすらと染まっている。背中に降りかかった花びらを払わないので、じっと座っているうちに、背中は薄紅の小さな山になる。呼吸の音はなく、まばたきは、花びらが一枚落ちるのと同じ間合い。耳を寝かせてゆっくり歩くと、踏んだ花びらは一枚も動かず、足跡は残らない。目は、夜桜の闇のような深い藍である。

動き推奨: ほぼ静止、極小呼吸/低頻度瞬き。花弁の静けさを保つ。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT tono_shijima_usagi: ONE small real rabbit seatedquietly, SNOWWHITE FUR, PETALPINK INNER EARS and tiny PINK NOSE, DEEPINDIGO EYES. Many delicatefallen pale-pink cherryPETALS restingonback forminglowpinkmound; ONEpetal restinglightlyatlip. Naturalrabbitnohumanoid. WholelongEARS/FEET/TAIL contained generousmargins. No icyglassfiber/snowcrystals (distinctfromSnowrabbit), nofoodstall/price. Tranquilsilhouette.
Canonical description: 雪のように白い小さな兎で、耳の内側と鼻先だけが、桜の花びらの色にうっすらと染まっている。背中に降りかかった花びらを払わないので、じっと座っているうちに、背中は薄紅の小さな山になる。呼吸の音はなく、まばたきは、花びらが一枚落ちるのと同じ間合い。耳を寝かせてゆっくり歩くと、踏んだ花びらは一枚も動かず、足跡は残らない。目は、夜桜の闇のような深い藍である。
Ecology and conceptual fidelity: 桜の森のいちばん花の厚い空き地とその道に棲み、草も実も口にせず、降る花びらを一枚だけ唇に乗せて眠る。大声や売り声をいやがり、耳を倒して目を閉じる。【経済での役割】値のつかない存在で、取引の対象ではない。ただし花見の夜、木戸の鐘の下で静兎が眠りに落ちる瞬間が、沈黙の市の合図として読まれる。【時間の階層】花の盛りの数日のみ。花見の夜に、一年に一度の深い眠りにつく。
Palette #fbf3f1 #f2c6cf #e8a8bd #4a3c6d #c9b8c8. Fullform fullycontained.
```

### 竜宮の落とし子 (ryugu_otoshigo)

ready: assets/creatures/ryugu_otoshigo.png。目視: 原典の識別材質/全形確認。原典: 人をひとり背に乗せられるほど大きく育ったタツノオトシゴ。体は螺鈿のような虹色の鱗におおわれ、首をもたげると青緑から桃、薄紫へと色がうつろう。馬に似た頭にすっと伸びた吻、背びれは薄い絹の領巾のように細かく震えて、体を立てたまま前へ進める。休むときは巻きつけた尾を珊瑚の枝にかけ、ゆらゆらと揺れながら眠る。

動き推奨: 立位のゆっくり上下/尾の微揺れ。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT ryugu_otoshigo: ONE LARGE SEAHORSE in precise actualseahorsebodyanatomy, upright neck/horse-shapedhead/LONG THIN TUBULAR SNOUT, armoredribbedbody, coiledprehensileTAIL, delicately translucentfabriclike DORSAL FIN. Iridescent mother-ofpearlindividualscales shift turquoise/pink/lilac. FOURHUMANLEGS OR WINGS NEVER. No harness/saddle/person or dragonfangs/horns. Curvedtailfreefloating fullframe, no coralbackground necessary.
Canonical description: 人をひとり背に乗せられるほど大きく育ったタツノオトシゴ。体は螺鈿のような虹色の鱗におおわれ、首をもたげると青緑から桃、薄紫へと色がうつろう。馬に似た頭にすっと伸びた吻、背びれは薄い絹の領巾のように細かく震えて、体を立てたまま前へ進める。休むときは巻きつけた尾を珊瑚の枝にかけ、ゆらゆらと揺れながら眠る。
Ecology and conceptual fidelity: 珊瑚の林と海藻の畑のあいだを、つがいで暮らす。小さな甲殻類と光る藻のまじる潮を、細い吻で吸いこむように食べる。【史実】現実のタツノオトシゴは、雄が育児嚢で卵を育てる。この世界の落とし子も同じである。泳ぐ速さで周りの時間の流れが少し変わり、ゆっくり漂う個体の背では地上との差がさらに広がり、速く泳ぐ個体の背では差が縮む。どの落とし子に乗るかで刻の差益が変わるので、乗り手の目利きが時間取引の腕の見せどころになる。大潮の夜は、乗り手を求めて三日遊びの宮の門に集まる。経済では時間のレートの検定役と物流を兼ね、効くのは一刻ごとの観測値の更新と、月に二度の大潮の夜である。
Palette #6fe3d4 #b79cff #ff9fcf #f4e9cf #2a7fb0. Fullform fullycontained.
```

### 島負いの大亀 (ryugu_shimaoi_ogame)

ready: assets/creatures/ryugu_shimaoi_ogame.png。目視: 原典の識別材質/全形確認。原典: 蓬莱島を背に負う、島のように大きな亀。甲羅は苔と海藻でしっとりと緑におおわれ、その下に六角の甲板が古い寺の瓦のようにならび、継ぎ目に沿って金の細い脈が走る。背には玉の枝の林と白砂の浜がのり、ひれが水を掻くたびに島全体が静かに傾く。目は夜の海のように深く、まばたきのたびに小さな潮がひとつ満ち、ひとつ引く。

動き推奨: 島が甲羅と一緒に極小で傾く、ごく遅い浮遊。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT ryugu_shimaoi_ogame: ONE COLOSSAL SEA TURTLE, real broadturtleheadandFOUR LARGE FLIPPERS andsmalltail (notwhale), humidMOSSGREEN hugeHEXAGON scute carapace, verythin goldenveinsatseams. OntheBACK rests miniature-scale HŌRAI ISLAND: continuous white-sand shore around a small FOREST of JADE/TAMA-BRANCH TREES. Landscape ONLY on actualcarapace, no floatingdetachedislandorplainlandbackdrop. Turtleandislandrelationship instantlyobvious and anatomicallysecure, islandsmalletreesgrantcolossalscale. No humans/temples/newbuildings/axes/cutting trees. Completeflippers/head/tailcontained.
Canonical description: 蓬莱島を背に負う、島のように大きな亀。甲羅は苔と海藻でしっとりと緑におおわれ、その下に六角の甲板が古い寺の瓦のようにならび、継ぎ目に沿って金の細い脈が走る。背には玉の枝の林と白砂の浜がのり、ひれが水を掻くたびに島全体が静かに傾く。目は夜の海のように深く、まばたきのたびに小さな潮がひとつ満ち、ひとつ引く。
Ecology and conceptual fidelity: 漂う海藻と夜光藻の群れを、何時間もかけてゆっくり食む。一年に一海里ほどしか進まず、潮のうえをほとんど止まって見えるほどの遅さで漂う。明け六つに一度だけ頭を上げ、深く息をつく。そのとき島が一尺ほど持ち上がり、浜の舟もいっせいに揺れる。背の林に刃を入れる者がいないので、亀は安心して眠れる。経済では玉の枝の落ち枝の供給源であり、島の係留枠は大きな契約の担保にもなる。効くのは毎日の明け六つの一息と、月に二度の大潮、そして数年がかりの島の針路の変化である。
Palette #2f4f46 #7fb7a4 #d9b45a #e9f1ee #1c3b57. Fullform fullycontained.
```

### 月燕 (ryugu_tsuki_tsubame)

ready: assets/creatures/ryugu_tsuki_tsubame.png。目視: 原典の識別材質/全形確認。原典: 背は深い藍に青い光沢がのり、腹は月の光のような白。喉に淡い藤色の帯があり、尾は細く二つに割れている。翼をたたんで急降下するとき、飛んだあとに青い光の糸が一本だけ引かれる。さえずりは、小さな鈴を水に落とすような低く柔らかい声である。

動き推奨: 斜めに短い飛行、青い糸1本のみ。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT ryugu_tsuki_tsubame: ONE real SWALLOW in flight, DEEPINDIGO BLUEGLOSS BACK, MOONWHITEBELLY, pale LILAC THROAT BAND, TAIL forkedinto TWO slender streamers. Naturalbirdtwolegs/twowingsevenif legs tucked. ONLY ONE thin blueflightthread gentlytrailsbehind, fullframecontained. No moonorb/headcrown/ornaments. No sparrowstubbynormal tail despitevisual.shape. Completewings andforktips, microfeatherdetail.
Canonical description: 背は深い藍に青い光沢がのり、腹は月の光のような白。喉に淡い藤色の帯があり、尾は細く二つに割れている。翼をたたんで急降下するとき、飛んだあとに青い光の糸が一本だけ引かれる。さえずりは、小さな鈴を水に落とすような低く柔らかい声である。
Ecology and conceptual fidelity: 春になると月の都の藤棚へ渡ってきて、軒に泥と藤の蔓の巣をかける。藤の花房に集まる小さな羽虫を、空中で食べる。雛が巣立つ朝、巣の底に敷いていた小さな月の貝を、軒先へ一つだけ落としていく。経済では月の子安貝の供給源で、五つの難題の一つの鍵にもなる。効くのは春の渡来から夏にかけての、二十四節気ごとの巣立ちである。
Palette #1a2650 #e8edf8 #8fa8e6 #b98ad6 #f0d48a. Fullform fullycontained.
```

### 望月兎 (ryugu_mochizuki_usagi)

ready: assets/creatures/ryugu_mochizuki_usagi.png。目視: 原典の識別材質/全形確認。原典: 月の海の模様をそのまま背負ったような兎。毛は乳白色で、背に灰青色の丸い斑が広がり、満月の夜にはその斑が薄く光る。長い耳の先は月長石の欠片のように透け、後ろ足が砂を蹴るたびに銀の粉が舞う。二匹ずつ向かい合い、片方が杵をふり、もう片方が臼のふちを湿らせる。

動き推奨: 極小上下で搗きのリズム概念。杵臼の可動リグを制作済と称しない。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT ryugu_mochizuki_usagi: TWO NATURAL RABBITS facingoneanother aroundONE traditional woodriceMORTAR. Milkwhitefur, large ROUND GRAYBLUE dorsalpatches resemblingmoonseamaria, LONG EARTIPS translucentMOONSTONE. One raises ONE WOODEN PESTLE withfrontpawgrip, othergently wetsmortarrim withfrontpaw. Animalproportionsnot kimonopeople, sameoriginalspecies pair. Completebothrabbits/feet/tail/ears/tool safelyinsideframe. Few restrainedsilvergrainsatfeetonly, no giantmoonbackground/scatteredstarconfetti.
Canonical description: 月の海の模様をそのまま背負ったような兎。毛は乳白色で、背に灰青色の丸い斑が広がり、満月の夜にはその斑が薄く光る。長い耳の先は月長石の欠片のように透け、後ろ足が砂を蹴るたびに銀の粉が舞う。二匹ずつ向かい合い、片方が杵をふり、もう片方が臼のふちを湿らせる。
Ecology and conceptual fidelity: 月の棚田に実る望月米の籾を食べ、満月の晩に原へ集まって餅を搗く。群れで暮らし、杵と臼は群れの代々の持ち物である。搗き上がった餅の最初の一つを、訪れた客に分ける。経済では月の餅の供給源で、礼の物語（文）を受けとる窓口にもなる。効くのは月に一度の満月の晩と、毎日の棚田の水の見回りである。
Palette #f7f2e4 #e6d7a6 #aebfe6 #8b83b8 #ffffff. Fullform fullycontained.
```

### 夢応の鯉（むおうのこい） (muou_koi)

ready: assets/creatures/muou_koi.png。目視: 原典の識別材質/全形確認。原典: 錦鯉のように大きな鯉。背は夜の湖のような深い藍、腹は月の白で、胸びれの付け根に朱の斑が一つある。鱗の一枚一枚が小さな円い鏡のように光り、のぞきこんだ者が最近見た夢の最初の景色が、鱗の中にゆらりと映る。尾を振ると水面にたつ波紋が、一瞬だけ畳の目のような細かい網目に見える。泳ぎ去ったあとの水には、琵琶湖の朝の匂いが残る。

動き推奨: 水平方向のゆっくり漂い、鏡鱗の微反射。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT muou_koi: ONE LARGE KOI/CARP correctly shapedfish, DEEPINDIGO BACK, MOONWHITE BELLY, ONE VERMILION PATCH atpectoralFINBASE. EACHscale small ROUND MIRROR reflective edge, withinfewscales faintnonspecific DREAM-COMET/shore/reflections as proposeconcept ratherthanliteralnewstory. Natural carp mouth with two pairs of small barbels. Naturalfins andlongtail fullframe, subtle web-likewatertrace optionalbutnotbackground. No wing/humanfish/scale-removal. Mirror scales remainintact.
Canonical description: 錦鯉のように大きな鯉。背は夜の湖のような深い藍、腹は月の白で、胸びれの付け根に朱の斑が一つある。鱗の一枚一枚が小さな円い鏡のように光り、のぞきこんだ者が最近見た夢の最初の景色が、鱗の中にゆらりと映る。尾を振ると水面にたつ波紋が、一瞬だけ畳の目のような細かい網目に見える。泳ぎ去ったあとの水には、琵琶湖の朝の匂いが残る。
Ecology and conceptual fidelity: 琵琶湖の深みから、回廊の襖の下の水路を通って池へ泳ぎ込む。夜の湖の月影と浮草を食べ、眠った者が回廊に入るたびに池の縁へ寄ってくる。小満のころ（五月下旬）には大きな群れが一度に泳ぎ込む。一匹が一夜に運ぶ夢は一つだけで、鱗に映った着想を、文替所の和紙の図面に写す手伝いをする。鱗は年に一枚だけ自然に落ちる。【経済での役割】供給：夢の設計案を文替所へ運び、落鱗は担保と来歴証明になる。【時間の階層】毎晩、年に一度の泳ぎ込み（小満）。
Palette #1F2F5C #EAF2F4 #E8523A #E6B84F #4A8A94. Fullform fullycontained.
```

### 雨呼びの鯱（あまよびのしゃち） (tenshu_shachi)

targeted-edit pending: assets/creatures/tenshu_shachi.png。目視: 原典の識別材質/全形確認。原典: 天守の大棟の両端に載る、一対の金の鯱。頭は虎のように険しく、背びれは松の枝のように反り、尾は天へ高く跳ねている。体は金の瓦をふいたような鱗でおおわれ、日が当たると雨粒のように光る。夜明けと夕暮れだけ瓦を離れて空へ泳ぎ出し、雲の縁をくぐってから、ふたたび棟へ戻る。尾が空を切るとき、遠い雨の匂いがする。

動き推奨: 夜明け/夕暮れだけ一対で泳ぐように小傾き。通常棟に戻る設定。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT tenshu_shachi: ONE PAIR OF GOLD SHACHI Japanese mythical roofguardianFISH with TIGERLIKE sternHEAD, archingpinebranch-shapeddorsalFIN, TAIL pointsHIGH towardsky. BodiescoveredintricategoldTILE-LIKEFISH SCALES. Two matched oppositefacing figures oneair-swimmingvariation, four?Fishhasfinsnotlegs. No lionlegs ordragonhorses, no largecastle invented. Pair FREE FLOATING asdawn/eveningdeparture, goldtilesarereadablematerial. No cutting/removing scales. Both complete tailtips/heads safelyinsideframe.
Canonical description: 天守の大棟の両端に載る、一対の金の鯱。頭は虎のように険しく、背びれは松の枝のように反り、尾は天へ高く跳ねている。体は金の瓦をふいたような鱗でおおわれ、日が当たると雨粒のように光る。夜明けと夕暮れだけ瓦を離れて空へ泳ぎ出し、雲の縁をくぐってから、ふたたび棟へ戻る。尾が空を切るとき、遠い雨の匂いがする。
Ecology and conceptual fidelity: 雨雲と屋根にたまった雨水を食べ、夜明けと夕暮れに空を一巡りして棟へ戻る。尾の向きで、翌日の雨の降り方が読める。雲を払った夜は星がよく見える。一対はいつも離れず、片方が棟に戻るまで、もう片方は空で待つ。鱗は年に数枚だけ自然に落ち、瓦の上で拾われる。【経済での役割】供給・検定：落鱗の金粉が獅子頭の守り札の目の縁になり、尾の向きが雨の予報（天気座への小さな手がかり）になる。【時間の階層】毎日の明け六つと暮れ六つ、鱗は一年に数枚。
Palette #D9A441 #2F3A56 #F2E4B3 #9A3B2A #BFD7E3. Fullform fullycontained.
```

### 百年百合（ひゃくねんゆり） (tenshu_hyakunen_yuri)

ready: assets/creatures/tenshu_hyakunen_yuri.png。目視: 原典の識別材質/全形確認。原典: 細い青い茎の先に、真っ白な花をひらく百合。つぼみのうちは、星の破片の淡金色をかすかに透かしている。花がひらくと、花びらの内側にだけ、暁の空のような薄い茜がさす。骨にしみとおるほど深く甘い香りがして、香りだけは遠くの襖の向こうまで届く。一輪ごとに、誰かの誓いが根もとに結ばれている。

動き推奨: 静かな茎揺れ、誓い成熟で開花。採取/販売なし。

```text
Use case: stylized-concept. Museum-quality detailed Japanese fantasy natural-history painting for 万華京ジパング. Exquisitely fine ink and mineral-pigment rendering, individual fur/feather/paper/metal/glass material textures, subtle natural structural color. Restrained glow ONLY when canonical description says light, no oversaturated aura, no bloom/explosions/sparkle cloud. TRUE TRANSPARENT ALPHA cutout, centered entire silhouette with at least15% empty safe margins on ALL edges including ears/tail/wings/antennae/tools. Large square illustration, original detailed artwork not icon/logo/vector/pixel-art/chibi shortcut. No labels/text/watermark/catalogue price/net/pin/cage/hands/captive harvesting. Background wholly transparent, no backdrop/paper/table/scene/shadow. Intact living subject with biologically readable anatomy; only specified materials/props. Description/ecology take priority over generic visual.shape schema hints.
SUBJECT tenshu_hyakunen_yuri: ONE LIVING ROOTED LILY BOTANICAL PLANT with SLENDER BLUE STEM, oneOPEN WHITE SIX-PETAL LILY FLOWER with veryfaintDAWN PINK onlyINNERPETALS, oneclosedbud showingsoftPALEGOLD starlight, naturalstamenandlongleaves. Root attachedto TINY WHITE SOIL CLODasneeded botanicalanchor, oneplaincordvowKNOT atrootandONE modestpalegold starFRAGMENT there. No picking/cutflower/bouquet/vase/price. Completeflower/leaves/stem/root safelyframe, no gardenbackdrop. Blue stemcanonical evenifpalettehintgreen. Flowernotforsale/harvest.
Canonical description: 細い青い茎の先に、真っ白な花をひらく百合。つぼみのうちは、星の破片の淡金色をかすかに透かしている。花がひらくと、花びらの内側にだけ、暁の空のような薄い茜がさす。骨にしみとおるほど深く甘い香りがして、香りだけは遠くの襖の向こうまで届く。一輪ごとに、誰かの誓いが根もとに結ばれている。
Ecology and conceptual fidelity: 百年百合園の白い土で育つ。誓いが立てられると、真珠貝の匙で掘った穴に根を下ろし、星の破片を根もとに置かれて芽を出す。庭の時間は百年を一区切りに流れるので、つぼみは外の一刻のあいだに長い年月を経る。誓いが果たされると花がひらき、果たされないあいだはつぼみのまま。水は白露だけを飲む。花は摘まず、売らない。【経済での役割】契約網：百年かかる建設や長期契約の信用を、開花という目に見えるしるしで裏づける。【時間の階層】長期目標（数か月〜数年）、百年（誓いの満期）。
Palette #F8F4EA #E9E2CC #9DB89A #F2C46B #C9482F. Fullform fullycontained.
```

### 局所修正中 gokuraku_gumo

```text
Precise localized edit ONLY of Paradise Spider's PINK PETAL MARKING on round silver abdomen. Current marking has FIVE petals. Replace ONLY that pattern with EXACTLY SIX DISTINCT PALE PINK LOTUS PETALS arranged radially as one flower around a SMALL CENTRAL POINT. Six positions every60 degrees:12,2,4,6,8,10 o'clock. They are SIX filled separate petal shapes and must be easy to count; no extra overlapping petal. KEEP polished silver abdomen material, spider anatomy, exact EIGHT glass legs, all dew beads, existing eyes/face, lotus leaf, ONE SINGLE hanging silver silk thread, composition/framing and transparency EXACTLY unchanged. No new flowers/props/limbs. True transparent alpha preserved, no background.
```

### 局所修正中 tenshu_shachi

```text
Precise localized edit ONLY of BACK/DORSAL FINS on both gold shachi. The current image has literal green pine trees/needles growing from the fish backs. Canonical says dorsal FINS arc LIKE pine branches, not actual plants. Replace ONLY those green pine-tree structures with beautifully arching GOLD METAL FISH DORSAL FIN RAYS, branching silhouettes inspired by pine branches but composed solely of golden fin spines and translucent gold-blue FIN MEMBRANE. NO pine needles/foliage/wood/trees. Keep two shachi, tigerlike stern heads, gold tile scales, raised tails, all other fins, paired pose, layout, precise textures and transparent alpha EXACTLY unchanged. No new props/background/labels.
```

## 最終採用状態 — 19/19 完成

全19種を保存・自己目視・RGBA寸法/alpha検証完了。極楽蜘蛛はv2で正確な六花弁、鯱はv2で松木を金色魚背鰭へ局所修正。他17は初版採用。全PNG1254x1254、RGBA alpha0..255、alpha32の可視境界が外枠内で全形収容。原画像を画素加工せず、built-in編集結果のalphaを保持する。定量境界と原典/実callプロンプトはREALM_CREATURE_PROMPTS.jsonのpngValidationに保存。Pageでの実機表示/公開検証は統合担当の責任範囲で、ここは素材完成を報告する。

| 正本ID | 最終ファイル | 動き提案 |
|---|---|---|
| gokuraku_gumo | assets/creatures/gokuraku_gumo-v2.png | 一本の糸方向へ微かな上下動、関節露玉は局所反射。自由な糸張り替えを表す。 |
| hojo_yadokari | assets/creatures/hojo_yadokari.png | 浅瀬の短い横移動、カプセル丸窓の静かな傾き。 |
| michi_nenkin | assets/creatures/michi_nenkin.png | 流れの弱い往復・微脈動。静的網全体を動物の足歩きにしない。 |
| tomoshibi_chochin | assets/creatures/tomoshibi_chochin.png | 低い浮遊、scale1〜1.02のゆっくり呼吸、内灯の控えめ明滅。 |
| reiwa_shiori_suzume | assets/creatures/reiwa_shiori_suzume.png | 短い跳ね歩き、栞紐の揺れ。 |
| kurambon | assets/creatures/kurambon.png | 泡だけを斜め上へ静かに上昇/透明度変化、正体/顔を追加しない。 |
| kenji_kanro_gan | assets/creatures/kenji_kanro_gan.png | 両翅の小さな傾きとゆっくり飛行。光由来の体だが強い外光輪は足さない。 |
| kenji_donguri_shu | assets/creatures/kenji_donguri_shu.png | 代表小群の小さなbounce、互いに話す姿。数百全個体を描いたものではない。 |
| zashiki_warashi | assets/creatures/zashiki_warashi.png | 軽い一歩/低い上下、販売や捕獲・収集ボタンなし。 |
| kappa_suishamori | assets/creatures/kappa_suishamori.png | 耳を澄ます静かな上半身傾き、皿の水の微かな反射。 |
| hakudo_kitsune | assets/creatures/hakudo_kitsune.png | 短い四足歩行、尾先の銀白暖色は局所だけ。 |
| tono_shijima_usagi | assets/creatures/tono_shijima_usagi.png | ほぼ静止、極小呼吸/低頻度瞬き。花弁の静けさを保つ。 |
| ryugu_otoshigo | assets/creatures/ryugu_otoshigo.png | 立位のゆっくり上下/尾の微揺れ。 |
| ryugu_shimaoi_ogame | assets/creatures/ryugu_shimaoi_ogame.png | 島が甲羅と一緒に極小で傾く、ごく遅い浮遊。 |
| ryugu_tsuki_tsubame | assets/creatures/ryugu_tsuki_tsubame.png | 斜めに短い飛行、青い糸1本のみ。 |
| ryugu_mochizuki_usagi | assets/creatures/ryugu_mochizuki_usagi.png | 極小上下で搗きのリズム概念。杵臼の可動リグを制作済と称しない。 |
| muou_koi | assets/creatures/muou_koi.png | 水平方向のゆっくり漂い、鏡鱗の微反射。 |
| tenshu_shachi | assets/creatures/tenshu_shachi-v2.png | 夜明け/夕暮れだけ一対で泳ぐように小傾き。通常棟に戻る設定。 |
| tenshu_hyakunen_yuri | assets/creatures/tenshu_hyakunen_yuri.png | 静かな茎揺れ、誓い成熟で開花。採取/販売なし。 |

特に正体不明のクラムボンは泡の光の現象図であり、動物の外形とは断定しない。どんぐり衆は五体の代表群で、三百以上の個体数を正確に図示したものではない。住人版狐と野生白銅狐は衣装/生態を区別する。亀背の玉枝林/白砂浜、宿借背の中古方丈カプセル、灯守提灯の和紙/蝋燭の因果関係を絵として明確にする。雁は生きた光の鳥で、抜け影菓子に代替しない。百合は根付き白土と誓いを描き、切り花売買の表示を付けない。

### 元の小型Canvas図形との対応

既存Canvasの抽象shape（beetle/tanuki/whale/orbなど）と高精細素材の生体構造が異なる場合、正本description/ecologyを優先した。極楽蜘蛛は8脚の蜘蛛、方丈宿借はヤドカリ、島負いは四ひれの亀、月燕は二股尾の燕、道粘菌は変形体網である。既存Canvasは残すが、原典の姿を抽象図形へ合わせて変更しない。追加素材の意匠提案は本文で未指定の画角/細部だけとする。
