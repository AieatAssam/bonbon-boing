import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/audio');
mkdirSync(outDir, { recursive: true });

const map = {
  launch: 'kenney/interface-sounds/Audio/click_003.ogg',
  pop: 'kenney/impact-sounds/Audio/impactSoft_medium_000.ogg',
  ui: 'kenney/interface-sounds/Audio/click_003.ogg',
};

const manifest = {};
for (const [k, rel] of Object.entries(map)) {
  const src = join(root, 'assets-src/audio', rel);
  if (existsSync(src)) {
    const dest = join(outDir, `${k}.ogg`);
    copyFileSync(src, dest);
    manifest[k] = { file: `${k}.ogg`, db: -12 };
  }
}

const musicSrc = join(
  root,
  'assets-src/audio/oga/cozy_puzzle_in-game_1_bpm118_0.ogg',
);
if (existsSync(musicSrc)) {
  copyFileSync(musicSrc, join(outDir, 'music-play.ogg'));
}

try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  if (existsSync(join(outDir, 'pop.ogg'))) {
    execSync(
      `ffmpeg -y -i "${join(outDir, 'pop.ogg')}" -c:a libvorbis -q:a 5 "${join(outDir, 'sfx.ogg')}"`,
      { stdio: 'ignore' },
    );
  }
} catch {
  /* ffmpeg optional for dev */
}

writeFileSync(join(outDir, 'sprites.json'), JSON.stringify(manifest, null, 2));
console.log('Audio assets prepared in public/audio');
