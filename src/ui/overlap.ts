import { nextPreviewLayout, puffScreenRect } from '../render/scene';
import { checkPlayGeometry } from './play-geometry';
import type { GameApp } from '../game/app';

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
      r: e.getBoundingClientRect(),
      n:
        e.getAttribute('aria-label') ||
        `${e.className}:${e.textContent?.trim().slice(0, 14) ?? ''}`,
    }));
    const bad: Array<[string, string, number, number]> = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].r;
        const b = rects[j].r;
        if (a.width === 0 || b.width === 0) continue;
        if (rects[i].e.contains(rects[j].e) || rects[j].e.contains(rects[i].e))
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

  window.__nextPreviewCrop = () => {
    const p = nextPreviewLayout(innerWidth, innerHeight);
    const size = 120;
    return {
      x: p.cx - size / 2,
      y: p.cy - size / 2,
      size,
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
    __nextPreviewCrop?: () => { x: number; y: number; size: number };
  }
}
