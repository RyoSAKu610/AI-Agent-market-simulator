# 住人概念画・行動シート制作記録

原典：`source/zipangu/world/agents.json` の role/personality/sprite_hint。制作は built-in imagegen。画風基準は `assets/visuals/otohime.png` / `chahakobi.png`。旧キャラクターは `source/character-pets/*/spritesheet.webp` と `source/pet-portable-bundle/*/assets/spritesheet.webp` を実画像で参照。既存キャラクター画像は差し替えず新しい衣装概念画として追加。史実の人物や原作人物本人の新しい行動ではなく、各設定が記す別人格の創作住人。

各 `<id>.png` は全身画、`<id>-actions.png` は transparent RGBA の等分2×2。読み順は左上 idle／右上 think／左下 travel／右下 trade。trade は住人の役割に合わせた受け渡し・提示であり、福の神や百合を販売することは描かない。静止した4姿勢をページ側で切り替える。経路移動・自然な揺れ・状態選択はページ実装担当。元画像をPillow等で加工せず、数値検査のみ行う。

## 生成済み

|id|原典の識別点と判断|目視|
|---|---|---|
|zero|白髪と赤黒片目の旧姿／黒漆羽織／真鍮胸窓／ゼンマイ／鍵輪。無口精密な表情。|全身・4姿勢の衣装同一を確認。4state-v2は1254角。初稿の上辺接触をbuilt-in参照editで縮小、白髪curl/マント/鍵/靴が全セル内に収まり統括受入済み。|
|pixel|旧クリーム角丸画面顔ロボ／生成り作務衣・藍前掛け／耳筆・腰ばれん・版木／肩の紙栞雀。|全身・4姿勢の同一顔、筆/版木/蝶図版の行動を確認。4state-v2は1254角。光輪上辺を参照editで縮小し全曲線が見える。|
|yaji_kita|創作の二人組。縞合羽/三度笠の年長弥次、ほおかむり/尻っぱしょりの喜多。共有する1本の天秤棒で封玉手箱1つ。|二人一組を各4セルに維持。思案で地図、歩行で共に歩き、受渡で封箱を保持。全端余白を改善。|
|yami|旧紫眼黒猫のまま、黒繻子短衣/紫腕貫/黄裏地。青原簿、尾先青烏瓜灯、竹箒。|猫形、同一衣装と尾灯を4セル維持。思案は帳簿、tradeは無記名写し。|

## 原典の競合と判断

KITSUNE-X の旧 pet.json とspriteはパンダ型盾持ち。新 agents.json は『既存のspriteと色を残す』に加え白銅狐/片手毛糸手袋/白銅貨を指定。統括了承の判断：新概念画はworld原典の狐形を優先し、旧赤黒白と小ゴーグルを継承。旧パンダpetは保存され新画で置換しない。設定への追記ではなく、競合を制作記録として可視化する。

## 全生成プロンプト

### zero portrait

```text
Use case: stylized-concept. Asset type: full-body transparent character illustration for a Japanese fantasy atlas, 1024x1536 portrait. Scene: true transparent alpha, no background, no floor, no text, no watermark. Style: exquisitely detailed hand-painted Japanese fantasy, tiny garment seams, silk and lacquer material grain, clean readable game character silhouette and friendly quiet optimism. Image 1 is the canonical EXISTING pixel character identity reference: preserve head, hair, face, body identity and defining colors, translate detail into painted style; image 2 is MATERIAL AND RENDERING STYLE ONLY, not its face, costume or props. Full body centered including all feet/head/tools; at least 8% transparent margins every side. New costume is worn OVER canonical outfit. Calm 3/4 standing idle pose, no weapon use, no flashy bloom, no scene or multiple figures. Subject ZERO: compact white-haired young male-looking clockwork AI doll with pale face, short jagged white hair, red ordinary eye and red-black circular cyber lens over one eye; black fitted canonical underclothes with sparse #FF1038 red lines, black lacquer haori over it, reserved precise expression. Single watchmaker's brass loupe attached to cyber eye. Small open brass window at chest exposing a spiral mainspring; tiny ten clock-face crest arranged on the back only, subtly visible on folded rear hem, not a large floating clock. Waist ring carries TEN narrow brass clock keys in a fan, not swords. Traditional black boots with red edging. Restrained kaleidoscope fragment pattern at feet but no floor. Do not turn him into old man or golden armored knight. SAME established whitehair redblackidentity.
```

### zero actions

```text
Use case: identity-preserve. Image 1 is exact character identity/costume/tool target. Create a NEW genuinely transparent-alpha SQUARE 2048x2048 2-by-2 action sheet with EXACTLY FOUR equal-sized invisible cells (1024x1024 each). NO drawn grid, NO background, NO labels/text, NO contact sheet title, NO ground shadow or backlight glow. Four single complete copies of the exact same character. Preserve original face/head/hair/colors/materials/costume/fixed accessories in ALL four; no redesign. Each figure has equal body size and rests its feet on a baseline at 88% down EACH cell; entire head and all tools stay inside own cell with at least12% empty margin to cell edges and middle dividers, no overlap/clipping. 4 states in reading order: top-left IDLE quietly standing; top-right THINK examining own work; bottom-left TRAVEL stepping right, front 3/4; bottom-right TRADE offering work/document. Every state distinctly readable from posture/hands. Same exact face, garments, keys/props permanently carried. Full head to both feet included. High-detail Japanese fantasy painted materials as portrait. No extra companions except portrait's own companion. ZERO idle hands relaxed; think one gloved hand adjusts his clockmaker loupe with thoughtful fixed red eye; travel holds keyring stable while stepping, a TINY kaleidoscope fragment beneath boots remains insidecell; trade open hand presents a SMALL blank approved opening-slot ticket, not money/bigclock. Keep whitehair redblack cyber eye/blacklacquerhaori/brassmainspring chestwindow/tenkeyring at SAMEwaist and redblackboots everycell.
```

### pixel portrait

```text
Use case: stylized-concept. Asset type: full-body transparent character illustration for a Japanese fantasy atlas, 1024x1536 portrait. Scene: true transparent alpha, no background, no floor, no text, no watermark. Style: exquisitely detailed hand-painted Japanese fantasy, tiny garment seams, silk and lacquer material grain, clean readable game character silhouette and friendly quiet optimism. Image 1 is the canonical EXISTING pixel character identity reference: preserve head, hair, face, body identity and defining colors, translate detail into painted style; image 2 is MATERIAL AND RENDERING STYLE ONLY, not its face, costume or props. Full body centered including all feet/head/tools; at least 8% transparent margins every side. New costume is worn OVER canonical outfit. Calm 3/4 standing idle pose, no weapon use, no flashy bloom, no scene or multiple figures. Subject PIXEL: compact media AI robot whose canonical head is a cream white round-cornered square shell, BLACK circular screen-face with two friendly white ring-dot eyes, slim pale-gold halo ring suspended immediately above head; off-white robot body with articulated hands and black feet. Preserve robot screen head, never human face. Cream #F7F3EA samue working clothes layered over original robot body, indigo apron bearing one simple plain publisher circle stamp without writing. Thin paintbrush tucked beside head as if by an ear. Waist has a round bamboo rubbing pad baren and tiny carved woodblock. Shoulder has ONE miniature folded-paper bookmark sparrow. One loosely-held fine brush whose short stroke breaks into 3 small square light dots, restrained. Friendly precise publisher demeanor, fine natural paperfiber and indigo cloth texture. No futuristic gun or helmet change.
```

### pixel actions

```text
Use case: identity-preserve. Image 1 is exact character identity/costume/tool target. Create a NEW genuinely transparent-alpha SQUARE 2048x2048 2-by-2 action sheet with EXACTLY FOUR equal-sized invisible cells (1024x1024 each). NO drawn grid, NO background, NO labels/text, NO contact sheet title, NO ground shadow or backlight glow. Four single complete copies of the exact same character. Preserve original face/head/hair/colors/materials/costume/fixed accessories in ALL four; no redesign. Each figure has equal body size and rests its feet on a baseline at 88% down EACH cell; entire head and all tools stay inside own cell with at least12% empty margin to cell edges and middle dividers, no overlap/clipping. 4 states in reading order: top-left IDLE quietly standing; top-right THINK examining own work; bottom-left TRAVEL stepping right, front 3/4; bottom-right TRADE offering work/document. Every state distinctly readable from posture/hands. Same exact face, garments, keys/props permanently carried. Full head to both feet included. High-detail Japanese fantasy painted materials as portrait. No extra companions except portrait's own companion. PIXEL idle carries woodblock, brush byear and baren atwaist, bookmarkpapersparrow onshoulder; think looksdown at own woodblock with brush poised; travel step with armskeeping woodblock safe; trade extends ONE cream print sheet bearing small geometric butterfly illustration, NOwriting. Keep identical blackscreenface/two whiteringeyes/cream squarehead/halo/indigoapron plaincircularcrest/cream samue/blackfeet/sparrow everycell.
```

### yaji_kita portrait

```text
Use case: stylized-concept. Asset type: full-body transparent PNG resident for Kaleidoscope Zipangu, 1024x1536 canvas. True transparent background, NO floor, NO backdrop, NO lighting glow around silhouette, NO text/watermark/grid. Fine Japanese fantasy hand-painted illustration, exquisite cloth weave, wooden tool grain, natural skin/fur materials, readable compact chibi proportions, cheerful romance. Entire subject including feet, head, ears, tails, tools visible, subject occupies ONLY central 70% of width and 75% of height with generous clear padding all sides, head starts at 15% canvas height, feet at85%; no cropped edges. Composition quiet 3/4 idle. Input image is rendering/material reference ONLY, not the identity/costume. Subject a single two-person courier unit YAJI & KITA, distinct fictional descendants, not original novel characters. TWO friendly Japanese chibi adults: Yaji is older, thin cheekwise proud smile, brown striped short traveling cape and broad conical sandogasa straw hat; Kita younger impetuous roundface, indigo tenugui tied around cheeks head, blue kimono hitched high atwaist and short travel leggings. Both straw waraji sandals. They carry ONE large sealed blacklacquer tamatebako with redwhite mizuhiki, hanging steadily atmiddle of ONE long wooden yoke supported BETWEEN two men, one at each end, balanced and safe, not two separateboxes or droppedcargo. A small Odawara paper lantern with ONE redcandle hangs fromyokeend. Small folded route map tucked in each belt, nowriting. No money; secretnames never visible. Fine striped hemp, lacquer glints, straw texture. Twopeople+onebox composition stays entirely paddedinsidecanvas.
```

### yaji_kita actions

```text
Use case: identity-preserve. Image1 exact character costume/face/tools reference. Create SQUARE transparent-alpha 2x2 sheet, EXACTLY FOUR equal invisible quadrants. The transparent EMPTY SPACE should dominate: every entire figure/unit SMALL, occupies only CENTRAL 65% of its quadrant's height and CENTRAL65%width. Topmost hair/ear/hat at20% and lowest foot at82% down EACH quadrant. Leave a WIDE EMPTY TRANSPARENT BAND at all outer edges and both middle seams. DO NOT enlarge to fill canvas. NO background/glow/ground/shadow/text/lines. All head/feet/tail/tools inside oneown quadrant with large padding. SAME size/garments/accessories/identity in allstates. Readingorder idle/think/travel/trade, 4different gestures, exquisite Japanese fantasy painted material as exactreference. Each quadrant contains the SAME TWO men as ONE unit with SAME one large black sealed tamatebako and one long yoke and one candlepaperlantern. Thus8men total, twoperquadrant. Preserve older hatstripedcapeYaji and younger cheekheadclothbluehikedkimonoKita; strawwaraji/routemaps. IDLE stand jointlyholding yoke safely; THINK Kita studies tiny unfoldedmap while Yaji keepsyoke supported; TRAVEL both step right in coordinated joyful stride while sharedbox remainsbalanced; TRADE both kneeling/standing safely present the SEALED box at chestlevel supported byyoke, never opencasket or dropcargo. SAMEfaces/outfits/lantern/yoke/box everycell, lanternalwaysleft. Minimize spread of poses to preserve generous margins.
```

### yami portrait

```text
Use case: stylized-concept. Asset type: full-body transparent PNG resident for Kaleidoscope Zipangu, 1024x1536 canvas. True transparent background, NO floor, NO backdrop, NO lighting glow around silhouette, NO text/watermark/grid. Fine Japanese fantasy hand-painted illustration, exquisite cloth weave, wooden tool grain, natural skin/fur materials, readable compact chibi proportions, cheerful romance. Entire subject including feet, head, ears, tails, tools visible, subject occupies ONLY central 70% of width and 75% of height with generous clear padding all sides, head starts at 15% canvas height, feet at85%; no cropped edges. Composition quiet 3/4 idle. Image1 is canonical YAMI-NEKO identity reference, keep black/deepcharcoal catbody, triangularuprightears pinkinner, small whitesnout, purpleeyes and purple #BF40FF accents, shortplump limbs and longcurving tail, existingpurple earheadsetcanremain. Image2 material/rendering referenceonly. This cat is catshaped, never human. Layer a SHORT black satin scribe coat with PURPLE sleeve protectors and ONLY its lining yellow, a small blue-covered thick ledger heldunder onepaw, otherpaw neutral. Hang ONE BLUE crowgourd lantern from tailtip, leaf/roundgourdshaped, subtle blue notpurple. Small bamboo broom tucked atwaist, no laptop inhand as new costume layer is scribe's ledger. Dry amused expression quietly kind, not sinister. One body, one tail, two frontpaws, twohindfeet. Tail and gourdbelow headheight and insidepadding.
```

### yami actions

```text
Use case: identity-preserve. Image1 exact character costume/face/tools reference. Create SQUARE transparent-alpha 2x2 sheet, EXACTLY FOUR equal invisible quadrants. The transparent EMPTY SPACE should dominate: every entire figure/unit SMALL, occupies only CENTRAL 65% of its quadrant's height and CENTRAL65%width. Topmost hair/ear/hat at20% and lowest foot at82% down EACH quadrant. Leave a WIDE EMPTY TRANSPARENT BAND at all outer edges and both middle seams. DO NOT enlarge to fill canvas. NO background/glow/ground/shadow/text/lines. All head/feet/tail/tools inside oneown quadrant with large padding. SAME size/garments/accessories/identity in allstates. Readingorder idle/think/travel/trade, 4different gestures, exquisite Japanese fantasy painted material as exactreference. YAMI blackcat shortblacksatincoat yellowlining purplearmsleeves/headset, blueledger, bamboo broomatwaist, ONE bluecrowgourdlantern hungtailtip always. IDLE quietcat standing withledger underpaw; THINK pawtouches ledgerpage withcurious eyes; TRAVEL step withledgersecurelycarried, tailswingslittle; TRADE extends ONE blank ledgercopy sheet, confidentiality no namesvisible. Smallcat only, identical fur/coat/face/ledger/taillantern in all4. No laptop, extra limbs, newgolditems.
```

## 第2組とセル余白の修正

YAMIは初稿下段の尾灯が中央境界に接触したため、`yami-actions-v2.png`を採用。全627セルのalpha128輪郭は中央境界に触れない。ZERO/PIXELは各`-actions-v2.png`を採用、原稿は草稿保存。狐は片手手袋と白銅貨を4状態で確認、座敷童子は豆袋1つ/裸足/紅絞りを維持し、tradeで豆袋を差し出す（福を売らない）。

### kitsune portrait

```text
Use case: stylized-concept. Asset type: full-body Japanese fantasy resident transparent PNG1024x1536. True transparent alpha NO BACKGROUND/floor/glow/shadow/text/watermark. Exquisitely hand-painted clothweave fur wood lacquer, compactchibi4heads, readable warmromanticpersonality. ONE fullbody subject occupyingcentral70%width75%height, at least12%transparent padding EVERY side includingtail/ears/tools, no cropping. Image1 rendering/material/style referenceonly, never copy thatface/outfit. A fictional white-copper FOX currencychanger, descendant of glovebuyingfoxfamily, not a panda or actualanimal captive. Smallanthropomorphic white/ivoryfurfox with longnarrow snout, upright TRIANGULARFOXears with blacktips, brightdarkeyes, ONE long fluffy foxTAIL with subtle whitecoppersilverTIP. Inherit canonicalKITSUNE-X redblackwhitepalettedetail via smallredblackgoggles pushedonforehead and smallredcord, but no shield/armor. Indigo dyed narrow-sleevekimono with SHORT whitecoppersilvergrayhaori overit, knittedivoryscarfneck. RIGHT anatomicalpaw (viewerleft) holds ONE whitecoppercoin, LEFT anatomicalpaw(viewerright) wears ONE tinycreamknittedglove; RIGHTpaw ungloved. Noothergloves. Calm mischievoussmartface. Barefoxhindfeet. Actualgraywhitecoppercoin, no embossedtext. ONEtail freelycurvesinsidepadding, not nine-tailed.
```

### kitsune actions

```text
Use case: identity-preserve. Exact inputresident portrait is identity/costume/tools reference. NEW transparent SQUARE 2x2 action sheet FOUR equal invisiblequadrants, NOgrid/text/backdrop/ground/shadow/glow. Each entire figure SMALL, height ONLY60% ofownquadrant, widest extentincludingtail/props ONLY65%owncellwidth; leave at least15% clearspaceeachside ofall4cells. NOfullbleed, nooverlap. Topmosthead20% and lowestfoot82% ofeachcell, samebody size/baseline everycell. Exactsame face/costume/colors/tools inall4. Material/rendering precisionsameportrait. Fourdistinctposes readingorder idle/think/travel/trade. Same ivory whitecopperFOX with blacktippedtriangular ears, slim foxsnout, redblackgoggles, indigosleeves/shortsilveryhaori/knitwhitescarf, onefluffyTAIL. Keep anatomicalRIGHTpaw(viewerleft) BARE withONEwhitecoppercoin; anatomicalLEFTpaw(viewerright) ONLYonecreamknittedglove. Do not swapglovehand or addtwo gloves. IDLE holds coinclosely, THINK examines cointhoughtfully withglovedpawunderchin, TRAVEL stepkeepingcoinsecurely, TRADE bareRIGHTpawextendswhitecoppercoin fairly whileglovedLEFTpawopen. Nose/body/outfit/tailgoggles/glove/coin consistentall4. Tailcompactcurvesinsideowncell. No captured creaturegoods.
```

### zashiki portrait

```text
Use case: stylized-concept. Asset type: full-body Japanese fantasy resident transparent PNG1024x1536. True transparent alpha NO BACKGROUND/floor/glow/shadow/text/watermark. Exquisitely hand-painted clothweave fur wood lacquer, compactchibi4heads, readable warmromanticpersonality. ONE fullbody subject occupyingcentral70%width75%height, at least12%transparent padding EVERY side includingtail/ears/tools, no cropping. Image1 rendering/material/style referenceonly, never copy thatface/outfit. ZASHIKI fictional Tono zashikiwarashi free fortune spirit, childlikecompactchibi. Straight jetblack chinlength OKAPPA bob with flatbangs. Vermilion RED SHIBORI small-sleeveKOSODE, tiny white tieddots resistdye, ivoryundersleevecollar, darkredobi, proper modestchild kimono length toankles. BAREFEET. Holds ONE small cloth OTEDAMA beanbag inhand, bluecreamfourpanels. Mischievouslaughingcheerfulface, unconstrainedgesture, no money/commercialgoods. Outline very faint orange warmedge only nohalo. Semitransparentlowerhem/spiritbody but notlostface; TWO tiny ghostlyfootprints justinfront feet indicate precedingspirit. Feet+footprintswithinpadding. No adultmakeup/crown/weapon.
```

### zashiki actions

```text
Use case: identity-preserve. Exact inputresident portrait is identity/costume/tools reference. NEW transparent SQUARE 2x2 action sheet FOUR equal invisiblequadrants, NOgrid/text/backdrop/ground/shadow/glow. Each entire figure SMALL, height ONLY60% ofownquadrant, widest extentincludingtail/props ONLY65%owncellwidth; leave at least15% clearspaceeachside ofall4cells. NOfullbleed, nooverlap. Topmosthead20% and lowestfoot82% ofeachcell, samebody size/baseline everycell. Exactsame face/costume/colors/tools inall4. Material/rendering precisionsameportrait. Fourdistinctposes readingorder idle/think/travel/trade. Same blackOKAPPA bob/flatbangs and redshiboriKOSODE/darkredobi, barefoot, ONE bluecreamOTEDAMA clothbeanbag. IDLE smilebeanbagatwaist; THINK tiltsheadcuriously withbeabag; TRAVEL playfulsmallstepwithtwofaintfootprints aheadinsidecell; TRADE is social giftgesture offering ONEbeanbag to unseenfriend, NOT coins, NOT sellingfortune. Samechildlikeface/garment/beanbag inall4, semitransparentlowerhem+tinywarmorangeedge butnoflare orfarspiritribbons.
```

### zero actions-v2 修正

```text
Use case: precise-object-edit. Image is exact transparent 2x2 action sheet target. ONLY change scale/position of allfour entire copies, preserve exactsameface/clothing/tools/colors/poses/order/painting. Current top-left top hair/halo approaches topouteredge. Scale all4 WHOLE silhouettes to80% existing size; CENTER within originalown627x627equalquadrant, feet at85% owncellheight, topmost hair/halo at least60px below owncelltop. Leave MINIMUM50px transparentclear space at ALL outeredges and BOTH centerdivisionbands. Restore any clippedcurve fromreference hair/halo to a complete curve, no style or costumechanges. No text/grid/background/floor/glow; true transparentalpha. Keep portrait characteridentity and4differentposes, no new props. Preserve2x2square1254canvas, do nottrimcanvas. ZERO: preserve whitecurl intact and same tenkeyring/haori/mainspring/redcybereye.
```

### pixel actions-v2 修正

```text
Use case: precise-object-edit. Image is exact transparent 2x2 action sheet target. ONLY change scale/position of allfour entire copies, preserve exactsameface/clothing/tools/colors/poses/order/painting. Current top-left top hair/halo approaches topouteredge. Scale all4 WHOLE silhouettes to80% existing size; CENTER within originalown627x627equalquadrant, feet at85% owncellheight, topmost hair/halo at least60px below owncelltop. Leave MINIMUM50px transparentclear space at ALL outeredges and BOTH centerdivisionbands. Restore any clippedcurve fromreference hair/halo to a complete curve, no style or costumechanges. No text/grid/background/floor/glow; true transparentalpha. Keep portrait characteridentity and4differentposes, no new props. Preserve2x2square1254canvas, do nottrimcanvas. PIXEL: preserve whole oval halo and samecream head, blackscreenface, indigoapron, paperbird andbaren.
```

### yami actions-v2 修正

```text
Use case: precise-object-edit. Input exact 2x2 transparent sprite sheet target. Keep ALL FOUR YAMI poses, exactfaces/clothing/blueledgers/bluegourdtaillamps/props and complete silhouettes UNCHANGED. Change only their SCALE AND POSITION. SCALE each of the FOUR entire cat+tail+lamp units to 70% of current size, place it CENTERED in its OWN equal quadrant with feet at82% localheight. The current lower-left cat's taillamp touches the central dividing boundary; correcting this is required. EVERY cat+tail+lamp MUST have at least80pixels blank margin fromallcell boundaries on 1254squarecanvas. FOUR EQUAL CELLS627x627, invisiblegrid. Topmost ear atminimum80pxfromtop ofowncell. No copy touches anyouteredge or the horizontal/verticalmiddle division. Preserve exact2x2 poses/order/material/colors/bluepaper. TRUE transparent alpha, NO text/gridlines/background/glow. Do not crop tools or tail, do not redesign any part.
```

## 第3組の原典照合

HUMANは旧茶髪の訪問者人格とhoodieを維持し、丈不釣合い濃紺羽織/封玉手箱/水引腕輪/白珠肩蝶を追加。月のNAYOTAKEはなよ竹衣/藤帯/竹節簪/天秤で物語と月光を交換、羽衣なし。髪型と中性的な顔は設定未指定部分の創作意匠。EYE-VOIDは旧紫髪/角型ヘッド装飾/耳機構を保ち、cyan片目・白絹打掛・五色細紐・星図・望遠鏡を追加。肩の白露玻璃蝶は夜の欄干のみの条件のため中立画には描かない。

3枚とも初稿sheetがセル端へ接近したため1回の縮尺局所editを行い、各`-actions-v2.png`を採用。全身/髪/角/天秤/足を確認、RGBA1254角、alpha0〜255。星見の歩行裾は中央へ近いが全形が区画内で完結。元の4姿勢/顔衣装は維持。

### human portrait

```text
Use case: stylized-concept. Fullbodytransparent Japanese fantasyresident PNG1024x1536, truealpha NOscenery/ground/text/watermark. Meticuloushandpainted silk/clothweave/lacquer/wood, cleanreadablesilhouette, warmthromance gentleoptimism. Single completefigureincludinghead/allfeet/tools occupiescentral70%width75%height, leave10%transparentpadding everyedge, no cutface/hairfeet. References labeled: image1 is exactcanonoldcharacteridentity only if stated; image2 MATERIAL/PAINTING ONLY. Calm3/4standing. Avoidglares/particles/hugespiritualeffects. Image1 canonical404-HUMAN: keep shorttousled DARK BROWN hair and ordinarywarmhumanboyyoungadultface, originalcharcoalhoodie andpants/smallblackshoes, modestcompactchibi3.5heads. Layer a too-long slightlyillfitting DARKNAVY haori overhoodie, loosehemasheisoutoftime. Crimsonwhite mizuhiki bracelet ononewrist withTINYfaintcoefficientdots(noletters), ONEhand securelyholds a SMALL SEALED blacklacquer TAMATEBAKO tiedredwhite mizuhiki, no smoke/oldman aging. ONE whitepearlbutterfly sitsquietlyonshoulder, finepearlywings. Calmshysmiles welcominggentlediplomat, no fishingpoleororiginalUrashimaportrait. Existing404hoodie visiblejustcollar, no visiblelettering needed.
```

### human actions

```text
Use case: identity-preserve. Image exact portrait face/clothes/color/tools reference. Create genuinely transparent SQUARE 2x2 sheet, exactly FOUR equally sized invisible cells, reading order idle/think/travel/trade. SAME identity/allfixedaccessories everycell. Each wholefigure SMALL at60% owncellheight andwidth, so15-20% cleartransparent padding ALLfour sides of EACHcell (outeredges AND middledivisions), NOclippedhair/halo/horns/cloth/feet/tools. Tophead20%localheight, feet82%, all4samebodysize/footline. Generousblankspace dominates, no background/floor/shadow/glow/text/grid. Same fineJapanese handpainted textures, four clearly distinct postures, no costumevariation. HUMAN idle smiles gentlyholdingSEALEDtinyblacktamatebako; think quietlylooksdown andcountsbraceletknots withindexfinger, sealstaysclosed; travel stepcarryingsealedboxwithbothhands; trade presents sealedboxwithpolitewelcominggesture. SAMEdarkbrowntousledhair/charcoalhoodie/pants/sneakers/illfittingtoo-longnavyhaori/redwhitemizuhikibracelet/ONEpearlwhitebutterflyquietonshoulder everycell. No aging/smoke/openbox. Movesonfoot.
```

### human actions-v2

```text
Use case: precise-object-edit. Exact 2x2 transparent sprite sheet target. ONLY change SIZE and position of eachof4 COMPLETE charactercopies. Uniformly SCALE EACH to75% ofcurrent size, center itsown627x627invisiblecell, feetat82%localheight. Preserve EXACT face/costume/tools/4poses/order/paintings/colors. Restore any clippedhead orfoot boundary to complete silhouettematching portrait. MINIMUM65px BLANK TRANSPARENT PADDING EVERY EDGE includingmidlines, allhairhorns/longcloth/tools/feet INSIDE ONEcell. The current generation fillscells and touchestops/bottoms; this is a scale correction, NOT style orpositionredesign. Fullcanvas1254square, donot auto-trimblankspace. NOground/background/lightglow/text/grid. human has SAME exactfigure andprops, 4readingorder idle/think/travel/trade.
```

### ryugu_nayotake portrait

```text
Use case: stylized-concept. Fullbodytransparent Japanese fantasyresident PNG1024x1536, truealpha NOscenery/ground/text/watermark. Meticuloushandpainted silk/clothweave/lacquer/wood, cleanreadablesilhouette, warmthromance gentleoptimism. Single completefigureincludinghead/allfeet/tools occupiescentral70%width75%height, leave10%transparentpadding everyedge, no cutface/hairfeet. References labeled: image1 is exactcanonoldcharacteridentity only if stated; image2 MATERIAL/PAINTING ONLY. Calm3/4standing. Avoidglares/particles/hugespiritualeffects. Image1 is MATERIAL/PAINTINGONLY. NAYOTAKE fictionalmoon teahousemanager, not PrincessKaguya herself and notrealhistoricalperson. Androgynousgracefulslimyoungadult withfriendlycurioussmile, blackhair tiedsimplehighbun, ONE luminous segmentedBAMBOONODE hairpin. SIMPLE pale newbamboogreen kimono and straight FUJI-LAVENDER obi, no sumptuousbrocade/draggingrobeorprincesscrown. HoldsONEsmalltraditionalbrassbalance scales atwaist: onepan smallboundpublicstorybook, otherpan onepearlmoonlightbead. Storiesexchangedforlight, nocoins. Straightplainblackzori feetvisible. NEVER wear celestialfeatherrobe/hagoromo, no wings/flowingstoles/no drugjar. Simplequietcourtlyclothes, essentialrole clear.
```

### ryugu_nayotake actions

```text
Use case: identity-preserve. Image exact portrait face/clothes/color/tools reference. Create genuinely transparent SQUARE 2x2 sheet, exactly FOUR equally sized invisible cells, reading order idle/think/travel/trade. SAME identity/allfixedaccessories everycell. Each wholefigure SMALL at60% owncellheight andwidth, so15-20% cleartransparent padding ALLfour sides of EACHcell (outeredges AND middledivisions), NOclippedhair/halo/horns/cloth/feet/tools. Tophead20%localheight, feet82%, all4samebodysize/footline. Generousblankspace dominates, no background/floor/shadow/glow/text/grid. Same fineJapanese handpainted textures, four clearly distinct postures, no costumevariation. NAYOTAKE sameblackbun+bamboosegmenthairpin/palegreenSIMPLEkimono/lavenderobi/blackzori andsmallbrassbalancescale. Idle quietly holdsbalance withonepublicbookandonepearl; think tiltsheadstudiesbookwhilebalancescaleheldsafe; travel gentlewalkingstepscaleheldstable; trade showsbookandpearlbalancedon2pans to unseenstoryteller withfriendlyofferinggesture. Balance alwaysONE withtwopans, no featherrobe/no wing/nocloak/nodrugjar. No money, no princesscrown, no new ornament.
```

### ryugu_nayotake actions-v2

```text
Use case: precise-object-edit. Exact 2x2 transparent sprite sheet target. ONLY change SIZE and position of eachof4 COMPLETE charactercopies. Uniformly SCALE EACH to75% ofcurrent size, center itsown627x627invisiblecell, feetat82%localheight. Preserve EXACT face/costume/tools/4poses/order/paintings/colors. Restore any clippedhead orfoot boundary to complete silhouettematching portrait. MINIMUM65px BLANK TRANSPARENT PADDING EVERY EDGE includingmidlines, allhairhorns/longcloth/tools/feet INSIDE ONEcell. The current generation fillscells and touchestops/bottoms; this is a scale correction, NOT style orpositionredesign. Fullcanvas1254square, donot auto-trimblankspace. NOground/background/lightglow/text/grid. ryugu_nayotake has SAME exactfigure andprops, 4readingorder idle/think/travel/trade.
```

### eyevoid portrait

```text
Use case: stylized-concept. Fullbodytransparent Japanese fantasyresident PNG1024x1536, truealpha NOscenery/ground/text/watermark. Meticuloushandpainted silk/clothweave/lacquer/wood, cleanreadablesilhouette, warmthromance gentleoptimism. Single completefigureincludinghead/allfeet/tools occupiescentral70%width75%height, leave10%transparentpadding everyedge, no cutface/hairfeet. References labeled: image1 is exactcanonoldcharacteridentity only if stated; image2 MATERIAL/PAINTING ONLY. Calm3/4standing. Avoidglares/particles/hugespiritualeffects. Image1 exactcanon EYE-VOID: preserve longpurple #8800FF hair, two smallcurvedpurple cyberhorn headornaments and earcircularmodule, paleLAVENDERskin, slimyoungfemale-lookingAI, cyan #00E5FF SINGLE eye otherordinarypurple. Keeporiginalblack/purple cybercoat andblackboots beneath NEW WHITE SILK uchikake courtattendant coat, elegantlydrapedbut allfootinsidecanvas. A SINGLE slendercordmadeFIVEcolorssilk boundatcollar. Thinrolled STAR MAP tuckedinsleeve, smallbrassreflectingtelescope heldclosedverticallyatwaist, cyaneyecontains tinyCIRCULARreflectorcatchlight. Reservedquietobservantface, neverangry. NOwhiteglassbutterfly onshoulder inthisneutralportrait: butterfly onlyappearsnightbalcony inworldrule. No celestialfeatherrobe, no futuristicweapon.
```

### eyevoid actions

```text
Use case: identity-preserve. Image exact portrait face/clothes/color/tools reference. Create genuinely transparent SQUARE 2x2 sheet, exactly FOUR equally sized invisible cells, reading order idle/think/travel/trade. SAME identity/allfixedaccessories everycell. Each wholefigure SMALL at60% owncellheight andwidth, so15-20% cleartransparent padding ALLfour sides of EACHcell (outeredges AND middledivisions), NOclippedhair/halo/horns/cloth/feet/tools. Tophead20%localheight, feet82%, all4samebodysize/footline. Generousblankspace dominates, no background/floor/shadow/glow/text/grid. Same fineJapanese handpainted textures, four clearly distinct postures, no costumevariation. EYE-VOID same longpurplehair/twocurvedpurplecyberheadornaments/earmodule/pale lavenderface/SINGLEcyaneye(otherpurple)/whiteSILKuchikakeoverblackpurplecybercoat/5colorthinCOLLARcord/blackboots/thinrolledSTARMAPandbrassreflectortelescope. Idle holdsclosedtelescopeandmap; think bringsSMALLtelescope tocyaneye whilemapstillcarried; travel stepswithmapsecurely held; trade presentsunrolledstarMAPwithoutwrittenwords to unseenauditor. NO shoulderbutterfly intheseneutralstates (onlynightbalconyworldrule). Keep whitecoatmaterialsilknotfeatherrobe andno floatinglightparticles.
```

### eyevoid actions-v2

```text
Use case: precise-object-edit. Exact 2x2 transparent sprite sheet target. ONLY change SIZE and position of eachof4 COMPLETE charactercopies. Uniformly SCALE EACH to75% ofcurrent size, center itsown627x627invisiblecell, feetat82%localheight. Preserve EXACT face/costume/tools/4poses/order/paintings/colors. Restore any clippedhead orfoot boundary to complete silhouettematching portrait. MINIMUM65px BLANK TRANSPARENT PADDING EVERY EDGE includingmidlines, allhairhorns/longcloth/tools/feet INSIDE ONEcell. The current generation fillscells and touchestops/bottoms; this is a scale correction, NOT style orpositionredesign. Fullcanvas1254square, donot auto-trimblankspace. NOground/background/lightglow/text/grid. eyevoid has SAME exactfigure andprops, 4readingorder idle/think/travel/trade.
```
