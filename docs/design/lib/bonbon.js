// Bonbon Boing reference character renderer (SVG). Mockup/reference only: the game
// re-implements this in Canvas2D, following the same geometry (unit box 100x100, body y 6..94).
(function (g) {
  let T = null; let uid = 0;
  async function loadTokens(url) { T = await (await fetch(url)).json(); return T; }
  const F = () => T.color.flavour;
  const BODY = 'M50,6 C80,6 98,28 98,56 C98,80 78,94 50,94 C22,94 2,80 2,56 C2,28 20,6 50,6 Z';
  function accent(kind, c) {
    const o = c.outline, b = c.base, l = c.light, inner = c.inner;
    const sw = 4.5;
    switch (kind) {
      case 'catEars': return `
        <path d="M14,34 L18,4 Q20,-1 25,2 L44,16 Z" fill="${b}" stroke="${o}" stroke-width="${sw}" stroke-linejoin="round"/>
        <path d="M86,34 L82,4 Q80,-1 75,2 L56,16 Z" fill="${b}" stroke="${o}" stroke-width="${sw}" stroke-linejoin="round"/>
        <path d="M21,22 L23,10 L33,17 Z" fill="${inner}"/><path d="M79,22 L77,10 L67,17 Z" fill="${inner}"/>`;
      case 'bearEars': return `
        <circle cx="20" cy="18" r="13" fill="${b}" stroke="${o}" stroke-width="${sw}"/>
        <circle cx="80" cy="18" r="13" fill="${b}" stroke="${o}" stroke-width="${sw}"/>
        <circle cx="21" cy="19" r="6.5" fill="${inner}"/><circle cx="79" cy="19" r="6.5" fill="${inner}"/>`;
      case 'tuft': return `
        <path d="M50,10 C44,-2 52,-8 56,-3 C52,-1 52,4 54,9 Z" fill="${c.dark}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M44,11 C36,2 40,-4 45,-1 C43,2 44,6 47,10 Z" fill="${c.dark}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>`;
      case 'bunnyEars': return `
        <g transform="rotate(-12 34 20)"><ellipse cx="34" cy="0" rx="10" ry="24" fill="${b}" stroke="${o}" stroke-width="${sw}"/><ellipse cx="34" cy="2" rx="4.5" ry="15" fill="${inner}"/></g>
        <g transform="rotate(14 66 20)"><ellipse cx="66" cy="0" rx="10" ry="24" fill="${b}" stroke="${o}" stroke-width="${sw}"/><ellipse cx="66" cy="2" rx="4.5" ry="15" fill="${inner}"/></g>`;
      case 'floppyEars': return `
        <path d="M22,16 C6,14 -4,36 2,56 C5,66 16,64 18,54 C20,42 22,30 30,22 Z" fill="${c.dark}" stroke="${o}" stroke-width="${sw}" stroke-linejoin="round"/>
        <path d="M78,16 C94,14 104,36 98,56 C95,66 84,64 82,54 C80,42 78,30 70,22 Z" fill="${c.dark}" stroke="${o}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      case 'gills': {
        let s = '';
        [[-1, 8], [1, 92]].forEach(([d, x]) => {
          [[-8, 26], [0, 40], [8, 54]].forEach(([dy, y], i) => {
            const ex = x + d * (12 + (i === 1 ? 5 : 0));
            s += `<ellipse cx="${ex}" cy="${y - 6}" rx="${i === 1 ? 10 : 8}" ry="5" fill="${inner}" stroke="${o}" stroke-width="3.5" transform="rotate(${d * (dy * 2.5)} ${ex} ${y - 6})"/>`;
          });
        });
        return s;
      }
      case 'sprout': return `
        <path d="M50,8 Q50,-2 53,-6" fill="none" stroke="${T.color.pip.sproutDark}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M53,-5 C58,-14 70,-12 70,-6 C64,-2 57,-2 53,-5 Z" fill="${T.color.pip.sprout}" stroke="${T.color.pip.sproutDark}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M51,-3 C46,-11 36,-10 36,-5 C41,-1 47,-1 51,-3 Z" fill="${T.color.pip.sprout}" stroke="${T.color.pip.sproutDark}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    return '';
  }
  function face(expr, c, big) {
    const ink = T.color.face.ink;
    const ex = big ? 16 : 18, ey = 57, rx = big ? 8 : 7, ry = big ? 10 : 9;
    const blush = `<ellipse cx="${50 - 29}" cy="68" rx="8" ry="4.6" fill="${c.blush}" opacity=".5"/><ellipse cx="${50 + 29}" cy="68" rx="8" ry="4.6" fill="${c.blush}" opacity=".5"/>`;
    const eye = (x) => `<ellipse cx="${x}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${ink}"/><circle cx="${x - rx * 0.3}" cy="${ey - ry * 0.38}" r="${rx * 0.44}" fill="#fff"/><circle cx="${x + rx * 0.34}" cy="${ey + ry * 0.34}" r="${rx * 0.2}" fill="#fff"/>`;
    const happyEye = (x) => `<path d="M${x - 6},${ey + 2} Q${x},${ey - 7} ${x + 6},${ey + 2}" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round"/>`;
    const squeezeEye = (x, d) => `<path d="M${x - 5 * d},${ey - 5} L${x + 4 * d},${ey} L${x - 5 * d},${ey + 5}" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    const heartEye = (x) => `<path transform="translate(${x} ${ey}) scale(0.62)" d="M0,8 C-14,-2 -9,-14 0,-7 C9,-14 14,-2 0,8 Z" fill="${T.color.face.heartEye}" stroke="${ink}" stroke-width="2.5"/>`;
    const smile = `<path d="M45.5,66 Q50,71 54.5,66" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
    const catW = `<path d="M43.5,65.5 Q46.75,70 50,66 Q53.25,70 56.5,65.5" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    const openMouth = `<path d="M44,65 Q50,64 56,65 Q55,75 50,75 Q45,75 44,65 Z" fill="${T.color.face.mouthInside}" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/><ellipse cx="50" cy="72" rx="3.4" ry="2" fill="${T.color.face.tongue}"/>`;
    const oMouth = `<ellipse cx="50" cy="69" rx="4.2" ry="5" fill="${T.color.face.mouthInside}" stroke="${ink}" stroke-width="2.6"/>`;
    const wobblyMouth = `<path d="M44,69 Q47,66 50,69 Q53,72 56,69" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
    const sweat = `<path d="M84,36 C80,43 82,48 86,48 C90,48 91,43 84,36 Z" fill="${T.color.face.sweat}" stroke="${ink}" stroke-width="1.8"/>`;
    const mouthIdle = c.accent === 'catEars' ? catW : smile;
    switch (expr) {
      case 'happy': return blush + happyEye(50 - ex) + happyEye(50 + ex) + openMouth;
      case 'tickled': return blush + squeezeEye(50 - ex, 1) + squeezeEye(50 + ex, -1) + openMouth + sweat;
      case 'wow': return blush + eye(50 - ex) + eye(50 + ex) + oMouth;
      case 'love': return blush + heartEye(50 - ex) + heartEye(50 + ex) + openMouth;
      case 'worried': return blush + eye(50 - ex) + eye(50 + ex) + wobblyMouth + sweat;
      case 'sleepy': return blush + `<path d="M${50 - ex - 6},${ey} Q${50 - ex},${ey + 5} ${50 - ex + 6},${ey}" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/><path d="M${50 + ex - 6},${ey} Q${50 + ex},${ey + 5} ${50 + ex + 6},${ey}" fill="none" stroke="${ink}" stroke-width="3.4" stroke-linecap="round"/>` + smile;
      default: return blush + eye(50 - ex) + eye(50 + ex) + mouthIdle;
    }
  }
  // opts: {flavour|pip, x, y, w, expr, sx, sy (squash, around bottom), rot, coat (pip coat flavour), shadow:true}
  function bonbon(o) {
    const id = 'bb' + (uid++);
    let c, acc, big = false;
    if (o.pip) {
      c = o.coat ? Object.assign({}, F()[o.coat]) : Object.assign({ accent: 'sprout', inner: '#FFFFFF', glow: '#FFFFFF' }, T.color.pip);
      if (o.coat) c.blush = T.color.pip.blush;
      acc = 'sprout'; big = true;
    } else { c = F()[o.flavour]; acc = c.accent; }
    const w = o.w || 80, s = w / 100;
    const sx = o.sx || 1, sy = o.sy || (1 / sx);
    const rot = o.rot || 0;
    const shadow = o.shadow === false ? '' : `<ellipse cx="50" cy="95" rx="${38 * Math.min(1.5, sx)}" ry="6" fill="${T.color.light.shadow}" opacity="${T.color.light.shadowAlpha}"/>`;
    const body = `
      <defs>
        <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset=".45" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
        <radialGradient id="${id}i" cx=".46" cy=".38" r=".5"><stop offset="0" stop-color="${c.light}" stop-opacity=".6"/><stop offset="1" stop-color="${c.light}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}b" cx=".5" cy="1.15" r=".62"><stop offset=".55" stop-color="${c.dark}" stop-opacity=".55"/><stop offset="1" stop-color="${c.dark}" stop-opacity="0"/></radialGradient>
        <clipPath id="${id}c"><path d="${BODY}"/></clipPath>
      </defs>
      ${acc==='floppyEars'?'':accent(acc, c)}
      <path d="${BODY}" fill="url(#${id}g)"/>
      <g clip-path="url(#${id}c)">
        <rect x="0" y="0" width="100" height="100" fill="url(#${id}i)"/>
        <rect x="0" y="0" width="100" height="100" fill="url(#${id}b)"/>
        <path d="M92,58 C90,80 74,90 54,91" fill="none" stroke="${c.light}" stroke-width="6" stroke-linecap="round" opacity="${T.color.light.rimAlpha}"/>
      </g>
      ${o.pip && o.coat ? `<g clip-path="url(#${id}c)"><path d="M0,0 H100 V36 C92,36 90,50 82,48 C74,46 76,34 66,36 C58,38 60,54 50,52 C40,50 44,36 34,38 C24,40 26,50 16,48 C8,46 8,36 0,36 Z" fill="#FFFFFF"/><path d="M0,30 H100" stroke="#fff" stroke-width="0"/></g>` : ''}
      <path d="${BODY}" fill="none" stroke="${c.outline}" stroke-width="4.5" stroke-linejoin="round"/>
      <ellipse cx="29" cy="25" rx="16" ry="7.5" fill="#fff" opacity="${T.color.light.specularAlpha}" transform="rotate(-28 29 25)"/>
      <circle cx="51" cy="15" r="3.6" fill="#fff"/>
      <circle cx="16" cy="42" r="2.2" fill="#fff" opacity=".7"/>
      ${acc==='floppyEars'?accent(acc, c):''}`;
    const faceG = `<g transform="translate(${50 * (1 - 1)} 0)">${face(o.expr || 'idle', Object.assign({ accent: acc }, c), big)}</g>`;
    // Body squashes around bottom-centre; face is a rigid decal riding the squash (translate + uniform scale only).
    const faceScale = Math.max(0.92, Math.min(1.08, Math.sqrt(sx * sy) * (sx > 1 ? 1.03 : 0.98)));
    const faceDy = (94 - 60) * (1 - sy); // face rides down when squashed
    return `<g transform="translate(${o.x - w / 2} ${o.y - w * 0.94}) rotate(${rot} ${w / 2} ${w * 0.94}) scale(${s})">
      ${shadow}
      <g transform="translate(50 94) scale(${sx} ${sy}) translate(-50 -94)">${body}</g>
      <g transform="translate(50 ${60 + faceDy}) scale(${faceScale}) translate(-50 -60)">${faceG}</g>
    </g>`;
  }
  function cloud(x, y, w, opts = {}) {
    const s = w / 200; const sh = T.color.world.cloudShade;
    const mouth = opts.mouth === 'o' ? `<ellipse cx="100" cy="92" rx="11" ry="12" fill="${T.color.face.mouthInside}" stroke="${T.color.face.ink}" stroke-width="3.5"/>` : opts.face ? `<path d="M93,90 Q100,97 107,90" fill="none" stroke="${T.color.face.ink}" stroke-width="4" stroke-linecap="round"/>` : '';
    const faceS = opts.face ? `<ellipse cx="80" cy="78" rx="6" ry="8" fill="${T.color.face.ink}"/><circle cx="78" cy="74.5" r="2.6" fill="#fff"/><ellipse cx="120" cy="78" rx="6" ry="8" fill="${T.color.face.ink}"/><circle cx="118" cy="74.5" r="2.6" fill="#fff"/><ellipse cx="66" cy="92" rx="9" ry="5" fill="#FF8FC0" opacity=".55"/><ellipse cx="134" cy="92" rx="9" ry="5" fill="#FF8FC0" opacity=".55"/>${mouth}` : '';
    return `<g transform="translate(${x - w / 2} ${y - w * 0.3}) scale(${s})" opacity="${opts.opacity || 1}">
      <path d="M30,110 C6,110 4,78 30,74 C26,46 62,36 76,56 C84,26 130,24 138,56 C160,40 192,58 178,84 C200,92 192,116 168,114 Z" fill="${sh}" transform="translate(0 6)"/>
      <path d="M30,110 C6,110 4,78 30,74 C26,46 62,36 76,56 C84,26 130,24 138,56 C160,40 192,58 178,84 C200,92 192,116 168,114 Z" fill="#fff" ${opts.face ? `stroke="${T.color.face.ink}" stroke-width="4"` : ''}/>
      <ellipse cx="70" cy="58" rx="18" ry="7" fill="#fff" opacity=".9" transform="rotate(-20 70 58)"/>
      ${faceS}
    </g>`;
  }
  function sparkle(x, y, r, col = '#fff', op = 1) {
    return `<path transform="translate(${x} ${y}) scale(${r / 10})" d="M0,-10 C1.5,-2 2,-1.5 10,0 C2,1.5 1.5,2 0,10 C-1.5,2 -2,1.5 -10,0 C-2,-1.5 -1.5,-2 0,-10 Z" fill="${col}" opacity="${op}"/>`;
  }
  function heart(x, y, r, col) { return `<path transform="translate(${x} ${y}) scale(${r / 10})" d="M0,9 C-16,-2 -10,-15 0,-7 C10,-15 16,-2 0,9 Z" fill="${col || T.color.ui.heart}" stroke="${T.color.face.ink}" stroke-width="2"/>`; }
  g.BB = { loadTokens, bonbon, cloud, sparkle, heart, get T() { return T; } };
})(window);
