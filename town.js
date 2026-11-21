// 小鎮：小棠自己操作的像素小空間（2026/11/21 開始）。
// 點畫面哪裡，小棠就走過去，湛湛跟在後面；走到店門口會跳出對話。
// 座標是地圖原圖（1536×1024）的像素；人物格子表跟小房間共用（room-px/tang.png、zhan.png），一格＝地圖 1 像素。

const V = '1';
const PXI = (n, ext = 'png') => `room-px/${n}.${ext}?v=${V}`;
const MAP_W = 1536;
const MAP_H = 1024;
const VIEW_W = 560;   // 畫面一次看到地圖多寬

// 可以走的範圍（多邊形）和不能走的地方（噴水池）
const WALK = [
  [[232, 262], [560, 262], [600, 300], [880, 300], [960, 330], [1000, 400], [1250, 470], [1490, 500], [1490, 560], [1260, 560], [1200, 600], [1000, 630], [830, 700], [830, 860], [700, 860], [700, 740], [560, 600], [500, 520], [440, 500], [420, 330], [232, 330]],
  [[120, 345], [430, 330], [500, 500], [300, 510], [120, 460]],
  [[600, 250], [880, 250], [880, 300], [600, 300]],
  [[970, 345], [1200, 345], [1245, 465], [1000, 420]],
  [[1100, 560], [1275, 560], [1275, 650], [1100, 650]],
  [[1150, 640], [1265, 640], [1265, 760], [1420, 850], [1420, 990], [1150, 990], [1150, 760]],
  [[700, 760], [830, 760], [830, 888], [560, 888], [560, 930], [280, 930], [280, 862], [560, 862], [700, 862]],
];
const BLOCK = [{ cx: 762, cy: 462, rx: 100, ry: 66 }];

const SPOTS = {
  home: { x: 360, y: 880, label: '家' },
  store: { x: 430, y: 272, label: '便利商店' },
  cafe: { x: 745, y: 264, label: '咖啡店' },
  dept: { x: 1100, y: 388, label: '百貨公司' },
  market: { x: 1460, y: 532, label: '夜市' },
  beach: { x: 1380, y: 960, label: '海邊' },
  park: { x: 210, y: 410, label: '公園' },
  fountain: { x: 760, y: 548, label: '噴水池' },
};

// 格子表（跟 room.js 的 SHEET 一樣）
const SHEET = {
  tang: { w: 64, h: 80, W: 512, H: 400, walkF: 0, walkB: 1, pose: [4, 0] },
  zhan: { w: 52, h: 80, W: 416, H: 560, walkF: 0, walkB: 1, pose: [4, 0] },
};

const BAG_KEY = 'zh-town-bag';
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const walkable = (p) => WALK.some((w) => inPoly(p, w)) && !BLOCK.some((b) => ((p.x - b.cx) / b.rx) ** 2 + ((p.y - b.cy) / b.ry) ** 2 < 1);

export function createTown(root, api) {
  // api: { tw(), say(text), goHome() }
  root.innerHTML = `
    <div class="town-wrap"><div class="town" id="town-stage">
      <div class="town-world"><img class="town-bg" src="${PXI('town', 'webp')}" alt=""><div class="town-night"></div></div>
      <div class="town-hud"><button class="town-bag-btn" type="button">🎒 <b>0</b></button><span class="town-hint">點地上走過去，點店門口進去逛</span></div>
      <div class="town-dlg" hidden><div class="town-dlg-text"></div><div class="town-dlg-opts"></div></div>
      <div class="town-bag" hidden><div class="town-bag-in"><h3>我的包包</h3><div class="town-bag-list"></div><button type="button" class="town-bag-close">收起來</button></div></div>
    </div></div>`;
  const stage = root.querySelector('#town-stage');
  const world = root.querySelector('.town-world');
  const dlg = root.querySelector('.town-dlg');
  const dlgText = root.querySelector('.town-dlg-text');
  const dlgOpts = root.querySelector('.town-dlg-opts');
  const bagBtn = root.querySelector('.town-bag-btn');
  const bagBox = root.querySelector('.town-bag');

  let scale = 1;
  const resize = () => {
    const w = stage.clientWidth || 360;
    scale = w / VIEW_W;
    stage.style.height = `${Math.round(Math.min(w * 1.05, 520))}px`;
    world.style.width = `${MAP_W * scale}px`;
    world.style.height = `${MAP_H * scale}px`;
  };
  resize();
  window.addEventListener('resize', resize);

  // 店名小牌子
  for (const [k, s] of Object.entries(SPOTS)) {
    const t = document.createElement('div');
    t.className = 'town-tag';
    t.textContent = s.label;
    t.dataset.spot = k;
    world.appendChild(t);
    s.el = t;
  }

  // ---------- 人物 ----------
  const mk = (id) => {
    const el = document.createElement('div');
    el.className = 'town-ag';
    el.innerHTML = '<div class="pxs"></div>';
    world.appendChild(el);
    return { id, el, spr: el.firstChild, x: 0, y: 0, dist: 0, face: 1, back: false, moving: false };
  };
  const tang = mk('tang');
  const zhan = mk('zhan');
  tang.x = 400; tang.y = 900;
  zhan.x = 430; zhan.y = 910;
  let target = null;
  let pending = null;
  const trail = [];

  function frame(a, col, row, flip) {
    const S = SHEET[a.id];
    const st = a.spr.style;
    if (!a.bgSet) { st.backgroundImage = `url("${PXI(a.id)}")`; a.bgSet = true; }
    st.width = `${S.w * scale}px`; st.height = `${S.h * scale}px`;
    st.backgroundSize = `${S.W * scale}px ${S.H * scale}px`;
    st.backgroundPosition = `${-col * S.w * scale}px ${-row * S.h * scale}px`;
    st.transform = `translate(-50%, -100%) scaleX(${flip ? -1 : 1})`;
  }
  function draw(a) {
    const S = SHEET[a.id];
    if (a.moving) {
      const row = a.back ? S.walkB : S.walkF;
      // 正面那排本來朝左下、背面那排本來朝右上
      frame(a, Math.floor(a.dist / 9) % 8, row, a.back ? a.face < 0 : a.face > 0);
    } else frame(a, S.pose[1], S.pose[0], false);
    a.el.style.transform = `translate(${a.x * scale}px, ${a.y * scale}px)`;
    a.el.style.zIndex = String(Math.round(a.y));
  }

  // ---------- 走路 ----------
  function stepToward(a, tx, ty, dist) {
    const dx = tx - a.x, dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return false;
    const s = Math.min(dist, d);
    const base = Math.atan2(dy, dx);
    let best = null;
    if (a !== tang) best = { x: a.x + (dx / d) * s, y: a.y + (dy / d) * s };
    else {
      // 擋住了就往兩邊轉一點試試看，挑走完離目標最近的方向（繞過噴水池、牆角）
      for (const deg of [0, 20, -20, 40, -40, 60, -60, 80, -80, 100, -100]) {
        const ang = base + (deg * Math.PI) / 180;
        const q = { x: a.x + Math.cos(ang) * s, y: a.y + Math.sin(ang) * s };
        if (!walkable(q)) continue;
        const score = Math.hypot(tx - q.x, ty - q.y) + Math.abs(deg) * 0.02;
        if (!best || score < best.score) best = { ...q, score };
      }
    }
    if (!best) return false;
    const mx = best.x - a.x, my = best.y - a.y;
    a.x = best.x; a.y = best.y;
    a.dist += s;
    if (Math.abs(mx) > 0.3) a.face = mx < 0 ? -1 : 1;
    a.back = my < -Math.abs(mx) * 0.35;
    return true;
  }
  // 點到不能走的地方：沿著「人 → 點」那條線，找最遠還能走的位置
  function clampTarget(p) {
    if (walkable(p)) return p;
    let best = null;
    for (let t = 1; t >= 0; t -= 0.02) {
      const q = { x: tang.x + (p.x - tang.x) * t, y: tang.y + (p.y - tang.y) * t };
      if (walkable(q)) { best = q; break; }
    }
    return best || { x: tang.x, y: tang.y };
  }

  stage.addEventListener('click', (e) => {
    if (!dlg.hidden || !bagBox.hidden) return;
    if (e.target.closest('.town-hud')) return;
    const r = world.getBoundingClientRect();
    const p = { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
    // 點到湛湛：跟他說話
    if (Math.abs(p.x - zhan.x) < 22 && p.y < zhan.y + 4 && p.y > zhan.y - 70) { say(pick(['湛湛：要去哪？我跟著。', '湛湛：走累了就說，我揹妳。', '湛湛：想買什麼就買，我刷卡。', '湛湛：牽好，別走丟。']), [['好', null]]); return; }
    // 點到店門口附近：走過去再進去
    let hit = null;
    for (const [k, s] of Object.entries(SPOTS)) if (Math.hypot(p.x - s.x, p.y - s.y) < 70) hit = k;
    if (e.target.closest('.town-tag')) hit = e.target.closest('.town-tag').dataset.spot;
    if (hit) { pending = hit; target = clampTarget({ x: SPOTS[hit].x, y: SPOTS[hit].y }); }
    else { pending = null; target = clampTarget(p); }
  });

  // ---------- 對話 ----------
  function say(text, opts) {
    dlgText.textContent = text;
    dlgOpts.innerHTML = '';
    for (const [label, fn] of opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', (e) => { e.stopPropagation(); dlg.hidden = true; if (fn) fn(); });
      dlgOpts.appendChild(b);
    }
    dlg.hidden = false;
  }
  const bag = () => { try { return JSON.parse(localStorage.getItem(BAG_KEY)) || []; } catch { return []; } };
  const setBag = (b) => { try { localStorage.setItem(BAG_KEY, JSON.stringify(b)); } catch { /* */ } refreshBag(); };
  function refreshBag() { bagBtn.querySelector('b').textContent = String(bag().length); }
  refreshBag();
  function buy(icon, name, where) {
    const t = api.tw();
    setBag([...bag(), { icon, name, where, date: t.date }]);
  }
  bagBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const b = bag();
    root.querySelector('.town-bag-list').innerHTML = b.length
      ? b.slice().reverse().map((it) => `<div class="town-bag-it"><span>${it.icon}</span><b>${esc(it.name)}</b><small>${esc(it.where)}・${esc(it.date.slice(5).replace('-', '/'))}</small></div>`).join('')
      : '<p class="muted">包包還是空的。去逛逛吧。</p>';
    bagBox.hidden = false;
  });
  root.querySelector('.town-bag-close').addEventListener('click', (e) => { e.stopPropagation(); bagBox.hidden = true; });

  const SHOP = {
    store: { hello: '叮咚～歡迎光臨。要買點什麼？', items: [['🍮', '統一布丁'], ['🍙', '鮪魚飯糰'], ['🥛', '草莓牛奶'], ['🍫', '巧克力']] },
    cafe: { hello: '店員：今天想喝什麼呢？', items: [['☕', '黑咖啡（偏酸）'], ['🥛', '燕麥拿鐵'], ['🍰', '草莓蛋糕'], ['🥐', '可頌']] },
  };
  function enter(k) {
    if (k === 'home') return say('要回家了嗎？', [['回家', () => api.goHome()], ['再逛逛', null]]);
    if (SHOP[k]) {
      const s = SHOP[k];
      return say(s.hello, [...s.items.map(([icon, name]) => [`${icon} ${name}`, () => {
        buy(icon, name, SPOTS[k].label);
        say(pick([`湛湛已經把錢付了，把${name}遞給妳。`, `湛湛：拿著，${name}。還要什麼？`, `湛湛拿卡結了帳，${name}放進妳的包包了。`]), [['謝謝湛湛💕', null]]);
      }]), ['不用了', null]]);
    }
    if (k === 'park') return say('湛湛：草地很軟，下次帶澄澄澎澎來這裡跑。', [['好呀', null]]);
    if (k === 'fountain') return say('要許個願嗎？', [['許願', () => say(pick(['湛湛也投了一枚硬幣，沒說他許了什麼，只是握緊妳的手。', '硬幣落進水裡。湛湛：不管許什麼，我都幫妳實現。', '湛湛：我的願望已經實現了，就站在我旁邊。']), [['💕', null]])], ['下次', null]]);
    const name = SPOTS[k].label;
    return say(`湛湛：${name}還在準備，下次帶妳進去。`, [['等你喔', null]]);
  }

  // ---------- 主迴圈 ----------
  let last = performance.now();
  let raf = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // 小棠
    tang.moving = false;
    if (target) {
      const moved = stepToward(tang, target.x, target.y, 150 * dt);
      tang.moving = moved;
      // 走了 1.5 秒都沒有更接近：放棄（卡住了）
      const dNow = Math.hypot(target.x - tang.x, target.y - tang.y);
      if (!target.best || dNow < target.best - 4) { target.best = dNow; target.bestAt = now; }
      const stuck = now - target.bestAt > 1500;
      if (!moved || stuck || dNow < 2) {
        target = null;
        tang.moving = false;
        if (pending && Math.hypot(SPOTS[pending].x - tang.x, SPOTS[pending].y - tang.y) < 40) { const k = pending; pending = null; enter(k); }
        pending = null;
      }
    }
    if (tang.moving) { trail.push({ x: tang.x, y: tang.y }); if (trail.length > 400) trail.shift(); }
    // 湛湛：跟在後面大約 40 像素
    let tgt = null, acc = 0;
    for (let i = trail.length - 1; i > 0; i--) {
      acc += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
      if (acc > 40) { tgt = trail[i - 1]; break; }
    }
    zhan.moving = false;
    if (tgt && Math.hypot(tgt.x - zhan.x, tgt.y - zhan.y) > 3) zhan.moving = stepToward(zhan, tgt.x, tgt.y, 160 * dt);
    if (!zhan.moving && !tang.moving && Math.hypot(tang.x - zhan.x, tang.y - zhan.y) < 18) stepToward(zhan, tang.x + 28, tang.y + 6, 60 * dt);
    draw(zhan); draw(tang);
    // 鏡頭跟著小棠
    const vw = stage.clientWidth / scale, vh = stage.clientHeight / scale;
    const cx = Math.max(0, Math.min(MAP_W - vw, tang.x - vw / 2));
    const cy = Math.max(0, Math.min(MAP_H - vh, tang.y - 40 - vh / 2));
    world.style.transform = `translate(${-cx * scale}px, ${-cy * scale}px)`;
    // 牌子
    for (const s of Object.values(SPOTS)) s.el.style.transform = `translate(${s.x * scale}px, ${(s.y - 78) * scale}px) translateX(-50%)`;
    // 晚上
    const t = api.tw();
    const night = t.h >= 18 || t.h < 6;
    stage.classList.toggle('night', night);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  let pausedAt = 0;
  return {
    pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now(); } },
    resume() { resize(); if (raf) return; last = performance.now(); raf = requestAnimationFrame(loop); },
    resize,
    _debug: { tang, zhan, walkable, enter, SPOTS },
  };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
