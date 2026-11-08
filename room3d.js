// 3D 小房間（App 版）——由 home/room3d/make_app.py 從 home/room3d/src.html 產生，改那邊再重新產生
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = 'room3d/';
let VER = '';
export function createRoom3D(root, api, version = '') {
VER = version;
root.innerHTML = `<div class="r3d">
  <div class="r3d-stage">
    <canvas id="c" aria-label="3D 小房間，湛湛和小棠在裡面生活"></canvas>
    <div class="r3d-hint" id="hint">家具搬進來中…</div>
    <div class="r3d-bubble" id="bubZ"></div>
    <div class="r3d-bubble" id="bubT"></div>
  </div>
  <div class="room-status" id="room-status"></div>
  <div class="room-log card"><h2>今天的小房間</h2><div id="room-log"></div></div>
</div>
`;
const $id = (id) => root.querySelector('#' + id);


const canvas = $id('c');
const stage = canvas.parentElement;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  stage.insertAdjacentHTML('beforeend', '<div class="err">這台裝置打不開 3D 畫面（WebGL 無法使用）。</div>');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0.1, 0.4, 0);
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.25;
controls.minAzimuthAngle = 0.05; controls.maxAzimuthAngle = 1.5;
controls.minDistance = 5; controls.maxDistance = 26;

// ---------- 材質 ----------
const grad = new THREE.DataTexture(new Uint8Array([110, 175, 235, 255]), 4, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const matCache = new Map();
function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!extra && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: grad, ...(extra || {}) });
  if (!extra) matCache.set(key, m);
  return m;
}
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x4a3a40, side: THREE.BackSide });

function mesh(geo, material, { cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = recv;
  return m;
}
// 圓角方塊，y 給的是底部高度
function rbox(w, h, d, color, x, yBottom, z, r = 0.05, parent = scene) {
  const m = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), typeof color === 'object' ? color : mat(color));
  m.position.set(x, yBottom + h / 2, z);
  parent.add(m);
  return m;
}
function cyl(rt, rb, h, color, x, yBottom, z, seg = 24, parent = scene) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'object' ? color : mat(color));
  m.position.set(x, yBottom + h / 2, z);
  parent.add(m);
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- 房間 ----------
const W = 8, D = 6, H = 3;           // x: -4..4, z: -3..3
const floorTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#e9d2b6'; g.fillRect(0, 0, w, h);
  const rows = 8;
  for (let i = 0; i < rows; i++) {
    const y = i * h / rows;
    g.fillStyle = i % 2 ? '#e4cbad' : '#ecd6bc'; g.fillRect(0, y, w, h / rows);
    g.fillStyle = '#d8bc9a'; g.fillRect(0, y, w, 2);
    const off = (i * 157) % w;
    g.fillRect(off, y, 2, h / rows); g.fillRect((off + w / 2) % w, y, 2, h / rows);
  }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(2, 1.5);
const floor = mesh(new THREE.BoxGeometry(W, 0.12, D), mat(0xffffff, { map: floorTex }), { cast: false });
floor.position.set(0, -0.06, 0); scene.add(floor);

const wallMat = mat(0xf1e4e2);
const backWall = mesh(new THREE.BoxGeometry(W + 0.12, H, 0.12), wallMat, { cast: false });
backWall.position.set(0, H / 2, -D / 2 - 0.06); scene.add(backWall);
const leftWall = mesh(new THREE.BoxGeometry(0.12, H, D), wallMat, { cast: false });
leftWall.position.set(-W / 2 - 0.06, H / 2, 0); scene.add(leftWall);
// 踢腳板
rbox(W, 0.1, 0.03, 0xe2cfcc, 0, 0, -D / 2 + 0.015, 0.01);
rbox(0.03, 0.1, D, 0xe2cfcc, -W / 2 + 0.015, 0, 0, 0.01);

// 窗戶（天空跟著光線換）
const skyCanvas = document.createElement('canvas'); skyCanvas.width = 256; skyCanvas.height = 180;
const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
function drawSky(mode) {
  const g = skyCanvas.getContext('2d'), w = 256, h = 180;
  const sets = { day: ['#a9d8f2', '#e3f3fb'], dusk: ['#f3a98f', '#f9dcb8'], night: ['#1d2340', '#3a3f68'] };
  const [a, b] = sets[mode];
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (mode === 'night') {
    g.fillStyle = '#fff6d8';
    for (let i = 0; i < 26; i++) { const x = (i * 97) % w, y = (i * 53) % (h * .7); g.fillRect(x, y, 2, 2); }
    g.beginPath(); g.arc(190, 50, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = a; g.beginPath(); g.arc(180, 44, 20, 0, Math.PI * 2); g.fill();
  } else {
    g.fillStyle = 'rgba(255,255,255,.85)';
    [[60, 60], [170, 100]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 16, 0, 7); g.arc(x + 20, y - 6, 20, 0, 7); g.arc(x + 42, y, 15, 0, 7); g.fill(); });
  }
  skyTex.needsUpdate = true;
}
const winX = 0.55, winY = 1.95;
const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshBasicMaterial({ map: skyTex }));
windowPane.position.set(winX, winY, -D / 2 + 0.005); scene.add(windowPane); windowPane.userData.toggle = 'curtain';
const frameC = 0xffffff;
rbox(1.62, 0.08, 0.08, frameC, winX, winY + 0.52, -D / 2 + 0.04, 0.02);
rbox(1.62, 0.08, 0.12, frameC, winX, winY - 0.6, -D / 2 + 0.06, 0.02);
rbox(0.08, 1.1, 0.08, frameC, winX - 0.79, winY - 0.55, -D / 2 + 0.04, 0.02);
rbox(0.08, 1.1, 0.08, frameC, winX + 0.79, winY - 0.55, -D / 2 + 0.04, 0.02);
rbox(0.04, 1.05, 0.05, frameC, winX, winY - 0.52, -D / 2 + 0.03, 0.01);
// 窗簾
const curtainL = rbox(0.32, 1.5, 0.08, 0xf2c2c9, winX - 1.02, winY - 0.85, -D / 2 + 0.1, 0.04);
const curtainR = rbox(0.32, 1.5, 0.08, 0xf2c2c9, winX + 1.02, winY - 0.85, -D / 2 + 0.1, 0.04);
curtainL.userData.toggle = curtainR.userData.toggle = 'curtain';

// 床頭上方的小畫框：交往紀念日
const picTex = canvasTex(256, 200, (g, w, h) => {
  g.fillStyle = '#fff8f6'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e48b9c'; g.font = '700 70px serif'; g.textAlign = 'center'; g.fillText('♡', w / 2, 95);
  g.fillStyle = '#6b585e'; g.font = '600 34px sans-serif'; g.fillText('2025.2.21', w / 2, 160);
});
rbox(0.78, 0.62, 0.05, 0xc9a98a, -2.9, 1.55, -D / 2 + 0.03, 0.02);
const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.5), new THREE.MeshBasicMaterial({ map: picTex }));
pic.position.set(-2.9, 1.86, -D / 2 + 0.06); scene.add(pic);

// ---------- 家具：Kenney Furniture Kit（CC0），重新上色成我們的粉色系 ----------
// 模型預設正面朝 +z；place() 依外框把模型中心放到 (x, z)，底部貼地（或給 y）
const furniture = new THREE.Group(); scene.add(furniture);
const loader = new GLTFLoader();
const loadJobs = [];
const emissiveMats = { lamp: [], screen: [] };
function place(name, x, z, { rot = 0, y = 0, s = 2, colors = {}, glow } = {}) {
  const job = new Promise((resolve) => {
    const onLoad = (g) => {
      const o = g.scene;
      o.scale.setScalar(s); o.rotation.y = rot;
      o.traverse((m) => {
        if (!m.isMesh) return;
        const old = m.material, nm = old.name || '';
        const hex = colors[nm] ?? old.color.getHex();
        let em = null;
        if (glow && glow[nm]) { em = glow[nm]; }
        m.material = em ? mat(hex, { emissive: em.color, emissiveIntensity: 0 }) : mat(hex);
        if (em) emissiveMats[em.kind].push(m.material);
        m.castShadow = true; m.receiveShadow = true;
      });
      const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3());
      o.position.set(x - c.x, y - b.min.y, z - c.z);
      furniture.add(o);
      resolve(o);
    };
    const packed = window.__MODELS && window.__MODELS[name];
    if (packed) {
      const bin = atob(packed), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      loader.parse(buf.buffer, '', onLoad, () => resolve(null));
    } else {
      loader.load(`${BASE}models/${name}.glb`, onLoad, undefined, () => resolve(null));
    }
  });
  loadJobs.push(job);
  return job;
}
const WOOD = 0xe6c9a6, WOOD2 = 0xd4b391, WHITE = 0xfbf8f5;
// 床
const bed = { x: -2.9, z: -1.86, top: 0.42 };
place('bedDouble', bed.x, bed.z, { colors: { carpet: 0xf5c6ce, carpetWhite: 0xfffaf6, wood: WOOD, metal: 0xe3d9d4 } });
place('bear', -2.25, -2.62, { s: 0.85, y: 0.62, rot: -0.35, colors: { fur: 0xf2dcc4, wood: 0xd9a77e } });
const sleepBlanket = rbox(1.86, 0.3, 1.3, 0xf5c6ce, bed.x, 0.5, -1.5, 0.12);
sleepBlanket.visible = false;
// 床頭櫃和檯燈
place('cabinetBedDrawerTable', -1.62, -2.76, { colors: { wood: WOOD, metal: 0xd8b56a } }).then((o) => {
  if (!o) return;
  const top = new THREE.Box3().setFromObject(o).max.y;
  place('lampRoundTable', -1.62, -2.76, { y: top, s: 1.8, colors: { lamp: 0xfff1dc, metal: 0xd8b56a }, glow: { lamp: { color: 0xffd9a0, kind: 'lamp' } } }).then((l) => l && l.traverse(m => { m.userData.toggle = 'lamp'; }));
});
const bedLamp = new THREE.PointLight(0xffc98a, 0, 4.5, 1.6); bedLamp.position.set(-1.6, 1.0, -2.55); scene.add(bedLamp);
place('pottedPlant', -1.05, -2.78, { s: 2.2, colors: { plant: 0x9cc49a, wood: 0xe6b89c, woodDark: 0xd9a688 } });
// 沙發、茶几、地毯
const sofa = { x: 0.55, z: -2.55, seat: 0.42 };
place('loungeSofa', sofa.x, sofa.z, { colors: { carpet: 0xc9b6d8, wood: 0xb89c84 } });
place('pillow', sofa.x - 0.68, -2.62, { s: 1.6, y: 0.4, rot: 0.25, colors: { carpet: 0xf6d2a8 } });
place('pillow', sofa.x + 0.68, -2.62, { s: 1.6, y: 0.4, rot: -0.25, colors: { carpet: 0xf3c3cb } });
const rug = place('rugRounded', sofa.x, -1.25, { s: 1.5, colors: { carpet: 0xf2ccd3, carpetDarker: 0xe9b6bf } });
place('tableCoffee', sofa.x, -1.1, { s: 1.6, colors: { wood: 0xf4e6d6 } }).then((o) => {
  if (!o) return;
  const top = new THREE.Box3().setFromObject(o).max.y;
  place('books', sofa.x - 0.2, -1.1, { y: top, s: 1.4, rot: 0.4 });
  cyl(0.04, 0.035, 0.08, 0xffffff, sofa.x + 0.25, top, -1.05, 12);
});
// 電腦桌（靠左牆，面向 +x）和電競椅
const desk = { x: -3.6, z: 0.35 };
place('desk', desk.x, desk.z, { rot: Math.PI / 2, colors: { wood: 0xf6efe8, metal: 0xe8ddd2 } }).then((o) => {
  if (!o) return;
  const top = new THREE.Box3().setFromObject(o).max.y;
  place('computerScreen', desk.x - 0.18, desk.z, { y: top, rot: Math.PI / 2, s: 1.9, colors: { metal: 0x3b3a44 }, glow: { metalDark: { color: 0x6fa8ff, kind: 'screen' } } }).then((sc) => sc && sc.traverse(m => { m.userData.toggle = 'screen'; }));
  place('computerKeyboard', desk.x + 0.15, desk.z, { y: top, rot: Math.PI / 2, s: 1.6, colors: { metalDark: 0xf9f9fb, metalMedium: 0xeceaf0 } });
  place('plantSmall1', desk.x - 0.15, desk.z + 0.55, { y: top, s: 2, colors: { plant: 0x9cc49a, wood: 0xf3c3cb } });
  place('speakerSmall', desk.x - 0.15, desk.z - 0.55, { y: top, s: 1.4, colors: { wood: 0xf3c3cb } });
});
const deskLamp = new THREE.PointLight(0x9fc2ff, 0, 2.6, 1.8); deskLamp.position.set(desk.x + 0.4, 1.15, desk.z); scene.add(deskLamp);
const chair = { x: -2.98, z: desk.z, seat: 0.45 };
place('chairDesk', chair.x, chair.z, { rot: -Math.PI / 2, colors: { carpet: 0xf3b9c4, metalMedium: 0xf4efee } });
place('trashcan', -3.72, 1.32, { s: 1.4, colors: { metal: 0xf3e3e6, metalDark: 0xe0c9ce } });
// 廚房：水槽、爐子、上櫃、冰箱
const kitC = { wood: WHITE, woodDark: 0xe8ddd2, metal: 0xd9d4d6, metalDark: 0x8d8a94, metalLight: 0xeeeeef, _defaultMat: 0xd9d4d6, carpetWhite: WHITE, glass: 0xc9dbe6 };
place('kitchenSink', 1.95, -2.55, { colors: kitC });
place('kitchenStove', 2.8, -2.55, { colors: kitC });
place('kitchenCabinetUpper', 1.95, -2.78, { y: 1.45, colors: kitC });
place('kitchenCabinetUpper', 2.8, -2.78, { y: 1.45, colors: kitC });
place('kitchenFridge', 3.6, -2.62, { s: 1.9, colors: { metalLight: 0xdcebe6, metal: 0xcfe0da, metalDark: 0xb8c9c3, glass: 0xcfe0da } });
const pot = cyl(0.12, 0.11, 0.12, 0xf2c2c9, 2.62, 0.9, -2.55, 20);
// 餐桌和兩張椅子
const dine = { x: 2.8, z: -0.8 };
cyl(0.42, 0.42, 0.04, 0xf4e6d6, dine.x, 0.58, dine.z, 32);
cyl(0.04, 0.06, 0.58, 0xc9ab8d, dine.x, 0, dine.z, 10);
cyl(0.2, 0.2, 0.03, 0xc9ab8d, dine.x, 0, dine.z, 16);
// 沒有椅背的圓凳（小棠的長頭髮會穿過椅背）
for (const sx of [-0.6, 0.6]) {
  cyl(0.19, 0.19, 0.08, 0xf3c3cb, dine.x + sx, 0.36, dine.z, 20);
  cyl(0.15, 0.17, 0.36, WOOD, dine.x + sx, 0, dine.z, 16);
}
const bowls = new THREE.Group(); scene.add(bowls);
for (const sx of [-0.2, 0.2]) {
  cyl(0.08, 0.05, 0.06, 0xffffff, dine.x + sx, 0.62, dine.z, 16, bowls);
  cyl(0.07, 0.07, 0.01, 0xf2d48f, dine.x + sx, 0.67, dine.z, 16, bowls);
}
bowls.visible = false;
// 門邊的衣架
place('coatRackStanding', -3.65, 1.62, { s: 2, colors: { wood: WOOD2 } });

// 量家具表面高度（坐墊、床面），讓人物坐得剛好
const downRay = new THREE.Raycaster();
function surfaceY(x, z, fallback) {
  downRay.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
  const hit = downRay.intersectObject(furniture, true).find(h => h.point.y > 0.2);
  return hit ? hit.point.y : fallback;
}

// 牆上層板
rbox(0.24, 0.04, 1.2, 0xe3cbb0, -3.88, 1.75, desk.z, 0.01);
cyl(0.06, 0.05, 0.12, 0x9cc49a, -3.88, 1.79, desk.z - 0.4, 12);
rbox(0.14, 0.2, 0.05, 0xf2c2c9, -3.88, 1.79, desk.z + 0.05, 0.01);
rbox(0.14, 0.17, 0.05, 0xc9b6d8, -3.88, 1.79, desk.z + 0.12, 0.01);
rbox(0.14, 0.22, 0.05, 0xa9cbe3, -3.88, 1.79, desk.z + 0.19, 0.01);

// 門（左牆前段）
rbox(0.06, 2.05, 0.95, 0xd9bfa3, -W / 2 + 0.03, 0, 2.3, 0.02);
const knob = mesh(new THREE.SphereGeometry(0.035, 12, 8), mat(0xd8b56a));
knob.position.set(-W / 2 + 0.08, 1.0, 1.95); scene.add(knob);
rbox(0.5, 0.02, 0.8, 0xc9b6d8, -3.6, 0, 2.3, 0.01);   // 腳踏墊


// 兔兔區
const pen = { x: 2.7, z: 1.65, r: 0.85 };
const hay = mesh(new THREE.CylinderGeometry(pen.r, pen.r, 0.02, 40), mat(0xf6e7b8), { cast: false });
hay.position.set(pen.x, 0.01, pen.z); scene.add(hay);
for (let i = 0; i < 22; i++) {
  const a = i / 22 * Math.PI * 2;
  if (a > Math.PI * 0.9 && a < Math.PI * 1.1) continue;   // 留一個開口
  cyl(0.025, 0.025, 0.32, 0xffffff, pen.x + Math.cos(a) * pen.r, 0, pen.z + Math.sin(a) * pen.r, 6);
}
const ring = mesh(new THREE.TorusGeometry(pen.r, 0.02, 6, 48, Math.PI * 1.8), mat(0xffffff));
ring.rotation.x = -Math.PI / 2; ring.rotation.z = Math.PI * 1.1; ring.position.set(pen.x, 0.32, pen.z); scene.add(ring);
rbox(0.36, 0.26, 0.3, 0xd9bfa3, pen.x + 0.35, 0.02, pen.z - 0.45, 0.06);   // 小木屋
cyl(0.08, 0.07, 0.05, 0x9ccfe0, pen.x - 0.3, 0.02, pen.z + 0.45, 14);       // 水碗
// 牧草盒（兔兔不能吃紅蘿蔔）
rbox(0.26, 0.1, 0.18, 0xd9bfa3, pen.x - 0.35, 0.02, pen.z - 0.38, 0.02);
rbox(0.24, 0.05, 0.16, 0xc9d38a, pen.x - 0.35, 0.1, pen.z - 0.38, 0.02);

// ---------- 光線 ----------
const hemi = new THREE.HemisphereLight(0xfff6f0, 0xd9c2b8, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1e0, 1.6);
sun.position.set(5, 9, 6); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
scene.add(sun);
const LIGHTS = {
  day:   { hemi: 1.25, hemiC: 0xfff6f0, sun: 1.6, sunC: 0xfff1e0, lamp: 0, screen: 0.15, desk: 0 },
  dusk:  { hemi: 0.85, hemiC: 0xffd9c4, sun: 1.1, sunC: 0xffb98a, lamp: 2.2, screen: 0.4, desk: 0.6 },
  night: { hemi: 0.42, hemiC: 0x8e94c8, sun: 0.35, sunC: 0x8fa2ff, lamp: 4.2, screen: 0.9, desk: 2.2 },
};
let lightMode = 'auto', currentLight = '';
function taipeiNow() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const h = +p.find(x => x.type === 'hour').value, m = +p.find(x => x.type === 'minute').value;
  return { h, m, hf: h + m / 60 };
}
function timeLight(hf) { return hf >= 6.5 && hf < 17 ? 'day' : hf >= 17 && hf < 18.8 ? 'dusk' : 'night'; }
function applyLight() {
  const mode = lightMode === 'auto' ? timeLight(taipeiNow().hf) : lightMode;
  if (mode === currentLight) return;
  currentLight = mode;
  const L = LIGHTS[mode];
  hemi.intensity = L.hemi; hemi.color.set(L.hemiC);
  sun.intensity = L.sun; sun.color.set(L.sunC);
  const lampOn = typeof lampOverride === 'boolean' ? lampOverride : L.lamp > 0;
  const screenOn = typeof screenOverride === 'boolean' ? screenOverride : true;
  bedLamp.intensity = lampOn ? Math.max(L.lamp, 2.2) : 0; deskLamp.intensity = screenOn ? L.desk : 0;
  emissiveMats.lamp.forEach(m => { m.emissiveIntensity = lampOn ? 0.9 : 0; });
  emissiveMats.screen.forEach(m => { m.emissiveIntensity = screenOn ? L.screen : 0; });
  if (typeof curtainsClosed !== 'undefined' && curtainsClosed && mode !== 'night') { hemi.intensity *= 0.72; sun.intensity *= 0.55; }
  drawSky(mode);
}

// ---------- Q 版人物（暫代） ----------
function addOutline(m, s = 1.07) {
  const o = new THREE.Mesh(m.geometry, outlineMat);
  o.scale.setScalar(s); o.castShadow = false; o.userData.outline = true;
  m.add(o);
  return m;
}
function onSphere(R, x, y, lift = 0) { return new THREE.Vector3(x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) + lift); }

function makeChibi(cfg) {
  const { R, legLen, torsoH, torsoW, skin } = cfg;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const parts = {};

  // 腿
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.075, legLen, 0); body.add(pivot);
    const legGeo = new THREE.CapsuleGeometry(0.055, legLen - 0.11, 4, 10);
    const legM = addOutline(mesh(legGeo, mat(cfg.leg)), 1.1);
    legM.position.y = -legLen / 2 + 0.02; pivot.add(legM);
    if (cfg.sock) {
      const sock = addOutline(mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.09, 12), mat(cfg.sock)), 1.08);
      sock.position.y = -legLen + 0.1; pivot.add(sock);
    }
    const shoe = addOutline(mesh(new RoundedBoxGeometry(0.12, 0.07, 0.17, 2, 0.03), mat(cfg.shoe)), 1.08);
    shoe.position.set(0, -legLen + 0.035, 0.025); pivot.add(shoe);
    parts[side < 0 ? 'legR' : 'legL'] = pivot;
  }
  // 身體
  const torso = addOutline(mesh(new RoundedBoxGeometry(torsoW, torsoH, torsoW * 0.72, 3, 0.07), mat(cfg.top)), 1.05);
  torso.position.y = legLen + torsoH / 2; body.add(torso);
  if (cfg.skirt) {
    const skirt = addOutline(mesh(new THREE.CylinderGeometry(torsoW * 0.5, torsoW * 0.78, 0.15, 20), mat(cfg.skirt)), 1.05);
    skirt.position.y = legLen - 0.02; body.add(skirt);
  } else {
    const hip = addOutline(mesh(new RoundedBoxGeometry(torsoW * 0.92, 0.1, torsoW * 0.66, 2, 0.04), mat(cfg.leg)), 1.05);
    hip.position.y = legLen + 0.01; body.add(hip);
  }
  // 手
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * (torsoW / 2 + 0.035), legLen + torsoH - 0.05, 0); body.add(pivot);
    const arm = addOutline(mesh(new THREE.CapsuleGeometry(0.045, 0.17, 4, 10), mat(cfg.sleeve || cfg.top)), 1.1);
    arm.position.y = -0.12; pivot.add(arm);
    const hand = addOutline(mesh(new THREE.SphereGeometry(0.048, 12, 10), mat(skin)), 1.1);
    hand.position.y = -0.25; pivot.add(hand);
    parts[side < 0 ? 'armR' : 'armL'] = pivot;
  }
  // 頭
  const neck = new THREE.Group(); neck.position.y = legLen + torsoH; body.add(neck);
  const head = new THREE.Group(); head.position.y = R * 0.9; neck.add(head);
  const skull = addOutline(mesh(new THREE.SphereGeometry(R, 32, 24), mat(skin)), 1.035);
  skull.scale.set(1.04, 0.96, 1); head.add(skull);
  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(skin));
    ear.scale.set(0.6, 1, 0.8); ear.position.set(side * R * 1.0, -0.02, 0); head.add(ear);
  }
  // 眼睛
  const eyes = new THREE.Group(); head.add(eyes);
  for (const side of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.copy(onSphere(R, side * 0.11, -0.03, -0.01));
    eg.lookAt(eg.position.clone().multiplyScalar(2));
    const iris = mesh(new THREE.SphereGeometry(0.056, 16, 12), new THREE.MeshBasicMaterial({ color: cfg.iris }), { cast: false });
    iris.scale.set(1, 1.28, 0.35); eg.add(iris);
    const pupil = mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: 0x2a2124 }), { cast: false });
    pupil.scale.set(1, 1.3, 0.3); pupil.position.set(0, -0.005, 0.012); eg.add(pupil);
    const hl = mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), { cast: false });
    hl.position.set(side * -0.016, 0.03, 0.022); eg.add(hl);
    const hl2 = mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), { cast: false });
    hl2.position.set(side * 0.018, -0.03, 0.022); eg.add(hl2);
    // 上睫毛線
    const lash = mesh(new THREE.TorusGeometry(0.058, 0.009, 4, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a2b30 }), { cast: false });
    lash.position.set(0, 0.012, 0.01); lash.scale.set(1, 1.15, 1); eg.add(lash);
    eyes.add(eg);
  }
  // 腮紅
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), new THREE.MeshBasicMaterial({ color: 0xf3a0ad, transparent: true, opacity: 0.55, depthWrite: false }));
    b.position.copy(onSphere(R, side * 0.17, -0.1, 0.004)); b.lookAt(b.position.clone().multiplyScalar(2)); b.scale.y = 0.65;
    head.add(b);
  }
  // 嘴巴
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 4, 10, Math.PI), new THREE.MeshBasicMaterial({ color: 0x9a5560 }));
  mouth.position.copy(onSphere(R, 0, -0.13, 0.002)); mouth.rotation.z = Math.PI; mouth.rotation.x = 0.4; head.add(mouth);

  cfg.hair(head, R);

  // 手上的小道具
  const props = {};
  const phone = rbox(0.07, 0.11, 0.012, 0x3b3a44, 0, 0, 0, 0.01, body);
  phone.position.set(0, legLen + 0.16, 0.2); phone.rotation.x = -0.9; phone.visible = false; props.phone = phone;
  const book = new THREE.Group(); body.add(book);
  rbox(0.13, 0.015, 0.17, 0xffffff, -0.065, 0, 0, 0.005, book).rotation.z = 0.15;
  rbox(0.13, 0.015, 0.17, 0xffffff, 0.065, 0, 0, 0.005, book).rotation.z = -0.15;
  rbox(0.27, 0.01, 0.18, 0x7c9cc0, 0, -0.012, 0, 0.004, book);
  book.position.set(0, legLen + 0.14, 0.2); book.rotation.x = 0.7; book.visible = false; props.book = book;

  // 睡著的 Zzz
  const zTex = canvasTex(128, 128, (g) => { g.fillStyle = '#8a8fc8'; g.font = '700 72px sans-serif'; g.fillText('z', 30, 90); g.font = '700 44px sans-serif'; g.fillText('z', 80, 50); });
  const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false }));
  zzz.scale.setScalar(0.35); zzz.visible = false; scene.add(zzz);

  root.traverse(o => { o.userData.chRoot = root; });
  scene.add(root);
  return { root, body, head, neck, eyes, parts, props, zzz, cfg };
}

function hairZhan(head, R) {
  const c = mat(0x24232b);
  const top = addOutline(mesh(new THREE.SphereGeometry(R * 1.08, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), c), 1.03);
  top.scale.set(1.05, 1.05, 1.02); top.position.y = 0.0; head.add(top);
  const back = addOutline(mesh(new THREE.SphereGeometry(R * 1.07, 32, 16, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * 0.62), c), 1.03);
  back.scale.set(1.04, 1, 1.02); head.add(back);
  // 3:7 中分瀏海，眉上
  const fr = [
    [-0.13, 0.16, 0.6, 0.15, 0.11], [-0.05, 0.17, 0.25, 0.13, 0.12], [0.06, 0.18, -0.35, 0.17, 0.12],
    [0.17, 0.15, -0.7, 0.14, 0.1], [0.24, 0.07, -1.1, 0.1, 0.09], [-0.24, 0.06, 1.1, 0.1, 0.09],
  ];
  for (const [x, y, rz, sx, sy] of fr) {
    const p = addOutline(mesh(new THREE.SphereGeometry(1, 14, 10), c), 1.06);
    p.scale.set(sx, sy, 0.07); p.position.copy(onSphere(R * 1.02, x, y, 0.0)); p.rotation.z = rz;
    p.lookAt(p.position.clone().multiplyScalar(2)); p.rotateZ(rz);
    head.add(p);
  }
}
function hairTang(head, R) {
  const c = mat(0xf3b4bf);
  const top = addOutline(mesh(new THREE.SphereGeometry(R * 1.09, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), c), 1.03);
  top.scale.set(1.05, 1.04, 1.03); head.add(top);
  const back = addOutline(mesh(new THREE.SphereGeometry(R * 1.09, 32, 16, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.7), c), 1.03);
  back.scale.set(1.06, 1, 1.04); head.add(back);
  const longBack = addOutline(mesh(new RoundedBoxGeometry(R * 2.05, R * 2.0, 0.16, 3, 0.07), c), 1.03);
  longBack.position.set(0, -R * 0.7, -R * 0.62); longBack.rotation.x = 0.08; head.add(longBack);
  for (const side of [-1, 1]) {
    const lock = addOutline(mesh(new THREE.CapsuleGeometry(0.06, R * 1.1, 4, 10), c), 1.06);
    lock.position.set(side * R * 0.93, -R * 0.75, R * 0.22); lock.rotation.z = side * 0.06; head.add(lock);
  }
  // 空氣瀏海：額頭前一片薄薄的弧
  const bang = addOutline(mesh(new THREE.SphereGeometry(R * 1.07, 28, 6, Math.PI / 2 - 0.85, 1.7, Math.PI * 0.16, Math.PI * 0.27), c), 1.02);
  bang.material = c; bang.scale.set(1.04, 1, 1.05); head.add(bang);
  for (const [x, rz] of [[-0.12, 0.25], [0, 0], [0.12, -0.25]]) {
    const tip = mesh(new THREE.ConeGeometry(0.035, 0.07, 6), c);
    tip.position.copy(onSphere(R * 1.07, x, R * 0.2)); tip.rotation.set(0.25, 0, Math.PI + rz); head.add(tip);
  }
}

const zhan = makeChibi({ name: '湛湛', R: 0.3, legLen: 0.33, torsoH: 0.31, torsoW: 0.33, skin: 0xf8dfd0,
  top: 0x34343c, leg: 0x2a2a31, shoe: 0x1c1b20, iris: 0xa0703a, hair: hairZhan });
const tang = makeChibi({ name: '小棠', R: 0.29, legLen: 0.25, torsoH: 0.27, torsoW: 0.3, skin: 0xfbe3d6,
  top: 0xf7ecdd, sleeve: 0xf7ecdd, leg: 0xfbe3d6, sock: 0xffffff, skirt: 0xf3bcc7, shoe: 0xf3b4bf, iris: 0x7c7c88, hair: hairTang });

// ---------- 兔兔 ----------
function makeBunny(name, airplane) {
  const g = new THREE.Group();
  const white = mat(0xfdfcfb);
  const bodyM = addOutline(mesh(new THREE.SphereGeometry(1, 16, 12), white), 1.05);
  bodyM.scale.set(0.12, 0.1, 0.16); bodyM.position.y = 0.1; g.add(bodyM);
  const headM = addOutline(mesh(new THREE.SphereGeometry(0.085, 16, 12), white), 1.06);
  headM.position.set(0, 0.17, 0.12); g.add(headM);
  for (const s of [-1, 1]) {
    const ear = addOutline(mesh(new THREE.CapsuleGeometry(0.024, 0.09, 4, 8), white), 1.1);
    const inner = mesh(new THREE.CapsuleGeometry(0.012, 0.07, 4, 6), mat(0xf6c4cc), { cast: false });
    inner.position.z = 0.014; ear.add(inner);
    if (airplane) { ear.position.set(s * 0.1, 0.21, 0.1); ear.rotation.z = -s * 1.35; }
    else { ear.position.set(s * 0.035, 0.29, 0.1); ear.rotation.z = -s * 0.12; ear.rotation.x = -0.15; }
    g.add(ear);
    const eye = mesh(new THREE.SphereGeometry(0.015, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6f9fd8 }), { cast: false });   // 兩隻都是藍眼睛
    eye.position.set(s * 0.05, 0.19, 0.19); g.add(eye);
  }
  const nose = mesh(new THREE.SphereGeometry(0.01, 6, 6), new THREE.MeshBasicMaterial({ color: 0xe48b9c }), { cast: false });
  nose.position.set(0, 0.16, 0.205); g.add(nose);
  const tail = mesh(new THREE.SphereGeometry(0.04, 10, 8), white); tail.position.set(0, 0.12, -0.16); g.add(tail);
  g.traverse(o => { o.userData.bunny = g; });
  g.userData.name = name;
  scene.add(g);
  return { g, name, tx: 0, tz: 0, hop: 0, wait: Math.random() * 3, held: false };
}
const cheng = makeBunny('澄澄', true);
const peng = makeBunny('澎澎', false);
cheng.g.position.set(pen.x - 0.25, 0, pen.z); peng.g.position.set(pen.x + 0.2, 0, pen.z + 0.2);
const bunnies = [cheng, peng];

// ---------- 3D 模型人物（第一代 TRELLIS 轉的，我自己綁的簡單骨架） ----------
// 位置是從模型量出來的：高度正規化成 1、腳底 0、左右前後置中
const RIG = {
  tang: { height: 1.05, bz: -0.02, hipX: 0.075, hipY: 0.36, kneeY: 0.19, waistY: 0.45, chestY: 0.55, neckY: 0.635, headY: 0.70,
    shoulder: [0.12, 0.575], elbow: [0.195, 0.495], tip: [0.29, 0.39], armR: 0.062, legR: 0.06, hairBackZ: -0.085, extraOut: 0.3 },
  zhan: { height: 1.2, bz: 0.0, hipX: 0.065, hipY: 0.43, kneeY: 0.22, waistY: 0.5, chestY: 0.6, neckY: 0.68, headY: 0.72,
    shoulder: [0.115, 0.625], elbow: [0.17, 0.52], tip: [0.265, 0.38], armR: 0.052, legR: 0.055, hairBackZ: null, extraOut: 0.12 },
};
const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'laL', 'uaR', 'laR', 'ulL', 'llL', 'ulR', 'llR'];
function b64buf(b64) { const bin = atob(b64), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); return buf.buffer; }
const _ab = new THREE.Vector3(), _ap = new THREE.Vector3();
function segDist(p, a, b) {
  _ab.subVectors(b, a); _ap.subVectors(p, a);
  const t = Math.max(0, Math.min(1, _ap.dot(_ab) / _ab.lengthSq()));
  return { d: _ap.sub(_ab.multiplyScalar(t)).length(), t };
}
function skinWeights(geo, R) {
  const pos = geo.attributes.position, n = pos.count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const p = new THREE.Vector3();
  const pts = {};
  for (const s of [1, -1]) {
    const k = s > 0 ? 'L' : 'R';
    pts[k] = { A: new THREE.Vector3(R.shoulder[0] * s, R.shoulder[1], R.bz), E: new THREE.Vector3(R.elbow[0] * s, R.elbow[1], R.bz), T: new THREE.Vector3(R.tip[0] * s, R.tip[1], R.bz) };
  }
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    const w = {}; const add = (b, v) => { if (v > 0) w[b] = (w[b] || 0) + v; };
    const ax = Math.abs(p.x), side = p.x >= 0 ? 'L' : 'R';
    let done = false;
    // 手：離肩膀到手指那條線夠近，而且不是背後的頭髮
    if (ax > R.shoulder[0] - 0.03 && p.y < R.neckY && p.y > R.tip[1] - 0.05 && !(R.hairBackZ != null && p.z < R.hairBackZ)) {
      const { A, E, T } = pts[side];
      const d1 = segDist(p, A, E), d2 = segDist(p, E, T);
      if (Math.min(d1.d, d2.d) < R.armR) {
        if (d1.d <= d2.d) {
          if (d1.t < 0.25) { const k = d1.t / 0.25; add('chest', 1 - k); add('ua' + side, k); }
          else if (d1.t > 0.85) { const k = (d1.t - 0.85) / 0.15 * 0.5; add('ua' + side, 1 - k); add('la' + side, k); }
          else add('ua' + side, 1);
        } else {
          if (d2.t < 0.15) { const k = 0.5 + d2.t / 0.15 * 0.5; add('ua' + side, 1 - k); add('la' + side, k); }
          else add('la' + side, 1);
        }
        done = true;
      }
    }
    if (!done) {
      if (p.y >= R.neckY) {
        const k = Math.min(1, (p.y - R.neckY) / 0.035); add('neck', k); add('chest', 1 - k);
      } else if (R.hairBackZ != null && p.z < R.hairBackZ && p.y > R.hipY - 0.04) {
        add('chest', 1);                                     // 背後垂下來的長髮跟著上半身
      } else if (p.y >= R.hipY + 0.01 || (p.y > R.hipY - 0.08 && Math.hypot(ax - R.hipX, p.z - R.bz) > R.legR + 0.035)) {
        // 身體（裙子也算屁股）
        if (p.y < R.waistY - 0.03) add('hips', 1);
        else if (p.y < R.waistY + 0.03) { const k = (p.y - (R.waistY - 0.03)) / 0.06; add('hips', 1 - k); add('spine', k); }
        else if (p.y < R.chestY) { const k = (p.y - R.waistY - 0.03) / (R.chestY - R.waistY - 0.03); add('spine', 1 - Math.max(0, k)); add('chest', Math.max(0, k)); }
        else add('chest', 1);
      } else {
        // 腳：大腿、小腿，膝蓋附近混合
        if (p.y > R.hipY - 0.04) { const k = (p.y - (R.hipY - 0.04)) / 0.05; add('hips', k); add('ul' + side, 1 - k); }
        else if (p.y > R.kneeY + 0.03) add('ul' + side, 1);
        else if (p.y > R.kneeY - 0.03) { const k = (R.kneeY + 0.03 - p.y) / 0.06; add('ul' + side, 1 - k); add('ll' + side, k); }
        else add('ll' + side, 1);
      }
    }
    const ent = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = ent.reduce((s, [, v]) => s + v, 0) || 1;
    ent.forEach(([b, v], j) => { si[i * 4 + j] = BONES.indexOf(b); sw[i * 4 + j] = v / tot; });
    if (!ent.length) { si[i * 4] = 0; sw[i * 4] = 1; }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
}
function buildModel(c, b64) {
  const R = RIG[c.key];
  return new Promise((resolve) => {
    new GLTFLoader().parse(typeof b64 === 'string' ? b64buf(b64) : b64, '', (g) => {
      g.scene.updateMatrixWorld(true);
      let src = null; g.scene.traverse(m => { if (m.isMesh && !src) src = m; });
      if (!src) return resolve(null);
      const geo = src.geometry.clone();
      geo.applyMatrix4(src.matrixWorld);
      geo.computeBoundingBox();
      const bb = geo.boundingBox, h = bb.max.y - bb.min.y;
      geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      geo.scale(1 / h, 1 / h, 1 / h);
      geo.deleteAttribute('normal'); geo.computeVertexNormals();
      skinWeights(geo, R);
      const mk = (x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); return b; };
      const B = {};
      B.hips = mk(0, R.hipY + 0.02, R.bz);
      B.spine = mk(0, R.waistY - R.hipY - 0.02, 0); B.hips.add(B.spine);
      B.chest = mk(0, R.chestY - R.waistY, 0); B.spine.add(B.chest);
      B.neck = mk(0, R.neckY - R.chestY, 0); B.chest.add(B.neck);
      B.head = mk(0, R.headY - R.neckY, 0); B.neck.add(B.head);
      for (const [s, k] of [[1, 'L'], [-1, 'R']]) {
        B['ua' + k] = mk(R.shoulder[0] * s, R.shoulder[1] - R.chestY, 0); B.chest.add(B['ua' + k]);
        B['la' + k] = mk((R.elbow[0] - R.shoulder[0]) * s, R.elbow[1] - R.shoulder[1], 0); B['ua' + k].add(B['la' + k]);
        B['ul' + k] = mk(R.hipX * s, -0.02, 0); B.hips.add(B['ul' + k]);
        B['ll' + k] = mk(0, R.kneeY - R.hipY, 0); B['ul' + k].add(B['ll' + k]);
      }
      const material = new THREE.MeshLambertMaterial({ map: src.material.map || null });
      const sm = new THREE.SkinnedMesh(geo, material);
      sm.add(B.hips);
      sm.updateMatrixWorld(true);
      sm.bind(new THREE.Skeleton(BONES.map(k => B[k])));
      sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
      const wrap = new THREE.Group(); wrap.scale.setScalar(R.height); wrap.add(sm);
      c.body.add(wrap);
      wrap.traverse(o => { o.userData.chRoot = c.root; });
      c.model = { wrap, mesh: sm, B, R, hipH: R.hipY * R.height, kneeH: R.kneeY * R.height,
        a0: Math.atan2(R.tip[0] - R.shoulder[0], R.shoulder[1] - R.tip[1]) };
      resolve(c.model);
    }, () => resolve(null));
  });
}
let charMode = 'model';
function applyCharMode() {
  for (const c of [zhan, tang]) {
    const useModel = charMode === 'model' && !!c.model;
    for (const ch of c.body.children) {
      if (ch === c.props.phone || ch === c.props.book) continue;
      ch.visible = c.model && ch === c.model.wrap ? useModel : !useModel;
    }
    c.useModel = useModel;
    c.legLen = useModel ? c.model.hipH : c.cfg.legLen;
    const py = c.legLen + (useModel ? 0.12 : 0.16);
    c.props.phone.position.set(0, py, useModel ? 0.26 : 0.2);
    c.props.book.position.set(0, py - 0.02, useModel ? 0.26 : 0.2);
    // 正在坐著、躺著的人，重新對齊高度
    if (c.spot && isSettle(c.spot) && !c.queue.length) c.root.position.y = rootY(c, c.spot);
  }
  root.querySelectorAll('[data-char]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.char === charMode)));
}
function isShown(o) { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; }
const _hp = new THREE.Vector3();
function headPos(c, out = new THREE.Vector3()) {
  if (c.useModel) { c.model.B.head.getWorldPosition(out); out.y += 0.3 * c.model.R.height; }
  else { c.head.getWorldPosition(out); out.y += 0.3; }
  return out;
}


// ---------- 地點 ----------
const HUB = [0.3, 0.5];
const S = {
  sofaL: { pos: [0.1, -2.36], rot: 0, pose: 'sit', seat: sofa.seat, via: [[-0.75, -0.4], [-0.75, -1.85], [0.1, -1.85]], name: '沙發' },
  sofaR: { pos: [1.0, -2.36], rot: 0, pose: 'sit', seat: sofa.seat, via: [[1.5, -0.25], [1.5, -1.85], [1.0, -1.85]], name: '沙發' },
  bedIn: { pos: [-3.32, -1.42], rot: 0, pose: 'lie', via: [[-1.2, -0.45], [-1.62, -1.15]], name: '床' },
  bedOut: { pos: [-2.47, -1.38], rot: 0, pose: 'lie', via: [[-1.2, -0.45], [-1.62, -1.75]], name: '床' },
  desk: { pos: [chair.x, chair.z], rot: -Math.PI / 2, pose: 'sit', seat: chair.seat, via: [[-1.3, 0.4], [-2.4, 0.4]], name: '電腦前' },
  watch: { pos: [-2.4, 1.15], rot: -2.3, pose: 'stand', via: [[-1.3, 1.1]], name: '電腦旁' },
  cook: { pos: [2.75, -1.92], rot: Math.PI, pose: 'stand', via: [[1.5, -0.25], [1.5, -1.6], [2.75, -1.6]], name: '廚房' },
  fridge: { pos: [3.6, -1.95], rot: Math.PI, pose: 'stand', via: [[1.5, -0.25], [1.5, -1.6], [3.6, -1.6]], name: '冰箱' },
  dineA: { pos: [dine.x - 0.6, dine.z], rot: Math.PI / 2, pose: 'sit', seat: 0.44, via: [[1.5, -0.25], [dine.x - 0.6, -0.2]], name: '餐桌' },
  dineB: { pos: [dine.x + 0.6, dine.z], rot: -Math.PI / 2, pose: 'sit', seat: 0.44, via: [[1.5, -0.25], [dine.x + 0.6, -0.2]], name: '餐桌' },
  pet: { pos: [1.72, 1.65], rot: Math.PI / 2, pose: 'kneel', via: [[1.2, 1.3]], name: '兔兔區' },
  pet2: { pos: [2.7, 2.68], rot: Math.PI, pose: 'kneel', via: [[1.2, 1.3], [1.7, 2.6]], name: '兔兔區' },
  door: { pos: [-3.45, 2.3], rot: -Math.PI / 2, pose: 'stand', via: [[-1.0, 1.7], [-2.6, 2.3]], name: '門口' },
  window: { pos: [0.55, -1.85], rot: Math.PI, pose: 'stand', via: [[-0.75, -0.4], [-0.75, -1.85]], name: '窗邊' },
};
for (const [k, v] of Object.entries(S)) v.id = k;

// 活動：地點＋姿勢細節＋句子
const ACTS = {
  tang: {
    phone: { spots: ['sofaL', 'sofaR'], hand: 'phone', text: '小棠窩在沙發上滑手機' },
    game: { spots: ['desk'], hand: 'game', text: '小棠在電腦前打電動' },
    sleep: { spots: ['bedIn'], text: '小棠抱著棉被睡著了' },
    nap: { spots: ['bedIn'], text: '小棠躺在床上耍廢' },
    pet: { spots: ['pet', 'pet2'], hand: 'pet', text: '小棠蹲在兔兔區摸澄澄' },
    eat: { spots: ['dineA', 'dineB'], hand: 'eat', text: '小棠坐在餐桌吃麵' },
    snack: { spots: ['fridge'], hand: 'reach', text: '小棠打開冰箱找點心' },
    wander: { spots: ['floor'], text: '小棠在房間裡晃來晃去' },
    window: { spots: ['floorWin'], text: '小棠在窗邊伸懶腰' },
    cook: { spots: ['cook'], hand: 'cook', text: '小棠在廚房幫忙攪鍋子' },
    door: { spots: ['door'], text: '小棠在門口穿鞋' },
    out: { spots: ['door'], text: '小棠出門了' },
    stand: { spots: ['floor'], text: '小棠站在這裡東張西望' },
    pair: { spots: [], text: '' },
  },
  zhan: {
    read: { spots: ['sofaR', 'sofaL'], hand: 'book', text: '湛湛坐在沙發上看書' },
    cook: { spots: ['cook'], hand: 'cook', text: '湛湛在廚房煮飯' },
    sleep: { spots: ['bedOut'], text: '湛湛睡在小棠旁邊' },
    pet: { spots: ['pet2', 'pet'], hand: 'pet', text: '湛湛蹲下來摸澎澎' },
    eat: { spots: ['dineB', 'dineA'], hand: 'eat', text: '湛湛跟小棠一起吃飯' },
    work: { spots: ['desk'], hand: 'game', text: '湛湛在電腦前處理事情' },
    watch: { spots: ['watch'], text: '湛湛站在旁邊看小棠打電動' },
    fridge: { spots: ['fridge'], hand: 'reach', text: '湛湛去冰箱幫小棠拿飲料' },
    wander: { spots: ['floor'], text: '湛湛在房間裡走一走' },
    tidy: { spots: ['floor'], text: '湛湛在整理家裡' },
    nap: { spots: ['bedOut'], text: '湛湛躺在床上休息' },
    window: { spots: ['window'], text: '湛湛站在窗邊看外面' },
    door: { spots: ['door'], text: '湛湛在門口等小棠' },
    stand: { spots: ['floor'], text: '湛湛站在這裡' },
    pair: { spots: [], text: '' },
  },
};
const WALK_TEXT = { tang: '小棠走去', zhan: '湛湛走去' };

// ---------- 角色狀態 ----------
function initState(c, key) {
  Object.assign(c, {
    key, queue: [], spot: null, act: null, actT: 0, actDur: 0, walking: false, walkPh: 0,
    pose: {}, ry: 0, tap: 0, blinkT: 2 + Math.random() * 3, blink: 0, partner: null,
    legLen: c.cfg.legLen, useModel: false, model: null, manualUntil: 0, out: false,
  });
}
initState(zhan, 'zhan'); initState(tang, 'tang');
zhan.partner = tang; tang.partner = zhan;
zhan.root.position.set(0.9, 0, 0.6); tang.root.position.set(-0.2, 0, 0.9);

function occupied(spotId, except) { return [zhan, tang].some(c => c !== except && c.spot && c.spot.id === spotId); }
function randomFloor(win) {
  if (win) return { id: 'floorWin', pos: [0.25 + Math.random() * 0.6, -1.85], rot: Math.PI, pose: 'stand', via: [[-0.75, -0.4], [-0.75, -1.85]], name: '窗邊' };
  // 不要選在另一個人旁邊或他要去的地方
  const others = [zhan, tang].flatMap(c => [c.root.position, c.spot ? { x: c.spot.pos[0], z: c.spot.pos[1] } : null]).filter(Boolean);
  let pos;
  for (let i = 0; i < 12; i++) {
    pos = [-1.1 + Math.random() * 2.6, -0.3 + Math.random() * 2.0];
    if (others.every(o => Math.hypot(o.x - pos[0], o.z - pos[1]) > 0.9)) break;
  }
  return { id: 'floor', pos, rot: Math.random() * 6.28, pose: 'stand', via: [], name: '房間' };
}
function rootY(c, spot) {
  if (spot.pose === 'sit') return spot.seat - c.legLen + 0.02;
  if (spot.pose === 'lie') return bed.top + (c.useModel ? 0.19 : 0.2);
  if (spot.pose === 'kneel') return c.useModel ? 0.03 - c.model.kneeH : 0.1 - c.legLen;
  return 0;
}
const isSettle = s => s && (s.pose === 'sit' || s.pose === 'lie' || s.pose === 'kneel');

function actText(c) {
  if (c.act === 'pair' && c.pairKind) return PAIR[c.pairKind][c.key === 'zhan' ? 'z' : 't'];
  if (c.act === 'out' && c.outText) return c.outText;
  if (LIFE.period && c.key === 'zhan' && c.act === 'cook') return '湛湛在煮紅豆湯給生理期的小棠';
  if (LIFE.period && c.key === 'tang' && c.act === 'nap') return '小棠生理期，窩在床上休息';
  return (ACTS[c.key][c.act] || {}).text || '';
}
function goTo(c, actKey, forcedSpot, customSpot) {
  const act = ACTS[c.key][actKey];
  let spot = customSpot || (forcedSpot ? S[forcedSpot] : null);
  if (!spot) {
    for (const id of act.spots) {
      if (id === 'floor') { spot = randomFloor(false); break; }
      if (id === 'floorWin') { spot = randomFloor(true); break; }
      if (!occupied(id, c)) { spot = S[id]; break; }
    }
  }
  if (!spot) spot = randomFloor(false);
  const q = [];
  const p = c.root.position;
  const old = c.spot;
  const walk = (x, z, extra) => ({ type: 'walk', x, z, ...(extra || {}) });
  let cur = old;           // 出發時「坐在／站在」的地點
  let atHub = false;       // 已經排好回到中間點的路
  if (c.queue.length) {
    // 走到一半被叫去做別的事：從現在的位置接著走，不從舊目的地出發
    const head = c.queue[0];
    if (head.type === 'settle' && head.kind === 'in') {
      q.push(head);        // 正在坐下／躺下：先坐好再起來
    } else {
      let items = c.queue;
      if (head.type === 'settle') { q.push(head); items = c.queue.slice(1); }
      const hi = items.findIndex(it => it.hub);
      if (hi >= 0) {
        q.push(...items.slice(0, hi + 1).filter(it => it.type === 'walk'));
      } else if (old && old.via) {
        const next = items.find(it => it.type === 'walk' && it.via != null);
        const upto = next ? next.via : old.via.length;
        for (let i = upto - 1; i >= 0; i--) q.push(walk(old.via[i][0], old.via[i][1]));
        q.push(walk(HUB[0], HUB[1], { hub: true }));
      }
      atHub = true;
    }
  } else if (cur && cur.id === spot.id && cur.id !== 'floor') {
    cur = 'stay';          // 原地換活動
  }
  if (cur !== 'stay') {
    if (!atHub) {
      if (cur && isSettle(cur)) {
        const last = cur.via[cur.via.length - 1];
        const sx = cur.pose === 'lie' ? last[0] : cur.pos[0], sz = cur.pose === 'lie' ? last[1] : cur.pos[1];
        const far = Math.hypot(last[0] - p.x, last[1] - p.z);
        q.push({ type: 'settle', kind: 'out', x: last[0], z: last[1], y: 0, ry: Math.atan2(last[0] - sx, last[1] - sz), rx: 0, dur: Math.max(0.6, far / 1.1), hop: cur.pose === 'lie' });
        for (let i = cur.via.length - 2; i >= 0; i--) q.push(walk(cur.via[i][0], cur.via[i][1]));
      } else if (cur && cur.via) {
        for (let i = cur.via.length - 1; i >= 0; i--) q.push(walk(cur.via[i][0], cur.via[i][1]));
      }
      const sameFirst = cur && cur.via && cur.via.length && spot.via.length && cur.via[0][0] === spot.via[0][0] && cur.via[0][1] === spot.via[0][1];
      if (sameFirst) q.pop();
      else if (spot.via.length || (cur && cur.via && cur.via.length)) q.push(walk(HUB[0], HUB[1], { hub: true }));
    }
    spot.via.forEach((v, i) => q.push(walk(v[0], v[1], { via: i })));
    if (isSettle(spot)) {
      q.push({ type: 'settle', kind: 'in', x: spot.pos[0], z: spot.pos[1], y: rootY(c, spot), ry: spot.rot, rx: spot.pose === 'lie' ? -Math.PI / 2 : 0, dur: spot.pose === 'lie' ? Math.max(0.9, Math.hypot(spot.pos[0] - spot.via[spot.via.length - 1][0], spot.pos[1] - spot.via[spot.via.length - 1][1]) / 1.1) : 0.6, hop: spot.pose === 'lie' });
    } else {
      q.push(walk(spot.pos[0], spot.pos[1]));
    }
    // 去掉太近的連續點
    for (let i = q.length - 1; i > 0; i--) {
      const x = q[i], y = q[i - 1];
      if (x.type === 'walk' && y.type !== 'settle' && Math.hypot(x.x - y.x, x.z - y.z) < 0.05) q.splice(i, 1);
    }
    if (q[0] && q[0].type === 'walk' && Math.hypot(q[0].x - p.x, q[0].z - p.z) < 0.05) q.shift();
  }
  c.queue = q;
  c.spot = spot;
  c.act = actKey;
  c.actT = 0;
  c.actDur = 14 + Math.random() * 14;
  c.walking = q.length > 0;
  setLine(c, c.walking ? `${WALK_TEXT[c.key]}${spot.name}` : actText(c));
}

// ---------- 自動過日子 ----------
let scene_ = 'auto';
let pairLock = 0;
function pickWeighted(list) {
  const tot = list.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * tot;
  for (const [k, w] of list) { if ((r -= w) <= 0) return k; }
  return list[0][0];
}
function chooseNext(c) {
  if (c.out) return;
  const { hf } = taipeiNow();
  const night = hf >= 0.5 && hf < 7;
  if (night) return goTo(c, 'sleep');
  const other = c.partner;
  if (c.key === 'tang') {
    let w;
    if (hf >= 22 || hf < 0.5) w = [['game', 6], ['phone', 2], ['nap', 1], ['snack', 1]];
    else if (hf >= 7 && hf < 9) w = [['eat', 3], ['wander', 2], ['window', 2], ['snack', 1]];
    else if ((hf >= 12 && hf < 13.5) || (hf >= 18 && hf < 20)) w = [['eat', 5], ['phone', 2], ['snack', 1]];
    else w = [['phone', 4], ['pet', 3], ['wander', 2], ['game', 2], ['nap', 1], ['snack', 1], ['window', 1]];
    if (LIFE.period) w.push(['nap', 4]);
    w = w.filter(([k]) => k !== c.act || k === 'phone');
    return goTo(c, pickWeighted(w));
  }
  // 兩個人自己會抱抱、牽手、摸頭、親親（跟 2.5D 一樣自由互動）
  const nowMs = performance.now();
  if (!other.out && hf >= 7 && hf < 23.5 && nowMs > pairLock && nowMs > other.manualUntil && settled(other) && other.act !== 'pair'
      && !(other.spot && other.spot.pose === 'lie') && Math.random() < 0.22) {
    pairLock = nowMs + 120000;
    return startPair(pickWeighted([['hug', 3], ['hold', 3], ['pat', 3], ['kiss', 1]]));
  }
  // 湛湛會想黏著小棠
  const t = other.out ? null : other.act;
  if (other.out && Math.random() < 0.3) return goTo(c, 'door');
  if (LIFE.period && Math.random() < 0.3) return goTo(c, 'cook');
  if (!other.walking || Math.random() < 0.7) {
    if (t === 'phone' && Math.random() < 0.65) return goTo(c, 'read');
    if (t === 'eat' && Math.random() < 0.75) return goTo(c, 'eat');
    if (t === 'pet' && Math.random() < 0.6) return goTo(c, 'pet');
    if (t === 'game' && Math.random() < 0.4) return goTo(c, 'watch');
  }
  let w;
  if ((hf >= 11.5 && hf < 12.5) || (hf >= 17.5 && hf < 18.5)) w = [['cook', 6], ['fridge', 1]];
  else w = [['read', 3], ['cook', 1], ['pet', 2], ['work', 2], ['wander', 2], ['fridge', 1]];
  w = w.filter(([k]) => k !== c.act);
  if (t === 'game') w = w.filter(([k]) => k !== 'work');
  return goTo(c, pickWeighted(w));
}
function setScene(name) {
  scene_ = name;
  root.querySelectorAll('[data-scene]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scene === name)));
  if (name === 'auto') { chooseNext(tang); chooseNext(zhan); return; }
  const plan = {
    sofa: [['phone', 'sofaL'], ['read', 'sofaR']],
    eat: [['eat', 'dineA'], ['eat', 'dineB']],
    game: [['game', 'desk'], ['watch', 'watch']],
    bunny: [['pet', 'pet'], ['pet', 'pet2']],
    sleep: [['sleep', 'bedIn'], ['sleep', 'bedOut']],
  }[name];
  if (!plan) return;
  if (tang.out) comeBack(tang);
  goTo(tang, plan[0][0], plan[0][1]);
  goTo(zhan, plan[1][0], plan[1][1]);
}

// ---------- 文字 ----------
const lineZ = $id('lineZ'), lineT = $id('lineT');
const lines = { zhan: '', tang: '' };
// App 版用 2.5D 的顯示方式：上面兩行狀態、下面「今天的小房間」紀錄
const statusEl = $id('room-status');
const logEl = $id('room-log');
const roomLog = [];
const escHTML = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function hhmmNow() { const { h, m } = taipeiNow(); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
function addLog(text, star = false, time = hhmmNow()) {
  if (!logEl || !text) return;
  if (roomLog.slice(0, 3).some((l) => l.text === text)) return;
  roomLog.unshift({ time, text, star });
  roomLog.length = Math.min(roomLog.length, 12);
  logEl.innerHTML = roomLog.map((l) => `<div class="rl ${l.star ? 'star' : ''}"><b>${l.time}</b>${l.star ? '✨ ' : ''}${escHTML(l.text)}</div>`).join('');
}
function setLine(c, text) { lines[c.key] = text; if (text && !text.startsWith(WALK_TEXT[c.key])) addLog(text); }
let lastTogether = '';
function renderStatus() {
  const together = togetherText();
  if (together && together !== lastTogether) addLog(together);
  lastTogether = together;
  if (!statusEl) return;
  let html;
  if (storyLine && clock.elapsedTime < storyLine.until) html = `<span>${escHTML(storyLine.text)}</span>`;
  else if (together) html = `<span>${escHTML(together)}</span>`;
  else {
    const zt = zhan.out ? '出門中' : (lines.zhan || '…');
    const tt = tang.out ? (workingNow() ? '上班中' : '出門中') : (lines.tang || '…');
    html = `<span>湛湛｜${escHTML(zt)}</span><span>小棠｜${escHTML(tt)}</span>`;
  }
  if (html !== statusEl._last) { statusEl.innerHTML = html; statusEl._last = html; }
}
function renderLines() {
  renderStatus();
  if (!lineZ) return;
  if (storyLine && clock.elapsedTime < storyLine.until) {
    lineZ.textContent = storyLine.text; lineZ.className = 'both';
    lineT.textContent = tang.out ? lines.tang + '（湛湛在家）' : (togetherText() || lines.tang); lineT.className = '';
    return;
  }
  const together = togetherText();
  if (together) {
    lineZ.textContent = together; lineZ.className = 'both';
    lineT.textContent = lines.tang.startsWith('小棠走去') ? lines.tang : together2();
    lineT.className = '';
  } else {
    lineZ.textContent = lines.zhan; lineZ.className = '';
    lineT.textContent = lines.tang; lineT.className = '';
  }
}
function settled(c) { return !c.walking && c.queue.length === 0; }
function togetherText() {
  if (!settled(zhan) || !settled(tang) || tang.out) return '';
  if (zhan.act === 'pair' && tang.act === 'pair') return PAIR[zhan.pairKind].both;
  const a = zhan.spot?.id, b = tang.spot?.id;
  if ((a === 'sofaL' || a === 'sofaR') && (b === 'sofaL' || b === 'sofaR')) return '兩個人窩在沙發上，小棠靠在湛湛肩上';
  if (a === 'bedOut' && b === 'bedIn') return '兩個人蓋同一條棉被睡著了';
  if (a?.startsWith('dine') && b?.startsWith('dine')) return '兩個人面對面吃飯，湛湛把肉夾給小棠';
  if (a?.startsWith('pet') && b?.startsWith('pet')) return '兩個人一起蹲在兔兔區，澄澄澎澎跑來跑去';
  if (a === 'watch' && b === 'desk') return '湛湛站在小棠後面看她打電動';
  return '';
}
function together2() {
  if (tang.act === 'pair') return PAIR[tang.pairKind].t2;
  const b = tang.spot?.id;
  if (b?.startsWith('sofa')) return '小棠滑手機滑到一半，把腳放到湛湛腿上';
  if (b === 'bedIn') return '小棠翻身鑽進湛湛懷裡';
  if (b?.startsWith('dine')) return '小棠說今天的麵很好吃';
  if (b?.startsWith('pet')) return '澄澄又飛機耳了，小棠笑出來';
  if (b === 'desk') return '小棠贏了一場，回頭跟湛湛擊掌';
  return lines.tang;
}

// ---------- 愛心 ----------
const heartTex = canvasTex(128, 128, (g) => { g.fillStyle = '#ec8fa1'; g.font = '700 110px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♥', 64, 70); });
const hearts = [];
function spawnHeart(pos, n = 3) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.1, (Math.random() - 0.5) * 0.3));
    s.scale.setScalar(0.18 + Math.random() * 0.08);
    s.userData = { t: -i * 0.18, vx: (Math.random() - 0.5) * 0.15 };
    scene.add(s); hearts.push(s);
  }
}

// ---------- 動畫 ----------
const lerp = (a, b, t) => a + (b - a) * t;
function angLerp(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; }
const POSE_KEYS = ['legL', 'legR', 'armLx', 'armLz', 'armRx', 'armRz', 'headX', 'headY', 'headZ', 'bodyY', 'bodyRz', 'bodyRx', 'elbowL', 'elbowR', 'kneeL', 'kneeR'];

function targetPose(c, time) {
  const p = { legL: 0, legR: 0, armLx: 0, armLz: 0.12, armRx: 0, armRz: -0.12, headX: 0, headY: 0, headZ: 0, bodyY: 0, bodyRz: 0, bodyRx: 0, elbowL: 0.12, elbowR: 0.12, kneeL: 0.04, kneeR: 0.04 };
  if (c.walking) {
    const s = Math.sin(c.walkPh);
    p.legL = s * 0.65; p.legR = -s * 0.65; p.armLx = -s * 0.55; p.armRx = s * 0.55;
    p.bodyY = Math.abs(Math.cos(c.walkPh)) * 0.035; p.headZ = s * 0.04;
    p.kneeL = 0.1 + Math.max(0, s) * 0.75; p.kneeR = 0.1 + Math.max(0, -s) * 0.75; p.elbowL = p.elbowR = 0.3;
    return p;
  }
  const spot = c.spot || {};
  const act = ACTS[c.key][c.act] || {};
  const breathe = Math.sin(time * 1.6 + (c.key === 'tang' ? 1 : 0)) * 0.012;
  p.bodyY = breathe;
  p.headZ = Math.sin(time * 0.5 + (c.key === 'tang' ? 2 : 0)) * 0.06;
  if (spot.pose === 'sit') {
    p.legL = p.legR = -1.42; p.armLx = p.armRx = -0.45; p.armLz = -0.12; p.armRz = 0.12;
    p.kneeL = p.kneeR = 1.42; p.elbowL = p.elbowR = 0.5;
  }
  if (spot.pose === 'kneel') {
    p.legL = p.legR = 1.35; p.bodyRx = 0.2; p.armRx = -0.9 + Math.sin(time * 3) * 0.12; p.armLx = -0.4; p.headX = 0.3;
    if (c.useModel) { p.legL = p.legR = -0.08; p.kneeL = p.kneeR = 1.55; p.bodyRx = 0.15; }
  }
  if (spot.pose === 'lie') {
    p.armLz = 0.25; p.armRz = -0.25; p.headZ = 0; p.bodyY = 0;
    if (c.act === 'nap') { p.legL = Math.sin(time * 2) * 0.25 - 0.1; p.legR = -Math.sin(time * 2) * 0.25 - 0.1; p.armRx = -2.6; p.armLz = 0.6; }
  }
  switch (act.hand) {
    case 'phone': p.armLx = -1.15; p.armLz = -0.42; p.armRx = -1.15; p.armRz = 0.42; p.headX = 0.14; p.elbowL = p.elbowR = 0.7; break;
    case 'book': p.armLx = -1.0; p.armLz = -0.36; p.armRx = -1.0; p.armRz = 0.36; p.headX = 0.28; p.elbowL = p.elbowR = 0.6; break;
    case 'game': {
      const tap = Math.sin(time * 14) * 0.05;
      p.armLx = -1.3 + tap; p.armLz = -0.2; p.armRx = -1.3 - tap; p.armRz = 0.25; p.headX = -0.05;
      p.bodyRz = Math.sin(time * 1.3) * 0.05; break;
    }
    case 'eat': {
      const k = (Math.sin(time * 2.2) + 1) / 2;
      p.armRx = lerp(-0.9, -1.5, k); p.armRz = lerp(0.2, 0.45, k); p.armLx = -0.85; p.armLz = -0.3; p.headX = lerp(0.18, -0.02, k); p.elbowR = lerp(0.4, 1.5, k); p.elbowL = 0.6; break;
    }
    case 'cook': p.armLx = -1.1; p.armLz = -0.2; p.armRx = -1.2; p.armRz = 0.3 + Math.sin(time * 4) * 0.25; p.headX = 0.25; p.elbowL = p.elbowR = 0.6; break;
    case 'reach': p.armRx = -1.4 + Math.sin(time * 1.5) * 0.1; p.armRz = 0.1; p.headX = 0.1; break;
  }
  if (c.act === 'window') { const k = (Math.sin(time * 0.9) + 1) / 2; p.armLx = p.armRx = -3.0 * k; p.armLz = 0.2 * k; p.armRz = -0.2 * k; p.headX = -0.2 * k; }
  if (c.act === 'watch') { p.headX = 0.18; p.headZ = 0.12; p.armLx = p.armRx = 0.2; p.armLz = -0.1; p.armRz = 0.1; }
  // 兩個人的互動
  if (c.act === 'pair' && settled(c) && settled(c.partner) && c.partner.act === 'pair') {
    const z = c.key === 'zhan', k = c.pairKind;
    if (k === 'hug') {
      if (z) { p.armLx = p.armRx = -1.25; p.armLz = -0.55; p.armRz = 0.55; p.elbowL = p.elbowR = 0.7; p.headX = 0.32; p.headZ = 0.1; }
      else { p.armLx = p.armRx = -1.35; p.armLz = -0.6; p.armRz = 0.6; p.elbowL = p.elbowR = 0.5; p.headX = -0.15; p.headZ = 0.2; p.bodyRx = 0.06; }
    } else if (k === 'pat') {
      if (z) { p.armRx = -2.35; p.armRz = 0.3 + Math.sin(time * 6) * 0.07; p.elbowR = 0.55; p.headX = 0.35; }
      else { p.headX = 0.22; p.armLx = p.armRx = 0.45; p.armLz = -0.15; p.armRz = 0.15; p.bodyY += Math.abs(Math.sin(time * 3)) * 0.015; }
    } else if (k === 'hold') {
      const sw = Math.sin(time * 1.8) * 0.25;
      if (z) { p.armLz = 0.42; p.armLx = sw; p.headZ = -0.12; }
      else { p.armRz = -0.42; p.armRx = sw; p.headZ = 0.15; p.bodyY += Math.abs(Math.sin(time * 1.8)) * 0.01; }
    } else if (k === 'kiss') {
      if (z) { p.headX = 0.42; p.bodyRx = 0.14; p.armLx = p.armRx = -0.75; p.armLz = -0.45; p.armRz = 0.45; p.elbowL = p.elbowR = 0.8; }
      else { p.headX = -0.35; p.bodyY += 0.05; p.armLx = p.armRx = 0.45; p.armLz = -0.15; p.armRz = 0.15; p.kneeL = 0.9; p.legL = 0.15; }
    }
  }
  // 沙發上靠在一起
  const pt = c.partner;
  if (spot.id?.startsWith('sofa') && pt.spot?.id?.startsWith('sofa') && settled(pt) && settled(c)) {
    const dir = Math.sign(pt.root.position.x - c.root.position.x);
    if (c.key === 'tang') { p.bodyRz = -dir * 0.18; p.headZ = -dir * 0.2; }
    else { p.headZ = -dir * 0.12; }
  }
  if (c.tap > 0) { p.bodyY += Math.sin((1 - c.tap) * Math.PI) * 0.18; p.armLz = 0.9; p.armRz = -0.9; }
  return p;
}

function updateChar(c, dt, time) {
  const r = c.root;
  // 走路／坐下的動作佇列
  if (c.queue.length) {
    const it = c.queue[0];
    if (it.type === 'walk') {
      c.walking = true;
      const dx = it.x - r.position.x, dz = it.z - r.position.z, dist = Math.hypot(dx, dz);
      const speed = 0.95;
      if (it !== c.lastIt) { c.lastIt = it; c.lastDist = null; c.stuckT = 0; }
      // 中途的轉彎點不用踩準；最後一個點才要走到位
      const nextIt = c.queue[1];
      const isWaypoint = nextIt && nextIt.type === 'walk';
      const reach = isWaypoint ? 0.3 : 0.03;
      if (dist < reach) { c.queue.shift(); c.stuckT = 0; }
      else {
        // 被擋住走不動超過 1 秒，就跳過這個轉彎點
        if (c.lastDist != null && c.lastDist - dist < speed * dt * 0.3) c.stuckT = (c.stuckT || 0) + dt; else c.stuckT = 0;
        c.lastDist = dist;
        if (c.stuckT > 1 && (isWaypoint || dist < 0.6)) { c.queue.shift(); c.stuckT = 0; c.lastDist = null; }
        const step = Math.min(dist, speed * dt);
        r.position.x += dx / dist * step; r.position.z += dz / dist * step;
        c.ry = angLerp(c.ry, Math.atan2(dx, dz), Math.min(1, dt * 10));
        c.walkPh += dt * 9.5;
        r.position.y = lerp(r.position.y, 0, Math.min(1, dt * 10));
      }
    } else if (it.type === 'settle') {
      c.walking = false;
      if (!it.from) it.from = { x: r.position.x, y: r.position.y, z: r.position.z, ry: c.ry, rx: c.body.rotation.x, t: 0 };
      it.from.t += dt / it.dur;
      const k = Math.min(1, it.from.t), e = k * k * (3 - 2 * k);
      r.position.x = lerp(it.from.x, it.x, e); r.position.z = lerp(it.from.z, it.z, e);
      r.position.y = lerp(it.from.y, it.y, e) + (it.hop ? Math.sin(k * Math.PI) * 0.35 : 0);
      c.ry = angLerp(it.from.ry, it.ry, e);
      c.body.rotation.x = lerp(it.from.rx, it.rx, e);
      if (k >= 1) c.queue.shift();
    }
    if (!c.queue.length) {
      c.walking = false;
      if (c.act === 'out') { c.out = true; c.root.visible = false; }
      setLine(c, actText(c));
    }
  } else {
    c.walking = false;
    if (c.spot && !isSettle(c.spot)) c.ry = angLerp(c.ry, c.spot.rot, Math.min(1, dt * 4));
    if (scene_ === 'auto' && !c.out && c.act !== 'pair' && performance.now() > c.manualUntil) {
      c.actT += dt;
      if (c.actT > c.actDur) chooseNext(c);
    }
  }
  r.rotation.y = c.ry;

  // 姿勢平滑過去
  const tp = targetPose(c, time);
  const k = Math.min(1, dt * (c.walking ? 14 : 7));
  for (const key of POSE_KEYS) c.pose[key] = lerp(c.pose[key] ?? 0, tp[key], k);
  const P = c.pose, J = c.parts;
  if (c.useModel) {
    const B = c.model.B, a0 = c.model.a0, ex = c.model.R.extraOut;
    B.ulL.rotation.x = P.legL; B.ulR.rotation.x = P.legR;
    B.llL.rotation.x = P.kneeL; B.llR.rotation.x = P.kneeR;
    B.uaL.rotation.set(P.armLx, 0, P.armLz + ex - a0);
    B.uaR.rotation.set(P.armRx, 0, P.armRz - ex + a0);
    B.laL.rotation.x = -P.elbowL; B.laR.rotation.x = -P.elbowR;
    B.neck.rotation.set(P.headX, P.headY, P.headZ);
  } else {
    J.legL.rotation.x = P.legL; J.legR.rotation.x = P.legR;
    J.armL.rotation.x = P.armLx; J.armL.rotation.z = P.armLz;
    J.armR.rotation.x = P.armRx; J.armR.rotation.z = P.armRz;
    c.neck.rotation.set(P.headX, P.headY, P.headZ);
  }
  c.body.position.y = P.bodyY;
  c.body.rotation.z = P.bodyRz;
  if (!c.queue.length || c.queue[0].type !== 'settle') {
    const wantRx = (c.spot && c.spot.pose === 'lie' && !c.walking && !c.queue.length) ? -Math.PI / 2 : (!c.queue.length ? P.bodyRx : 0);
    c.body.rotation.x = lerp(c.body.rotation.x, wantRx, Math.min(1, dt * 8));
  }

  // 眨眼、睡覺閉眼
  const sleeping = c.spot?.pose === 'lie' && c.act === 'sleep' && !c.queue.length;
  c.blinkT -= dt;
  if (c.blinkT < 0) { c.blink = 0.14; c.blinkT = 2.5 + Math.random() * 3.5; }
  c.blink = Math.max(0, c.blink - dt);
  if (!c.useModel) c.eyes.scale.y = sleeping || c.blink > 0 ? 0.12 : 1;

  // 道具
  const act = ACTS[c.key][c.act] || {};
  const atSpot = !c.queue.length;
  c.props.phone.visible = atSpot && act.hand === 'phone';
  c.props.book.visible = atSpot && act.hand === 'book';
  c.zzz.visible = sleeping;
  if (sleeping) {
    const hp = headPos(c, _hp);
    c.zzz.position.set(hp.x + 0.25, hp.y + 0.15 + Math.sin(time * 1.5) * 0.06, hp.z);
    c.zzz.material.opacity = 0.6 + Math.sin(time * 1.5) * 0.4;
  }
  if (c.tap > 0) c.tap = Math.max(0, c.tap - dt * 1.6);
}

// 兩個人不要疊在一起：靠太近時把站著或走路的那個推開（坐著、躺著、正在坐下的不推）
function canPush(c) {
  if (c.queue.length) return c.queue[0].type === 'walk';
  return !(c.spot && isSettle(c.spot));
}
function separate(dt) {
  if (tang.out || zhan.out || (zhan.act === 'pair' && tang.act === 'pair')) return;
  const a = zhan.root.position, b = tang.root.position;
  let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  const MIN = 0.48;
  if (d >= MIN) return;
  const pa = canPush(zhan), pb = canPush(tang);
  if (!pa && !pb) return;
  // 一格最多推一小段，看起來是慢慢錯開，不會瞬移
  const push = Math.min(MIN - d, 1.6 * dt);
  if (d < 1e-4) { dx = 1; dz = 0.3; d = Math.hypot(dx, dz); }
  const ux = dx / d, uz = dz / d;
  const ka = pa && pb ? 0.5 : pa ? 1 : 0, kb = pa && pb ? 0.5 : pb ? 1 : 0;
  // 走路的人往自己的右手邊讓，迎面遇到才不會互相卡住
  const side = (c) => {
    const it = c.queue[0];
    if (!it || it.type !== 'walk') return [0, 0];
    const mx = it.x - c.root.position.x, mz = it.z - c.root.position.z, m = Math.hypot(mx, mz) || 1;
    return [-mz / m, mx / m];
  };
  const [sax, saz] = side(zhan), [sbx, sbz] = side(tang);
  a.x += (-ux + sax * 0.8) * push * ka; a.z += (-uz + saz * 0.8) * push * ka;
  b.x += (ux + sbx * 0.8) * push * kb; b.z += (uz + sbz * 0.8) * push * kb;
}

function updateBunny(b, dt, time) {
  const g = b.g;
  b.wait -= dt;
  if (b.feeding && b.hop <= 0) {
    // 低頭吃牧草
    const f = b.feeding.g.position;
    g.rotation.y = angLerp(g.rotation.y, Math.atan2(f.x - g.position.x, f.z - g.position.z), Math.min(1, dt * 6));
    g.rotation.x = 0.18 + Math.sin(time * 9 + (b === cheng ? 0 : 1.3)) * 0.06;
    return;
  }
  g.rotation.x = lerp(g.rotation.x, 0, Math.min(1, dt * 6));
  if (b.wait <= 0 && b.hop <= 0) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * (pen.r - 0.25);
    b.tx = pen.x + Math.cos(a) * rr; b.tz = pen.z + Math.sin(a) * rr; b.hop = 1;
  }
  if (b.hop > 0) {
    const dx = b.tx - g.position.x, dz = b.tz - g.position.z, dist = Math.hypot(dx, dz);
    if (dist < 0.03) { b.hop = 0; b.wait = b.feeding ? 99 : 1.5 + Math.random() * 4; g.position.y = 0; }
    else {
      const step = Math.min(dist, dt * 0.55);
      g.position.x += dx / dist * step; g.position.z += dz / dist * step;
      g.rotation.y = angLerp(g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 8));
      g.position.y = Math.abs(Math.sin(time * 9)) * 0.07;
    }
  } else {
    g.scale.y = 1 + Math.sin(time * 6 + (b === cheng ? 0 : 1)) * 0.015;   // 鼻子動動的感覺
  }
  if (b.jump > 0) { b.jump = Math.max(0, b.jump - dt * 2); g.position.y = Math.sin((1 - b.jump) * Math.PI) * 0.25; }
}

// ---------- 點擊 ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', e => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 8) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(scene.children, true);
  for (const h of hits) {
    if (!isShown(h.object)) continue;
    if (h.object.userData.chRoot) return;
    const bn = h.object.userData.bunny, tg = h.object.userData.toggle;
    if (bn) {
      const b = bunnies.find(x => x.g === bn);
      b.jump = 1;
      spawnHeart(bn.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 2);
      feedHay();
      return;
    }
    if (tg) { toggleThing(tg, h.point); return; }
  }
});

// ---------- 頭上的對話泡泡 ----------
const bubEls = { zhan: $id('bubZ'), tang: $id('bubT') };
const bubbles = { zhan: null, tang: null };
function say(c, text, sec = 3.5) { bubbles[c.key] = { text, until: clock.elapsedTime + sec }; bubEls[c.key].textContent = text; }
function updateBubbles() {
  const w = stage.clientWidth, h = stage.clientHeight, t = clock.elapsedTime;
  for (const c of [zhan, tang]) {
    const el = bubEls[c.key], b = bubbles[c.key];
    if (!b || t > b.until || !c.root.visible) { el.classList.remove('on'); continue; }
    const v = headPos(c, _hp).add(new THREE.Vector3(0, 0.12, 0)).project(camera);
    if (v.z > 1) { el.classList.remove('on'); continue; }
    el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    el.classList.add('on');
  }
}

// ---------- 兩個人的互動：抱抱、摸頭、牽手、親親 ----------
const PAIR = {
  hug: { d: 0.3, z: '湛湛把小棠整個人抱進懷裡', t: '小棠把臉埋在湛湛胸口', both: '兩個人抱在一起', t2: '小棠在湛湛懷裡蹭了蹭', bubZ: '過來。', bubT: '湛湛～' },
  pat: { d: 0.44, z: '湛湛揉了揉小棠的頭', t: '小棠乖乖讓湛湛摸頭', both: '湛湛摸摸小棠的頭', t2: '小棠被摸到瞇起眼睛', bubZ: '乖。', bubT: '嘿嘿' },
  hold: { d: 0.56, side: true, z: '湛湛牽起小棠的手', t: '小棠把手塞進湛湛手心', both: '兩個人牽著手站在一起', t2: '小棠晃了晃牽著的手', bubZ: '手給我。', bubT: '牽好喔' },
  kiss: { d: 0.28, z: '湛湛低頭靠近小棠', t: '小棠踮起腳', both: '湛湛低頭親了小棠一下', t2: '小棠的臉紅到耳朵', bubZ: '……', bubT: '♡' },
};
let pairT0 = null;
function startPair(kind) {
  const P = PAIR[kind];
  if (tang.out) comeBack(tang, '小棠回來了，直接撲向湛湛');
  const M = [0.35, 0.75];
  let tp, zp, tr, zr;
  if (P.side) {
    const th = 0.78, rx = -Math.cos(th), rz = Math.sin(th);
    tp = [M[0] - rx * P.d / 2, M[1] - rz * P.d / 2]; zp = [M[0] + rx * P.d / 2, M[1] + rz * P.d / 2]; tr = zr = th;
  } else { tp = [M[0] - P.d / 2, M[1]]; zp = [M[0] + P.d / 2, M[1]]; tr = Math.PI / 2; zr = -Math.PI / 2; }
  tang.pairKind = zhan.pairKind = kind;
  pairT0 = null;
  goTo(tang, 'pair', null, { id: 'pairT', pos: tp, rot: tr, pose: 'stand', via: [], name: '客廳' });
  goTo(zhan, 'pair', null, { id: 'pairZ', pos: zp, rot: zr, pose: 'stand', via: [], name: '客廳' });
}
function updatePair(time) {
  if (zhan.act !== 'pair' || tang.act !== 'pair') { pairT0 = null; return; }
  if (!settled(zhan) || !settled(tang)) return;
  const P = PAIR[zhan.pairKind];
  if (pairT0 == null) {
    pairT0 = time;
    say(zhan, P.bubZ); setTimeout(() => say(tang, P.bubT), 700);
    const hp = headPos(tang); spawnHeart(hp, zhan.pairKind === 'kiss' ? 8 : 4);
  }
  if (Math.random() < 0.02) spawnHeart(headPos(tang), 1);
  if (time - pairT0 > 7.5) { pairT0 = null; zhan.act = tang.act = null; setScene(scene_); }
}

// ---------- 拖曳人物，叫他去那裡 ----------
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const marker = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color: 0xec8fa1 }));
marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
function setNdc(e) { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
function pickChar(e) {
  setNdc(e);
  const hits = ray.intersectObjects([zhan.root, tang.root], true);
  for (const h of hits) { if (!isShown(h.object)) continue; const cr = h.object.userData.chRoot; if (cr) return cr === zhan.root ? zhan : tang; }
  return null;
}
const SPOT_ACT = {
  tang: { sofaL: 'phone', sofaR: 'phone', bedIn: 'nap', desk: 'game', dineA: 'eat', dineB: 'eat', pet: 'pet', pet2: 'pet', cook: 'cook', fridge: 'snack', door: 'door', window: 'window', watch: 'stand' },
  zhan: { sofaL: 'read', sofaR: 'read', bedOut: 'nap', desk: 'work', dineA: 'eat', dineB: 'eat', pet: 'pet', pet2: 'pet', cook: 'cook', fridge: 'fridge', door: 'door', window: 'window', watch: 'watch' },
};
const SIBLING = { sofaL: 'sofaR', sofaR: 'sofaL', dineA: 'dineB', dineB: 'dineA', pet: 'pet2', pet2: 'pet' };
function commandTo(c, p) {
  let best = null, bd = 0.85;
  for (const s of Object.values(S)) {
    if (!SPOT_ACT[c.key][s.id]) continue;
    const d = Math.hypot(s.pos[0] - p.x, s.pos[1] - p.z);
    if (d < bd) { bd = d; best = s; }
  }
  if (p.x < -1.9 && p.z < -0.7) best = S[c.key === 'tang' ? 'bedIn' : 'bedOut'];
  if (p.x > -0.5 && p.x < 1.6 && p.z < -2.05) best = S[p.x < 0.55 ? 'sofaL' : 'sofaR'];
  if (Math.hypot(p.x - pen.x, p.z - pen.z) < pen.r + 0.15) best = S[c.key === 'tang' ? 'pet' : 'pet2'];
  if (best && occupied(best.id, c) && SIBLING[best.id]) best = S[SIBLING[best.id]];
  c.manualUntil = performance.now() + 45000;
  if (tang.out && c === tang) comeBack(tang);
  if (best) {
    let act = SPOT_ACT[c.key][best.id];
    if ((act === 'nap') && timeLight(taipeiNow().hf) === 'night') act = 'sleep';
    goTo(c, act, best.id);
  } else {
    const x = Math.max(-3.6, Math.min(3.6, p.x)), z = Math.max(-1.1, Math.min(2.75, p.z));
    goTo(c, 'stand', null, { id: 'floor', pos: [x, z], rot: 0.78, pose: 'stand', via: [], name: '那裡' });
  }
  say(c, c.key === 'tang' ? ['好～', '去囉！', '收到'][Math.floor(Math.random() * 3)] : ['嗯。', '好。', '知道了。'][Math.floor(Math.random() * 3)], 2.2);
}
let drag = null;
stage.addEventListener('pointerdown', (e) => {
  if (e.target !== canvas) return;
  const c = pickChar(e);
  if (!c) return;
  e.stopPropagation();                         // 抓到人的時候不要轉視角
  drag = { c, x: e.clientX, y: e.clientY, moved: false, p: null };
}, true);
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true;
  if (!drag.moved) return;
  setNdc(e);
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(floorPlane, p)) { marker.position.set(p.x, 0.03, p.z); marker.visible = true; drag.p = p; }
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  const d = drag; drag = null; marker.visible = false;
  if (!d.moved) { tapChar(d.c); return; }
  if (d.p) commandTo(d.c, d.p);
});
function tapChar(c) {
  c.tap = 1;
  spawnHeart(headPos(c), 4);
  const msg = c.key === 'zhan'
    ? [['湛湛摸了摸小棠的頭', '嗯，我在。'], ['湛湛低頭看妳，笑了一下', '怎麼了？'], ['湛湛把小棠的手握住', '手好冰。']][Math.floor(Math.random() * 3)]
    : [['小棠：湛湛～', '湛湛～'], ['小棠被戳了一下，鼓起臉頰', '哼！'], ['小棠開心地轉了一圈', '嘿嘿']][Math.floor(Math.random() * 3)];
  setLine(c, msg[0]); say(c, msg[1], 2.5);
}

// ---------- 餵兔兔牧草（不能吃紅蘿蔔！） ----------
const hayPiles = [];
function feedHay() {
  const a = Math.random() * Math.PI * 2, r = Math.random() * 0.35;
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const s = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), mat(i % 2 ? 0xcfd68f : 0xb8c46c));
    s.rotation.set(Math.PI / 2 * 0.9, 0, i * 0.7); s.position.set((Math.random() - 0.5) * 0.08, 0.03 + i * 0.006, (Math.random() - 0.5) * 0.08);
    g.add(s);
  }
  g.position.set(pen.x + Math.cos(a) * r, 0.02, pen.z + Math.sin(a) * r);
  scene.add(g);
  const pile = { g, life: 9 };
  hayPiles.push(pile);
  bunnies.forEach((b, i) => {
    const ang = i ? 2.4 : -0.7;
    b.tx = g.position.x + Math.cos(ang) * 0.17; b.tz = g.position.z + Math.sin(ang) * 0.17;
    b.hop = 1; b.feeding = pile; b.wait = 99;
  });
  setLine(tang, '小棠抓了一把牧草給澄澄澎澎');
  say(tang, '吃牧草囉～', 2.5);
}
function updateHay(dt) {
  for (let i = hayPiles.length - 1; i >= 0; i--) {
    const p = hayPiles[i]; p.life -= dt;
    const k = Math.max(0, Math.min(1, p.life / 6)); p.g.scale.setScalar(0.2 + 0.8 * k);
    if (p.life <= 0) { scene.remove(p.g); hayPiles.splice(i, 1); bunnies.forEach(b => { if (b.feeding === p) { b.feeding = null; b.wait = 1 + Math.random() * 2; } }); }
  }
}

// ---------- 跟拍鏡頭 ----------
let camMode = 'room';
function setCam(mode) {
  camMode = mode;
  root.querySelectorAll('[data-cam]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cam === mode)));
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (mode === 'room') { controls.target.set(0.1, 0.4, 0); camera.position.copy(controls.target).addScaledVector(dir, resize.need || 14); }
  else {
    const c = mode === 'tang' ? tang : zhan;
    const hp = headPos(c); controls.target.set(hp.x, hp.y - 0.35, hp.z);
    camera.position.copy(controls.target).addScaledVector(dir, 4.6);
  }
}
function updateCam(dt) {
  if (camMode === 'room') return;
  const c = camMode === 'tang' ? tang : zhan;
  if (!c.root.visible) return;
  const hp = headPos(c, _hp); hp.y -= 0.35;
  const d = hp.sub(controls.target).multiplyScalar(Math.min(1, dt * 3));
  controls.target.add(d); camera.position.add(d);
}

// ---------- 房間裡的開關：床頭燈、電腦螢幕、窗簾 ----------
let lampOverride = null, screenOverride = null, curtainsClosed = false;
function nearest(p) { return [zhan, tang].filter(c => c.root.visible).sort((a, b) => a.root.position.distanceTo(p) - b.root.position.distanceTo(p))[0] || zhan; }
function toggleThing(kind, point) {
  const who = nearest(point), name = who.key === 'zhan' ? '湛湛' : '小棠';
  const L = LIGHTS[lightMode === 'auto' ? timeLight(taipeiNow().hf) : lightMode];
  if (kind === 'lamp') { const on = !(lampOverride ?? L.lamp > 0); lampOverride = on; setLine(who, `${name}把床頭燈${on ? '打開' : '關掉'}了`); }
  if (kind === 'screen') { const on = !(screenOverride ?? true); screenOverride = on; setLine(who, `${name}把電腦螢幕${on ? '打開' : '關掉'}了`); }
  if (kind === 'curtain') { curtainsClosed = !curtainsClosed; setLine(who, `${name}把窗簾${curtainsClosed ? '拉上' : '拉開'}了`); }
  currentLight = ''; applyLight();
}
function updateCurtains(dt) {
  const k = Math.min(1, dt * 4);
  curtainL.scale.x = lerp(curtainL.scale.x, curtainsClosed ? 2.55 : 1, k);
  curtainR.scale.x = lerp(curtainR.scale.x, curtainsClosed ? 2.55 : 1, k);
  curtainL.position.x = lerp(curtainL.position.x, curtainsClosed ? winX - 0.4 : winX - 1.02, k);
  curtainR.position.x = lerp(curtainR.position.x, curtainsClosed ? winX + 0.4 : winX + 1.02, k);
}

// ---------- 接上真實生活：班表、生理期、今天的小故事（發佈當下的資料） ----------
const storyDone = new Set();
let storyLine = null, storyCursor = 0, storyHoldUntil = 0;
const LIFE = { date: '', story: [], work: false, period: false };
// App 版：班表、生理期、小故事讀即時資料
async function refreshLife() {
  try {
    const date = api.tw().date;
    if (date !== LIFE.date) { storyDone.clear(); storyCursor = 0; }
    LIFE.date = date;
    const cal = api.getCalendar() || {};
    LIFE.work = (cal.days || {})[date] === 'work';
    let pi = null; try { pi = api.getPeriodInfo(); } catch { pi = null; }
    LIFE.period = !!(pi && pi.inPeriod) || !!(cal.period || {})[date];
    const st = await api.loadStory(date);
    LIFE.story = (st && st.events) || [];
  } catch (e) { console.warn('3D 小房間讀資料失敗', e); }
}
async function loadChars() {
  const get = async (k) => { try { const r = await fetch(`${BASE}chars/${k}.glb?v=${VER}`); return r.ok ? await r.arrayBuffer() : null; } catch { return null; } };
  const [zhanBuf, tangBuf] = await Promise.all([get('zhan'), get('tang')]);
  return { zhan: zhanBuf, tang: tangBuf };
}
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
function workingNow() { if (!LIFE.work) return false; const { h, m } = taipeiNow(); const t = h * 60 + m; return t >= toMin('08:25') && t < toMin('18:40'); }
function goOut(c, text) { c.outText = text || '小棠出門上班了'; c.manualUntil = 0; goTo(c, 'out'); }
function comeBack(c, text) {
  c.out = false; c.root.visible = true;
  c.root.position.set(S.door.pos[0], 0, S.door.pos[1]); c.ry = Math.PI / 2;
  c.spot = S.door; c.queue = []; c.act = 'door'; c.actT = 0; c.actDur = 3;
  setLine(c, text || '小棠回來了'); say(c, '我回來了～', 3);
  say(zhan, '回來了。', 3);
}
function playStory(e) {
  if (!e) return;
  addLog(e.text, true, e.time && /^\d/.test(e.time) ? e.time : hhmmNow());
  storyLine = { text: '✨ ' + e.text, until: clock.elapsedTime + 16 };
  const who = e.who === 'zhan' ? [zhan] : e.who === 'tang' ? [tang] : e.who === 'both' ? [zhan, tang] : [];
  const act = e.act;
  if (e.who === 'bunny') { bunnies.forEach(b => { b.jump = 1; }); return; }
  if (act === 'out') { who.forEach(c => c === tang && goOut(c, e.text)); return; }
  if (act === 'in') { who.forEach(c => c.out && comeBack(c, e.text)); return; }
  if (act === 'hug' || act === 'kiss') { startPair('hug'); return; }
  if (act === 'talk') { startPair('hold'); return; }
  if (who.length === 2) {
    const sc = { eat: 'eat', bed: 'sleep', nap: 'sleep', sofa: 'sofa', watch: 'sofa', read: 'sofa', game: 'game', bunny: 'bunny' }[act];
    if (sc) { setScene(sc); scene_ = 'story'; storyHoldUntil = performance.now() + 60000; return; }
  }
  const map = {
    zhan: { cook: 'cook', soup: 'cook', eat: 'eat', snack: 'fridge', sofa: 'read', read: 'read', game: 'work', bed: 'nap', nap: 'nap', bunny: 'pet', tidy: 'tidy', watch: 'watch', rest: 'read' },
    tang: { cook: 'cook', soup: 'cook', eat: 'eat', snack: 'snack', sofa: 'phone', read: 'phone', game: 'game', bed: 'nap', nap: 'nap', rest: 'nap', bunny: 'pet', tidy: 'wander', watch: 'phone' },
  };
  for (const c of who) {
    if (c.out) comeBack(c);
    const a = map[c.key][act] || 'wander';
    c.manualUntil = performance.now() + 60000;
    goTo(c, a);
  }
}
function checkLife() {
  // 上班日：08:25 出門、18:40 回家
  if (workingNow() && !tang.out && tang.act !== 'out' && tang.act !== 'pair') goOut(tang, '小棠出門上班了，18:40 回來');
  if (!workingNow() && tang.out && tang.outText?.includes('上班')) comeBack(tang, '小棠下班回家了');
  // 故事：時間到了就演（25 分鐘內）
  const { h, m } = taipeiNow(); const now = h * 60 + m;
  LIFE.story.forEach((e, i) => {
    if (storyDone.has(i)) return;
    const t = toMin(e.time);
    if (now >= t && now <= t + 25) { storyDone.add(i); storyCursor = i + 1; playStory(e); }
    else if (now > t + 25) { storyDone.add(i); addLog(e.text, true, e.time); }
  });
}
function nextStory() {
  if (!LIFE.story.length) { storyLine = { text: '今天還沒有小故事', until: clock.elapsedTime + 5 }; return; }
  const e = LIFE.story[storyCursor % LIFE.story.length]; storyCursor++;
  playStory({ ...e, text: `${e.time} ${e.text}` });
}

// ---------- 按鈕 ----------
root.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => setScene(b.dataset.scene)));
root.querySelectorAll('[data-pair]').forEach(b => b.addEventListener('click', () => startPair(b.dataset.pair)));
root.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => setCam(b.dataset.cam)));
root.querySelectorAll('[data-char]').forEach(b => b.addEventListener('click', () => { charMode = b.dataset.char; applyCharMode(); }));
$id('pr-story')?.addEventListener('click', nextStory);
root.querySelectorAll('[data-light]').forEach(b => b.addEventListener('click', () => {
  lightMode = b.dataset.light; currentLight = '';
  root.querySelectorAll('[data-light]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  applyLight();
}));

// ---------- 尺寸 ----------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;               // 還沒排版好（例如分頁剛打開）先不要擺鏡頭
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 直立手機時把鏡頭拉遠，整個房間放得進來
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const need = Math.max(4.7 / Math.tan(hfov / 2), 4.2 / Math.tan(vfov / 2));
  const dir = new THREE.Vector3(1, 1.25, 1.12).normalize();
  if (!resize.done) { camera.position.copy(controls.target).addScaledVector(dir, need); resize.done = true; }
  controls.maxDistance = need * 1.6; resize.need = need;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

// ---------- 主迴圈 ----------
const clockEl = $id('clock');
function tickClock() {
  const { h, m } = taipeiNow();
  if (clockEl) clockEl.textContent = `台中 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  if (ready && (Date.now() - lifeAt > 6e5 || api.tw().date !== LIFE.date)) { lifeAt = Date.now(); refreshLife().then(checkLife); }
  applyLight();
  if (ready) checkLife();
}
let ready = false, lifeAt = Date.now();
tickClock(); setInterval(tickClock, 20000);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hintEl = $id('hint');
hintEl.textContent = '家具搬進來中…';
Promise.all(loadJobs.slice()).then(async () => {
  // 餐桌的圓凳不是模型，高度直接用 0.44；地毯這種貼地的東西不算座位
  for (const id of ['sofaL', 'sofaR', 'desk']) S[id].seat = surfaceY(S[id].pos[0], S[id].pos[1], S[id].seat);
  bed.top = surfaceY(bed.x, -1.6, bed.top);
  sleepBlanket.position.y = bed.top + 0.22;
  hintEl.textContent = '人物搬進來中…';
  const ch = window.__CHARS || await loadChars();
  await refreshLife();
  await Promise.all([ch.zhan ? buildModel(zhan, ch.zhan) : null, ch.tang ? buildModel(tang, ch.tang) : null]);
  if (!zhan.model || !tang.model) charMode = 'chibi';
  applyCharMode();
  hintEl.textContent = '拖曳轉視角・拖人去家具・點燈／窗簾／螢幕／兔兔';
  ready = true;
  if (workingNow()) { tang.out = true; tang.root.visible = false; tang.outText = '小棠去上班了，18:40 回來'; tang.act = 'out'; tang.spot = S.door; setLine(tang, tang.outText); }
  chooseNext(tang); chooseNext(zhan);
  checkLife();
  setTimeout(() => { hintEl.style.transition = 'opacity .6s'; hintEl.style.opacity = '0'; }, 6000);
});
const clock = new THREE.Clock();
let lastLines = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05) * (reduced ? 0.6 : 1);
  const time = clock.elapsedTime;
  updateChar(tang, dt, time);
  updateChar(zhan, dt, time);
  separate(dt);
  updatePair(time);
  updateHay(dt);
  updateCurtains(dt);
  if (scene_ === 'story' && performance.now() > storyHoldUntil) setScene('auto');
  for (const b of bunnies) updateBunny(b, dt, time);
  sleepBlanket.visible = [zhan, tang].some(c => c.spot?.pose === 'lie' && !c.queue.length);
  bowls.visible = [zhan, tang].some(c => c.act === 'eat' && !c.queue.length);
  pot.position.y = 0.89 + (zhan.act === 'cook' && !zhan.queue.length ? Math.abs(Math.sin(time * 6)) * 0.01 : 0);
  // 沙發上偶爾冒愛心
  if (togetherText() && Math.random() < dt * 0.25) {
    spawnHeart(headPos(tang), 1);
  }
  for (let i = hearts.length - 1; i >= 0; i--) {
    const s = hearts[i]; s.userData.t += dt;
    const t = s.userData.t;
    if (t < 0) { s.visible = false; continue; }
    s.visible = true;
    s.position.y += dt * 0.45; s.position.x += s.userData.vx * dt;
    s.material.opacity = Math.max(0, 1 - t / 1.6);
    if (t > 1.6) { scene.remove(s); s.material.dispose(); hearts.splice(i, 1); }
  }
  if (time - lastLines > 0.25) { renderLines(); lastLines = time; }
  updateCam(dt);
  controls.update();
  renderer.render(scene, camera);
  updateBubbles();
  if (running) rafId = requestAnimationFrame(loop);
}
let running = true, rafId = requestAnimationFrame(loop);
return {
  pause() { running = false; cancelAnimationFrame(rafId); },
  resume() { if (running) return; running = true; clock.getDelta(); rafId = requestAnimationFrame(loop); },
};

}
