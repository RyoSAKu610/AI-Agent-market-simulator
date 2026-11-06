# 🪞 Desk mode / 机モード

Desk mode (`neon-mythos-desk.js`) puts your buddy on your desk.

- **Open it from the hub:** 🤖 相棒 → 「机に呼ぶ」.
- **Open it by URL:** `?desk=1`.
- **Open it from the home screen:** use the 「机に呼ぶ」 shortcut of the installed PWA.

The aim is not true 3D. The aim is the feeling that she is really there. That feeling comes from combining small things:

| What makes her feel present | How |
| --- | --- |
| She is *on* the desk | **Placed mode**: stand the phone up, and the screen becomes a small lit room with a desk-top floor, her contact shadow and a reflection. **Hologram mode** (Pepper's ghost): lay the phone flat under a clear plate at 45°. Only she is lit, so her reflection seems to stand on the desk. |
| The space goes on past the screen | She walks in and out at the edges, peeks in from the side, and knocks on the glass from inside. The phone vibrates on Android; iPhone browsers cannot vibrate. |
| She lives in your time | Greetings follow the real time of day, the window shows the real sky (morning, day, evening, night), and she dozes off late at night. |
| She acts on her own | She wanders, looks around and stretches between talks, and wakes up when tapped. |
| She is really gone sometimes | Ask her for an errand and she runs off screen while the city's long-term task runs, leaving a 「おつかい中」 (on an errand) note. She comes back at the milestone with a report. With 🔔 on, a notification tells you when she returns. |
| The phone is a physical thing | Tilt it and she stumbles, shake it and she gets dizzy. iPhone asks for permission once. |
| She talks | She speaks with the browser's built-in voice and listens with its speech recognition. Where there is none, a text box appears instead. |

No camera, no account, no API key. Everything runs in the browser. Desk mode talks to the game only through `nm:*` events:

- it sends `nm:errand-request` (and `nm:ltt-command` if no errand layer answers);
- it listens for `nm:route-agent`, `nm:agent-routed` and `nm:ltt-event`.

## Pepper's ghost: making the plate / ペッパーズゴーストの作り方

1. Lay the phone **screen up, with its top edge pointing away from you**. Turn the brightness up and dim the room.
2. Stand a clear plate above it at **45°**: an acrylic sheet, a CD case lid, or a clear file held up with card. Put its lower edge at the far end of the phone, so the plate leans back toward you over the screen.
3. Look at the plate from the front. She appears standing behind it, at its far edge.
4. If she looks upside down or mirrored, use ⇅ (flip top to bottom) and ⇆ (flip left to right) in the top bar.

> 日本語：スマホは**画面を上、上の辺を奥**にして置き、透明な板を**45°**で、下の辺を奥・上の辺を手前に倒れかかるように立てます。逆さま・鏡文字なら上のバーの ⇅ ⇆ で直します。

## Today's art and what comes next

Desk mode currently uses the buddy's existing pet sprite sheet: `character-pets/<id>/spritesheet.webp`, 192×208 cells.

| Row | Animation |
| --- | --- |
| 0 | idle |
| 1 | runningRight |
| 2 | runningLeft |
| 3 | waving |
| 4 | jumping |
| 5 | failed |
| 6 | waiting |
| 7 | running |
| 8 | review |

That is enough to try the presence ideas on a real desk.

The next step is new art made with **Gemini (images)** and **Google Flow / Veo (video)** within a Google AI Pro plan. It works in two layers:

- **Reaction layer**, always on screen: images from Gemini for blinking, mouth shapes and expressions. These must react live, so they cannot be video.
- **Action layer**, played now and then: short clips from Veo for appearing, waving, knocking, peeking and so on. **Every clip starts and ends on the same base pose**, so it cuts back to the reaction layer without a seam.

The code that plays green-screen clips and stacks image parts is not written yet. It comes after the first base image and clip exist, so it can be tested on real output.

### Where to put the files / 受け渡し場所

Keep every draft in one shared folder on your side (Google Drive is fine). Only the adopted files go into the repository, here:

```
character-assets/desk/<buddy-id>/
  manifest.json          # each file: kind, the prompt used, the reference image, status (draft / ok), length
  base.png               # the base pose: the first and last frame of every clip
  base-black.png         # the same on pure black, for the hologram
  parts/eyes-open.png  eyes-half.png  eyes-closed.png
  parts/mouth-closed.png  mouth-a.png  mouth-i.png  mouth-u.png  mouth-e.png  mouth-o.png
  parts/expr-smile.png  expr-surprised.png  expr-thinking.png  expr-troubled.png  expr-sleepy.png  expr-shy.png
  clips/appear.mp4  walk-in.mp4  peek.mp4  knock.mp4  wave.mp4  ...
```

### Order of work / 制作の順番

0. **The character sheet (Gemini).** Front, 3/4, side and back views of one original character. This is the reference for everything after it, so spend the most time here. Do not imitate an existing well-known character.
1. **`base.png` (Gemini).** Front view, full body, relaxed standing pose, on solid pure green `#00FF00`, flat lighting, no cast shadow. Then make `base-black.png`, the same image on pure black.
2. **Parts (Gemini).** Same framing and size as `base.png`, changing only the eyes, the mouth or the expression.
3. **Clips (Flow / Veo).** In the priority order below. Pro plan credits are limited, so make one clip at a time and re-roll only the ones that matter. Clips that differ only in direction are made once and mirrored in code (walk-in/walk-out, left/right).

### Veo clips, in priority order / Veo で作る動画（優先順）

| Priority | Clip | What happens | Notes |
| --- | --- | --- | --- |
| ★★★ | `appear` | She forms out of light particles on the desk and lands | end frame = base |
| ★★★ | `walk-in` | She walks in from the left edge to the center | end frame = base; mirrored for the right side and for walking out |
| ★★★ | `peek` | Only her head and shoulders lean in from the edge, she looks around, then she pulls back | |
| ★★★ | `knock` | She steps up to the "glass" (camera), knocks twice with her knuckles and smiles | start and end = base |
| ★★★ | `wave` | She waves twice and returns to the pose | start and end = base |
| ★★ | `disappear` | She turns into light and fades out | start = base |
| ★★ | `sit-edge` | She sits down at the front edge and swings her legs | a loop |
| ★★ | `stumble` | She loses her balance to one side and recovers | mirrored for the other side |
| ★★ | `dizzy` | Her eyes spin, she sways, then shakes it off | |
| ★ | `sleep`, `stretch`, `think`, `happy` | Dozing, stretching, hand on chin, a happy bounce | |

**Settings for every clip:**
- First and last frame: `base.png` (only one of them for appear and disappear).
- Reference image: the character sheet.
- Locked camera, full body always in frame, solid green background, no floor shadow.
- 720p is enough for phones. Her voice comes from desk mode, so ignore the clip's own audio.

**Prompt example:**

```
Static locked-off shot, the camera does not move. The character from the reference image
stands on a solid pure green (#00FF00) background, full body always in frame, no shadow.
She steps toward the camera, knocks on the glass twice with her knuckles, smiles,
then steps back to the exact starting pose. Start frame and end frame: the provided base image.
```

**Gemini image prompt example (parts):**

```
Use the attached base image as the exact reference: same character, same framing, same size,
same position, solid pure green (#00FF00) background, flat even lighting, no shadow.
Change only the mouth: open as when saying "a".
```
