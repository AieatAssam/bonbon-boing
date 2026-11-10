import { tokens } from '../tokens';
import { computeLayout } from '../render/scene';
import type { Settings, StoreData } from '../store';
import type { GameWorld } from '../game/world';
import type { GameApp } from '../game/app';
import type { Flavour } from '../sim/types';

const FLAVOURS = [
  'berry',
  'peach',
  'lemon',
  'mint',
  'blueberry',
  'grape',
] as const;

export type Screen =
  | 'title'
  | 'play'
  | 'combo'
  | 'results'
  | 'pause'
  | 'gallery'
  | 'settings'
  | 'book'
  | 'trail'
  | 'credits';

export function applyUiScale(layout = computeLayout(innerWidth, innerHeight)): number {
  let s = layout.uiScale;
  if (layout.landscape && innerWidth >= 1200 && innerHeight <= 820) {
    s = Math.min(s, 1.12);
  }
  document.querySelectorAll('.ui:not([data-nozoom])').forEach((e) => {
    if (e instanceof HTMLElement) e.style.zoom = s > 1.01 ? String(s) : '';
  });
  return s;
}

function logoHtml(vw: number, vh: number, landscape: boolean): string {
  const logoSize = landscape
    ? Math.min(78, vh * 0.17)
    : Math.min(76, vw * 0.17);
  const cols = FLAVOURS;
  const rot = [-6, 4, -3, 5, -4, 3];
  const line = (w: string) =>
    [...w]
      .map(
        (ch, i) =>
          `<span style="display:inline-block;color:${tokens.color.flavour[cols[i % 6]].base};transform:rotate(${rot[i % rot.length]}deg) translateY(${(i % 2) * 4}px)">${ch}</span>`,
      )
      .join('');
  return `<div class="disp logoTxt" data-nozoom style="font-size:${logoSize}px;line-height:.92;text-align:center;filter:drop-shadow(0 6px 0 rgba(58,31,77,.25))">
    <div>${line('Bonbon')}</div>
    <div style="font-size:1.18em">${line('Boing!')}</div>
  </div>`;
}

function titleButtons(w: number): string {
  return `
    <button class="btn primary ui" style="width:${w}px;height:70px;font-size:30px" data-action="play">▶&nbsp;Play</button>
    <div class="ui" style="display:flex;gap:12px;width:${w}px">
      <button class="btn gold ui" style="flex:1;height:56px;font-size:18px" data-action="daily">Daily</button>
      <button class="btn secondary ui" style="flex:1;height:56px;font-size:18px" data-action="trail">Trail</button>
    </div>
    <div class="ui" style="display:flex;gap:14px;justify-content:center">
      <button class="btn icon tertiary ui" aria-label="Bonbon Book" data-action="book"></button>
      <button class="btn icon tertiary ui" aria-label="Settings" data-action="settings"></button>
      <button class="btn icon tertiary ui" aria-label="Credits" data-action="credits"></button>
    </div>`;
}

export function renderTitleHud(root: HTMLElement, best: number): void {
  const L = computeLayout(innerWidth, innerHeight);
  const vw = innerWidth;
  const vh = innerHeight;
  const logo = logoHtml(vw, vh, L.landscape);
  const bw = Math.min(L.landscape ? 300 : 320, vw - 56);
  if (L.landscape) {
    const colW = Math.min(280, vw * 0.28);
    root.innerHTML = `
      <div class="ui ui-abs" data-nozoom style="left:4%;top:5%;width:34%;max-width:380px;max-height:38vh;overflow:hidden;pointer-events:none">${logo}</div>
      <div class="ui ui-abs" style="left:58%;top:46%;transform:translateY(-50%);width:${colW}px;display:flex;flex-direction:column;gap:10px;align-items:stretch">
        <div class="chip ui" style="align-self:center">★ BEST <span class="num">${best.toLocaleString()}</span></div>
        ${titleButtons(colW).replace(/height:70px/g, 'height:60px').replace(/height:56px/g, 'height:50px')}
      </div>`;
  } else {
    root.innerHTML = `
      <div class="ui ui-abs chip" style="left:50%;transform:translateX(-50%);top:14px">★ BEST <span class="num">${best.toLocaleString()}</span></div>
      <div class="ui ui-abs" data-nozoom style="left:0;right:0;top:${vh * 0.075}px;text-align:center">${logo}</div>
      <div class="ui ui-abs" style="left:50%;transform:translateX(-50%);bottom:${Math.max(22, vh * 0.04)}px;display:flex;flex-direction:column;gap:${vh < 700 ? 12 : 16}px;align-items:center">
        ${titleButtons(bw)}
      </div>`;
  }
  applyUiScale(L);
}

const ICON_PAUSE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="2" fill="#3A1F4D"/><rect x="14" y="4" width="5" height="16" rx="2" fill="#3A1F4D"/></svg>`;
const ICON_SOUND = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="#3A1F4D" stroke="#3A1F4D" stroke-width="1.5"/><path d="M16 8.5a5 5 0 010 7" stroke="#3A1F4D" stroke-width="2" stroke-linecap="round"/></svg>`;

const SWAP_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l-4 4 4 4" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M15 18l4-4-4-4" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 10h9" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M19 14H10" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`;

export function renderPlayHud(
  root: HTMLElement,
  score: number,
  best: number,
  combo?: number,
  _stage = 1,
  _shots = 0,
  _nextCoat: Flavour = 'mint',
  world?: GameWorld,
): void {
  const L = computeLayout(innerWidth, innerHeight);
  const top = Math.max(10, L.hudH * 0.14);
  const riseIn = world?.shotsUntilRise() ?? 1;
  const catches = world?.catches ?? 0;
  if (L.landscape) {
    const sw = Math.min(L.sideW, Math.max(148, L.fx - 10));
    const rx = Math.max(12, innerWidth - L.fx - L.fw - sw);
    root.innerHTML = `
      <div class="ui ui-abs" style="left:14px;top:14px;width:${sw}px;display:flex;flex-direction:column;gap:8px;align-items:stretch">
        <button class="btn icon gloss ui" aria-label="Pause" data-action="pause" style="align-self:flex-start">${ICON_PAUSE}</button>
        <div class="label ui">Score</div>
        <div class="disp score-sticker num ui" style="font-size:44px;line-height:1;text-align:left">${score.toLocaleString()}</div>
        <div class="chip best-chip ui" style="align-self:flex-start"><span class="best-star">★</span> BEST <span class="num">${best.toLocaleString()}</span></div>
        ${combo ? `<div class="chip ui" style="background:#FFE36B;align-self:flex-start">CHAIN ×${combo}</div>` : ''}
      </div>
      <div class="ui ui-abs" style="right:${rx}px;top:14px;width:${sw}px;display:flex;flex-direction:column;gap:10px;align-items:flex-end">
        <button class="btn icon gloss ui" aria-label="Sound" data-action="mute">${ICON_SOUND}</button>
        <div class="panel ui" style="width:min(140px,100%);padding:10px 12px 12px;text-align:center">
          <div class="label ui" style="font-size:10px;margin-bottom:6px">Next</div>
          <div class="label ui" style="font-size:11px;opacity:.85">(on field)</div>
          <button class="ui btn swap-badge" style="width:44px;height:44px;padding:0;margin:0 auto 8px;border-radius:50%" data-action="swap" aria-label="Swap colours">${SWAP_SVG}</button>
        </div>
        <div class="chip ui" style="width:min(140px,100%);justify-content:center">RISE IN <span class="num">${riseIn}</span></div>
        <div class="chip ui" style="width:min(140px,100%);justify-content:center">CATCHES <span class="num">${catches}</span></div>
      </div>`;
  } else {
    const fs = innerWidth < 375 ? 36 : 42;
    root.innerHTML = `
      <button class="ui ui-abs btn icon gloss" style="left:12px;top:${top}px;width:58px;height:58px" aria-label="Pause" data-action="pause">${ICON_PAUSE}</button>
      <div class="ui ui-abs" data-hud="score" style="left:50%;transform:translateX(-50%);top:${top}px;max-height:${L.hudH - 6}px;text-align:center;pointer-events:none;overflow:visible">
        <div class="disp score-sticker num ui" style="font-size:${fs}px;line-height:1">${score.toLocaleString()}</div>
        <div class="chip best-chip ui" style="display:inline-flex;margin-top:3px;font-size:11px;padding:4px 12px"><span class="best-star">★</span> BEST <span class="num">${best.toLocaleString()}</span></div>
        ${combo ? `<div class="chip ui" style="display:inline-flex;margin-top:4px;font-size:11px;background:#FFE36B">CHAIN ×${combo}</div>` : ''}
      </div>
      <button class="ui ui-abs btn icon gloss" style="right:12px;top:${top}px;width:58px;height:58px" aria-label="Sound" data-action="mute">${ICON_SOUND}</button>`;
  }
  applyUiScale(L);
}

export function renderResultsHud(
  root: HTMLElement,
  score: number,
  newBest: boolean,
  world?: GameWorld,
): void {
  const pops = world
    ? Object.values(world.popCounts).reduce((a, b) => a + (b ?? 0), 0)
    : 0;
  const hug = world?.bestHug ?? 0;
  const cat = world?.catches ?? 0;
  const L = computeLayout(innerWidth, innerHeight);
  const vw = innerWidth;
  const vh = innerHeight;
  const pw = L.landscape ? Math.min(560, vw * 0.66) : Math.min(360, vw - 28);
  const compact = vh < 700;
  const stats = `<div style="display:flex;gap:8px;justify-content:space-between">
    ${[
      ['Pops', String(pops)],
      ['Best hug', `×${hug}`],
      ['Catches', String(cat)],
    ]
      .map(
        ([k, v]) =>
          `<div style="flex:1;background:#F6ECFF;border-radius:18px;padding:${compact ? 6 : 10}px 6px;text-align:center"><div class="disp num" style="font-size:24px">${v}</div><div class="label" style="font-size:10px">${k}</div></div>`,
      )
      .join('')}
  </div>`;
  const body = `<div class="panel ui" style="position:relative;width:${pw}px;padding:${compact ? 30 : 38}px 20px ${compact ? 18 : 22}px">
    <div class="disp ui" style="text-align:center;font-size:${compact ? 28 : 32}px">So squishy!</div>
    <div class="label ui" style="text-align:center;margin-top:4px">Sweet Rise · score</div>
    <div class="disp num ui" style="text-align:center;font-size:${compact ? 50 : 60}px;color:#FF3F8A">${score.toLocaleString()}</div>
    ${newBest ? `<div class="ui" style="display:flex;justify-content:center;margin:8px 0"><div class="chip" style="background:linear-gradient(#FFE36B,#FFB420);color:#5A3300">★ NEW BEST!</div></div>` : ''}
    ${stats}
    <div class="ui" style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
      <button class="btn primary ui" data-action="play">↻&nbsp;Play again</button>
      <div style="display:flex;gap:12px"><button class="btn tertiary ui" data-action="title">Home</button><button class="btn secondary ui" data-action="share">Share</button></div>
    </div>
  </div>`;
  if (L.landscape) {
    const topPct = vh < 820 ? 54 : 50;
    root.innerHTML = `<div class="scrim"></div>
      <div class="ui ui-abs" style="left:50%;top:${topPct}%;transform:translate(-50%,-50%);width:${pw}px;max-height:90vh">
        <div class="panel ui" style="padding:22px 18px 16px;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:center;max-height:86vh;overflow:auto">
          <div class="ui">
            <div class="disp" style="font-size:28px;line-height:1">So squishy!</div>
            <div class="label" style="margin-top:4px">Sweet Rise · score</div>
            <div class="disp num" style="font-size:52px;line-height:1.05;color:#FF3F8A">${score.toLocaleString()}</div>
            ${newBest ? `<div class="chip ui" style="display:inline-flex;margin-top:6px;background:linear-gradient(#FFE36B,#FFB420);color:#5A3300">★ NEW BEST!</div>` : ''}
          </div>
          <div class="ui" style="display:flex;flex-direction:column;gap:10px">${stats}
            <button class="btn primary ui" data-action="play" style="height:56px;font-size:24px">↻&nbsp;Play again</button>
            <div style="display:flex;gap:10px">
              <button class="btn tertiary ui" data-action="title" style="flex:1;height:48px;font-size:16px">Home</button>
              <button class="btn secondary ui" data-action="share" style="flex:1;height:48px;font-size:16px">Share</button>
            </div>
          </div>
        </div>
      </div>`;
  } else {
    root.innerHTML = `<div class="scrim"></div><div class="ui ui-abs" style="left:50%;top:${compact ? 52 : 50}%;transform:translate(-50%,-50%)">${body}</div>`;
  }
  applyUiScale(L);
}

export function renderGalleryHud(root: HTMLElement): void {
  root.innerHTML = `<div class="ui ui-abs chip" style="left:12px;top:12px" data-action="title">← Gallery</div>
    <div class="ui ui-abs disp sticker" style="left:50%;transform:translateX(-50%);top:12px;font-size:28px">Bonbon cast</div>`;
  applyUiScale();
}

export function renderSettingsHud(root: HTMLElement, s: Settings): void {
  root.innerHTML = `<div class="ui ui-abs panel" style="left:50%;top:50%;transform:translate(-50%,-50%);padding:24px;width:min(360px,92vw)">
    <div class="disp" style="font-size:28px;margin-bottom:12px">Settings</div>
    <label class="ui" style="display:flex;justify-content:space-between;margin:8px 0">Music <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-setting="music"/></label>
    <label class="ui" style="display:flex;justify-content:space-between;margin:8px 0">SFX <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-setting="sfx"/></label>
    <label class="ui" style="display:block;margin:8px 0"><input type="checkbox" data-setting="shake" ${s.shake ? 'checked' : ''}/> Screen shake</label>
    <label class="ui" style="display:block;margin:8px 0"><input type="checkbox" data-setting="colorAssist" ${s.colorAssist ? 'checked' : ''}/> Colour assist</label>
    <button class="btn primary ui" style="width:100%;height:52px;margin-top:12px" data-action="title">Done</button>
  </div>`;
  applyUiScale();
}

export function renderTip(root: HTMLElement, text: string): void {
  const L = computeLayout(innerWidth, innerHeight);
  const icing = L.fieldY + tokens.layout.frostingY * L.scale;
  const app = (window as unknown as { __bbApp?: GameApp }).__bbApp;
  let topRow = icing + 140;
  if (app?.world) {
    let topY = Infinity;
    for (const b of app.world.living()) {
      if (b.falling || b.popped) continue;
      topY = Math.min(topY, b.y - 40);
    }
    if (topY < Infinity) topRow = L.fieldY + topY * L.scale;
  }
  const top = Math.max(
    L.hudH + 4,
    icing + Math.max(12, (topRow - icing) * 0.42 - 22),
  );
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="ui ui-abs tip-tutorial" style="left:50%;top:${top}px;transform:translateX(-50%);max-width:min(340px,92vw)">${text}</div>`,
  );
  applyUiScale(L);
}

export function renderSugarRushHud(root: HTMLElement): void {
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="ui ui-abs" style="inset:0;background:rgba(142,107,255,.35)"></div>
    <div class="ui ui-abs panel" style="left:50%;top:50%;transform:translate(-50%,-50%);padding:24px;width:min(340px,90vw);text-align:center">
      <div class="disp" style="font-size:28px">Sugar Rush?</div>
      <p style="margin:12px 0">Pop the top 2 rows and keep playing!</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn primary ui" data-action="sugar-yes">Yes!</button>
        <button class="btn tertiary ui" data-action="sugar-no">Nah</button>
      </div>
    </div>`,
  );
}

export function renderBookHud(root: HTMLElement, store: StoreData): void {
  const flavours = ['berry', 'mint', 'lemon', 'blueberry', 'peach', 'grape'];
  const cards = flavours
    .map(
      (f) =>
        `<div class="ui chip" style="margin:6px">${f} · ${store.book[f] ?? 0} pops</div>`,
    )
    .join('');
  root.innerHTML = `<div class="ui ui-abs panel" style="left:50%;top:50%;transform:translate(-50%,-50%);padding:20px;width:min(400px,92vw);max-height:80vh;overflow:auto">
    <div class="disp" style="font-size:28px;margin-bottom:12px">Bonbon Book</div>${cards}
    <button class="btn primary ui" style="width:100%;height:48px;margin-top:16px" data-action="title">Back</button>
  </div>`;
  applyUiScale();
}

export function renderCreditsHud(root: HTMLElement): void {
  root.innerHTML = `<div class="ui ui-abs panel" style="left:50%;top:50%;transform:translate(-50%,-50%);padding:20px;width:min(420px,92vw);max-height:85vh;overflow:auto;font-size:14px;line-height:1.45">
    <div class="disp" style="font-size:26px">Credits</div>
    <p>Audio: Kenney, Freesound CC0, mintodog, Ruskerdax — see CREDITS.md</p>
    <p>Fonts: Fredoka & Nunito (OFL)</p>
    <p><strong>No-affiliation:</strong> Bonbon Boing! is independent and not affiliated with PopCap/EA, Taito, Aladdin X, Disney, SEGA, Nintendo/HAL, Jazwares, or Mediatonic.</p>
    <button class="btn primary ui" style="width:100%;height:48px;margin-top:12px" data-action="title">Back</button>
  </div>`;
  applyUiScale();
}

export function renderTrailHud(root: HTMLElement, _store: StoreData): void {
  const levels = Array.from({ length: 30 }, (_, i) => i + 1);
  const grid = levels
    .map(
      (n) =>
        `<button class="ui btn tertiary" style="width:48px;height:48px;margin:4px" data-action="trail-pick" data-level="${n}">${n}</button>`,
    )
    .join('');
  root.innerHTML = `<div class="ui ui-abs panel" style="left:50%;top:50%;transform:translate(-50%,-50%);padding:18px;width:min(380px,94vw)">
    <div class="disp" style="font-size:26px">Sweet Trail</div>
    <div class="ui" style="display:flex;flex-wrap:wrap;justify-content:center;margin:12px 0">${grid}</div>
    <button class="btn primary ui" data-action="trail-start" style="width:100%;height:52px">Level 1</button>
    <button class="btn tertiary ui" data-action="title" style="width:100%;height:44px;margin-top:8px">Back</button>
  </div>`;
  applyUiScale();
}
