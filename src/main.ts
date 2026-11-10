import './ui/styles.css';
import { installOverlapChecker } from './ui/overlap';
import { computeLayout } from './render/scene';
import { GameApp } from './game/app';
import type { Screen } from './ui/screens';

const params = new URLSearchParams(location.search);
const QA = params.has('qa');
const FREEZE = params.has('freeze');
const QA_SCREEN = params.get('screen') as Screen | null;

installOverlapChecker();

const app = new GameApp(QA, FREEZE, QA_SCREEN ?? undefined);
window.__bbApp = app;

window.__uiScale = () => {
  const layout = computeLayout(innerWidth, innerHeight);
  let s = layout.uiScale;
  if (layout.landscape && innerWidth >= 1200 && innerHeight <= 820) {
    s = Math.min(s, 1.12);
  }
  document.querySelectorAll('.ui:not([data-nozoom])').forEach((e) => {
    if (e instanceof HTMLElement) e.style.zoom = s > 1.01 ? String(s) : '';
  });
  return s;
};

app.boot();
