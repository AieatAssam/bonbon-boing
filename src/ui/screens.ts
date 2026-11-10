import { tokens } from '../tokens';
import { computeLayout } from '../render/scene';
import type { Settings } from '../store';

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
  | 'trail';

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

export function renderPlayHud(
  root: HTMLElement,
  score: number,
  best: number,
  combo?: number,
): void {
  const L = computeLayout(innerWidth, innerHeight);
  const top = 10;
  if (L.landscape) {
    const sw = L.sideW;
    root.innerHTML = `
      <div class="ui ui-abs" style="left:${Math.max(12, (L.fx - sw) / 2)}px;top:14px;width:${sw}px;display:flex;flex-direction:column;gap:12px">
        <button class="btn icon tertiary ui" aria-label="Pause" data-action="pause"></button>
        <div class="ui"><div class="label">Score</div><div class="disp sticker num" style="font-size:40px;line-height:1">${score.toLocaleString()}</div></div>
        <div class="chip ui">★ BEST <span class="num">${best.toLocaleString()}</span></div>
        ${combo ? `<div class="chip ui" style="background:#FFE36B">CHAIN ×${combo}</div>` : ''}
      </div>
      <div class="ui ui-abs" style="right:${Math.max(12, innerWidth - L.fx - L.fw - sw)}px;top:14px;width:${sw}px;display:flex;flex-direction:column;gap:12px;align-items:flex-end">
        <button class="btn icon tertiary ui" aria-label="Sound" data-action="mute"></button>
        <div class="chip ui">STAGE <span class="num">1</span></div>
      </div>`;
  } else {
    const fs = innerWidth < 375 ? 34 : 40;
    root.innerHTML = `
      <button class="ui ui-abs btn icon tertiary" style="left:12px;top:${top}px" aria-label="Pause" data-action="pause"></button>
      <div class="ui ui-abs" style="left:50%;transform:translateX(-50%);top:${top - 4}px;text-align:center;pointer-events:none">
        <div class="disp sticker num ui" style="font-size:${fs}px;line-height:1.05">${score.toLocaleString()}</div>
        <div class="chip ui" style="display:inline-flex;margin-top:3px;font-size:11px;padding:3px 10px">★ BEST <span class="num">${best.toLocaleString()}</span></div>
      </div>
      <button class="ui ui-abs btn icon tertiary" style="right:12px;top:${top}px" aria-label="Sound" data-action="mute"></button>`;
  }
  applyUiScale(L);
}

export function renderResultsHud(
  root: HTMLElement,
  score: number,
  newBest: boolean,
): void {
  const L = computeLayout(innerWidth, innerHeight);
  const vw = innerWidth;
  const vh = innerHeight;
  const pw = L.landscape ? Math.min(560, vw * 0.66) : Math.min(360, vw - 28);
  const compact = vh < 700;
  const stats = `<div style="display:flex;gap:8px;justify-content:space-between">
    ${[
      ['Pops', '184'],
      ['Best hug', '×9'],
      ['Catches', '6'],
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
    <motion-title class="ui ui-abs disp sticker" style="left:50%;transform:translateX(-50%);top:12px;font-size:28px">Bonbon cast</motion-title>`;
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
