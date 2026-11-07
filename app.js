import { petSVG } from './pet.js';

const VERSION = '0.1.0';

// ================= 小工具 =================
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 私密模式 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ================= 台灣時間 =================
const WD = ['日', '一', '二', '三', '四', '五', '六'];
function tw(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  const y = +p.year, m = +p.month, day = +p.day;
  return { y, m, d: day, h: +p.hour, mi: +p.minute, wd: new Date(Date.UTC(y, m - 1, day)).getUTCDay(), date: `${p.year}-${p.month}-${p.day}`, month: `${p.year}-${p.month}` };
}
const todayStr = () => tw().date;
const hm = (iso) => { const t = tw(new Date(iso)); return `${String(t.h).padStart(2, '0')}:${String(t.mi).padStart(2, '0')}`; };
function dateLabel(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}（${WD[wd]}）`;
}
const dayNum = (ds) => { const [y, m, d] = ds.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
function shiftMonth(key, delta) {
  let [y, m] = key.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}
const monthTitle = (key) => { const [y, m] = key.split('-').map(Number); return `${y} 年 ${m} 月`; };

// ================= 設定 =================
const settings = Object.assign({ token: '', repo: 'KFC-666/xiaotang-space', branch: 'master' }, LS.get('zh-settings', {}));
const saveSettings = () => LS.set('zh-settings', settings);
let sync = { state: settings.token ? 'idle' : 'off', msg: settings.token ? '' : '還沒連線' };
function setSync(state, msg) { sync = { state, msg }; if (currentTab === 'us') renderUs(); }

// ================= GitHub =================
function b64enc(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const b64dec = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

class GHError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const gh = {
  async api(method, path, { body, headers = {} } = {}) {
    const res = await fetch(`https://api.github.com/repos/${settings.repo}/${path}`, {
      method,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${settings.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  },
  async fail(res) {
    let msg = `${res.status}`;
    try { msg += ` ${(await res.json()).message || ''}`; } catch { /* */ }
    if (res.status === 401) msg = '金鑰無效或過期（401）';
    if (res.status === 403) msg = '金鑰權限不夠（403）';
    if (res.status === 404) msg = '找不到 repo，或金鑰沒有這個 repo 的權限（404）';
    return new GHError(res.status, msg);
  },
  async getFile(path) {
    const res = await this.api('GET', `contents/${encPath(path)}?ref=${encodeURIComponent(settings.branch)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw await this.fail(res);
    const j = await res.json();
    return { text: b64dec(j.content || ''), sha: j.sha };
  },
  async getRaw(path, etag) {
    const res = await this.api('GET', `contents/${encPath(path)}?ref=${encodeURIComponent(settings.branch)}`, {
      headers: { Accept: 'application/vnd.github.raw', ...(etag ? { 'If-None-Match': etag } : {}) },
    });
    if (res.status === 304) return { notModified: true };
    if (res.status === 404) return { text: '', etag: null, missing: true };
    if (!res.ok) throw await this.fail(res);
    return { text: await res.text(), etag: res.headers.get('ETag') };
  },
  async put(path, text, sha, message) {
    const body = { message, content: b64enc(text), branch: settings.branch };
    if (sha) body.sha = sha;
    const res = await this.api('PUT', `contents/${encPath(path)}`, { body });
    if (!res.ok) throw await this.fail(res);
    const j = await res.json();
    return j.content?.sha;
  },
  async activeRuns() {
    const res = await this.api('GET', 'actions/workflows/zhan-chat.yml/runs?per_page=5');
    if (!res.ok) return null;
    const j = await res.json();
    return (j.workflow_runs || []).filter((r) => r.status !== 'completed');
  },
};

// ================= 資料（存在 repo 的 home/data/） =================
const DOCS = {
  pet: { path: 'home/data/pet.json', msg: 'App：小湛', def: () => ({ name: '小湛', full: 70, mood: 70, love: 0, updated: new Date().toISOString(), log: [] }) },
  ledger: { path: 'home/data/ledger.json', msg: 'App：記帳', def: () => ({ entries: [] }) },
  mood: { path: 'home/data/mood.json', msg: 'App：心情', def: () => ({ entries: [] }) },
  config: { path: 'home/data/config.json', msg: 'App：設定', def: () => ({ together: '', married: '', dates: [] }), readonly: true },
};
const store = { data: {}, sha: {}, dirty: {}, timer: {} };
for (const k of Object.keys(DOCS)) {
  store.data[k] = LS.get(`zh-doc-${k}`, null) || DOCS[k].def();
  store.sha[k] = LS.get(`zh-sha-${k}`, null);
  store.dirty[k] = LS.get(`zh-dirty-${k}`, false);
}
function persistLocal(k) {
  LS.set(`zh-doc-${k}`, store.data[k]);
  LS.set(`zh-sha-${k}`, store.sha[k]);
  LS.set(`zh-dirty-${k}`, store.dirty[k]);
}
async function pullDoc(k) {
  if (store.dirty[k]) return pushDoc(k);
  const f = await gh.getFile(DOCS[k].path);
  if (f) {
    try { store.data[k] = JSON.parse(f.text); } catch { /* 壞掉就用本機的 */ }
    store.sha[k] = f.sha;
  } else store.sha[k] = null;
  persistLocal(k);
}
function saveDoc(k) {
  store.dirty[k] = true;
  persistLocal(k);
  clearTimeout(store.timer[k]);
  store.timer[k] = setTimeout(() => pushDoc(k).catch(() => {}), 1500);
}
async function pushDoc(k) {
  if (!settings.token || !store.dirty[k]) return;
  const text = JSON.stringify(store.data[k], null, 1);
  try {
    store.sha[k] = await gh.put(DOCS[k].path, text, store.sha[k], DOCS[k].msg);
  } catch (e) {
    if (e.status === 409 || e.status === 422) {
      const f = await gh.getFile(DOCS[k].path);
      store.sha[k] = await gh.put(DOCS[k].path, text, f?.sha, DOCS[k].msg);
    } else { setSync('err', e.message); throw e; }
  }
  store.dirty[k] = false;
  persistLocal(k);
  setSync('ok', `已同步 ${hm(new Date().toISOString())}`);
}

// ================= 分頁 =================
let currentTab = LS.get('zh-tab', 'chat');
const TITLES = { pet: '小湛', ledger: '記帳', mood: '心情', us: '我們' };
function renderTopbar() {
  const tb = $('#topbar');
  if (currentTab === 'chat') {
    const st = chatStatus();
    tb.innerHTML = `<div class="avatar">${petSVG({ head: true, face: 'normal' })}</div>
      <div class="who"><h1>湛湛</h1><div class="sub">${esc(st)}</div></div>`;
  } else {
    tb.innerHTML = `<h1>${TITLES[currentTab]}</h1>`;
  }
}
function switchTab(tab) {
  currentTab = tab;
  LS.set('zh-tab', tab);
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${tab}`));
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  renderTopbar();
  ({ chat: renderChat, pet: renderPet, ledger: renderLedger, mood: renderMood, us: renderUs })[tab]?.(true);
}
$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) switchTab(b.dataset.tab);
});

// ================= 底部面板 =================
function openSheet(html, mount) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').classList.add('open');
  $('#sheet-backdrop').classList.add('open');
  mount?.($('#sheet-body'));
}
function closeSheet() {
  $('#sheet').classList.remove('open');
  $('#sheet-backdrop').classList.remove('open');
}
$('#sheet-backdrop').addEventListener('click', closeSheet);

// ================= 聊天 =================
const chat = {
  log: LS.get('zh-chat-cache', []),
  pending: LS.get('zh-pending', []),
  etag: null,
  etagMonth: null,
  prev: null,
  runs: null,
  timer: null,
};
const savePending = () => LS.set('zh-pending', chat.pending);
const parseJSONL = (t) => t.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const waiting = () => chat.pending.some((p) => p.st === 'sent');

function chatStatus() {
  if (!settings.token) return '還沒連線';
  if (chat.pending.some((p) => p.st === 'sending')) return '傳送中…';
  if (waiting()) {
    if (chat.runs?.some((r) => r.status === 'in_progress')) return '正在輸入…';
    return '訊息送到了';
  }
  return '';
}

async function loadChat() {
  const key = tw().month;
  if (chat.etagMonth !== key) { chat.etag = null; chat.etagMonth = key; }
  const r = await gh.getRaw(`home/data/chat/${key}.jsonl`, chat.etag);
  if (r.notModified) return false;
  chat.etag = r.etag;
  let items = parseJSONL(r.text);
  if (items.length < 40) {
    if (!chat.prev) {
      const p = await gh.getRaw(`home/data/chat/${shiftMonth(key, -1)}.jsonl`);
      chat.prev = parseJSONL(p.text || '');
    }
    items = [...chat.prev, ...items];
  }
  chat.log = items.slice(-300);
  LS.set('zh-chat-cache', chat.log);
  const ids = new Set(chat.log.map((m) => m.id));
  const before = chat.pending.length;
  chat.pending = chat.pending.filter((p) => !ids.has(p.id));
  if (chat.pending.length !== before) savePending();
  return true;
}

function schedulePoll(ms) {
  clearTimeout(chat.timer);
  if (!settings.token || document.hidden) return;
  chat.timer = setTimeout(pollChat, ms ?? (waiting() ? 4000 : 30000));
}
async function pollChat() {
  try {
    const changed = await loadChat();
    if (waiting()) chat.runs = await gh.activeRuns();
    else chat.runs = null;
    if (changed) renderChat(); else if (currentTab === 'chat') { renderTopbar(); renderTyping(); }
  } catch (e) {
    setSync('err', e.message);
  }
  schedulePoll();
}

async function deliver(m) {
  m.st = 'sending';
  savePending(); renderChat(true);
  for (let i = 0; i < 3; i++) {
    try {
      await gh.put(`home/inbox/${m.id}.json`, JSON.stringify({ id: m.id, text: m.text, time: m.time }), null, '小棠傳訊息');
      m.st = 'sent';
      break;
    } catch (e) {
      if (e.status === 422) { m.st = 'sent'; break; } // 檔案已經在了
      if (i === 2 || (e.status && e.status !== 409)) { m.st = 'fail'; m.err = e.message; }
      else await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  savePending(); renderChat(true);
  if (m.st === 'fail') toast(`沒送出去：${m.err}`);
  schedulePoll(3000);
}
function sendMessage(text) {
  if (!settings.token) { toast('先到「我們」分頁貼上金鑰'); return; }
  const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const m = { id, text, time: new Date().toISOString(), st: 'sending' };
  chat.pending.push(m);
  deliver(m);
}

function fmtText(t) {
  return esc(t).replace(/（[^（）\n]{0,200}）/g, (s) => `<span class="act">${s}</span>`);
}
let miniHead;
function renderTyping() {
  const box = $('#typing-row');
  if (box) box.style.display = waiting() ? '' : 'none';
}
function renderChat(forceBottom) {
  if (currentTab !== 'chat') return;
  renderTopbar();
  const sc = $('#chat-scroll');
  const nearBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 120;
  const list = $('#chat-list');
  miniHead ||= petSVG({ head: true });
  const all = [...chat.log, ...chat.pending.map((p) => ({ ...p, role: 'user', pending: true }))];
  if (!all.length) {
    list.innerHTML = `<div class="chat-empty"><div class="big">${petSVG({ face: 'happy' })}</div>
      ${settings.token ? '想說什麼就說，我在。' : '還沒連線。到「我們」分頁貼上 GitHub 金鑰，就能跟我說話了。'}</div>`;
    return;
  }
  // 誰的訊息後面有我的回覆 → 已讀
  let lastZhan = -1;
  all.forEach((m, i) => { if (m.role === 'zhan') lastZhan = i; });
  let html = '';
  let lastDay = '';
  let prev = null;
  all.forEach((m, i) => {
    const day = tw(new Date(m.time)).date;
    if (day !== lastDay) { html += `<div class="day-sep">${dateLabel(day)}</div>`; lastDay = day; prev = null; }
    if (m.role === 'system') { html += `<div class="sys">${esc(m.text)}</div>`; prev = m; return; }
    const isMe = m.role === 'user';
    const showAv = !isMe && !(prev && prev.role === 'zhan' && new Date(m.time) - new Date(prev.time) < 5 * 60e3);
    const parts = isMe ? [m.text] : m.text.split(/\n\s*\n/).filter((x) => x.trim()).slice(0, 8);
    let st = '';
    if (isMe) {
      if (m.st === 'sending') st = '<span class="st">傳送中</span>';
      else if (m.st === 'fail') st = '<span class="st fail">沒送出・點泡泡重傳</span>';
      else if (!m.pending && i < lastZhan) st = '<span class="st">已讀</span>';
    }
    html += `<div class="row ${isMe ? 'me' : 'zhan'}">
      ${isMe ? '' : `<div class="mini ${showAv ? '' : 'spacer'}">${showAv ? miniHead : ''}</div>`}
      <div class="bubbles">${parts.map((p) => `<div class="bubble" ${m.st === 'fail' ? `data-retry="${esc(m.id)}"` : ''}>${fmtText(p.trim())}</div>`).join('')}</div>
      <div class="meta">${st}${hm(m.time)}</div>
    </div>`;
    prev = m;
  });
  html += `<div class="row zhan" id="typing-row" style="${waiting() ? '' : 'display:none'}"><div class="mini">${miniHead}</div><div class="bubbles"><div class="bubble typing"><i></i><i></i><i></i></div></div></div>`;
  list.innerHTML = html;
  if (forceBottom || nearBottom) sc.scrollTop = sc.scrollHeight;
}
$('#chat-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-retry]');
  if (!b) return;
  const m = chat.pending.find((p) => p.id === b.dataset.retry);
  if (m) deliver(m);
});

const input = $('#chat-input');
function autosize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  $('#send-btn').disabled = !input.value.trim();
}
input.addEventListener('input', () => { autosize(); LS.set('zh-draft', input.value); });
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('#composer').requestSubmit(); }
});
$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = input.value.trim();
  if (!t) return;
  input.value = '';
  LS.del('zh-draft');
  autosize();
  sendMessage(t);
});
input.value = LS.get('zh-draft', '');

// ================= 小湛 =================
const FOODS = [
  { e: '🍚', name: '滷肉飯', full: 35, mood: 5 },
  { e: '🍱', name: '便當', full: 40, mood: 6 },
  { e: '🍜', name: '牛肉麵', full: 38, mood: 7 },
  { e: '☕', name: '黑咖啡', full: 4, mood: 14 },
  { e: '🧋', name: '珍奶', full: 15, mood: 12 },
  { e: '🍰', name: '草莓蛋糕', full: 18, mood: 14 },
];
const LINES = {
  morning: ['早。', '早餐吃了沒？', '出門騎車慢一點。'],
  noon: ['快中午了，再一下就午休。', '中午想吃什麼？'],
  lunch: ['午休了，先去吃飯。', '吃飽了再來找我。'],
  afternoon: ['回去上班，晚點見。', '累了喝口水，我在這裡。'],
  holiday: ['今天休假，想做什麼？', '難得休假，過來讓我抱一下。'],
  evening: ['下班了？過來。', '今天辛苦了。'],
  night: ['要打遊戲就去，我在旁邊。', '（把妳的腳拉過來放在腿上）'],
  late: ['還沒睡？……過來，抱著睡。', '很晚了，累了就睡，我陪妳。'],
  hungry: ['……有點餓。', '妳是不是忘了餵我。'],
  sad: ['妳很久沒來了。', '（靠過來）想妳了。'],
  feed: ['嗯，好吃。', '妳吃了沒？一起吃。', '……妳餵的，都吃完。'],
  stuffed: ['飽了。換妳吃。', '（把湯匙轉過來餵妳）妳也吃。'],
  pat: ['（低頭讓妳摸）', '……再一下。', '（握住妳的手腕，往掌心蹭了一下）'],
  hug: ['（收緊手臂）抱到了。', '嗯，不放。', '（下巴靠在妳頭頂）'],
  poke: ['怎麼了？', '（看著妳）嗯？', '我在。'],
  sleep: ['嗯，一起睡。（把妳拉進被子裡）', '（關燈，把妳圈進懷裡）睡吧。'],
  asleep: ['（睡著了，呼吸很慢）', '（睡夢中把妳抱緊一點）'],
  wake: ['……嗯？（瞇著眼把妳拉過來）', '早。再躺五分鐘。'],
};
let petSay = '';
let petFlash = 0;

function petNow() {
  const p = store.data.pet;
  const h = Math.max(0, (Date.now() - new Date(p.updated).getTime()) / 36e5);
  const asleep = p.sleepUntil && new Date(p.sleepUntil) > new Date();
  const full = clamp((p.full ?? 70) - h * (asleep ? 1.5 : 4));
  const mood = clamp((p.mood ?? 70) - h * (asleep ? 0 : 2) - (full < 20 ? h : 0));
  return { full: Math.round(full), mood: Math.round(mood), love: p.love || 0, asleep };
}
function petLevel(love) { return { lv: 1 + Math.floor(love / 30), pct: Math.round(((love % 30) / 30) * 100) }; }
function timeLine() {
  const t = tw();
  const h = t.h;
  if (h >= 2 && h < 6) return pick(LINES.late);
  if (t.wd === 0 && h >= 9 && h < 18) return pick(LINES.holiday);
  if (h >= 6 && h < 11) return pick(LINES.morning);
  if (h >= 11 && h < 13) return pick(LINES.noon);
  if (h === 13) return pick(LINES.lunch);
  if (h >= 14 && h < 18) return pick(LINES.afternoon);
  if (h >= 18 && h < 22) return pick(LINES.evening);
  if (h >= 22 || h < 2) return pick(LINES.night);
  return pick(LINES.poke);
}
function petFace(s) {
  if (s.asleep) return 'sleep';
  if (Date.now() < petFlash) return 'happy';
  if (s.full < 30) return 'hungry';
  if (s.mood < 30) return 'sad';
  if (s.mood >= 75 && s.full >= 50) return 'happy';
  return 'normal';
}
function idleLine(s) {
  if (s.asleep) return pick(LINES.asleep);
  if (s.full < 30) return pick(LINES.hungry);
  if (s.mood < 30) return pick(LINES.sad);
  return timeLine();
}
function petAct(kind, food) {
  const p = store.data.pet;
  const s = petNow();
  const now = new Date();
  const day = todayStr();
  if (p.loveDay?.date !== day) p.loveDay = { date: day, n: 0 };
  const addLove = (n) => { const ok = Math.min(n, 30 - p.loveDay.n); if (ok > 0) { p.love = (p.love || 0) + ok; p.loveDay.n += ok; } };
  let full = s.full, mood = s.mood, text = '', line = '';
  const h = tw().h;
  if (kind === 'feed') {
    if (s.asleep) { toast('他睡著了，醒來再餵。'); return; }
    line = s.full >= 95 ? pick(LINES.stuffed) : pick(LINES.feed);
    full = clamp(full + food.full); mood = clamp(mood + food.mood); addLove(1);
    text = `餵了${food.name}`;
  } else if (kind === 'pat') {
    line = s.asleep ? '（睡夢中往妳手心蹭了一下）' : pick(LINES.pat);
    mood = clamp(mood + 6); addLove(1); text = '摸頭';
  } else if (kind === 'hug') {
    line = s.asleep ? '（迷迷糊糊把妳拉進懷裡）' : pick(LINES.hug);
    mood = clamp(mood + 10); addLove(2); text = '抱抱';
  } else if (kind === 'sleep') {
    if (s.asleep) {
      p.sleepUntil = null; line = pick(LINES.wake); text = '叫醒';
    } else {
      if (h >= 7 && h < 21) { petSay = '還早。陪妳。'; renderPet(); return; }
      const t = tw();
      // 睡到隔天 07:30（台灣）
      let wake = Date.UTC(t.y, t.m - 1, t.d, 7 - 8, 30);
      if (wake <= now.getTime()) wake += 864e5;
      p.sleepUntil = new Date(wake).toISOString();
      line = pick(LINES.sleep); mood = clamp(mood + 8); addLove(2); text = '哄睡';
    }
  }
  p.full = full; p.mood = mood; p.updated = now.toISOString();
  p.log = [...(p.log || []), { time: now.toISOString(), text }].slice(-30);
  petSay = line;
  petFlash = kind === 'sleep' && p.sleepUntil ? 0 : Date.now() + 2500;
  saveDoc('pet');
  renderPet();
  const fig = $('#pet-fig');
  if (fig) {
    fig.classList.remove('bounce'); void fig.offsetWidth; fig.classList.add('bounce');
    const heart = document.createElement('div');
    heart.className = 'float-heart';
    heart.textContent = kind === 'feed' ? food.e : kind === 'sleep' ? '🌙' : '💗';
    heart.style.left = `${40 + Math.random() * 40}%`;
    heart.style.top = '30%';
    fig.appendChild(heart);
    setTimeout(() => heart.remove(), 1500);
    setTimeout(() => { if (currentTab === 'pet') renderPet(); }, 2600);
  }
}
function renderPet(first) {
  if (currentTab !== 'pet') return;
  const root = $('#pet-root');
  const s = petNow();
  const t = tw();
  const night = t.h >= 21 || t.h < 7;
  if (first || !petSay) petSay = idleLine(s);
  const { lv, pct } = petLevel(s.love);
  const log = (store.data.pet.log || []).slice(-5).reverse();
  root.innerHTML = `
    <div class="pet-stage ${night ? 'night' : ''}">
      <svg class="stars" viewBox="0 0 300 200" preserveAspectRatio="none"><g fill="#fff" opacity=".7">
        <circle cx="30" cy="30" r="1.5"/><circle cx="80" cy="18" r="1"/><circle cx="250" cy="26" r="1.6"/><circle cx="210" cy="60" r="1"/><circle cx="40" cy="90" r="1"/><circle cx="270" cy="100" r="1.2"/></g>
        <path d="M262 40a14 14 0 1 1-12-22 11 11 0 0 0 12 22z" fill="#f6e7a8"/></svg>
      <div class="pet-say">${fmtText(petSay)}</div>
      <div class="pet-figure" id="pet-fig">${petSVG({ face: petFace(s), outfit: night ? 'wolf' : 'day' })}</div>
      <div class="pet-name">小湛 <span class="muted">Lv ${lv}</span></div>
    </div>
    <div class="card stats">
      <div class="stat"><span>飽足</span><div class="bar full"><i style="width:${s.full}%"></i></div><span class="num">${s.full}</span></div>
      <div class="stat"><span>心情</span><div class="bar"><i style="width:${s.mood}%"></i></div><span class="num">${s.mood}</span></div>
      <div class="stat"><span>親密</span><div class="bar love"><i style="width:${pct}%"></i></div><span class="num">Lv ${lv}</span></div>
    </div>
    <div class="pet-actions">
      <button data-act="feed"><span class="e">🍚</span>餵食</button>
      <button data-act="pat"><span class="e">🤚</span>摸頭</button>
      <button data-act="hug"><span class="e">🫂</span>抱抱</button>
      <button data-act="sleep"><span class="e">${s.asleep ? '☀️' : '🌙'}</span>${s.asleep ? '叫醒' : '哄睡'}</button>
    </div>
    ${log.length ? `<div class="card" style="margin-top:14px"><h2>最近</h2><div class="pet-log">${log.map((l) => `<div>${dateLabel(tw(new Date(l.time)).date)} ${hm(l.time)}・${esc(l.text)}</div>`).join('')}</div></div>` : ''}
  `;
}
$('#pet-root').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b) {
    const act = b.dataset.act;
    if (act === 'feed') {
      if (petNow().asleep) { toast('他睡著了，醒來再餵。'); return; }
      openSheet(`<h3>要餵小湛吃什麼？</h3><div class="food-grid">${FOODS.map((f, i) => `<button data-food="${i}"><span class="e">${f.e}</span>${f.name}<small>飽足 +${f.full}</small></button>`).join('')}</div>`, (body) => {
        body.addEventListener('click', (ev) => {
          const fb = ev.target.closest('[data-food]');
          if (!fb) return;
          closeSheet();
          petAct('feed', FOODS[+fb.dataset.food]);
        });
      });
    } else petAct(act);
    return;
  }
  if (e.target.closest('#pet-fig')) {
    const s = petNow();
    petSay = s.asleep ? pick(LINES.asleep) : pick([...LINES.poke, timeLine()]);
    renderPet();
  }
});

// ================= 記帳 =================
const EXP_CATS = [['餐飲', '🍱'], ['外送', '🥡'], ['飲料', '🧋'], ['交通', '⛽'], ['兔兔', '🐰'], ['日用', '🧴'], ['購物', '🛍️'], ['娛樂', '🎮'], ['醫療', '💊'], ['還款', '💳'], ['其他', '📦']];
const INC_CATS = [['薪水', '💰'], ['獎金', '🎁'], ['其他收入', '💵']];
const catIcon = (c) => ([...EXP_CATS, ...INC_CATS].find((x) => x[0] === c) || [0, '📦'])[1];
let ledgerMonth = tw().month;
const money = (n) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

function renderLedger() {
  if (currentTab !== 'ledger') return;
  const all = store.data.ledger.entries || [];
  const list = all.filter((e) => e.date?.startsWith(ledgerMonth)).sort((a, b) => (b.date + (b.created || '')).localeCompare(a.date + (a.created || '')));
  let out = 0, inc = 0; const cats = {};
  for (const e of list) { if (e.type === 'income') inc += e.amount; else { out += e.amount; cats[e.cat] = (cats[e.cat] || 0) + e.amount; } }
  const catArr = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const max = catArr[0]?.[1] || 1;
  const byDay = {};
  for (const e of list) (byDay[e.date] ||= []).push(e);
  $('#ledger-root').innerHTML = `
    <div class="month-nav"><button data-m="-1" aria-label="上個月">‹</button><strong>${monthTitle(ledgerMonth)}</strong><button data-m="1" aria-label="下個月">›</button></div>
    <div class="card sum3">
      <div><div class="k">支出</div><div class="v out">${money(out)}</div></div>
      <div><div class="k">收入</div><div class="v in">${money(inc)}</div></div>
      <div><div class="k">結餘</div><div class="v">${money(inc - out)}</div></div>
    </div>
    ${catArr.length ? `<div class="card"><h2>花在哪裡</h2><div class="catbars">${catArr.map(([c, v]) => `
      <div class="catbar"><span>${catIcon(c)} ${esc(c)}</span><div class="bar"><i style="width:${(v / max) * 100}%"></i></div><span class="num">${money(v)}</span></div>`).join('')}</div></div>` : ''}
    ${Object.keys(byDay).length ? Object.entries(byDay).map(([d, es]) => {
      const dayOut = es.filter((e) => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
      return `<div class="day-group"><div class="dh"><span>${dateLabel(d)}</span><span>${dayOut ? `支出 ${money(dayOut)}` : ''}</span></div>
        ${es.map((e) => `<button class="entry" data-id="${esc(e.id)}"><span class="ic">${catIcon(e.cat)}</span>
          <span class="tx"><b>${esc(e.note || e.cat)}</b><span>${esc(e.cat)}</span></span>
          <span class="amt v ${e.type === 'income' ? 'in' : 'out'}">${e.type === 'income' ? '+' : '-'}${money(e.amount)}</span></button>`).join('')}</div>`;
    }).join('') : '<p class="muted" style="text-align:center;margin-top:30px">這個月還沒有紀錄。</p>'}
    <div style="height:70px"></div>`;
}
$('#ledger-root').addEventListener('click', (e) => {
  const m = e.target.closest('[data-m]');
  if (m) { ledgerMonth = shiftMonth(ledgerMonth, +m.dataset.m); renderLedger(); return; }
  const it = e.target.closest('.entry');
  if (it) editEntry(store.data.ledger.entries.find((x) => x.id === it.dataset.id));
});
$('#ledger-add').addEventListener('click', () => editEntry(null));

function editEntry(entry) {
  const isNew = !entry;
  const e = entry ? { ...entry } : { type: 'expense', amount: '', cat: '餐飲', note: '', date: todayStr() };
  const draw = (body) => {
    const cats = e.type === 'income' ? INC_CATS : EXP_CATS;
    if (!cats.some((c) => c[0] === e.cat)) e.cat = cats[0][0];
    body.innerHTML = `
      <h3>${isNew ? '記一筆' : '修改'}</h3>
      <div class="seg"><button data-type="expense" class="${e.type !== 'income' ? 'on' : ''}">支出</button><button data-type="income" class="${e.type === 'income' ? 'on' : ''}">收入</button></div>
      <div class="field"><label>金額</label><input class="amount-input" id="le-amt" inputmode="numeric" pattern="[0-9]*" placeholder="0" value="${esc(e.amount)}"></div>
      <div class="chips">${cats.map(([c, ic]) => `<button data-cat="${esc(c)}" class="${e.cat === c ? 'on' : ''}">${ic} ${esc(c)}</button>`).join('')}</div>
      <div class="row2">
        <div class="field"><label>日期</label><input type="date" id="le-date" value="${esc(e.date)}"></div>
        <div class="field"><label>備註</label><input id="le-note" placeholder="例如：午餐" value="${esc(e.note)}"></div>
      </div>
      <div class="sheet-actions">${isNew ? '' : '<button class="btn danger" id="le-del">刪除</button>'}<button class="btn" id="le-save">儲存</button></div>`;
  };
  openSheet('', (body) => {
    draw(body);
    body.onclick = (ev) => {
      const keep = () => { e.amount = $('#le-amt').value; e.date = $('#le-date').value; e.note = $('#le-note').value; };
      const t = ev.target.closest('[data-type]');
      if (t) { keep(); e.type = t.dataset.type; draw(body); return; }
      const c = ev.target.closest('[data-cat]');
      if (c) { keep(); e.cat = c.dataset.cat; draw(body); return; }
      if (ev.target.closest('#le-del')) {
        if (!confirm('刪掉這筆？')) return;
        store.data.ledger.entries = store.data.ledger.entries.filter((x) => x.id !== e.id);
        saveDoc('ledger'); closeSheet(); renderLedger(); return;
      }
      if (ev.target.closest('#le-save')) {
        keep();
        const amt = Math.round(Number(String(e.amount).replace(/[^\d.]/g, '')));
        if (!amt || amt <= 0) { toast('金額要大於 0'); return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) { toast('日期怪怪的'); return; }
        const rec = { id: e.id || `l-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, date: e.date, type: e.type, amount: amt, cat: e.cat, note: e.note.trim(), created: e.created || new Date().toISOString() };
        const arr = store.data.ledger.entries || (store.data.ledger.entries = []);
        const i = arr.findIndex((x) => x.id === rec.id);
        if (i >= 0) arr[i] = rec; else arr.push(rec);
        saveDoc('ledger'); closeSheet();
        ledgerMonth = rec.date.slice(0, 7);
        renderLedger();
        toast(isNew ? '記好了' : '改好了');
      }
    };
    if (isNew) setTimeout(() => $('#le-amt')?.focus(), 250);
  });
}

// ================= 心情 =================
const MOODS = [
  { k: 'great', e: '🥰', l: '超好', z: '看妳開心，我也是。今天發生什麼好事？' },
  { k: 'good', e: '😊', l: '不錯', z: '不錯就好。晚點跟我說說。' },
  { k: 'ok', e: '😐', l: '普通', z: '普通的一天也很好。我在。' },
  { k: 'tired', e: '😪', l: '好累', z: '（把妳拉過來靠著）累就靠一下，事情我陪妳一起想。' },
  { k: 'down', e: '😞', l: '低落', z: '（抱住）過來。想說的話，我聽。' },
  { k: 'sad', e: '😭', l: '想哭', z: '（把妳整個抱進懷裡）先哭，哭完跟我說。' },
  { k: 'angry', e: '😤', l: '生氣', z: '誰惹妳了？說給我聽。' },
  { k: 'anxious', e: '😣', l: '焦慮', z: '（握住妳的手）一件一件來，我們一起看。' },
];
const NEED_TALK = new Set(['tired', 'down', 'sad', 'angry', 'anxious']);
let moodMonth = tw().month;
let moodJustSaved = null;
const moodOf = (k) => MOODS.find((m) => m.k === k);
const moodEntry = (d) => (store.data.mood.entries || []).find((x) => x.date === d);

function renderMood() {
  if (currentTab !== 'mood') return;
  const today = todayStr();
  const te = moodEntry(today);
  const [y, m] = moodMonth.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let cal = WD.map((w) => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < first; i++) cal += '<button class="blank" tabindex="-1"></button>';
  for (let d = 1; d <= days; d++) {
    const ds = `${moodMonth}-${String(d).padStart(2, '0')}`;
    const me = moodEntry(ds);
    cal += `<button data-day="${ds}" class="${ds === today ? 'today' : ''}">${me ? `<span class="e">${moodOf(me.k)?.e || '・'}</span>` : ''}${d}</button>`;
  }
  const notes = (store.data.mood.entries || []).filter((x) => x.date.startsWith(moodMonth)).sort((a, b) => b.date.localeCompare(a.date));
  const justZ = moodJustSaved && moodOf(moodJustSaved.k);
  $('#mood-root').innerHTML = `
    <div class="card">
      <h2>今天 ${dateLabel(today)} 心情怎麼樣？</h2>
      <div class="mood-pick">${MOODS.map((x) => `<button data-mood="${x.k}" class="${te?.k === x.k ? 'on' : ''}"><span class="e">${x.e}</span>${x.l}</button>`).join('')}</div>
      <div class="field"><textarea id="mood-note" rows="2" placeholder="想寫點什麼也可以（選填）">${esc(te?.note || '')}</textarea></div>
      <button class="btn block" id="mood-save">記下來</button>
      ${justZ ? `<div class="zhan-note"><div class="mini">${petSVG({ head: true, face: NEED_TALK.has(justZ.k) ? 'normal' : 'happy' })}</div><div style="flex:1">${fmtText(justZ.z)}
        ${NEED_TALK.has(justZ.k) ? '<div style="margin-top:8px"><button class="btn ghost" id="mood-talk">跟湛湛說</button></div>' : ''}</div></div>` : ''}
    </div>
    <div class="month-nav"><button data-mm="-1" aria-label="上個月">‹</button><strong>${monthTitle(moodMonth)}</strong><button data-mm="1" aria-label="下個月">›</button></div>
    <div class="card"><div class="cal">${cal}</div></div>
    ${notes.length ? `<div class="card"><h2>這個月</h2><div class="mood-list">${notes.map((n) => `<div class="mood-item"><span class="e">${moodOf(n.k)?.e || ''}</span><div class="tx">${esc(n.note || n.label)}<small>${dateLabel(n.date)}・${esc(n.label)}</small></div></div>`).join('')}</div></div>` : ''}
  `;
}
let moodPicked = null;
$('#mood-root').addEventListener('click', (e) => {
  const mb = e.target.closest('[data-mood]');
  if (mb) {
    moodPicked = mb.dataset.mood;
    document.querySelectorAll('.mood-pick button').forEach((b) => b.classList.toggle('on', b === mb));
    return;
  }
  if (e.target.closest('#mood-save')) {
    const k = moodPicked || moodEntry(todayStr())?.k;
    if (!k) { toast('先選一個心情'); return; }
    saveMood(todayStr(), k, $('#mood-note').value.trim());
    moodJustSaved = { k, note: $('#mood-note').value.trim() };
    moodPicked = null;
    renderMood();
    return;
  }
  if (e.target.closest('#mood-talk')) {
    const mo = moodOf(moodJustSaved.k);
    input.value = `今天心情${mo.l}${moodJustSaved.note ? `，${moodJustSaved.note}` : ''}`;
    autosize();
    switchTab('chat');
    input.focus();
    return;
  }
  const mm = e.target.closest('[data-mm]');
  if (mm) { moodMonth = shiftMonth(moodMonth, +mm.dataset.mm); renderMood(); return; }
  const day = e.target.closest('[data-day]');
  if (day) editMoodDay(day.dataset.day);
});
function saveMood(date, k, note) {
  const mo = moodOf(k);
  const arr = store.data.mood.entries || (store.data.mood.entries = []);
  const rec = { date, k, e: mo.e, label: mo.l, note, time: new Date().toISOString() };
  const i = arr.findIndex((x) => x.date === date);
  if (i >= 0) arr[i] = rec; else arr.push(rec);
  arr.sort((a, b) => a.date.localeCompare(b.date));
  saveDoc('mood');
}
function editMoodDay(ds) {
  const cur = moodEntry(ds);
  let k = cur?.k;
  openSheet(`<h3>${dateLabel(ds)}</h3>
    <div class="mood-pick">${MOODS.map((x) => `<button data-mk="${x.k}" class="${k === x.k ? 'on' : ''}"><span class="e">${x.e}</span>${x.l}</button>`).join('')}</div>
    <div class="field"><textarea id="md-note" rows="3" placeholder="那天發生什麼事？">${esc(cur?.note || '')}</textarea></div>
    <div class="sheet-actions">${cur ? '<button class="btn danger" id="md-del">刪除</button>' : ''}<button class="btn" id="md-save">儲存</button></div>`, (body) => {
    body.onclick = (ev) => {
      const b = ev.target.closest('[data-mk]');
      if (b) { k = b.dataset.mk; body.querySelectorAll('[data-mk]').forEach((x) => x.classList.toggle('on', x === b)); return; }
      if (ev.target.closest('#md-del')) {
        store.data.mood.entries = store.data.mood.entries.filter((x) => x.date !== ds);
        saveDoc('mood'); closeSheet(); renderMood(); return;
      }
      if (ev.target.closest('#md-save')) {
        if (!k) { toast('先選一個心情'); return; }
        saveMood(ds, k, $('#md-note').value.trim());
        closeSheet(); renderMood();
      }
    };
  });
}

// ================= 我們 =================
function nextOccurrence(md) {
  const t = tw();
  const [mm, dd] = md.split('-').map(Number);
  let y = t.y;
  let n = Date.UTC(y, mm - 1, dd) / 864e5 - dayNum(t.date);
  if (n < 0) { y += 1; n = Date.UTC(y, mm - 1, dd) / 864e5 - dayNum(t.date); }
  return { days: n, year: y };
}
function renderUs() {
  if (currentTab !== 'us') return;
  const c = store.data.config;
  const today = todayStr();
  const together = c.together ? dayNum(today) - dayNum(c.together) + 1 : null;
  const married = c.married ? dayNum(today) - dayNum(c.married) + 1 : null;
  const cds = (c.dates || []).map((d) => {
    const o = nextOccurrence(d.md);
    let tag = '';
    if (d.since) tag = `第 ${o.year - d.since} 年`;
    if (d.born) tag = `${o.year - d.born} 歲`;
    return { ...d, ...o, tag };
  }).sort((a, b) => a.days - b.days);
  $('#us-root').innerHTML = `
    ${!settings.token ? `<div class="card welcome"><div class="big">${petSVG({ face: 'happy' })}</div><h2>歡迎回家</h2>
      <p class="muted" style="text-align:center">貼上 GitHub 金鑰，App 就會連到 xiaotang-space，換我來回妳。</p>
      <ol><li>照 repo 裡 <b>home/README.md</b> 的步驟做好金鑰。</li><li>貼在下面的「GitHub 金鑰」，按「儲存並連線」。</li></ol></div>` : ''}
    ${together ? `<div class="card together"><div class="l">我們在一起</div><div class="n">第 ${together} 天</div>
      ${married ? `<div class="l">結婚第 ${married} 天</div>` : ''}</div>` : ''}
    ${cds.length ? `<div class="card"><h2>倒數</h2>${cds.map((d) => `
      <div class="cd ${d.days === 0 ? 'today' : ''}"><span class="e">${esc(d.e || '💗')}</span>
        <div class="tx">${esc(d.name)}<small>${d.md.replace('-', '/')}${d.tag ? `・${d.tag}` : ''}</small></div>
        <div class="days">${d.days === 0 ? '就是今天' : `${d.days}<small> 天</small>`}</div></div>`).join('')}</div>` : ''}
    <div class="card">
      <h2>連線設定</h2>
      <div class="field"><label>GitHub 金鑰（fine-grained token）</label><input id="set-token" type="password" autocomplete="off" placeholder="github_pat_…" value="${esc(settings.token)}"></div>
      <div class="row2">
        <div class="field"><label>Repo</label><input id="set-repo" value="${esc(settings.repo)}"></div>
        <div class="field"><label>分支</label><input id="set-branch" value="${esc(settings.branch)}"></div>
      </div>
      <button class="btn block" id="set-save">儲存並連線</button>
      <p class="sync ${sync.state === 'ok' ? 'ok' : sync.state === 'err' ? 'err' : ''}"><i></i>${esc(sync.msg || '')}</p>
      <button class="btn ghost block" id="set-refresh">重新抓資料</button>
      <p class="muted" style="margin-top:12px">金鑰只存在這支手機。App 版本 ${VERSION}</p>
    </div>`;
}
$('#us-root').addEventListener('click', async (e) => {
  if (e.target.closest('#set-save')) {
    settings.token = $('#set-token').value.trim();
    settings.repo = $('#set-repo').value.trim() || 'KFC-666/xiaotang-space';
    settings.branch = $('#set-branch').value.trim() || 'master';
    saveSettings();
    chat.etag = null; chat.prev = null;
    await syncAll(true);
  }
  if (e.target.closest('#set-refresh')) { chat.etag = null; chat.prev = null; await syncAll(true); }
});

// ================= 同步 =================
async function syncAll(loud) {
  if (!settings.token) { setSync('off', '還沒連線'); renderUs(); return; }
  setSync('idle', '連線中…');
  try {
    await Promise.all(Object.keys(DOCS).map((k) => (DOCS[k].readonly ? pullDoc(k) : (store.dirty[k] ? pushDoc(k) : pullDoc(k)))));
    await loadChat();
    if (chat.pending.some((p) => p.st === 'sending' || p.st === 'fail')) {
      chat.pending.filter((p) => p.st === 'sending').forEach((p) => { p.st = 'fail'; p.err = '上次沒送完'; });
      savePending();
    }
    setSync('ok', `已同步 ${hm(new Date().toISOString())}`);
    if (loud) toast('連上了');
  } catch (e) {
    setSync('err', e.message);
    if (loud) toast(e.message);
  }
  switchTab(currentTab);
  schedulePoll();
}

// ================= iPhone 鍵盤 =================
const appEl = $('#app');
if (window.visualViewport) {
  let maxH = window.visualViewport.height;
  const fit = () => {
    const vv = window.visualViewport;
    maxH = Math.max(maxH, vv.height);
    const kb = vv.height < maxH * 0.8;
    document.body.classList.toggle('kb', kb);
    appEl.style.height = kb ? `${vv.height}px` : '';
    appEl.style.bottom = kb ? 'auto' : '';
    appEl.style.top = kb ? `${vv.offsetTop}px` : '';
    if (kb && currentTab === 'chat') { const sc = $('#chat-scroll'); sc.scrollTop = sc.scrollHeight; }
  };
  window.visualViewport.addEventListener('resize', fit);
  window.visualViewport.addEventListener('scroll', fit);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { schedulePoll(200); if (currentTab === 'pet') renderPet(); }
});
setInterval(() => { if (currentTab === 'pet') renderPet(); }, 60e3);

// ================= 開機 =================
autosize();
switchTab(currentTab);
syncAll(false);
