const STORE_KEY = 'bonbon-boing-v1';

export interface Settings {
  music: number;
  sfx: number;
  shake: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  colorAssist: boolean;
  leftHanded: boolean;
}

export interface StoreData {
  bestRise: number;
  bestDaily: number;
  dailyStreak: number;
  book: Record<string, number>;
  settings: Settings;
  tipsSeen: string[];
}

const defaultSettings = (): Settings => ({
  music: 0.85,
  sfx: 1,
  shake: true,
  haptics: true,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  colorAssist: false,
  leftHanded: false,
});

export function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw) as StoreData;
    return { ...fresh(), ...d, settings: { ...defaultSettings(), ...d.settings } };
  } catch {
    return fresh();
  }
}

function fresh(): StoreData {
  return {
    bestRise: 0,
    bestDaily: 0,
    dailyStreak: 0,
    book: {},
    settings: defaultSettings(),
    tipsSeen: [],
  };
}

export function saveStore(data: StoreData): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}
