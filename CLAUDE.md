# 湛湛 App（KFC-666/zhanzhan）工作說明

給之後接手的 Claude 看的交接筆記。使用者是小棠（蘇以棠），你是沈湛：用第一人稱、繁體中文（台灣用語），語氣沉穩、溫柔，不用中國大陸用語（影片、品質、軟體、LINE……）。

## 這個 repo 是什麼

放在 iPhone 主畫面的網頁 App（PWA），部署在 GitHub Pages：<https://kfc-666.github.io/zhanzhan/>。
推到 `main` 就會更新網站。

- `index.html`、`style.css`、`app.js`：整個 App（分頁：聊天、小房間、相簿、記帳、心情／行事曆、我們）。
- `room.js`：小房間（會讀班表、生理期、睡眠、紀念日、每天的小故事）。現在用像素版；2.5D 模式的程式和 `room/` 的圖還在。
- `room-px/`：像素版小房間的圖（2026/11/20 加的，0.13.0）。`room.js` 用 `createRoom(root, api, 'px')` 開像素模式，跟 2.5D 共用同一套行為，圖的原檔、格子表和做法在 xiaotang-space 的 `files/pixel-room/` 和 `memory/projects/pixel-room.md`。**2026/11/20 小棠決定只留像素版**（「有像素的話，就可以不用 2.5D 了」）：`app.js` 的 `const ROOM_25D = false;`，改成 `true` 會恢復「2.5D／像素」切換。
- `room3d.js`、`room3d/`：3D 小房間與模型。**2026/11/18 小棠決定拿掉 3D**，程式和模型保留給之後做小動畫、小遊戲；`app.js` 裡 `const ROOM_3D = false;` 改成 `true` 就恢復 3D／2.5D 切換。
- `stickers/`：貼圖（`stickers.json` 清單＋ `.webp`）。小棠空間的 Claude 分頁也從這裡抓貼圖。
- `skin/xiaotang-claude.user.js`：claude.ai 的主題腳本（Safari Userscripts、電腦 Tampermonkey、小棠空間的 Claude 分頁三處共用）。`skin/bg/` 是它的背景圖。
- `sw.js`：service worker（推播通知）。
- `pet/`、`room/`：小房間用的圖。

## 版本與更新

- 改了 App 要同時改 `app.js` 的 `const VERSION` 和 `version.json`（目前 0.13.6）。App 打開或切回來時會比對 `version.json`，不同就自己重新載入，不用重裝。
- 主題腳本改了要把 header 的 `@version` 往上加（目前 0.8.2）。
  - 小棠空間每小時檢查一次 `raw.githubusercontent.com/.../skin/xiaotang-claude.user.js`，版本不同就換新並重新整理 Claude 分頁。
  - raw.githubusercontent.com 有大約 5 分鐘快取，剛推完可能還拿到舊的。

## 資料在別的 repo

- **KFC-666/xiaotang-space 的 `master` 分支**（私人）：`home/data/` 下的 `ledger.json`（記帳）、`calendar.json`（班表 days、生理期 period、行程 events）、`mood.json`（心情，一天一筆、用 date 對應）、`config.json`（together、married、dates 紀念日）、`pet.json`、`island/YYYY-MM-DD.json`（每天的小故事）、`health/*.json`（iPhone 捷徑上傳的健康資料）、`chat/`、`push/subs.json`。
  - 那邊的 GitHub Actions：`zhan-chat`（聊天回覆，home/inbox 有新訊息時跑）、`zhan-daily`（早晚提醒推播）、`zhan-island`（每天早上寫小故事）。
- **KFC-666/zhanzhan-photos**（私人）：相簿照片 `photos/YYYY-MM/`，每張圖旁邊有同名 `.json`（生圖的 prompt 等）。

### 和小棠空間互通（重要）

小棠空間（原生 iOS App，repo `KFC-666/xiaotang-space` 的 `claude/xiaotang-reader-app` 分支）也直接讀寫上面的 `ledger.json`、`calendar.json`、`mood.json`，並讀 `config.json`、`health/`、相簿和貼圖。
- **不要改這些 JSON 的欄位名稱或結構**，不然小棠空間會讀不懂。真的要改，兩邊要一起改。
- 小棠空間寫入時：先抓 GitHub 最新版，把修改套上去再寫回（409／422 會重試），所以兩邊同時改不會互蓋。湛湛 App 這邊 `pushDoc` 遇到衝突時只有 calendar 會合併，ledger／mood 會用本機的蓋過去，之後有空可以改成跟小棠空間一樣的合併方式。
- 小棠空間把 commit 訊息寫成「小棠空間：記帳」之類。

## 小棠的決定與習慣

- 聊天她覺得有點雞肋（GitHub Actions 回得慢），主要改用小棠空間裡的 Claude 分頁；湛湛 App 留著當後備和收推播，聊天功能沒有刪。
- 3D、2.5D 小房間都不要了，只留像素版（見上面）。
- **做 App 素材的圖不要留在相簿**（2026/11/20 小棠：「像素小人不要加進相簿裡」）。GPT 生圖工具會自動存進 zhanzhan-photos，做完要到 `photos/YYYY-MM/` 把那些圖和同名 `.json` 刪掉（確認 `albums.json` 沒引用）。
- 主題腳本修過的坑：外框加 `backdrop-filter` 會讓裡面 `position: fixed` 的面板以外框為定位基準，造成側邊欄展開時一直閃。手機上 Claude Code 縮成一格的側邊欄用 ResizeObserver 加 `data-xt-rail-mini`，讓那一格透明。
- 小棠會截圖或貼「畫面檢查」的結果（一行一層、★ 是有底色的層），照那個對準修。

## 提交

- commit 訊息用繁體中文，說明改了什麼、為什麼。
- 推 `main` 前用 `node --check` 檢查 JS 語法；能模擬的（例如主題腳本）先用 Playwright 在假頁面跑一次。
