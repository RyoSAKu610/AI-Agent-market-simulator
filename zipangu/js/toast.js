// Small notices at the top of the screen: a badge found, a rank reached, a hidden resident met.

import { h } from './util.js';

let box = null;
export function toast(text, { href = null, kind = '', ms = 5200 } = {}) {
    if (typeof document === 'undefined') return null;
    if (!box || !box.isConnected) {
        box = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
        document.body.append(box);
    }
    const el = h(href ? 'a' : 'div', { class: 'toast' + (kind ? ' toast-' + kind : ''), href }, text);
    box.append(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('is-out'), ms);
    setTimeout(() => el.remove(), ms + 700);
    return el;
}
