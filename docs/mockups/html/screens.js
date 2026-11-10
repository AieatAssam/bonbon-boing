(async () => {
  await BB.loadTokens('../../design/tokens.json');
  const T = BB.T; T.fx = T.color.fx;
  const scene = document.getElementById('scene'), hud = document.getElementById('hud');
  scene.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  const bon = fieldBonbons();
  const find = (ri, ci) => bon.find(b => b.ri === ri && b.ci === ci) || {};
  const sq = (b, x) => { b.sx = x; b.sy = 1 / x; };
  find(2, 3).jelly = true; find(5, 3).jelly = true;
  const portrait = !L.landscape;
  if (SCREEN === 'play') {
    find(0, 2).expr = 'wow'; find(0, 3).expr = 'wow'; find(0, 0).expr = 'wow';
    find(1, 1).heart = false;
    scene.innerHTML = sceneSVG({ bonbons: bon, aim: [-520, 120], coat: 'berry', next: 'mint', cupX: 640 });
    hud.innerHTML = hudHTML({ score: '12,480', best: '18,200', next: 'mint' });
  }
  if (SCREEN === 'combo') {
    const chain = [find(0, 0), find(1, 0), find(2, 1), find(1, 1)];
    const live = bon.filter(b => b !== chain[0] && b !== chain[1] && b !== chain[2]);
    chain[3].expr = 'love'; sq(chain[3], 1.25);
    find(2, 0).expr = 'wow'; find(0, 2).expr = 'wow'; find(3, 0).expr = 'happy'; find(0, 3).expr = 'happy'; find(1, 3).expr = 'wow';
    scene.innerHTML = sceneSVG({ bonbons: live, coat: 'lemon', next: 'blueberry', pipInCloud: false, launch: true, cupX: 380,
      fx: () => {
        let f = '';
        chain.slice(0, 3).forEach((b, i) => {
          const R0 = 58, col = T.color.flavour.berry;
          f += `<circle cx="${b.x}" cy="${b.y}" r="${R0 * (1.1 + i * 0.3)}" fill="none" stroke="#fff" stroke-width="${12 - i * 3}" opacity="${0.95 - i * 0.22}"/>`;
          for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + i; const d = 64 + (k % 3) * 28 + i * 16; f += `<circle cx="${b.x + Math.cos(a) * d}" cy="${b.y + Math.sin(a) * d}" r="${10 - (k % 3) * 2.5}" fill="${col.base}" stroke="${col.outline}" stroke-width="2.5"/>`; }
          for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + 0.4 + i; const d = 100 + i * 22; f += BB.sparkle(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 15 - i * 2, k % 2 ? '#fff' : '#FFE36B'); }
          f += `<text x="${b.x + 20}" y="${b.y - 64 - i * 8}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="${42 + i * 6}" fill="#fff" stroke="#3A1F4D" stroke-width="10" paint-order="stroke" stroke-linejoin="round">+${(i + 1) * 200}</text>`;
        });
        const c3 = chain[3];
        f += `<path d="M${chain[2].x},${chain[2].y} Q${chain[2].x + 70},${chain[2].y - 50} ${c3.x},${c3.y - 40}" fill="none" stroke="#FF3D86" stroke-width="7" stroke-dasharray="2 16" stroke-linecap="round"/>`;
        f += BB.heart(c3.x + 40, c3.y - 70, 24) + BB.heart(chain[2].x + 60, chain[2].y - 30, 18);
        // trail + squashed Pip right on top of the chonk
        f += `<path d="M${c3.x + 40},${c3.y - 120} Q${c3.x + 200},${c3.y - 380} 500,250" fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" opacity=".5"/>`;
        f += BB.bonbon({ pip: true, coat: 'berry', x: c3.x + 62, y: c3.y - 78, w: 78, expr: 'happy', sx: 1.38, rot: 22 });
        const r = rng(11); for (let k = 0; k < 48; k++) { const x = 80 + r() * 840, y = 380 + r() * 720; f += `<rect x="${x}" y="${y}" width="24" height="12" rx="5" fill="${T.fx.rainbow[k % 6]}" transform="rotate(${r() * 180} ${x} ${y})"/>`; }
        f += `<g transform="translate(560 1060) rotate(-6)"><text text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="150" fill="url(#rainbowTxt)" stroke="#3A1F4D" stroke-width="22" paint-order="stroke" stroke-linejoin="round">HUG ×4!</text>
          <text y="76" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="56" fill="#fff" stroke="#3A1F4D" stroke-width="12" paint-order="stroke" stroke-linejoin="round">sweet chain +2,400</text></g>
          <defs><linearGradient id="rainbowTxt" x1="0" y1="0" x2="1" y2="0">${T.fx.rainbow.map((c, i) => `<stop offset="${i / 5}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
        return f;
      } });
    hud.innerHTML = hudHTML({ score: '24,960', best: '18,200', combo: 4, next: 'blueberry' });
  }
  if (SCREEN === 'title' || SCREEN === 'results') {
    // background: sky, clouds, a bonbon heap
    const r = rng(9); let h = '';
    for (let i = 0; i < 8; i++) h += BB.cloud(r() * VW, (0.05 + r() * 0.9) * VH, 90 + r() * 160, { opacity: 0.6 + r() * 0.3 });
    for (let i = 0; i < 30; i++) h += BB.sparkle(r() * VW, r() * VH, 3 + r() * 7, '#fff', 0.5 + r() * 0.5);
    const unit = L.landscape ? Math.min(1.5, VH / 430) * 0.85 : Math.min(VW / 390, VH / 844);
    if (SCREEN === 'title') {
      const cx = L.landscape ? VW * 0.3 : VW / 2;
      const baseY = L.landscape ? VH * 0.93 : VH * 0.56;
      const heap = [['berry', -2, 0], ['mint', -1, 0], ['lemon', 0, 0], ['blueberry', 1, 0], ['peach', 2, 0], ['grape', -1.5, 1], ['berry', -0.5, 1], ['mint', 0.5, 1], ['peach', 1.5, 1], ['lemon', -1, 2], ['blueberry', 0, 2], ['grape', 1, 2]];
      const bw = 66 * unit;
      const ex = ['happy', 'idle', 'wow', 'love', 'happy', 'idle', 'happy', 'sleepy', 'wow', 'idle', 'happy', 'love'];
      heap.forEach(([fl, col, row], i) => { h += BB.bonbon({ flavour: fl, x: cx + col * bw * 0.86, y: baseY - row * bw * 0.72, w: bw, expr: ex[i], sx: row === 0 ? 1.08 : 1 }); });
      h += `<path d="M${cx - 40 * unit},${baseY - 3.3 * bw} Q${cx - 160 * unit},${baseY - 4.6 * bw} ${cx - 200 * unit},${baseY - 3.2 * bw}" fill="none" stroke="#fff" stroke-width="${7 * unit}" stroke-linecap="round" stroke-dasharray="${2 * unit} ${12 * unit}"/>`;
      h += BB.bonbon({ pip: true, coat: 'lemon', x: cx + 4 * unit, y: baseY - 2.35 * bw, w: 46 * unit, expr: 'happy', sx: 1.35 });
      h += BB.sparkle(cx + 40 * unit, baseY - 2.9 * bw, 12 * unit, '#FFE36B') + BB.sparkle(cx - 40 * unit, baseY - 3.0 * bw, 9 * unit, '#fff');
      scene.innerHTML = h;
      const logoSize = L.landscape ? Math.min(78, VH * 0.17) : Math.min(76, VW * 0.17);
      const letters = (w, cols, rot) => [...w].map((ch, i) => `<span style="display:inline-block;color:${T.color.flavour[cols[i % cols.length]].base};transform:rotate(${rot[i % rot.length]}deg) translateY(${(i % 2) * 4}px)">${ch}</span>`).join('');
      const logo = `<div class="disp" style="font-size:${logoSize}px;line-height:.92;text-align:center;filter:drop-shadow(0 6px 0 rgba(58,31,77,.25))">
          <div class="logoTxt">${letters('Bonbon', ['berry', 'peach', 'lemon', 'mint', 'blueberry', 'grape'], [-6, 4, -3, 5, -4, 3])}</div>
          <div class="logoTxt" style="font-size:1.18em">${letters('Boing!', ['blueberry', 'berry', 'lemon', 'mint', 'peach', 'grape'], [4, -5, 3, -4, 6, -3])}</div></div>`;
      const btns = (w) => `
        <button class="btn primary" style="width:${w}px;height:70px;font-size:30px">▶&nbsp;Play</button>
        <div style="display:flex;gap:12px;width:${w}px">
          <button class="btn gold" style="flex:1;height:56px;font-size:18px;padding:0 10px"><svg width="24" height="20" viewBox="0 0 24 20"><path d="M5,10 L1,5 L1,15 Z M19,10 L23,5 L23,15 Z" fill="#FF7DB4" stroke="#5A3300" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="7" fill="#FF4F93" stroke="#5A3300" stroke-width="2"/><path d="M8,8 Q12,5 15,8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg> Daily</button>
          <button class="btn secondary" style="flex:1;height:56px;font-size:18px;padding:0 10px"><svg width="26" height="18" viewBox="0 0 26 18"><path d="M2,17 A11,11 0 0 1 24,17" fill="none" stroke="#FF4F93" stroke-width="3.4"/><path d="M5.5,17 A7.5,7.5 0 0 1 20.5,17" fill="none" stroke="#FFCC29" stroke-width="3.4"/><path d="M9,17 A4,4 0 0 1 17,17" fill="none" stroke="#2ED69A" stroke-width="3.4"/></svg> Trail</button>
        </div>
        <div style="display:flex;gap:14px;justify-content:center">
          <button class="btn icon tertiary" aria-label="Bonbon Book" style="width:52px;height:52px"><svg width="26" height="26" viewBox="0 0 26 26"><path d="M3,5 Q8,3 13,6 Q18,3 23,5 V21 Q18,19 13,22 Q8,19 3,21 Z" fill="#FFB3D6" stroke="#3A1F4D" stroke-width="2.4" stroke-linejoin="round"/><path d="M13,6 V22" stroke="#3A1F4D" stroke-width="2.4"/></svg></button>
          <button class="btn icon tertiary" aria-label="Settings" style="width:52px;height:52px"><svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="8.5" fill="#B9E4FF" stroke="#3A1F4D" stroke-width="2.4"/><circle cx="13" cy="13" r="3.4" fill="#fff" stroke="#3A1F4D" stroke-width="2.2"/><g stroke="#3A1F4D" stroke-width="4" stroke-linecap="round"><path d="M13,1.8V4"/><path d="M13,22V24.2"/><path d="M1.8,13H4"/><path d="M22,13H24.2"/><path d="M5,5L6.6,6.6"/><path d="M19.4,19.4L21,21"/><path d="M21,5L19.4,6.6"/><path d="M6.6,19.4L5,21"/></g></svg></button>
          <button class="btn icon tertiary" aria-label="Credits" style="width:52px;height:52px"><svg width="26" height="26" viewBox="0 0 26 26"><rect x="3" y="6" width="20" height="15" rx="4" fill="#fff" stroke="#3A1F4D" stroke-width="2.4"/><path d="M13,18 C6,13 8.5,8.5 13,11.5 C17.5,8.5 20,13 13,18 Z" fill="#FF3D86" stroke="#3A1F4D" stroke-width="1.8"/></svg></button>
        </div>`;
      if (L.landscape) {
        hud.innerHTML = `<div class="ui" data-nozoom style="left:${VW * 0.06}px;top:${VH * 0.06}px;width:${VW * 0.44}px">${logo}</div>
          <div class="ui" style="right:${VW * 0.06}px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:14px;align-items:center">
            <div class="chip">★ BEST <span class="num">18,200</span></div>${btns(Math.min(300, VW * 0.34))}</div>`;
      } else {
        hud.innerHTML = `<div class="ui chip" style="left:50%;transform:translateX(-50%);top:14px">★ BEST <span class="num">18,200</span></div>
          <div class="ui" style="left:0;right:0;top:${VH * 0.075}px">${logo}</div>
          <div class="ui" style="left:50%;transform:translateX(-50%);bottom:${Math.max(22, VH * 0.04)}px;display:flex;flex-direction:column;gap:${VH < 700 ? 12 : 16}px;align-items:center">${btns(Math.min(320, VW - 56))}</div>`;
        // logo row is full-width but centred; mark for overlap check using inner element
        hud.querySelector('.ui[style*="left:0;right:0"]').classList.remove('ui');
      }
      document.querySelectorAll('.logoTxt').forEach(e => e.style.cssText += ';-webkit-text-stroke:0;text-shadow:0 0 0 #3A1F4D;');
      document.querySelectorAll('.logoTxt span').forEach(e => { e.style.textShadow = '0 4px 0 #3A1F4D,0 -3px 0 #3A1F4D,3px 0 0 #3A1F4D,-3px 0 0 #3A1F4D,3px 3px 0 #3A1F4D,-3px 3px 0 #3A1F4D,3px -3px 0 #3A1F4D,-3px -3px 0 #3A1F4D,0 0 0 #fff'; });
    } else {
      // results
      h += `<defs><linearGradient id="scrimG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E6BFF"/><stop offset="1" stop-color="#FF5FA8"/></linearGradient></defs><rect width="${VW}" height="${VH}" fill="url(#scrimG)" opacity=".3"/>`;
      scene.innerHTML = h;
      const pw = L.landscape ? Math.min(560, VW * 0.66) : Math.min(360, VW - 28);
      const compact = VH < 700;
      const peek = ['berry', 'mint', 'lemon', 'blueberry'].map((fl, i) => `<svg width="70" height="70" viewBox="0 0 70 70" style="position:absolute;top:-46px;left:${16 + i * (pw - 90) / 3}px">${BB.bonbon({ flavour: fl, x: 35, y: 70, w: 64, expr: ['happy', 'love', 'wow', 'happy'][i], shadow: false })}</svg>`).join('');
      const stats = `<div style="display:flex;gap:8px;justify-content:space-between">
        ${[['', 'Pops', '184'], ['', 'Best hug', '×9'], ['', 'Catches', '6']].map(([e, k, v]) => `<div style="flex:1;background:#F6ECFF;border-radius:18px;padding:${compact ? 6 : 10}px 6px;text-align:center"><div class="disp num" style="font-size:24px;line-height:1.1">${v}</div><div class="label" style="font-size:10px">${k}</div></div>`).join('')}</div>`;
      const unlock = `<div style="display:flex;align-items:center;gap:10px;background:#FFF3D1;border-radius:18px;padding:8px 12px">
          <svg width="46" height="46" viewBox="0 0 46 46">${BB.bonbon({ flavour: 'grape', x: 23, y: 44, w: 40, expr: 'love', shadow: false })}</svg>
          <div style="flex:1"><div style="font-weight:900;font-size:14px">Grape Axolotl is almost here!</div>
          <div style="height:12px;border-radius:99px;background:#F1DFA8;margin-top:5px;overflow:hidden"><div style="width:82%;height:100%;border-radius:99px;background:linear-gradient(#D5B5FF,#A262FF)"></div></div></div></div>`;
      const body = `<div class="panel" style="position:relative;width:${pw}px;padding:${compact ? 30 : 38}px 20px ${compact ? 18 : 22}px">${peek}
          <div class="disp" style="text-align:center;font-size:${compact ? 28 : 32}px;line-height:1">So squishy!</div>
          <div class="label" style="text-align:center;margin-top:4px">Sweet Rise · score</div>
          <div class="disp num" style="text-align:center;font-size:${compact ? 50 : 60}px;line-height:1.05;color:#FF3F8A;text-shadow:0 4px 0 #C2185E33">24,960</div>
          <div style="display:flex;justify-content:center;margin:2px 0 ${compact ? 8 : 12}px"><div class="chip" style="background:linear-gradient(#FFE36B,#FFB420);box-shadow:0 4px 0 #C77A00;color:#5A3300">★ NEW BEST!</div></div>
          ${stats}<div style="height:${compact ? 8 : 12}px"></div>${compact && !L.landscape ? '' : unlock}
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:${compact ? 12 : 16}px;align-items:stretch">
            <button class="btn primary" style="height:62px;font-size:26px">↻&nbsp;Play again</button>
            <div style="display:flex;gap:12px"><button class="btn tertiary" style="flex:1;height:52px;font-size:18px">Home</button><button class="btn secondary" style="flex:1;height:52px;font-size:18px"><svg width="26" height="26" viewBox="0 0 26 26"><rect x="3" y="6" width="20" height="15" rx="4" fill="#fff" stroke="#3A1F4D" stroke-width="2.4"/><path d="M13,18 C6,13 8.5,8.5 13,11.5 C17.5,8.5 20,13 13,18 Z" fill="#FF3D86" stroke="#3A1F4D" stroke-width="1.8"/></svg> Share</button></div>
          </div></div>`;
      if (L.landscape) {
        // landscape: two-column panel
        hud.innerHTML = `<div class="ui" style="left:50%;top:50%;transform:translate(-50%,-50%)">
          <div class="panel" style="position:relative;width:${pw}px;padding:26px 20px 18px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center">${peek}
            <div><div class="disp" style="font-size:28px;line-height:1">So squishy!</div><div class="label" style="margin-top:4px">Sweet Rise · score</div>
              <div class="disp num" style="font-size:52px;line-height:1.05;color:#FF3F8A">24,960</div>
              <div class="chip" style="display:inline-flex;background:linear-gradient(#FFE36B,#FFB420);box-shadow:0 4px 0 #C77A00;color:#5A3300">★ NEW BEST!</div></div>
            <div style="display:flex;flex-direction:column;gap:10px">${stats}
              <button class="btn primary" style="height:56px;font-size:24px">↻&nbsp;Play again</button>
              <div style="display:flex;gap:10px"><button class="btn tertiary" style="flex:1;height:48px;font-size:16px">Home</button><button class="btn secondary" style="flex:1;height:48px;font-size:16px"><svg width="26" height="26" viewBox="0 0 26 26"><rect x="3" y="6" width="20" height="15" rx="4" fill="#fff" stroke="#3A1F4D" stroke-width="2.4"/><path d="M13,18 C6,13 8.5,8.5 13,11.5 C17.5,8.5 20,13 13,18 Z" fill="#FF3D86" stroke="#3A1F4D" stroke-width="1.8"/></svg> Share</button></div></div>
          </div></div>`;
      } else {
        hud.innerHTML = `<div class="ui" style="left:50%;top:${compact ? 52 : 50}%;transform:translate(-50%,-50%)">${body}</div>`;
      }
    }
  }
  window.__uiScale();
  window.__ready = true;
})();
