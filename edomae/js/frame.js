// 江戸前 Edomae — how the scene is framed in the card. Pure: no DOM, no imports.
//
// cw, ch: the card's size in CSS px; hudPx: the height of the reserved band at the
// top of the card where the koku and place name sit. Returns the scene units per px
// (ppu), the viewBox size (VW × VH), the street line GY (the top of the globe), and
// skyTop: the highest the sun, moon and night train may go (below the HUD band).
//
// Landscape: a wide street with the sky above, as a strip. Portrait (a phone): the
// camera comes close — people about 100 px tall at 390 wide — the street sits low with a
// modest band of earth under it, and roofs and the sky (sun, moon, kites, the train) above.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const TALLEST = 178;          // a two-storey Edo front with its roof and yagura, in scene units

export function frameFor(cw, ch, { hudPx = 64 } = {}) {
    cw = Math.max(200, cw); ch = Math.max(160, ch);
    const portrait = ch > cw * 1.05;
    let ppu;
    if (portrait) ppu = clamp(cw / 180, 1.6, 2.4);         // a phone: close in, people about 100 px tall
    else ppu = cw < 560 ? clamp(cw / 276, 1.1, 1.5) : clamp(cw / 600, 1.1, 2.1);
    // a short landscape card (a phone on its side) must still hold the tallest front under the HUD
    const minVH = TALLEST + hudPx / ppu + 56;
    if (!portrait && ch / ppu < minVH) ppu = Math.max(0.8, ch / minVH);
    const VW = cw / ppu, VH = ch / ppu;
    const skyTop = hudPx / ppu + 10;
    let GY;
    // portrait: the street low, a modest band of earth under it, roofs and sky above
    if (portrait) GY = clamp(VH - Math.max(44, VH * 0.13), skyTop + TALLEST * 0.92, VH - 40);
    else GY = VH - clamp(VH * 0.17, 48, 150);
    return { portrait, ppu, VW, VH, GY, skyTop };
}
