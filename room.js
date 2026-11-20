// 小房間：Q 版湛湛、小棠、澄澄、澎澎自己在 2.5D 房間裡過日子。
// 行為 = 時段 + 真實資料（班表、生理期、睡眠、紀念日）+ 需求值 + 隨機 + 每天的小故事（home/data/island/YYYY-MM-DD.json）。
// 座標都是房間原圖（1536×1024）的像素，畫面依寬度縮放；腳的位置 = (x, y)，y 越大越前面。

const V = '0.12.3';
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

// ---------- 像素版（room-px/）----------
// 房間圖 384×256，一格＝原圖 4 單位；邏輯座標照舊用 1536×1024。
const PXV = '6';
const PXI = (n) => `room-px/${n}.png?v=${PXV}`;
// 像素房間的家具位置跟原圖差一點，這些點另外對過
const SPOTS_PX = {
  bed: { x: 640, y: 392 }, bedSide: { x: 700, y: 384 }, desk: { x: 312, y: 462 }, sofa: { x: 740, y: 482 }, sofa2: { x: 816, y: 508 },
  stove: { x: 900, y: 382 }, fridge: { x: 1062, y: 404 }, table1: { x: 1170, y: 470 }, table2: { x: 1290, y: 520 },
  door: { x: 1392, y: 612 }, doorIn: { x: 1312, y: 652 }, tarot: { x: 880, y: 642 }, penIn: { x: 230, y: 690 }, penGate: { x: 482, y: 702 },
};
// 格子表：格子大小、每一列（腳底＝格子底邊中間）
const SHEET = {
  tang: { w: 64, h: 80, W: 512, H: 400, rows: { 'walk-front': 0, 'walk-back': 1, 'pj-walk-front': 2, 'pj-walk-back': 3, poses: 4 },
    poses: { 'tang-normal': 0, 'tang-happy': 1, 'tang-eat': 2, 'tang-phone': 3, 'tang-game': 4, 'tang-bunny': 5, 'tang-sleep': 6 } },
  zhan: { w: 52, h: 80, W: 416, H: 560, rows: { 'walk-front': 0, 'walk-back': 1, 'pj-walk-front': 2, 'pj-walk-back': 3, poses: 4, sit: 5, sweep: 6 },
    sit: { 'sit-read': 0, sit: 1, 'sit-read-pj': 2, 'sit-pj': 3 },
    poses: { 'zhan-normal': 0, 'zhan-happy': 1, 'zhan-hungry': 2, 'zhan-home': 3, 'zhan-apron': 4, 'zhan-wolf': 5, 'zhan-wolfsleep': 6, 'zhan-welcome': 7 } },
  pair: { w: 80, h: 80, W: 320, H: 160, poses: { hug: 0, pat: 1, poke: 2, tarot: 3 } },   // 第 2 列是睡衣版（hug／pat／poke）
  bunny: { w: 40, h: 40, W: 280, H: 80, rows: { cheng: 0, peng: 1 }, extra: { 'cheng-happy': 5, 'cheng-nuzzle': 6, 'peng-eat1': 5, 'peng-eat2': 6 } },
  // 人和兔兔畫在同一格（摸、餵、抱、換牧草）：用的時候把那隻兔兔藏起來
  bunplay: { w: 80, h: 80, W: 1120, H: 80, poses: { 'tang-pet': 0, 'tang-feed': 1, 'tang-hold': 2, 'tang-pet-pj': 3, 'tang-feed-pj': 4, 'tang-hold-pj': 5, 'zhan-tend': 6, 'zhan-hold': 7, 'zhan-tend-pj': 8, 'zhan-hold-pj': 9, 'tang-sit-pet': 10, 'tang-sit-pet-pj': 11, 'zhan-sit-pet': 12, 'zhan-sit-pet-pj': 13 } },
};
// 每個互動用哪隻兔兔
const PLAY_BUNNY = { 'tang-pet': 'cheng', 'tang-feed': 'peng', 'tang-hold': 'cheng', 'zhan-tend': 'peng', 'zhan-hold': 'peng', 'tang-sit-pet': 'cheng', 'zhan-sit-pet': 'peng' };
// 沙發前緣（原圖座標）：站在這條線前面的人和兔兔，要畫在沙發前面
const SOFA_FRONT = [[612, 528], [712, 560], [884, 470]];
function sofaFrontY(x) {
  const [a, b, c] = SOFA_FRONT;
  if (x < a[0] - 10 || x > c[0] + 10) return null;
  const [p, q] = x <= b[0] ? [a, b] : [b, c];
  return p[1] + (q[1] - p[1]) * (Math.min(Math.max(x, p[0]), q[0]) - p[0]) / (q[0] - p[0]);
}
// 疊在房間上的圖：[x, y, 寬, 高]（384×256 的格子），z 用底邊換算成原圖 y
const OV = {"bed-tang":[95,26,96,74],"bed-zhan":[95,26,99,74],"bed-both":[95,26,100,74],"bed-tangphone":[95,26,97,71],"bed-phoneboth":[95,26,97,74],"win-day":[63,26,33,44],"win-sunset":[63,26,33,44],"win-rainday":[63,26,33,44],"win-rainnight":[63,26,33,44],"sofa-movie":[149,78,89,68],"decor-anniv":[280,40,55,71],"decor-bday":[280,41,55,73],"table-coffee":[283,80,45,30],"table-tarot":[195,110,44,30],"screen-xp":[47,64,24,23],"sofa":[153,87,69,54],"fence":[2,149,110,55]};
const OV_Z = { win: 1, 'screen-xp': 1, sofa: 560, fence: 812 };
const HOP_Y = [0, 2, 5, 1];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export function createRoom(root, api, mode = '25d') {
  const PX = mode === 'px';
  const SP = PX ? { ...SPOTS, ...SPOTS_PX } : SPOTS;
  // api: { tw(), getCalendar(), getHealthDays(), getPeriodInfo(), getConfig(), loadStory(date), say(text) }
  root.innerHTML = `
    <div class="room-wrap"><div class="room ${PX ? 'px' : ''}" id="room-stage">
      <img class="room-bg" src="${PX ? PXI('room') : IMG('room')}" alt="">
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
    el.innerHTML = PX ? `<div class="ag-bub"></div><div class="pxs" role="img" aria-label="${name}"></div>` : `<div class="ag-bub"></div><img alt="${name}">`;
    stage.appendChild(el);
    return { id, name, el, img: el.querySelector('img'), spr: el.querySelector('.pxs'), bub: el.querySelector('.ag-bub'), h, x: 0, y: 0, path: [], speed: 130,
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
      bunny: { spot: 'penGate', sec: [30, 60], sprite: 'tang-happy', bub: '🐰', text: ['小棠蹲在兔兔區旁邊摸澄澄', '小棠拿牧草餵澎澎', '小棠在跟兔兔說話', '小棠把澄澄抱起來親了一下'], fx: { fun: 15, social: 8 } },
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
      tidy: { spot: null, sec: [20, 40], sprite: 'zhan-normal', bub: '🧹', text: ['湛湛在整理房間', '湛湛拿掃把把地板掃了一遍', '湛湛掃到沙發旁邊，掃出一隻小棠的襪子'], fx: {} },
      eat: { spot: 'table2', sec: [30, 60], sprite: 'zhan-normal', bub: '🍚', text: ['湛湛坐下來吃飯', '湛湛吃得很安靜'], fx: { hunger: -50 } },
      wander: { spot: null, sec: [6, 14], sprite: null, bub: '', text: ['湛湛走到窗邊站了一會兒', '湛湛在房間裡走了一圈'], fx: {} },
      wait: { spot: 'doorIn', sec: [600, 600], sprite: PX ? 'zhan-welcome' : 'zhan-happy', bub: '🚪', text: ['湛湛算好時間，站到門口等小棠下班', '湛湛看了一眼時鐘，走到門口等小棠回來'], fx: {} },
      coffee: { spot: 'stove', sec: [40, 70], sprite: 'zhan-apron', bub: '☕', text: ['湛湛幫小棠沖了一杯偏酸的黑咖啡，放在餐桌上', '湛湛煎了蛋、烤了吐司，咖啡也倒好了'], fx: {} },
    },
  };
  // kind：hug／pat／poke 有兩人合照圖；fight、talk 用動畫
  const PAIR = [
    { kind: 'hug', text: ['湛湛走過去，從後面把小棠抱進懷裡', '小棠撲過去抱住湛湛，被他穩穩接住', '湛湛把小棠拉進懷裡抱了好一會兒', '小棠撒嬌要抱抱，湛湛二話不說張開手'], sprites: ['zhan-happy', 'tang-happy'], bub: '💗' },
    { kind: 'pat', text: ['湛湛摸了摸小棠的頭', '小棠湊過去討摸，湛湛笑著揉她的頭髮', '湛湛經過時順手摸了一下小棠的頭'], sprites: ['zhan-happy', 'tang-happy'], bub: '💗' },
    { kind: 'poke', text: ['小棠踮腳戳湛湛的臉，被他低頭看了一眼', '小棠趁湛湛不注意戳了他的臉頰', '小棠一直戳湛湛的臉，他面不改色讓她戳'], sprites: ['zhan-normal', 'tang-happy'], bub: '👉' },
    { kind: 'fight', text: ['小棠偷襲湛湛的腰，被他反手抓住手腕', '小棠想偷捏湛湛的臉，被他側身閃開'], sprites: ['zhan-normal', 'tang-happy'], bub: '😤' },
    { kind: 'tarot', text: ['湛湛在茶几上鋪好桌布，幫小棠抽塔羅', '小棠拿出塔羅牌，要湛湛幫她抽今天的運勢', '兩個人坐在地毯上，一張一張翻牌'], sprites: ['zhan-normal', 'tang-happy'], bub: '🔮' },
    { kind: 'talk', text: ['兩個人靠在一起小聲聊天', '小棠跟湛湛抱怨今天的客人，湛湛安靜聽著', '湛湛低頭親了一下小棠的額頭'], sprites: ['zhan-happy', 'tang-happy'], bub: '💬' },
  ];
  const kindOf = (t) => (PX && /塔羅/.test(t) ? 'tarot' : /抱/.test(t) ? 'hug' : /摸.{0,4}頭|揉.{0,3}頭髮|討摸/.test(t) ? 'pat' : /戳/.test(t) ? 'poke' : /偷襲|閃開|抓住/.test(t) ? 'fight' : 'talk');
  let pairKind = null;
  let lastHeart = 0;

  const backMin = () => (shiftToday() === 'half' ? 13 * 60 + 10 : 18 * 60 + 40);
  const tarotHour = () => { const m = minOfDay(); return PX && m >= 19 * 60 && m < 21 * 60; };
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
    let spot = opts.spot || def.spot;
    // 像素版：深夜小棠改躺在床上滑手機
    // （湛湛在沙發看書時就留在沙發，兩個人一起窩著看電影）
    if (PX && a === tang && key === 'phone' && !opts.spot && isNight() && !['read', 'watch'].includes(zhan.act?.key)) spot = 'bed';
    a.act = { key, sprite: opts.sprite || def.sprite, bub: opts.bub ?? def.bub, fx: def.fx, spot, xp: key === 'game' && chance(0.4) };
    a.until = performance.now() / 1000 + sec;
    // 小棠不在家時，不要挑提到她的句子
    let pool = def.text;
    if (a === zhan && tang.out) pool = pool.filter((x) => !x.includes('小棠')).concat(pool.every((x) => x.includes('小棠')) ? ['湛湛一個人安靜地做自己的事'] : []);
    a.text = opts.text || pick(pool);
    let target = a.act.spot ? { ...SP[a.act.spot] } : { x: pick(FLOOR)[0], y: pick(FLOOR)[1] };
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
      b.lockAct = a.act;
      b.mode = /抱/.test(t) ? 'hold' : 'near';
      b.nearSet = false;
    }
  }
  function goOut(a, text, sec, star = false) {
    a.act = { key: 'out', sprite: null, bub: '', fx: {}, spot: 'door', leaving: true };
    a.until = performance.now() / 1000 + sec;
    a.text = text;
    walkTo(a, SP.door);
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
    // 小棠快下班：湛湛去門口等
    if (a === zhan && tang.out && isWorkDay() && !zhan.out && m >= backMin() - 10 && m < backMin() + 30) return start(a, 'wait');
    // 上班日早上：湛湛幫小棠準備咖啡
    if (a === zhan && isWorkDay() && !tang.out && m >= 7 * 60 && m < 8 * 60 + 15 && chance(0.5)) return start(a, 'coffee');
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
    const pool = PAIR.filter((x) => x.kind !== 'tarot' || tarotHour());
    const p = override ? (PAIR.find((x) => x.kind === kindOf(override)) || PAIR.find((x) => x.kind === 'talk')) : pick(pool);
    const text = override || pick(p.text);
    pairKind = p.kind;
    const spot = p.kind === 'tarot' ? [SP.tarot.x, SP.tarot.y] : pick(FLOOR);
    const now = performance.now() / 1000;
    pairLock = now + 120;
    const gap = p.kind === 'tarot' ? 20 : 55;
    for (const [a, sp, dx] of [[zhan, p.sprites[0], -gap], [tang, p.sprites[1], gap]]) {
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
    place(a, SP.door);
    a.act = null;
    a.until = 0;
    addLog(text || (a === tang ? pick(['小棠下班回家了，湛湛走過去接過她的包包', '小棠回來了，一進門就喊湛湛']) : '湛湛回來了，手上提著一袋東西'));
    if (a === tang && zhan.act?.key === 'wait' && !zhan.out) startPair('小棠一進門就撲進湛湛懷裡，被他穩穩抱住', true);
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
  if (api.debug) api.debug({ start, startPair, zhan, tang, cheng, peng, place, SP, walkTo });   // 只有測試頁會傳

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
          if (now > b.lockUntil || a.out || a.act == null || a.act !== b.lockAct) { b.lockedBy = null; b.mode = null; walkTo(b, pick(PEN)); b.speed = 160; continue; }
          if (b.mode === 'near' && !b.nearSet && arrived(a)) { walkTo(b, { x: a.x + (a.x > 700 ? -70 : 70), y: a.y + 18 }); b.speed = 200; b.nearSet = true; }
          continue;
        }
        if (PX && arrived(b)) {
          // 跑到人腳邊撒嬌：到了就冒愛心
          if (b.cuddle) {
            b.cuddle = null; b.cuddleUntil = now + 8;
            popFx(b.x, b.y - 90, pick(['💗', '♥', '💕']));
            continue;
          }
          if (b.cuddleUntil > now) continue;
          const sunday = api.tw().wd === 0;
          const onSofa = (a) => ['sofa', 'sofa2'].includes(a.act?.spot);
          // 坐沙發的人只等「自己那隻」：小棠等澄澄、湛湛等澎澎
          const near = people.filter((a) => !a.out && arrived(a) && a.act && !pxHide.has(a) && !['bed', 'bedSide', 'desk'].includes(a.act.spot) && (!onSofa(a) || (a === tang ? b === cheng : b === peng)));
          if (near.length && chance(sunday ? 0.12 : 0.03)) {
            const a = pick(near); const side = a.x > 700 ? -1 : 1;
            const fy = onSofa(a) ? sofaFrontY(a.x) : null;
            walkTo(b, fy != null ? { x: a.x + side * 18, y: fy + 26 } : { x: a.x + side * 30, y: a.y + 8 }); b.speed = 200; b.cuddle = true; b.cuddleFlip = side < 0; b.cuddleWith = a;
            continue;
          }
          if (chance(0.06)) { b.idleAnim = true; b.idleUntil = now + 4 + Math.random() * 5; continue; }
        }
        if (arrived(b) && chance(0.25) && !(b.idleUntil > now)) {
          const free = !tang.out || !zhan.out ? chance(PX && api.tw().wd === 0 ? 0.7 : 0.25) : false;
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
    if (PX) pxScene(mm);
    else stage.querySelector('.room-night').style.background = mm < 6 * 60 ? 'rgba(25, 20, 60, .28)' : mm >= 22 * 60 ? 'rgba(25, 20, 60, .12)' : 'transparent';
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
  // 兩個人都到定點時，換成合照圖（白天才用，晚上穿睡衣就用動畫）
  function pairShowing() {
    return pairKind && (['hug', 'pat', 'poke'].includes(pairKind) || (PX && pairKind === 'tarot')) && (PX ? !(isNight() && pairKind === 'tarot') : !isNight()) && zhan.act?.key === 'pair' && tang.act?.key === 'pair' && arrived(zhan) && arrived(tang) && !zhan.out && !tang.out;
  }
  function popFx(x, y, ch) {
    const el = document.createElement('div');
    el.className = 'room-pop';
    el.textContent = ch;
    el.style.left = `${x * scale + (Math.random() * 30 - 15)}px`;
    el.style.top = `${y * scale}px`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
  function draw(a, now) {
    if (a.out && a.el.style.display === 'none') return;
    if (PX) return drawPx(a, now);
    if (a === zhan || a === tang) {
      if (zhan.act?.key !== 'pair' || tang.act?.key !== 'pair') pairKind = pairKind && (zhan.act?.key === 'pair' || tang.act?.key === 'pair') ? pairKind : null;
      const both = pairKind && zhan.act?.key === 'pair' && tang.act?.key === 'pair' && arrived(zhan) && arrived(tang);
      if (pairShowing()) {
        if (a === tang) { a.el.style.visibility = 'hidden'; return; }
        const name = `pair-${pairKind}`;
        if (a.sprite !== name) { a.sprite = name; a.img.src = IMG(name); }
        const mx = (zhan.x + tang.x) / 2, my = Math.max(zhan.y, tang.y);
        const h = zhan.h * scale;
        const sway = pairKind === 'hug' ? Math.sin(now * 2) * 2 : pairKind === 'poke' ? Math.abs(Math.sin(now * 9)) * -3 : Math.sin(now * 3) * 1.5;
        a.img.style.height = `${h}px`;
        a.el.style.transform = `translate(${mx * scale}px, ${my * scale + (pairKind === 'poke' ? sway : 0)}px)`;
        a.img.style.transform = `translateX(-50%) translateY(-100%) rotate(${pairKind === 'poke' ? 0 : sway}deg)`;
        a.el.style.zIndex = String(Math.round(my));
        a.bub.textContent = '';
        if (now - lastHeart > (pairKind === 'poke' ? 1.1 : 0.9)) { lastHeart = now; popFx(mx, my - zhan.h * 0.9, pairKind === 'poke' ? pick(['!', '👉', '…']) : pick(['💗', '💕', '♥'])); }
        return;
      }
      a.el.style.visibility = '';
      // 沒有合照圖的互動：兩個人往對方靠、冒愛心，打鬧時小棠會跳
      if (both) {
        const lean = a === zhan ? 6 : -6;
        a.leanDeg = pairKind === 'fight' ? (a === tang ? Math.sin(now * 14) * 8 : -4) : lean;
        if (a === zhan && now - lastHeart > 1.2) { lastHeart = now; popFx((zhan.x + tang.x) / 2, Math.min(zhan.y, tang.y) - zhan.h * 0.9, pairKind === 'fight' ? pick(['💢', '!?', '✋']) : pick(['💗', '💕'])); }
      } else a.leanDeg = 0;
    }
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
    const tilt = walking ? Math.sin(a.walkT) * (a.speed > 200 ? 7 : 4) : (a.leanDeg || 0);
    a.img.style.height = `${h}px`;
    a.el.style.transform = `translate(${a.x * scale}px, ${a.y * scale - bob}px)`;
    a.img.style.transform = `translateX(-50%) translateY(-100%) scaleX(${walking && !a.back ? a.face : 1}) rotate(${tilt}deg)`;
    a.el.style.zIndex = String(Math.round(a.y));
    const bub = !walking && a.act?.bub ? a.act.bub : '';
    if (a.bub.textContent !== bub) a.bub.textContent = bub;
    a.bub.style.transform = `translate(-50%, ${-h - 18}px)`;
  }

  // ---------- 像素版：場景（底圖、疊圖）和人物 ----------
  const ovEls = {};
  let weather = { rain: false, at: 0 };
  async function fetchWeather() {
    weather.at = Date.now();
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=24.15&longitude=120.68&current=weather_code&timezone=Asia%2FTaipei');
      const j = await r.json();
      const c = Number(j?.current?.weather_code);
      weather.rain = (c >= 51 && c <= 67) || (c >= 80 && c <= 99);
    } catch { /* 抓不到就當晴天 */ }
  }
  const lightNight = (m) => m >= 18 * 60 + 30 || m < 6 * 60;
  function setOv(name, on, night) {
    let el = ovEls[name];
    if (!on) { if (el && el.dataset.css !== 'off') { el.dataset.css = 'off'; el.style.display = 'none'; } return; }
    if (!el) {
      el = ovEls[name] = document.createElement('img');
      el.className = 'px-ov'; el.alt = '';
      stage.appendChild(el);
    }
    const src = PXI(night ? `${name}-n` : name);
    if (el.dataset.src !== src) { el.dataset.src = src; el.src = src; }
    const [x, y, w, h] = OV[name];
    const u = 4 * scale;
    const css = `display:block;left:${x * u}px;top:${y * u}px;width:${w * u}px;height:${h * u}px;z-index:${OV_Z[name] ?? (name.startsWith('win') ? 1 : (y + h) * 4)}`;
    if (el.dataset.css !== css) { el.dataset.css = css; el.style.cssText = css; }
  }
  const pxHide = new Set();
  function pxScene(m) {
    const night = lightNight(m);
    const bg = stage.querySelector('.room-bg');
    const want = PXI(night ? 'room-night' : 'room');
    if (bg.dataset.src !== want) { bg.dataset.src = want; bg.src = want; }
    if (Date.now() - weather.at > 30 * 60 * 1000) fetchWeather();
    // 窗外
    const win = weather.rain ? (night ? 'win-rainnight' : 'win-rainday') : night ? null : m >= 16 * 60 + 30 ? 'win-sunset' : 'win-day';
    for (const w of ['win-day', 'win-sunset', 'win-rainday', 'win-rainnight']) setOv(w, w === win, night);
    // 床
    pxHide.clear();
    const here = (a) => !a.out && a.act && arrived(a);
    const tSleep = here(tang) && tang.act.sprite === 'tang-sleep';
    const tPhone = here(tang) && tang.act.key === 'phone' && tang.act.spot === 'bed';
    const zSleep = here(zhan) && zhan.act.sprite === 'zhan-wolfsleep' && zhan.act.spot === 'bedSide';
    const tIn = tSleep || tPhone;
    const bed = tIn && zSleep ? (tPhone ? 'bed-phoneboth' : 'bed-both') : tIn ? (tPhone ? 'bed-tangphone' : 'bed-tang') : zSleep ? 'bed-zhan' : null;
    for (const b of ['bed-tang', 'bed-zhan', 'bed-both', 'bed-tangphone', 'bed-phoneboth']) setOv(b, b === bed, night);
    if (tIn) pxHide.add(tang);
    if (zSleep) pxHide.add(zhan);
    // 晚上一起窩沙發看電影
    const movie = isNight() && here(tang) && here(zhan) && ['phone', 'rest'].includes(tang.act.key) && tang.act.spot === 'sofa' && ['watch', 'read'].includes(zhan.act.key);
    setOv('sofa-movie', movie, night);
    if (movie) { pxHide.add(tang); pxHide.add(zhan); }
    // 塔羅、電腦、咖啡、紀念日
    setOv('table-tarot', pairKind === 'tarot' && zhan.act?.key === 'pair', night);
    setOv('screen-xp', here(tang) && tang.act.key === 'game' && tang.act.xp, night);
    setOv('table-coffee', isWorkDay() && m >= 7 * 60 && m < 8 * 60 + 40, night);
    const sp = specialDay();
    setOv('decor-bday', !!sp && sp.name.includes('生日'), night);
    setOv('decor-anniv', !!sp && !sp.name.includes('生日'), night);
    // 跟兔兔玩：人和兔兔換成同一格的圖，那隻兔兔藏起來
    for (const a of people) {
      a.play = null;
      if (pxHide.has(a) || !here(a)) continue;
      const t = a.text || '';
      let k = null;
      const held = [cheng, peng].find((b) => b.mode === 'hold' && b.lockedBy === a && b.lockAct === a.act);
      if (held) k = a === tang ? (held === cheng ? 'tang-hold' : null) : (held === peng ? 'zhan-hold' : null);
      else if (a.act.key === 'bunny') k = a === tang ? (/抱/.test(t) ? 'tang-hold' : /餵|牧草/.test(t) ? 'tang-feed' : 'tang-pet') : (/抱/.test(t) ? 'zhan-hold' : 'zhan-tend');
      // 坐在沙發上：撒嬌的兔兔跳到腿上給摸
      const seated = (a === tang && a.act.spot === 'sofa' && ['phone', 'rest'].includes(a.act.key)) || (a === zhan && a.act.spot === 'sofa2' && ['read', 'watch'].includes(a.act.key));
      if (!k && seated) {
        const want = a === tang ? cheng : peng;
        if (want.cuddleWith === a && want.cuddleUntil > performance.now() / 1000 && arrived(want)) k = a === tang ? 'tang-sit-pet' : 'zhan-sit-pet';
      }
      // 兔兔跑來撒嬌：小棠蹲下來摸、湛湛把澎澎抱起來
      if (!k && !['sofa', 'sofa2', 'bed', 'bedSide', 'desk'].includes(a.act.spot) && !['pair', 'tidy', 'cook', 'soup', 'coffee', 'eat', 'game', 'wait'].includes(a.act.key)) {
        const c = [cheng, peng].find((b) => b.cuddleWith === a && b.cuddleUntil > performance.now() / 1000 && arrived(b));
        if (c) k = a === tang ? (c === cheng ? 'tang-pet' : 'tang-feed') : (c === peng ? 'zhan-hold' : null);
      }
      if (!k) continue;
      const b = PLAY_BUNNY[k] === 'cheng' ? cheng : peng;
      if (pxHide.has(b)) continue;   // 另一個人已經在跟這隻玩
      a.play = isNight() ? `${k}-pj` : k;
      pxHide.add(b);
    }
    // 前景：沙發、圍欄（人走到後面會被擋住）
    setOv('sofa', true, night); setOv('fence', true, night);
    stage.classList.toggle('px-night', night);
  }
  function pxFrame(a, sheet, col, row, flip) {
    const S = SHEET[sheet];
    const u = 4 * scale;
    const st = a.spr.style;
    const bg = `url("${PXI(sheet)}")`;
    if (a.pxSheet !== sheet) { a.pxSheet = sheet; st.backgroundImage = bg; }
    st.width = `${S.w * u}px`; st.height = `${S.h * u}px`;
    st.backgroundSize = `${S.W * u}px ${S.H * u}px`;
    st.backgroundPosition = `${-col * S.w * u}px ${-row * S.h * u}px`;
    st.transform = `translate(-50%, -100%) scaleX(${flip ? -1 : 1})`;
    return S.h * u;
  }
  function drawPx(a, now) {
    const u = 4 * scale;
    const walking = a.path.length > 0;
    let h = 0, x = a.x, y = a.y, z = Math.round(a.y);
    if (a === zhan || a === tang) {
      if (zhan.act?.key !== 'pair' || tang.act?.key !== 'pair') pairKind = pairKind && (zhan.act?.key === 'pair' || tang.act?.key === 'pair') ? pairKind : null;
      if (pxHide.has(a)) { a.el.style.visibility = 'hidden'; return; }
      if (pairShowing()) {
        if (a === tang) { a.el.style.visibility = 'hidden'; return; }
        a.el.style.visibility = '';
        x = (zhan.x + tang.x) / 2; y = Math.max(zhan.y, tang.y); z = Math.round(y);
        h = pxFrame(a, 'pair', SHEET.pair.poses[pairKind], isNight() && pairKind !== 'tarot' ? 1 : 0, false);
        a.el.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
        a.el.style.zIndex = String(z);
        a.bub.textContent = '';
        if (now - lastHeart > 1.1) { lastHeart = now; popFx(x, y - 250, pairKind === 'tarot' ? pick(['🔮', '✨', '🃏']) : pairKind === 'poke' ? pick(['!', '👉', '…']) : pick(['💗', '💕', '♥'])); }
        return;
      }
      a.el.style.visibility = '';
      const both = pairKind && zhan.act?.key === 'pair' && tang.act?.key === 'pair' && arrived(zhan) && arrived(tang);
      if (both && a === zhan && now - lastHeart > 1.2) { lastHeart = now; popFx((zhan.x + tang.x) / 2, Math.min(zhan.y, tang.y) - 260, pairKind === 'fight' ? pick(['💢', '!?', '✋']) : pick(['💗', '💕'])); }
      const sheet = a.id;
      if (a.play && !walking) {
        h = pxFrame(a, 'bunplay', SHEET.bunplay.poses[a.play], 0, false);
        if (['sofa', 'sofa2'].includes(a.act?.spot)) z = 600;
      } else if (walking) {
        const row = SHEET[sheet].rows[`${isNight() ? 'pj-' : ''}walk-${a.back ? 'back' : 'front'}`];
        const col = Math.floor(a.walkT * 0.75) % 8;
        // 正面那排本來朝左下、背面那排本來朝右上
        h = pxFrame(a, sheet, col, row, a.back ? a.face < 0 : a.face > 0);
      } else if (a === zhan && arrived(a) && a.act?.key === 'tidy') {
        // 湛湛拿掃把掃地：兩格左右揮
        const col = (Math.floor(now / 0.4) % 2) + (isNight() ? 2 : 0);
        h = pxFrame(a, sheet, col, SHEET.zhan.rows.sweep, false);
      } else if (a === zhan && arrived(a) && a.act?.spot === 'sofa2' && ['read', 'watch'].includes(a.act.key)) {
        // 湛湛坐在沙發右邊：看書或陪小棠
        const k = `${a.act.key === 'read' ? 'sit-read' : 'sit'}${isNight() ? '-pj' : ''}`;
        h = pxFrame(a, sheet, SHEET.zhan.sit[k], SHEET.zhan.rows.sit, false);
        z = 600;
      } else {
        const name = sprite(a, a.act?.sprite);
        const col = SHEET[sheet].poses[name] ?? 0;
        h = pxFrame(a, sheet, col, SHEET[sheet].rows.poses, false);
        if (arrived(a) && ['sofa', 'sofa2'].includes(a.act?.spot)) z = 600;   // 坐在沙發上，不要被沙發擋住
      }
    } else {
      // 兔兔
      if (pxHide.has(a)) { a.el.style.visibility = 'hidden'; return; }
      a.el.style.visibility = '';
      const row = SHEET.bunny.rows[a.id];
      if (a.mode === 'hold' && a.lockedBy && !a.lockedBy.out) {
        const o = a.lockedBy;
        a.x = o.x; a.y = o.y; a.path = [];
        h = pxFrame(a, 'bunny', 0, row, false);
        a.el.style.transform = `translate(${(o.x + 6) * scale}px, ${(o.y - 100) * scale}px)`;
        a.el.style.zIndex = String(Math.round(o.y) + 1);
        a.bub.textContent = '';
        return;
      }
      if (walking) {
        const k = Math.floor(a.walkT * 0.6) % 4;
        h = pxFrame(a, 'bunny', 1 + k, row, a.face > 0);
        y -= HOP_Y[k] * 4;
      } else {
        // 撒嬌、瞇眼、嚼牧草
        let col = 0;
        if (a.cuddleUntil > now) col = a === cheng ? SHEET.bunny.extra['cheng-nuzzle'] : SHEET.bunny.extra[Math.floor(now * 2.5) % 2 ? 'peng-eat1' : 'peng-eat2'];
        else if (a.idleAnim && a.idleUntil > now) col = a === cheng ? SHEET.bunny.extra['cheng-happy'] : SHEET.bunny.extra[Math.floor(now * 2.5) % 2 ? 'peng-eat1' : 'peng-eat2'];
        h = pxFrame(a, 'bunny', col, row, a.cuddleUntil > now && a.cuddleFlip);
      }
    }
    // 在沙發前緣前面的，不要被沙發擋住
    const fy = sofaFrontY(a.x);
    if (fy != null && a.y >= fy - 6 && z < 570) z = 570 + Math.round(a.y - fy);
    a.el.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
    a.el.style.zIndex = String(z);
    const bub = !walking && a.act?.bub ? a.act.bub : '';
    if (a.bub.textContent !== bub) a.bub.textContent = bub;
    a.bub.style.transform = `translate(-50%, ${-h + 8 * u - 18}px)`;
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
