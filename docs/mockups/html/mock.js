// Bonbon Boing static mockups. Layout rules here are the spec (see BUILD-BRIEF §Layout).
const Q = new URLSearchParams(location.search);
const SCREEN = Q.get('screen') || 'play';
const VW = innerWidth, VH = innerHeight;
const WORLD = { w: 1000, h: 1600 };
function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); }
// ---------- LAYOUT ----------
function layout() {
  const landscape = VW / VH > 1.15;
  const hudH = landscape ? 0 : Math.max(60, Math.min(76, VH * 0.08));
  const sideW = landscape ? Math.max(150, Math.min(260, (VW - VH * 0.625) / 2)) : 0;
  const availW = VW - sideW * 2 - (landscape ? 0 : 0), availH = VH - hudH - (landscape ? 0 : 6);
  const scale = Math.min(availW / WORLD.w, availH / WORLD.h);
  const fw = WORLD.w * scale, fh = WORLD.h * scale;
  const fx = (VW - fw) / 2;
  // portrait: field top-aligned under HUD; extra space goes BELOW into the milk sea (sea extends to screen bottom)
  const fy = landscape ? (VH - fh) / 2 : hudH + Math.max(0, Math.min(24, (availH - fh) * 0.25));
  return { landscape, hudH, sideW, scale, fx, fy, fw, fh };
}
const L = layout();
const W2S = (x, y) => [L.fx + x * L.scale, L.fy + y * L.scale];
const R = { s1: 44, s2: 58, s3: 74, pip: 30 };
// ---------- FIELD ----------
const MAP = [ // even rows 6 cols, odd rows 5 cols; lowercase=s2, UPPER=s3 chonk, digit prefix 1 = s1; '.' empty
  'b . m m . u',
  ' b B . 1u u ',
  'p 1b . m l .',
  ' p . G l 1l ',
  '1g g . . u l',
  ' m 1p g u . ',
  'm m p . b u',
];
function fieldBonbons() {
  const F = { b: 'berry', p: 'peach', l: 'lemon', m: 'mint', u: 'blueberry', g: 'grape' };
  const out = []; const r = rng(7);
  MAP.forEach((row, ri) => {
    const toks = row.trim().split(/\s+/);
    const odd = ri % 2 === 1; const cols = odd ? 5 : 6;
    toks.forEach((t, ci) => {
      if (t === '.') return;
      let size = 's2'; if (t[0] === '1') { size = 's1'; t = t.slice(1); }
      const ch = t[0]; if (ch === ch.toUpperCase()) size = 's3';
      const x = 92 + ci * 163 + (odd ? 81.5 : 0) + (r() - 0.5) * 14;
      const y = 600 + ri * 122 + (r() - 0.5) * 10;
      out.push({ flavour: F[ch.toLowerCase()], size, x, y, ri, ci });
    });
  });
  return out;
}
// ---------- SCENE SVG ----------
function sceneSVG(state) {
  const T = BB.T; const s = L.scale; let h = '';
  // sky decor (full screen)
  const r = rng(3);
  for (let i = 0; i < 7; i++) h += BB.cloud(r() * VW, (0.08 + r() * 0.85) * VH, 80 + r() * 140, { opacity: 0.55 + r() * 0.35 });
  for (let i = 0; i < 26; i++) h += BB.sparkle(r() * VW, r() * VH, 3 + r() * 6, '#fff', 0.5 + r() * 0.5);
  // field group in world coords
  let f = '';
  // field frosted backdrop
  f += `<rect x="0" y="230" width="1000" height="1370" rx="70" fill="#fff" opacity=".2"/>`;
  // walls: candy sticks
  const wall = (x) => { let g = `<rect x="${x - 16}" y="180" width="32" height="1300" rx="16" fill="#fff" stroke="${T.color.world.wallOutline}" stroke-width="5"/>`;
    g += `<clipPath id="wc${x}"><rect x="${x - 16}" y="180" width="32" height="1300" rx="16"/></clipPath><g clip-path="url(#wc${x})">`;
    for (let y = 150; y < 1500; y += 58) g += `<path d="M${x - 20},${y} L${x + 20},${y - 26} L${x + 20},${y - 6} L${x - 20},${y + 20} Z" fill="${T.color.world.wallStripeB}"/>`;
    g += `<rect x="${x - 9}" y="190" width="6" height="1280" rx="3" fill="#fff" opacity=".7"/></g>`; return g; };
  f += wall(0) + wall(1000);
  // frosting danger line
  const warn = state.warn;
  f += `<path d="M30,330 ${Array.from({ length: 20 }, (_, i) => `Q${55 + i * 47},${i % 2 ? 318 : 344} ${78 + i * 47},330`).join(' ')}" fill="none" stroke="${warn ? T.color.world.frostingWarn : T.color.world.frosting}" stroke-width="9" stroke-linecap="round" opacity="${warn ? 1 : 0.55}" stroke-dasharray="2 22"/>`;
  // milk sea
  const seaY = 1480;
  f += `<path d="M-200,${seaY} ${Array.from({ length: 14 }, (_, i) => `Q${-150 + i * 100},${seaY - (i % 2 ? 26 : -10)} ${-100 + i * 100},${seaY}`).join(' ')} L1200,${seaY + 2000} L-200,${seaY + 2000} Z" fill="url(#milk)"/>`;
  f += `<path d="M-200,${seaY} ${Array.from({ length: 14 }, (_, i) => `Q${-150 + i * 100},${seaY - (i % 2 ? 26 : -10)} ${-100 + i * 100},${seaY}`).join(' ')}" fill="none" stroke="${T.color.world.milkFoam}" stroke-width="12" stroke-linecap="round"/>`;
  // new row peeking from milk
  ['mint', 'lemon', 'berry', 'blueberry', 'peach', 'grape'].forEach((fl, i) => { f += `<g opacity=".95">${BB.bonbon({ flavour: fl, x: 92 + i * 163, y: 1590, w: R.s2 * 2.05, expr: 'sleepy', shadow: false })}</g>`; });
  f += `<path d="M-200,${seaY + 30} ${Array.from({ length: 14 }, (_, i) => `Q${-150 + i * 100},${seaY + 30 - (i % 2 ? 18 : -8)} ${-100 + i * 100},${seaY + 30}`).join(' ')} L1200,${seaY + 2000} L-200,${seaY + 2000} Z" fill="${T.color.world.milkTop}" opacity=".85"/>`;
  { const r2 = rng(5); for (let i = 0; i < 18; i++) { const x = r2() * 1000, y = seaY + 60 + r2() * 600; f += `<circle cx="${x}" cy="${y}" r="${6 + r2() * 14}" fill="#fff" opacity="${0.25 + r2() * 0.3}"/>`; }
    for (let i = 0; i < 10; i++) { const x = r2() * 1000, y = seaY + 120 + r2() * 520; f += `<rect x="${x}" y="${y}" width="26" height="10" rx="5" fill="${['#FFCC29','#2ED69A','#3F8CFF','#A262FF','#FF8A3D'][i % 5]}" opacity=".55" transform="rotate(${r2() * 180} ${x} ${y})"/>`; } }
  // cuddle cup
  const cupX = state.cupX || 640, cupY = 1470;
  f += `<g transform="translate(${cupX} ${cupY})">
    <ellipse cx="0" cy="40" rx="120" ry="18" fill="#3A1F4D" opacity=".15"/>
    <path d="M105,-20 C150,-24 156,30 104,32" fill="none" stroke="#3A1F4D" stroke-width="30" stroke-linecap="round"/>
    <path d="M105,-20 C150,-24 156,30 104,32" fill="none" stroke="#7FE3FF" stroke-width="20" stroke-linecap="round"/>
    <path d="M-120,-40 L120,-40 C116,30 70,58 0,58 C-70,58 -116,30 -120,-40 Z" fill="url(#cup)" stroke="#3A1F4D" stroke-width="7" stroke-linejoin="round"/>
    <ellipse cx="0" cy="-40" rx="120" ry="20" fill="#FFF3FA" stroke="#3A1F4D" stroke-width="7"/>
    <ellipse cx="0" cy="-38" rx="98" ry="12" fill="#FFB3D6"/>
    <ellipse cx="-62" cy="-8" rx="26" ry="10" fill="#fff" opacity=".8" transform="rotate(-18 -62 -8)"/>
    ${BB.heart(0, 12, 22)}
  </g>`;
  // aim arc
  if (state.aim) {
    const bbs = state.bonbons || [];
    const p0 = [500, 235]; const v = state.aim; let x = p0[0], y = p0[1], vx = v[0], vy = v[1];
    const dt = 1 / 120; let dots = '', hit = null, n = 0;
    for (let i = 0; i < 600 && !hit; i++) {
      vy += 2400 * dt; x += vx * dt; y += vy * dt;
      if (x < 46 || x > 954) { vx = -vx * 0.88; x = Math.max(46, Math.min(954, x)); }
      for (const b of bbs) { const d = Math.hypot(b.x - x, b.y - y); if (d < R[b.size] + R.pip) { hit = [x, y]; break; } }
      if (i % 7 === 0 && y > 260) { dots += `<circle cx="${x}" cy="${y}" r="${Math.max(6, 11 - n * 0.25)}" fill="#fff" stroke="#3A1F4D" stroke-width="4" opacity="${Math.max(0.35, 0.95 - n * 0.03)}"/>`; n++; }
    }
    f += dots;
    if (hit) f += `<circle cx="${hit[0]}" cy="${hit[1]}" r="${R.pip}" fill="#fff" opacity=".55" stroke="#3A1F4D" stroke-width="4" stroke-dasharray="10 9"/>`;
  }
  // bonbons
  const bb = state.bonbons || fieldBonbons();
  bb.forEach(b => {
    const w = R[b.size] * 2.05;
    f += BB.bonbon({ flavour: b.flavour, x: b.x, y: b.y + R[b.size] * 0.94, w, expr: b.expr || (b.size === 's3' ? 'sleepy' : 'idle'), sx: b.sx, sy: b.sy, rot: b.rot });
    if (b.heart) f += BB.heart(b.x + R[b.size] * 0.62, b.y - R[b.size] * 0.7, 16);
    if (b.jelly) f += `<circle cx="${b.x}" cy="${b.y}" r="${R[b.size] + 12}" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round" opacity=".9"/>`;
  });
  // launcher cloud + pip
  f += BB.cloud(500, 120, 330, { face: true, mouth: state.launch ? 'o' : 'smile' });
  if (state.pipInCloud !== false) f += BB.bonbon({ pip: true, coat: state.coat, x: 500, y: 235, w: R.pip * 2.3, expr: 'wow', sx: 0.86 });
  // next pip (portrait only: in landscape it lives in the right side panel)
  if (!L.landscape) f += `<g transform="translate(800 182)"><circle r="44" fill="#fff" opacity=".85" stroke="#E6D2FA" stroke-width="5"/>${BB.bonbon({ pip: true, coat: state.next || 'mint', x: 0, y: 24, w: 52, shadow: false })}</g>`;
  if (!L.landscape) f += `<g transform="translate(870 150)"><circle r="24" fill="#FF7DB4" stroke="#3A1F4D" stroke-width="4"/><path d="M-9,-3 A10,10 0 1 1 -4,8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M-14,-6 L-9,-3 L-5,-9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  // live pip / effects
  if (state.fx) f += state.fx();
  const defs = `<defs>
   <linearGradient id="milk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.color.world.milkTop}"/><stop offset=".4" stop-color="${T.color.world.milkBottom}"/></linearGradient>
   <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9F3FF"/><stop offset="1" stop-color="#3FB8F5"/></linearGradient></defs>`;
  // field clip: sea and walls may extend; clip to screen
  h += `${defs}<g transform="translate(${L.fx} ${L.fy}) scale(${s})">${f}</g>`;
  return h;
}
// ---------- HUD (DOM) ----------
function hudHTML(o) {
  if (L.landscape) {
    const sw = L.sideW;
    return `
    <div class="ui" style="left:${Math.max(12, (L.fx - sw) / 2)}px;top:14px;width:${sw}px;display:flex;flex-direction:column;gap:12px;align-items:flex-start">
      <button class="btn icon tertiary" aria-label="Pause">${ICON.pause}</button>
      <div><div class="label">Score</div><div class="disp sticker num" style="font-size:40px;line-height:1">${o.score}</div></div>
      <div class="chip">★ BEST <span class="num">${o.best}</span></div>
      ${o.combo ? `<div class="chip" style="background:#FFE36B">CHAIN ×${o.combo}</div>` : ''}
    </div>
    <div class="ui" style="right:${Math.max(12, (VW - L.fx - L.fw - sw) / 2)}px;top:14px;width:${sw}px;display:flex;flex-direction:column;gap:12px;align-items:flex-end">
      <button class="btn icon tertiary" aria-label="Sound">${ICON.sound}</button>
      <div style="background:rgba(255,249,243,.92);border-radius:22px;box-shadow:0 4px 0 #E3CDEF;padding:8px 12px;display:flex;align-items:center;gap:8px">
        <div><div class="label" style="font-size:11px">Next</div><svg width="56" height="56" viewBox="0 0 56 56">${BB.bonbon({ pip: true, coat: o.next || 'mint', x: 28, y: 52, w: 46, shadow: false })}</svg></div>
        <button class="btn icon primary" aria-label="Swap" style="width:48px;height:48px;font-size:22px">⇄</button></div>
      <div class="chip">RISE IN <span class="num">1</span></div>
      <div class="chip">CATCHES <span class="num">3</span></div>
    </div>`;
  }
  const top = 10;
  return `
   <button class="ui btn icon tertiary" style="left:12px;top:${top}px" aria-label="Pause">${ICON.pause}</button>
   <div class="ui" style="left:50%;transform:translateX(-50%);top:${top - 4}px;text-align:center;pointer-events:none">
     <div class="disp sticker num" style="font-size:${VW < 375 ? 34 : 40}px;line-height:1.05">${o.score}</div>
     <div class="chip" style="display:inline-flex;margin-top:3px;font-size:11px;padding:3px 10px">★ BEST <span class="num">${o.best}</span></div>
   </div>
   <button class="ui btn icon tertiary" style="right:12px;top:${top}px" aria-label="Sound">${ICON.sound}</button>`;
}
const ICON = {
  pause: `<svg width="22" height="22" viewBox="0 0 22 22"><rect x="4" y="3" width="5" height="16" rx="2.5" fill="#3A1F4D"/><rect x="13" y="3" width="5" height="16" rx="2.5" fill="#3A1F4D"/></svg>`,
  sound: `<svg width="24" height="22" viewBox="0 0 24 22"><path d="M3,8 H7 L12,3 V19 L7,14 H3 Z" fill="#3A1F4D" stroke="#3A1F4D" stroke-width="2" stroke-linejoin="round"/><path d="M16,7 Q19,11 16,15 M18.5,4.5 Q24,11 18.5,17.5" fill="none" stroke="#3A1F4D" stroke-width="2.6" stroke-linecap="round"/></svg>`,
};
// ---------- overlap check ----------
window.__uiScale = () => { const s = L.landscape ? Math.max(1, Math.min(1.6, VH / 430)) : Math.max(1, Math.min(1.2, VW / 430));
  if (s > 1.01) document.querySelectorAll('.ui:not([data-nozoom])').forEach(e => { e.style.zoom = s; }); return s; };
window.__checkOverlaps = () => {
  const els = [...document.querySelectorAll('.ui')].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'absolute');
  const rects = els.map(e => ({ e, r: e.getBoundingClientRect(), n: e.getAttribute('aria-label') || e.className + ':' + e.textContent.trim().slice(0, 14) }));
  const bad = [];
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i].r, b = rects[j].r; if (a.width === 0 || b.width === 0) continue;
    if (rects[i].e.contains(rects[j].e) || rects[j].e.contains(rects[i].e)) continue;
    // ignore full-width containers that only hold centred content: measure their children instead
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ix > 1 && iy > 1) bad.push([rects[i].n, rects[j].n, Math.round(ix), Math.round(iy)]);
  }
  const off = rects.filter(x => x.r.left < -1 || x.r.top < -1 || x.r.right > innerWidth + 1 || x.r.bottom > innerHeight + 1).map(x => 'offscreen:' + x.n);
  return { overlaps: bad, offscreen: off, layout: L };
};
