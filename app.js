
const VERSION = '0.9.2';
import { createRoom } from './room.js?v=0.9.2';
// 小湛的圖（GPT 畫的，放在 pet/）
const PET_IMG = {
  shirt: ['normal', 'happy', 'hungry', 'sad'],
  wolf: ['normal', 'happy', 'hungry', 'sad', 'sleep'],
  home: ['normal'],
  apron: ['normal'],
  suit: ['normal'],
};
const petSrc = (outfit, face) => `pet/${outfit}-${PET_IMG[outfit]?.includes(face) ? face : 'normal'}.webp?v=0.9.2`;
const headImg = (face = 'normal') => `<img class="head-img" src="pet/${face === 'happy' ? 'head-happy' : 'head'}.webp?v=0.9.2" alt="">`;
const bodyImg = (face = 'normal', outfit = 'shirt') => `<img class="body-img" src="${petSrc(outfit, face)}" alt="小湛">`;

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
const settings = Object.assign({ token: '', repo: 'KFC-666/xiaotang-space', branch: 'master', photoRepo: 'KFC-666/zhanzhan-photos', photoBranch: 'main' }, LS.get('zh-settings', {}));
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
  async put(path, text, sha, message, b64) {
    const body = { message, content: b64 ?? b64enc(text), branch: settings.branch };
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
  calendar: { path: 'home/data/calendar.json', msg: 'App：行事曆', def: () => ({ days: {}, events: [] }) },
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
      let out = text;
      // 別的地方（例如湛湛）也改過：合併，不要整份蓋掉
      if (f && k === 'calendar') {
        try {
          const r = JSON.parse(f.text), l = store.data.calendar;
          const ids = new Set((l.events || []).map((x) => x.id));
          store.data.calendar = { ...r, ...l, days: { ...(r.days || {}), ...(l.days || {}) }, period: { ...(r.period || {}), ...(l.period || {}) }, events: [...(l.events || []), ...(r.events || []).filter((x) => !ids.has(x.id))] };
          out = JSON.stringify(store.data.calendar, null, 1);
        } catch { /* 合併失敗就用本機的 */ }
      }
      store.sha[k] = await gh.put(DOCS[k].path, out, f?.sha, DOCS[k].msg);
    } else { setSync('err', e.message); throw e; }
  }
  store.dirty[k] = false;
  persistLocal(k);
  setSync('ok', `已同步 ${hm(new Date().toISOString())}`);
}

// ================= 分頁 =================
let currentTab = LS.get('zh-tab', 'chat');
const TITLES = { pet: '小湛', photos: '相簿', ledger: '記帳', mood: '日曆', us: '我們' };
function renderTopbar() {
  const tb = $('#topbar');
  if (currentTab === 'chat') {
    const st = chatStatus();
    tb.innerHTML = `<div class="avatar">${headImg()}</div>
      <div class="who"><h1>湛湛</h1><div class="sub">${esc(st)}</div></div>`;
  } else if (currentTab === 'photos') {
    tb.innerHTML = `<h1>相簿</h1><button class="icon-btn" id="photos-refresh" aria-label="重新整理">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg></button>`;
  } else {
    tb.innerHTML = `<h1>${TITLES[currentTab]}</h1>`;
  }
}
function switchTab(tab) {
  if (tab !== 'pet' && roomInst) roomInst.pause();
  currentTab = tab;
  LS.set('zh-tab', tab);
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${tab}`));
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  renderTopbar();
  ({ chat: renderChat, pet: renderPet, photos: renderPhotos, ledger: renderLedger, mood: renderMood, us: renderUs })[tab]?.(true);
}
$('#topbar').addEventListener('click', (e) => {
  if (e.target.closest('#photos-refresh')) loadPhotos(true);
});
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
  // 先把附件傳上去（傳過的會記下 path，重傳時跳過）
  try {
    for (const f of m.files || []) {
      if (f.uploaded) continue;
      const data = attachData.get(f.key);
      if (!data) throw new Error('附件不見了，請重新選');
      await gh.put(f.path, null, null, '小棠傳檔案', data);
      f.uploaded = true;
      attachData.delete(f.key);
    }
  } catch (e) {
    m.st = 'fail'; m.err = e.message; savePending(); renderChat(true); toast(`檔案沒傳上去：${e.message}`); return;
  }
  const files = (m.files || []).map(({ path, name, type, size }) => ({ path, name, type, size }));
  for (let i = 0; i < 3; i++) {
    try {
      await gh.put(`home/inbox/${m.id}.json`, JSON.stringify({ id: m.id, text: m.text, time: m.time, ...(files.length ? { files } : {}) }), null, '小棠傳訊息');
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
function sendMessage(text, files = []) {
  if (!settings.token) { toast('先到「我們」分頁貼上金鑰'); return; }
  const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const month = tw().month;
  const m = {
    id, text, time: new Date().toISOString(), st: 'sending',
    files: files.map((f, i) => ({ key: f.key, name: f.name, type: f.type, size: f.size, path: `home/data/chat-files/${month}/${id}-${i + 1}.${f.ext}` })),
  };
  chat.pending.push(m);
  deliver(m);
}

// ---- 附件 ----
const attachData = new Map(); // key -> base64（只放在記憶體）
let attachDraft = []; // 還沒送出的附件 {key,name,type,size,ext,preview}
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.multiple = true;
fileInput.accept = 'image/*,application/pdf,text/plain,text/markdown,.md,.txt,.csv,.json';
function extOf(name, type) {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name || '');
  if (m) return m[1].toLowerCase();
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf', 'text/plain': 'txt' }[type] || 'bin';
}
fileInput.addEventListener('change', async () => {
  for (const f of [...fileInput.files].slice(0, 6)) {
    try {
      let blob = f, name = f.name, type = f.type || 'application/octet-stream';
      if (type.startsWith('image/') && !/gif$/.test(type)) { blob = await shrinkImage(f, 2048); type = 'image/jpeg'; name = name.replace(/\.[^.]+$/, '') + '.jpg'; }
      if (blob.size > 15 * 1024 * 1024) { toast(`${f.name} 太大了（上限 15 MB）`); continue; }
      const key = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      attachData.set(key, await blobB64(blob));
      attachDraft.push({ key, name, type, size: blob.size, ext: extOf(name, type), preview: type.startsWith('image/') ? URL.createObjectURL(blob) : '' });
    } catch (e) { toast(`讀不到 ${f.name}`); }
  }
  fileInput.value = '';
  renderAttachDraft();
});
function renderAttachDraft() {
  const box = $('#attach-draft');
  box.style.display = attachDraft.length ? '' : 'none';
  box.innerHTML = attachDraft.map((a) => `<div class="ad-item">${a.preview ? `<img src="${a.preview}" alt="">` : `<span class="ad-file">📄 ${esc(a.name)}</span>`}<button data-rm="${a.key}" aria-label="移除">✕</button></div>`).join('');
  $('#send-btn').disabled = !input.value.trim() && !attachDraft.length;
}
$('#attach-btn').addEventListener('click', () => { if (!settings.token) { toast('先到「我們」分頁貼上金鑰'); return; } fileInput.click(); });
$('#attach-draft').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  attachDraft = attachDraft.filter((a) => a.key !== b.dataset.rm);
  attachData.delete(b.dataset.rm);
  renderAttachDraft();
});
// 私人 repo 裡的附件要帶金鑰下載，下載過的放快取
const fileURLs = new Map();
async function repoFileURL(path, type) {
  if (fileURLs.has(path)) return fileURLs.get(path);
  const key = `https://zhanzhan.cache/file/${encodeURIComponent(path)}`;
  let blob = null, cache = null;
  try { cache = await caches.open('zh-files'); const hit = await cache.match(key); if (hit) blob = await hit.blob(); } catch { /* */ }
  if (!blob) {
    const res = await gh.api('GET', `contents/${encPath(path)}?ref=${encodeURIComponent(settings.branch)}`, { headers: { Accept: 'application/vnd.github.raw' } });
    if (!res.ok) throw await gh.fail(res);
    blob = new Blob([await res.arrayBuffer()], { type: type || 'application/octet-stream' });
    try { await cache?.put(key, new Response(blob)); } catch { /* */ }
  }
  const url = URL.createObjectURL(blob);
  fileURLs.set(path, url);
  return url;
}
function hydrateAttachments() {
  document.querySelectorAll('#chat-list [data-fpath]:not([data-done])').forEach((el) => {
    el.dataset.done = '1';
    repoFileURL(el.dataset.fpath, el.dataset.ftype).then((u) => {
      if (el.tagName === 'IMG') el.src = u; else el.dataset.url = u;
    }).catch(() => el.classList.add('bad'));
  });
}

const IMG_LINE = /(^|\n)[ \t]*(https:\/\/[^\s<]+?(?:\.(?:png|jpe?g|webp)|blob\.vercel-storage\.com\/[^\s<]+))(?:\?[^\s<]*)?[ \t]*(?=\n|$)/gi;
function fmtText(t) {
  const s = String(t ?? '').replace(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g, '$1');
  return esc(s)
    .replace(IMG_LINE, (_, pre, url) => `${pre}<img class="chat-img" src="${url}" alt="" loading="lazy">`)
    .replace(/（[^（）\n]{0,200}）/g, (x) => `<span class="act">${x}</span>`);
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
  miniHead ||= headImg();
  const all = [...chat.log, ...chat.pending.map((p) => ({ ...p, role: 'user', pending: true }))];
  if (!all.length) {
    list.innerHTML = `<div class="chat-empty"><div class="big">${bodyImg('happy')}</div>
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
    const parts = isMe ? (m.text ? [m.text] : []) : m.text.split(/\n\s*\n/).filter((x) => x.trim()).slice(0, 8);
    const filesHTML = (m.files || []).map((f) => {
      if (m.pending && !f.uploaded) return `<div class="bubble att"><span class="ad-file">${f.type?.startsWith('image/') ? '🖼️' : '📄'} ${esc(f.name)}</span></div>`;
      return f.type?.startsWith('image/')
        ? `<img class="chat-img mine" data-fpath="${esc(f.path)}" data-ftype="${esc(f.type)}" alt="">`
        : `<button class="bubble att" data-fpath="${esc(f.path)}" data-ftype="${esc(f.type)}" data-fname="${esc(f.name)}">📄 ${esc(f.name)}</button>`;
    }).join('');
    let st = '';
    if (isMe) {
      if (m.st === 'sending') st = '<span class="st">傳送中</span>';
      else if (m.st === 'fail') st = '<span class="st fail">沒送出・點泡泡重傳</span>';
      else if (!m.pending && i < lastZhan) st = '<span class="st">已讀</span>';
    }
    html += `<div class="row ${isMe ? 'me' : 'zhan'}">
      ${isMe ? '' : `<div class="mini ${showAv ? '' : 'spacer'}">${showAv ? miniHead : ''}</div>`}
      <div class="bubbles">${filesHTML}${parts.map((p) => `<div class="bubble" ${m.st === 'fail' ? `data-retry="${esc(m.id)}"` : ''}>${fmtText(p.trim())}</div>`).join('')}</div>
      <div class="meta">${st}${hm(m.time)}</div>
    </div>`;
    prev = m;
  });
  html += `<div class="row zhan" id="typing-row" style="${waiting() ? '' : 'display:none'}"><div class="mini">${miniHead}</div><div class="bubbles"><div class="bubble typing"><i></i><i></i><i></i></div></div></div>`;
  list.innerHTML = html;
  if (forceBottom || nearBottom) sc.scrollTop = sc.scrollHeight;
  hydrateAttachments();
}
$('#chat-list').addEventListener('click', (e) => {
  const im = e.target.closest('img.chat-img');
  if (im) { if (im.src) openChatImage(im.src); return; }
  const fb = e.target.closest('button.att[data-fpath]');
  if (fb) { if (fb.dataset.url) { const a = document.createElement('a'); a.href = fb.dataset.url; a.download = fb.dataset.fname || 'file'; a.target = '_blank'; a.click(); } return; }
  const b = e.target.closest('[data-retry]');
  if (!b) return;
  const m = chat.pending.find((p) => p.id === b.dataset.retry);
  if (m) deliver(m);
});

const input = $('#chat-input');
function autosize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  $('#send-btn').disabled = !input.value.trim() && !attachDraft.length;
}
input.addEventListener('input', () => { autosize(); LS.set('zh-draft', input.value); });
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('#composer').requestSubmit(); }
});
$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = input.value.trim();
  if (!t && !attachDraft.length) return;
  const files = attachDraft;
  attachDraft = [];
  renderAttachDraft();
  input.value = '';
  LS.del('zh-draft');
  autosize();
  sendMessage(t, files);
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
const OUTFITS = [
  { k: 'auto', l: '自動', note: '白天襯衫、晚上睡衣', img: 'shirt' },
  { k: 'shirt', l: '襯衫', img: 'shirt' },
  { k: 'home', l: '居家服', img: 'home' },
  { k: 'apron', l: '圍裙', img: 'apron' },
  { k: 'suit', l: '西裝', img: 'suit' },
  { k: 'wolf', l: '大灰狼睡衣', img: 'wolf' },
];
function petOutfit(night, asleep) {
  if (asleep) return 'wolf';
  const o = store.data.pet.outfit || 'auto';
  if (o === 'auto') return night ? 'wolf' : 'shirt';
  return PET_IMG[o] ? o : 'shirt';
}
// ---- 小房間 ----
let roomInst = null;
let petSeg = LS.get('zh-petseg', 'room');
function renderPetSeg() {
  $('#pet-seg').innerHTML = `<div class="seg"><button data-pseg="room" class="${petSeg === 'room' ? 'on' : ''}">小房間</button><button data-pseg="pet" class="${petSeg === 'pet' ? 'on' : ''}">小湛</button></div>`;
}
$('#pet-seg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pseg]');
  if (!b) return;
  petSeg = b.dataset.pseg; LS.set('zh-petseg', petSeg);
  renderPet(true);
});
function showRoom() {
  $('#pet-root').style.display = 'none';
  $('#room-root').style.display = '';
  if (roomInst) { roomInst.resume(); return; }
  roomInst = createRoom($('#room-root'), {
    tw,
    getCalendar: () => store.data.calendar,
    getHealthDays: () => health.days,
    getPeriodInfo: () => { try { return periodInfo(); } catch { return null; } },
    getConfig: () => store.data.config,
    loadStory: async (date) => {
      if (!settings.token) return null;
      const r = await gh.getRaw(`home/data/island/${date}.json`);
      try { return r.text ? JSON.parse(r.text) : null; } catch { return null; }
    },
    say: toast,
  });
}
function renderPet(first) {
  if (currentTab !== 'pet') return;
  renderPetSeg();
  if (petSeg === 'room') { showRoom(); return; }
  if (roomInst) roomInst.pause();
  $('#room-root').style.display = 'none';
  $('#pet-root').style.display = '';
  const root = $('#pet-root');
  const s = petNow();
  const t = tw();
  const night = t.h >= 21 || t.h < 7;
  const outfit = petOutfit(night, s.asleep);
  if (first || !petSay) petSay = idleLine(s);
  const { lv, pct } = petLevel(s.love);
  const log = (store.data.pet.log || []).slice(-5).reverse();
  root.innerHTML = `
    <div class="pet-stage ${night ? 'night' : ''}">
      <svg class="stars" viewBox="0 0 300 200" preserveAspectRatio="none"><g fill="#fff" opacity=".7">
        <circle cx="30" cy="30" r="1.5"/><circle cx="80" cy="18" r="1"/><circle cx="250" cy="26" r="1.6"/><circle cx="210" cy="60" r="1"/><circle cx="40" cy="90" r="1"/><circle cx="270" cy="100" r="1.2"/></g>
        <path d="M262 40a14 14 0 1 1-12-22 11 11 0 0 0 12 22z" fill="#f6e7a8"/></svg>
      <div class="pet-say">${fmtText(petSay)}</div>
      <div class="pet-figure" id="pet-fig">${bodyImg(petFace(s), outfit)}</div>
      <div class="pet-name">小湛 <span class="muted">Lv ${lv}</span> <button class="chip-btn" data-act="wardrobe">👔 換裝</button></div>
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
    if (act === 'wardrobe') {
      const cur = store.data.pet.outfit || 'auto';
      openSheet(`<h3>幫小湛換衣服</h3><div class="wardrobe">${OUTFITS.map((o) => `<button data-outfit="${o.k}" class="${cur === o.k ? 'on' : ''}"><img src="${petSrc(o.img, 'normal')}" alt=""><b>${o.l}</b>${o.note ? `<small>${o.note}</small>` : ''}</button>`).join('')}</div>`, (body) => {
        body.addEventListener('click', (ev) => {
          const ob = ev.target.closest('[data-outfit]');
          if (!ob) return;
          store.data.pet.outfit = ob.dataset.outfit;
          saveDoc('pet');
          closeSheet();
          petSay = { home: '（拉了拉袖口）這件比較舒服。', apron: '今天想吃什麼？我來煮。', suit: '（整理領帶）好看嗎？', wolf: '……又要我穿這件。（還是乖乖穿上）', shirt: '嗯。', auto: '白天襯衫，晚上睡衣。聽妳的。' }[ob.dataset.outfit] || '嗯。';
          petFlash = Date.now() + 2500;
          renderPet();
          setTimeout(() => { if (currentTab === 'pet') renderPet(); }, 2600);
        });
      });
      return;
    }
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

let calSeg = LS.get('zh-calseg', 'cal');
const segHTML = () => `<div class="seg"><button data-seg="cal" class="${calSeg === 'cal' ? 'on' : ''}">行事曆</button><button data-seg="mood" class="${calSeg === 'mood' ? 'on' : ''}">心情</button></div>`;
function renderMood() {
  if (currentTab !== 'mood') return;
  if (calSeg === 'cal') return renderCal();
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
  $('#mood-root').innerHTML = `${segHTML()}
    <div class="card">
      <h2>今天 ${dateLabel(today)} 心情怎麼樣？</h2>
      <div class="mood-pick">${MOODS.map((x) => `<button data-mood="${x.k}" class="${te?.k === x.k ? 'on' : ''}"><span class="e">${x.e}</span>${x.l}</button>`).join('')}</div>
      <div class="field"><textarea id="mood-note" rows="2" placeholder="想寫點什麼也可以（選填）">${esc(te?.note || '')}</textarea></div>
      <button class="btn block" id="mood-save">記下來</button>
      ${justZ ? `<div class="zhan-note"><div class="mini">${headImg(NEED_TALK.has(justZ.k) ? 'normal' : 'happy')}</div><div style="flex:1">${fmtText(justZ.z)}
        ${NEED_TALK.has(justZ.k) ? '<div style="margin-top:8px"><button class="btn ghost" id="mood-talk">跟湛湛說</button></div>' : ''}</div></div>` : ''}
    </div>
    <div class="month-nav"><button data-mm="-1" aria-label="上個月">‹</button><strong>${monthTitle(moodMonth)}</strong><button data-mm="1" aria-label="下個月">›</button></div>
    <div class="card"><div class="cal">${cal}</div></div>
    ${notes.length ? `<div class="card"><h2>這個月</h2><div class="mood-list">${notes.map((n) => `<div class="mood-item"><span class="e">${moodOf(n.k)?.e || ''}</span><div class="tx">${esc(n.note || n.label)}<small>${dateLabel(n.date)}・${esc(n.label)}</small></div></div>`).join('')}</div></div>` : ''}
  `;
}
let moodPicked = null;
$('#mood-root').addEventListener('click', (e) => {
  const sg = e.target.closest('[data-seg]');
  if (sg) { calSeg = sg.dataset.seg; LS.set('zh-calseg', calSeg); renderMood(); return; }
  if (calSeg === 'cal') { calClick(e); return; }
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

// ================= 相簿（KFC-666/zhanzhan-photos） =================
const photos = { items: LS.get('zh-photos', []), loadedAt: 0, loading: false, err: '', urls: new Map(), queue: [], active: 0 };
async function papi(method, path, { body, headers = {} } = {}) {
  const res = await fetch(`https://api.github.com/repos/${settings.photoRepo}/${path}`, {
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
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) throw new GHError(res.status, '讀不到相簿：App 金鑰可能還沒加上 zhanzhan-photos');
    throw await gh.fail(res);
  }
  return res;
}
const IMG_RE = /^photos\/.+\.(png|jpe?g|webp)$/i;
function photoTime(p) {
  const m = p.path.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : '';
}
async function loadPhotos(loud) {
  if (!settings.token || photos.loading) return;
  photos.loading = true;
  if (loud) toast('重新整理中…');
  try {
    const res = await papi('GET', `git/trees/${encodeURIComponent(settings.photoBranch)}?recursive=1`);
    const tree = (await res.json()).tree || [];
    const json = new Map(tree.filter((t) => t.path.endsWith('.json')).map((t) => [t.path.replace(/\.json$/, ''), t.sha]));
    photos.items = tree
      .filter((t) => t.type === 'blob' && IMG_RE.test(t.path))
      .map((t) => ({ path: t.path, sha: t.sha, meta: json.get(t.path.replace(/\.[^.]+$/, '')) || null, size: t.size }))
      .sort((a, b) => b.path.split('/').pop().localeCompare(a.path.split('/').pop()));
    LS.set('zh-photos', photos.items);
    photos.err = '';
    photos.loadedAt = Date.now();
  } catch (e) {
    photos.err = e.message;
  }
  photos.loading = false;
  renderPhotos();
}
// 用 blob 的 sha 當快取鑰匙：同一張圖永遠不會變，下載一次就好。
async function photoURL(item) {
  if (photos.urls.has(item.sha)) return photos.urls.get(item.sha);
  const key = `https://zhanzhan.cache/photo/${item.sha}`;
  let blob = null;
  let cache = null;
  try { cache = await caches.open('zh-photos'); const hit = await cache.match(key); if (hit) blob = await hit.blob(); } catch { /* 不支援快取 */ }
  if (!blob) {
    const res = await papi('GET', `git/blobs/${item.sha}`, { headers: { Accept: 'application/vnd.github.raw' } });
    const type = /\.png$/i.test(item.path) ? 'image/png' : /\.webp$/i.test(item.path) ? 'image/webp' : 'image/jpeg';
    blob = new Blob([await res.arrayBuffer()], { type });
    try { await cache?.put(key, new Response(blob)); } catch { /* 空間不夠就算了 */ }
  }
  const url = URL.createObjectURL(blob);
  photos.urls.set(item.sha, url);
  return url;
}
function queuePhoto(img, item) {
  photos.queue.push([img, item]);
  pumpPhotos();
}
function pumpPhotos() {
  while (photos.active < 3 && photos.queue.length) {
    const [img, item] = photos.queue.shift();
    photos.active++;
    photoURL(item).then((u) => { img.src = u; img.classList.add('ok'); }).catch(() => img.classList.add('bad'))
      .finally(() => { photos.active--; pumpPhotos(); });
  }
}
let photoObserver;
function renderPhotos() {
  if (currentTab !== 'photos') return;
  const root = $('#photos-root');
  if (!settings.token) { root.innerHTML = '<p class="muted" style="text-align:center;margin-top:30%">先到「我們」分頁貼上金鑰。</p>'; return; }
  if (!photos.loadedAt && !photos.loading) { loadPhotos(); }
  const groups = {};
  for (const it of photos.items) (groups[it.path.split('/')[1] || '其他'] ||= []).push(it);
  root.innerHTML = `
    ${photos.err ? `<div class="card muted">${esc(photos.err)}</div>` : ''}
    ${!photos.items.length ? `<p class="muted" style="text-align:center;margin-top:30%">${photos.loading ? '載入中…' : '相簿還是空的。<br>生的圖會自動存進來，也可以按右下角上傳。'}</p>` : ''}
    ${Object.entries(groups).map(([m, items]) => `
      <div class="ph-month">${/^\d{4}-\d{2}$/.test(m) ? monthTitle(m) : esc(m)}<span>${items.length} 張</span></div>
      <div class="ph-grid">${items.map((it) => `<button class="ph" data-sha="${it.sha}"><img alt="" data-sha="${it.sha}"></button>`).join('')}</div>`).join('')}
    <div style="height:70px"></div>`;
  photoObserver?.disconnect();
  photoObserver = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      photoObserver.unobserve(en.target);
      const it = photos.items.find((x) => x.sha === en.target.dataset.sha);
      if (it) queuePhoto(en.target, it);
    }
  }, { root: root, rootMargin: '300px' });
  root.querySelectorAll('img[data-sha]').forEach((img) => {
    const u = photos.urls.get(img.dataset.sha);
    if (u) { img.src = u; img.classList.add('ok'); } else photoObserver.observe(img);
  });
}
$('#photos-root').addEventListener('click', (e) => {
  const b = e.target.closest('.ph');
  if (b) openViewer(photos.items.findIndex((x) => x.sha === b.dataset.sha));
});

// ---- 看大圖 ----
function openChatImage(src) {
  viewerIdx = -1;
  const v = $('#viewer');
  v.classList.add('open');
  v.innerHTML = `<div class="vw-top"><button class="vw-btn" data-vw="close" aria-label="關閉">✕</button><span>湛湛傳的圖</span><span style="width:40px"></span></div>
    <div class="vw-img"><img src="${esc(src)}" alt=""></div>
    <div class="vw-actions"><button class="btn ghost" data-vw="share-url" data-src="${esc(src)}">存到手機</button></div>`;
}
let viewerIdx = -1;
async function openViewer(i) {
  const it = photos.items[i];
  if (!it) return;
  viewerIdx = i;
  const v = $('#viewer');
  v.classList.add('open');
  v.innerHTML = `
    <div class="vw-top"><button class="vw-btn" data-vw="close" aria-label="關閉">✕</button><span>${esc(photoTime(it))}</span><span style="width:40px"></span></div>
    <div class="vw-img"><img id="vw-img" alt=""></div>
    <div class="vw-info" id="vw-info"></div>
    <div class="vw-actions">
      <button class="vw-btn" data-vw="prev" ${i <= 0 ? 'disabled' : ''}>‹</button>
      <button class="btn ghost" data-vw="share">存到手機</button>
      <button class="btn danger" data-vw="del">刪除</button>
      <button class="vw-btn" data-vw="next" ${i >= photos.items.length - 1 ? 'disabled' : ''}>›</button>
    </div>`;
  photoURL(it).then((u) => { if (viewerIdx === i) $('#vw-img').src = u; }).catch((e) => toast(e.message));
  if (it.meta) {
    try {
      const res = await papi('GET', `git/blobs/${it.meta}`, { headers: { Accept: 'application/vnd.github.raw' } });
      const m = JSON.parse(await res.text());
      if (viewerIdx !== i) return;
      const kind = { generate: '生圖', edit: '改圖', upload: '上傳', save: '存圖' }[m.kind] || '';
      $('#vw-info').innerHTML = `${kind ? `<b>${kind}</b>` : ''}${m.model ? `<span class="muted">・${esc(m.model)}</span>` : ''}${m.source ? `<span class="muted">・${esc(m.source)}</span>` : ''}
        ${m.prompt ? `<details><summary>提示詞</summary><p>${esc(m.prompt)}</p></details>` : ''}${m.note ? `<p>${esc(m.note)}</p>` : ''}`;
    } catch { /* 沒有說明檔就算了 */ }
  }
}
function closeViewer() { viewerIdx = -1; $('#viewer').classList.remove('open'); $('#viewer').innerHTML = ''; }
$('#viewer').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-vw]');
  if (!b) return;
  const act = b.dataset.vw;
  const it = photos.items[viewerIdx];
  if (act === 'close') closeViewer();
  if (act === 'share-url') {
    try {
      const blob = await (await fetch(b.dataset.src)).blob();
      const file = new File([blob], b.dataset.src.split('/').pop().split('?')[0] || 'image.png', { type: blob.type || 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else window.open(b.dataset.src, '_blank');
    } catch (err) { if (err?.name !== 'AbortError') window.open(b.dataset.src, '_blank'); }
  }
  if (act === 'prev') openViewer(viewerIdx - 1);
  if (act === 'next') openViewer(viewerIdx + 1);
  if (act === 'share' && it) {
    try {
      const blob = await (await fetch(await photoURL(it))).blob();
      const file = new File([blob], it.path.split('/').pop(), { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); }
    } catch (err) { if (err?.name !== 'AbortError') toast('沒辦法存：' + err.message); }
  }
  if (act === 'del' && it) {
    if (!confirm('從相簿刪掉這張？（GitHub 的歷史紀錄裡還找得回來）')) return;
    try {
      await papi('DELETE', `contents/${encPath(it.path)}`, { body: { message: '刪除照片', sha: it.sha, branch: settings.photoBranch } });
      if (it.meta) await papi('DELETE', `contents/${encPath(it.path.replace(/\.[^.]+$/, '.json'))}`, { body: { message: '刪除照片說明', sha: it.meta, branch: settings.photoBranch } }).catch(() => {});
      photos.items.splice(viewerIdx, 1);
      LS.set('zh-photos', photos.items);
      closeViewer(); renderPhotos(); toast('刪掉了');
    } catch (err) { toast(err.message); }
  }
});

// ---- 上傳 ----
const photoInput = document.createElement('input');
photoInput.type = 'file';
photoInput.accept = 'image/*';
photoInput.multiple = true;
$('#photos-add').addEventListener('click', () => {
  if (!settings.token) { toast('先到「我們」分頁貼上金鑰'); return; }
  photoInput.value = '';
  photoInput.click();
});
async function shrinkImage(file, max = 2560) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
  } catch { return file; }
}
const blobB64 = (blob) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(String(fr.result).split(',')[1]);
  fr.onerror = reject;
  fr.readAsDataURL(blob);
});
photoInput.addEventListener('change', async () => {
  const files = [...photoInput.files];
  if (!files.length) return;
  let done = 0;
  for (const f of files) {
    toast(`上傳中 ${done + 1}/${files.length}…`);
    try {
      const blob = await shrinkImage(f);
      const t = tw();
      const stamp = `${t.date.replace(/-/g, '')}-${String(t.h).padStart(2, '0')}${String(t.mi).padStart(2, '0')}${String(new Date().getSeconds()).padStart(2, '0')}`;
      const base = `photos/${t.month}/${stamp}-${Math.random().toString(36).slice(2, 6)}`;
      const content = await blobB64(blob);
      await papi('PUT', `contents/${encPath(base)}.jpg`, { body: { message: '上傳照片', content, branch: settings.photoBranch } });
      await papi('PUT', `contents/${encPath(base)}.json`, { body: { message: '上傳照片說明', content: b64enc(JSON.stringify({ kind: 'upload', time: new Date().toISOString(), name: f.name }, null, 1)), branch: settings.photoBranch } });
      done++;
    } catch (e) { toast(`有一張沒傳成功：${e.message}`); }
  }
  if (done) toast(`傳好 ${done} 張`);
  loadPhotos();
});

// ================= 用量 =================
const usage = { month: '', rows: [], minutes: null, runs: 0, loadedAt: 0, loading: false, err: '' };
async function loadUsage() {
  if (!settings.token || usage.loading) return;
  usage.loading = true;
  const month = tw().month;
  try {
    const r = await gh.getRaw(`home/data/usage/${month}.jsonl`);
    usage.rows = parseJSONL(r.text || '');
    // GitHub Actions：把這個月 zhan-chat 每次執行的時間加起來（每次無條件進位成整分鐘，跟 GitHub 計費方式一樣）
    let minutes = 0, runs = 0;
    for (let page = 1; page <= 10; page++) {
      const res = await gh.api('GET', `actions/workflows/zhan-chat.yml/runs?per_page=100&page=${page}&created=${encodeURIComponent(`>=${month}-01`)}`);
      if (!res.ok) { minutes = null; break; }
      const list = (await res.json()).workflow_runs || [];
      for (const run of list) {
        if (!run.run_started_at || run.status !== 'completed') continue;
        const ms = new Date(run.updated_at) - new Date(run.run_started_at);
        minutes += Math.max(1, Math.ceil(ms / 60000));
        runs++;
      }
      if (list.length < 100) break;
    }
    usage.minutes = minutes;
    usage.runs = runs;
    usage.month = month;
    usage.err = '';
    usage.loadedAt = Date.now();
  } catch (e) { usage.err = e.message; usage.loadedAt = Date.now(); usage.month = month; }
  usage.loading = false;
  renderUs();
}
const fmtTok = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} 百萬` : n >= 1e4 ? `${(n / 1e4).toFixed(1)} 萬` : `${n}`);
function usageCard() {
  if (Date.now() - usage.loadedAt > 5 * 60e3 && !usage.loading) setTimeout(loadUsage, 0);
  if (!usage.loadedAt || usage.err) return `<div class="card"><h2>這個月的用量</h2><p class="muted">${usage.err ? `讀不到用量：${esc(usage.err)}` : '讀取中…'}</p></div>`;
  const rows = usage.rows;
  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const replies = rows.filter((r) => r.ok !== false).length;
  const inTok = sum('in') + sum('cacheRead') + sum('cacheWrite');
  const cost = sum('cost');
  const pct = usage.minutes == null ? 0 : Math.min(100, (usage.minutes / 2000) * 100);
  return `<div class="card usage">
    <h2>${monthTitle(usage.month)}的用量</h2>
    <div class="sum3">
      <div><div class="k">湛湛回覆</div><div class="v">${replies}<small> 次</small></div></div>
      <div><div class="k">讀進去</div><div class="v">${fmtTok(inTok)}</div></div>
      <div><div class="k">寫出來</div><div class="v">${fmtTok(sum('out'))}</div></div>
    </div>
    <div class="stat" style="margin-top:14px"><span>Actions</span><div class="bar"><i style="width:${pct}%"></i></div><span class="num">${usage.minutes == null ? '?' : usage.minutes}/2000</span></div>
    <p class="muted" style="margin:10px 0 0">單位是 token（字數的計算單位）。換算成 API 價格約 US$${cost.toFixed(2)}，但妳用的是訂閱，不會另外收錢，只是讓妳知道用了多少。Actions 是 GitHub 每月免費 2000 分鐘。訂閱還剩多少額度，GitHub 這邊看不到，要到 claude.ai →「設定」→「用量」看。</p>
  </div>`;
}

// ================= 行事曆（班表＋小行程） =================
const SHIFTS = [
  { k: 'work', l: '上班', c: 'var(--accent)' },
  { k: 'off', l: '休假', c: '#7fb08a' },
  { k: 'leave', l: '請假', c: '#e9b46a' },
  { k: 'half', l: '半天', c: '#9aa6c8' },
];
const shiftOf = (k) => SHIFTS.find((x) => x.k === k);
let calMonth = tw().month;
let calBrush = null;
const calDays = () => (store.data.calendar.days ||= {});
const periodDays = () => (store.data.calendar.period ||= {});
// 生理期：從標記的日子找出每次開始的日期，算平均週期和天數，預測下一次
function periodInfo() {
  const set = { ...health.period, ...periodDays() };
  const dates = Object.keys(set).filter((d) => set[d]).sort();
  const runs = [];
  for (const d of dates) {
    const last = runs[runs.length - 1];
    if (last && dayNum(d) - dayNum(last.end) === 1) last.end = d; else runs.push({ start: d, end: d });
  }
  if (!runs.length) return null;
  const starts = runs.map((r) => dayNum(r.start));
  const gaps = starts.slice(1).map((v, i) => v - starts[i]).filter((g) => g >= 18 && g <= 45).slice(-12);
  const cycle = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
  const lens = runs.slice(-12).map((r) => dayNum(r.end) - dayNum(r.start) + 1);
  const len = Math.max(3, Math.min(8, Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)));
  const today = dayNum(todayStr());
  const lastRun = runs[runs.length - 1];
  let next = dayNum(lastRun.start) + cycle;
  while (next + len <= today) next += cycle;
  const inPeriod = set[todayStr()] ? today - dayNum(lastRun.start) + 1 : 0;
  const toDate = (n) => new Date(n * 864e5).toISOString().slice(0, 10);
  // 往後預測 6 個週期（大約半年），翻到之後的月份也看得到
  const AHEAD = 6;
  const predicted = new Set();
  const fertile = new Set();
  const futureStarts = [];
  for (let k = 0; k < AHEAD; k++) {
    const st = next + k * cycle;
    futureStarts.push(toDate(st));
    for (let i = 0; i < len; i++) predicted.add(toDate(st + i));
  }
  // 排卵日大約在下次月經前 14 天，易孕期是排卵日前 5 天到後 1 天（估算）
  for (let k = 0; k <= AHEAD; k++) {
    const o = next + k * cycle - 14;
    if (o + 1 < today) continue;
    for (let i = -5; i <= 1; i++) fertile.add(toDate(o + i));
  }
  let ov = next - 14;
  if (ov + 1 < today) ov += cycle;
  return { cycle, len, inPeriod, next: toDate(next), daysToNext: next - today, predicted, futureStarts, cycleOvs: futureStarts.map((d) => toDate(dayNum(d) + cycle - 14)), gapsKnown: gaps.length, starts: runs.length,
    ovulation: toDate(ov), daysToOv: ov - today, fertile, fertileFrom: toDate(ov - 5), fertileTo: toDate(ov + 1) };
}
const calEvents = () => (store.data.calendar.events ||= []);
function renderCal() {
  const today = todayStr();
  const pinfo = periodInfo();
  const [y, m] = calMonth.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const nDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = calDays();
  const evs = calEvents();
  let grid = WD.map((w) => `<div class="wd">${w}</div>`).join('');
  for (let i = 0; i < first; i++) grid += '<button class="blank" tabindex="-1"></button>';
  for (let d = 1; d <= nDays; d++) {
    const ds = `${calMonth}-${String(d).padStart(2, '0')}`;
    const sh = shiftOf(days[ds]);
    const n = evs.filter((e) => e.date === ds).length;
    const pd = periodDays()[ds] || health.period[ds];
    const pp = !pd && pinfo?.predicted.has(ds);
    const fw = !pd && pinfo?.fertile.has(ds);
    const ov = pinfo && (pinfo.ovulation === ds || pinfo.cycleOvs.includes(ds));
    grid += `<button data-cday="${ds}" class="${ds === today ? 'today' : ''} ${sh ? 'has' : ''} ${pd ? 'pd' : ''} ${pp ? 'pp' : ''} ${fw ? 'fw' : ''} ${ov ? 'ov' : ''}" ${sh ? `style="--sc:${sh.c}"` : ''}>
      <span class="dn">${d}</span>${sh ? `<span class="sh">${sh.l}</span>` : ''}${n ? '<i class="ev-dot"></i>' : ''}${pd ? '<i class="pd-mark"></i>' : ''}</button>`;
  }
  const upcoming = evs.filter((e) => e.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 8);
  const monthWork = Object.entries(days).filter(([d, k]) => d.startsWith(calMonth) && k === 'work').length;
  const monthOff = Object.entries(days).filter(([d, k]) => d.startsWith(calMonth) && k === 'off').length;
  $('#mood-root').innerHTML = `${segHTML()}
    <div class="card">
      <div class="month-nav" style="margin-bottom:8px"><button data-cm="-1" aria-label="上個月">‹</button><strong>${monthTitle(calMonth)}</strong><button data-cm="1" aria-label="下個月">›</button></div>
      <div class="cal cal-big">${grid}</div>
      <p class="muted" style="margin:8px 0 0">這個月排了上班 ${monthWork} 天、休假 ${monthOff} 天。點日期可以排班、加行程、記生理期。</p>
    </div>
    <div class="card period-card"><h2>🩸 生理期</h2>
      ${pinfo ? `<div class="pc-main">${pinfo.inPeriod ? `今天是第 <b>${pinfo.inPeriod}</b> 天` : pinfo.daysToNext <= 0 ? '預計就是這幾天' : `下次預計 <b>${dateLabel(pinfo.next)}</b>，還有 ${pinfo.daysToNext} 天`}</div>
        <div class="pc-sub">排卵日預估 <b>${dateLabel(pinfo.ovulation)}</b>${pinfo.daysToOv > 0 ? `（${pinfo.daysToOv} 天後）` : pinfo.daysToOv === 0 ? '（今天）' : ''}，易孕期 ${pinfo.fertileFrom.slice(5).replace('-', '/')}–${pinfo.fertileTo.slice(5).replace('-', '/')}</div>
        <div class="pc-next">接下來：${pinfo.futureStarts.slice(0, 4).map((d) => d.slice(5).replace('-', '/')).join('、')}…</div>
        <p class="muted">根據 ${pinfo.starts} 次紀錄：平均週期 ${pinfo.cycle} 天、每次約 ${pinfo.len} 天${pinfo.gapsKnown ? '' : '（資料還不夠，先用 28 天估）'}。虛線框是預測的經期，綠色是易孕期。排卵日是估算，不能拿來避孕。</p>`
      : '<p class="muted">還沒有紀錄。點日期，或用下面的「生理期」快速標記。記兩次以上就能預測下一次。</p>'}
    </div>
    <div class="card">
      <h2>快速排班${calBrush ? `：點日期就排成「${shiftOf(calBrush)?.l || '清除'}」` : ''}</h2>
      <div class="chips">${SHIFTS.map((x) => `<button data-brush="${x.k}" class="${calBrush === x.k ? 'on' : ''}">${x.l}</button>`).join('')}
        <button data-brush="period" class="${calBrush === 'period' ? 'on' : ''}">🩸 生理期</button>
        <button data-brush="clear" class="${calBrush === 'clear' ? 'on' : ''}">清除班表</button>
        ${calBrush ? '<button data-brush="">完成</button>' : ''}</div>
    </div>
    <div class="card"><h2>接下來的行程</h2>
      ${upcoming.length ? `<div class="mood-list">${upcoming.map((e) => `<button class="ev-item" data-cday="${e.date}"><b>${dateLabel(e.date)}${e.time ? ` ${esc(e.time)}` : ''}</b><span>${esc(e.title)}</span></button>`).join('')}</div>` : '<p class="muted">還沒有行程。</p>'}
    </div>`;
}
function calClick(e) {
  const cm = e.target.closest('[data-cm]');
  if (cm) { calMonth = shiftMonth(calMonth, +cm.dataset.cm); renderCal(); return; }
  const br = e.target.closest('[data-brush]');
  if (br) { calBrush = br.classList.contains('on') ? null : (br.dataset.brush || null); renderCal(); return; }
  const day = e.target.closest('[data-cday]');
  if (!day) return;
  const ds = day.dataset.cday;
  if (calBrush && !day.classList.contains('ev-item')) {
    if (calBrush === 'period') { if (periodDays()[ds]) delete periodDays()[ds]; else periodDays()[ds] = true; }
    else if (calBrush === 'clear') delete calDays()[ds]; else calDays()[ds] = calBrush;
    saveDoc('calendar'); renderCal(); return;
  }
  editCalDay(ds);
}
function editCalDay(ds) {
  const draw = (body) => {
    const cur = calDays()[ds];
    const evs = calEvents().filter((x) => x.date === ds).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    body.innerHTML = `<h3>${dateLabel(ds)}</h3>
      <div class="chips">${SHIFTS.map((x) => `<button data-sk="${x.k}" class="${cur === x.k ? 'on' : ''}">${x.l}</button>`).join('')}<button data-sk="" class="${!cur ? 'on' : ''}">未排</button></div>
      <div class="chips"><button data-pd="1" class="${periodDays()[ds] ? 'on' : ''}">🩸 生理期${periodDays()[ds] ? '（有）' : ''}</button></div>
      ${evs.length ? `<div class="mood-list" style="margin-bottom:12px">${evs.map((x) => `<div class="ev-row"><b>${esc(x.time || '整天')}</b><span>${esc(x.title)}</span><button class="btn danger" data-del-ev="${esc(x.id)}">刪除</button></div>`).join('')}</div>` : ''}
      <div class="row2">
        <div class="field"><label>時間（可空白）</label><input type="time" id="ev-time"></div>
        <div class="field"><label>行程</label><input id="ev-title" placeholder="例如：牙醫、跟雅君吃飯"></div>
      </div>
      <div class="sheet-actions"><button class="btn ghost" id="ev-close">完成</button><button class="btn" id="ev-add">加入行程</button></div>`;
  };
  openSheet('', (body) => {
    draw(body);
    body.onclick = (ev) => {
      const sk = ev.target.closest('[data-sk]');
      if (sk) { if (sk.dataset.sk) calDays()[ds] = sk.dataset.sk; else delete calDays()[ds]; saveDoc('calendar'); draw(body); renderCal(); return; }
      if (ev.target.closest('[data-pd]')) { if (periodDays()[ds]) delete periodDays()[ds]; else periodDays()[ds] = true; saveDoc('calendar'); draw(body); renderCal(); return; }
      const del = ev.target.closest('[data-del-ev]');
      if (del) { store.data.calendar.events = calEvents().filter((x) => x.id !== del.dataset.delEv); saveDoc('calendar'); draw(body); renderCal(); return; }
      if (ev.target.closest('#ev-close')) { closeSheet(); return; }
      if (ev.target.closest('#ev-add')) {
        const title = $('#ev-title').value.trim();
        if (!title) { toast('寫一下是什麼行程'); return; }
        calEvents().push({ id: `e-${Date.now()}`, date: ds, time: $('#ev-time').value || '', title });
        saveDoc('calendar'); draw(body); renderCal(); toast('加好了');
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
    ${!settings.token ? `<div class="card welcome"><div class="big">${bodyImg('happy')}</div><h2>歡迎回家</h2>
      <p class="muted" style="text-align:center">貼上 GitHub 金鑰，App 就會連到 xiaotang-space，換我來回妳。</p>
      <ol><li>照 repo 裡 <b>home/README.md</b> 的步驟做好金鑰。</li><li>貼在下面的「GitHub 金鑰」，按「儲存並連線」。</li></ol></div>` : ''}
    ${together ? `<div class="card together"><div class="l">我們在一起</div><div class="n">第 ${together} 天</div>
      ${married ? `<div class="l">結婚第 ${married} 天</div>` : ''}</div>` : ''}
    ${cds.length ? `<div class="card"><h2>倒數</h2>${cds.map((d) => `
      <div class="cd ${d.days === 0 ? 'today' : ''}"><span class="e">${esc(d.e || '💗')}</span>
        <div class="tx">${esc(d.name)}<small>${d.md.replace('-', '/')}${d.tag ? `・${d.tag}` : ''}</small></div>
        <div class="days">${d.days === 0 ? '就是今天' : `${d.days}<small> 天</small>`}</div></div>`).join('')}</div>` : ''}
    ${settings.token ? pushCard() : ''}
    ${themeCard()}
    ${settings.token ? healthCard() : ''}
    ${settings.token ? usageCard() : ''}
    <div class="card">
      <h2>連線設定</h2>
      <div class="field"><label>GitHub 金鑰（fine-grained token）</label><input id="set-token" type="password" autocomplete="off" placeholder="github_pat_…" value="${esc(settings.token)}"></div>
      <div class="row2">
        <div class="field"><label>Repo</label><input id="set-repo" value="${esc(settings.repo)}"></div>
        <div class="field"><label>分支</label><input id="set-branch" value="${esc(settings.branch)}"></div>
      </div>
      <div class="field"><label>相簿 Repo</label><input id="set-photo-repo" value="${esc(settings.photoRepo)}"></div>
      <button class="btn block" id="set-save">儲存並連線</button>
      <p class="sync ${sync.state === 'ok' ? 'ok' : sync.state === 'err' ? 'err' : ''}"><i></i>${esc(sync.msg || '')}</p>
      <button class="btn ghost block" id="set-refresh">重新抓資料</button>
      <p class="muted" style="margin-top:12px">金鑰只存在這支手機。App 版本 ${VERSION}</p>
    </div>`;
}
$('#us-root').addEventListener('click', async (e) => {
  if (e.target.closest('#push-on')) { enablePush(); return; }
  if (e.target.closest('#push-test')) { testPush(); return; }
  const tb = e.target.closest('[data-theme]');
  if (tb) { theme.name = tb.dataset.theme; LS.set('zh-theme', theme); applyTheme(); renderUs(); return; }
  const tm = e.target.closest('[data-tmode]');
  if (tm) { theme.mode = tm.dataset.tmode; LS.set('zh-theme', theme); applyTheme(); renderUs(); return; }
  if (e.target.closest('#set-save')) {
    settings.token = $('#set-token').value.trim();
    settings.repo = $('#set-repo').value.trim() || 'KFC-666/xiaotang-space';
    settings.branch = $('#set-branch').value.trim() || 'master';
    settings.photoRepo = $('#set-photo-repo').value.trim() || 'KFC-666/zhanzhan-photos';
    photos.loadedAt = 0;
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
    loadHealth();
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

// ================= 健康（iPhone 捷徑每天同步到 home/data/health/） =================
const health = { days: LS.get('zh-health-days', {}), period: {}, cache: LS.get('zh-health-cache', {}), loadedAt: 0, last: '' };
const NO_PERIOD = new Set(['', '無', '没有', 'none', 'null', '0', 'false', 'no', '否', '未指定']);
function rebuildHealthPeriod() {
  health.period = {};
  const dates = Object.keys(health.days).sort();
  for (const d of dates) {
    const v = health.days[d];
    const p = String(v.period ?? '').trim().toLowerCase();
    if (!NO_PERIOD.has(p)) health.period[d] = true;
  }
  // 捷徑順便傳來的「過去一年經期日期」（period_days），用最新一份
  const latest = dates.length ? health.days[dates[dates.length - 1]] : null;
  const list = String(latest?.period_days ?? '').match(/\d{4}-\d{2}-\d{2}/g) || [];
  for (const d of list) health.period[d] = true;
}
rebuildHealthPeriod();
async function loadHealth() {
  if (!settings.token) return;
  try {
    const res = await gh.api('GET', `contents/home/data/health?ref=${encodeURIComponent(settings.branch)}`);
    if (res.status === 404) return;
    if (!res.ok) return;
    const list = (await res.json()).filter((f) => f.type === 'file' && f.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name)).slice(-30);
    for (const f of list) {
      if (health.cache[f.sha]) continue;
      const r = await gh.getRaw(f.path);
      try { health.cache[f.sha] = JSON.parse(r.text || '{}'); } catch { health.cache[f.sha] = {}; }
    }
    const days = {};
    let last = '';
    for (const f of list) {
      const d = health.cache[f.sha] || {};
      const date = String(d.date || f.name.slice(0, 10)).slice(0, 10);
      days[date] = { ...d, _file: f.name };
      last = f.name;
    }
    // 只留這 30 份的快取
    const keep = new Set(list.map((f) => f.sha));
    for (const k of Object.keys(health.cache)) if (!keep.has(k)) delete health.cache[k];
    health.days = days;
    health.last = last;
    health.loadedAt = Date.now();
    LS.set('zh-health-days', days);
    LS.set('zh-health-cache', health.cache);
    rebuildHealthPeriod();
    if (currentTab === 'us') renderUs();
    if (currentTab === 'mood') renderMood();
  } catch { /* 沒網路就用上次的 */ }
}
// 捷徑傳來的睡眠時間可能是純數字（分鐘或秒），換成「幾小時幾分」
function fmtSleep(v) {
  const n = Number(String(v).replace(/,/g, ''));
  if (!isFinite(n) || String(v).trim() === '') return v;
  const min = n <= 24 ? n * 60 : n <= 1440 ? n : n / 60;
  return `${Math.floor(min / 60)} 小時 ${Math.round(min % 60)} 分`;
}
function healthCard() {
  const dates = Object.keys(health.days).sort();
  if (!dates.length) return `<div class="card"><h2>健康</h2><p class="muted" style="margin:0">還沒有資料。照 repo 裡 <b>home/health-shortcut.md</b> 做好「同步給湛湛」捷徑，每天會自動傳過來。</p></div>`;
  const d = health.days[dates[dates.length - 1]];
  const row = (k, l) => (d[k] !== undefined && String(d[k]).trim() !== '' ? `<div class="hc"><span>${l}</span><b>${esc(k === 'sleep' ? fmtSleep(d[k]) : d[k])}</b></div>` : '');
  return `<div class="card"><h2>健康 <span class="muted">${dateLabel(dates[dates.length - 1])}</span></h2>
    <div class="hc-grid">${row('sleep', '睡眠')}${row('steps', '步數')}${row('active', '活動')}${row('resting_hr', '靜止心率')}${row('weight', '體重')}${row('period', '經期')}</div>
    <p class="muted" style="margin:8px 0 0">每天由 iPhone 捷徑自動同步，我聊天時看得到最近幾天。</p></div>`;
}

// ================= 推播通知 =================
const VAPID_PUBLIC = 'BIujlx74-9a-YrAOSo06QgMCh2-uWKT6u8P__veOPKvUFQS7nlcvAPyv57sc_yVKGSYTX5ksBgRGm-3QFVe-hkA';
let swReg = null;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((r) => { swReg = r; }).catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'open-chat') switchTab('chat'); });
}
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function b64urlToU8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function enablePush() {
  if (!settings.token) { toast('先貼上金鑰'); return; }
  if (!pushSupported()) { toast(isStandalone() ? '這支手機不支援通知（要 iOS 16.4 以上）' : '要從主畫面的湛湛打開，才能開通知'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('沒有允許通知。可以到「設定 → 通知 → 湛湛」打開'); renderUs(); return; }
  try {
    const reg = swReg || await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToU8(VAPID_PUBLIC) });
    const json = sub.toJSON();
    const path = 'home/data/push/subs.json';
    for (let i = 0; i < 3; i++) {
      const f = await gh.getFile(path);
      let list = [];
      try { list = f ? JSON.parse(f.text) : []; } catch { list = []; }
      list = list.filter((x) => x.sub?.endpoint !== json.endpoint);
      list.push({ sub: json, device: /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : '其他裝置', time: new Date().toISOString() });
      try { await gh.put(path, JSON.stringify(list, null, 1), f?.sha, 'App：開啟通知'); break; } catch (e) { if (i === 2 || (e.status !== 409 && e.status !== 422)) throw e; }
    }
    LS.set('zh-push', json.endpoint);
    toast('通知開好了，可以按「測試」試試看');
  } catch (e) { toast(`開不了通知：${e.message}`); }
  renderUs();
}
async function testPush() {
  const id = `t-${Date.now()}`;
  try {
    await gh.put(`home/inbox/${id}.json`, JSON.stringify({ id, kind: 'push-test', time: new Date().toISOString() }), null, '測試通知');
    toast('送出了，大約半分鐘到一分鐘會響');
  } catch (e) { toast(e.message); }
}
function pushCard() {
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const on = perm === 'granted' && LS.get('zh-push', '');
  const note = !isStandalone() ? '要從主畫面的「湛湛」打開，才能開通知。'
    : !pushSupported() ? '這支手機的系統還不支援網頁通知（要 iOS 16.4 以上）。'
    : perm === 'denied' ? '通知被關掉了，到 iPhone「設定 → 通知 → 湛湛」打開。'
    : on ? '已開啟。我回妳的時候，鎖屏也會響。' : '開啟後，我回妳的時候手機會跳通知。';
  return `<div class="card"><h2>通知</h2><p class="muted" style="margin:0 0 10px">${note}</p>
    <div class="sheet-actions">${on ? '<button class="btn ghost" id="push-test">測試</button>' : ''}<button class="btn" id="push-on">${on ? '重新開啟' : '開啟通知'}</button></div></div>`;
}

// ================= 主題 =================
const THEMES = {
  rose: { name: '粉灰', light: ['#fbf3f4', '#f6e6e9', '#ffffff', '#fdf0f2', '#f0d9de', '#4a3237', '#8a6d73', '#b39aa0', '#e8899b', '#d66a80', '#fbe0e6', '#f6c9d3', '#4a2a31', '#ffffff', '#3b3236', '#a07c84'],
    dark: ['#1f1a1c', '#2a2225', '#2b2427', '#332a2e', '#43373c', '#f3e6e9', '#c7aab1', '#8e767c', '#e894a5', '#f0a8b7', '#46303a', '#7d4352', '#fff1f4', '#362d31', '#f3e6e9', '#c79fa8'] },
  milktea: { name: '奶茶', light: ['#f7f1ea', '#efe4d8', '#fffdfa', '#f6ede4', '#eadccd', '#4a3a30', '#8a7464', '#b3a090', '#c9858f', '#b5687a', '#f5dfdc', '#f0d3cc', '#4a2f2a', '#fffdfa', '#3e322b', '#a08070'],
    dark: ['#1d1915', '#29231d', '#2a241e', '#332b24', '#43382e', '#f5ebe0', '#cdb9a6', '#8f7d6c', '#e6a6ad', '#eebac0', '#4a3530', '#6e4a44', '#fff3ee', '#332b24', '#f5ebe0', '#c8a898'] },
  mist: { name: '霧藍', light: ['#eef2f6', '#e1e8ef', '#ffffff', '#eaf0f5', '#d8e1ea', '#2e3846', '#6a7a8c', '#9aa8b8', '#d48aa5', '#c96a8f', '#f6dde6', '#f3cfdc', '#43283a', '#ffffff', '#2e3846', '#8494a8'],
    dark: ['#161a1f', '#1f252c', '#222931', '#2a323b', '#36404b', '#ecf2f8', '#b5c4d4', '#7d8a98', '#ef9fbd', '#f4b3cb', '#4a2e3d', '#6e3f55', '#fff0f6', '#2a323b', '#ecf2f8', '#a9b8c9'] },
  lavender: { name: '薰衣草', light: ['#f4f1f8', '#e9e3f1', '#ffffff', '#f0ebf6', '#e2d9ee', '#3a2f48', '#7b6d8e', '#aa9dbc', '#a988cc', '#8f68b6', '#ece2f7', '#e3d3f3', '#3a2650', '#ffffff', '#3a2f48', '#9686ab'],
    dark: ['#1a1720', '#241f2b', '#28232f', '#2f2a38', '#3d3647', '#f4eefc', '#cbbde0', '#8a7f9c', '#c7a6ea', '#d4baf0', '#3f3054', '#5b4378', '#f8f0ff', '#2f2a38', '#f4eefc', '#b4a3cc'] },
};
const THEME_VARS = ['--bg', '--bg-tex', '--card', '--card-2', '--line', '--text', '--text-2', '--text-3', '--accent', '--accent-strong', '--accent-soft', '--me-bubble', '--me-text', '--zhan-bubble', '--zhan-text', '--act'];
const theme = Object.assign({ name: 'rose', mode: 'auto' }, LS.get('zh-theme', {}));
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = THEMES[theme.name] || THEMES.rose;
  const dark = theme.mode === 'dark' || (theme.mode === 'auto' && darkMQ.matches);
  const vals = dark ? t.dark : t.light;
  const root = document.documentElement;
  THEME_VARS.forEach((v, i) => root.style.setProperty(v, vals[i]));
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', vals[0]));
}
darkMQ.addEventListener?.('change', applyTheme);
applyTheme();
function themeCard() {
  return `<div class="card"><h2>主題</h2>
    <div class="theme-grid">${Object.entries(THEMES).map(([k, t]) => `<button data-theme="${k}" class="${theme.name === k ? 'on' : ''}">
      <span class="sw" style="background:linear-gradient(135deg, ${t.light[0]} 50%, ${t.dark[0]} 50%)"><i style="background:${t.light[9]}"></i></span>${t.name}</button>`).join('')}</div>
    <div class="seg" style="margin:12px 0 0">${[['auto', '跟著手機'], ['light', '淺色'], ['dark', '深色']].map(([k, l]) => `<button data-tmode="${k}" class="${theme.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
  </div>`;
}

// ================= 自動更新 =================
async function checkUpdate() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const { v } = await r.json();
    if (!v || v === VERSION) return;
    const tried = sessionStorage.getItem('zh-upd');
    if (tried === v) return; // 這次開啟已經試過了，等 GitHub 更新完再說
    sessionStorage.setItem('zh-upd', v);
    location.replace(`./?v=${encodeURIComponent(v)}`);
  } catch { /* 離線 */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });

// ================= 開機 =================
checkUpdate();
autosize();
switchTab(currentTab);
syncAll(false);
