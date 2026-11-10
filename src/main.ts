import './ui/styles.css';
import { tokens } from './tokens';
import { installOverlapChecker } from './ui/overlap';
import {
  computeLayout,
  drawField,
  drawSky,
} from './render/scene';
import { drawBonbon } from './render/bonbon';
import { initialField } from './sim/lattice';
import { cupXAtTime, previewShot } from './sim/shot';
import { loadStore, saveStore, type StoreData } from './store';
import { AudioEngine } from './audio/engine';
import {
  renderGalleryHud,
  renderPlayHud,
  renderResultsHud,
  renderSettingsHud,
  renderTitleHud,
  type Screen,
} from './ui/screens';
import type { Expression, Flavour } from './sim/types';

const params = new URLSearchParams(location.search);
const QA = params.has('qa');
const FREEZE = params.has('freeze');
const QA_SCREEN = (params.get('screen') as Screen) || (params.has('gallery') ? 'gallery' : 'title');
const SEED = QA ? 'qa' : 'player-1';

let store: StoreData = loadStore();
const audio = new AudioEngine(QA);
const canvas = document.getElementById('field') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;
const ctx = canvas.getContext('2d')!;

let screen: Screen = QA ? QA_SCREEN : 'title';
let dpr = Math.min(devicePixelRatio || 1, 2);
let fieldSeed = SEED;
const { bonbons } = initialField(fieldSeed, 5);

installOverlapChecker();

window.__uiScale = () => {
  const L = computeLayout(innerWidth, innerHeight);
  document.querySelectorAll('.ui:not([data-nozoom])').forEach((e) => {
    if (e instanceof HTMLElement)
      e.style.zoom = L.uiScale > 1.01 ? String(L.uiScale) : '';
  });
  return L.uiScale;
};

function resize(): void {
  dpr = Math.min(devicePixelRatio || 1, innerWidth > 900 ? 2 : 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function drawTitleScene(t: number): void {
  drawSky(ctx, innerWidth, innerHeight);
  const heap: Array<[Flavour, number, number]> = [
    ['berry', -2, 0],
    ['mint', -1, 0],
    ['lemon', 0, 0],
    ['blueberry', 1, 0],
    ['peach', 2, 0],
    ['grape', -1.5, 1],
    ['berry', -0.5, 1],
    ['mint', 0.5, 1],
    ['peach', 1.5, 1],
    ['lemon', -1, 2],
    ['blueberry', 0, 2],
    ['grape', 1, 2],
  ];
  const L = computeLayout(innerWidth, innerHeight);
  const cx = L.landscape ? innerWidth * 0.3 : innerWidth / 2;
  const baseY = L.landscape ? innerHeight * 0.72 : innerHeight * 0.52;
  const unit = L.landscape
    ? Math.min(1.5, innerHeight / 430) * 0.85
    : Math.min(innerWidth / 390, innerHeight / 844);
  const bw = 66 * unit;
  const exprs: Expression[] = [
    'happy',
    'idle',
    'wow',
    'love',
    'happy',
    'idle',
    'happy',
    'sleepy',
    'wow',
    'idle',
    'happy',
    'love',
  ];
  heap.forEach(([fl, col, row], i) => {
    const breathe = FREEZE ? 0 : Math.sin(t * 0.002 + i) * 4;
    drawBonbon(ctx, cx + col * bw * 0.86, baseY - row * bw * 0.72 + breathe, {
      flavour: fl,
      w: bw,
      expr: exprs[i],
      sx: row === 0 ? 1.08 : 1,
    });
  });
  const pipBounce = FREEZE ? 0 : Math.abs(Math.sin(t * 0.004)) * 18;
  drawBonbon(ctx, cx + 4 * unit, baseY - 2.35 * bw - pipBounce, {
    pip: true,
    coat: 'lemon',
    w: 46 * unit,
    expr: 'happy',
    sx: 1.35,
  });
}

function drawGallery(): void {
  drawSky(ctx, innerWidth, innerHeight);
  const flavours: Flavour[] = [
    'berry',
    'mint',
    'lemon',
    'blueberry',
    'peach',
    'grape',
  ];
  const exprs: Expression[] = [
    'idle',
    'happy',
    'tickled',
    'wow',
    'love',
    'worried',
    'sleepy',
  ];
  const cols = 4;
  const pad = 24;
  const cellW = (innerWidth - pad * 2) / cols;
  let y = 80;
  flavours.forEach((fl, i) => {
    const x = pad + (i % cols) * cellW + cellW / 2;
    if (i > 0 && i % cols === 0) y += cellW;
    drawBonbon(ctx, x, y + cellW * 0.45, {
      flavour: fl,
      w: cellW * 0.55,
      expr: exprs[i % exprs.length],
    });
  });
  const typesY = y + cellW + 40;
  const types = ['plush', 'jelly', 'marshmallow', 'chonk', 'bubble'] as const;
  types.forEach((ty, i) => {
    drawBonbon(ctx, pad + (i + 0.5) * ((innerWidth - pad * 2) / types.length), typesY, {
      flavour: 'berry',
      w: 72,
      expr: 'idle',
      type: ty,
    });
  });
}

function drawPlayFamily(combo = false): void {
  const L = computeLayout(innerWidth, innerHeight);
  drawSky(ctx, innerWidth, innerHeight);
  const cupX = cupXAtTime(fieldSeed, 12);
  const angle = (-35 * Math.PI) / 180;
  const prev = previewShot(
    {
      angleRad: angle,
      coat: combo ? 'lemon' : 'berry',
      spawnX: tokens.layout.pipSpawn.x,
      spawnY: tokens.layout.pipSpawn.y,
    },
    bonbons,
    cupX,
  );
  const aimDots = prev.path
    .filter((_, i) => i % 2 === 0)
    .map((p, i) => ({ x: p.x, y: p.y, a: Math.max(0.35, 0.95 - i * 0.04) }));
  drawField(ctx, L.scale, L.fx, L.fy, {
    bonbons,
    pipCoat: combo ? 'berry' : 'berry',
    nextCoat: combo ? 'blueberry' : 'mint',
    cupX,
    aimDots,
    comboFx: combo,
    warn: false,
    pipInCloud: !combo,
    puffMouthO: combo,
  });
}

function syncHud(): void {
  uiRoot.innerHTML = '';
  switch (screen) {
    case 'title':
      renderTitleHud(uiRoot, store.bestRise || 18200);
      break;
    case 'play':
      renderPlayHud(uiRoot, 12480, store.bestRise || 18200);
      break;
    case 'combo':
      renderPlayHud(uiRoot, 24960, store.bestRise || 18200, 4);
      break;
    case 'results':
      renderResultsHud(uiRoot, 24960, true);
      break;
    case 'gallery':
      renderGalleryHud(uiRoot);
      break;
    case 'settings':
      renderSettingsHud(uiRoot, store.settings);
      break;
    case 'pause':
      renderPlayHud(uiRoot, 12480, store.bestRise || 18200);
      renderSettingsHud(uiRoot, store.settings);
      break;
    default:
      renderTitleHud(uiRoot, store.bestRise);
  }
}

function draw(): void {
  if (screen === 'title') drawTitleScene(performance.now());
  else if (screen === 'gallery') drawGallery();
  else if (screen === 'play' || screen === 'pause') drawPlayFamily(false);
  else if (screen === 'combo') drawPlayFamily(true);
  else if (screen === 'results') {
    drawSky(ctx, innerWidth, innerHeight);
    drawTitleScene(performance.now());
  } else drawTitleScene(performance.now());
}

function route(action: string): void {
  audio.unlock();
  audio.playUiClick();
  switch (action) {
    case 'play':
      screen = 'play';
      break;
    case 'daily':
      fieldSeed = `bonbon-${new Date().toISOString().slice(0, 10)}`;
      screen = 'play';
      break;
    case 'trail':
      screen = 'play';
      break;
    case 'title':
      screen = 'title';
      break;
    case 'pause':
      screen = screen === 'pause' ? 'play' : 'pause';
      break;
    case 'settings':
      screen = 'settings';
      break;
    case 'book':
      screen = 'gallery';
      break;
    case 'share':
      void navigator.share?.({
        title: 'Bonbon Boing!',
        text: 'Bonbon Boing! Daily — 24,960 · best hug ×9',
        url: location.href,
      });
      break;
    default:
      break;
  }
  syncHud();
  draw();
}

uiRoot.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
  if (t?.dataset.action) route(t.dataset.action);
});

uiRoot.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  const key = t.dataset.setting;
  if (!key) return;
  if (t.type === 'checkbox')
    (store.settings as unknown as Record<string, boolean>)[key] = t.checked;
  else (store.settings as unknown as Record<string, number>)[key] = Number(t.value);
  saveStore(store);
});

function loop(): void {
  if (!FREEZE || screen === 'title') draw();
  requestAnimationFrame(loop);
}

function boot(): void {
  if (location.pathname.endsWith('gallery') || params.has('gallery')) screen = 'gallery';
  syncHud();
  resize();
  window.addEventListener('resize', () => {
    resize();
    syncHud();
  });
  if (!FREEZE) requestAnimationFrame(loop);
  document.addEventListener(
    'pointerdown',
    () => audio.unlock(),
    { once: true },
  );
  window.__ready = true;
}

boot();

export {};
