import { nextPreviewLayout, puffScreenRect } from '../render/scene';
import { checkPlayGeometry } from './play-geometry';
import type { GameApp } from '../game/app';

function layoutScreenRect(el: HTMLElement): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  if (el.hasAttribute('data-nozoom')) {
    const left = parseFloat(el.style.left);
    const top = parseFloat(el.style.top);
    const w = parseFloat(el.style.width) || el.offsetWidth;
    const h = parseFloat(el.style.height) || el.offsetHeight;
    if (Number.isFinite(left) && Number.isFinite(top)) {
      return { left, top, right: left + w, bottom: top + h };
    }
  }
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

function intersects(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return ix > 2 && iy > 2;
}

export function installOverlapChecker(): void {
  window.__checkLayoutZones = () => {
    const puff = puffScreenRect(innerWidth, innerHeight);
    const scoreEl = document.querySelector('[data-hud="score"]');
    const scoreR = scoreEl?.getBoundingClientRect();
    const puffHitsScore =
      scoreR &&
      scoreR.width > 0 &&
      intersects(puff, {
        left: scoreR.left,
        top: scoreR.top,
        right: scoreR.right,
        bottom: scoreR.bottom,
      });
  const pauseR = document
      .querySelector('[aria-label="Pause"]')
      ?.getBoundingClientRect();
    const puffHitsPause =
      pauseR &&
      pauseR.width > 0 &&
      intersects(puff, {
        left: pauseR.left,
        top: pauseR.top,
        right: pauseR.right,
        bottom: pauseR.bottom,
      });
    return { puffHitsScore: !!puffHitsScore, puffHitsPause: !!puffHitsPause };
  };

  window.__checkOverlaps = () => {
    const els = [...document.querySelectorAll('.ui')].filter(
      (e) =>
        e instanceof HTMLElement &&
        (e.offsetParent !== null ||
          getComputedStyle(e).position === 'fixed' ||
          getComputedStyle(e).position === 'absolute'),
    );
    const rects = els.map((e) => ({
      e,
      r: layoutScreenRect(e as HTMLElement),
      n:
        e.getAttribute('aria-label') ||
        `${e.className}:${e.textContent?.trim().slice(0, 14) ?? ''}`,
    }));
    const bad: Array<[string, string, number, number]> = [];
    const isSwap = (el: Element) =>
      el instanceof HTMLElement && el.getAttribute('data-action') === 'swap';
    const nextRailChrome = (el: Element) =>
      !!(
        el.closest('[data-hud="next-rail"]') ||
        (el instanceof HTMLElement && el.getAttribute('data-hud') === 'next-rail')
      );

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r;
        const b = rects[j].r;
        if (a.right <= a.left || b.right <= b.left) continue;
        if (rects[i].e.contains(rects[j].e) || rects[j].e.contains(rects[i].e))
          continue;
        if (
          (isSwap(rects[i].e) && nextRailChrome(rects[j].e)) ||
          (isSwap(rects[j].e) && nextRailChrome(rects[i].e))
        )
          continue;
        const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ix > 1 && iy > 1)
          bad.push([
            rects[i].n,
            rects[j].n,
            Math.round(ix),
            Math.round(iy),
          ]);
      }
    }
    const zones = window.__checkLayoutZones?.();
    if (zones?.puffHitsScore) {
      bad.push(['hud-score', 'puff-cloud', 99, 99]);
    }
    if (zones?.puffHitsPause) {
      bad.push(['pause', 'puff-cloud', 88, 88]);
    }
    const off = rects
      .filter(
        (x) =>
          x.r.left < -1 ||
          x.r.top < -1 ||
          x.r.right > innerWidth + 1 ||
          x.r.bottom > innerHeight + 1,
      )
      .map((x) => `offscreen:${x.n}`);
    return { overlaps: bad, offscreen: off };
  };

  window.__checkPlayGeometry = () => {
    const app = window.__bbApp;
    if (!app) return { violations: [] as string[] };
    return { violations: checkPlayGeometry(app) };
  };

  window.__nextPreviewCrop = (vw?: number, vh?: number) => {
    const w = vw ?? innerWidth;
    const h = vh ?? innerHeight;
    const p = nextPreviewLayout(w, h);
    const size = 120;
    return {
      x: p.cx - size / 2,
      y: p.cy - size / 2,
      size,
      cx: p.cx,
      cy: p.cy,
      vw: w,
      vh: h,
    };
  };
}

declare global {
  interface Window {
    __checkOverlaps?: () => {
      overlaps: Array<[string, string, number, number]>;
      offscreen: string[];
    };
    __checkLayoutZones?: () => {
      puffHitsScore: boolean;
      puffHitsPause: boolean;
    };
    __ready?: boolean;
    __uiScale?: () => number;
    __bbApp?: GameApp;
    __checkPlayGeometry?: () => { violations: string[] };
    __nextPreviewCrop?: (
      vw?: number,
      vh?: number,
    ) => {
      x: number;
      y: number;
      size: number;
      cx: number;
      cy: number;
      vw: number;
      vh: number;
    };
  }
}
