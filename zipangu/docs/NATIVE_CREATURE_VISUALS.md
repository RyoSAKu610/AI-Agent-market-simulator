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
- `assets/creatures/kogane_goke.png`：RGBA 1536×1024、alpha0〜254。短い葉先の微小金粒、緑金苔、岩substrate、露を確認。金塊や根刈り道具なし。still/swar m、風の弱揺れと秋色・自然落粒を提案。
