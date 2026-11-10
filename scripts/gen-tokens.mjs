import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(
  readFileSync(join(root, 'docs/design/tokens.json'), 'utf8'),
);

function flatCss(obj, prefix = '--bb') {
  const lines = [];
  function walk(o, p) {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('$')) continue;
      const key = `${p}-${k}`.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, key);
      else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        lines.push(`  ${key}: ${typeof v === 'number' ? v : JSON.stringify(v)};`);
    }
  }
  walk(obj, prefix);
  return `:root {\n${lines.join('\n')}\n}\n`;
}

mkdirSync(join(root, 'src'), { recursive: true });
writeFileSync(join(root, 'src/tokens.css'), flatCss(tokens));
writeFileSync(
  join(root, 'src/tokens.ts'),
  `/* eslint-disable -- generated from docs/design/tokens.json */\nexport const tokens = ${JSON.stringify(tokens, null, 2)} as const;\nexport type Tokens = typeof tokens;\n`,
);
console.log('Generated src/tokens.ts and src/tokens.css');
