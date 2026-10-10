// Observed simulation prices, never synthetic candles or volume.
import { h, fmtPrice, clamp } from './util.js';

export function priceChart({ currency = '刻' } = {}) {
    const canvas = h('canvas', { class: 'price-chart', tabindex: '0', role: 'img', 'aria-label': '観測価格のチャート。左右矢印で価格と時刻を読む。Homeは最初、Endは最新。マウスやタップでも選択。' });
    const readout = h('output', { class: 'chart-readout', 'aria-live': 'polite' });
    const el = h('div', { class: 'price-chart-wrap' }, readout, canvas, h('p', { class: 'chart-help' }, '線＝観測価格　破線＝基準価格　左右キー／タップで読む'));
    let points = [], base = 0, selected = null, width = 640;
    let height = 240;
    const margins = { left: 14, right: 66, top: 20, bottom: 42 };
    function paint() {
        const ratio = Math.min(2, devicePixelRatio || 1);
        width = Math.max(240, el.clientWidth || 640); height = canvas.clientHeight || 240;
        canvas.width = Math.round(width * ratio); canvas.height = height * ratio;
        const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio); ctx.fillStyle = '#101638'; ctx.fillRect(0, 0, width, height);
        const left = margins.left, right = width - margins.right, top = margins.top, bottom = height - margins.bottom;
        if (!points.length) { readout.textContent = 'まだ観測がありません'; return; }
        const prices = points.map(p => p.price), low = Math.min(...prices, base), high = Math.max(...prices, base), pad = Math.max((high - low) * .15, high * .015, .01);
        const min = low - pad, max = high + pad;
        const x = i => left + (right - left) * (points.length === 1 ? .5 : (points[i].time - points[0].time) / (points.at(-1).time - points[0].time || 1));
        const y = price => bottom - (price - min) / (max - min) * (bottom - top);
        ctx.font = '11px system-ui'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 5; i++) {
            const value = min + (max - min) * i / 4, yy = y(value);
            ctx.strokeStyle = '#b6c3e51d'; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
            ctx.fillStyle = '#bec9df'; ctx.fillText(fmtPrice(value), right + 7, yy);
        }
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#c6a45d77'; ctx.beginPath(); ctx.moveTo(left, y(base)); ctx.lineTo(right, y(base)); ctx.stroke(); ctx.setLineDash([]);
        const rise = points.at(-1).price >= points[0].price, color = rise ? '#79d9b9' : '#ee8a98';
        const gradient = ctx.createLinearGradient(0, top, 0, bottom); gradient.addColorStop(0, rise ? '#79d9b92b' : '#ee8a982b'); gradient.addColorStop(1, '#10163800');
        ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(x(i), y(p.price)) : ctx.moveTo(x(i), y(p.price))); ctx.lineTo(x(points.length - 1), bottom); ctx.lineTo(x(0), bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
        ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(x(i), y(p.price)) : ctx.moveTo(x(i), y(p.price))); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        const last = points.length - 1;
        for (const i of [...new Set([0, Math.floor(last / 2), last])]) {
            ctx.textAlign = i === 0 ? 'left' : i === last ? 'right' : 'center'; ctx.fillStyle = '#aab9d4';
            ctx.fillText(`${points[i].day}日 ${points[i].label}`, x(i), bottom + 23);
        }
        const index = selected === null ? last : Math.min(selected, last), point = points[index], xx = x(index), yy = y(point.price);
        if (selected !== null) {
            ctx.setLineDash([3, 4]); ctx.strokeStyle = '#dce6ff99'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bottom); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(xx, yy, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.fillRect(right + 2, yy - 10, 62, 20); ctx.fillStyle = '#101638'; ctx.fillText(fmtPrice(point.price), right + 6, yy);
        readout.textContent = `${point.day}日 ${point.label}　${fmtPrice(point.price)} ${currency}　${selected === null ? '最新' : '観測 ' + (index + 1) + '/' + points.length}`;
        canvas.dataset.samples = String(points.length); canvas.dataset.index = String(index); canvas.dataset.price = String(point.price);
    }
    function atPointer(event) {
        if (!points.length) return;
        const rect = canvas.getBoundingClientRect(), fraction = clamp((event.clientX - rect.left - margins.left) / (width - margins.left - margins.right), 0, 1);
        const time = points[0].time + fraction * (points.at(-1).time - points[0].time);
        selected = points.reduce((best, p, i) => Math.abs(p.time - time) < Math.abs(points[best].time - time) ? i : best, 0); paint();
    }
    canvas.addEventListener('pointermove', atPointer); canvas.addEventListener('pointerdown', event => { atPointer(event); canvas.focus({ preventScroll: true }); });
    canvas.addEventListener('pointerleave', () => { if (document.activeElement !== canvas) { selected = null; paint(); } });
    canvas.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
        event.preventDefault();
        selected = event.key === 'Home' ? 0 : event.key === 'End' || event.key === 'Escape' ? null : clamp((selected === null ? points.length - 1 : selected) + (event.key === 'ArrowLeft' ? -1 : 1), 0, points.length - 1); paint();
    });
    const observer = new ResizeObserver(paint); observer.observe(el);
    return { el, update(next, baseline) { points = next.filter(p => Number.isFinite(p.price) && Number.isFinite(p.time)); base = baseline; paint(); }, destroy() { observer.disconnect(); } };
}
