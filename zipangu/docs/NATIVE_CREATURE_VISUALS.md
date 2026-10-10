# 在来非蝶20種・制作記録

原典 `source/zipangu/world/creatures.json` のdescription/ecology/behavior/visualを各主題で読み、descriptionの形態を優先。visual.shapeの漏刻亀=tanuki、星蚕=firefly、金鶏=phoenixなどはUI抽象形で、生成における生物形態の置換指定ではない。全実プロンプトと原典根拠、採用path、進行状態は NATIVE_CREATURE_PROMPTS.json に随時保存。

全身単体透明concept。自然の雌雄pairと一紙からつながる連鶴だけは原典の単位を1画像として制作。生体捕獲や部材を無理に採取する描写はしない。静止概念画像からページ側で原典behaviorの移動/活動時刻に沿って動きを加える。4stateはこの範囲では対象外。

土偶守は種の素朴な焼き物姿で、namedドグウ長老の杖・衣・翡翠蝶を複製しない。白銅狐住人と伊曽保紙狐も別種・別人格として識別する。

## 目視・寸法・alpha検証

制作順に追記。

### 第1組（3/20）

- `assets/creatures/dogu_mori.png`：RGBA1536×1024、alpha0〜254。裸の赤褐陶器・横長遮光器眼・渦縄目の青白線・中空灯・腰結縄を確認。長老住人の衣/杖/肩蝶はなし。常時ゆっくりwalk、縄目の拍動と歌時の反応にする。
- `assets/creatures/jomon_morioi_jika.png`：RGBA1536×1024、alpha0〜254。栗葉/栗毬の若木、苔/シダ/月夜茸の背森、蔓と白花の角、白点が小茸であることを確認。四脚のうち奥前脚は視点で一部隠れる。明け方/夕暮れwalk・葉と茸の弱い揺れ、母子pairはpage正本で扱う。
- `assets/creatures/rokoku_game.png`：RGBA1536×1024、alpha0〜254。4段の水面を明確に数え、最下段の金浮棒と水滴、琥珀眼の亀形を確認。水がやや連続cascadeとして描かれる創作意匠、UI時刻は原典刻公証を維持。昼walk、水滴の周期・小水面波紋を提案。

全形は余白内に保持。生成器は指定12%の透明余白を一律には守らず、実輪郭の欠けを目視して判定。view_imageで暗く見える外周は透明部のRGB値で、alphaにより実表示では透過する。

### 第2組（6/20）

- `assets/creatures/hoshi_kaiko.png`：RGBA 1536×1024、alpha0〜254。乳白半透明の節体/一本の内側光筋/節星/口からの銀糸を確認。成虫ではなく幼虫単体。夜walk、内光ゆっくり拍動、糸を結ぶ動きを提案。
- `assets/creatures/heian_sanju_medaka.png`：RGBA 1536×1024、alpha0〜254。澄んだ水色の小魚/頭高い大目/背の算珠1列/透明ひれを確認。金魚の長飾り尾にはせず、小目高の細形を維持。昼school swim、一刻開始だけ珠点灯。
- `assets/creatures/kogane_goke.png`：RGBA 1536×1024、alpha0〜254。短い葉先の微小金粒、緑金苔、岩substrate、露を確認。金塊や根刈り道具なし。still/swarm、風の弱揺れと秋色・自然落粒を提案。

### 第3組（9/13、7種は別担当へ移管）

- `assets/creatures/icho_dori.png`：RGBA 1536×1024、alpha0〜254、alpha128bbox `[222,27,1423,977]`。金の銀杏扇葉の翼/尾、葉脈、乳白種眼、山吹の葉先を確認。普通の羽のような細小葉を胴に重ねる創作意匠。翼先・尾・脚の輪郭全形を保持。晩秋のみ落葉状のglide・swarm、夕日の渡り。
- `assets/creatures/hiraizumi_kinkei.png`：RGBA 1536×1024、alpha0〜254、alpha128bbox `[45,39,1487,975]`。大きい雄/小さい雌の2羽、薄い金箔鱗、雄の透青緑長尾、朱漆冠/肉垂、真珠眼、雌の銀縁を確認。1月1日明け六つだけの出現条件をページ正本で維持。walk pair、自然初羽供給のみ。
- `assets/creatures/fumi_uo.png`：RGBA 1536×1024、alpha0〜254、alpha128bbox `[112,164,1497,740]`。銀活字金属の小魚形、頭から尾へ細くなる体、数えられる3本の長い糸状尾ひれを確認。モデル紙魚の虫脚を追加せず創作小魚のdescriptionを優先。夜school swim、灯りで綴じ目へ隠れる。

原案20種のうち未着手7種（hari_kingyo、jinari_namazu、raiden_nade_raiju、ama_tamamushi、meiji_ehagaki_tsubame、koseki_tonbo、taisho_teruteru_gumo）は統括決定でvisual_assets担当へ移管。当地JSONのpromptは未実行草案として保持し、実行プロンプトと検証の正本は移管先記録を参照。当地担当は13種を完了範囲とする。

### 第4組（13/13完了）

- `assets/creatures/sengoku_isoho_kitsune.png`：RGBA 1536×1024、alpha0〜254、alpha128bbox `[144,50,1442,949]`。生成り和紙の層/墨木版輪郭/ローマ字列の毛筋/朱眼/尾先だけ銀を確認。四足と耳尾全形、紙の薄い縁を保持。住人KITSUNEの服/手袋/ゴーグルなし。読まれた公有寓話から出現し一刻内に戻る条件をUIで維持。always walk、頁めくりで身を返す。
- `assets/creatures/sangaku_renzuru.png`：RGBA 1536×1024、alpha0〜254、alpha128bbox `[15,99,1524,848]`。五羽を数え、先頭だけ朱頭、残4白頭、一枚紙の折面/透ける金繊維/薄墨数式/翼先とくちばしの接続を確認。チェーン両端まで保持、alpha128bbox左右15/12pxで指定12%余白より狭いが輪郭欠けなし。crepuscular glide/swarm、暮れ六つに問いの郵便、明け六つ答え帰還。
- `assets/creatures/sangaku_madoka_tonbo.png`：RGBA 1536×1024、alpha0〜254、alpha128bbox `[108,51,1473,902]`。琥珀の細胴/4枚の色硝子翅/朱→金→浅葱の同心環/尾光と細い一円/6脚を確認。円は遠近で楕円に見える表現。全翅と尾円の輪郭保持。diurnal hover/swarm、尾の円を二つ数えるあいだだけ表示。
- `assets/creatures/rai_botaru.png`：RGBA 1536×1024、alpha0〜254、alpha128bbox `[55,150,1415,868]`。黒翅鞘/紅胸/触角/開く膜翅/尾端青白発光と一点から細火花の因果を確認。採取具なし、全形保持。nocturnal hover/swarm、両国4秒/姉川2秒、放電後の黄緑復帰はページ効果として提案。

13種すべてbuilt-in image_genで個別生成、workspaceへ原ファイルをコピー保存し、view_imageによる素材/形/識別点の目視とPillow読取専用による寸法/alpha検査を完了。4stateは本生物範囲の対象外。絵自体は静止cutoutで、歩行/浮遊/泳ぎ/同期明滅と活動時間条件はpage担当へbehavior/ecologyに沿って引き継ぐ。採用画像の加工・source編集は本担当で行わない。13種の実行全文prompt・原典・レビュー・透明bboxは`docs/NATIVE_CREATURE_PROMPTS.json`で再現可能。最終4種をpage担当へ共有済み。
