// 小房間：Q 版湛湛、小棠、澄澄、澎澎自己在 2.5D 房間裡過日子。
// 行為 = 時段 + 真實資料（班表、生理期、睡眠、紀念日）+ 需求值 + 隨機 + 每天的小故事（home/data/island/YYYY-MM-DD.json）。
// 座標都是房間原圖（1536×1024）的像素，畫面依寬度縮放；腳的位置 = (x, y)，y 越大越前面。

const V = '0.10.1';
const IMG = (n) => `room/${n}.webp?v=${V}`;
const ROOM_W = 1536;
const ROOM_H = 1024;

const SPOTS = {
  bed: { x: 610, y: 285 },
  bedSide: { x: 690, y: 390 },
  desk: { x: 345, y: 520 },
  sofa: { x: 745, y: 470 },
  sofa2: { x: 845, y: 455 },
  rug: { x: 915, y: 615 },
  stove: { x: 935, y: 335 },
  fridge: { x: 1105, y: 425 },
  table1: { x: 1150, y: 520 },
  table2: { x: 1290, y: 560 },
  door: { x: 1425, y: 615 },
  penIn: { x: 230, y: 690 },
  penGate: { x: 470, y: 720 },
};
const FLOOR = [
  [560, 650], [700, 690], [860, 740], [1020, 700], [1160, 640], [690, 820], [850, 880], [1010, 830],
  [560, 770], [480, 640], [1220, 700], [930, 690], [760, 600], [1060, 610],
];
const PEN = [[150, 690], [260, 700], [330, 660], [200, 650], [300, 730], [120, 720]];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export function createRoom(root, api) {
  // api: { tw(), getCalendar(), getHealthDays(), getPeriodInfo(), getConfig(), loadStory(date), say(text) }
  root.innerHTML = `
    <div class="room-wrap"><div class="room" id="room-stage">
      <img class="room-bg" src="${IMG('room')}" alt="">
      <div class="room-night"></div>
    </div></div>
    <div class="room-status" id="room-status"></div>
    <div class="room-log card"><h2>今天的小房間</h2><div id="room-log"></div></div>`;
  const stage = root.querySelector('#room-stage');
  const statusEl = root.querySelector('#room-status');
  const logEl = root.querySelector('#room-log');

  let scale = 1;
  const resize = () => { scale = stage.clientWidth / ROOM_W; stage.style.height = `${ROOM_H * scale}px`; };
  resize();
  window.addEventListener('resize', resize);

  // ---------- 人物 ----------
  const mk = (id, name, h) => {
    const el = document.createElement('div');
    el.className = 'ag';
    el.innerHTML = `<div class="ag-bub"></div><img alt="${name}">`;
    stage.appendChild(el);
    return { id, name, el, img: el.querySelector('img'), bub: el.querySelector('.ag-bub'), h, x: 0, y: 0, path: [], speed: 130,
      act: null, until: 0, text: '', sprite: '', out: false, face: 1, needs: { hunger: 30, energy: 70, fun: 60, social: 60 }, walkT: 0 };
  };
  const zhan = mk('zhan', '湛湛', 285);
  const tang = mk('tang', '小棠', 255);
  const cheng = mk('cheng', '澄澄', 70);
  const peng = mk('peng', '澎澎', 80);
  const people = [zhan, tang];
  const all = [zhan, tang, cheng, peng];
  for (const b of [cheng, peng]) b.el.classList.add('bunny');

  const place = (a, p) => { a.x = p.x ?? p[0]; a.y = p.y ?? p[1]; a.path = []; };
  const walkTo = (a, p, run = false) => { a.path = [{ x: p.x ?? p[0], y: p.y ?? p[1] }]; a.speed = run ? 290 : 130; };
  const arrived = (a) => a.path.length === 0;

  // ---------- 時間與真實資料 ----------
  const minOfDay = () => { const t = api.tw(); return t.h * 60 + t.mi; };
  const today = () => api.tw().date;
  function shiftToday() {
    const cal = api.getCalendar() || {};
    const s = cal.days?.[today()];
    if (s) return s;
    return api.tw().wd === 0 ? 'off' : 'unknown';
  }
  const isWorkDay = () => ['work', 'half', 'unknown'].includes(shiftToday()) && api.tw().wd !== 0;
  const isPeriod = () => { const p = api.getPeriodInfo(); return !!p?.inPeriod; };
  const isNight = () => { const m = minOfDay(); return m >= 21 * 60 || m < 7 * 60; };
  function lastSleepHours() {
    const days = api.getHealthDays() || {};
    const k = Object.keys(days).sort().pop();
    if (!k) return null;
    const n = Number(String(days[k].sleep).replace(/,/g, ''));
    if (!isFinite(n)) return null;
    return n <= 24 ? n : n <= 1440 ? n / 60 : n / 3600;
  }
  function specialDay() {
    const md = today().slice(5);
    return (api.getConfig()?.dates || []).find((d) => d.md === md) || null;
  }

  // ---------- 小故事 ----------
  let story = [];
  const done = new Set(JSON.parse(sessionStorage.getItem(`room-done-${today()}`) || '[]'));
  const markDone = (i) => { done.add(i); try { sessionStorage.setItem(`room-done-${today()}`, JSON.stringify([...done])); } catch { /* */ } };
  api.loadStory(today()).then((s) => {
    story = Array.isArray(s?.events) ? s.events.filter((e) => /^\d{1,2}:\d{2}$/.test(e.time)) : [];
    backfill();
  }).catch(() => backfill());

  // ---------- 紀錄 ----------
  const log = [];
  const hhmm = () => { const t = api.tw(); return `${String(t.h).padStart(2, '0')}:${String(t.mi).padStart(2, '0')}`; };
  function addLog(text, star = false, time = hhmm()) {
    if (!text) return;
    if (log.slice(0, 3).some((l) => l.text === text)) return;
    log.unshift({ time, text, star });
    log.length = Math.min(log.length, 12);
    logEl.innerHTML = log.map((l) => `<div class="rl ${l.star ? 'star' : ''}"><b>${l.time}</b>${l.star ? '✨ ' : ''}${escapeHTML(l.text)}</div>`).join('');
  }
  function backfill() {
    // 打開 App 時，把今天已經過去的故事補進紀錄
    const now = minOfDay();
    const past = story.map((e, i) => ({ ...e, i, m: toMin(e.time) })).filter((e) => e.m <= now - 20).slice(-6);
    for (const e of past) { addLog(e.text, true, e.time.padStart(5, '0')); markDone(e.i); }
    if (!past.length && !log.length) addLog('小房間的燈亮了。');
  }

  // ---------- 行為庫 ----------
  // 每個行為：誰、去哪、做多久（秒）、用哪張圖、泡泡、說明文字（多種寫法，隨機挑）
  const T = {
    tang: {
      phone: { spot: 'sofa', sec: [40, 90], sprite: 'tang-phone', bub: '📱', text: ['小棠窩在沙發滑手機，偶爾笑出聲', '小棠躺在沙發上看影片', '小棠在沙發上回朋友訊息', '小棠盯著手機，大概又在看可愛的兔子影片'], fx: { fun: 18, energy: 4 } },
      game: { spot: 'desk', sec: [60, 120], sprite: 'tang-game', bub: '🎮', text: ['小棠戴上耳機開始打遊戲', '小棠在電腦前跟朋友連線', '小棠打到一半輕聲罵了一句', '小棠很專心地在打王'], fx: { fun: 25, energy: -6 } },
      eat: { spot: 'table1', sec: [30, 60], sprite: 'tang-eat', bub: '🍜', text: ['小棠坐下來吃東西', '小棠吃得兩頰鼓鼓的', '小棠邊吃邊滑手機，被湛湛看了一眼'], fx: { hunger: -50 } },
      snack: { spot: 'fridge', sec: [15, 25], sprite: 'tang-eat', bub: '🍪', text: ['小棠打開冰箱偷拿零食', '小棠在冰箱前面猶豫要吃哪個'], fx: { hunger: -15, fun: 5 } },
      bunny: { spot: 'penGate', sec: [30, 60], sprite: 'tang-happy', bub: '🐰', text: ['小棠蹲在兔兔區旁邊摸澄澄', '小棠拿牧草餵澎澎', '小棠在跟兔兔說話'], fx: { fun: 15, social: 8 } },
      nap: { spot: 'bed', sec: [90, 160], sprite: 'tang-sleep', bub: '💤', text: ['小棠倒在床上補眠', '小棠抱著枕頭睡著了'], fx: { energy: 40 } },
      wander: { spot: null, sec: [6, 14], sprite: null, bub: '', text: ['小棠在房間裡晃來晃去', '小棠走到窗邊看了一下'], fx: { fun: 2 } },
      rest: { spot: 'sofa', sec: [60, 120], sprite: 'tang-phone', bub: '🩸', text: ['小棠肚子不舒服，抱著熱水袋縮在沙發上', '小棠窩在沙發休息，臉色有點白'], fx: { energy: 10 } },
    },
    zhan: {
      cook: { spot: 'stove', sec: [50, 100], sprite: 'zhan-apron', bub: '🍳', text: ['湛湛在廚房煮晚餐', '湛湛捲起袖子切菜', '湛湛試了一口湯，又加了一點鹽'], fx: { fun: 5 } },
      soup: { spot: 'stove', sec: [60, 100], sprite: 'zhan-apron', bub: '🫘', text: ['湛湛在煮紅豆湯，說等一下要盯著小棠喝完', '湛湛煮了一鍋紅豆湯'], fx: {} },
      read: { spot: 'sofa2', sec: [60, 120], sprite: 'zhan-home', bub: '📖', text: ['湛湛坐在沙發另一頭看書', '湛湛在沙發上看書，偶爾抬頭看小棠', '湛湛窩在沙發上翻一本舊書', '湛湛泡了一杯咖啡，坐下來看書'], fx: { fun: 10, energy: 4 } },
      watch: { spot: 'sofa2', sec: [60, 120], sprite: 'zhan-home', bub: '👀', text: ['湛湛坐在沙發上看小棠打遊戲', '湛湛靠在沙發上，安靜陪著小棠'], fx: { social: 10 } },
      bunny: { spot: 'penGate', sec: [30, 60], sprite: 'zhan-normal', bub: '🌾', text: ['湛湛在換兔兔的牧草和水', '湛湛清兔兔的便盆', '湛湛把澎澎抱起來檢查爪子'], fx: { fun: 6 } },
      tidy: { spot: null, sec: [20, 40], sprite: 'zhan-normal', bub: '🧹', text: ['湛湛在整理房間', '湛湛把小棠亂丟的外套掛好', '湛湛擦了一下桌子'], fx: {} },
      eat: { spot: 'table2', sec: [30, 60], sprite: 'zhan-normal', bub: '🍚', text: ['湛湛坐下來吃飯', '湛湛吃得很安靜'], fx: { hunger: -50 } },
      wander: { spot: null, sec: [6, 14], sprite: null, bub: '', text: ['湛湛走到窗邊站了一會兒', '湛湛在房間裡走了一圈'], fx: {} },
    },
  };
  const PAIR = [
    { text: ['湛湛走過去，從後面把小棠抱進懷裡', '小棠撲過去抱住湛湛，被他穩穩接住', '湛湛把小棠拉到腿上坐', '湛湛摸了摸小棠的頭'], sprites: ['zhan-happy', 'tang-happy'], bub: '💗' },
    { text: ['小棠偷襲湛湛的腰，被他反手抓住手腕', '小棠想偷捏湛湛的臉，被他側身閃開'], sprites: ['zhan-normal', 'tang-happy'], bub: '😤' },
    { text: ['兩個人靠在一起小聲聊天', '小棠跟湛湛抱怨今天的客人，湛湛安靜聽著', '湛湛低頭親了一下小棠的額頭'], sprites: ['zhan-happy', 'tang-happy'], bub: '💬' },
  ];

  // ---------- 決定下一件事 ----------
  let pairLock = 0;
  function sprite(a, base) {
    if (a === tang) {
      if (isNight() && !['tang-sleep', 'tang-game', 'tang-eat'].includes(base)) return 'tang-bunny';
      return base || 'tang-normal';
    }
    if (a === zhan) {
      if (isNight() && !['zhan-apron'].includes(base)) return base === 'zhan-wolfsleep' ? base : 'zhan-wolf';
      return base || 'zhan-normal';
    }
    return a.id;
  }
  function start(a, key, opts = {}) {
    const def = T[a.id][key];
    const sec = opts.sec || (def.sec[0] + Math.random() * (def.sec[1] - def.sec[0]));
    a.act = { key, sprite: opts.sprite || def.sprite, bub: opts.bub ?? def.bub, fx: def.fx, spot: opts.spot || def.spot };
    a.until = performance.now() / 1000 + sec;
    // 小棠不在家時，不要挑提到她的句子
    let pool = def.text;
    if (a === zhan && tang.out) pool = pool.filter((x) => !x.includes('小棠')).concat(pool.every((x) => x.includes('小棠')) ? ['湛湛一個人安靜地做自己的事'] : []);
    a.text = opts.text || pick(pool);
    let target = a.act.spot ? { ...SPOTS[a.act.spot] } : { x: pick(FLOOR)[0], y: pick(FLOOR)[1] };
    target = avoidOverlap(a, target);
    walkTo(a, target, !!opts.run);
    linkBunnies(a, a.text);
    addLog(a.text, !!opts.star);
  }
  // 兩個人不要擠在同一個點
  function avoidOverlap(a, t) {
    const other = a === zhan ? tang : zhan;
    if (other.out) return t;
    const op = other.path.length ? other.path[other.path.length - 1] : { x: other.x, y: other.y };
    if (Math.hypot(op.x - t.x, op.y - t.y) < 70) return { x: t.x + (t.x > 900 ? -95 : 95), y: t.y + 12 };
    return t;
  }
  // 句子裡提到澄澄、澎澎：讓兔子真的過去，或被抱起來
  function linkBunnies(a, text) {
    const t = String(text || '');
    const list = [];
    if (t.includes('澄澄')) list.push(cheng);
    if (t.includes('澎澎')) list.push(peng);
    if (!list.length && /兔兔|兔子/.test(t) && /摸|抱|餵|陪/.test(t)) list.push(pick([cheng, peng]));
    for (const b of list) {
      b.lockedBy = a;
      b.lockUntil = a.until;
      b.mode = /抱/.test(t) ? 'hold' : 'near';
      b.nearSet = false;
    }
  }
  function goOut(a, text, sec, star = false) {
    a.act = { key: 'out', sprite: null, bub: '', fx: {}, spot: 'door', leaving: true };
    a.until = performance.now() / 1000 + sec;
    a.text = text;
    walkTo(a, SPOTS.door);
    addLog(text, star);
  }

  function decide(a) {
    const m = minOfDay();
    const t = api.tw();
    // 睡覺時段
    if (m >= 30 && m < 7 * 60 + 20) {
      if (a === tang) return start(a, 'nap', { sec: 600, text: '小棠縮在被子裡睡得很熟' });
      return start(a, 'read', { sec: 600, sprite: 'zhan-wolfsleep', spot: 'bedSide', bub: '💤', text: '湛湛穿著大灰狼睡衣，抱著枕頭睡在小棠旁邊' });
    }
    // 小棠上班
    if (a === tang && isWorkDay()) {
      const half = shiftToday() === 'half';
      const outFrom = 8 * 60 + 25, back = half ? 13 * 60 + 10 : 18 * 60 + 40;
      if (m >= outFrom && m < back) {
        if (!tang.out) return goOut(tang, pick(['小棠騎車出門上班了', '小棠匆匆出門，湛湛在門口替她把安全帽扣好']), 99999);
        return;
      }
    }
    // 生理期
    if (isPeriod()) {
      if (a === tang && chance(0.45)) return start(a, 'rest');
      if (a === zhan && chance(0.25) && m > 15 * 60) return start(a, 'soup');
    }
    // 22:00 打遊戲
    if (a === tang && m >= 22 * 60 && m < 24 * 60 && chance(0.6)) return start(a, 'game');
    if (a === zhan && tang.act?.key === 'game' && chance(0.6)) return start(a, 'watch');
    // 睡太少：補眠
    if (a === tang && !isWorkDay() && m > 13 * 60 && m < 17 * 60 && (lastSleepHours() ?? 8) < 5.5 && chance(0.35)) return start(a, 'nap', { text: '昨晚睡太少，小棠下午倒頭就睡' });
    // 晚餐
    if (a === zhan && m >= 17 * 60 + 30 && m < 19 * 60 + 30 && chance(0.4)) return start(a, 'cook');
    // 需求
    const n = a.needs;
    if (n.hunger > 70) return start(a, a === tang && chance(0.4) ? 'snack' : 'eat');
    if (a === tang && n.energy < 25 && m > 12 * 60) return start(a, 'nap');
    // 白天湛湛偶爾出門
    if (a === zhan && tang.out && chance(0.12) && !zhan.out) return goOut(zhan, pick(['湛湛出門去超市買菜', '湛湛出門跑步', '湛湛去幫小棠買她喜歡的甜點']), 60 + Math.random() * 120);
    // 兩個人互動
    if (!tang.out && !zhan.out && performance.now() / 1000 > pairLock && (n.social < 55 || chance(0.18))) return startPair();
    // 其他
    const opts = a === tang ? ['phone', 'phone', 'bunny', 'wander', 'snack', 'game'] : ['read', 'bunny', 'tidy', 'wander', 'read'];
    return start(a, pick(opts));
  }
  function startPair(override, star = false) {
    const p = pick(PAIR);
    const text = override || pick(p.text);
    const spot = pick(FLOOR);
    const now = performance.now() / 1000;
    pairLock = now + 120;
    for (const [a, sp, dx] of [[zhan, p.sprites[0], -55], [tang, p.sprites[1], 55]]) {
      a.act = { key: 'pair', sprite: sp, bub: p.bub, fx: { social: 40, fun: 10 } };
      a.until = now + 25 + Math.random() * 15;
      a.text = text;
      walkTo(a, { x: spot[0] + dx, y: spot[1] }, a === tang && chance(0.3));
    }
    addLog(text, star);
  }

  // ---------- 故事事件 ----------
  const toMin = (s) => { const [h, mi] = s.split(':').map(Number); return h * 60 + mi; };
  function runStory() {
    const now = minOfDay();
    story.forEach((e, i) => {
      if (done.has(i)) return;
      const em = toMin(e.time);
      if (now < em || now > em + 25) return;
      markDone(i);
      const who = e.who === 'zhan' ? [zhan] : e.who === 'tang' ? [tang] : e.who === 'bunny' ? [] : [zhan, tang];
      const actMap = { cook: 'cook', soup: 'soup', eat: 'eat', snack: 'snack', sofa: 'phone', phone: 'phone', read: 'read', game: 'game', bed: 'nap', nap: 'nap', bunny: 'bunny', tidy: 'tidy', watch: 'watch', rest: 'rest' };
      if (e.act === 'out' && who.length) { for (const a of who) goOut(a, e.text, 120 + Math.random() * 180, true); return; }
      if (e.act === 'in') { for (const a of who) if (a.out) comeBack(a, e.text); return; }
      if (['hug', 'talk', 'kiss', 'together', 'pair'].includes(e.act)) { startPair(e.text, true); return; }
      if (who.length === 2) {
        // 兩個人一起做同一件事：各自走到對應的位置
        const both = {
          eat: [['eat', { spot: 'table2' }], ['eat', { spot: 'table1' }]],
          bed: [['read', { sprite: 'zhan-wolfsleep', spot: 'bedSide', bub: '💤' }], ['nap', {}]],
          nap: [['read', { sprite: 'zhan-wolfsleep', spot: 'bedSide', bub: '💤' }], ['nap', {}]],
          sofa: [['watch', {}], ['phone', {}]],
          watch: [['watch', {}], ['phone', {}]],
          read: [['read', {}], ['phone', {}]],
          game: [['watch', {}], ['game', {}]],
          cook: [['cook', {}], ['snack', { spot: 'table1' }]],
          bunny: [['bunny', {}], ['bunny', { spot: 'penIn' }]],
        }[e.act];
        if (!both) { startPair(e.text, true); return; }
        const sec = 50 + Math.random() * 60;
        start(zhan, both[0][0], { ...both[0][1], text: e.text, sec, star: true });
        start(tang, both[1][0], { ...both[1][1], text: e.text, sec, star: true });
        return;
      }
      for (const a of who) {
        const key = actMap[e.act] && T[a.id][actMap[e.act]] ? actMap[e.act] : 'wander';
        start(a, key, { text: e.text, star: true, sec: 50 + Math.random() * 60 });
      }
      if (!who.length) addLog(e.text, true);
    });
  }
  function comeBack(a, text) {
    a.out = false;
    a.el.style.display = '';
    place(a, SPOTS.door);
    a.act = null;
    a.until = 0;
    addLog(text || (a === tang ? pick(['小棠下班回家了，湛湛走過去接過她的包包', '小棠回來了，一進門就喊湛湛']) : '湛湛回來了，手上提著一袋東西'));
  }

  // ---------- 初始位置 ----------
  function initial() {
    const m = minOfDay();
    const pens = [...PEN].sort(() => Math.random() - 0.5);
    place(cheng, pens[0]); place(peng, pens[1]);
    place(zhan, pick(FLOOR)); place(tang, pick(FLOOR));
    if (isWorkDay() && m >= 8 * 60 + 25 && m < (shiftToday() === 'half' ? 13 * 60 + 10 : 18 * 60 + 40)) { tang.out = true; tang.el.style.display = 'none'; tang.text = '上班中'; }
    const sp = specialDay();
    if (sp) addLog(`今天是${sp.name}。${sp.name.includes('生日') ? '湛湛一早就把蛋糕藏在冰箱裡' : '湛湛把桌上的花換成新的'}`, true);
    settle();
  }
  // 直接把人放在「現在正在做的事」的位置，不要每次打開都從角落走過去
  function settle() {
    pairLock = performance.now() / 1000 + 60;
    for (const a of people) {
      if (a.out) continue;
      a.act = null;
      decide(a);
      if (a.out || a.act?.key === 'out') continue;
      if (a.path.length) { const p = a.path[a.path.length - 1]; a.x = p.x; a.y = p.y; a.path = []; }
    }
  }
  initial();

  // ---------- 主迴圈 ----------
  let last = performance.now();
  let tickAcc = 0;
  let raf = 0;
  function frame(nowMs) {
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    const now = nowMs / 1000;
    tickAcc += dt;
    if (tickAcc > 1) {
      tickAcc = 0;
      // 需求變化（真實一秒 ≈ 小房間一分鐘）
      for (const a of people) {
        a.needs.hunger = clamp(a.needs.hunger + 0.12);
        a.needs.energy = clamp(a.needs.energy - (isNight() ? 0.1 : 0.05));
        a.needs.fun = clamp(a.needs.fun - 0.08);
        a.needs.social = clamp(a.needs.social - 0.1);
      }
      runStory();
      // 小棠下班
      if (tang.out && tang.act?.key === 'out' && tang.act.leaving === false) {
        const m = minOfDay();
        const back = shiftToday() === 'half' ? 13 * 60 + 10 : 18 * 60 + 40;
        if (!isWorkDay() || m >= back || m < 8 * 60) comeBack(tang);
      }
      if (tang.out && !tang.act) {
        const m = minOfDay();
        const back = shiftToday() === 'half' ? 13 * 60 + 10 : 18 * 60 + 40;
        if (!isWorkDay() || m >= back || m < 8 * 60) comeBack(tang);
      }
      // 兔子
      for (const b of [cheng, peng]) {
        if (b.lockedBy) {
          const a = b.lockedBy;
          if (now > b.lockUntil || a.out || a.act == null) { b.lockedBy = null; b.mode = null; walkTo(b, pick(PEN)); b.speed = 160; continue; }
          if (b.mode === 'near' && !b.nearSet && arrived(a)) { walkTo(b, { x: a.x + (a.x > 700 ? -70 : 70), y: a.y + 18 }); b.speed = 200; b.nearSet = true; }
          continue;
        }
        if (arrived(b) && chance(0.25)) {
          const free = !tang.out || !zhan.out ? chance(0.25) : false;
          walkTo(b, free ? pick(FLOOR) : pick(PEN));
          b.speed = 160;
        }
      }
    }
    for (const a of people) {
      if (a.out && !a.act) continue;
      if (arrived(a) && a.act?.key === 'out' && a.act.leaving) {
        a.act.leaving = false; a.out = true; a.el.style.display = 'none'; a.text = a === tang ? '出門中' : '出門中';
      }
      if (a.out && a.act?.key === 'out' && a !== tang && now > a.until) comeBack(a);
      if (!a.out && (!a.act || now > a.until)) {
        if (a.act?.fx) for (const [k, v] of Object.entries(a.act.fx)) a.needs[k] = clamp(a.needs[k] + v);
        a.act = null;
        decide(a);
      }
    }
    for (const a of all) step(a, dt);
    for (const a of all) draw(a, now);
    const mm = minOfDay();
    stage.querySelector('.room-night').style.background = mm < 6 * 60 ? 'rgba(25, 20, 60, .28)' : mm >= 22 * 60 ? 'rgba(25, 20, 60, .12)' : 'transparent';
    const zt = zhan.out ? '出門中' : zhan.text || '…';
    const tt = tang.out ? (isWorkDay() ? '上班中' : '出門中') : tang.text || '…';
    statusEl.innerHTML = zt === tt && !zhan.out ? `<span>${escapeHTML(zt)}</span>` : `<span>湛湛｜${escapeHTML(zt)}</span><span>小棠｜${escapeHTML(tt)}</span>`;
    raf = requestAnimationFrame(frame);
  }
  function step(a, dt) {
    if (!a.path.length) { a.walkT = 0; return; }
    const p = a.path[0];
    const dx = p.x - a.x, dy = p.y - a.y;
    const d = Math.hypot(dx, dy);
    const s = a.speed * dt;
    if (d <= s) { a.x = p.x; a.y = p.y; a.path.shift(); return; }
    a.x += (dx / d) * s; a.y += (dy / d) * s;
    if (Math.abs(dx) > 2) a.face = dx < 0 ? -1 : 1;
    a.walkT += dt * (a.speed > 200 ? 18 : 11);
    a.back = dy < -Math.abs(dx) * 0.4;
  }
  function draw(a, now) {
    if (a.out && a.el.style.display === 'none') return;
    const walking = a.path.length > 0;
    let name;
    if (a === cheng || a === peng) name = a.id;
    else if (walking) name = a.back ? (a === tang ? (isNight() ? 'tang-bunny' : 'tang-back') : (isNight() ? 'zhan-wolf' : 'zhan-back')) : sprite(a, a === tang ? 'tang-normal' : 'zhan-normal');
    else name = sprite(a, a.act?.sprite);
    if (a.sprite !== name) { a.sprite = name; a.img.src = IMG(name); }
    // 被抱著的兔子：貼在抱的人胸前
    if (a.mode === 'hold' && a.lockedBy && !a.lockedBy.out) {
      const o = a.lockedBy;
      const oh = (o.h) * scale;
      a.x = o.x; a.y = o.y; a.path = [];
      a.img.style.height = `${a.h * scale}px`;
      a.el.style.transform = `translate(${(o.x + 4) * scale}px, ${o.y * scale - oh * 0.38}px)`;
      a.img.style.transform = 'translateX(-50%) translateY(-100%) rotate(-8deg)';
      a.el.style.zIndex = String(Math.round(o.y) + 1);
      a.bub.textContent = '';
      return;
    }
    const lying = name === 'tang-sleep';
    const h = (lying ? a.h * 0.75 : a.h) * scale;
    const bob = walking ? Math.abs(Math.sin(a.walkT)) * (a.speed > 200 ? 9 : 5) * scale * 3 : Math.sin(now * 2 + a.x) * 1.2;
    const tilt = walking ? Math.sin(a.walkT) * (a.speed > 200 ? 7 : 4) : 0;
    a.img.style.height = `${h}px`;
    a.el.style.transform = `translate(${a.x * scale}px, ${a.y * scale - bob}px)`;
    a.img.style.transform = `translateX(-50%) translateY(-100%) scaleX(${walking && !a.back ? a.face : 1}) rotate(${tilt}deg)`;
    a.el.style.zIndex = String(Math.round(a.y));
    const bub = !walking && a.act?.bub ? a.act.bub : '';
    if (a.bub.textContent !== bub) a.bub.textContent = bub;
    a.bub.style.transform = `translate(-50%, ${-h - 18}px)`;
  }
  raf = requestAnimationFrame(frame);

  // 點人物：看他在做什麼
  stage.addEventListener('click', (e) => {
    const el = e.target.closest('.ag');
    if (!el) return;
    const a = all.find((x) => x.el === el);
    if (!a) return;
    if (a === cheng) return api.say('澄澄把耳朵攤平，像一架小飛機');
    if (a === peng) return api.say('澎澎豎著耳朵，鼻子動個不停');
    api.say(`${a.name}：${a.text || '發呆中'}`);
  });

  let pausedAt = 0;
  return {
    stop() { cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', resize); },
    pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now(); } },
    resume() {
      resize();
      if (raf) return;
      // 離開超過 3 分鐘：照現在的時間重新安排位置
      if (pausedAt && performance.now() - pausedAt > 3 * 60 * 1000) settle();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    resize,
  };
}

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
