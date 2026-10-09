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
- 万世時計: 本文・正本の十面時計と十時片を解釈した広域コンセプト画。令和中心→縄文外縁の正確な地区境界・時計面数の検証は正本地図に委ねる。夜明け版の初稿に列車が映ったため、v2で車両を除去した後、左下の残像をv3で再除去。空レールを目視確認したv3を採用、初稿・v2は制作側で比較保存。

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



## 時計の採用履歴

- bansei-clock-concept-v2.png SHA-256 `2bb9a9ca59ed50fbf65dc2ddf162b1e39edfbd2385f290062826c781eaa3817b`。1536×1024。改訂前・runtime対象外。
- bansei-clock-concept-v3.png SHA-256 `112a669f9b0e618c34e86682113c0a2e2c3ba3ba4c96a56f2409ef5f0d18e0a3`。1536×1024。列車残像を再除去し、目視採用。
