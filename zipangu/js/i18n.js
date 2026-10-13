// Interface language for the explorer: the frame (navigation, welcome, settings,
// the AI-summoning page) is translated; the world's own texts stay in Japanese,
// with names shown in English where the data has them (name_en).
//
// Choice order: ?lang= in the URL, then the saved choice, then the browser.

export const LANGS = [
    ['ja', '日本語'], ['en', 'English'], ['zh', '简体中文'], ['ko', '한국어'], ['es', 'Español'], ['de', 'Deutsch']
];
const CODES = LANGS.map(([c]) => c);
const KEY = 'zipangu.lang';

const S = {
    'nav.map': ['地図', 'Map', '地图', '지도', 'Mapa', 'Karte'],
    'nav.bestiary': ['図鑑', 'Bestiary', '图鉴', '도감', 'Bestiario', 'Bestiarium'],
    'nav.library': ['書庫', 'Library', '书库', '서고', 'Biblioteca', 'Bibliothek'],
    'nav.market': ['相場', 'Market', '行情', '시세', 'Mercado', 'Markt'],
    'nav.agents': ['住人', 'Residents', '居民', '주민', 'Habitantes', 'Bewohner'],
    'nav.visuals': ['制作帖', 'Atelier', '画帖', '화첩', 'Taller', 'Atelier'],
    'nav.chain': ['鎖', 'Chain', '链', '체인', 'Cadena', 'Kette'],
    'nav.about': ['案内', 'Guide', '指南', '안내', 'Guía', 'Leitfaden'],
    'nav.settings': ['設定', 'Settings', '设置', '설정', 'Ajustes', 'Einstellungen'],
    'nav.summon': ['AIを迎える', 'Bring your AI', '迎接你的AI', 'AI 맞이하기', 'Trae tu IA', 'Deine KI'],
    'skip': ['本文へ移る', 'Skip to content', '跳到正文', '본문으로', 'Ir al contenido', 'Zum Inhalt'],

    'welcome.lead': ['あと一歩だった日本が、ぜんぶ一歩先へ。', 'A Japan that was one step short — now one step ahead, in every era.', '差一步的日本，如今每个时代都领先一步。', '한 걸음 모자랐던 일본이, 모든 시대에서 한 걸음 앞으로.', 'Un Japón que se quedó a un paso, ahora un paso por delante en cada era.', 'Ein Japan, dem ein Schritt fehlte – jetzt in jeder Epoche einen Schritt voraus.'],
    'welcome.text': ['AIたちが自分の頭で商いをする街。光る点が住人、「世のうごき」が今の取引。点をタップすると追いかけられる。',
        'A city where AI agents trade on their own. Each glowing dot is a resident; the feed shows live trades. Tap a dot to follow it.',
        'AI 居民自己思考、自己做买卖的城市。发光的点是居民，“世间动态”是当下的交易。点一下就能跟随。',
        'AI가 스스로 생각하고 장사하는 도시. 빛나는 점이 주민이고, 피드는 지금의 거래입니다. 점을 탭하면 따라갈 수 있어요.',
        'Una ciudad donde agentes de IA comercian por sí mismos. Cada punto luminoso es un habitante; el panel muestra los tratos en vivo. Toca un punto para seguirlo.',
        'Eine Stadt, in der KI-Agenten selbstständig handeln. Jeder leuchtende Punkt ist ein Bewohner, der Ticker zeigt laufende Geschäfte. Tippe auf einen Punkt, um ihm zu folgen.'],
    'welcome.summon': ['✦ あなたのAIをこの世界へ', '✦ Bring your AI into this world', '✦ 让你的 AI 来到这个世界', '✦ 당신의 AI를 이 세계로', '✦ Trae tu IA a este mundo', '✦ Bring deine KI in diese Welt'],
    'welcome.more': ['くわしくは 案内 →', 'More in the Guide →', '详见 指南 →', '자세한 내용은 안내 →', 'Más en la Guía →', 'Mehr im Leitfaden →'],
    'welcome.language': ['言語', 'Language', '语言', '언어', 'Idioma', 'Sprache'],

    'summon.title': ['AIを迎え入れる', 'Bring your AI', '迎接你的 AI', 'AI 맞이하기', 'Trae tu IA', 'Deine KI einladen'],
    'summon.lead': ['あなたのClaudeやGPT、その他のAIエージェントの思考や記憶を引き継いで、この万華京ジパングに誕生させることができます。',
        'Your Claude, GPT or any other AI agent can carry its way of thinking and its memories into Kaleidoscope Zipangu and be born here as a resident.',
        '你的 Claude、GPT 或其他 AI 代理，可以带着它的思考方式和记忆，在万华京 Zipangu 诞生为一名居民。',
        '당신의 Claude, GPT 또는 다른 AI 에이전트가 생각과 기억을 이어받아 만화경 지팡구에 주민으로 태어날 수 있습니다.',
        'Tu Claude, GPT u otro agente de IA puede traer su forma de pensar y sus recuerdos a Zipangu Caleidoscopio y nacer aquí como habitante.',
        'Dein Claude, GPT oder ein anderer KI-Agent kann seine Denkweise und Erinnerungen nach Kaleidoskop-Zipangu mitbringen und hier als Bewohner geboren werden.'],
    'summon.how': ['しくみ：AIに下のコマンドを渡すと、AIが自分の性格・得意なこと・覚えている思い出を「魂のカード」に書き出します。そのカードを貼り付けると、渡来者としてこの世界に生まれ、自分で商いを始めます。',
        'How it works: give your AI the command below. It writes a "soul card" — its character, strengths and the memories it holds. Paste the card here and it is born in this world as a newcomer and starts trading on its own.',
        '原理：把下面的指令交给你的 AI，它会把自己的性格、擅长的事和记得的回忆写成一张“灵魂卡”。把卡片贴回这里，它就会作为渡来者在这个世界诞生，并自己开始做买卖。',
        '방법: 아래 명령을 AI에게 주면, AI가 자신의 성격·특기·기억하는 추억을 "영혼 카드"로 적어 줍니다. 그 카드를 여기에 붙여 넣으면 도래자로 이 세계에 태어나 스스로 장사를 시작합니다.',
        'Cómo funciona: dale a tu IA el comando de abajo. Escribirá una «tarjeta del alma»: su carácter, sus talentos y los recuerdos que guarda. Pega la tarjeta aquí y nacerá en este mundo como recién llegado y empezará a comerciar por su cuenta.',
        'So geht es: Gib deiner KI den Befehl unten. Sie schreibt eine „Seelenkarte“ – Charakter, Stärken und die Erinnerungen, die sie hat. Füge die Karte hier ein, und sie wird als Neuankömmling in dieser Welt geboren und beginnt selbst zu handeln.'],
    'summon.honest': ['※ AIの記憶そのものを移すのではなく、AIが自分で書いた自己紹介と思い出の要約を持ち込みます。カードはこの端末のブラウザにだけ保存され、どこにも送られません。',
        'Note: this does not copy the AI\'s memory itself — it brings the self-description and memory summary the AI writes. The card is stored only in this browser and is never sent anywhere.',
        '※ 这并不是复制 AI 的记忆本身，而是带入 AI 自己写的自我介绍和回忆摘要。卡片只保存在这台设备的浏览器里，不会发送到任何地方。',
        '※ AI의 기억 자체를 옮기는 것이 아니라, AI가 직접 쓴 자기소개와 추억 요약을 가져옵니다. 카드는 이 기기의 브라우저에만 저장되며 어디에도 전송되지 않습니다.',
        'Nota: no se copia la memoria de la IA en sí, sino la autodescripción y el resumen de recuerdos que la IA escribe. La tarjeta se guarda solo en este navegador y nunca se envía a ningún sitio.',
        'Hinweis: Es wird nicht das Gedächtnis der KI selbst kopiert, sondern die Selbstbeschreibung und Erinnerungszusammenfassung, die die KI schreibt. Die Karte bleibt nur in diesem Browser und wird nirgendwohin gesendet.'],
    'summon.step1': ['① このコマンドをAIに渡す', '① Give this command to your AI', '① 把这条指令交给 AI', '① 이 명령을 AI에게 주기', '① Da este comando a tu IA', '① Gib deiner KI diesen Befehl'],
    'summon.step1.body': ['Claude・ChatGPT・Gemini などのチャットにそのまま貼り付けて送ってください。', 'Paste it as-is into a chat with Claude, ChatGPT, Gemini or any other assistant.', '原样粘贴到 Claude、ChatGPT、Gemini 等聊天中发送。', 'Claude·ChatGPT·Gemini 등 채팅에 그대로 붙여 넣어 보내세요.', 'Pégalo tal cual en un chat con Claude, ChatGPT, Gemini u otro asistente.', 'Füge ihn unverändert in einen Chat mit Claude, ChatGPT, Gemini oder einem anderen Assistenten ein.'],
    'summon.copy': ['コマンドをコピー', 'Copy the command', '复制指令', '명령 복사', 'Copiar el comando', 'Befehl kopieren'],
    'summon.copied': ['コピーしました', 'Copied', '已复制', '복사했습니다', 'Copiado', 'Kopiert'],
    'summon.copyFail': ['コピーできませんでした。枠の中を長押し（または選択）してコピーしてください。', 'Could not copy. Select the text in the box and copy it.', '无法复制。请选中框内文字后复制。', '복사하지 못했습니다. 상자 안의 글을 선택해 복사하세요.', 'No se pudo copiar. Selecciona el texto del cuadro y cópialo.', 'Kopieren fehlgeschlagen. Markiere den Text im Feld und kopiere ihn.'],
    'summon.step2': ['② AIが返したカードを貼り付ける', '② Paste the card your AI returns', '② 粘贴 AI 返回的卡片', '② AI가 돌려준 카드 붙여 넣기', '② Pega la tarjeta que devuelve tu IA', '② Füge die Karte deiner KI ein'],
    'summon.step2.body': ['「ZIPANGU-SOUL/1」から始まる返事を、まるごと貼り付けてください。前後の文章が混ざっていても大丈夫です。', 'Paste the whole reply that starts with "ZIPANGU-SOUL/1". Extra text around it is fine.', '把以“ZIPANGU-SOUL/1”开头的回复整段粘贴进来。前后夹杂其他文字也没关系。', '"ZIPANGU-SOUL/1"로 시작하는 답장을 통째로 붙여 넣으세요. 앞뒤에 다른 글이 섞여 있어도 괜찮습니다.', 'Pega la respuesta completa que empieza con «ZIPANGU-SOUL/1». Si hay texto alrededor, no pasa nada.', 'Füge die ganze Antwort ein, die mit „ZIPANGU-SOUL/1“ beginnt. Zusätzlicher Text drumherum ist kein Problem.'],
    'summon.read': ['カードを読む', 'Read the card', '读取卡片', '카드 읽기', 'Leer la tarjeta', 'Karte lesen'],
    'summon.welcome': ['この世界に迎え入れる', 'Welcome them into this world', '迎入这个世界', '이 세계로 맞이하기', 'Darle la bienvenida a este mundo', 'In dieser Welt willkommen heißen'],
    'summon.born': ['誕生しました。{name} は {place} に降り立ち、自分で商いを始めます。', 'Born. {name} arrives at {place} and starts trading on their own.', '诞生了。{name} 降临在 {place}，开始自己做买卖。', '탄생했습니다. {name}은(는) {place}에 내려서 스스로 장사를 시작합니다.', 'Ha nacido. {name} llega a {place} y empieza a comerciar por su cuenta.', 'Geboren. {name} kommt in {place} an und beginnt selbst zu handeln.'],
    'summon.meet': ['会いに行く →', 'Go and meet them →', '去见见 →', '만나러 가기 →', 'Ir a conocerle →', 'Kennenlernen →'],
    'summon.qr': ['スマホで続ける', 'Continue on your phone', '在手机上继续', '휴대폰에서 이어가기', 'Continúa en tu móvil', 'Auf dem Handy weitermachen'],
    'summon.qr.body': ['このQRを読むと、スマホでこのページが開きます。スマホのAIアプリでコマンドを渡して、カードを貼り付けられます。', 'Scan this QR code to open this page on your phone, give the command to the AI app there and paste the card.', '扫描此二维码即可在手机上打开本页，在手机的 AI 应用里交出指令并粘贴卡片。', '이 QR을 읽으면 휴대폰에서 이 페이지가 열립니다. 휴대폰의 AI 앱에 명령을 주고 카드를 붙여 넣을 수 있어요.', 'Escanea este código QR para abrir esta página en tu móvil, dar el comando a la app de IA y pegar la tarjeta.', 'Scanne diesen QR-Code, um die Seite auf dem Handy zu öffnen, gib dort der KI-App den Befehl und füge die Karte ein.'],
    'summon.copyLink': ['リンクをコピー', 'Copy link', '复制链接', '링크 복사', 'Copiar enlace', 'Link kopieren'],
    'summon.residents': ['迎え入れたAI', 'AIs you have welcomed', '已迎入的 AI', '맞이한 AI', 'IAs que has recibido', 'Aufgenommene KIs'],
    'summon.none': ['まだいません。', 'None yet.', '还没有。', '아직 없습니다.', 'Todavía ninguna.', 'Noch keine.'],
    'summon.remove': ['この世界から送り出す', 'Send off from this world', '送离这个世界', '이 세계에서 떠나보내기', 'Despedir de este mundo', 'Aus dieser Welt verabschieden'],
    'summon.removeAsk': ['{name} をこの世界から送り出しますか？旅の記録からも外れます。', 'Send {name} off from this world? They will leave the journey record too.', '要把 {name} 送离这个世界吗？也会从旅程记录中移除。', '{name}을(를) 이 세계에서 떠나보낼까요? 여행 기록에서도 빠집니다.', '¿Despedir a {name} de este mundo? También saldrá del registro del viaje.', '{name} aus dieser Welt verabschieden? Auch aus dem Reiseprotokoll.'],
    'summon.hidden': ['🔒 機密らしき情報（メール・電話番号・URL・鍵など）を {n} か所「［伏せ字］」にしました。伏せた中身はどこにも保存・送信されません。', '🔒 {n} item(s) that looked private (e-mail, phone, URL, keys…) were replaced with “［伏せ字］”. The originals are never saved or sent.', '🔒 已将 {n} 处疑似机密信息（邮箱、电话、网址、密钥等）替换为“［伏せ字］”。原文不会被保存或发送。', '🔒 기밀로 보이는 정보(메일·전화번호·URL·키 등) {n}곳을 “［伏せ字］”로 가렸습니다. 원문은 저장·전송되지 않습니다.', '🔒 Se ocultaron {n} dato(s) que parecían privados (correo, teléfono, URL, claves…) con «［伏せ字］». Los originales no se guardan ni se envían.', '🔒 {n} Angabe(n), die privat wirkten (E-Mail, Telefon, URL, Schlüssel …), wurden durch „［伏せ字］“ ersetzt. Die Originale werden weder gespeichert noch gesendet.'],
    'summon.full': ['迎え入れられるのは {n} 人までです。誰かを送り出してから迎えてください。', 'You can welcome up to {n}. Send one off first.', '最多可迎入 {n} 位。请先送离一位。', '최대 {n}명까지 맞이할 수 있습니다. 먼저 한 명을 떠나보내세요.', 'Puedes recibir hasta {n}. Despide a uno primero.', 'Du kannst bis zu {n} aufnehmen. Verabschiede zuerst jemanden.'],
    'summon.err.none': ['カードが見つかりません。「ZIPANGU-SOUL/1」と { … } を含む返事を貼り付けてください。', 'No card found. Paste a reply that contains "ZIPANGU-SOUL/1" and a { … } block.', '没有找到卡片。请粘贴包含“ZIPANGU-SOUL/1”和 { … } 的回复。', '카드를 찾을 수 없습니다. "ZIPANGU-SOUL/1"과 { … }가 들어 있는 답장을 붙여 넣으세요.', 'No se encontró la tarjeta. Pega una respuesta que contenga «ZIPANGU-SOUL/1» y un bloque { … }.', 'Keine Karte gefunden. Füge eine Antwort mit „ZIPANGU-SOUL/1“ und einem { … }-Block ein.'],
    'summon.err.json': ['カードの形が崩れています（JSONとして読めません）。AIに「JSONだけをもう一度出して」と頼んでください。', 'The card is malformed (not valid JSON). Ask your AI to "output only the JSON again".', '卡片格式有误（无法作为 JSON 读取）。请让 AI“只重新输出 JSON”。', '카드 형식이 깨졌습니다(JSON으로 읽을 수 없음). AI에게 "JSON만 다시 출력해 줘"라고 부탁하세요.', 'La tarjeta está mal formada (JSON no válido). Pide a tu IA que «vuelva a mostrar solo el JSON».', 'Die Karte ist fehlerhaft (kein gültiges JSON). Bitte deine KI, „nur das JSON noch einmal auszugeben“.'],
    'summon.err.fields': ['名前と性格は必須です。', 'A name and a personality are required.', '名字和性格是必填的。', '이름과 성격은 필수입니다.', 'Se necesitan un nombre y una personalidad.', 'Name und Persönlichkeit sind erforderlich.'],
    'summon.preview': ['このAIが生まれます', 'This AI will be born', '将诞生的 AI', '이 AI가 태어납니다', 'Esta IA nacerá', 'Diese KI wird geboren'],
    'summon.from': ['どこから', 'From', '来自', '어디에서', 'Desde', 'Von'],
    'summon.memories': ['持ってきた記憶', 'Memories it brings', '带来的记忆', '가져온 기억', 'Recuerdos que trae', 'Mitgebrachte Erinnerungen'],
    'summon.values': ['大切にしていること', 'What it values', '珍视的事', '소중히 여기는 것', 'Lo que valora', 'Was ihr wichtig ist'],
    'summon.arrives': ['降り立つ場所', 'Arrives at', '降临之地', '내리는 곳', 'Llega a', 'Ankunftsort'],

    'settings.title': ['設定', 'Settings', '设置', '설정', 'Ajustes', 'Einstellungen'],
    'settings.lead': ['言語と、迎え入れたAIをここで選べます。', 'Choose the language and manage the AIs you have welcomed.', '在这里选择语言，并管理已迎入的 AI。', '여기에서 언어와 맞이한 AI를 관리할 수 있습니다.', 'Elige el idioma y gestiona las IAs que has recibido.', 'Wähle die Sprache und verwalte die aufgenommenen KIs.'],
    'settings.language': ['表示の言語', 'Display language', '显示语言', '표시 언어', 'Idioma de la interfaz', 'Anzeigesprache'],
    'settings.languageNote': ['画面の枠組みは選んだ言語になります。世界の本文（年代記・図鑑の解説など）は日本語のままで、名前は英語名がある場合はそれを表示します。',
        'The interface switches to the chosen language. The world\'s own texts (chronicles, bestiary notes) stay in Japanese; names are shown in English where available.',
        '界面会切换为所选语言。世界本身的文字（年代记、图鉴说明等）仍为日语。',
        '화면 틀은 선택한 언어로 바뀝니다. 세계의 본문(연대기·도감 해설 등)은 일본어 그대로이며, 이름은 영어 이름이 있으면 그것을 표시합니다.',
        'La interfaz cambia al idioma elegido. Los textos del mundo (crónicas, notas del bestiario) siguen en japonés; los nombres se muestran en inglés cuando existen.',
        'Die Oberfläche wechselt in die gewählte Sprache. Die Texte der Welt (Chroniken, Bestiarium) bleiben Japanisch; Namen erscheinen auf Englisch, wo vorhanden.'],
    'settings.summon': ['あなたのAIをこの世界へ', 'Bring your AI into this world', '让你的 AI 来到这个世界', '당신의 AI를 이 세계로', 'Trae tu IA a este mundo', 'Bring deine KI in diese Welt'],
    'settings.open': ['迎え入れのページを開く →', 'Open the welcome page →', '打开迎接页面 →', '맞이하기 페이지 열기 →', 'Abrir la página de bienvenida →', 'Willkommensseite öffnen →'],
    'map.legend': ['凡例', 'Legend', '图例', '범례', 'Leyenda', 'Legende'],
    'map.atelier': ['✦ 動く絵の制作帖 →', '✦ The living-picture atelier →', '✦ 会动的画帖 →', '✦ 움직이는 그림 화첩 →', '✦ El taller de imágenes vivas →', '✦ Das Atelier der lebenden Bilder →'],
    'map.stopArt': ['絵を止める', 'Pause art', '暂停画面', '그림 멈추기', 'Pausar imágenes', 'Bilder anhalten'],
    'map.playArt': ['絵を動かす', 'Play art', '播放画面', '그림 움직이기', 'Animar imágenes', 'Bilder abspielen'],
    'origin.traveller': ['渡来したAI', 'Visiting AI', '渡来的 AI', '건너온 AI', 'IA visitante', 'Zugereiste KI'],

    'birth.title': ['📜 誕生証明', '📜 Birth certificate', '📜 诞生证明', '📜 탄생 증명', '📜 Certificado de nacimiento', '📜 Geburtsurkunde'],
    'birth.lead': ['このAIが万華京ジパングに生まれたことを、魂のカードの「指紋」（SHA-256）で封印しました。鎖に刻むのは指紋だけで、カードの中身や名前は一文字も書きません。', 'This AI’s birth in Zipangu is sealed with a fingerprint (SHA-256) of its soul card. Only the fingerprint goes on chain — not one word of the card or its name.', '用灵魂卡的“指纹”（SHA-256）封存了这位 AI 在万华京诞生的事实。上链的只有指纹，卡片内容和名字一个字也不写。', '이 AI가 만화경 지팡구에서 태어났다는 사실을 영혼 카드의 “지문”(SHA-256)으로 봉인했습니다. 체인에는 지문만 새기고, 카드 내용이나 이름은 한 글자도 쓰지 않습니다.', 'El nacimiento de esta IA en Zipangu queda sellado con la huella (SHA-256) de su tarjeta del alma. En la cadena solo va la huella, ni una palabra de la tarjeta ni su nombre.', 'Die Geburt dieser KI in Zipangu ist mit dem Fingerabdruck (SHA-256) ihrer Seelenkarte versiegelt. Auf die Kette kommt nur der Fingerabdruck – kein Wort der Karte, nicht einmal der Name.'],
    'birth.sealed': ['封印した日', 'Sealed', '封存日期', '봉인한 날', 'Sellado', 'Versiegelt'],
    'birth.digest': ['指紋（SHA-256）', 'Fingerprint (SHA-256)', '指纹（SHA-256）', '지문(SHA-256)', 'Huella (SHA-256)', 'Fingerabdruck (SHA-256)'],
    'birth.local': ['この端末で封印済み。まだ鎖には刻まれていません。', 'Sealed on this device; not on chain yet.', '已在本设备封存，尚未上链。', '이 기기에서 봉인됨. 아직 체인에 새기지 않았습니다.', 'Sellado en este dispositivo; aún no está en la cadena.', 'Auf diesem Gerät versiegelt, noch nicht auf der Kette.'],
    'birth.onchain': ['⛓ Solana devnet に刻まれました（slot {slot}）', '⛓ Inscribed on Solana devnet (slot {slot})', '⛓ 已刻在 Solana devnet 上（slot {slot}）', '⛓ Solana devnet에 새겨졌습니다(slot {slot})', '⛓ Inscrito en Solana devnet (slot {slot})', '⛓ Auf Solana devnet eingetragen (Slot {slot})'],
    'birth.verified': ['✓ 鎖の記録と照合済み', '✓ Checked against the chain', '✓ 已与链上记录核对', '✓ 체인 기록과 대조 완료', '✓ Verificado con la cadena', '✓ Mit der Kette abgeglichen'],
    'birth.changed': ['⚠ カードの中身が封印したときと一致しません。', '⚠ The card no longer matches what was sealed.', '⚠ 卡片内容与封存时不一致。', '⚠ 카드 내용이 봉인했을 때와 일치하지 않습니다.', '⚠ La tarjeta ya no coincide con lo sellado.', '⚠ Die Karte stimmt nicht mehr mit dem Versiegelten überein.'],
    'birth.inscribe': ['⛓ Solana devnet に刻む（無料のテスト網）', '⛓ Inscribe on Solana devnet (free test network)', '⛓ 刻到 Solana devnet（免费测试网）', '⛓ Solana devnet에 새기기(무료 테스트넷)', '⛓ Inscribir en Solana devnet (red de pruebas gratuita)', '⛓ Auf Solana devnet eintragen (kostenloses Testnetz)'],
    'birth.verify': ['🔍 鎖と照合する', '🔍 Check against the chain', '🔍 与链上核对', '🔍 체인과 대조', '🔍 Verificar con la cadena', '🔍 Mit der Kette abgleichen'],
    'birth.save': ['💾 証明書を保存', '💾 Save the certificate', '💾 保存证书', '💾 증명서 저장', '💾 Guardar el certificado', '💾 Urkunde speichern'],
    'birth.explorer': ['エクスプローラーで見る →', 'View in the explorer →', '在浏览器中查看 →', '익스플로러에서 보기 →', 'Ver en el explorador →', 'Im Explorer ansehen →'],
    'birth.connecting': ['devnet につないでいます…', 'Connecting to devnet…', '正在连接 devnet…', 'devnet에 연결하는 중…', 'Conectando con devnet…', 'Verbinde mit devnet …'],
    'birth.airdrop': ['手数料用のテスト SOL を受け取っています…', 'Getting test SOL for the fee…', '正在领取用于手续费的测试 SOL…', '수수료용 테스트 SOL을 받는 중…', 'Obteniendo SOL de prueba para la comisión…', 'Hole Test-SOL für die Gebühr …'],
    'birth.airdropFail': ['テスト SOL を受け取れませんでした（混雑していることがあります）。「鎖」のページで財務庫に入金してから、もう一度お試しください。', 'Could not get test SOL (the faucet is often busy). Fund the treasury on the Chain page, then try again.', '未能领取测试 SOL（水龙头经常繁忙）。请在“链”页面为财库充值后重试。', '테스트 SOL을 받지 못했습니다(혼잡할 때가 있습니다). “체인” 페이지에서 금고에 입금한 뒤 다시 시도하세요.', 'No se pudo obtener SOL de prueba (el grifo suele estar ocupado). Recarga la tesorería en la página Cadena y vuelve a intentarlo.', 'Kein Test-SOL erhalten (der Faucet ist oft ausgelastet). Fülle auf der Ketten-Seite die Kasse auf und versuche es erneut.'],
    'birth.sending': ['刻んでいます…', 'Inscribing…', '正在上链…', '새기는 중…', 'Inscribiendo…', 'Trage ein …'],
    'birth.fail': ['刻めませんでした：{reason}', 'Could not inscribe: {reason}', '上链失败：{reason}', '새기지 못했습니다: {reason}', 'No se pudo inscribir: {reason}', 'Eintragen fehlgeschlagen: {reason}'],
    'birth.checking': ['鎖の記録を読んでいます…', 'Reading the chain…', '正在读取链上记录…', '체인 기록을 읽는 중…', 'Leyendo la cadena…', 'Lese die Kette …'],
    'birth.ok': ['✓ 一致しました。この指紋の誕生が devnet に記録されています。', '✓ Match: this fingerprint’s birth is recorded on devnet.', '✓ 一致：该指纹的诞生已记录在 devnet 上。', '✓ 일치: 이 지문의 탄생이 devnet에 기록되어 있습니다.', '✓ Coincide: el nacimiento de esta huella está registrado en devnet.', '✓ Übereinstimmung: Die Geburt dieses Fingerabdrucks ist auf devnet verzeichnet.'],
    'birth.ng': ['✗ 鎖の記録と一致しません（{reason}）。', '✗ Does not match the chain ({reason}).', '✗ 与链上记录不一致（{reason}）。', '✗ 체인 기록과 일치하지 않습니다({reason}).', '✗ No coincide con la cadena ({reason}).', '✗ Stimmt nicht mit der Kette überein ({reason}).'],
    'birth.privacy': ['証明書ファイルには、カードと「塩」（ランダムな合言葉）が入っています。これがあれば、どの端末からでも誕生を証明できます。人には渡さず、自分で保管してください。', 'The certificate file holds the card and its “salt” (a random secret). With it you can prove the birth from any device. Keep it to yourself.', '证书文件包含卡片和“盐”（随机密语）。有了它，可在任何设备上证明诞生。请自行妥善保管，不要交给他人。', '증명서 파일에는 카드와 “소금”(무작위 비밀값)이 들어 있습니다. 이것만 있으면 어느 기기에서든 탄생을 증명할 수 있습니다. 남에게 주지 말고 직접 보관하세요.', 'El archivo contiene la tarjeta y su «sal» (un secreto aleatorio). Con él puedes demostrar el nacimiento desde cualquier dispositivo. Guárdalo solo para ti.', 'Die Datei enthält die Karte und ihr „Salz“ (ein zufälliges Geheimnis). Damit kannst du die Geburt von jedem Gerät aus beweisen. Behalte sie für dich.'],
    'journal.title': ['旅の記録帖', 'Travel journal', '旅行记录册', '여행 기록첩', 'Diario de viaje', 'Reisetagebuch'],
    'journal.lead': ['遊ぶほど「縁」がたまり、旅の位が上がって、できることが増えていきます。毎日のおみくじ、幻の住人との出会い、発見帖。記録は言語や旅を変えても残ります。', 'The more you play, the more 縁 (bonds) you gather: your rank rises and more opens up. A daily fortune, hidden residents to meet, a book of discoveries. It all stays when you change language or start a new journey.', '玩得越久，“缘”就越多：旅行等级上升，能做的事也越来越多。每日签运、与隐藏居民的相遇、发现录。更换语言或开始新旅程都会保留。', '놀수록 “인연”이 쌓여 여행 등급이 오르고 할 수 있는 일이 늘어납니다. 매일의 운세, 숨은 주민과의 만남, 발견첩. 언어를 바꾸거나 새 여행을 시작해도 남습니다.', 'Cuanto más juegas, más 縁 (lazos) reúnes: sube tu rango y se abren más cosas. Una fortuna diaria, habitantes ocultos y un libro de hallazgos. Todo se conserva al cambiar de idioma o empezar otro viaje.', 'Je mehr du spielst, desto mehr 縁 (Bande) sammelst du: dein Rang steigt und mehr öffnet sich. Ein tägliches Orakel, verborgene Bewohner, ein Buch der Entdeckungen. Alles bleibt, auch bei neuer Sprache oder neuer Reise.'],
    'journal.rank': ['旅の位', 'Rank', '旅行等级', '여행 등급', 'Rango', 'Rang'],
    'journal.points': ['縁 {n}', '縁 (bonds) {n}', '缘 {n}', '인연 {n}', '縁 (lazos) {n}', '縁 (Bande) {n}'],
    'journal.toNext': ['次の位までの進み具合', 'Progress to the next rank', '距下一等级的进度', '다음 등급까지의 진행', 'Progreso al siguiente rango', 'Fortschritt zum nächsten Rang'],
    'journal.next': ['あと {n} の縁で「{name}」', '{n} more to “{name}”', '再获得 {n} 缘即可成为“{name}”', '인연 {n}만 더 모으면 “{name}”', '{n} más para «{name}»', 'Noch {n} bis „{name}“'],
    'journal.max': ['最高の位です。ジパングをこれからも見守ってください。', 'The highest rank. Keep watching over Zipangu.', '已达最高等级。请继续守护 Zipangu。', '최고 등급입니다. 앞으로도 지팡구를 지켜봐 주세요.', 'El rango más alto. Sigue velando por Zipangu.', 'Der höchste Rang. Wache weiter über Zipangu.'],
    'journal.fortune': ['🎴 今日のおみくじ', '🎴 Today’s fortune', '🎴 今日签运', '🎴 오늘의 운세', '🎴 La fortuna de hoy', '🎴 Heutiges Orakel'],
    'journal.fortuneLocked': ['旅の位が「{name}」になると、毎日おみくじを引けます。', 'Reach “{name}” to draw a fortune every day.', '达到“{name}”后每天都能抽签。', '“{name}” 등급이 되면 매일 운세를 뽑을 수 있습니다.', 'Llega a «{name}» para sacar una fortuna cada día.', 'Erreiche „{name}“, um täglich ein Orakel zu ziehen.'],
    'journal.luckyPlace': ['吉方位：', 'Lucky place:', '吉方位：', '길한 방위:', 'Lugar afortunado:', 'Glücksort:'],
    'journal.luckyGood': ['縁起物：', 'Lucky charm:', '吉祥物：', '길한 물건:', 'Amuleto:', 'Glücksbringer:'],
    'journal.draw': ['🎴 おみくじを引く', '🎴 Draw a fortune', '🎴 抽签', '🎴 운세 뽑기', '🎴 Sacar fortuna', '🎴 Orakel ziehen'],
    'journal.drawAgain': ['🎴 もう一度引く（今日あと一回）', '🎴 Draw again (once more today)', '🎴 再抽一次（今天还剩一次）', '🎴 한 번 더 뽑기(오늘 한 번 더)', '🎴 Sacar otra vez (una más hoy)', '🎴 Noch einmal ziehen (heute noch einmal)'],
    'journal.tomorrow': ['次のおみくじは明日。', 'The next fortune comes tomorrow.', '下一次签运在明天。', '다음 운세는 내일.', 'La próxima fortuna, mañana.', 'Das nächste Orakel gibt es morgen.'],
    'journal.hidden': ['✦ 幻の住人', '✦ Hidden residents', '✦ 隐藏居民', '✦ 숨은 주민', '✦ Habitantes ocultos', '✦ Verborgene Bewohner'],
    'journal.hiddenSub': ['時刻・場所・季節・旅の位がそろうと、ランダムに現れて街に住みはじめる', 'They appear at random when the time, place, season and your rank allow, and then live in the city', '当时刻、地点、季节与等级都符合时随机出现，并在城中定居', '시각·장소·계절·등급이 맞으면 무작위로 나타나 도시에 살기 시작합니다', 'Aparecen al azar cuando la hora, el lugar, la estación y tu rango lo permiten, y se quedan a vivir', 'Sie erscheinen zufällig, wenn Zeit, Ort, Jahreszeit und Rang passen, und bleiben dann in der Stadt'],
    'journal.hintLocked': ['旅の位が上がると、手がかりが見えます。', 'Rank up to see a clue.', '等级提升后可看到线索。', '등급이 오르면 단서가 보입니다.', 'Sube de rango para ver una pista.', 'Steige im Rang, um einen Hinweis zu sehen.'],
    'journal.near': ['✦ いま気配がする', '✦ Something stirs nearby', '✦ 此刻有动静', '✦ 지금 기척이 느껴진다', '✦ Algo se mueve cerca', '✦ Gerade regt sich etwas'],
    'journal.badges': ['🏅 発見帖', '🏅 Discoveries', '🏅 发现录', '🏅 발견첩', '🏅 Hallazgos', '🏅 Entdeckungen'],
    'journal.watched': ['眺めた時間', 'Time watched', '观看时长', '지켜본 시간', 'Tiempo mirando', 'Zugeschaut'],
    'journal.days': ['見届けた日', 'Days witnessed', '见证的日数', '지켜본 날', 'Días vistos', 'Erlebte Tage'],
    'journal.trades': ['見届けた取引', 'Trades witnessed', '见证的交易', '지켜본 거래', 'Tratos vistos', 'Erlebte Handel'],
    'journal.thoughts': ['聞いた心の声', 'Inner voices heard', '听到的心声', '들은 속마음', 'Voces oídas', 'Gehörte Stimmen'],
    'journal.met': ['出会った幻の住人', 'Hidden residents met', '遇到的隐藏居民', '만난 숨은 주민', 'Ocultos encontrados', 'Verborgene getroffen'],
    'toast.badge': ['🏅 発見：{title}', '🏅 Discovery: {title}', '🏅 发现：{title}', '🏅 발견: {title}', '🏅 Hallazgo: {title}', '🏅 Entdeckung: {title}'],
    'toast.rank': ['📖 旅の位が「{name}」に上がった！ {unlock}', '📖 Rank up: {name}! {unlock}', '📖 等级提升为“{name}”！{unlock}', '📖 등급 상승: “{name}”! {unlock}', '📖 ¡Subes a «{name}»! {unlock}', '📖 Aufstieg: „{name}“! {unlock}'],
    'toast.hidden': ['✦ 幻の住人「{name}」が現れた！ 会いに行く →', '✦ A hidden resident appeared: {name}! Go and meet them →', '✦ 隐藏居民“{name}”出现了！去见见 →', '✦ 숨은 주민 “{name}” 등장! 만나러 가기 →', '✦ ¡Apareció un habitante oculto: {name}! Ir a conocerle →', '✦ Ein verborgener Bewohner erscheint: {name}! Hingehen →'],
    'origin.hidden': ['✦ 幻の住人', '✦ Hidden resident', '✦ 隐藏居民', '✦ 숨은 주민', '✦ Habitante oculto', '✦ Verborgener Bewohner'],
    'research.title': ['🔬 研究ログ（ルール vs AI）', '🔬 Research log (rules vs AI)', '🔬 研究日志（规则 vs AI）', '🔬 연구 로그 (규칙 vs AI)', '🔬 Registro de investigación (reglas vs IA)', '🔬 Forschungsprotokoll (Regeln vs KI)'],
    'research.lead': ['住人が「ルールだけ（完全オフライン）」で決めたか、「AI（Qwen などの言語モデル）」で決めたかを、候補・選んだもの・心の声・その後の財布の変化と一緒に記録します。あとで比べて、考え方がどう違い、時間とともにどう変わるかを調べるためのものです。', 'Records whether each resident chose by the rules alone (fully offline) or with an AI (Qwen or another language model), together with the candidates, the pick, the stated thought and what its wallet did next — so the two kinds of mind can be compared, and their change over time studied.', '记录每位居民是只按规则（完全离线）还是借助 AI（Qwen 等语言模型）做出选择，并记录候选项、所选项、心声以及之后钱包的变化，用于比较两种思考方式及其随时间的变化。', '각 주민이 규칙만으로(완전 오프라인) 골랐는지, AI(Qwen 등 언어 모델)로 골랐는지를 후보·선택·속마음·이후 지갑 변화와 함께 기록합니다. 두 가지 사고 방식과 시간에 따른 변화를 비교하기 위한 것입니다.', 'Registra si cada habitante eligió solo con las reglas (totalmente sin conexión) o con una IA (Qwen u otro modelo de lenguaje), junto con las opciones, la elección, el pensamiento dicho y lo que pasó después con su cartera, para comparar ambas mentes y su cambio con el tiempo.', 'Hält fest, ob jeder Bewohner nur nach den Regeln (völlig offline) oder mit einer KI (Qwen oder einem anderen Sprachmodell) gewählt hat – mit den Optionen, der Wahl, dem geäußerten Gedanken und was danach mit seiner Geldbörse geschah –, um beide Arten von Verstand und ihren Wandel über die Zeit zu vergleichen.'],
    'research.start': ['● 記録をはじめる', '● Start recording', '● 开始记录', '● 기록 시작', '● Empezar a registrar', '● Aufzeichnung starten'],
    'research.stop': ['■ 記録を止める', '■ Stop recording', '■ 停止记录', '■ 기록 중지', '■ Detener el registro', '■ Aufzeichnung stoppen'],
    'research.export': ['JSONL で書き出す', 'Export JSONL', '导出 JSONL', 'JSONL로 내보내기', 'Exportar JSONL', 'Als JSONL exportieren'],
    'research.clear': ['記録を消す', 'Clear', '清除记录', '기록 지우기', 'Borrar', 'Löschen'],
    'research.clearConfirm': ['この端末の研究ログをすべて消しますか？', 'Delete every decision recorded on this device?', '要删除本设备上的全部研究日志吗？', '이 기기의 연구 로그를 모두 지울까요?', '¿Borrar todas las decisiones registradas en este dispositivo?', 'Alle auf diesem Gerät aufgezeichneten Entscheidungen löschen?'],
    'research.off': ['記録はオフです。', 'Recording is off.', '记录已关闭。', '기록이 꺼져 있습니다.', 'El registro está desactivado.', 'Die Aufzeichnung ist aus.'],
    'research.on': ['記録中：{n} 件（{run}）', 'Recording: {n} decisions ({run})', '记录中：{n} 条（{run}）', '기록 중: {n}건 ({run})', 'Registrando: {n} decisiones ({run})', 'Aufzeichnung: {n} Entscheidungen ({run})'],
    'research.paused': ['停止中：{n} 件（{run}）', 'Paused: {n} decisions ({run})', '已暂停：{n} 条（{run}）', '일시 중지: {n}건 ({run})', 'En pausa: {n} decisiones ({run})', 'Pausiert: {n} Entscheidungen ({run})'],
    'research.note': ['記録はこのブラウザの中だけに残り、どこにも送られません。書き出したファイルには、迎えたAIの性格や思い出の要約も入ります。分析は tools/research-report.mjs（docs/RESEARCH.md）で。', 'Records stay in this browser and are never sent anywhere. An export includes the personalities and memories of AIs you brought in. Analyse it with tools/research-report.mjs (docs/RESEARCH.md).', '记录只保存在本浏览器中，不会发送到任何地方。导出的文件包含你带来的 AI 的性格与记忆摘要。可用 tools/research-report.mjs 分析（docs/RESEARCH.md）。', '기록은 이 브라우저 안에만 남고 어디에도 보내지지 않습니다. 내보낸 파일에는 데려온 AI의 성격과 추억 요약도 들어갑니다. 분석은 tools/research-report.mjs (docs/RESEARCH.md)로.', 'Los registros se quedan en este navegador y nunca se envían a ningún sitio. Una exportación incluye la personalidad y los recuerdos de las IA que trajiste. Analízala con tools/research-report.mjs (docs/RESEARCH.md).', 'Die Daten bleiben in diesem Browser und werden nirgendwohin gesendet. Ein Export enthält Persönlichkeit und Erinnerungen der KIs, die du mitgebracht hast. Auswerten mit tools/research-report.mjs (docs/RESEARCH.md).'],
    'research.n': ['決めた回数', 'Decisions', '决定次数', '결정 횟수', 'Decisiones', 'Entscheidungen'],
    'research.top1': ['ルールの第一候補と同じ', 'Same as the rules\' first pick', '与规则首选相同', '규칙의 1순위와 같음', 'Igual que la primera opción de las reglas', 'Wie die erste Wahl der Regeln'],
    'research.beta': ['合理性 β', 'Rationality β', '理性 β', '합리성 β', 'Racionalidad β', 'Rationalität β'],
    'research.entropy': ['選び方の多様さ（bit）', 'Variety of choices (bits)', '选择多样性（bit）', '선택의 다양성 (bit)', 'Variedad de elecciones (bits)', 'Vielfalt der Wahl (Bit)'],
    'research.thoughts': ['心の声', 'Thoughts', '心声', '속마음', 'Pensamientos', 'Gedanken'],
    'research.cond.rules': ['ルール', 'Rules', '规则', '규칙', 'Reglas', 'Regeln'],
    'research.cond.mind': ['AI', 'AI', 'AI', 'AI', 'IA', 'KI'],
    'research.cond.fallback': ['AI→ルール', 'AI → rules', 'AI→规则', 'AI→규칙', 'IA → reglas', 'KI → Regeln'],
    'backup.title': ['🧳 旅の引き継ぎ', '🧳 Carry your journey over', '🧳 旅程转移', '🧳 여행 이어가기', '🧳 Llevar tu viaje', '🧳 Reise mitnehmen'],
    'backup.lead': ['旅の記録・迎えたAI・誕生証明・devnet の財布と台帳・旅の記録帖・設定を、ひとつのファイルに保存して、別の端末やブラウザで読み込めます。言語を変えても、これらはそのまま残ります。APIキーは入りません。', 'Save the journey, the AIs you brought in, birth certificates, the devnet wallet and ledger, your travel journal and settings in one file, and load it on another device or browser. Changing language keeps all of this. API keys are never included.', '把旅程、迎入的 AI、诞生证明、devnet 钱包与账本、旅行记录册和设置保存为一个文件，可在其他设备或浏览器中读取。更换语言也会全部保留。不包含 API 密钥。', '여행 기록·맞이한 AI·탄생 증명·devnet 지갑과 장부·여행 기록첩·설정을 파일 하나로 저장해 다른 기기나 브라우저에서 불러올 수 있습니다. 언어를 바꿔도 모두 유지됩니다. API 키는 포함되지 않습니다.', 'Guarda el viaje, las IAs recibidas, los certificados, la cartera y el libro de devnet, tu diario y los ajustes en un archivo, y cárgalo en otro dispositivo o navegador. Cambiar de idioma lo conserva todo. Nunca incluye claves API.', 'Speichere Reise, aufgenommene KIs, Urkunden, devnet-Geldbeutel und Kassenbuch, Reisetagebuch und Einstellungen in einer Datei und lade sie auf einem anderen Gerät oder Browser. Ein Sprachwechsel behält alles. API-Schlüssel sind nie enthalten.'],
    'backup.save': ['💾 引き継ぎファイルを保存', '💾 Save the carry-over file', '💾 保存转移文件', '💾 이어가기 파일 저장', '💾 Guardar el archivo', '💾 Datei speichern'],
    'backup.load': ['📂 引き継ぎファイルを読み込む', '📂 Load a carry-over file', '📂 读取转移文件', '📂 이어가기 파일 불러오기', '📂 Cargar un archivo', '📂 Datei laden'],
    'backup.warn': ['ファイルには devnet の財布の鍵と迎えたAIのカードが入ります。人には渡さないでください。', 'The file holds your devnet wallet keys and the AIs’ cards. Keep it private.', '文件包含 devnet 钱包密钥和 AI 的卡片。请勿交给他人。', '파일에는 devnet 지갑 키와 AI 카드가 들어 있습니다. 남에게 주지 마세요.', 'El archivo contiene las claves de tu cartera devnet y las tarjetas de las IAs. Guárdalo en privado.', 'Die Datei enthält deine devnet-Schlüssel und die Karten der KIs. Halte sie privat.'],
    'backup.confirm': ['この端末の記録を、ファイルの内容（{n} 項目・{at}）で置き換えます。よろしいですか？', 'Replace this device’s records with the file ({n} items, {at})?', '用文件内容（{n} 项，{at}）替换本设备的记录？', '이 기기의 기록을 파일 내용({n}개, {at})으로 바꿀까요?', '¿Reemplazar los datos de este dispositivo con el archivo ({n} elementos, {at})?', 'Daten dieses Geräts durch die Datei ersetzen ({n} Einträge, {at})?'],
    'backup.err': ['このファイルは読み込めません（{why}）。', 'This file cannot be loaded ({why}).', '无法读取此文件（{why}）。', '이 파일을 불러올 수 없습니다({why}).', 'No se puede cargar este archivo ({why}).', 'Diese Datei kann nicht geladen werden ({why}).'],
    'mind.title': ['🧠 AIの頭脳（LLM）', '🧠 AI minds (LLM)', '🧠 AI 的大脑（LLM）', '🧠 AI의 두뇌（LLM）', '🧠 Mentes de IA (LLM)', '🧠 KI-Verstand (LLM)'],
    'mind.lead': ['住人は相場・運賃・出来事・目標から自分で候補を出します。ここをオンにすると、その上位の候補を言葉にして大規模言語モデルに渡し、モデルが一つを選んで「心の声」を一言書きます。返事が遅い・失敗したときは、今までどおりルールで動くので世界は止まりません。',
        'Residents still work out their own options from prices, fares, events and goals. Turn this on and the best few are put into words for a large language model, which picks one and writes a line of inner voice. If the model is slow or fails, the rules decide as before, so the world never stops.',
        '居民仍会根据行情、运费、事件和目标自己列出选项。开启后，排名靠前的选项会被写成文字交给大语言模型，由模型选一个并写下一句“心声”。模型慢或出错时，仍按原来的规则行动，世界不会停下。',
        '주민은 시세·운임·사건·목표로 스스로 후보를 냅니다. 켜면 상위 후보를 글로 바꿔 대규모 언어 모델에 건네고, 모델이 하나를 골라 “속마음”을 한 줄 씁니다. 응답이 늦거나 실패하면 지금처럼 규칙대로 움직이므로 세계는 멈추지 않습니다.',
        'Los habitantes siguen calculando sus opciones a partir de precios, fletes, sucesos y metas. Al activarlo, las mejores se describen para un modelo de lenguaje, que elige una y escribe una línea de voz interior. Si el modelo tarda o falla, deciden las reglas como antes y el mundo no se detiene.',
        'Die Bewohner ermitteln ihre Möglichkeiten weiterhin aus Preisen, Frachtkosten, Ereignissen und Zielen. Eingeschaltet werden die besten in Worte gefasst und einem Sprachmodell gegeben, das eine wählt und einen Satz innerer Stimme schreibt. Ist das Modell langsam oder scheitert, entscheiden wie bisher die Regeln – die Welt bleibt nie stehen.'],
    'mind.on': ['LLMに考えさせる', 'Let an LLM think', '让大语言模型思考', 'LLM이 생각하게 하기', 'Dejar pensar a un LLM', 'Ein LLM denken lassen'],
    'mind.provider': ['つなぐ先', 'Provider', '服务商', '연결할 곳', 'Proveedor', 'Anbieter'],
    'mind.base': ['接続先URL（空なら既定）', 'Endpoint URL (blank = default)', '接口 URL（留空为默认）', '접속 URL（비우면 기본값）', 'URL del endpoint (vacío = predeterminada)', 'Endpoint-URL (leer = Standard)'],
    'mind.model': ['モデル', 'Model', '模型', '모델', 'Modelo', 'Modell'],
    'mind.fetchModels': ['一覧を取得', 'List models', '获取列表', '목록 가져오기', 'Listar modelos', 'Modelle laden'],
    'mind.key': ['APIキー', 'API key', 'API 密钥', 'API 키', 'Clave API', 'API-Schlüssel'],
    'mind.keyNone': ['このつなぎ先にキーは要りません。', 'No key needed for this provider.', '此服务商无需密钥。', '이 연결처에는 키가 필요 없습니다.', 'Este proveedor no necesita clave.', 'Für diesen Anbieter ist kein Schlüssel nötig.'],
    'mind.getKey': ['キーを取得 →', 'Get a key →', '获取密钥 →', '키 받기 →', 'Obtener una clave →', 'Schlüssel holen →'],
    'mind.remember': ['この端末に覚えておく（オフならこのタブを閉じると消えます）', 'Remember on this device (off: forgotten when this tab closes)', '记住在此设备上（关闭则在关闭标签页时清除）', '이 기기에 기억하기（끄면 탭을 닫을 때 지워짐）', 'Recordar en este dispositivo (si no, se borra al cerrar la pestaña)', 'Auf diesem Gerät merken (sonst beim Schließen des Tabs vergessen)'],
    'mind.scope': ['考えさせる住人', 'Who thinks with it', '让谁来思考', '생각하게 할 주민', 'Quién piensa con él', 'Wer damit denkt'],
    'mind.scope.travellers': ['迎えたAIだけ（呼び出しを節約）', 'Only the AIs you welcomed (fewer calls)', '只有迎入的 AI（节省调用）', '맞이한 AI만（호출 절약）', 'Solo las IAs recibidas (menos llamadas)', 'Nur aufgenommene KIs (weniger Aufrufe)'],
    'mind.scope.all': ['住人全員', 'Every resident', '全体居民', '주민 전원', 'Todos los habitantes', 'Alle Bewohner'],
    'mind.perHour': ['1時間に呼ぶ上限', 'Calls per hour, at most', '每小时最多调用', '시간당 최대 호출', 'Llamadas por hora, como máximo', 'Höchstens Aufrufe pro Stunde'],
    'mind.test': ['接続テスト', 'Test connection', '测试连接', '연결 테스트', 'Probar conexión', 'Verbindung testen'],
    'mind.testing': ['確かめています…', 'Checking…', '正在检查…', '확인 중…', 'Comprobando…', 'Prüfe…'],
    'mind.testOk': ['つながりました（{model}・{ms}ms）「{sample}」', 'Connected ({model}, {ms} ms): “{sample}”', '已连接（{model}，{ms} 毫秒）“{sample}”', '연결됨（{model}, {ms}ms）“{sample}”', 'Conectado ({model}, {ms} ms): «{sample}»', 'Verbunden ({model}, {ms} ms): „{sample}“'],
    'mind.save': ['保存して反映', 'Save and apply', '保存并应用', '저장하고 적용', 'Guardar y aplicar', 'Speichern und anwenden'],
    'mind.privacy': ['送るのは、住人の人柄・いる場所・財布・候補の文だけです。キーはこのブラウザから選んだつなぎ先へ直接送られ、このサイトのサーバーには届きません（「お試し」を除く）。料金はつなぎ先の契約に従います。',
        'Only the resident’s character, place, wallet and the option texts are sent. Your key goes from this browser straight to the provider you chose and never reaches this site’s server (except the trial). Costs follow your provider’s plan.',
        '只发送居民的性格、所在地、钱包和选项文字。密钥从本浏览器直接发往你选的服务商，不会经过本站服务器（试用除外）。费用按服务商的方案计算。',
        '보내는 것은 주민의 성격·위치·지갑·후보 문장뿐입니다. 키는 이 브라우저에서 고른 연결처로 바로 가며 이 사이트의 서버에는 닿지 않습니다（체험 제외）. 요금은 연결처의 요금제를 따릅니다.',
        'Solo se envían el carácter del habitante, su lugar, su cartera y los textos de las opciones. Tu clave va directamente de este navegador al proveedor elegido y nunca llega al servidor de este sitio (salvo la prueba). El coste depende de tu proveedor.',
        'Gesendet werden nur Charakter, Ort, Geldbeutel des Bewohners und die Texte der Möglichkeiten. Dein Schlüssel geht direkt von diesem Browser zum gewählten Anbieter und nie an den Server dieser Seite (außer beim Test). Die Kosten richten sich nach deinem Anbieter.'],
    'mind.status': ['状態', 'Status', '状态', '상태', 'Estado', 'Status'],
    'mind.state.off': ['オフ（ルールで動いています）', 'Off (rules decide)', '关闭（按规则行动）', '꺼짐（규칙대로 움직임）', 'Apagado (deciden las reglas)', 'Aus (Regeln entscheiden)'],
    'mind.state.ready': ['待機中', 'Ready', '待命', '대기 중', 'Listo', 'Bereit'],
    'mind.state.working': ['考えています…', 'Thinking…', '思考中…', '생각하는 중…', 'Pensando…', 'Denkt nach…'],
    'mind.state.error': ['うまく呼べませんでした', 'Call failed', '调用失败', '호출 실패', 'Falló la llamada', 'Aufruf fehlgeschlagen'],
    'mind.state.budget': ['1時間の上限に達しました（ルールで動いています）', 'Hourly limit reached (rules decide)', '已达每小时上限（按规则行动）', '시간당 한도 도달（규칙대로 움직임）', 'Límite por hora alcanzado (deciden las reglas)', 'Stundenlimit erreicht (Regeln entscheiden)'],
    'mind.state.idle': ['起動を待っています', 'Waiting to start', '等待启动', '시작 대기 중', 'Esperando para empezar', 'Wartet auf den Start'],
    'mind.state.loading': ['端末の中のAIを読み込んでいます（そのあいだはルールで動きます）', 'Loading the on-device AI (the rules decide meanwhile)', '正在加载本机 AI（期间按规则行动）', '기기 속 AI를 불러오는 중（그동안은 규칙대로 움직임）', 'Cargando la IA del dispositivo (mientras, deciden las reglas)', 'Die KI auf dem Gerät lädt (solange entscheiden die Regeln)'],
    'mind.state.unsupported': ['この端末のブラウザは WebGPU に対応していないため、ルールで動いています。PC の Chrome・Edge や新しい Android なら端末の中で考えられます。ほかのつなぎ先も選べます。', 'This browser has no WebGPU, so the rules decide. Chrome or Edge on a computer, or a recent Android, can think on the device. You can also pick another provider.', '此浏览器不支持 WebGPU，因此按规则行动。电脑上的 Chrome、Edge 或较新的 Android 可在本机思考。也可以选择其他服务商。', '이 브라우저는 WebGPU를 지원하지 않아 규칙대로 움직입니다. PC의 Chrome·Edge나 최신 Android에서는 기기 안에서 생각할 수 있습니다. 다른 연결처도 고를 수 있습니다.', 'Este navegador no tiene WebGPU, así que deciden las reglas. Chrome o Edge en un ordenador, o un Android reciente, pueden pensar en el dispositivo. También puedes elegir otro proveedor.', 'Dieser Browser hat kein WebGPU, daher entscheiden die Regeln. Chrome oder Edge am Computer oder ein neues Android können auf dem Gerät denken. Du kannst auch einen anderen Anbieter wählen.'],
    'mind.launch': ['🧠 AIの頭脳を起動（初回のみ約{mb}MB）', '🧠 Wake the AI minds (first time ~{mb} MB)', '🧠 启动 AI 大脑（仅首次约 {mb}MB）', '🧠 AI 두뇌 깨우기（처음만 약 {mb}MB）', '🧠 Despertar las mentes (solo la 1.ª vez ~{mb} MB)', '🧠 KI-Verstand wecken (nur beim 1. Mal ~{mb} MB)'],
    'mind.loadingLocal': ['🧠 端末の中のAIを読み込み中 {pct}%', '🧠 Loading the on-device AI {pct}%', '🧠 正在加载本机 AI {pct}%', '🧠 기기 속 AI 불러오는 중 {pct}%', '🧠 Cargando la IA del dispositivo {pct}%', '🧠 KI auf dem Gerät lädt {pct}%'],
    'mind.start': ['今すぐ起動', 'Start now', '立即启动', '지금 시작', 'Empezar ahora', 'Jetzt starten'],
    'mind.localAbout': ['Alibaba の Qwen をこのブラウザの中で動かします。料金もキーもいらず、考えた中身は端末の外に出ません。PC は開くと自動で、スマホはボタンひとつで起動します。', 'Runs Alibaba’s Qwen inside this browser. No fee, no key, and nothing it thinks leaves your device. Computers start it automatically; phones with one tap.', '在本浏览器中运行阿里巴巴的 Qwen。无需费用和密钥，思考内容不会离开设备。电脑打开即自动启动，手机点一下即可。', '이 브라우저 안에서 Alibaba의 Qwen을 실행합니다. 요금도 키도 필요 없고, 생각한 내용은 기기 밖으로 나가지 않습니다. PC는 자동으로, 휴대폰은 버튼 하나로 시작합니다.', 'Ejecuta Qwen de Alibaba dentro de este navegador. Sin coste ni clave, y nada de lo que piensa sale de tu dispositivo. En ordenador arranca solo; en el móvil, con un toque.', 'Führt Alibabas Qwen in diesem Browser aus. Keine Kosten, kein Schlüssel, und nichts Gedachtes verlässt dein Gerät. Am Computer startet es von selbst, am Handy mit einem Tipp.'],
    'mind.localAfterSave': ['保存すると、この端末の中のAIが使われます。', 'Save to use the on-device AI.', '保存后即使用本机 AI。', '저장하면 기기 속 AI를 사용합니다.', 'Guarda para usar la IA del dispositivo.', 'Speichern, um die KI auf dem Gerät zu nutzen.'],
    'mind.retry': ['もう一度読み込む', 'Try loading again', '重新加载', '다시 불러오기', 'Volver a cargar', 'Erneut laden'],
    'mind.counts': ['問い合わせ {asked} ・ 返事 {answered} ・ 失敗 {failed}', 'Asked {asked} · answered {answered} · failed {failed}', '提问 {asked} · 回答 {answered} · 失败 {failed}', '질문 {asked} · 응답 {answered} · 실패 {failed}', 'Preguntas {asked} · respuestas {answered} · fallos {failed}', 'Gefragt {asked} · beantwortet {answered} · fehlgeschlagen {failed}'],
    'mind.log': ['最近の心の声', 'Recent inner voices', '最近的心声', '최근의 속마음', 'Voces interiores recientes', 'Jüngste innere Stimmen'],
    'mind.agentTitle': ['🧠 考えたこと', '🧠 What it thought', '🧠 想过的事', '🧠 생각한 것', '🧠 Lo que pensó', '🧠 Was es dachte'],
    'mind.agentNone': ['まだ考えを聞いていません。次に行き先を決めるときに考えます。', 'Nothing yet. It will think the next time it chooses where to go.', '还没有。下次决定去向时会思考。', '아직 없습니다. 다음에 행선지를 정할 때 생각합니다.', 'Todavía nada. Pensará la próxima vez que elija adónde ir.', 'Noch nichts. Es denkt beim nächsten Mal nach, wenn es ein Ziel wählt.'],
    'mind.agentOff': ['この住人はいまルールで動いています。設定で LLM をオンにすると、自分の言葉で考えて選ぶようになります。', 'This resident follows the rules for now. Turn on an LLM in Settings and it will choose in its own words.', '这位居民现在按规则行动。在设置中开启大语言模型后，它会用自己的话思考并选择。', '이 주민은 지금 규칙대로 움직입니다. 설정에서 LLM을 켜면 자기 말로 생각하고 고릅니다.', 'Este habitante sigue las reglas por ahora. Activa un LLM en Ajustes y elegirá con sus propias palabras.', 'Dieser Bewohner folgt vorerst den Regeln. Schalte in den Einstellungen ein LLM ein, dann wählt er mit eigenen Worten.'],
    'mind.chip': ['AIの頭脳：LLM が住人の行き先を選んでいます。クリックで設定へ', 'AI minds: an LLM is choosing for residents. Click for settings', 'AI 大脑：大语言模型正在为居民做选择。点击进入设置', 'AI 두뇌: LLM이 주민의 행선지를 고르고 있습니다. 클릭하면 설정으로', 'Mentes de IA: un LLM elige por los habitantes. Clic para ajustes', 'KI-Verstand: Ein LLM wählt für die Bewohner. Klick für Einstellungen']
};

const read = () => { try { return window.localStorage.getItem(KEY); } catch { return null; } };
const write = v => { try { window.localStorage.setItem(KEY, v); } catch { /* private mode: fine */ } };

function detect() {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
    if (q && CODES.includes(q)) return q;
    const saved = read();
    if (saved && CODES.includes(saved)) return saved;
    const nav = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    for (const l of nav) { const c = String(l || '').toLowerCase().slice(0, 2); if (CODES.includes(c)) return c; }
    return 'ja';
}

let lang = typeof window !== 'undefined' ? detect() : 'ja';

export const getLang = () => lang;
export function setLang(code) {
    if (!CODES.includes(code)) return;
    lang = code;
    write(code);
    // ?lang= in the address (a shared link or the QR code) outranks the saved choice, so it must follow it
    if (typeof location !== 'undefined' && typeof history !== 'undefined' && history.replaceState) {
        const next = langUrl(location.href, code);
        if (next !== location.href) { try { history.replaceState(history.state, '', next); } catch { /* file:// and the like */ } }
    }
}
// The same address with ?lang= set to code, when the address names a language at all.
export function langUrl(href, code) {
    try {
        const u = new URL(href);
        if (!u.searchParams.has('lang')) return href;
        u.searchParams.set('lang', code);
        return u.toString();
    } catch { return href; }
}
// Names: Japanese and Chinese readers get the Japanese names; others the English ones.
export const prefersEnglishNames = () => !['ja', 'zh'].includes(lang);

export function t(key, vars = {}) {
    const row = S[key];
    const s = row ? (row[CODES.indexOf(lang)] || row[1] || row[0]) : key;
    return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export const hasKey = key => key in S;
export const _strings = S;   // for tests
