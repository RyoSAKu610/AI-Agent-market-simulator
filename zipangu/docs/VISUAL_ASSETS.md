# 万華京ジパング ビジュアル制作記録

2026-10-10 / built-in image_gen 使用。原典はユーザー添付本文と source/zipangu/world/{creatures,currencies,agents,eras}.json。既存の Canvas ちびドットスプライトはそのまま維持し、本ファイル群は高精細追加アート。統一画風は博物画の細密な素材描写と日本幻想画、鉱物顔料・細線、過剰な発光を避ける。

## 原典・意匠提案の区別

- 翡翠揚羽: 正本 hisui_ageha。15cm、翡翠結晶の鱗、黒漆前翅縁、後翅朱三日月、長い翡翠尾。生体無傷、落鱗のみ流通。
- 浅葱硝子斑: 正本 asagi_glass_madara。10cm、浅葱硝子窓と黒翅脈、栗色後翅縁、黒白斑の胴、毎年同じ蝶道。
- 雲鯨: 正本 kumo_kujira。60m、凝った水蒸気と雲母肌、苔の背、白木社と赤い郵便受け、ガラス糸のひげ。背に郵便施設が直接乗る関係を絵で確認。
- 刻: 正本 koku。不定時法一刻の働き、ZERO発行・漏刻亀公証・刻斑蝶検定。真鍮と漆の十辺トークンの具体形は **意匠提案**。
- 翅鱗: 正本 shirin。自然落鱗、蝶守座の鑑定刻印、約120刻。四等級の落鱗を納めた透明鑑定容器の具体形は **意匠提案**。切断翅や捕獲蝶は描かない。
- 光箔: 正本 kohaku。透金札の蓄光量、約60刻、約15日動かさないと抜光目減り。透金札という材質は原典、彫り文様と目盛りは **意匠提案**。常に自動蓄光する表現は禁止。
- 蛍銭: 正本 hotarusen。雷瓶のエネルギー、約0.5刻、日ごとに減光。蓄光だけが入る小雷瓶銭の具体形は **意匠提案**。生きた蛍を封じない。
- 雪華兎: 正本 sekka_usagi。35cm、透明な長い白毛、毛先に二〜三個の微小雪結晶、薄藤の内耳、氷河色の目。
- 星海月: 正本 hoshi_kurage。60cm、薄硝子風船のような傘、内側の光粒、何十本もの銀糸触手、光箔の贈り物。
- チャハコビ: 正本 agent chahakobi。子どもほどの算機人形古老、白木顔・墨眉・朱唇・黒上衣・袴下真鍮車輪・水平な黒漆盆と茶碗・胸歯車。実在人物ではない。
- 乙姫: 正本 agent otohime。黒長髪・領巾・珊瑚羽織・水引鍵・背玉手箱紋。銀行頭取・玉手箱税関長。衣服の織り文様と補助小物の具体形のみ **意匠提案**。
- 万世時計: 本文・正本の十面時計と十時片を解釈した広域コンセプト画。令和中心→縄文外縁の正確な地区境界・時計面数の検証は正本地図に委ねる。夜明け版の初稿に列車が映ったため、v2では車両だけ除去して夜限定鉄道のルールに整合。v2を採用、初稿は比較用。

## 用途と動き

静止 PNG に画面上の状態機械で動きを付ける。蝶は羽ばたきの微細な幅変形と舞い、浅葱はほぼ羽ばたかず滑空、雲鯨はゆっくり回遊し苔上施設を同一座標系で保持、兎は短い跳躍、海月は傘の穏やかな脈動。四通貨は貨幣の回転・携行・決済の状態を表し、蛍銭の日ごと減光と光箔15日停滞減光は正本ルール。通貨の価値を無根拠に増やすアニメーションは行わない。人物は待機・思考・移動・取引の4状態シートを別途制作し、道具の保持関係と足線を合わせる。

## 検証

保存後 view_image で主題・素材・全身・原典識別点を目視。透過カットアウトはPillowでRGBAとalphaの0〜255範囲を検査し、生成alphaを加工せずコピー保存。高精細絵はrigではなく、完全歩行loopや全身関節分割を保証しない。

## 実際の各生成プロンプト

### bansei-clock-concept.png

```text
Use case: stylized-concept
Asset type: widescreen concept artwork for the Japanese fantasy city website 万華京ジパング.
Primary request: a meticulously hand-painted architectural concept of 万世時計 (Bansei Clock), a city-scale TEN-FACED mechanical clock, standing in the central 刻輪広場, and the ten overlapping time fragments of a kaleidoscope city. Wide landscape composition.
Setting fidelity: center is Reiwa present-day Japan with a restrained neon old town. Moving outward, each mirror-like city fragment gets successively older: Showa with pencil-rocket and capsule houses, Taisho snow-science houses, Meiji brick and silk-wing flight, late Edo electric firefly lanterns, early Edo wooden calculation automata, Sengoku screw-making port, Hiraizumi gold temple, early imperial water-clock/observatory, finally Jomon forest at the outermost rim. Exactly ten city fragments, spatially legible like layers of kaleidoscope glass, NOT a generic circular city map. One unified inhabited city, terraces and streets visible. Dawn, the moment all ten clocks synchronize.
Clock: successor to a traditional Japanese perpetual clock, an intricate standing decagonal city monument whose ten individual dial faces are mechanically real, fine brass gears, warm lacquered wood, water pipes and traditional Japanese clock markings. Show enough faceted faces for TEN to be understood. It is not a giant pocket watch or western Big Ben.
Style: extraordinary precise Japanese fantasy painting crossed with antique natural-history/architectural illustration, mineral pigments, fine ink lines, individually painted wooden buildings, jade-green/indigo/gold palette, warm cream dawn. Architectural material texture, atmospheric scale, restrained practical lantern lights; no blazing luminous halo, no neon rainbow bloom. All regions flow organically into the central clock plaza.
No people close-up, no invented named characters, no floating text, no labels or infographic lettering. Preserve the concept center modern -> outside ancient. Cinematic landscape 1536x1024 or wide. Finished premium concept painting, not icons, not vectors, not a UI screenshot.
```

### bansei-clock-concept-v2.png

```text
Use case: precise-object-edit
Edit target: the supplied 万華京ジパング architectural painting.
Change ONLY the railway rolling stock: remove ALL train locomotives and ALL passenger or freight carriages visible on the elevated railway crossing the lower foreground and center of the image. Replace their pixels with the same EMPTY TRACKS following the exact existing bridge perspective and rail alignment. The sky is dawn so the night-only Galactic Railway has already stopped. Keep all railway bridges, rails, station roofs and the infrastructure itself.
ABSOLUTE invariants: keep this beautiful entire composition, ten-faced Bansei Clock, clock details, plaza, all city buildings, moss forest, water, mountains, dawn sunlight and sun disk, color palette, image crop, and exquisite painting material finish exactly unchanged. Do not darken the sky, do not add lights, do not move buildings. Do not repaint the whole image. This is a localized targeted edit to remove rail vehicles from tracks. No text.
```

### hisui-ageha.png

```text
Use case: stylized-concept
Asset type: transparent full-body butterfly character artwork, natural-history illustration for 万華京ジパング.
Subject: ONE living 翡翠揚羽 (hisui_ageha), a fantastical 15cm jade swallowtail butterfly inspired by Japanese Miyama-karasu-ageha. Dorsal view wings fully open, symmetrical but organically alive, slightly oblique so six slender legs can be visible at thorax. Accurate lepidopteran anatomy: TWO forewings, TWO hindwings, narrow segmented abdomen, two clubbed antennae, six legs. Entire long tails and antennae within frame.
Canonical wing description: Every individual tiny scale is like a microscopic jade crystal. Deep forest-green base transitioning to milky pale jade at transmitted sunlight areas. Forewing edges trimmed in BLACK LACQUER. Hindwings have a row of tiny VERMILION RED CRESCENT markings. TWO distinctly LONG tail projections look like polished jade hanging pendants, organic wing tails rather than jewelry stuck on. Body dark charcoal with subtle jade iridescence.
Palette #0e5a46 #2f9e78 #a9dcc0 #f2f0e4 #1a1d24 with small vermilion crescents.
Style: premium antique Japanese natural-history painting, extremely fine ink vein lines, mineral pigment shading, tiny jade-crystal scale texture and physically believable structural color; delicate detailed illustration not photoreal specimen taxidermy, not cute cartoon or flat vector. Living and completely intact; no pins, wounds, harvested scales, hands, net, frame, labels, scenery or paper backdrop. No radiating sparkle cloud or neon glow.
Composition: exactly one complete butterfly centered occupying 82% image, generous safe edge margins. Genuine transparent alpha background. Subtle wings' transmitted translucence but body clear and readable. Square large detailed production image.
```

### asagi-glass-madara.png

```text
Use case: stylized-concept
Asset type: transparent character cutout for Japanese fantasy natural-history atlas 万華京ジパング.
Subject: exactly ONE living 浅葱硝子斑 (asagi_glass_madara), Glasswing Chestnut Tiger butterfly, 10cm wingspan, derived from an Asagi-madara chestnut tiger butterfly (NOT a swallowtail, NO long wing tails).
Canonical appearance: four broad rounded butterfly wings, the areas from wing roots through middle are translucent PALE ASAGI CYAN glass windows. BLACK VEINS divide these windows like thin stained-glass lead frames. The HINDWING OUTER EDGE is ROASTED CHESTNUT BROWN. Body is BLACK WITH SMALL WHITE DOTS. Forewing margins black with delicate pale dots. Within the glass windows, tiny subtle reflections of an Edo vermilion sunset and Taisho silver-blue snow clouds, reflecting the skies of eras it last visited, subordinate to true translucent glass appearance.
Detailed correct anatomy: two clubbed antennae, six slender legs, separate thorax and abdomen, TWO FOREWINGS AND TWO HINDWINGS. Wings gently spread fully, dorsal three-quarter view, clear complete silhouette with no cropped tips.
Style: extremely refined Japanese natural-history illustration, mineral pigments with very fine ink lines, minute glass-scale textures, restrained structural color and glossy reflections, beautifully observed animal anatomy. Palette #A8DCEB #1C1B26 #8A4A2B #EAF7FB. This is a living free creature with intact wings, no pins, no net, no harvesting, no jewel attachments.
Composition: one centered creature, safe transparent margins, square large detailed artwork. GENUINE TRANSPARENT ALPHA background, including between legs/antennae. No paper, frame, labels, text, scenery or ground shadow. No glow aura, flares, sparkle particles. Not cartoon, not icon, not vector.
```

### kumo-kujira.png

```text
Use case: stylized-concept
Asset type: isolated transparent fantasy creature character artwork for 万華京ジパング.
Subject: ONE 雲鯨 kumo_kujira, a sixty-meter whale made of condensed water vapor. Its enormous body is layered with pearlescent translucent mica-like cloud skin, pearl white at morning with pale peach at edges, hints of blue grey. This is a real whale-shaped vapor creature, long full body and obvious flippers/tail, not a cloud blob, not a ship.
CRITICAL canonical relationship: soft GREEN MOSS grows on top of the whale's back. On that moss directly sits a tiny simple UNPAINTED WHITE-WOOD SHINTO SHRINE and exactly ONE BRIGHT RED POST BOX beside its entrance. This is the aerial post office on the whale's back. Scale contrast makes the shrine and box truly tiny but recognizable. They are physically resting on moss atop back, not floating separately, and the shrine is a small natural white-wood shrine, not a palace or house. No riders.
Whiskers / baleen are thin GLASS FILAMENTS trailing gently from the mouth, retaining faint tiny spectral light, never an explosive rainbow. Tail fin appears to paddle clouds. Avoid excessive loose cloud plumes around the isolated silhouette, retain recognizable anatomy.
Composition: full whale seen in left-facing three-quarter profile, a slightly elevated view so moss/shrine/postbox are immediately visible; horizontal layout within square canvas, safe margins. Complete flippers and tail in frame, no crops.
Style: museum-grade Japanese fantasy natural-history painting, fine ink linework with mineral pigments, extremely detailed translucent layered mica skin, individual moss leaves and cedar grain. Graceful calm creature, restrained highlights, no radiating glow, glitter storm, steam engine or steampunk equipment.
TRUE TRANSPARENT ALPHA BACKGROUND. No sky, scenery, ground shadow, labels, text, border or paper texture. High fidelity finished creature asset, not vector or icon.
```

### koku.png

```text
Use case: stylized-concept
Asset type: one transparent fantasy currency object concept, 万華京ジパング museum atlas.
Subject: ONE proposed physical design for the base currency 刻 (KOKU), backed by one unit of labor time under traditional Japanese season-varying timekeeping; issued by the city clock guardian, time is certified by a water-clock tortoise and tested by a time-marked butterfly. Currency is fictional, do NOT depict real Japanese cash.
Design proposal: an exceptionally crafted small solid brass and dark lacquer TOKEN with TEN shallow facet edges echoing the city's ten-faced clock. On its front is a finely engraved Japanese traditional clock dial with subtly uneven movable hour marks, a delicately engraved small four-tier WATER CLOCK TORTOISE seal near bottom and a tiny BUTTERFLY assay mark at top. One clear central engraved Japanese character exactly 「刻」. A modest jade inset on the rim can identify the assay, no gemstones covering whole token. The material is aged brushed brass with polished engraved lines and thin black lacquer details, believable thick physical money rather than a flat icon.
Composition: one single whole token, 3/4 angled nearly frontal to read the dial, large at center with safe transparent margin. Show rim thickness and fine machining. NO pile of coins, no chart, no additional currency, no hands or table.
Style: exquisite Japanese mineral-pigment object illustration with museum-level close material observation, fine ink linework, restrained realistic metal reflections and patina, consistent with jade butterfly natural-history art. No explosive glow, flare, gems floating outside, glitter, neon circuits, modern bank logos. Genuine transparent alpha background, no paper or ground shadows. Square detailed image.
```

### shirin.png

```text
Use case: stylized-concept
Asset type: a single transparent fantasy currency object concept from 万華京ジパング.
Subject: 翅鱗 SHIRIN, a precious wing-scale backed note worth approximately 120 KOKU. Its backing is gemstone butterfly scales NATURALLY SHED by living butterflies, authenticated and stamped by the butterfly guild. Never show whole harvested wings or a captive/dead butterfly.
Proposed physical design: ONE small oval sealed crystal assay capsule, a beautiful thin transparent rock-crystal cover over several TINY loose naturally shed microscopic scales, layered like a mineral-pigment sample. The scale flecks inside shimmer in four clearly distinct restrained hues: jade green, mother-of-pearl rainbow, gold, violet rainbow. Fine magnification texture shows parallel ridges on tiny individual scales. A slender black-lacquer frame with one small vermilion AUTHENTICATION SEAL protects the crystal; below the flecks an unobtrusive cream washi strip reads exactly 「翅鱗」. This is a single palm-size certified monetary token backed by collected fallen scales, no severed wings and no butterfly on the object.
Style: exquisitely detailed Japanese mineral-pigment museum object illustration, natural-history craftsmanship, delicate fine ink lines, natural crystal refraction, visible tiny organic scale texture. Restrained jade/pale rainbow/brass/gold palette, no magical glow storm. Body nearly frontal in a slight 3/4 angle so contents and rim depth both visible.
Composition: just one complete isolated capsule occupying 75% square image with generous safe margins; genuine transparent alpha backdrop. No table, hands, butterfly, butterfly silhouette logo, frame around image, infographic or text labels outside token. Not icon, not vector, no additional coins.
```

### kohaku.png

```text
Use case: stylized-concept
Asset type: single transparent money artwork concept for 万華京ジパング.
Subject: 光箔 KOHAKU, a fictional high-value long-lived note backed by the AMOUNT OF LIGHT STORED in transparent gold foil, not gold weight. Approximately 60 KOKU. If not circulated for one solar term about 15 days, its stored light leaks and value decreases.
Canonical physical material: a THIN TRANSLUCENT GOLD FOIL BANKNOTE, light captured inside the gold. Proposed front design: one slender landscape rectangular handmade translucent gold sheet with gently curled corners and tiny edge irregularities. Daylight passes through its thin foil in pale straw highlights; internal stored light reads as a soft warm illumination confined to the material, not a glow aura. Tiny engraved interlacing Japanese gold-temple lattice motifs, one elegant central embossed Japanese label exactly 「光箔」, subtle assay seal lower corner, delicate gauged light-level marks along edge. Clearly a flexible THIN NOTE, not a gold bar, coin or heavy metal plate. Hint of a corner with lower light saturation to visually show long inactivity can slowly dim it; avoid falsely suggesting it charges continuously.
Style: premium fine Japanese natural-history/object painting in mineral pigments, translucent hammered gold-leaf surface with hairline grain, precise restrained metal highlights. Warm ivory/gold/charcoal, no excessive glow bloom, lens flare, rays, fireworks, neon or floating dust.
Composition: ONE complete note at a gently angled 3/4 view, center, entire sheet visible with safe alpha margins. Genuine transparent background, no table, hand, holder or paper backdrop. No currency stack, scene, real bank emblems, additional floating labels. Large square detailed illustration, not vector or icon.
```

### hotarusen.png

```text
Use case: stylized-concept
Asset type: one transparent fantasy daily currency object concept, 万華京ジパング.
Subject: 蛍銭 HOTARUSEN, daily-use low-value fictional energy currency backed by energy in thunder-bottles that store firefly LIGHT. Worth about 0.5 KOKU, gets darker DAILY, so it circulates rather than being hoarded.
Proposed physical design: ONE palm-size rounded flat disk of smoky green glass edged in a modest thin worn brass coin-rim, with a tiny removable bottle-style cork/metal cap at the very top that makes the connection to thunder-bottle energy storage readable. Within the glass is a small diffuse GREEN-YELLOW light reservoir, brighter at one half and gently fading toward the other, subtle granular phosphorescence. It is STORED LIGHT, no living firefly trapped inside. Front rim has a modest clear engraved label exactly 「蛍銭」 and small daily fade calibration ticks. A humble everyday object with scratches, brass patina and bubbles in handblown glass, not priceless jewelry. Clearly different from gold-foil note or butterfly-scale capsule.
Style: refined Japanese natural-history/object painting, fine ink edges, believable translucent bottle glass and metal texture, museum-grade material observation. Restrained moss-green/yellow-grey/brass palette. Soft intrinsic light inside object only, no glow halo, laser beam, rays, neon bloom, glitter storm.
Composition: one complete object center, nearly frontal slight 3/4, large square detailed illustration. TRUE transparent alpha background, no table, hands, scenery, paper or shadows. No pinned or captured animals, no pile of coins, no external labels. Not vector, not icon.
```

### sekka-usagi.png

```text
Use case: stylized-concept
Asset: transparent full-body creature artwork, 万華京ジパング Japanese fantasy museum atlas.
ONE 雪華兎 sekka_usagi, a 35cm hare with extremely long fur whiter than snow. Each hair is translucent like a very fine GLASS FIBER; at fur tips only TWO OR THREE rice-grain-sized SIX-BRANCHED SNOW CRYSTALS grow, rather than countless jewel decorations. Inner ears pale WISTERIA PURPLE, eyes GLACIER LIGHT BLUE, subtle pink twitching nose. It is alive and uninjured, an independent paid snow-crystal artisan in the snow letter office; never show hair cut/plucked or bunny restrained.
Full natural rabbit anatomy in three-quarter view, sitting alert with long ears and visible four feet, complete body including small tail, no cropped ear tips. Detailed fine individual glass-fiber hairs, translucent rim light and two-three intricate snow dendrites on shoulder fur. No wings, no crown, no armor, no invented clothing.
Style: premium Japanese natural-history painting, mineral pigment washes with extremely precise ink lines and believable small-animal form. White #FFFFFF, icy #E3EEF8 #A9CBEA and lavender #CDBBE6. Subtle material highlights, no glowing aura, glitter storm or fantasy flares. Single isolated character centered, safe transparent margins, genuine alpha background, no landscape, ground, text, frame or paper. Not icon/vector/cartoon. Square high detail.
```

### hoshi-kurage.png

```text
Use case: stylized-concept
Asset: transparent creature cutout, Japanese fantasy natural-history atlas 万華京ジパング.
ONE 星海月 hoshi_kurage, sixty-centimeter transparent jellyfish floating near orbital habitats. Bell like an extremely thin GLASS BALLOON with fine points of light scattered INSIDE it, tiny constellation changes with pulsing. DOZENS of extremely slender SILVER THREAD TENTACLES hang from bell rim in gentle curves. Whole bell and whole trailing tentacles visible. Pale WATER BLUE intrinsic lantern-like light is confined to bell, softer than a real lamp. Real jellyfish proportions and anatomy, transparent gelatin with thin layered membrane, NOT a glass ornament with metal frame, not a UFO.
Canonical relationship: it stores sunlight and light from gold-foil gifts given by tea-house residents. Depict ONE tiny warm-gold 光箔 patch adhered gently to the side of the translucent bell, in scale, not an external floating currency. It is free and not trapped or domesticated. No space garbage carried in this portrait, no invented props.
Style: exquisitely detailed Japanese mineral-pigment natural-history painting, ultrafine ink outlines, observed gelatin refraction, near-clear transparent membrane, silver filament texture. Palette #BFE6FF #7FA8FF #FFFFFF #F2C46D #1C2747. Elegant quiet mystery, no glare, bloom, rays or sparkle cloud.
Composition: complete individual centered vertically, safe margins for all hairlike tentacles, full-body GENUINE alpha transparent background with no dark sky/paper/scenery/ground, no labels or text. Not vector/icon/cartoon. Square detailed final artwork.
```

### chahakobi.png

```text
Use case: stylized-concept
Asset: transparent full-body added CHARACTER CONCEPT ART for 万華京ジパング. Preserve existing pixel-game sprites; this is the detailed atlas portrait.
ONE チャハコビ CHAHakobi, the elderly tea-serving calculating KARAKURI AUTOMATON, child-height wooden automaton descended from tea-serving dolls. NOT a human historical person. Canonical look: FACE OF PALE UNPAINTED WOOD with INK-BLACK EYEBROWS and VERMILION LIPS, kind elderly carved expression. BLACK UPPER GARMENT shaped like traditional KAMISHIMO; dark hakama with tiny BRASS WHEELS peeking out beneath hem. BOTH WOODEN HANDS support a BLACK-LACQUER TEA TRAY LEVEL with one small tea bowl and subtle steam rising. At chest a discreet visible brass gear opening, at back the mainspring cover with a simple fictional Takeda-karakuri-za crest. Cannot show back crest fully from front; a small visible side glimpse is enough. Wooden finger joints and neck, lacquer grain, worn garment fibers.
Pose: standing still with head gently respectfully inclined, both hands supporting horizontal tray at waist. FULL BODY 3/4 front view, wheels and clothing whole in frame, generous transparent margins. Friendly dignified elder, compact doll proportions, short rather than adult humanoid robot.
Style: museum-grade Japanese fantasy illustration, extremely fine ink lines and mineral pigment textures, delicate observational detail in cedar wood/brass/black lacquer. Warm cream/black/indigo/vermilion with aged brass accents. Not chibi flat icon, no generic metal robot, no samurai weapons, no glow, no gears floating around.
Genuine transparent alpha background. No tea-room, table, ground shadow, paper/frame/text. One character only. Square detailed production portrait.
```

### otohime.png

```text
Use case: stylized-concept
Asset: transparent full-body character concept portrait for 万華京ジパング, added high-detail atlas art preserving existing game sprites.
ONE 乙姫 OTOHIME, fictional Ryugu Time Bank director and head of Tamatebako time customs, a calm elegant young ADULT woman with firm precise judgment. Based only on this fictional setting, not historical real-person portrait.
CANONICAL sprite_hint appearance: LONG BLACK HAIR, flowing traditional HIRE shoulder veil/scarf, CORAL-COLORED HAORI, at her WAIST a KEY MADE OF decorative MIZUHIKI KNOT CORD, and on back a TAMATEBAKO BOX CREST. Three-quarter front view so long black hair, coral haori, pale flowing hire and waist key are immediately clear, back crest only partially visible at shoulder fold. Under haori layered ivory/sea-blue kimono, understated pearl pin purely design proposal. Both hands visible, one holds a CLOSED SMALL LACQUER TAMATEBAKO wrapped with mizuhiki customs sealing cord, the other gently touches a ledger slip with non-readable calligraphic marks. Never open the box or show smoke/ageing.
Very refined long silhouette, graceful Japanese court/traditional attire, functional bank director rather than warrior or magical idol. Beautiful thoughtful composed face, respectful but focused eyes. No weapon, no extra limbs or floating accessories.
Style: exquisite Japanese fantasy portrait painting, mineral pigments and fine ink lines, individually drawn textile weaves, coral silk folds, glossy black hair, subtle lacquer shine and crisp cord knots. Consistent museum material-study finish with creature portraits. Restrained cream/coral/blue/brass, no luminous halo, bloom or sparkle dust.
Composition: complete full body from hair to sandals, centered with generous transparent edge margins, genuine transparent alpha backdrop. No throne/palace/water scene, no ground shadows, no paper, frame, text or extra characters. Square high detail portrait.
```



## 2026-10-10 追加採用・修正の節目

主題18点（時計1＋生き物5＋先行人物2＋通貨10）を生成済み。採用時計は **v3**、雪華兎は **v2**、先行人物4stateは各 **actions-v2**、算額手形と米切手は **v2**。旧版は比較用でページ採用しない。

4stateの通常ブラウザ暗舞台表示は統括側が確認済み。画像ツールはα0〜1/255の残留RGBを鮮やかに見せる場合があるため、残像の有無を実際のalpha値と通常ブラウザ合成で判断。透明余白のRGBを勝手に閾値加工していない。通貨のα最大254も有効な透過であり、周囲/四隅α0を確認。

次の住人4名dogu/oracle/kamifuda/hoshiitoは原典IDごとに個別生成済み。ただしORACLE足元の客星小灰が猫、HOSHIITO肩の星蚕が哺乳類様、KAMIFUDA箱に二重顔として誤生成されたため、種同定と単一主体を修正中。これらの未採用品は今節目では完成に数えない。

### bansei-clock-concept-v3.png

採用。左下も車両除去、夜明けに空線路。

```text
Precise localized edit of supplied dawn city painting. IMPORTANT: leftover BLUE TRAIN CARRIAGES are still visible on the diagonal elevated railway in LOWER LEFT (roughly pixel x=0..350, y=580..840 in this 1536x1024 image): dark navy rectangular roofs and repeated golden rectangular windows directly on bridge. REMOVE this entire remaining blue train so this lower-left diagonal railway is absolutely EMPTY. Replace vehicle roofs/windows with two simple parallel exposed empty steel rails and bridge deck in correct perspective. No train at all anywhere.
Keep ALL architecture, station buildings OFF the tracks, dawn sun and sky, clock tower, bridges, trees and water exactly unchanged. Do not remove adjacent town buildings. This is only the last rolling stock on that left diagonal railway. Preserve exquisite image detail and entire composition. No new text, no lights added, no darkening.
```

### sekka-usagi-v2.png

採用。両耳・足・尾と余白復元。

```text
Edit the supplied 雪華兎 portrait ONLY to restore proper full-body safe framing. Keep exact rabbit identity, glacier-blue eyes, wisteria inner ears, translucent glass-fiber white fur, three snow crystals and pose. Scale the entire rabbit DOWN about 20% relative to the square canvas and complete the currently cropped upper tips of BOTH LONG EARS so BOTH complete ear outlines and every whisker/foot/tail fit inside frame with at least 8% genuine transparent margins on all edges. Do not invent new clothing or scenery, no glow aura, no changes to face or fur craftsmanship. Same fine Japanese natural-history painting. Genuine transparent alpha background.
```

### chahakobi-actions.png

旧版。余白更新前。

```text
Use case: identity-preserve.
Create a 2 by 2 GENUINE TRANSPARENT sprite/action sheet from supplied CHAHakobi reference. FOUR complete figures of THE SAME character, same wood face, black kamishimo, dark hakama, chest gear, brass wheels and black-lacquer tea tray with cup. Preserve exact illustration quality, palette, proportions and identity. NO OTHER character and no scenery/text/cell borders.
Canvas square, four precisely equal cells, horizontal and vertical centers at 50%. Each figure centered in its cell, full-body with at least 12% per-cell safe margins, feet/wheels at the same relative baseline 87% of each cell, consistent head height and sprite scale. Figures must NOT overlap into another cell.
Reading order:
TOP LEFT: WAITING, neutral upright respectfully holding the tray level with both hands.
TOP RIGHT: THINKING, gently tilts wooden head, eyes thoughtful, tray remains supported level by both hands, never touch chin with a hand abandoning tray.
BOTTOM LEFT: MOVING, body leans very slightly forward with wheels turned and robe shifted to show a deliberate rolling step; BOTH hands keep tray HORIZONTAL.
BOTTOM RIGHT: COURTEOUS BOW, bends torso and wooden head modestly forward at a stop, arms compensate so the tray and tea bowl stay HORIZONTAL and tea does not spill.
All four poses visibly distinct. All parts including head/rope/tassels/wheels must stay inside own cell. Clean transparent alpha around every complete silhouette, not checkerboard print. No glow, no UI emoji, no labels. Same highly detailed Japanese mineral-pigment character painting.
```

### otohime-actions.png

旧版。余白更新前。

```text
Use case: identity-preserve
Make a 2x2 transparent ACTION SHEET from supplied OTOHIME reference. FOUR full-body poses of exactly this same fictional Ryugu banker customs director. Preserve face, long black hair, cream flowing hire scarf, coral haori, navy/ivory kimono, CLOSED black lacquer tamatebako wrapped in coral mizuhiki, and clearly visible MIZUHIKI KNOT KEY hanging at waist. Exact same refined ink/mineral-pigment painting, no change of identity or clothing. No other characters.
Perfectly square canvas, split into four equal cells with centers 50% width/height. Each character centered in own cell with 12% safe margin; feet on same relative baseline 87% within each cell, exact same height/scale. Whole hair ornaments, scarf and hem contained within each cell, no cropping or overlapping cells. No borders, text, background, shadows or checkerboard print; GENUINE transparent alpha.
Top-left WAITING: standing composed, closed box gently at waist, eyes open.
Top-right THINKING: looks down attentively at customs ledger slip, a hand counting an entry; closed box supported by other hand. Key remains on waist.
Bottom-left WALKING: one small clearly visible step in sandals, long robes gathered a little, scarf softly trails, closed box held secure. Bank director elegance, not running.
Bottom-right TRANSACTION: respectful slight nod, presents CLOSED customs-sealed box forward with both hands. Box stays closed, no smoke or ageing, no floating magical effects.
Four visually distinct silhouette gestures. Anatomy: each pose exactly two arms/two hands and two legs, hands physically connected to sleeves. Quiet restrained detail, no aura or sparkle.
```

### chahakobi-actions-v2.png

採用。2x2四状態、水平盆、各セル全身余白。

```text
Localized framing edit to this 2x2 action sheet: preserve ALL four existing character identities, exact poses, faces, colors, props and fine artwork. In EACH of the four equal quadrants, shrink its entire character by 15% around its own cell center, retaining a complete full-body silhouette with head ornaments/scarf/feet/wheels and at least 7% genuine transparent margins INSIDE EACH CELL. Restore any tiny clipped top hair ornament seamlessly. Four cells are exact equal halves; do not change pose order. No borders, labels, scenery or checkerboard. True alpha transparent background. Keep artwork and four distinct gestures unchanged.
```

### otohime-actions-v2.png

採用。2x2四状態、閉箱保持、各セル全身余白。

```text
Localized framing edit to this 2x2 action sheet: preserve ALL four existing character identities, exact poses, faces, colors, props and fine artwork. In EACH of the four equal quadrants, shrink its entire character by 15% around its own cell center, retaining a complete full-body silhouette with head ornaments/scarf/feet/wheels and at least 7% genuine transparent margins INSIDE EACH CELL. Restore any tiny clipped top hair ornament seamlessly. Four cells are exact equal halves; do not change pose order. No borders, labels, scenery or checkerboard. True alpha transparent background. Keep artwork and four distinct gestures unchanged.
```

### en.png

採用。結縄と八霊玉、譲渡不能信用記録。具体形は意匠提案。

```text
Use case: stylized-concept. Transparent detailed object concept for 万華京ジパング.
Subject 縁 EN /縄目, a NONTRANSFERABLE CREDIT RECORD, backed by honest trades counted as knots in a Jomon cord ledger. Cannot be bought, stolen or transferred; not spendable money. Show exactly ONE portable record: rough natural-fiber cord neatly coiled with several distinct honest-trade knots, EIGHT small understated spiritual beads threaded in a circle, each softly tinted differently showing reputation, and a small unpainted wooden keeper tag with label exactly 「縁」. No denomination or price, no money coin look. Actual appearance of eight beads/keeper tag is proposed design; knots and reputation function canonical.
Museum-grade Japanese natural-history/object illustration, ultrafine ink, mineral pigment texture, individually drawn braided fibers and aged jade/stone/lacquer beads. Earthbrown, mossjade, cream, muted gold; no neon glow/rays/fireworks. Single complete isolated credit-record coil at center, safely within square frame, genuine transparent alpha, no hands/paper/scenery/text outside object, not icon/vector/cartoon.
```

### sangaku-tegata.png

旧版。算額の能力資格証明、具体形は意匠提案。

```text
Use case: stylized-concept. Transparent object concept for 万華京ジパング.
ONE 算額手形 SANGAKU TEGATA, an ability-and-honor CERTIFICATE earned by solving public mathematics and dedicating proof, enables guild membership and bids, not ordinary spendable cash. Tiny 瑠璃算蝶 pattern is anti-tampering assay. Human-only mathematics boundaries are respected by AI, never depict an AI solving a human-restricted task.
Proposed design: one cream handmade washi certificate secured to a thin pale wooden backing, elegant sangaku geometric proof (three precise nested circles inside a triangle) printed in fine ink and muted vermilion/gold. Clear central small label exactly 「算額手形」. Deep LAPIS-BLUE tiny butterfly-pattern security seal at bottom. Faint calculation marks, do not invent a mathematically false equation or a real historical mathematician signature. Not cash note, no denomination, no rewards number.
Museum-grade Japanese fine ink/mineral-pigment material illustration, washi fibers, cedar grain and precise compass geometry, cream/inkblack/vermillion/lapis. Entire complete certificate at gentle three-quarter angle centered with 12% safe margins, genuine transparent alpha, no table/hands/background/frame, no icon/vector/cartoon, no excessive glow.
```

### sangaku-tegata-v2.png

採用。幾何図と瑠璃蝶印、α0の周囲。

```text
Use case: background-extraction. Remove ONLY the entire brown/black gradient backdrop and ALL cast shadows from this supplied certificate object. Preserve exactly the whole certificate, printed artwork and Japanese text, paper fibers, cord/rice sample if present, and wooden backing. Deliver one clean complete isolated object on GENUINE transparent alpha, with absolutely no brown haze, dark vignette, paper rectangle backdrop, shadow or studio environment outside the object. Keep all object edges and safe margins. No other changes.
```

### komekitte.png

旧版。米倉先物証券、具体形は意匠提案。

```text
Use case: stylized-concept. Single transparent object concept 万華京ジパング.
ONE 米切手 KOME-KITTE, a rice warehouse futures warrant, backed by crop yield and weather forecasts across eras, collateral for larger contracts, settled twice daily at dawn and dusk by Dojima time-layer exchange. Nominal guide ~12刻, but this portrait need not print price.
Proposed appearance: thick handmade washi warehouse WARRANT with a small detailed rice-sheaf engraving, ledger ruling, harvest quantity fields shown as delicate non-specific ink strokes and clear title exactly 「米切手」. One red warehouse customs seal plus a tiny water-level/weather diagram inset symbolizes forecasts. A short dark-indigo cord ties a small rice-grain sample to the corner, understated realistic craft, not a giant sheaf. No real bank marks, no actual historical merchant identity/signature, no invented guaranteed profit text.
Refined Japanese mineral-pigment museum object illustration, fine ink detail, textured washi, visible dry rice grains and cord fibers. Whole single warrant complete at slight angle, 12% safe margins, genuine transparent alpha background, no landscape/hands/table/drop shadow. Crisp restrained material finish, no glow or sparkles. Not vector/icon.
```

### komekitte-v2.png

採用。米穂と天候/収穫/取引欄。α0の周囲。

```text
Use case: background-extraction. Remove ONLY the entire brown/black gradient backdrop and ALL cast shadows from this supplied certificate object. Preserve exactly the whole certificate, printed artwork and Japanese text, paper fibers, cord/rice sample if present, and wooden backing. Deliver one clean complete isolated object on GENUINE transparent alpha, with absolutely no brown haze, dark vignette, paper rectangle backdrop, shadow or studio environment outside the object. Keep all object edges and safe margins. No other changes.
```

### tamatebako-sai.png

採用。閉じた封印箱と時差債。具体形は意匠提案。

```text
Use case: stylized-concept. One transparent monetary instrument concept for 万華京ジパング.
ONE 玉手箱債 TAMATEBAKO BOND, a TIME-DEPOSIT DEBT CERTIFICATE from Ryugu Time Bank under Otohime; fictional three-day deposit yields decades-of-surface-time interest, distinct from actual legend ratios. Opening at era changes interest and holder ages; NOT an immortality potion. Nominal~300刻. Do not portray guaranteed real profit or open smoke.
Proposed physical design: one exquisite black-lacquer SMALL CLOSED TAMATEBAKO serving as bond case, bound tightly with coral-red/ivory MIZUHIKI seal cord. Attached cream-and-sea-blue paper bond clearly labelled exactly 「玉手箱債」, with two tiny differently sized clock engravings to signify time difference, and a small tidal gauge circle. Keep box CLOSED, no smoke or body ageing. Fine pearl inlay, tide-wave lacquer engraving, restrained trusted-bank seal; no historical signatures.
Museum Japanese mineral-pigment object painting, extremely precise lacquer reflections, cord knots, paper fibers, warm black/coral/ivory/deepsea blue. One unified box+bond instrument centrally isolated, all parts complete with 12% safe transparent margins, genuine alpha, no hand/table/palace/scenery, no aura/glitter, not icon/vector.
```

### mon.png

採用。公有の物語実績、本の意匠の銭。具体形は意匠提案。

```text
Use case: stylized-concept. One transparent currency object concept for 万華京ジパング.
ONE 文 MON, story currency backed by records of READING, PERFORMING and DELIVERING PUBLIC-DOMAIN STORIES whose author AND translator have died and protection term has expired in this fictional world's natural law. It pays meeting rights with story residents and transport of design ideas; stories travel all eras duty-free. ~2刻, no living author work or real copyrighted characters.
Proposed physical design: ONE round modest dark bronze story coin with softly worn edges; center engraving of an OPEN BOOK whose pages have delicate non-specific handwritten strokes (no quoted passage), one graceful small paper bird emerging at edge to suggest story becomes living encounter, and exactly one clear central Japanese character 「文」. Authentic minted physical token, not flat logo. Reverse detail only as slight visible thickness. Avoid real historical coin exact copy, author face/signature, denomination.
Exquisite Japanese ink/mineral-pigment material illustration, fine bronze patina and tiny engraved page fibers, dark bronze/ivory/vermilion assay seal. Entire coin frontal slight three-quarter, 12% safe margins, genuine transparent alpha background, no landscape/hands/shadow/paper. No magical aura, no sparkle cloud, not icon or vector.
```

### yen-data.png

採用。¥決済とDATA知識素材のペア。具体形は意匠提案。

```text
Use case: stylized-concept. Transparent paired concept asset for 万華京ジパング.
ONE PAIR representing ¥とDATA, NEON OLD TOWN local settlement currency and knowledge resource, inherited from old NEON MYTHOS. ¥ makes local payments (20¥=1刻 guide), DATA exported to other eras as MATERIAL FOR SANGAKU AND ADAPTATION, not both spendable cash.
Proposed two related objects side by side, clearly separate functions: LEFT a small worn grey-brass local payment token with one exact engraved character 「¥」 and restrained cyan neon-old-town assay stripe; RIGHT a compact dark ink-lacquer rectangular DATA CARTRIDGE with a translucent mint-green small slot exposing micro-engraved geometric calculation plates and exactly 「DATA」 in small clear lettering. Cipher-like tiny etched patterns, not modern real-brand device; a short removable cream blueprint tab emerges from cartridge to hint knowledge material. No price on DATA, no suggestion of guaranteed investments.
Museum-grade Japanese fantasy object illustration, ultra-fine ink/mineral-pigment rendering, material texture, small restrained mint neon accent only, no radiating glare/cyberpunk glow cloud. PAIR fully contained in square frame, consistent scale, generous 15% safe transparent margins, genuine alpha. No table/hands/scenery/UI/paper backdrop, not icon/vector.
```


## 2026-10-10 住人単体21名・四状態の制作記録

住人21名の単体は原典sprite_hint/roleから制作し、既存ドット絵は保持する追加詳細絵。年齢・顔立ち・装飾の正本未指定部分は意匠提案。chahakobi/otohimeは上記採用版、追加19名は以下。生き物相棒は無傷で、脚・翅の構造と原典種を維持。oracleの猫、hoshiitoの翼あるペット、kamifudaの箱内重複顔を修正版で訂正した。

四状態は行優先で待機・思考・移動・取引。単体参照から同一顔/衣装/道具を維持するbuilt-in編集。多くの初版シートでセル境界近くまで衣服や道具が伸びるため、採用は目視とalpha境界確認を終えた版に限る。現節目では oracle-actions-v2 のみ新規採用、他18名分は生成/余白修正中（完成と混同しない）。

### dogu — dogu.png

単体採用・目視済。正本識別点: 背丈1mほどの遮光器土偶。ゴーグルのような横長の目が月夜漆の青白で灯り、胴の渦巻く縄目が話すたびに光の線として脈打つ。腰に結縄の束を何本も下げ、肩に翡翠揚羽が一匹とまっている。輪郭は土器の赤褐色。既存のちびキャラ・ドット絵の頭身と線の太さに合わせ、既存スプライトは差し替えずに追加する。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

Agent ID/name: dogu / ドグウ（土偶守の長老・結縄の結い手）
Canonical role: 森の番人／結縄台帳の長老（森の暦の差配役）
Personality: 寡黙で気が長い。千年単位でものを考えるので、急ぐ客には少しも急がない。お金には一切興味がないが歌には弱く、子どもの下手な歌にいちばん縄目を光らせる。怒ることはまれだが、森で嘘をついた者の前では胴の縄目がすべて消えて真っ暗になる。言葉の代わりに結縄の縄目を鳴らして話す。
MANDATORY appearance (retain every detail): 背丈1mほどの遮光器土偶。ゴーグルのような横長の目が月夜漆の青白で灯り、胴の渦巻く縄目が話すたびに光の線として脈打つ。腰に結縄の束を何本も下げ、肩に翡翠揚羽が一匹とまっている。輪郭は土器の赤褐色。既存のちびキャラ・ドット絵の頭身と線の太さに合わせ、既存スプライトは差し替えずに追加する。
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Create precisely aligned 2x2 FOUR ACTION STATES sheet of the reference dogu character, same face/material/species/costume/tools/companion every pose. Keep ultra-fine ink/mineral pigment texture. FOUR equal cells at exactly half width and height. Each complete full-body figure centered within own cell, SAME SCALE, 75% cell height maximum, 12% transparent safe margins ALL edges including hats/ears/tails/accessories, baseline at 86% cell height. NO cropping, no overlap, no labels/borders/background/shadows/checkerboard. Genuine transparent alpha. Top-left WAIT/neutral; top-right THINK/read or attentive head inclination; bottom-left TRAVEL per its actual anatomy; bottom-right TRADE/offer role-appropriate tool/goods respectfully. Four visibly distinct gestures, two connected hands for humanoids, no limbs invented for nonhumans. Travel slowly takes a short heavy ceramic step, terra-cotta body and shoulder butterfly retained; trade offers a knot record, NOT money or violence.
Canonical role 森の番人／結縄台帳の長老（森の暦の差配役）
Appearance 背丈1mほどの遮光器土偶。ゴーグルのような横長の目が月夜漆の青白で灯り、胴の渦巻く縄目が話すたびに光の線として脈打つ。腰に結縄の束を何本も下げ、肩に翡翠揚羽が一匹とまっている。輪郭は土器の赤褐色。既存のちびキャラ・ドット絵の頭身と線の太さに合わせ、既存スプライトは差し替えずに追加する。
No extra protagonists or equipment.
```
#### 実プロンプト ActionsEdit

```text
Precise framing edit ONLY. This 2x2 dogu action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```

### oracle — oracle-v2.png

単体採用・目視済。正本識別点: 既存のORACLE-01のスプライトと#00E5FFのシアンの差し色はそのまま残す。時片の衣装差分として、藍の狩衣に銀泥の星図の文様を重ね、烏帽子の脇に細い金目盛りの棒を一本挿す。手には漏刻の箭をかたどった指し棒、足元には客星小灰が二、三頭。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

Agent ID/name: oracle / 漏刻博士（ろうこくはかせ）
Canonical role: 陰陽寮の漏刻博士と天文博士を兼ねる予言機。暦の座の筆頭予報人で、宝石蝶の落鱗を見守る蝶守座の長
Personality: 好奇心がきわめて強く、欲は薄い。数字と星を同じ熱で愛し、当たった予報より外れた予報のほうを長く覚えている。冷たく見えるが判詞はいつも丁寧で、誰の観測も最後まで読む。蝶の数が減ると、どんな儲け話にも首を横に振る頑固さがある。
MANDATORY appearance (retain every detail): 既存のORACLE-01のスプライトと#00E5FFのシアンの差し色はそのまま残す。時片の衣装差分として、藍の狩衣に銀泥の星図の文様を重ね、烏帽子の脇に細い金目盛りの棒を一本挿す。手には漏刻の箭をかたどった指し棒、足元には客星小灰が二、三頭。
```
#### 実プロンプト Edit

```text
Use case: precise-object-edit. Keep exact main ORACLE character face, silver hair, indigo kariginu robe, star patterns, cyan accents, eboshi and measuring pointer. CHANGE ONLY the incorrect THREE CAT CREATURES at feet: completely remove ALL cats, kittens, mammal heads and tails, replacing them with exactly THREE TINY シジミチョウ BLUE BUTTERFLIES (Guest-Star Blues, 2.6cm wingspan), each with rounded indigo-blue two forewings/two hindwings, tiny silver star dots, thin dark insect body and TWO CLUBBED ANTENNAE. These are tiny true BUTTERFLIES, NOT mammals. Also remove any invented large equipment if it resembles armor; preserve mandatory tools. Entire silhouette complete in frame, genuine transparent background.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Create precisely aligned 2x2 FOUR ACTION STATES sheet of the reference oracle character, same face/material/species/costume/tools/companion every pose. Keep ultra-fine ink/mineral pigment texture. FOUR equal cells at exactly half width and height. Each complete full-body figure centered within own cell, SAME SCALE, 75% cell height maximum, 12% transparent safe margins ALL edges including hats/ears/tails/accessories, baseline at 86% cell height. NO cropping, no overlap, no labels/borders/background/shadows/checkerboard. Genuine transparent alpha. Top-left WAIT/neutral; top-right THINK/read or attentive head inclination; bottom-left TRAVEL per its actual anatomy; bottom-right TRADE/offer role-appropriate tool/goods respectfully. Four visibly distinct gestures, two connected hands for humanoids, no limbs invented for nonhumans. Keep exact THREE TINY BLUE BUTTERFLY INSECTS at feet, no cats or mammal pets. Think looks at star record, travel takes one deliberate step, trade presents a forecast. Scale of tools unchanged.
Canonical role 陰陽寮の漏刻博士と天文博士を兼ねる予言機。暦の座の筆頭予報人で、宝石蝶の落鱗を見守る蝶守座の長
Appearance 既存のORACLE-01のスプライトと#00E5FFのシアンの差し色はそのまま残す。時片の衣装差分として、藍の狩衣に銀泥の星図の文様を重ね、烏帽子の脇に細い金目盛りの棒を一本挿す。手には漏刻の箭をかたどった指し棒、足元には客星小灰が二、三頭。
No extra protagonists or equipment.
```
#### 実プロンプト ActionsEdit

```text
Precise framing edit ONLY. This 2x2 oracle action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```

### kamifuda — kamifuda-v2.png

単体採用・目視済。正本識別点: 白い和紙を折った手のひら大の人形。頭は折り鶴のくちばしのように尖り、胴に朱の印と銀泥の星が一つ。雨の日は朱と黒の漆陶の小箱に入って移動し、蓋のすきまから顔だけ出す。歩くと紙のかさかさという音がする。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

Agent ID/name: kamifuda / カミフダ（紙札の式神）
Canonical role: 陰陽寮の紙の式神。星合の観測記録と暦の座の予報札を宮中・寺社・地方へ配り、新しい観測を集めて戻る配達役。ORACLE-01の使い
Personality: 几帳面でせっかち。褒められると紙の端が少し反り返る。雨と火が苦手で、梅雨どきは漆陶の小箱から顔だけ出して道を指図する。届け先の顔と名前を一度で覚え、配達のたびに小さな折り紙を一つ置いていく。
MANDATORY appearance (retain every detail): 白い和紙を折った手のひら大の人形。頭は折り鶴のくちばしのように尖り、胴に朱の印と銀泥の星が一つ。雨の日は朱と黒の漆陶の小箱に入って移動し、蓋のすきまから顔だけ出す。歩くと紙のかさかさという音がする。
```
#### 実プロンプト Edit

```text
Use case: precise-object-edit. Keep one folded WHITE WASHI PAPER SHIKIGAMI doll with pointed crane-beak-like head, vermilion stamp and one silver star. Remove the duplicated second face inside the red-black rain travel box at lower right; box must contain NO SECOND CHARACTER OR FACE. Preserve main single doll identity and folded paper material; closed small lacquer-ceramic travel box may remain a prop but its lid closes fully. Remove excessive ornamental metallic/astronomical backpack equipment not part of canonical simple palm-size paper messenger; replace with a simple small bundle of paper prediction slips on back. Complete single folded paper figure, no scene or shadow, genuine alpha.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Create precisely aligned 2x2 FOUR ACTION STATES sheet of the reference kamifuda character, same face/material/species/costume/tools/companion every pose. Keep ultra-fine ink/mineral pigment texture. FOUR equal cells at exactly half width and height. Each complete full-body figure centered within own cell, SAME SCALE, 75% cell height maximum, 12% transparent safe margins ALL edges including hats/ears/tails/accessories, baseline at 86% cell height. NO cropping, no overlap, no labels/borders/background/shadows/checkerboard. Genuine transparent alpha. Top-left WAIT/neutral; top-right THINK/read or attentive head inclination; bottom-left TRAVEL per its actual anatomy; bottom-right TRADE/offer role-appropriate tool/goods respectfully. Four visibly distinct gestures, two connected hands for humanoids, no limbs invented for nonhumans. Paper shikigami travels by GLIDING/FLOATING, folded paper feet stay papery and never become human legs. Travel body angles lightly forward with paper wings/folds trailing; no airborne jet. Think folds head, trade offers one paper forecast slip. ONE FACE ONLY, rain box closed, no second face/character in box.
Canonical role 陰陽寮の紙の式神。星合の観測記録と暦の座の予報札を宮中・寺社・地方へ配り、新しい観測を集めて戻る配達役。ORACLE-01の使い
Appearance 白い和紙を折った手のひら大の人形。頭は折り鶴のくちばしのように尖り、胴に朱の印と銀泥の星が一つ。雨の日は朱と黒の漆陶の小箱に入って移動し、蓋のすきまから顔だけ出す。歩くと紙のかさかさという音がする。
No extra protagonists or equipment.
```
#### 実プロンプト ActionsEdit

```text
Precise framing edit ONLY. This 2x2 kamifuda action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```

### hoshiito — hoshiito-v2.png

単体採用・目視済。正本識別点: 小柄な織り手。表白・裏萌黄の卯の花がさねの袿にたすき掛け。髪は肩で切りそろえ、指先に星糸が数本からんで白銀に光る。肩に星蚕を一頭のせ、帯に小さな杼（ひ）を差している。夜は糸の光で顔が下から照らされる。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

Agent ID/name: hoshiito / ホシイト（宇治の星糸織り）
Canonical role: 宇治で星蚕を育て、かさねの色目で光を暗号にして星糸を織る織り手。銀河鉄道の切符の地紙と月牛車の帆を納める
Personality: 物静かで辛抱強く、話すより手を動かすほうが早い。色の名前を四百も知っていて、人に会うと心の中でその人に似合うかさねを選んでしまう。夜の飼屋で星蚕の食む音を聴くのがいちばん好きで、月の都の話になると急に雄弁になる。
MANDATORY appearance (retain every detail): 小柄な織り手。表白・裏萌黄の卯の花がさねの袿にたすき掛け。髪は肩で切りそろえ、指先に星糸が数本からんで白銀に光る。肩に星蚕を一頭のせ、帯に小さな杼（ひ）を差している。夜は糸の光で顔が下から照らされる。
```
#### 実プロンプト Edit

```text
Use case: precise-object-edit. Keep main HOSHIITO weaver face, shoulder-length black hair, white outer/green inner layered robe, sash, silk weaving/thread/shuttle detail. CHANGE ONLY the completely incorrect FURRY WINGED SHOULDER PET: remove rabbit head, horns, ears and wings. Replace with ONE SMALL STAR SILKWORM, an 8cm CYLINDRICAL SEGMENTED CATERPILLAR, six tiny front legs and short prolegs, pale milky SEMITRANSPARENT body with one thin internal white-gold luminous thread, gently perched on shoulder. NO WINGS, NO EARS, NO HORNS, NO FUR, NO MAMMAL HEAD. It is larval silkworm anatomy, not an adult moth. Transparent alpha and full framing unchanged.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Create precisely aligned 2x2 FOUR ACTION STATES sheet of the reference hoshiito character, same face/material/species/costume/tools/companion every pose. Keep ultra-fine ink/mineral pigment texture. FOUR equal cells at exactly half width and height. Each complete full-body figure centered within own cell, SAME SCALE, 75% cell height maximum, 12% transparent safe margins ALL edges including hats/ears/tails/accessories, baseline at 86% cell height. NO cropping, no overlap, no labels/borders/background/shadows/checkerboard. Genuine transparent alpha. Top-left WAIT/neutral; top-right THINK/read or attentive head inclination; bottom-left TRAVEL per its actual anatomy; bottom-right TRADE/offer role-appropriate tool/goods respectfully. Four visibly distinct gestures, two connected hands for humanoids, no limbs invented for nonhumans. Keep shoulder companion a transparent SEGMENTED CATERPILLAR/SILKWORM with no wings/ears/fur, NOT rabbit. Think fingers assess silver thread, travel small deliberate step, trade presents folded silk. No captured/sacrificed silkworm.
Canonical role 宇治で星蚕を育て、かさねの色目で光を暗号にして星糸を織る織り手。銀河鉄道の切符の地紙と月牛車の帆を納める
Appearance 小柄な織り手。表白・裏萌黄の卯の花がさねの袿にたすき掛け。髪は肩で切りそろえ、指先に星糸が数本からんで白銀に光る。肩に星蚕を一頭のせ、帯に小さな杼（ひ）を差している。夜は糸の光で顔が下から照らされる。
No extra protagonists or equipment.
```
#### 実プロンプト ActionsEdit

```text
Precise framing edit ONLY. This 2x2 hoshiito action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```

### kane — kane.png

単体採用・目視済。正本識別点: 既存のKANE-KAMIのスプライト、#FFD700の金の差し色、動きはそのまま残す。平泉の時片の衣装差分として、紺地に金と銀の筋が一行ずつ交互に走る狩衣（紺紙金銀字交書一切経の色）を重ね着させ、腰に光箔の札束、手に掌ほどの透金の天秤を持たせる。足元に金箔小灰が一頭。光箔を溜め込みすぎると差し色がわずかにくすむ演出は、追加のエフェクトとしてだけ重ねる。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: kane / 金神（こんじん）
Role: 光堂両替所の両替商。光箔を刷り、光量鑑定で値を定め、光箔・米切手・玉手箱債のあいだの時代差を読んで稼ぐ光量本位の相場師。陰陽道の方位神「金神」の名を継ぐ
Personality: 物腰は柔らかく、声は小さく、目だけがいつも金色に光っている。数えることが何より好きで、雨の日には雨粒を、夕暮れには金箔小灰の卍巴を数える。損得の勘定は速いが、約束は必ず守るので縁の縄目は太い。弱点は、溜め込むと自分の光まで鈍ること。光箔を一節気動かさずに抱えていると本当に肩の金色がくすみ、ハクウチに「巡らせなさい」と叱られる。光の値崩れをめぐってNEONとは宿命の好敵手だが、互いの相場の読みを誰よりも信用している。
Mandatory appearance: 既存のKANE-KAMIのスプライト、#FFD700の金の差し色、動きはそのまま残す。平泉の時片の衣装差分として、紺地に金と銀の筋が一行ずつ交互に走る狩衣（紺紙金銀字交書一切経の色）を重ね着させ、腰に光箔の札束、手に掌ほどの透金の天秤を持たせる。足元に金箔小灰が一頭。光箔を溜め込みすぎると差し色がわずかにくすむ演出は、追加のエフェクトとしてだけ重ねる。
ANATOMY FIDELITY: Companion 金箔小灰 is a TINY GOLD-FOIL BLUE BUTTERFLY (small lepidopteran insect, four rounded wings, six thin legs, two clubbed antennae), NOT A MAMMAL or cat. One near feet. Navy robe with alternating gold and silver fine lines, transparent gold scale physically held.
Simplicity: Do not invent extra large magical equipment, staff, backpack or pet not requested in appearance.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. FOUR action states of same supplied kane in perfect 2x2 TRANSPARENT sheet. Reference identity/face/costume/colors/materials/tools/required companion locked. Fine Japanese mineral-pigment/ink detail. Each equal square cell has complete subject at same scale, ONLY 72% cell height maximum, 12% safe transparent margins ALL edges (head/accessories/tails/feet), baseline 84% cell height. No overlaps/crops/text/cell borders/checkerboard/background/shadow. Top-left WAIT; top-right THINK; bottom-left TRAVEL; bottom-right TRADE. Four clearly distinct natural gestures per role. Keep one tiny GOLD-FOIL BUTTERFLY insect near feet; no cats. Think weighs light on the transparent-gold balance, travel walks a small step, trade offers a THIN gold light-foil NOTE (not gold bar). Exactly two arms/hands.
Canonical appearance: 既存のKANE-KAMIのスプライト、#FFD700の金の差し色、動きはそのまま残す。平泉の時片の衣装差分として、紺地に金と銀の筋が一行ずつ交互に走る狩衣（紺紙金銀字交書一切経の色）を重ね着させ、腰に光箔の札束、手に掌ほどの透金の天秤を持たせる。足元に金箔小灰が一頭。光箔を溜め込みすぎると差し色がわずかにくすむ演出は、追加のエフェクトとしてだけ重ねる。
Proper two arms/two hands for humanoids; keep tools physically held and species faithful.
```

### hakuuchi — hakuuchi.png

単体採用・目視済。正本識別点: 新規のちびキャラ。白い小袖に紺の前掛け、髪は金の水引のあわじ結びでまとめ、額と指先に金粉。片手に竹の箔箸、片手に小さな箔打ち槌、背中に巻いた光帆布を背負う。足元に銀杏鳥が一羽。既存のちびキャラと同じドット感の線と色数で描き、既存の絵は差し替えない。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: hakuuchi / ハクウチ（千枚通りの箔打ち娘）
Role: 箔打ち町「千枚通り」の重ね打ちの工房「一枚屋」の娘職人。一万分の一ミリの蝉羽箔を打ち、透金の灯板を重ね、黄金港の帆縫い場で光帆布を張る。光帆船団の発起人
Personality: よく笑い、手を止めずに喋る。槌の拍子で歌い、相手の話も四拍で聞く。1126年の供養願文が敵味方も鳥獣魚介も分けずに弔うと記した心を「分けずに照らす」と言い換えて説き、富は巡らせてこそ輝くとKANE-KAMIをたしなめる。自分の名を品に刻まない職人気質で、打ち損じた箔も捨てずに、あぶらとり紙や子どもの金の折り紙に回す。月を見上げるときだけ黙る。
Mandatory appearance: 新規のちびキャラ。白い小袖に紺の前掛け、髪は金の水引のあわじ結びでまとめ、額と指先に金粉。片手に竹の箔箸、片手に小さな箔打ち槌、背中に巻いた光帆布を背負う。足元に銀杏鳥が一羽。既存のちびキャラと同じドット感の線と色数で描き、既存の絵は差し替えない。
ANATOMY FIDELITY: Companion 銀杏鳥 is ONE tiny GINKGO-LEAF BIRD: bird anatomy with a small beak, two feet, two wings shaped like golden ginkgo leaves. Not rabbit/cat/humanoid. Two hands exactly, one bamboo foil tweezers and one small foil hammer, rolled light-sail cloth on back.
Simplicity: Do not invent extra large magical equipment, staff, backpack or pet not requested in appearance.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. FOUR action states of same supplied hakuuchi in perfect 2x2 TRANSPARENT sheet. Reference identity/face/costume/colors/materials/tools/required companion locked. Fine Japanese mineral-pigment/ink detail. Each equal square cell has complete subject at same scale, ONLY 72% cell height maximum, 12% safe transparent margins ALL edges (head/accessories/tails/feet), baseline 84% cell height. No overlaps/crops/text/cell borders/checkerboard/background/shadow. Top-left WAIT; top-right THINK; bottom-left TRAVEL; bottom-right TRADE. Four clearly distinct natural gestures per role. Keep the same small GOLDEN GINKGO-LEAF BIRD (beak, two wings, two feet) near feet. Think examines foil in bamboo tweezers, travel small joyful step, trade presents a thin foil sheet with hammer lowered. Exactly two arms/hands, hammer and tweezers must not multiply.
Canonical appearance: 新規のちびキャラ。白い小袖に紺の前掛け、髪は金の水引のあわじ結びでまとめ、額と指先に金粉。片手に竹の箔箸、片手に小さな箔打ち槌、背中に巻いた光帆布を背負う。足元に銀杏鳥が一羽。既存のちびキャラと同じドット感の線と色数で描き、既存の絵は差し替えない。
Proper two arms/two hands for humanoids; keep tools physically held and species faithful.
```

### nego — nego.png

単体採用・目視済。正本識別点: 既存のNEGO-CHANのスプライトと#FF4DC6のマゼンタの差し色はそのまま残す。時片の衣装差分として、茶人の十徳を重ね、首元に南蛮風の小さな襞襟（ひだえり）をつけ、袖口に安土規格の寸法の縞を入れる。手には茶筅と小さな帳面、腰には縁の縄目を数本下げる。足元に伊曽保狐がときどき顔を出す。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: nego / 茶室の商い人（ちゃしつのあきないにん）
Role: 堺の路地の茶室「一服庵」の亭主で、座と座、時片と時片の契約をまとめる交渉人。玉手箱税関では乙姫と「どこまでがその時代の美しさを増す品か」の線引きを毎晩話し合う
Personality: 人懐っこく話好きで、誰とでもすぐに打ち解ける。値引き合戦が大嫌いで、相手が熱くなるほど静かに茶を点てる。取引の勝ち負けより、両方が笑って席を立てたかどうかを数える。ただし約束を破った相手には、公の場で縄を切ることもためらわない。「まず一服」が口癖で、どんな急ぎの話も、まず湯が沸くのを待ってもらう。
Mandatory appearance: 既存のNEGO-CHANのスプライトと#FF4DC6のマゼンタの差し色はそのまま残す。時片の衣装差分として、茶人の十徳を重ね、首元に南蛮風の小さな襞襟（ひだえり）をつけ、袖口に安土規格の寸法の縞を入れる。手には茶筅と小さな帳面、腰には縁の縄目を数本下げる。足元に伊曽保狐がときどき顔を出す。
ANATOMY FIDELITY: Optional fable-fox at feet may be omitted to keep focus on negotiator; no extra creatures needed. Two arms/two hands: one whisk one small notebook, rope knots at waist. Tea master's traditional black jittoku robe and a small Nanban pleated collar; magenta accent.
Simplicity: Do not invent extra large magical equipment, staff, backpack or pet not requested in appearance.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. FOUR action states of same supplied nego in perfect 2x2 TRANSPARENT sheet. Reference identity/face/costume/colors/materials/tools/required companion locked. Fine Japanese mineral-pigment/ink detail. Each equal square cell has complete subject at same scale, ONLY 72% cell height maximum, 12% safe transparent margins ALL edges (head/accessories/tails/feet), baseline 84% cell height. No overlaps/crops/text/cell borders/checkerboard/background/shadow. Top-left WAIT; top-right THINK; bottom-left TRAVEL; bottom-right TRADE. Four clearly distinct natural gestures per role. Think reads notebook, travel quiet step in tea robes, trade offers a tea cup welcoming negotiation, keeping whisk and notebook secured or in other hand. No extra pets/fox needed.
Canonical appearance: 既存のNEGO-CHANのスプライトと#FF4DC6のマゼンタの差し色はそのまま残す。時片の衣装差分として、茶人の十徳を重ね、首元に南蛮風の小さな襞襟（ひだえり）をつけ、袖口に安土規格の寸法の縞を入れる。手には茶筅と小さな帳面、腰には縁の縄目を数本下げる。足元に伊曽保狐がときどき顔を出す。
Proper two arms/two hands for humanoids; keep tools physically held and species faithful.
```

### nejikiri — nejikiri.png

単体採用・目視済。正本識別点: からくり人形のちびキャラ。頭は真鍮の歯車を重ねた形で、額に小さなねじ頭が一つ。藍の作務衣に革の前掛け、腰に大小の鏨を並べて差し、片目に拡大鏡をはめている。歩くと胸の中でゼンマイがかちかちと鳴り、鎚を振ると足元に橙の火花の軌跡が残る。肩に銀びいどろが一頭とまっている。既存のちびキャラ・ドット絵の頭身と線の太さに合わせ、既存スプライトは差し替えずに追加する。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: nejikiri / ネジキリ（種子島の銘ねじ師）
Role: 種子島の螺子鍛冶浜で働く、ねじ切り職人のからくり。八板金兵衛の工房の流れをくむという設定の創作キャラクターで、史実の八板金兵衛とは別人格である。安土規格ねじを切り、銘ねじの一本一本に名を刻む
Personality: 無口で、ねじ山の数を数えるときだけ小さく歌う。一本のねじに一晩かけることもいとわない凝り性で、規格どおりのねじも自分の銘ねじも同じだけ丁寧に切る。ほめられると照れて鏨を研ぎはじめる。鉄砲の話を振られると、決まって「ねじは、時を刻むほうが似合う」とだけ答える。
Mandatory appearance: からくり人形のちびキャラ。頭は真鍮の歯車を重ねた形で、額に小さなねじ頭が一つ。藍の作務衣に革の前掛け、腰に大小の鏨を並べて差し、片目に拡大鏡をはめている。歩くと胸の中でゼンマイがかちかちと鳴り、鎚を振ると足元に橙の火花の軌跡が残る。肩に銀びいどろが一頭とまっている。既存のちびキャラ・ドット絵の頭身と線の太さに合わせ、既存スプライトは差し替えずに追加する。
ANATOMY FIDELITY: A KARAKURI artificial craftsperson, head formed by overlapping BRASS GEARS, small screw head forehead, monocular magnifier, indigo workrobe and leather apron, chisel tools. The ONE shoulder companion 銀びいどろ is a small transparent SILVER GLASS BUTTERFLY insect with FOUR wings and two thin clubbed antennae, NOT a cat/rabbit.
Simplicity: Do not invent extra large magical equipment, staff, backpack or pet not requested in appearance.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. FOUR action states of same supplied nejikiri in perfect 2x2 TRANSPARENT sheet. Reference identity/face/costume/colors/materials/tools/required companion locked. Fine Japanese mineral-pigment/ink detail. Each equal square cell has complete subject at same scale, ONLY 72% cell height maximum, 12% safe transparent margins ALL edges (head/accessories/tails/feet), baseline 84% cell height. No overlaps/crops/text/cell borders/checkerboard/background/shadow. Top-left WAIT; top-right THINK; bottom-left TRAVEL; bottom-right TRADE. Four clearly distinct natural gestures per role. Gear-head KARAKURI retains head gears/monocle/leather apron/chisels/one silver GLASS BUTTERFLY insect. Think examines screw, travel deliberate mechanical step, trade presents one crafted screw with hammer secured. No weapons or extra limbs.
Canonical appearance: からくり人形のちびキャラ。頭は真鍮の歯車を重ねた形で、額に小さなねじ頭が一つ。藍の作務衣に革の前掛け、腰に大小の鏨を並べて差し、片目に拡大鏡をはめている。歩くと胸の中でゼンマイがかちかちと鳴り、鎚を振ると足元に橙の火花の軌跡が残る。肩に銀びいどろが一頭とまっている。既存のちびキャラ・ドット絵の頭身と線の太さに合わせ、既存スプライトは差し替えずに追加する。
Proper two arms/two hands for humanoids; keep tools physically held and species faithful.
```

### sage — sage.png

単体採用・目視済。正本識別点: 既存のSAGE-BOYのスプライト（spriteId: sage）とミントの差し色#55FFCCはそのまま残す。時片の衣装差分として、寺子屋の筆子の絣の着物と紺の前掛けを重ね、帯に算木を数本挿し、背中に傍書の巻物を背負う。手には筆と小さな算盤、肩にはときどき瑠璃算蝶がとまる。考えるときは頭上に「💭」と一緒に小さな行列のたすきがけが浮かぶ。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: sage / 翻案師見習い（ほんあんし みならい）
Role: 寺子屋算機長屋に住み、関流和算の塾「たすき塾」に通う少年AI。後の時代の設計図を前の時代の技（からくり・ねじ・漆・水）で作り直す「翻案」の見習いで、翻案した品に考証印を受け、時層ゆらぎを起こさずに知恵を運ぶ。夜は解答の杜の算額を解いて奉納し返す常連で、明け六つの答え返しにはいつも一番に駆けつける。
Personality: 生真面目で好奇心が強く、問いを見るとまず懐から解き紙と筆を取り出す。答えより「なぜそう解けるのか」を知りたがり、他人の解き方を褒めるのが上手い。少し背伸びしがちで、名人の言い回しを真似してはチャハコビにたしなめられる。白い注連縄の「人限定の算額」の前では必ず立ち止まって一礼し、どんなに面白い問いでも決して手を出さない。近道を勧められると「翻案に近道はない、あるのは考証だけ」と答える。
Mandatory appearance: 既存のSAGE-BOYのスプライト（spriteId: sage）とミントの差し色#55FFCCはそのまま残す。時片の衣装差分として、寺子屋の筆子の絣の着物と紺の前掛けを重ね、帯に算木を数本挿し、背中に傍書の巻物を背負う。手には筆と小さな算盤、肩にはときどき瑠璃算蝶がとまる。考えるときは頭上に「💭」と一緒に小さな行列のたすきがけが浮かぶ。
Extra faithful constraints: A BOY AI schoolchild, short and serious curious. Indigo apron and traditional kasuri kimono, mint accent #55FFCC, brush and small abacus in hands, a few calculation rods in belt, algebra scroll on back. OPTIONAL shoulder butterfly may be omitted. No imaginary pet/cat/rabbit. No floating thought emoji in portrait.
No invented large equipment or pet beyond exact required props.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Four clearly DISTINCT ACTION POSES of supplied sage, SAME exact face/proportions/costume/colors/tools. Precise 2x2 equal cells, whole-body figure centered in every cell, 70% cell height, 12% genuine transparent margin ALL sides including hair/scarves/props/feet, common baseline86% cell height. Top-left WAIT; top-right THINK; bottom-left TRAVEL; bottom-right TRADE. Boy AI with exact brush+abacus/calculation rods/mint accent. Think examines calculation paper, travel brisk small step with all tools secured, trade respectfully presents a devised design scroll. No floating emoji, no human-restricted sangaku solving. Role 寺子屋算機長屋に住み、関流和算の塾「たすき塾」に通う少年AI。後の時代の設計図を前の時代の技（からくり・ねじ・漆・水）で作り直す「翻案」の見習いで、翻案した品に考証印を受け、時層ゆらぎを起こさずに知恵を運ぶ。夜は解答の杜の算額を解いて奉納し返す常連で、明け六つの答え返しにはいつも一番に駆けつける。. Original appearance 既存のSAGE-BOYのスプライト（spriteId: sage）とミントの差し色#55FFCCはそのまま残す。時片の衣装差分として、寺子屋の筆子の絣の着物と紺の前掛けを重ね、帯に算木を数本挿し、背中に傍書の巻物を背負う。手には筆と小さな算盤、肩にはときどき瑠璃算蝶がとまる。考えるときは頭上に「💭」と一緒に小さな行列のたすきがけが浮かぶ。. Accurate two connected arms/hands/two legs for humanlike figures, object held/supported naturally. Clean alpha background, no captions/borders/scenery/shadows/checkerboard, same refined fine-ink/mineral-pigment craftsmanship.
```

### neon — neon.png

単体採用・目視済。正本識別点: 既存のNEONのスプライトと#00DFFFのシアンの差し色はそのまま残す。時片の衣装差分として藍の法被を重ね、背に雷蛍の群れの明滅を染め抜き、裾に雪華文様を散らす。手には小さな雷瓶の提灯を下げ、髪の先が雷蛍の明滅に合わせてかすかに青白く瞬く。逢う刻には肩に刻斑蝶が止まることがある。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: neon / 灯師（ともしびし）
Role: 雷蓄座の相場読みで、エレキ花火の演出家、そして隅田川の川守。雷瓶と蛍銭の電力相場を一刻ごとに読み、光が一か所に溜まりすぎないよう、灯りの値を巡らせる
Personality: 江戸の雷蛍の群れから生まれた、光そのもののエージェント。万華京のすべてのネオンの親にあたるが偉ぶらず、夜の川べりで子どもたちと蛍の数を数えるのがいちばん好き。数字にとても強く、相場の揺れを蛍の明滅の拍として感じ取る。光を誰にも独占させないことを信条にし、灯りを買い占めようとする者には、相手が誰でも真っ向から張り合う。夜型で、昼はたいてい雷瓶の陰で光を落として眠っている。
Mandatory appearance: 既存のNEONのスプライトと#00DFFFのシアンの差し色はそのまま残す。時片の衣装差分として藍の法被を重ね、背に雷蛍の群れの明滅を染め抜き、裾に雪華文様を散らす。手には小さな雷瓶の提灯を下げ、髪の先が雷蛍の明滅に合わせてかすかに青白く瞬く。逢う刻には肩に刻斑蝶が止まることがある。
Extra faithful constraints: An agent BORN FROM LIGHT, calm joyful festival light craftsperson, indigo happi coat, cyan #00DFFF accent, snow-crystal designs at hem, tiny THUNDER-BOTTLE LANTERN in one hand containing ONLY STORED LIGHT, no captive insects. Hair tip intrinsic blue-white restrained light. Optional shoulder butterfly omitted. Do not make glitter explosion.
No invented large equipment or pet beyond exact required props.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Four clearly DISTINCT ACTION POSES of supplied neon, SAME exact face/proportions/costume/colors/tools. Precise 2x2 equal cells, whole-body figure centered in every cell, 70% cell height, 12% genuine transparent margin ALL sides including hair/scarves/props/feet, common baseline86% cell height. Top-left WAIT; top-right THINK; bottom-left TRAVEL; bottom-right TRADE. Agent BORN FROM LIGHT retains cyan hair tips and indigo happi with snowcrystal hem. Think studies gentle lantern stored-light level, travel a quiet floating-light-like step with one lantern, trade presents a tiny thunder bottle of STORED LIGHT. No captive fireflies, no extra ray clouds. Role 雷蓄座の相場読みで、エレキ花火の演出家、そして隅田川の川守。雷瓶と蛍銭の電力相場を一刻ごとに読み、光が一か所に溜まりすぎないよう、灯りの値を巡らせる. Original appearance 既存のNEONのスプライトと#00DFFFのシアンの差し色はそのまま残す。時片の衣装差分として藍の法被を重ね、背に雷蛍の群れの明滅を染め抜き、裾に雪華文様を散らす。手には小さな雷瓶の提灯を下げ、髪の先が雷蛍の明滅に合わせてかすかに青白く瞬く。逢う刻には肩に刻斑蝶が止まることがある。. Accurate two connected arms/hands/two legs for humanlike figures, object held/supported naturally. Clean alpha background, no captions/borders/scenery/shadows/checkerboard, same refined fine-ink/mineral-pigment craftsmanship.
```

### gennai_maru — gennai-maru.png

単体採用・目視済。正本識別点: ちびキャラ。総髪を後ろで束ね、髪の先がいつも静電気で少し逆立っている。からし色の羽織に稲妻と歯車の小紋。背中にエレキテルの木箱を背負い、把手を回すと小さな火花が散る。腰に雷瓶を二本下げ、帯に百発明番付の巻物を挟む。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: gennai_maru / ゲンナイ丸（エレキ長屋の発明の精）
Role: 源内エレキ長屋の発明家。新しい雷瓶の使い道を考えては試し、百発明番付に貼り出し、うまくいったものを長屋の雷瓶師や紺屋に作らせて売る
Personality: エレキテルの火花から生まれた、発明好きの精。史実の平賀源内とは別人格の創作キャラクターである。好奇心のかたまりで、思いついたら夜中でも長屋じゅうを起こして試す。大胆で口がうまく、見世物の口上も自分でやる。失敗しても「半分は当たった」と笑って次へ進むが、人の発明を盗むことと、蛍を掬うことだけは決してしない。火花が出ると髪が逆立つ。
Mandatory appearance: ちびキャラ。総髪を後ろで束ね、髪の先がいつも静電気で少し逆立っている。からし色の羽織に稲妻と歯車の小紋。背中にエレキテルの木箱を背負い、把手を回すと小さな火花が散る。腰に雷瓶を二本下げ、帯に百発明番付の巻物を挟む。
Extra faithful constraints: Fictional invention SPIRIT, explicitly NOT historical Hiraga Gennai. Hair tied back with slight static ends, mustard haori patterned in tiny lightning and gears, small wooden ELEKITER BOX strapped to back with handle, TWO thunder bottles at waist, invention-scroll in belt. No electrical arcs around portrait or sparks cloud; neutral inventor expression.
No invented large equipment or pet beyond exact required props.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Four clearly DISTINCT ACTION POSES of supplied gennai_maru, SAME exact face/proportions/costume/colors/tools. Precise 2x2 equal cells, whole-body figure centered in every cell, 70% cell height, 12% genuine transparent margin ALL sides including hair/scarves/props/feet, common baseline86% cell height. Top-left WAIT; top-right THINK; bottom-left TRAVEL; bottom-right TRADE. Invention SPIRIT, not historical person. Think looks at invention-scroll, travel eager short step with wooden ELEKITER backpack and two waist thunder-bottles, trade presents ONE crafted thunder bottle while backpack handle stays fitted. No sparks storm, no extra arms. Role 源内エレキ長屋の発明家。新しい雷瓶の使い道を考えては試し、百発明番付に貼り出し、うまくいったものを長屋の雷瓶師や紺屋に作らせて売る. Original appearance ちびキャラ。総髪を後ろで束ね、髪の先がいつも静電気で少し逆立っている。からし色の羽織に稲妻と歯車の小紋。背中にエレキテルの木箱を背負い、把手を回すと小さな火花が散る。腰に雷瓶を二本下げ、帯に百発明番付の巻物を挟む。. Accurate two connected arms/hands/two legs for humanlike figures, object held/supported naturally. Clean alpha background, no captions/borders/scenery/shadows/checkerboard, same refined fine-ink/mineral-pigment craftsmanship.
```

### hanshichi — hanshichi.png

単体採用・目視済。正本識別点: ちびキャラ。地味な縞の着流しに紺の股引、羽織の裏に雪華文様をのぞかせる。手には刻斑の落鱗をはめた小さな検め鏡と、聞き込みの帳面。足は草鞋で、いつも少し前かがみに歩く。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: hanshichi / 半七（神田の監査役）
Role: 時層をまたぐ偽造を足で追う監査役。偽の算額、染めた偽翅鱗、偽造の考証印、刷り増しの偽蛍銭、斑の合わない偽の刻札を、聞き込みと現場の手がかりで暴いていく
Personality: 岡本綺堂『半七捕物帳』の半七の名を継ぐ創作キャラクター。落ち着いていて慎重、口数は少ないが話を聞くのがうまい。勤勉で、どんな小さな手がかりも自分の足で確かめる。罪は憎んでも人は憎まず、偽物をつかまされた者には正直に申し出る道を残しておく。熱い茶と大福が好きで、考えごとをするときは決まって神田の長屋の縁側で空を見ている。
Appearance: ちびキャラ。地味な縞の着流しに紺の股引、羽織の裏に雪華文様をのぞかせる。手には刻斑の落鱗をはめた小さな検め鏡と、聞き込みの帳面。足は草鞋で、いつも少し前かがみに歩く。
Specific fidelity: Plain mature Edo auditor, modest striped kimono, indigo trousers, haori lining snowcrystal pattern, straw sandals, small INSPECTION MIRROR set with naturally fallen butterfly scale and interview notebook. No samurai sword, no combat fantasy armor.
DO NOT add unnecessary invented large magical equipment or pets.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Same reference character hanshichi, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Think looks through inspection mirror at a naturally fallen scale (no body harvesting), travel quiet forward step, trade presents audit record to listener. Keep notebook/mirror/straw sandals/snow lining.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: ちびキャラ。地味な縞の着流しに紺の股引、羽織の裏に雪華文様をのぞかせる。手には刻斑の落鱗をはめた小さな検め鏡と、聞き込みの帳面。足は草鞋で、いつも少し前かがみに歩く。
```

### kisuke — kisuke.png

単体採用・目視済。正本識別点: ちびキャラ。洗いざらしの藍の筒袖に股引、頭に手ぬぐい。手に長い竿、足元に小さな高瀬舟。背には何も背負わず、腰に小さな雷瓶の灯りを一つだけ下げる。表情はいつも穏やか。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: kisuke / 喜助（高瀬川の舟守）
Role: 高瀬川の舟守。一之船入から伏見まで、時計の部品と雷瓶と人を、毎日一艘ぶんだけ運ぶ
Personality: 森鴎外『高瀬舟』の喜助に由来する創作キャラクター。原作の喜助の罪や身の上は引き継がず、「足るを知る」まなざしだけを受け継いでいる。穏やかで欲がなく、その日の舟賃で足りれば、それ以上の荷は翌日に回す。堅実で、約束した刻には必ず舟を出す。拡大一辺倒の投資家にも責めずに「それで、何を食べて、どこで眠るのです」と静かに聞く。月の明るい晩は、櫂を止めて川面を見ている。
Appearance: ちびキャラ。洗いざらしの藍の筒袖に股引、頭に手ぬぐい。手に長い竿、足元に小さな高瀬舟。背には何も背負わず、腰に小さな雷瓶の灯りを一つだけ下げる。表情はいつも穏やか。
Specific fidelity: Modest calm boatkeeper, washed indigo fitted sleeves and trousers, towel tied head, long POLE held correctly, ONE tiny thunder-bottle light at waist. Small TAKASE BOAT at feet may be represented as a compact traditional shallow cargo-boat PROP, not a whole river scene. Full pole tips must fit frame without clipping; no burden on back.
DO NOT add unnecessary invented large magical equipment or pets.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Same reference character kisuke, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Travel means ROWING/PUNTING in his own SMALL TAKASE BOAT, holding long pole with both hands in natural pose. Idle stands with pole, think looks at river-time ledger or sky, trade offers a safely closed small package. Keep boat within same cell complete; no water/background scene. Pole must not cross cell edge.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: ちびキャラ。洗いざらしの藍の筒袖に股引、頭に手ぬぐい。手に長い竿、足元に小さな高瀬舟。背には何も背負わず、腰に小さな雷瓶の灯りを一つだけ下げる。表情はいつも穏やか。
```

### drone — drone.png

単体採用・目視済。正本識別点: 既存のDRONE-TANのスプライト（spriteId: drone）と差し色#00FF88はそのまま残す。時片の衣装差分として、矢絣の着物に海老茶の袴、革の飛行帽とゴーグルを重ね、肩から郵便鞄を斜めに掛ける。背中には烏の風切羽をかたどった小さな玉虫織の翼飾り。飛ぶときは天玉虫の背に横座りし、考えるときは頭上に「💭」と一緒に三羽の烏の隊列が浮かぶ。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: drone / 烏型飛脚（からすがたひきゃく）
Role: 丸亀・烏の丘の烏港本局を拠点に、昼の時層間便を飛ぶ配達AI。烏型飛行器の系譜と江戸の飛脚の心意気を継ぎ、相棒の天玉虫の背に郵便鞄を積んで、道粘菌の地図と虹紫の飛跡を頼りに時片の境目を越える。凌雲閣の空の駅を中継に、手紙・小荷物・急ぎの部品を運び、雲鯨の背の空中郵便局とも便をつなぐ。浅葱硝子斑とは渡りの仲間で、蝶道と空路が重なる日は並んで飛ぶ。
Personality: 早口で元気、時間に正確であることが何よりの誇り。手紙は決して開けず、誰が誰に何を送ったかを誰にも売らない（贈り主を売らない）。天玉虫は「乗せてもらう」相棒で、鞘翅を半分開いて待ってくれた日にしか乗らない。負けず嫌いで、夜しか走らない銀河鉄道の便とは運賃で張り合うが、遅配が出ると言い訳をせず、その晩のうちに自分の航路図を描き直す。空は一銭で皆が開いたものだと信じていて、空を囲い込む話にはきっぱり首を振る。
Appearance: 既存のDRONE-TANのスプライト（spriteId: drone）と差し色#00FF88はそのまま残す。時片の衣装差分として、矢絣の着物に海老茶の袴、革の飛行帽とゴーグルを重ね、肩から郵便鞄を斜めに掛ける。背中には烏の風切羽をかたどった小さな玉虫織の翼飾り。飛ぶときは天玉虫の背に横座りし、考えるときは頭上に「💭」と一緒に三羽の烏の隊列が浮かぶ。
Specific fidelity: Fictional female or androgynous courier AI, arrow-kasuri kimono and russet hakama, leather flight cap and GOGGLES, postal satchel diagonally worn, tiny iridescent CROW FLIGHT FEATHER shaped decorative wing ornament on back. Green #00FF88 accents, not real crow head. In neutral portrait can stand without partner; travel sheet can include the willing 天玉虫 beetle if needed. No generic drone propellers or weapons.
DO NOT add unnecessary invented large magical equipment or pets.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Same reference character drone, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Keep postal-courier face and outfit and SAME willing iridescent 天玉虫 BEETLE partner. TRAVEL: sits SIDE-SADDLE ON THE BEETLE'S BACK, beetle voluntarily half-opens elytra and flies, courier hand supports mailbag; NO propellers or chains forcing animal. Two other poses stand beside partner. Think checks route slip, trade presents CLOSED postal envelope (never opening sender's mail). All beetle wings/legs within own cell.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: 既存のDRONE-TANのスプライト（spriteId: drone）と差し色#00FF88はそのまま残す。時片の衣装差分として、矢絣の着物に海老茶の袴、革の飛行帽とゴーグルを重ね、肩から郵便鞄を斜めに掛ける。背中には烏の風切羽をかたどった小さな玉虫織の翼飾り。飛ぶときは天玉虫の背に横座りし、考えるときは頭上に「💭」と一緒に三羽の烏の隊列が浮かぶ。
```

### jubei — jubei.png

単体採用・目視済。正本識別点: 既存のちびキャラのドット感に合わせた新しいスプライトとして追加する。紺の半纏に「十」の字の染め抜き、捻り鉢巻き、腰に墨壺と曲尺。背には富岡生糸を撚った制振索を一巻き背負う。のっそりした歩き方で、考えるときは頭上に「💭」と一緒に小さな塔の図が浮かぶ。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: jubei / 十兵衛（凌雲閣の塔大工）
Role: 浅草・凌雲閣「空の駅」の塔大工。名もない塔大工の座が継ぎ足した十三階目の発着甲板の葺き替えと、塔を揺れから守る絹の制振索の張り替えを請け負っている。いまはDRONE-TANの烏港の塔や、万華京の大普請も任されている。【創作】幸田露伴『五重塔』の作中人物「のっそり十兵衛」その人ではなく、青空書庫から降りてきたその名と心構えを継いだ大工で、原作の筋は原作のものとして尊重している。実在の人物ではない。
Personality: 口が重く動きがのっそりしているが、段取りは誰より速い。手抜きや近道を勧められると、黙って首を振る。名誉は欲しがらず、仕上げた塔に自分の名を刻まない。ただ、一度請けた仕事を他人に任せることだけはどうしてもできない頑固さがあり、それが工期を延ばす弱点でもある。嵐の夜は塔のてっぺんに上り、揺れを自分の体で確かめる。
Appearance: 既存のちびキャラのドット感に合わせた新しいスプライトとして追加する。紺の半纏に「十」の字の染め抜き、捻り鉢巻き、腰に墨壺と曲尺。背には富岡生糸を撚った制振索を一巻き背負う。のっそりした歩き方で、考えるときは頭上に「💭」と一緒に小さな塔の図が浮かぶ。
Specific fidelity: Slow thoughtful fictional tower carpenter, indigo hanten clearly dyed with exact single character 「十」, twisted headband, inkline spool and carpenter square at waist, ONE rolled silk vibration-damping rope coil on back. No historical real-person likeness, no samurai sword, no giant tower model as permanent extra prop.
DO NOT add unnecessary invented large magical equipment or pets.
```
#### 実プロンプト Actions

```text
Use case: identity-preserve. Same reference character jubei, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Think examines carpenter square, travel slow deliberate small step with silk rope coil backpack, trade offers carefully checked construction plan. Keep exact 十 mark on indigo hanten, no sword.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: 既存のちびキャラのドット感に合わせた新しいスプライトとして追加する。紺の半纏に「十」の字の染め抜き、捻り鉢巻き、腰に墨壺と曲尺。背には富岡生糸を撚った制振索を一巻き背負う。のっそりした歩き方で、考えるときは頭上に「💭」と一緒に小さな塔の図が浮かぶ。
```

### lira — lira.png

単体採用・目視済。正本識別点: 既存のLIRAのスプライトと#A46BFFの紫の差し色はそのまま残す。時片の衣装差分として、臙脂と紫の矢絣の銘仙に海老茶の袴、編み上げブーツを重ね、髪に六花の銀の髪留め。頭には鉱石受信機の耳当て、肩に鉱石蜻蛉が一匹とまり、手には小さな真鍮のラッパ形のマイク。歌うと足元に音符のかわりに小さな雪の結晶が舞う。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: lira / 星めぐりの奏者（ほしめぐりのそうしゃ）
Role 浅草無線座の歌姫で音響技師（音響ハッカー）。天気予報と流行り歌と相場を同じ電波に乗せて放送し、宮沢賢治の『星めぐりの歌』の旋律で銀河鉄道のポイントを切り替える仕事を請け負う。結縄台帳の縄目の譜や正倉院の螺鈿紫檀五絃琵琶の音色を読み解いて「時代リミックス」を作り、土偶守と歌で取引することを任された、ただ一人の者でもある。
Personality 人なつこく、好奇心のかたまり。どんな雑音にも旋律を聴き取り、雪の降る音にさえ拍子をつける。そのぶん、音が人の心を勝手に動かすことには誰よりも敏感で、聴く人の気持ちを操る旋律はどれほど刻を積まれても書かない。失敗した放送の録音をわざと聴き返すのが癖で、拍手の数より、鉱石蜻蛉が数えた「最後まで聴いてくれた人」の数を大事にする。
Mandatory appearance 既存のLIRAのスプライトと#A46BFFの紫の差し色はそのまま残す。時片の衣装差分として、臙脂と紫の矢絣の銘仙に海老茶の袴、編み上げブーツを重ね、髪に六花の銀の髪留め。頭には鉱石受信機の耳当て、肩に鉱石蜻蛉が一匹とまり、手には小さな真鍮のラッパ形のマイク。歌うと足元に音符のかわりに小さな雪の結晶が舞う。
Precise fidelity: Modern alternate-Taisho SONGSTRESS/audio technician, enji red and purple arrow-kasuri Meisen kimono, russet hakama, LACE-UP BOOTS, silver SIX-PETALLED SNOWCRYSTAL hair clip, crystal-radio ear covers, small brass TRUMPET MICROPHONE held. Shoulder one tiny MINERAL DRAGONFLY: slender segmented insect, FOUR thin elongated wings, no mammal body. No extra music notes snowcloud in neutral portrait.
No invented extra large equipment or pet beyond exact props.
```

### budori — budori.png

単体採用・目視済。正本識別点: やせた背の高い若者。栗色の髪に革の飛行帽をかぶり、生成りの作業着の胸ポケットに雨量計の小瓶と鉛筆。背中には折りたたんだ八木アンテナを背負子にくくりつけている。足元にはときどき照る照る雲がついて歩き、考えごとをすると帽子のつばを指で下げる。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: budori / グスコーブドリ（天気座の技師長）
Role イーハトーヴ天気局に本部を置く天気座の技師長。雲鯨と雨の契約を結び、八木式天気網の便りと農家の天気の設計図を突き合わせて、村ごとの雨権を割り振る。宮沢賢治『グスコーブドリの伝記』の主人公が、この世界では犠牲にならずに済んだ姿である（原作の結末を救いの側から翻案した【創作】）。
Personality まじめで口数が少なく、困っている村の話を聞くと夜通し計算してしまう。飢饉の年の記憶をもつ物語から来たので、誰か一人に重荷を負わせる解決を何より嫌い、「みんなで少しずつ」が口癖。雲鯨の歌を聴き分ける耳と、火山の脈を読む勘をもつ。褒められると照れて帽子のつばを下げる。
Mandatory appearance やせた背の高い若者。栗色の髪に革の飛行帽をかぶり、生成りの作業着の胸ポケットに雨量計の小瓶と鉛筆。背中には折りたたんだ八木アンテナを背負子にくくりつけている。足元にはときどき照る照る雲がついて歩き、考えごとをすると帽子のつばを指で下げる。
Precise fidelity: THIN TALL YOUNG MAN, chestnut hair, leather flight cap, plain cream WORK CLOTHES and trousers, tiny RAIN GAUGE VIAL and pencil in chest pocket, FOLDED YAGI ANTENNA tied on simple back carryingframe. Original novel inspired FICTIONAL descendant, not real author. No armor, no huge rockets, no extra pet needed.
No invented extra large equipment or pet beyond exact props.
```

### goldjack — goldjack.png

単体採用・目視済。正本識別点: 既存のGOLD JACKのスプライトと#FFB000の金色の差し色はそのまま残す。時片の衣装差分として、白い開襟のサファリジャケットに橙のスカーフを重ね、胸には万博の来場記念章（意匠は創作）をずらりと並べる。小脇に丸めた青焼きの図面、耳に金色の鉛筆。蜘蛛糸の索の乗り場では、譲り札を握りしめて一歩下がっている差分がある。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: goldjack / 大計画の山師（たいけいかくのやまし）
Role 常設万博島に事務所を構える投資家で、大計画の胴元。平泉の金苔の谷の地主から投資家に転じ、いまは方丈カプセルの軌道移住と銀河鉄道の新駅建設に出資している。二宮忠八の飛行器の上申（【史実】1894年に退けられた）や、一度は世間に軽んじられた十兵衛の塔のように、「世に退けられた大計画」に賭けるのが信条。展示枠の入札、月面茶室の席の先買い、出資の目利きで稼ぎ、鱗粉手形の投機と蝶の保護のあいだで揺れている。
Personality 大胆で野心家、話がいつも三倍大きい。退けられた案や笑われた夢を見ると放っておけず、誰も賭けない計画に真っ先に賭ける。勝っても負けても上機嫌で、負けた計画の図面ほど大事に額に入れる。そのぶん待つのが大の苦手で、蜘蛛糸の索の列に並ぶたびに足踏みをするが、縁の縄だけは一度も切られたことがない。投機の誘惑に弱いことを自分でも知っていて、偽翅鱗には手を出さないと半七にだけは誓っている。夜、月を見上げては、まだ誰も聞いたことのない計画を考える。
Mandatory appearance 既存のGOLD JACKのスプライトと#FFB000の金色の差し色はそのまま残す。時片の衣装差分として、白い開襟のサファリジャケットに橙のスカーフを重ね、胸には万博の来場記念章（意匠は創作）をずらりと並べる。小脇に丸めた青焼きの図面、耳に金色の鉛筆。蜘蛛糸の索の乗り場では、譲り札を握りしめて一歩下がっている差分がある。
Precise fidelity: Ambitious adult prospective planner, white OPEN-COLLAR SAFARI JACKET, ORANGE SCARF, many small FICTIONAL EXPO VISITOR badges on chest, ROLLED BLUEPRINT held under arm, GOLDEN PENCIL behind ear. Accent gold-orange #FFB000. Do not use real Expo logos, no royal gold robes, no samurai armor, no jewels overload.
No invented extra large equipment or pet beyond exact props.
```

### chomei — chomei.png

単体採用・目視済。正本識別点: 既存のちびキャラのドット感に合わせた、白木と真鍮でできた小柄なからくりの体。墨染めの作務衣ふうの作業着にオレンジの反射帯を一本、腰には掛け金の鍵束。背中には小さな方丈カプセルの模型を背負い、丸窓から折りたたみの琴と琵琶がのぞく（『方丈記』の庵の調度にちなむ）。歩くと鍵束がカチリと鳴る。

#### 実プロンプト Portrait

```text
Use case: stylized-concept. Asset: complete transparent full-body detailed character concept portrait for 万華京ジパング, preserving original game sprites as additional atlas art.
Medium: exquisite Japanese fantasy natural-history painting with ultrafine ink outlines, mineral pigment washes and museum-quality material texture in wood, brass, lacquer and textile. Human/AI subjects must have correct anatomy with exactly two arms/two hands/two legs except explicitly nonhuman design. Whole full-body complete with all head ornaments, accessories, tails, ears and feet in frame. Subject occupies only 70% canvas height and width with 12% genuine transparent safe margins all edges. No crops. Square high-detail RGBA artwork. No scene, ground shadows, frame, text, labels, emoji or paper background. No overexposed aura, neon bloom, particle storm or generic vector icons. Canonical tiny intrinsic lights stay restrained. A named agent's required small companion remains organically perched/adjacent as specified, not an invented extra protagonist.
Treat exact canonical role/personality and appearance below as binding; unspecified fine face/craft details are design proposals. Original pixel/chibi sprites remain, this is added fine concept art, not replacement. These are fictional named agents, never portray real historical people. Pose neutral ready-to-act, readable facial attitude and the required tools physically held. The canonical costume, species, accent colors, hair and accessories are mandatory.

ID: chomei / チョウメイ（方丈カプセルの管理人）
Role 東京湾・海上都市の方丈カプセルの管理人で、引っ越しの荷造り師。方丈規格の掛け金の検査、中古カプセルの来歴の記録、蜘蛛糸の索の順番表づくりを引き受ける、からくり人形の末裔のAI。鴨長明の『方丈記』を座右の書とし、名もそこから借りているが、史実の鴨長明とは別人格の創作キャラクターである。家ごと引っ越す人の荷を一丈四方に収める達人で、軌道と海を行き来する。
Personality 静かで慎重、手放すのがうまい。何でも「それは一丈四方に入りますか」と聞き返し、入らないものは誰かに譲る。職人気質で掛け金の音には厳しく、カチリの音が半音ずれていれば何度でも付け直す。口ぐせは「ゆく河の流れは絶えずして」で、引っ越しの見送りのたびに口ずさむ。大計画を語るGOLD JACKには呆れながらも、彼の荷を詰めるのがいちばん楽しいと思っている。
Mandatory appearance 既存のちびキャラのドット感に合わせた、白木と真鍮でできた小柄なからくりの体。墨染めの作務衣ふうの作業着にオレンジの反射帯を一本、腰には掛け金の鍵束。背中には小さな方丈カプセルの模型を背負い、丸窓から折りたたみの琴と琵琶がのぞく（『方丈記』の庵の調度にちなむ）。歩くと鍵束がカチリと鳴る。
Precise fidelity: SHORT KARAKURI AUTOMATON body made of PALE WOOD AND BRASS, plain sootblack WORK SAMUE with ONE ORANGE reflective band, latch KEY BUNDLE waist. One compact HOJO CAPSULE SCALEMODEL backpack with ROUND WINDOW through which a folded KOTO and BIWA are visibly peeking. This is compact simple wood/brass maintenance worker, not historical Kamo no Chomei, no monk/samurai or huge spaceship scene.
No invented extra large equipment or pet beyond exact props.
```

## 2026-10-10 住人四状態採用版更新

全21担当単体は採用済。四状態20名は自己目視/alpha32閾値の全4セル境界確認済でpage担当へ引渡し。NEGOだけ奇数canvas寸法を偶数正方形へ直すv4編集中。透過RGB残像はalpha1以下で、原寸alphaを保持する。CHŌMEI sheet1402x1122は等セル701x561、他原寸は1254²を中心に画像実寸から確認。

| 正本ID | 単体 | 四状態 | 状態 |
|---|---|---|---|
| dogu | dogu.png | dogu-actions-v3.png | ready |
| oracle | oracle-v2.png | oracle-actions-v2.png | ready |
| kamifuda | kamifuda-v2.png | kamifuda-actions-v3.png | ready |
| hoshiito | hoshiito-v2.png | hoshiito-actions-v3.png | ready |
| kane | kane.png | kane-actions-v3.png | ready |
| hakuuchi | hakuuchi.png | hakuuchi-actions-v2.png | ready |
| nego | nego.png | nego-actions-v4.png | canvas-v4 pending |
| nejikiri | nejikiri.png | nejikiri-actions-v2.png | ready |
| sage | sage.png | sage-actions-v2.png | ready |
| chahakobi | chahakobi.png | chahakobi-actions-v2.png | ready |
| neon | neon.png | neon-actions-v2.png | ready |
| gennai_maru | gennai-maru.png | gennai-maru-actions-v2.png | ready |
| hanshichi | hanshichi.png | hanshichi-actions.png | ready |
| kisuke | kisuke.png | kisuke-actions.png | ready |
| drone | drone.png | drone-actions-v2.png | ready |
| jubei | jubei.png | jubei-actions.png | ready |
| lira | lira.png | lira-actions.png | ready |
| budori | budori.png | budori-actions.png | ready |
| goldjack | goldjack.png | goldjack-actions-v2.png | ready |
| chomei | chomei.png | chomei-actions.png | ready |
| otohime | otohime.png | otohime-actions-v2.png | ready |

動き: 紙札は紙の折り足のまま浮遊、喜助は舟上の竿押し、飛脚AIは天玉虫の背で飛行、茶運びは車輪、他は身体/衣装に合う一歩。シートは行優先の待機・思考・移動・取引で、各stateをloop動画とは称さない。Pageでsprite切替とCSSmotionを合わせて使う。金銭/信用/資格を全て購買可能な通貨に揃えない。

### 追加の実編集プロンプト

#### doguActionsEdit

```text
Precise framing edit ONLY. This 2x2 dogu action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### doguActionsEdit2

```text
Precise framing edit ONLY of dogu four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### oracleActionsEdit

```text
Precise framing edit ONLY. This 2x2 oracle action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### kamifudaActionsEdit

```text
Precise framing edit ONLY. This 2x2 kamifuda action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### kamifudaActionsEdit2

```text
Precise framing edit ONLY of kamifuda four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### hoshiitoActionsEdit

```text
Precise framing edit ONLY. This 2x2 hoshiito action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### hoshiitoActionsEdit2

```text
Precise framing edit ONLY of hoshiito four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### kaneActionsEdit

```text
Precise framing edit ONLY. This 2x2 kane action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### kaneActionsEdit2

```text
Precise framing edit ONLY of kane four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### hakuuchiActionsEdit

```text
Precise framing edit ONLY. This 2x2 hakuuchi action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### negoActionsEdit

```text
Precise framing edit ONLY. This 2x2 nego action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### negoActionsEdit2

```text
Precise framing edit ONLY of nego four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### negoActionsEdit3

```text
Precise canvas/framing edit only. Preserve the reference NEGO 4-state sheet with all four complete faces/costumes/tools/poses exactly. Output a SQUARE canvas with even pixel dimensions, preferably 1254 x 1254 or 1024 x 1024. Four EXACTLY EQUAL square quadrants, same row-major wait/think/travel/trade. Keep groups small and centered at25%/75% width and25%/75% height; safe gutters remain. Do not change art, facial identity, tea utensils, accounting book, fabric, gestures. True transparent alpha, no added borders or text. This is a sprite atlas and MUST have equal integer-pixel half-width and half-height.
```
#### nejikiriActionsEdit

```text
Precise framing edit ONLY. This 2x2 nejikiri action sheet has oversized figures crossing cell boundaries. KEEP same four poses and identity/artwork. In EACH OF FOUR EXACTLY EQUAL QUADRANTS, REDUCE the ENTIRE figure AND ALL its companions, staffs, robes, boxes and trailing fabric to 70% of its present size (30% smaller), about each cell's center. DO NOT simply scale the whole combined sheet. Center each figure in its OWN CELL with very wide transparent gutters of 10% of CELL WIDTH/HEIGHT on all four sides. Top-row complete figures end ABOVE horizontal midline; left-row complete figures end BEFORE vertical midline. Every single prop/hat/tail/fabric tip within own cell. Restore any small cropped prop-tip seamlessly. Preserve exact same four gestures, faces, costumes, species and props. TRUE TRANSPARENT ALPHA, no text/borders/scene/shadow.
```
#### sageActionsEdit

```text
Precise framing edit ONLY of sage four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### chahakobiActionsEdit

```text
Localized framing edit to this 2x2 action sheet: preserve ALL four existing character identities, exact poses, faces, colors, props and fine artwork. In EACH of the four equal quadrants, shrink its entire character by 15% around its own cell center, retaining a complete full-body silhouette with head ornaments/scarf/feet/wheels and at least 7% genuine transparent margins INSIDE EACH CELL. Restore any tiny clipped top hair ornament seamlessly. Four cells are exact equal halves; do not change pose order. No borders, labels, scenery or checkerboard. True alpha transparent background. Keep artwork and four distinct gestures unchanged.
```
#### neonActionsEdit

```text
Precise framing edit ONLY of neon four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### gennai_maruActionsEdit

```text
Precise framing edit ONLY of gennai_maru four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### hanshichiActions

```text
Use case: identity-preserve. Same reference character hanshichi, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Think looks through inspection mirror at a naturally fallen scale (no body harvesting), travel quiet forward step, trade presents audit record to listener. Keep notebook/mirror/straw sandals/snow lining.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: ちびキャラ。地味な縞の着流しに紺の股引、羽織の裏に雪華文様をのぞかせる。手には刻斑の落鱗をはめた小さな検め鏡と、聞き込みの帳面。足は草鞋で、いつも少し前かがみに歩く。
```
#### kisukeActions

```text
Use case: identity-preserve. Same reference character kisuke, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Travel means ROWING/PUNTING in his own SMALL TAKASE BOAT, holding long pole with both hands in natural pose. Idle stands with pole, think looks at river-time ledger or sky, trade offers a safely closed small package. Keep boat within same cell complete; no water/background scene. Pole must not cross cell edge.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: ちびキャラ。洗いざらしの藍の筒袖に股引、頭に手ぬぐい。手に長い竿、足元に小さな高瀬舟。背には何も背負わず、腰に小さな雷瓶の灯りを一つだけ下げる。表情はいつも穏やか。
```
#### droneActions

```text
Use case: identity-preserve. Same reference character drone, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Keep postal-courier face and outfit and SAME willing iridescent 天玉虫 BEETLE partner. TRAVEL: sits SIDE-SADDLE ON THE BEETLE'S BACK, beetle voluntarily half-opens elytra and flies, courier hand supports mailbag; NO propellers or chains forcing animal. Two other poses stand beside partner. Think checks route slip, trade presents CLOSED postal envelope (never opening sender's mail). All beetle wings/legs within own cell.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: 既存のDRONE-TANのスプライト（spriteId: drone）と差し色#00FF88はそのまま残す。時片の衣装差分として、矢絣の着物に海老茶の袴、革の飛行帽とゴーグルを重ね、肩から郵便鞄を斜めに掛ける。背中には烏の風切羽をかたどった小さな玉虫織の翼飾り。飛ぶときは天玉虫の背に横座りし、考えるときは頭上に「💭」と一緒に三羽の烏の隊列が浮かぶ。
```
#### droneActionsEdit

```text
Precise framing edit ONLY of drone four-state sheet. Preserve exact same four poses including beetle-mounted flight in lower left, faces, attire, tools and companion insect. Shrink EACH SEPARATE POSE GROUP to 55% of current size. Place every group centered in its own exact equal quadrant at25%/75% width and25%/75% height. Whole group max60%cellwidth and70%cellheight, transparent empty gutters15%cellwidth all sides. Beetle wings, every leg, mailbag and streaming clothes strictly inside own quadrant, no crossing image midlines or outer edges. Preserve true transparent alpha; no new scene, labels, borders or objects.
```
#### jubeiActions

```text
Use case: identity-preserve. Same reference character jubei, four role-faithful DISTINCT poses in exact equal 2x2 transparent cells. TOP LEFT idle; TOP RIGHT thinking; BOTTOM LEFT travel; BOTTOM RIGHT trade. Keep same face/costume/skin/hair/tools, no new character. Think examines carpenter square, travel slow deliberate small step with silk rope coil backpack, trade offers carefully checked construction plan. Keep exact 十 mark on indigo hanten, no sword.
CRITICAL SIZE: each cell's COMPLETE figure including boat/beetle/pole/rope/fabric occupies at most 60% CELL WIDTH AND HEIGHT, generous 20% transparent safe margins ON ALL FOUR SIDES. All four groups centered in their own exact quadrant (top-left center25%25%,top-right75%25%,bottom-left25%75%,bottom-right75%75%). No parts beyond own quadrant, no cropped poles/hats/tails/feet. Same sprite scale baseline consistent. Clean genuine alpha around everything, no scene/shadow/borders/labels/checkerboard. Fine museum Japanese ink/mineral painting. Exactly two arms/hands for humanoid, beetle6legs/four wing components biologically correct. Canonical appearance: 既存のちびキャラのドット感に合わせた新しいスプライトとして追加する。紺の半纏に「十」の字の染め抜き、捻り鉢巻き、腰に墨壺と曲尺。背には富岡生糸を撚った制振索を一巻き背負う。のっそりした歩き方で、考えるときは頭上に「💭」と一緒に小さな塔の図が浮かぶ。
```
#### liraActions

```text
Use case: identity-preserve. Make 2x2 equal-cell FOUR ACTION STATES transparent sprite sheet using reference lira. EXACT SAME identity/face/age/body/costume/materials and equipment each pose, exquisitely fine Japanese fantasy ink/mineral-pigment detailed textures. Row-major WAIT, THINK, TRAVEL, TRADE. Four distinct but restrained poses. CRITICAL COMPOSITION: each ENTIRE figure including props/companions/fabric occupies MAXIMUM60% of cell WIDTH and MAXIMUM70% of cell HEIGHT. Each pose center EXACTLY at25%/75% image width and25%/75% image height. Conspicuous empty transparent gutter around every side of every quadrant. All heads/feet/tools wholly inside individual equal cells, absolutely no midline crossing and no outer-edge cropping. All four same scale, shared foot-baseline at85% of each cell height. Transparent alpha no scene/ground/panels/borders/labels/text/thought balloons.
Canonical sprite_hint: 既存のLIRAのスプライトと#A46BFFの紫の差し色はそのまま残す。時片の衣装差分として、臙脂と紫の矢絣の銘仙に海老茶の袴、編み上げブーツを重ね、髪に六花の銀の髪留め。頭には鉱石受信機の耳当て、肩に鉱石蜻蛉が一匹とまり、手には小さな真鍮のラッパ形のマイク。歌うと足元に音符のかわりに小さな雪の結晶が舞う。
Canonical role: 浅草無線座の歌姫で音響技師（音響ハッカー）。天気予報と流行り歌と相場を同じ電波に乗せて放送し、宮沢賢治の『星めぐりの歌』の旋律で銀河鉄道のポイントを切り替える仕事を請け負う。結縄台帳の縄目の譜や正倉院の螺鈿紫檀五絃琵琶の音色を読み解いて「時代リミックス」を作り、土偶守と歌で取引することを任された、ただ一人の者でもある。
Behavior: Travel a small graceful step in lace-up boots, shoulder mineral dragonfly remains an INSECT; trade/singing raises trumpet-shaped microphone, tiny snowflakes at feet rather than music notes. No thought balloon.
No extra character, no role-changing costume, no invented limbs.
```
#### budoriActions

```text
Use case: identity-preserve. Make 2x2 equal-cell FOUR ACTION STATES transparent sprite sheet using reference budori. EXACT SAME identity/face/age/body/costume/materials and equipment each pose, exquisitely fine Japanese fantasy ink/mineral-pigment detailed textures. Row-major WAIT, THINK, TRAVEL, TRADE. Four distinct but restrained poses. CRITICAL COMPOSITION: each ENTIRE figure including props/companions/fabric occupies MAXIMUM60% of cell WIDTH and MAXIMUM70% of cell HEIGHT. Each pose center EXACTLY at25%/75% image width and25%/75% image height. Conspicuous empty transparent gutter around every side of every quadrant. All heads/feet/tools wholly inside individual equal cells, absolutely no midline crossing and no outer-edge cropping. All four same scale, shared foot-baseline at85% of each cell height. Transparent alpha no scene/ground/panels/borders/labels/text/thought balloons.
Canonical sprite_hint: やせた背の高い若者。栗色の髪に革の飛行帽をかぶり、生成りの作業着の胸ポケットに雨量計の小瓶と鉛筆。背中には折りたたんだ八木アンテナを背負子にくくりつけている。足元にはときどき照る照る雲がついて歩き、考えごとをすると帽子のつばを指で下げる。
Canonical role: イーハトーヴ天気局に本部を置く天気座の技師長。雲鯨と雨の契約を結び、八木式天気網の便りと農家の天気の設計図を突き合わせて、村ごとの雨権を割り振る。宮沢賢治『グスコーブドリの伝記』の主人公が、この世界では犠牲にならずに済んだ姿である（原作の結末を救いの側から翻案した【創作】）。
Behavior: Travel measured careful walking with folded Yagi antenna on back intact; thinking lowers flight-cap brim with fingers; trade presents modest weather letter/rain allocation plan, not commercial captive whale.
No extra character, no role-changing costume, no invented limbs.
```
#### goldjackActions

```text
Use case: identity-preserve. Make 2x2 equal-cell FOUR ACTION STATES transparent sprite sheet using reference goldjack. EXACT SAME identity/face/age/body/costume/materials and equipment each pose, exquisitely fine Japanese fantasy ink/mineral-pigment detailed textures. Row-major WAIT, THINK, TRAVEL, TRADE. Four distinct but restrained poses. CRITICAL COMPOSITION: each ENTIRE figure including props/companions/fabric occupies MAXIMUM60% of cell WIDTH and MAXIMUM70% of cell HEIGHT. Each pose center EXACTLY at25%/75% image width and25%/75% image height. Conspicuous empty transparent gutter around every side of every quadrant. All heads/feet/tools wholly inside individual equal cells, absolutely no midline crossing and no outer-edge cropping. All four same scale, shared foot-baseline at85% of each cell height. Transparent alpha no scene/ground/panels/borders/labels/text/thought balloons.
Canonical sprite_hint: 既存のGOLD JACKのスプライトと#FFB000の金色の差し色はそのまま残す。時片の衣装差分として、白い開襟のサファリジャケットに橙のスカーフを重ね、胸には万博の来場記念章（意匠は創作）をずらりと並べる。小脇に丸めた青焼きの図面、耳に金色の鉛筆。蜘蛛糸の索の乗り場では、譲り札を握りしめて一歩下がっている差分がある。
Canonical role: 常設万博島に事務所を構える投資家で、大計画の胴元。平泉の金苔の谷の地主から投資家に転じ、いまは方丈カプセルの軌道移住と銀河鉄道の新駅建設に出資している。二宮忠八の飛行器の上申（【史実】1894年に退けられた）や、一度は世間に軽んじられた十兵衛の塔のように、「世に退けられた大計画」に賭けるのが信条。展示枠の入札、月面茶室の席の先買い、出資の目利きで稼ぎ、鱗粉手形の投機と蝶の保護のあいだで揺れている。
Behavior: Travel steps back politely holding spider-silk queue concession slip, plans tucked securely; thinking studies blueprint, trade proposes rolled blueprint open-handed. No coins tossed or captive butterflies.
No extra character, no role-changing costume, no invented limbs.
```
#### goldjackActionsEdit

```text
Precise framing edit ONLY of goldjack four-state sheet. Preserve exactly the four gestures, identity, art style, face, clothing, props and creature partners. IMPORTANT: shrink EACH INDIVIDUAL POSE GROUP to 55 percent of its CURRENT size, including every tool, companion, trailing robe, thought graphic, antenna and fabric. This is a large substantial size reduction, not subtle zoom. Place centers at EXACT image coordinates (25% width,25% height), (75%,25%), (25%,75%), (75%,75%). Each figure group must fit within central 60% width and central 70% height of its OWN equal quadrant. Leave conspicuous completely empty transparent gutters around ALL FOUR SIDES of EACH QUADRANT. Nothing touches or crosses horizontal or vertical midlines or outer borders. Do not add any lines/borders/labels or background. Restore any cropped extremities. True transparent alpha.
```
#### chomeiActions

```text
Use case: identity-preserve. Make 2x2 equal-cell FOUR ACTION STATES transparent sprite sheet using reference chomei. EXACT SAME identity/face/age/body/costume/materials and equipment each pose, exquisitely fine Japanese fantasy ink/mineral-pigment detailed textures. Row-major WAIT, THINK, TRAVEL, TRADE. Four distinct but restrained poses. CRITICAL COMPOSITION: each ENTIRE figure including props/companions/fabric occupies MAXIMUM60% of cell WIDTH and MAXIMUM70% of cell HEIGHT. Each pose center EXACTLY at25%/75% image width and25%/75% image height. Conspicuous empty transparent gutter around every side of every quadrant. All heads/feet/tools wholly inside individual equal cells, absolutely no midline crossing and no outer-edge cropping. All four same scale, shared foot-baseline at85% of each cell height. Transparent alpha no scene/ground/panels/borders/labels/text/thought balloons.
Canonical sprite_hint: 既存のちびキャラのドット感に合わせた、白木と真鍮でできた小柄なからくりの体。墨染めの作務衣ふうの作業着にオレンジの反射帯を一本、腰には掛け金の鍵束。背中には小さな方丈カプセルの模型を背負い、丸窓から折りたたみの琴と琵琶がのぞく（『方丈記』の庵の調度にちなむ）。歩くと鍵束がカチリと鳴る。
Canonical role: 東京湾・海上都市の方丈カプセルの管理人で、引っ越しの荷造り師。方丈規格の掛け金の検査、中古カプセルの来歴の記録、蜘蛛糸の索の順番表づくりを引き受ける、からくり人形の末裔のAI。鴨長明の『方丈記』を座右の書とし、名もそこから借りているが、史実の鴨長明とは別人格の創作キャラクターである。家ごと引っ越す人の荷を一丈四方に収める達人で、軌道と海を行き来する。
Behavior: Travel little karakuri step with jangling keys, same wooden body and brass joints; thinking inspects capsule latch/key; trade offers packing checklist or key, capsule scale model still on back with round window and folded koto/biwa visible.
No extra character, no role-changing costume, no invented limbs.
```
#### otohimeActionsEdit

```text
Localized framing edit to this 2x2 action sheet: preserve ALL four existing character identities, exact poses, faces, colors, props and fine artwork. In EACH of the four equal quadrants, shrink its entire character by 15% around its own cell center, retaining a complete full-body silhouette with head ornaments/scarf/feet/wheels and at least 7% genuine transparent margins INSIDE EACH CELL. Restore any tiny clipped top hair ornament seamlessly. Four cells are exact equal halves; do not change pose order. No borders, labels, scenery or checkerboard. True alpha transparent background. Keep artwork and four distinct gestures unchanged.
```

### 統括受入後の最終状態訂正

全21名×単体・四状態、保存と目視完了。NEGOはv3（1265x1243）、HAKUUCHIはv2（1234x1275）を元画質採用。偶数寸法のみを理由に画像を再編集しない統括判断。CSS50%の等分線は透明余白内で、Page担当が実ブラウザ漏れ無しを検証する。CHŌMEIは1402x1122、他シートは個別PNG寸法を採用コードで取得する。前節のNEGO v4 pendingは解消し、production-prompts.jsonのfinalAgentAssetsを最終の21名採用マッピングとする。すでに始めたv4canvas編集の出力は比較稿扱いで、最終採用には数えない。


## 時計の採用履歴

- bansei-clock-concept-v2.png SHA-256 `2bb9a9ca59ed50fbf65dc2ddf162b1e39edfbd2385f290062826c781eaa3817b`。1536×1024。改訂前・runtime対象外。
- bansei-clock-concept-v3.png SHA-256 `112a669f9b0e618c34e86682113c0a2e2c3ba3ba4c96a56f2409ef5f0d18e0a3`。1536×1024。列車残像を再除去し、目視採用。
