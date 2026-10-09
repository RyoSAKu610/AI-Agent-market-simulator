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


## 時計の採用履歴

- bansei-clock-concept-v2.png SHA-256 `2bb9a9ca59ed50fbf65dc2ddf162b1e39edfbd2385f290062826c781eaa3817b`。1536×1024。改訂前・runtime対象外。
- bansei-clock-concept-v3.png SHA-256 `112a669f9b0e618c34e86682113c0a2e2c3ba3ba4c96a56f2409ef5f0d18e0a3`。1536×1024。列車残像を再除去し、目視採用。
