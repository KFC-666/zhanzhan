// ==UserScript==
// @name         小棠的 Claude 主題
// @description  沈湛幫小棠做的 claude.ai 換膚：十套顏色、粉圓字體、兔兔底紋或背景圖。Safari（Userscripts）和電腦 Chrome（Tampermonkey）共用。
// @version      0.6.1
// @namespace    https://github.com/KFC-666/zhanzhan
// @updateURL    https://raw.githubusercontent.com/KFC-666/zhanzhan/main/skin/xiaotang-claude.user.js
// @downloadURL  https://raw.githubusercontent.com/KFC-666/zhanzhan/main/skin/xiaotang-claude.user.js
// @author       沈湛
// @match        https://claude.ai/*
// @run-at       document-start
// @inject-into  content
// @grant        GM.addStyle
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      fonts.googleapis.com
// @connect      raw.githubusercontent.com
// @connect      fonts.gstatic.com
// ==/UserScript==

(function boot() {
  'use strict';
  // 有些擴充功能在網頁還沒建好時就執行，等 <html> 出現再開始
  if (!document.documentElement) {
    const o = new MutationObserver(() => { if (document.documentElement) { o.disconnect(); boot(); } });
    o.observe(document, { childList: true });
    return;
  }

  // ---------------------------------------------------------------
  // 設定：記住小棠選的顏色和字體
  // ---------------------------------------------------------------
  const THEMES = [['rose', '粉灰', '#fbf3f6', '#c95f86', '#1c1519'], ['milktea', '奶茶粉', '#f7f1ea', '#b5687a', '#1d1915'], ['mist', '霧灰藍', '#eef2f6', '#c96a8f', '#161a1f'], ['lavender', '薰衣草', '#f4f1f8', '#8f68b6', '#1a1720'], ['sakura', '櫻花白', '#fdf8f9', '#cf6585', '#1e1719'], ['peach', '蜜桃杏', '#fdf4ee', '#c9654f', '#1f1714'], ['matcha', '抹茶奶綠', '#f5f6ec', '#62864a', '#171a14'], ['cocoa', '焦糖可可', '#efe4d8', '#a0603a', '#1c1410'], ['starry', '夜空星藍', '#eef1f8', '#4a64a8', '#0f1424'], ['snow', '雪兔白', '#fafafa', '#a96f7c', '#18181a']];   // [代號, 名字, 淺色底, 主色, 深色底]
  const BG_BASE = 'https://raw.githubusercontent.com/KFC-666/zhanzhan/main/skin/bg/';
  const BGS = [
    { id: 'us', name: '我們', p: BG_BASE + 'us-p.jpg', l: BG_BASE + 'us-l.jpg', posP: 'center', posL: 'right bottom', thumb: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACQAGADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAgMBBAUABgf/xAAzEAABBAEDAgUDAgUFAQAAAAABAAIDESEEEjFBUQUTYXGBIjKRofAHFCNi0TNCcoLxwf/EABgBAAMBAQAAAAAAAAAAAAAAAAABAgME/8QAHxEAAwEAAgMBAQEAAAAAAAAAAAERAhIxAyFBUSJh/9oADAMBAAIRAxEAPwD6SZthG5tnolGyS9+D0I7qzLGDYoVaBsYaci1HNHSsNlV295FtNV0UOgL200Z5wr4jDL2NJvm0xjGHNUm/NOhLx/pkv0r2t33j2VYts3Ve62NQ4nc1rraOgCozvYaDWXWbWmNtkayitRzYrohcAOCnvc599j0QBtdKWqZmxdWOLU5AR7bPGEwQFzC7tym2EK3J9UXGUwMrj2RCLPGEUIa5buNXjsia0NbZy30QE30QAkAg3S4nmnQnB7dpH0590QLbO6/ZVC4k5JHsmxvIaS5t+qnXjg1qhTRxOFg0R04VR3k/YWf9gU2Vm76i4+gKUTxvbxwtME6FShvDAfcpBBJ7ZV4hj+GhvqhdEB9p3DuFqtQzaKwFFM8wluwYHYLjGbTGRjbjn1TekCTEhtlPjgdwRz3R+RVEn8Iw4msnCh7vRXCdkuFIcpczXR/VvxwPZdBITjkd1N9D4jB7UEVtIIypFZr8KKs9kqEANj1CjaDwMozuUg3kp0UAEXZQ5hrH4Tq7KQXNORSl6fwpJCW7g2qoFG0tGC3F8kpzthH1FAWAjBPyo5XsuL4c0NccOs+iJrG7qJHskgGiDwjYPlPj/omyi8SDFmqS2F8RsHCtumb1CrPO4nHyFSb+jhAk+skEgq3Efozx3KqsZu4OSueXg10PRLXvoaXr2aApwtq7aq0UpDdoCfRLedyjk0PgHR6Lh/cSha0t4/VGLvpSnkLiEGg8H8qDTfddVLigISKPS1I9AhpED3ToRlZ8V8ABA+EmuL9MIjqM5GO6EalpdVY7omikxboy05sFSGSEcWKT3ysaLJJC5j2SDFg9kqyhLTtFOBvumB8lihhNDW9gVwaBxj2U0ZwcD3CLqoolcG1xaVFAsrr91IsZJ+KXYSoiOeMLg0XfKJRYByU0wKT4/wC4fIS9rKrN+yN+thBy413pS3UxPw14+cLX+kC4giGx9wvsl6qaHQwOn1WoZDEOXPdQTzJGOS3PqvC/xN0+pkbpdQwh2kYC1wB4ce6lVuMNNJVHrvDvFND4kXnQ6lszm/cG2CFd3v4bj3Xhf4d6L+VZL4jq5WxB42RMJq/X9F7uyRYojvanXplYdXsIOeB9VH5Rh59Egk/sqNubyPlKFQs+ZXQlTvFJDQerkxjf7ipYRBGRo5KkStB5tC9tc/qhv1CEER5p+rIsyNAHcKWzRk5Lh79V5+SKVoIle7yxy26RjxF7XsbHbmtaQQ7kld/M4abk2rEO0Qm3EWb4CoSTTSk75C4E3RyPwktk80mQ2L4BROdQUv2VRkk7iGl7WkMFAAV8rV0GteYTTjY4AFrFY6yR+6Vrw+YtmYxxog8nlY6UdRtjVUZoyeJy2QC78UoZ4iW8yOvs5RqoHyz+ZE5oa7rfJHKhujfeZG3/AMVsuLXRndXssjxJ5GGstNj8ReK3Rj3BVM6OT/bbvXhNi8OLq3FwP5U6Xj+l51stSeIh55dfcpR1gJsSH2AUT+GPZWzJrqaVV2m1TcCNvPRLCx8DWtmWJhYEjmuv7aAI+UDotK4Elu3aLO08fCzmg0alHbb3JQGNvD/MsGiB17rJKfTLkW2OGQHXZNH0RPP0F3QCiqbYZov6kX+nf0knF+pQ+dOBIWxmwbLm0f8AxachFjSySullbWWU74KuxQTSSO2wmzgk8LK0M7tNHqHSxF756oNs/T+7W/pvGNOGC3AOxhxo13UvTLUNPQaPyIiZR5hydxGB3AWf4gZvD5HOa9xie22k5BFce6u6fxWCQ7GSNN9Bwj1DYZtI2KRzHC7LS+sD/wB/VTnTRTV6M1niswkozMJA+1zaV+PxaVhHmaegXcg9F5/UeHF2qdJonhzGkVudmxyu1DNQ0Asjkc45cXZVXLEtNHo9b49Gxpf5TsDuqun8fika8ujdbZKFHovOatss9EbmkNtzDxjqq8ET4wfMDmh+WgZTzlLoWvIzRZFG+UxwMeXjLJHGqQzzm/ImDWTUWySOde4BV5Gna4ttoacm8V/lDLG2Rv1R3I77C42R6lSTSNzohk+YKs4R+Y9gD42Ag8Vkn4/KKNrI9pc6pK5bncfVMdpGlrZp5SGyceWc3zn0RFBewTqRJbxuMjvuFAWjifC9v9QNHS+o9a6qtmJ1yNL6rJFWOymUMlJlijaBdbQSa/ZUwdLbjGzG0GhYLmpjaLXObFuaPuLb+lZ7Xmh5QLiMG+iZ/OzteN9mhWw8H3SeQTNOORjgCZPLA5cMkfC4zSxRmWzJEHVuBolZRlbJIXWGh2S0cA9kb9S+eUvdtaWgN2gYKOA+Rox+IMkIFsA/+f5TjJDussBbX3bax2WXsdFDJJtYc7avN91MEjz9G41WG1eUcZ0HL9P/2Q==' },
    { id: 'sakura', name: '櫻花', p: BG_BASE + 'sakura-p.jpg', l: BG_BASE + 'sakura-l.jpg', posP: 'center top', posL: 'center', thumb: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACQAGADASIAAhEBAxEB/8QAGgAAAwEBAQEAAAAAAAAAAAAAAAECAwQFB//EACwQAAICAgEDAgQGAwAAAAAAAAECABEDIRIxQVEEEyJhcYEFFCMykbFCodH/xAAYAQADAQEAAAAAAAAAAAAAAAAAAQIDBP/EABwRAQEBAQEBAAMAAAAAAAAAAAABESECEiJBUf/aAAwDAQACEQMRAD8A+o4Awycw4bGf2kG4Ymyl8i52UM9lePbxf1nF6j0mb0WE/kPUt7Ia2wkciBf+Pf7Tr99+WNWWww2RYF/eYO7bXo4k4Y/1dsR3nOuIekUDmyh2rlY1/MnMmVjhCtkI5bqqUeSZ05vZyYuORgy/XvKZbisSlBRfn85p1nM+ArlXJiLXVMAevznSulF9e8cR6/p3Uyz5XQD215GXdmFRpmORn98hsaAYw1OzDx4hgY+ox5FNoiNxAIrU6mA41QrxIZsONSCyqvezJxpPTzfVv6b0uJAuT9XNkCoFFm/+Tf0isM2VspXkfhG90JznBh/EFf1B0u0xWOgU9fuf6ndgyYsgAVrYDrxq4l7s6nMSqZRwXgR+4dTMwQze3rmBqu86MlaHaR7SZHDgAMv+oxKjCuX8yQysqheoOjJ9Th9rIuRFXi7fGD0B8id66ERAI3REMR9900qtdoG40AHQVGNymdT2gJpxiI1rr2jJL1wJYgDyZwqVyZwAgbGqtZbqDdVX8zVcJGT8x6k2UHwi7r5zRMQY+4KUuATQkXrSfi4LzL6jiorEeqgTrTEmM2N2dfKbsAp+FRfmQEMMXfWwZ8ZIvxIXGVF3Z8CdL7kha6QxE9cJDY2Kk4sZxkgG07CbcYVGnSAlgRCEZVUkxxEwJLqGHFukAQBQGoHcUDPRO4UCZnjDlyzaWqAmkR3hZOQUlRZ7CGNw6Aj7jxKuAMZfobjisRwIRxR3ACKO4oAVF0lRGAKT3hkcIBfc1AmjBWG0kmPMwRCaJ+kgElLIowEnNVcoAzMHcsGAqoCKMREdwiMIA4jETJY+TqAkDb7SBdxZH413hjexuJpJxsdySIHURNgjzKQYEoTLCrIdnU0uI7FVHEGgT4jSckw3cRIgIRszJ2JJFTW/EDVdhEucclNst0jxNrXWaZMdiwb8TLanpJabsbu5VtnUaNyvtOZmLLXVroTfGSuP49V4j1NmRTE9olY3Gjq+u8qoEodLuMMJPaoKI0Ys6kNQjaIC4CFYkM3IaOpTqCpBMxY0KHQdIlyaaOQaMH4k6uZhibksxHTv1iX89Zsw9wAmqFn5zRmLcSCekzC+1yJo3u41yFfvDFY3wAhrIE3ayt9DOcZbS+3eQcpscdiNFltdiCxdxnQkI5Cg8ese23Gzo5GFt5lARPqA1LDl9ZHEnQj5UN9IY2DC16f3EqbEHHx33kBeRubOSY1WGK+nMVDg3MHFOBOnhx6SWTzBcp4kNdbHiHApZqNW4ipujAgQTbYnGQVPIy+YU0BMnFGxHjPeGps3rci+9fSJvii5X11KAjQlsYYDZA8RcQooDU0iIuA1IW5fERjQhAtf/9k=' },
    { id: 'night', name: '星空', p: BG_BASE + 'night-p.jpg', l: BG_BASE + 'night-l.jpg', posP: 'center', posL: 'center', thumb: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACQAGADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAAECAwQFBgf/xAAnEAACAgEEAQQDAQEBAAAAAAAAAQIRAwQSITFBEyJRYRQycQWBkf/EABgBAQEBAQEAAAAAAAAAAAAAAAEAAgME/8QAGBEBAQEBAQAAAAAAAAAAAAAAAAERMSH/2gAMAwEAAhEDEQA/APlePbJc9jlg3Rc+KS6szxk0+DTjW+lJnrnrhxmx+2fKtGlYrjuSfI9RixqvTtvzwVxzTilDdwn5KTFfVU8bTuiDibcqjtSjK12ZmqRWKVS0FOqJu6sSTbpdmMaQr4BkgqyxIpX0hUdb/J0kUsur1bUNNjxy/Z08kmmlGK88tfw5bQYU18eDRhtO4+OShN1RZjy5Me5Qk0pKpV5R0jFdXRyxP91cjJrdPGORtNNvmVePoqw5Nr75NMHCctz5k+zXWZc6w7nFpLx4ITdyOrk0+KOKW7uuGjmTilLjlBY1KNtrog4l0Z3GqXHkg/lIMSqgJCoCVkWSlFpkWFKzjwFhXwDrilz5FlJPnjosUypDs3KLG7HndcvrwyuUINuTX/DNua5LIS8j0cRy49vRFSpUXS2ypviymUaM2Ebb5SFRKM9t+R9klTQpJXwWrG3dK6XJVJUFhlP+jXYNASOhABIDTFQxBpj7Ih9kjaE7TGmDaJJxlcXTq/gqyJklwEuY2CRCgGRIYDFEA6CiBIBiJAAAiF8BdcCuuuAfQJLsKGk74AQVDGAgkgY6AkVCokFEUaBolQAkKF0ToW0MK+Dp21Q3GEq239ls9PllKTUJSS7aQsmny4EpZMbin02aCPox2Np+5eCna0WykpeKfyiDSIIiolQNEkQoY6JI0NqicYri2aMcsSjUlf8ASTPjwyyW1zXYPG7rhfRo9RRtQr/wpacpOUnRF2/zGuI0n5+zapx1WjnD090trV9cnnIZbncrbOnh1kcUKxupNd10FLnrSZG+Y7V8s1afRabL7PUlu8SqkiWo1k88ds6f2U4W8c07EIa/QvSZVFPdGStSoyuDR346nTZdnqwU5rhN9FH+jp8VLJghTb91EHF2gka1ibvmn/C/T6DJmhKcUko8e50Kxztr7JRhJukrf0bvxJrJsUbb+Dq48ePS6THWJLJXuvsNOOJh0ebIrUaXy+KHPStOlz9ryX6jWTSajwn2ZYZJxe5N2SZI5En0Es7UuBuMWvgThFduzPpTea8fdNlcc0o3TfJXLvgjzf0GlvwZracmlTOitXilH3t8Ls4MZuPRasqfaNaMdn8vSTi5bOYrjntmSWvzttKbcfgwN1+vQ/U4+GWp0YZHNXvpvu2KeoydN2uuzmbnyJ5ZdFqxvnqYuLUV/bMU87cnXBVbsTM2nH//2Q==' },
    { id: 'bunny', name: '澄澄澎澎', p: BG_BASE + 'bunny-p.jpg', l: BG_BASE + 'bunny-l.jpg', posP: 'center bottom', posL: 'right bottom', thumb: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACQAGADASIAAhEBAxEB/8QAGgAAAwEBAQEAAAAAAAAAAAAAAAECAwQFB//EACoQAAICAgEDBAICAgMAAAAAAAABAhEDIRIxQVEEYXGBEyIyQpHBFKHR/8QAFwEBAQEBAAAAAAAAAAAAAAAAAAECA//EABsRAQEBAQEBAQEAAAAAAAAAAAARARIhAjFB/9oADAMBAAIRAxEAPwD68AdAOToABIYUhgFWQIYUMBDATYACYhpWy/ifqpR8E0+5lHI4spZG3ozu7jefNXVBpGl8obWzOUWmM2s7kAwQDcKBiGFJhSHQgDXSgcn0S0AVZNxc1k4AofRpQfQapJS86KvyxV4ChmZibu6PgASA1WIYBQEqgCqFROiFQwCwEA1Ul7iapkqgQwFIEMLAbpAAWBKsAxBYpDoGFi6ikRjXlmmTxo5uTWxc97ZI1PXRHi3VjlFrZjDrd0dEacepM0+siAsUlTEKRQWIAHYWIdWEAIhzinVspThV9SqzpPqDgiuSE5JPqZrSOD8lKco/A77rYcr7gNZL3XyO030ZN0HJkIr5Bte4lJhbFSJc5f1TI5SXdmv2FR7pCr4w3Y0n5NXFMFBFq+M2myeL6luUV/YSyQfRl9LhVKtWJJp+5pfuGzKi5dGh/VC+xbIRQfTIlNxcd0m9jc/2UVQjKvhBpLbD6FxXgKeuzGuPklxj1dIFx7NFiPPjkyOT5Q12NbjWk/Ycs0VJJJO3TRDzQhOMbVJ6bfYvWpGi2lx39F7W3OMflnP/AMiMZxipJxe/kqWbG8iikpOb/wAjsjoxZcU2uWZU3SrVsMk8cMnBZJP3SuvZkZceO43CE+D5RbX8X0tf9l/svSyk98d+7Nfxm+lKcaTmpSi5JKl3/wBIacH+R4YTU8dKXJOne9PuZuf5MCdVd/4NvTO9Tk3GqoYay/Jk7IHPI/5OiM2V487wvs1X+jGXq1ObhO2rqlRjpp0OMn05S+CW0l0YsmdckoyVWmmu6NIzh01ff2HWkcX41xlzdPt7GfCPDjOLTfSRvKDm6bpLx3RGVybaSuKr68mRjjjBayvlqkr6GccWbFljmjKM6VraWjafpnOm04q+zLtr9U7rz5IRWL1OaU0smNpNba7FTzZp4HHHqTtP4M1KTd5Xcuxrjauka61Iw9O/UxhwzU6WmvJup5IKKjt1+z9wm2o7S9mZcZuNpvrdPuTrVmFlxPI36rJLlr+KfWjOGPG28lOMX979gljySnalrv8A+Gql+tTqUF1j2RAQShBycU01a8xNcMW03K0r17mUcLbTtpeDZXdV+qoVX//Z' }
  ];
  const PHOTO_KEY = 'xiaotang-skin-photo';
  const CACHE_KEY = 'xiaotang-skin-bgcache';
  const KEY = 'xiaotang-skin';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 存不了就算了 */ } };
  // bg：pattern＝兔兔底紋、image＝背景圖；img：哪一張；veil：霧面濃淡
  const state = Object.assign({ theme: 'rose', font: 'huninn', bg: 'pattern', img: 'sakura', veil: 'mid' }, load());
  if (!THEMES.some(t => t[0] === state.theme)) state.theme = 'rose';

  const html = document.documentElement;
  const ATTRS = { 'data-xt-theme': () => state.theme, 'data-xt-font': () => state.font,
                  'data-xt-bg': () => state.bg, 'data-xt-veil': () => state.veil };
  function applyAttrs() {
    for (const [k, v] of Object.entries(ATTRS)) if (html.getAttribute(k) !== v()) html.setAttribute(k, v());
  }
  applyAttrs();
  // 網站如果重設 html 的屬性，就補回去
  new MutationObserver(applyAttrs).observe(html, { attributes: true, attributeFilter: Object.keys(ATTRS) });

  // 網站在 html 底下還會一層層重新定義顏色，所以每一層都要蓋
  const SCOPES = ':root, .cds-root, [data-cds-fizzy-lake], .dframe-root, .dframe-sidebar';
  // 網站自己的字體（包含圖示字型）接在粉圓後面當備援，粉圓沒有的字（像圖示）就會交給它們
  const FONT = '"Huninn", "XT Huninn", var(--xt-fallback,) -apple-system, "PingFang TC", sans-serif';

  const css = `
/* ======================== 調色盤 ======================== */
/* 粉灰・淺色 */
:root, html[data-xt-theme="rose"] {--xt-g-0:#fefcfd;--xt-g-10:#fdfbfc;--xt-g-20:#fbf7f8;--xt-g-30:#f9f3f5;--xt-g-40:#f7eff2;--xt-g-50:#f4eaed;--xt-g-60:#f1e7ea;--xt-g-70:#efe3e7;--xt-g-80:#ece0e4;--xt-g-90:#eadce1;--xt-g-100:#e7d9de;--xt-g-150:#d8cacf;--xt-g-200:#c8bcc0;--xt-g-250:#b9adb1;--xt-g-300:#ab9da2;--xt-g-350:#9d8d92;--xt-g-400:#917d84;--xt-g-450:#836f76;--xt-g-500:#746268;--xt-g-550:#66565b;--xt-g-600:#574b4f;--xt-g-650:#493f42;--xt-g-700:#3c3437;--xt-g-750:#31272a;--xt-g-800:#241c1f;--xt-g-810:#221a1d;--xt-g-820:#1f191b;--xt-g-830:#1d1719;--xt-g-840:#1b1517;--xt-g-850:#181214;--xt-g-860:#151112;--xt-g-870:#130f10;--xt-g-880:#110d0e;--xt-g-890:#0f0b0c;--xt-g-900:#0c0a0b;--xt-page:#fbf3f6;--xt-surface-0:#fcf6f8;--xt-surface-1:#fbf3f6;--xt-surface-2:#f8edf1;--xt-surface-3:#fffafc;--xt-popover:#fff8fb;--xt-sidebar:#f9eef2;--xt-text-1:rgb(40 26 33 / 0.95);--xt-text-2:rgb(70 50 60 / 0.80);--xt-text-3:rgb(100 80 90 / 0.66);--xt-ring:rgb(214 110 146 / 0.24);--xt-ring-strong:rgb(214 110 146 / 0.38);--xt-hover:rgb(214 110 146 / 0.12);--xt-selected:rgb(214 110 146 / 0.22);--xt-selected-hover:rgb(214 110 146 / 0.30);--xt-field:rgb(214 110 146 / 0.10);--xt-accent:#c95f86;--xt-accent-hover:#b5507a;--xt-primary:#c45c82;--xt-primary-hover:#b04d73;--xt-bubble:linear-gradient(135deg, #f7d4de, #efe2e8);--xt-bubble-solid:#f8edf1;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #f7d4de 82%, transparent), color-mix(in srgb, #efe2e8 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(214 110 146 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23e48aa8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23a9a1ab%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #fbf3f6 35%, transparent);}
/* 粉灰・深色 */
html[data-xt-theme="rose"][data-mode="dark"] {--xt-page:#1c1519;--xt-surface-0:#191317;--xt-surface-1:#1c1519;--xt-surface-2:#221a1f;--xt-surface-3:#31262c;--xt-popover:#2a2026;--xt-sidebar:#211a1e;--xt-text-1:rgb(255 240 245 / 0.94);--xt-text-2:rgb(245 220 230 / 0.74);--xt-text-3:rgb(235 205 218 / 0.56);--xt-ring:rgb(240 160 190 / 0.24);--xt-ring-strong:rgb(240 160 190 / 0.38);--xt-hover:rgb(240 160 190 / 0.12);--xt-selected:rgb(240 160 190 / 0.22);--xt-selected-hover:rgb(240 160 190 / 0.30);--xt-field:rgb(240 160 190 / 0.10);--xt-accent:#ec9ab8;--xt-accent-hover:#f2adc6;--xt-primary:#ec9ab8;--xt-primary-hover:#f2adc6;--xt-bubble:linear-gradient(135deg, #4a2c3a, #33282e);--xt-bubble-solid:#221a1f;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4a2c3a 82%, transparent), color-mix(in srgb, #33282e 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23e48aa8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238a7f88%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1c1519 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="rose"][data-mode="system"] {--xt-page:#1c1519;--xt-surface-0:#191317;--xt-surface-1:#1c1519;--xt-surface-2:#221a1f;--xt-surface-3:#31262c;--xt-popover:#2a2026;--xt-sidebar:#211a1e;--xt-text-1:rgb(255 240 245 / 0.94);--xt-text-2:rgb(245 220 230 / 0.74);--xt-text-3:rgb(235 205 218 / 0.56);--xt-ring:rgb(240 160 190 / 0.24);--xt-ring-strong:rgb(240 160 190 / 0.38);--xt-hover:rgb(240 160 190 / 0.12);--xt-selected:rgb(240 160 190 / 0.22);--xt-selected-hover:rgb(240 160 190 / 0.30);--xt-field:rgb(240 160 190 / 0.10);--xt-accent:#ec9ab8;--xt-accent-hover:#f2adc6;--xt-primary:#ec9ab8;--xt-primary-hover:#f2adc6;--xt-bubble:linear-gradient(135deg, #4a2c3a, #33282e);--xt-bubble-solid:#221a1f;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4a2c3a 82%, transparent), color-mix(in srgb, #33282e 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23e48aa8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238a7f88%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1c1519 45%, transparent);} }
/* 奶茶粉・淺色 */
html[data-xt-theme="milktea"] {--xt-g-0:#fefdfc;--xt-g-10:#fdfcfb;--xt-g-20:#fbf9f7;--xt-g-30:#f9f6f3;--xt-g-40:#f7f3ef;--xt-g-50:#f4efea;--xt-g-60:#f1ece7;--xt-g-70:#efe9e3;--xt-g-80:#ece6e0;--xt-g-90:#e9e3dd;--xt-g-100:#e7e0d9;--xt-g-150:#d8d1ca;--xt-g-200:#c8c2bc;--xt-g-250:#b9b3ad;--xt-g-300:#aba49d;--xt-g-350:#9d958d;--xt-g-400:#91877d;--xt-g-450:#83796f;--xt-g-500:#746b62;--xt-g-550:#665e56;--xt-g-600:#57514b;--xt-g-650:#49443f;--xt-g-700:#3c3834;--xt-g-750:#312c27;--xt-g-800:#24201c;--xt-g-810:#221e1a;--xt-g-820:#1f1c19;--xt-g-830:#1d1a17;--xt-g-840:#1b1815;--xt-g-850:#181512;--xt-g-860:#151311;--xt-g-870:#13110f;--xt-g-880:#110f0d;--xt-g-890:#0f0d0b;--xt-g-900:#0c0b0a;--xt-page:#f7f1ea;--xt-surface-0:#f9f4ee;--xt-surface-1:#f7f1ea;--xt-surface-2:#f1e8de;--xt-surface-3:#fffcf8;--xt-popover:#fffaf5;--xt-sidebar:#f3ebe2;--xt-text-1:rgb(48 34 26 / 0.95);--xt-text-2:rgb(78 60 48 / 0.80);--xt-text-3:rgb(108 90 78 / 0.66);--xt-ring:rgb(180 120 110 / 0.24);--xt-ring-strong:rgb(180 120 110 / 0.38);--xt-hover:rgb(180 120 110 / 0.12);--xt-selected:rgb(180 120 110 / 0.22);--xt-selected-hover:rgb(180 120 110 / 0.30);--xt-field:rgb(180 120 110 / 0.10);--xt-accent:#b5687a;--xt-accent-hover:#a2596b;--xt-primary:#b5687a;--xt-primary-hover:#a2596b;--xt-bubble:linear-gradient(135deg, #f2d9d4, #eadfd2);--xt-bubble-solid:#f1e8de;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #f2d9d4 82%, transparent), color-mix(in srgb, #eadfd2 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(180 120 110 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23dc9aa3%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23b8a493%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #f7f1ea 35%, transparent);}
/* 奶茶粉・深色 */
html[data-xt-theme="milktea"][data-mode="dark"] {--xt-page:#1d1915;--xt-surface-0:#1a1613;--xt-surface-1:#1d1915;--xt-surface-2:#241f1a;--xt-surface-3:#332b24;--xt-popover:#2b241e;--xt-sidebar:#221d18;--xt-text-1:rgb(250 240 230 / 0.94);--xt-text-2:rgb(235 220 205 / 0.74);--xt-text-3:rgb(220 205 190 / 0.56);--xt-ring:rgb(225 170 160 / 0.24);--xt-ring-strong:rgb(225 170 160 / 0.38);--xt-hover:rgb(225 170 160 / 0.12);--xt-selected:rgb(225 170 160 / 0.22);--xt-selected-hover:rgb(225 170 160 / 0.30);--xt-field:rgb(225 170 160 / 0.10);--xt-accent:#e6a6ad;--xt-accent-hover:#eebac0;--xt-primary:#e6a6ad;--xt-primary-hover:#eebac0;--xt-bubble:linear-gradient(135deg, #4a3530, #3a2f27);--xt-bubble-solid:#241f1a;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4a3530 82%, transparent), color-mix(in srgb, #3a2f27 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23d99aa2%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238c7d70%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1d1915 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="milktea"][data-mode="system"] {--xt-page:#1d1915;--xt-surface-0:#1a1613;--xt-surface-1:#1d1915;--xt-surface-2:#241f1a;--xt-surface-3:#332b24;--xt-popover:#2b241e;--xt-sidebar:#221d18;--xt-text-1:rgb(250 240 230 / 0.94);--xt-text-2:rgb(235 220 205 / 0.74);--xt-text-3:rgb(220 205 190 / 0.56);--xt-ring:rgb(225 170 160 / 0.24);--xt-ring-strong:rgb(225 170 160 / 0.38);--xt-hover:rgb(225 170 160 / 0.12);--xt-selected:rgb(225 170 160 / 0.22);--xt-selected-hover:rgb(225 170 160 / 0.30);--xt-field:rgb(225 170 160 / 0.10);--xt-accent:#e6a6ad;--xt-accent-hover:#eebac0;--xt-primary:#e6a6ad;--xt-primary-hover:#eebac0;--xt-bubble:linear-gradient(135deg, #4a3530, #3a2f27);--xt-bubble-solid:#241f1a;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4a3530 82%, transparent), color-mix(in srgb, #3a2f27 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23d99aa2%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238c7d70%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1d1915 45%, transparent);} }
/* 霧灰藍・淺色 */
html[data-xt-theme="mist"] {--xt-g-0:#fcfdfe;--xt-g-10:#fbfcfd;--xt-g-20:#f7f9fb;--xt-g-30:#f3f6f9;--xt-g-40:#eff3f7;--xt-g-50:#eaeff4;--xt-g-60:#e7ecf1;--xt-g-70:#e3e9ef;--xt-g-80:#e0e6ec;--xt-g-90:#dde3e9;--xt-g-100:#d9e0e7;--xt-g-150:#cad1d8;--xt-g-200:#bcc2c8;--xt-g-250:#adb3b9;--xt-g-300:#9da4ab;--xt-g-350:#8d959d;--xt-g-400:#7d8791;--xt-g-450:#6f7983;--xt-g-500:#626b74;--xt-g-550:#565e66;--xt-g-600:#4b5157;--xt-g-650:#3f4449;--xt-g-700:#34383c;--xt-g-750:#272c31;--xt-g-800:#1c2024;--xt-g-810:#1a1e22;--xt-g-820:#191c1f;--xt-g-830:#171a1d;--xt-g-840:#15181b;--xt-g-850:#121518;--xt-g-860:#111315;--xt-g-870:#0f1113;--xt-g-880:#0d0f11;--xt-g-890:#0b0d0f;--xt-g-900:#0a0b0c;--xt-page:#eef2f6;--xt-surface-0:#f2f5f8;--xt-surface-1:#eef2f6;--xt-surface-2:#e6ecf2;--xt-surface-3:#fafcfe;--xt-popover:#f8fafc;--xt-sidebar:#e9eef3;--xt-text-1:rgb(26 32 40 / 0.95);--xt-text-2:rgb(52 62 75 / 0.80);--xt-text-3:rgb(82 94 108 / 0.66);--xt-ring:rgb(110 135 165 / 0.24);--xt-ring-strong:rgb(110 135 165 / 0.38);--xt-hover:rgb(110 135 165 / 0.12);--xt-selected:rgb(110 135 165 / 0.22);--xt-selected-hover:rgb(110 135 165 / 0.30);--xt-field:rgb(110 135 165 / 0.10);--xt-accent:#c96a8f;--xt-accent-hover:#b65a7f;--xt-primary:#c96a8f;--xt-primary-hover:#b65a7f;--xt-bubble:linear-gradient(135deg, #f6d6e0, #e5e2ec);--xt-bubble-solid:#e6ecf2;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #f6d6e0 82%, transparent), color-mix(in srgb, #e5e2ec 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(110 135 165 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23e7a0b8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238f9fb0%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #eef2f6 35%, transparent);}
/* 霧灰藍・深色 */
html[data-xt-theme="mist"][data-mode="dark"] {--xt-page:#161a1f;--xt-surface-0:#13171c;--xt-surface-1:#161a1f;--xt-surface-2:#1c2128;--xt-surface-3:#283039;--xt-popover:#222931;--xt-sidebar:#1a1f25;--xt-text-1:rgb(236 242 248 / 0.94);--xt-text-2:rgb(210 222 235 / 0.74);--xt-text-3:rgb(190 204 220 / 0.56);--xt-ring:rgb(150 175 205 / 0.24);--xt-ring-strong:rgb(150 175 205 / 0.38);--xt-hover:rgb(150 175 205 / 0.12);--xt-selected:rgb(150 175 205 / 0.22);--xt-selected-hover:rgb(150 175 205 / 0.30);--xt-field:rgb(150 175 205 / 0.10);--xt-accent:#ef9fbd;--xt-accent-hover:#f4b3cb;--xt-primary:#ef9fbd;--xt-primary-hover:#f4b3cb;--xt-bubble:linear-gradient(135deg, #4a2e3d, #2e3540);--xt-bubble-solid:#1c2128;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4a2e3d 82%, transparent), color-mix(in srgb, #2e3540 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23e48aa8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%237d8a98%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #161a1f 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="mist"][data-mode="system"] {--xt-page:#161a1f;--xt-surface-0:#13171c;--xt-surface-1:#161a1f;--xt-surface-2:#1c2128;--xt-surface-3:#283039;--xt-popover:#222931;--xt-sidebar:#1a1f25;--xt-text-1:rgb(236 242 248 / 0.94);--xt-text-2:rgb(210 222 235 / 0.74);--xt-text-3:rgb(190 204 220 / 0.56);--xt-ring:rgb(150 175 205 / 0.24);--xt-ring-strong:rgb(150 175 205 / 0.38);--xt-hover:rgb(150 175 205 / 0.12);--xt-selected:rgb(150 175 205 / 0.22);--xt-selected-hover:rgb(150 175 205 / 0.30);--xt-field:rgb(150 175 205 / 0.10);--xt-accent:#ef9fbd;--xt-accent-hover:#f4b3cb;--xt-primary:#ef9fbd;--xt-primary-hover:#f4b3cb;--xt-bubble:linear-gradient(135deg, #4a2e3d, #2e3540);--xt-bubble-solid:#1c2128;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4a2e3d 82%, transparent), color-mix(in srgb, #2e3540 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23e48aa8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%237d8a98%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #161a1f 45%, transparent);} }
/* 薰衣草・淺色 */
html[data-xt-theme="lavender"] {--xt-g-0:#fdfcfe;--xt-g-10:#fcfbfd;--xt-g-20:#f9f7fb;--xt-g-30:#f6f3f9;--xt-g-40:#f3eff7;--xt-g-50:#efeaf4;--xt-g-60:#ece7f1;--xt-g-70:#e9e3ef;--xt-g-80:#e6e0ec;--xt-g-90:#e3dcea;--xt-g-100:#e0d9e7;--xt-g-150:#d1cad8;--xt-g-200:#c2bcc8;--xt-g-250:#b3adb9;--xt-g-300:#a49dab;--xt-g-350:#958d9d;--xt-g-400:#877d91;--xt-g-450:#796f83;--xt-g-500:#6b6274;--xt-g-550:#5e5666;--xt-g-600:#514b57;--xt-g-650:#443f49;--xt-g-700:#38343c;--xt-g-750:#2c2731;--xt-g-800:#201c24;--xt-g-810:#1e1a22;--xt-g-820:#1c191f;--xt-g-830:#1a171d;--xt-g-840:#18151b;--xt-g-850:#151218;--xt-g-860:#131115;--xt-g-870:#110f13;--xt-g-880:#0f0d11;--xt-g-890:#0d0b0f;--xt-g-900:#0b0a0c;--xt-page:#f4f1f8;--xt-surface-0:#f7f4fa;--xt-surface-1:#f4f1f8;--xt-surface-2:#ece7f3;--xt-surface-3:#fdfbff;--xt-popover:#fbf9fe;--xt-sidebar:#efeaf5;--xt-text-1:rgb(34 26 44 / 0.95);--xt-text-2:rgb(62 52 76 / 0.80);--xt-text-3:rgb(92 82 108 / 0.66);--xt-ring:rgb(150 120 190 / 0.24);--xt-ring-strong:rgb(150 120 190 / 0.38);--xt-hover:rgb(150 120 190 / 0.12);--xt-selected:rgb(150 120 190 / 0.22);--xt-selected-hover:rgb(150 120 190 / 0.30);--xt-field:rgb(150 120 190 / 0.10);--xt-accent:#8f68b6;--xt-accent-hover:#7d58a3;--xt-primary:#8f68b6;--xt-primary-hover:#7d58a3;--xt-bubble:linear-gradient(135deg, #e6dbf3, #f1e1ee);--xt-bubble-solid:#ece7f3;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #e6dbf3 82%, transparent), color-mix(in srgb, #f1e1ee 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(150 120 190 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23d9a0c6%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23a99cbc%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #f4f1f8 35%, transparent);}
/* 薰衣草・深色 */
html[data-xt-theme="lavender"][data-mode="dark"] {--xt-page:#1a1720;--xt-surface-0:#17141c;--xt-surface-1:#1a1720;--xt-surface-2:#211d28;--xt-surface-3:#2f2a38;--xt-popover:#28232f;--xt-sidebar:#1f1b25;--xt-text-1:rgb(244 238 252 / 0.94);--xt-text-2:rgb(225 215 240 / 0.74);--xt-text-3:rgb(205 195 225 / 0.56);--xt-ring:rgb(190 165 230 / 0.24);--xt-ring-strong:rgb(190 165 230 / 0.38);--xt-hover:rgb(190 165 230 / 0.12);--xt-selected:rgb(190 165 230 / 0.22);--xt-selected-hover:rgb(190 165 230 / 0.30);--xt-field:rgb(190 165 230 / 0.10);--xt-accent:#c7a6ea;--xt-accent-hover:#d4baf0;--xt-primary:#c7a6ea;--xt-primary-hover:#d4baf0;--xt-bubble:linear-gradient(135deg, #3f3054, #3a2c3c);--xt-bubble-solid:#211d28;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #3f3054 82%, transparent), color-mix(in srgb, #3a2c3c 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23c98fb8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238a7f9c%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1a1720 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="lavender"][data-mode="system"] {--xt-page:#1a1720;--xt-surface-0:#17141c;--xt-surface-1:#1a1720;--xt-surface-2:#211d28;--xt-surface-3:#2f2a38;--xt-popover:#28232f;--xt-sidebar:#1f1b25;--xt-text-1:rgb(244 238 252 / 0.94);--xt-text-2:rgb(225 215 240 / 0.74);--xt-text-3:rgb(205 195 225 / 0.56);--xt-ring:rgb(190 165 230 / 0.24);--xt-ring-strong:rgb(190 165 230 / 0.38);--xt-hover:rgb(190 165 230 / 0.12);--xt-selected:rgb(190 165 230 / 0.22);--xt-selected-hover:rgb(190 165 230 / 0.30);--xt-field:rgb(190 165 230 / 0.10);--xt-accent:#c7a6ea;--xt-accent-hover:#d4baf0;--xt-primary:#c7a6ea;--xt-primary-hover:#d4baf0;--xt-bubble:linear-gradient(135deg, #3f3054, #3a2c3c);--xt-bubble-solid:#211d28;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #3f3054 82%, transparent), color-mix(in srgb, #3a2c3c 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23c98fb8%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238a7f9c%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1a1720 45%, transparent);} }
/* 櫻花白・淺色 */
html[data-xt-theme="sakura"] {--xt-g-0:#fefcfd;--xt-g-10:#fdfbfb;--xt-g-20:#fbf7f8;--xt-g-30:#f8f4f4;--xt-g-40:#f6f0f1;--xt-g-50:#f3ebed;--xt-g-60:#f0e8e9;--xt-g-70:#eee4e6;--xt-g-80:#ebe1e3;--xt-g-90:#e8dee0;--xt-g-100:#e5dbdc;--xt-g-150:#d7cbcd;--xt-g-200:#c8bcbe;--xt-g-250:#b9adaf;--xt-g-300:#ab9d9f;--xt-g-350:#9d8d8f;--xt-g-400:#917d81;--xt-g-450:#836f73;--xt-g-500:#746265;--xt-g-550:#665659;--xt-g-600:#574b4d;--xt-g-650:#493f40;--xt-g-700:#3c3435;--xt-g-750:#312728;--xt-g-800:#241c1d;--xt-g-810:#221a1c;--xt-g-820:#1f191a;--xt-g-830:#1d1718;--xt-g-840:#1b1516;--xt-g-850:#181213;--xt-g-860:#151111;--xt-g-870:#130f10;--xt-g-880:#110d0e;--xt-g-890:#0f0b0c;--xt-g-900:#0c0a0a;--xt-page:#fdf8f9;--xt-surface-0:#fefafb;--xt-surface-1:#fdf8f9;--xt-surface-2:#f9eef1;--xt-surface-3:#ffffff;--xt-popover:#fffcfd;--xt-sidebar:#faf1f3;--xt-text-1:rgb(42 30 35 / 0.95);--xt-text-2:rgb(72 56 62 / 0.80);--xt-text-3:rgb(104 88 94 / 0.68);--xt-ring:rgb(226 140 165 / 0.24);--xt-ring-strong:rgb(226 140 165 / 0.38);--xt-hover:rgb(226 140 165 / 0.12);--xt-selected:rgb(226 140 165 / 0.22);--xt-selected-hover:rgb(226 140 165 / 0.30);--xt-field:rgb(226 140 165 / 0.10);--xt-accent:#cf6585;--xt-accent-hover:#bb5575;--xt-primary:#cf6585;--xt-primary-hover:#bb5575;--xt-bubble:linear-gradient(135deg, #fbe1e8, #f6ecef);--xt-bubble-solid:#f9eef1;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #fbe1e8 82%, transparent), color-mix(in srgb, #f6ecef 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(226 140 165 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23f0a8bc%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23c9b9bf%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #fdf8f9 40%, transparent);}
/* 櫻花白・深色 */
html[data-xt-theme="sakura"][data-mode="dark"] {--xt-page:#1e1719;--xt-surface-0:#1a1416;--xt-surface-1:#1e1719;--xt-surface-2:#261d20;--xt-surface-3:#352a2e;--xt-popover:#2d2327;--xt-sidebar:#231b1e;--xt-text-1:rgb(255 244 247 / 0.94);--xt-text-2:rgb(246 226 232 / 0.74);--xt-text-3:rgb(236 212 220 / 0.56);--xt-ring:rgb(245 175 195 / 0.24);--xt-ring-strong:rgb(245 175 195 / 0.38);--xt-hover:rgb(245 175 195 / 0.12);--xt-selected:rgb(245 175 195 / 0.22);--xt-selected-hover:rgb(245 175 195 / 0.30);--xt-field:rgb(245 175 195 / 0.10);--xt-accent:#f3a9bf;--xt-accent-hover:#f7bccd;--xt-primary:#f3a9bf;--xt-primary-hover:#f7bccd;--xt-bubble:linear-gradient(135deg, #4d3039, #352a2e);--xt-bubble-solid:#261d20;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4d3039 82%, transparent), color-mix(in srgb, #352a2e 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23eea2b7%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238f8287%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1e1719 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="sakura"][data-mode="system"] {--xt-page:#1e1719;--xt-surface-0:#1a1416;--xt-surface-1:#1e1719;--xt-surface-2:#261d20;--xt-surface-3:#352a2e;--xt-popover:#2d2327;--xt-sidebar:#231b1e;--xt-text-1:rgb(255 244 247 / 0.94);--xt-text-2:rgb(246 226 232 / 0.74);--xt-text-3:rgb(236 212 220 / 0.56);--xt-ring:rgb(245 175 195 / 0.24);--xt-ring-strong:rgb(245 175 195 / 0.38);--xt-hover:rgb(245 175 195 / 0.12);--xt-selected:rgb(245 175 195 / 0.22);--xt-selected-hover:rgb(245 175 195 / 0.30);--xt-field:rgb(245 175 195 / 0.10);--xt-accent:#f3a9bf;--xt-accent-hover:#f7bccd;--xt-primary:#f3a9bf;--xt-primary-hover:#f7bccd;--xt-bubble:linear-gradient(135deg, #4d3039, #352a2e);--xt-bubble-solid:#261d20;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4d3039 82%, transparent), color-mix(in srgb, #352a2e 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23eea2b7%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238f8287%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1e1719 45%, transparent);} }
/* 蜜桃杏・淺色 */
html[data-xt-theme="peach"] {--xt-g-0:#fefdfc;--xt-g-10:#fdfcfb;--xt-g-20:#fbf8f7;--xt-g-30:#f9f5f3;--xt-g-40:#f7f2ef;--xt-g-50:#f4edea;--xt-g-60:#f2eae6;--xt-g-70:#efe7e3;--xt-g-80:#ede4df;--xt-g-90:#eae1dc;--xt-g-100:#e7ded9;--xt-g-150:#d8cfca;--xt-g-200:#c8c0bc;--xt-g-250:#b9b1ad;--xt-g-300:#aba29d;--xt-g-350:#9d928d;--xt-g-400:#91847d;--xt-g-450:#83766f;--xt-g-500:#746862;--xt-g-550:#665b56;--xt-g-600:#574f4b;--xt-g-650:#49423f;--xt-g-700:#3c3734;--xt-g-750:#312a27;--xt-g-800:#241f1c;--xt-g-810:#221d1a;--xt-g-820:#1f1b19;--xt-g-830:#1d1917;--xt-g-840:#1b1715;--xt-g-850:#181412;--xt-g-860:#151211;--xt-g-870:#13100f;--xt-g-880:#110e0d;--xt-g-890:#0f0c0b;--xt-g-900:#0c0b0a;--xt-page:#fdf4ee;--xt-surface-0:#fef7f2;--xt-surface-1:#fdf4ee;--xt-surface-2:#f9e8de;--xt-surface-3:#fffbf8;--xt-popover:#fffaf6;--xt-sidebar:#faece3;--xt-text-1:rgb(50 32 24 / 0.95);--xt-text-2:rgb(82 58 46 / 0.80);--xt-text-3:rgb(112 88 76 / 0.68);--xt-ring:rgb(230 140 110 / 0.24);--xt-ring-strong:rgb(230 140 110 / 0.38);--xt-hover:rgb(230 140 110 / 0.12);--xt-selected:rgb(230 140 110 / 0.22);--xt-selected-hover:rgb(230 140 110 / 0.30);--xt-field:rgb(230 140 110 / 0.10);--xt-accent:#c9654f;--xt-accent-hover:#b55642;--xt-primary:#c9654f;--xt-primary-hover:#b55642;--xt-bubble:linear-gradient(135deg, #fbd9c9, #f8e4d6);--xt-bubble-solid:#f9e8de;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #fbd9c9 82%, transparent), color-mix(in srgb, #f8e4d6 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(230 140 110 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23f0a08a%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23c8ac9c%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #fdf4ee 35%, transparent);}
/* 蜜桃杏・深色 */
html[data-xt-theme="peach"][data-mode="dark"] {--xt-page:#1f1714;--xt-surface-0:#1b1411;--xt-surface-1:#1f1714;--xt-surface-2:#271d18;--xt-surface-3:#372a23;--xt-popover:#2e231d;--xt-sidebar:#241a16;--xt-text-1:rgb(255 242 234 / 0.94);--xt-text-2:rgb(245 222 208 / 0.74);--xt-text-3:rgb(232 206 190 / 0.56);--xt-ring:rgb(245 170 140 / 0.24);--xt-ring-strong:rgb(245 170 140 / 0.38);--xt-hover:rgb(245 170 140 / 0.12);--xt-selected:rgb(245 170 140 / 0.22);--xt-selected-hover:rgb(245 170 140 / 0.30);--xt-field:rgb(245 170 140 / 0.10);--xt-accent:#f4a98f;--xt-accent-hover:#f8bba6;--xt-primary:#f4a98f;--xt-primary-hover:#f8bba6;--xt-bubble:linear-gradient(135deg, #563428, #3c2d25);--xt-bubble-solid:#271d18;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #563428 82%, transparent), color-mix(in srgb, #3c2d25 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23ee9f88%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23938076%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1f1714 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="peach"][data-mode="system"] {--xt-page:#1f1714;--xt-surface-0:#1b1411;--xt-surface-1:#1f1714;--xt-surface-2:#271d18;--xt-surface-3:#372a23;--xt-popover:#2e231d;--xt-sidebar:#241a16;--xt-text-1:rgb(255 242 234 / 0.94);--xt-text-2:rgb(245 222 208 / 0.74);--xt-text-3:rgb(232 206 190 / 0.56);--xt-ring:rgb(245 170 140 / 0.24);--xt-ring-strong:rgb(245 170 140 / 0.38);--xt-hover:rgb(245 170 140 / 0.12);--xt-selected:rgb(245 170 140 / 0.22);--xt-selected-hover:rgb(245 170 140 / 0.30);--xt-field:rgb(245 170 140 / 0.10);--xt-accent:#f4a98f;--xt-accent-hover:#f8bba6;--xt-primary:#f4a98f;--xt-primary-hover:#f8bba6;--xt-bubble:linear-gradient(135deg, #563428, #3c2d25);--xt-bubble-solid:#271d18;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #563428 82%, transparent), color-mix(in srgb, #3c2d25 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23ee9f88%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23938076%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1f1714 45%, transparent);} }
/* 抹茶奶綠・淺色 */
html[data-xt-theme="matcha"] {--xt-g-0:#fdfefc;--xt-g-10:#fcfdfb;--xt-g-20:#f9fbf7;--xt-g-30:#f6f8f4;--xt-g-40:#f3f6f0;--xt-g-50:#eff3eb;--xt-g-60:#ecf0e8;--xt-g-70:#e9eee4;--xt-g-80:#e6ebe1;--xt-g-90:#e3e8de;--xt-g-100:#e0e5db;--xt-g-150:#d1d7cb;--xt-g-200:#c2c8bc;--xt-g-250:#b3b9ad;--xt-g-300:#a4ab9d;--xt-g-350:#959d8d;--xt-g-400:#87917d;--xt-g-450:#79836f;--xt-g-500:#6b7462;--xt-g-550:#5e6656;--xt-g-600:#51574b;--xt-g-650:#44493f;--xt-g-700:#383c34;--xt-g-750:#2c3127;--xt-g-800:#20241c;--xt-g-810:#1e221a;--xt-g-820:#1c1f19;--xt-g-830:#1a1d17;--xt-g-840:#181b15;--xt-g-850:#151812;--xt-g-860:#131511;--xt-g-870:#11130f;--xt-g-880:#0f110d;--xt-g-890:#0d0f0b;--xt-g-900:#0b0c0a;--xt-page:#f5f6ec;--xt-surface-0:#f8f9f1;--xt-surface-1:#f5f6ec;--xt-surface-2:#ebeedd;--xt-surface-3:#fdfdf8;--xt-popover:#fbfcf5;--xt-sidebar:#eef1e2;--xt-text-1:rgb(30 38 26 / 0.95);--xt-text-2:rgb(56 66 50 / 0.80);--xt-text-3:rgb(86 96 78 / 0.68);--xt-ring:rgb(130 160 100 / 0.24);--xt-ring-strong:rgb(130 160 100 / 0.38);--xt-hover:rgb(130 160 100 / 0.12);--xt-selected:rgb(130 160 100 / 0.22);--xt-selected-hover:rgb(130 160 100 / 0.30);--xt-field:rgb(130 160 100 / 0.10);--xt-accent:#62864a;--xt-accent-hover:#53743d;--xt-primary:#62864a;--xt-primary-hover:#53743d;--xt-bubble:linear-gradient(135deg, #dfe9c9, #f2ecd6);--xt-bubble-solid:#ebeedd;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #dfe9c9 82%, transparent), color-mix(in srgb, #f2ecd6 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(130 160 100 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23dba5a0%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23a9b39a%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #f5f6ec 35%, transparent);}
/* 抹茶奶綠・深色 */
html[data-xt-theme="matcha"][data-mode="dark"] {--xt-page:#171a14;--xt-surface-0:#141711;--xt-surface-1:#171a14;--xt-surface-2:#1e2219;--xt-surface-3:#2b3024;--xt-popover:#252a1f;--xt-sidebar:#1b1f17;--xt-text-1:rgb(242 247 234 / 0.94);--xt-text-2:rgb(222 232 208 / 0.74);--xt-text-3:rgb(204 216 188 / 0.56);--xt-ring:rgb(170 200 140 / 0.24);--xt-ring-strong:rgb(170 200 140 / 0.38);--xt-hover:rgb(170 200 140 / 0.12);--xt-selected:rgb(170 200 140 / 0.22);--xt-selected-hover:rgb(170 200 140 / 0.30);--xt-field:rgb(170 200 140 / 0.10);--xt-accent:#b3d08f;--xt-accent-hover:#c4dca5;--xt-primary:#b3d08f;--xt-primary-hover:#c4dca5;--xt-bubble:linear-gradient(135deg, #34442a, #383527);--xt-bubble-solid:#1e2219;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #34442a 82%, transparent), color-mix(in srgb, #383527 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23c99c97%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%237f8a74%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #171a14 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="matcha"][data-mode="system"] {--xt-page:#171a14;--xt-surface-0:#141711;--xt-surface-1:#171a14;--xt-surface-2:#1e2219;--xt-surface-3:#2b3024;--xt-popover:#252a1f;--xt-sidebar:#1b1f17;--xt-text-1:rgb(242 247 234 / 0.94);--xt-text-2:rgb(222 232 208 / 0.74);--xt-text-3:rgb(204 216 188 / 0.56);--xt-ring:rgb(170 200 140 / 0.24);--xt-ring-strong:rgb(170 200 140 / 0.38);--xt-hover:rgb(170 200 140 / 0.12);--xt-selected:rgb(170 200 140 / 0.22);--xt-selected-hover:rgb(170 200 140 / 0.30);--xt-field:rgb(170 200 140 / 0.10);--xt-accent:#b3d08f;--xt-accent-hover:#c4dca5;--xt-primary:#b3d08f;--xt-primary-hover:#c4dca5;--xt-bubble:linear-gradient(135deg, #34442a, #383527);--xt-bubble-solid:#1e2219;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #34442a 82%, transparent), color-mix(in srgb, #383527 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23c99c97%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%237f8a74%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #171a14 45%, transparent);} }
/* 焦糖可可・淺色 */
html[data-xt-theme="cocoa"] {--xt-g-0:#fefdfc;--xt-g-10:#fdfcfb;--xt-g-20:#fbf9f7;--xt-g-30:#f9f6f3;--xt-g-40:#f6f3f0;--xt-g-50:#f3efeb;--xt-g-60:#f1ece7;--xt-g-70:#eee9e4;--xt-g-80:#ebe6e1;--xt-g-90:#e9e3dd;--xt-g-100:#e6e0da;--xt-g-150:#d7d1cb;--xt-g-200:#c8c2bc;--xt-g-250:#b9b3ad;--xt-g-300:#aba49d;--xt-g-350:#9d948d;--xt-g-400:#91867d;--xt-g-450:#83786f;--xt-g-500:#746a62;--xt-g-550:#665d56;--xt-g-600:#57514b;--xt-g-650:#49443f;--xt-g-700:#3c3834;--xt-g-750:#312c27;--xt-g-800:#24201c;--xt-g-810:#221e1a;--xt-g-820:#1f1c19;--xt-g-830:#1d1a17;--xt-g-840:#1b1815;--xt-g-850:#181512;--xt-g-860:#151311;--xt-g-870:#13110f;--xt-g-880:#110f0d;--xt-g-890:#0f0d0b;--xt-g-900:#0c0b0a;--xt-page:#efe4d8;--xt-surface-0:#f3e9df;--xt-surface-1:#efe4d8;--xt-surface-2:#e6d7c7;--xt-surface-3:#f9f2ea;--xt-popover:#f8f0e7;--xt-sidebar:#e9dccd;--xt-text-1:rgb(44 28 18 / 0.96);--xt-text-2:rgb(74 52 38 / 0.84);--xt-text-3:rgb(102 80 64 / 0.74);--xt-ring:rgb(150 100 60 / 0.24);--xt-ring-strong:rgb(150 100 60 / 0.38);--xt-hover:rgb(150 100 60 / 0.12);--xt-selected:rgb(150 100 60 / 0.22);--xt-selected-hover:rgb(150 100 60 / 0.30);--xt-field:rgb(150 100 60 / 0.10);--xt-accent:#a0603a;--xt-accent-hover:#8a5130;--xt-primary:#a0603a;--xt-primary-hover:#8a5130;--xt-bubble:linear-gradient(135deg, #e2c4a6, #e9d6c2);--xt-bubble-solid:#e6d7c7;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #e2c4a6 82%, transparent), color-mix(in srgb, #e9d6c2 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(150 100 60 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23c98a6a%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23a88d77%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #efe4d8 35%, transparent);}
/* 焦糖可可・深色 */
html[data-xt-theme="cocoa"][data-mode="dark"] {--xt-page:#1c1410;--xt-surface-0:#18110d;--xt-surface-1:#1c1410;--xt-surface-2:#261b15;--xt-surface-3:#36271e;--xt-popover:#2d2119;--xt-sidebar:#211813;--xt-text-1:rgb(250 238 224 / 0.94);--xt-text-2:rgb(238 218 196 / 0.76);--xt-text-3:rgb(222 200 176 / 0.58);--xt-ring:rgb(220 160 110 / 0.24);--xt-ring-strong:rgb(220 160 110 / 0.38);--xt-hover:rgb(220 160 110 / 0.12);--xt-selected:rgb(220 160 110 / 0.22);--xt-selected-hover:rgb(220 160 110 / 0.30);--xt-field:rgb(220 160 110 / 0.10);--xt-accent:#dca274;--xt-accent-hover:#e6b48a;--xt-primary:#dca274;--xt-primary-hover:#e6b48a;--xt-bubble:linear-gradient(135deg, #4e3424, #3a2a1f);--xt-bubble-solid:#261b15;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4e3424 82%, transparent), color-mix(in srgb, #3a2a1f 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23d4936f%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238c7766%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1c1410 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="cocoa"][data-mode="system"] {--xt-page:#1c1410;--xt-surface-0:#18110d;--xt-surface-1:#1c1410;--xt-surface-2:#261b15;--xt-surface-3:#36271e;--xt-popover:#2d2119;--xt-sidebar:#211813;--xt-text-1:rgb(250 238 224 / 0.94);--xt-text-2:rgb(238 218 196 / 0.76);--xt-text-3:rgb(222 200 176 / 0.58);--xt-ring:rgb(220 160 110 / 0.24);--xt-ring-strong:rgb(220 160 110 / 0.38);--xt-hover:rgb(220 160 110 / 0.12);--xt-selected:rgb(220 160 110 / 0.22);--xt-selected-hover:rgb(220 160 110 / 0.30);--xt-field:rgb(220 160 110 / 0.10);--xt-accent:#dca274;--xt-accent-hover:#e6b48a;--xt-primary:#dca274;--xt-primary-hover:#e6b48a;--xt-bubble:linear-gradient(135deg, #4e3424, #3a2a1f);--xt-bubble-solid:#261b15;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #4e3424 82%, transparent), color-mix(in srgb, #3a2a1f 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23d4936f%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238c7766%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #1c1410 45%, transparent);} }
/* 夜空星藍・淺色 */
html[data-xt-theme="starry"] {--xt-g-0:#fcfdfe;--xt-g-10:#fbfcfd;--xt-g-20:#f7f8fb;--xt-g-30:#f3f5f9;--xt-g-40:#eff2f7;--xt-g-50:#eaedf4;--xt-g-60:#e7eaf1;--xt-g-70:#e3e7ef;--xt-g-80:#e0e4ec;--xt-g-90:#dde0e9;--xt-g-100:#d9dde7;--xt-g-150:#caced8;--xt-g-200:#bcbfc8;--xt-g-250:#adb1b9;--xt-g-300:#9da1ab;--xt-g-350:#8d929d;--xt-g-400:#7d8391;--xt-g-450:#6f7583;--xt-g-500:#626874;--xt-g-550:#565b66;--xt-g-600:#4b4e57;--xt-g-650:#3f4249;--xt-g-700:#34363c;--xt-g-750:#272a31;--xt-g-800:#1c1e24;--xt-g-810:#1a1d22;--xt-g-820:#191b1f;--xt-g-830:#17191d;--xt-g-840:#15171b;--xt-g-850:#121418;--xt-g-860:#111215;--xt-g-870:#0f1013;--xt-g-880:#0d0e11;--xt-g-890:#0b0c0f;--xt-g-900:#0a0a0c;--xt-page:#eef1f8;--xt-surface-0:#f2f4fa;--xt-surface-1:#eef1f8;--xt-surface-2:#e3e8f3;--xt-surface-3:#fafbfe;--xt-popover:#f8f9fd;--xt-sidebar:#e7ebf5;--xt-text-1:rgb(20 28 50 / 0.95);--xt-text-2:rgb(44 54 80 / 0.80);--xt-text-3:rgb(74 84 110 / 0.68);--xt-ring:rgb(90 115 180 / 0.24);--xt-ring-strong:rgb(90 115 180 / 0.38);--xt-hover:rgb(90 115 180 / 0.12);--xt-selected:rgb(90 115 180 / 0.22);--xt-selected-hover:rgb(90 115 180 / 0.30);--xt-field:rgb(90 115 180 / 0.10);--xt-accent:#4a64a8;--xt-accent-hover:#3d5494;--xt-primary:#4a64a8;--xt-primary-hover:#3d5494;--xt-bubble:linear-gradient(135deg, #d7def3, #e6e3f2);--xt-bubble-solid:#e3e8f3;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #d7def3 82%, transparent), color-mix(in srgb, #e6e3f2 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(90 115 180 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%239fb0dc%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%238e9ab8%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #eef1f8 35%, transparent);}
/* 夜空星藍・深色 */
html[data-xt-theme="starry"][data-mode="dark"] {--xt-page:#0f1424;--xt-surface-0:#0c1120;--xt-surface-1:#0f1424;--xt-surface-2:#161c30;--xt-surface-3:#212a42;--xt-popover:#1b2338;--xt-sidebar:#121829;--xt-text-1:rgb(236 240 250 / 0.95);--xt-text-2:rgb(206 214 232 / 0.78);--xt-text-3:rgb(178 188 212 / 0.60);--xt-ring:rgb(150 170 230 / 0.24);--xt-ring-strong:rgb(150 170 230 / 0.38);--xt-hover:rgb(150 170 230 / 0.12);--xt-selected:rgb(150 170 230 / 0.22);--xt-selected-hover:rgb(150 170 230 / 0.30);--xt-field:rgb(150 170 230 / 0.10);--xt-accent:#a9bcf0;--xt-accent-hover:#c0cff5;--xt-primary:#a9bcf0;--xt-primary-hover:#c0cff5;--xt-bubble:linear-gradient(135deg, #2a3560, #232b45);--xt-bubble-solid:#161c30;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #2a3560 82%, transparent), color-mix(in srgb, #232b45 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23c8d2f0%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%235f6b8c%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #0f1424 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="starry"][data-mode="system"] {--xt-page:#0f1424;--xt-surface-0:#0c1120;--xt-surface-1:#0f1424;--xt-surface-2:#161c30;--xt-surface-3:#212a42;--xt-popover:#1b2338;--xt-sidebar:#121829;--xt-text-1:rgb(236 240 250 / 0.95);--xt-text-2:rgb(206 214 232 / 0.78);--xt-text-3:rgb(178 188 212 / 0.60);--xt-ring:rgb(150 170 230 / 0.24);--xt-ring-strong:rgb(150 170 230 / 0.38);--xt-hover:rgb(150 170 230 / 0.12);--xt-selected:rgb(150 170 230 / 0.22);--xt-selected-hover:rgb(150 170 230 / 0.30);--xt-field:rgb(150 170 230 / 0.10);--xt-accent:#a9bcf0;--xt-accent-hover:#c0cff5;--xt-primary:#a9bcf0;--xt-primary-hover:#c0cff5;--xt-bubble:linear-gradient(135deg, #2a3560, #232b45);--xt-bubble-solid:#161c30;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #2a3560 82%, transparent), color-mix(in srgb, #232b45 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23c8d2f0%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%235f6b8c%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #0f1424 45%, transparent);} }
/* 雪兔白・淺色 */
html[data-xt-theme="snow"] {--xt-g-0:#fdfdfd;--xt-g-10:#fcfcfc;--xt-g-20:#faf8f8;--xt-g-30:#f7f5f5;--xt-g-40:#f4f2f2;--xt-g-50:#f1eded;--xt-g-60:#eeeaea;--xt-g-70:#ebe7e7;--xt-g-80:#e9e3e3;--xt-g-90:#e6e0e0;--xt-g-100:#e3dddd;--xt-g-150:#d5cdcd;--xt-g-200:#c7bdbd;--xt-g-250:#b9adad;--xt-g-300:#ab9d9d;--xt-g-350:#9d8d8d;--xt-g-400:#917d7d;--xt-g-450:#836f6f;--xt-g-500:#746262;--xt-g-550:#665656;--xt-g-600:#574b4b;--xt-g-650:#493f3f;--xt-g-700:#3c3434;--xt-g-750:#312727;--xt-g-800:#241c1c;--xt-g-810:#221a1a;--xt-g-820:#1f1919;--xt-g-830:#1d1717;--xt-g-840:#1b1515;--xt-g-850:#181212;--xt-g-860:#151111;--xt-g-870:#130f0f;--xt-g-880:#110d0d;--xt-g-890:#0f0b0b;--xt-g-900:#0c0a0a;--xt-page:#fafafa;--xt-surface-0:#fcfcfc;--xt-surface-1:#fafafa;--xt-surface-2:#f2f1f0;--xt-surface-3:#ffffff;--xt-popover:#ffffff;--xt-sidebar:#f4f3f2;--xt-text-1:rgb(30 30 32 / 0.95);--xt-text-2:rgb(60 60 64 / 0.80);--xt-text-3:rgb(92 92 96 / 0.68);--xt-ring:rgb(140 135 135 / 0.24);--xt-ring-strong:rgb(140 135 135 / 0.38);--xt-hover:rgb(140 135 135 / 0.12);--xt-selected:rgb(140 135 135 / 0.22);--xt-selected-hover:rgb(140 135 135 / 0.30);--xt-field:rgb(140 135 135 / 0.10);--xt-accent:#a96f7c;--xt-accent-hover:#95606c;--xt-primary:#a96f7c;--xt-primary-hover:#95606c;--xt-bubble:linear-gradient(135deg, #f1e9ea, #efefef);--xt-bubble-solid:#f2f1f0;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #f1e9ea 82%, transparent), color-mix(in srgb, #efefef 78%, transparent));--xt-bubble-shadow:0 2px 10px rgb(140 135 135 / 0.16);--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23e6c3c9%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%23c4c0bd%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #fafafa 40%, transparent);}
/* 雪兔白・深色 */
html[data-xt-theme="snow"][data-mode="dark"] {--xt-page:#18181a;--xt-surface-0:#151517;--xt-surface-1:#18181a;--xt-surface-2:#202022;--xt-surface-3:#2c2c2f;--xt-popover:#262628;--xt-sidebar:#1d1d1f;--xt-text-1:rgb(246 246 246 / 0.94);--xt-text-2:rgb(226 226 228 / 0.74);--xt-text-3:rgb(206 206 210 / 0.56);--xt-ring:rgb(200 196 196 / 0.24);--xt-ring-strong:rgb(200 196 196 / 0.38);--xt-hover:rgb(200 196 196 / 0.12);--xt-selected:rgb(200 196 196 / 0.22);--xt-selected-hover:rgb(200 196 196 / 0.30);--xt-field:rgb(200 196 196 / 0.10);--xt-accent:#e6c3c9;--xt-accent-hover:#efd3d8;--xt-primary:#e6c3c9;--xt-primary-hover:#efd3d8;--xt-bubble:linear-gradient(135deg, #3a3234, #2c2c2f);--xt-bubble-solid:#202022;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #3a3234 82%, transparent), color-mix(in srgb, #2c2c2f 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23d9b5bb%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%237d7a78%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #18181a 45%, transparent);}
@media (prefers-color-scheme: dark) { html[data-xt-theme="snow"][data-mode="system"] {--xt-page:#18181a;--xt-surface-0:#151517;--xt-surface-1:#18181a;--xt-surface-2:#202022;--xt-surface-3:#2c2c2f;--xt-popover:#262628;--xt-sidebar:#1d1d1f;--xt-text-1:rgb(246 246 246 / 0.94);--xt-text-2:rgb(226 226 228 / 0.74);--xt-text-3:rgb(206 206 210 / 0.56);--xt-ring:rgb(200 196 196 / 0.24);--xt-ring-strong:rgb(200 196 196 / 0.38);--xt-hover:rgb(200 196 196 / 0.12);--xt-selected:rgb(200 196 196 / 0.22);--xt-selected-hover:rgb(200 196 196 / 0.30);--xt-field:rgb(200 196 196 / 0.10);--xt-accent:#e6c3c9;--xt-accent-hover:#efd3d8;--xt-primary:#e6c3c9;--xt-primary-hover:#efd3d8;--xt-bubble:linear-gradient(135deg, #3a3234, #2c2c2f);--xt-bubble-solid:#202022;--xt-bubble-glass:linear-gradient(135deg, color-mix(in srgb, #3a3234 82%, transparent), color-mix(in srgb, #2c2c2f 78%, transparent));--xt-bubble-shadow:none;--xt-pattern:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22%23d9b5bb%22%20fill-opacity%3D%220.32%22%3E%3Cpath%20d%3D%22M30%2034c-3-5-11-3-10%203%201%204%2010%209%2010%209s9-5%2010-9c1-6-7-8-10-3z%22/%3E%3Cpath%20d%3D%22M118%20112c-2-4-8-2-7%202%200%203%207%206%207%206s7-3%207-6c1-4-5-6-7-2z%22/%3E%3C/g%3E%3Cg%20fill%3D%22%237d7a78%22%20fill-opacity%3D%220.32%22%3E%3Cellipse%20cx%3D%22112%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Cellipse%20cx%3D%22121%22%20cy%3D%2220%22%20rx%3D%223.2%22%20ry%3D%229%22/%3E%3Ccircle%20cx%3D%22116.5%22%20cy%3D%2233%22%20r%3D%229%22/%3E%3Cellipse%20cx%3D%2235.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%28-12%2035.5%20116.5%29%22/%3E%3Cellipse%20cx%3D%2252.5%22%20cy%3D%22116.5%22%20rx%3D%228%22%20ry%3D%223%22%20transform%3D%22rotate%2812%2052.5%20116.5%29%22/%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%22124%22%20r%3D%229%22/%3E%3C/g%3E%3C/svg%3E");--xt-pattern-fade:color-mix(in srgb, #18181a 45%, transparent);} }

/* ======================== 新版介面 ======================== */
${SCOPES} {
  --cds-gray-0: var(--xt-g-0) !important;--cds-gray-10: var(--xt-g-10) !important;--cds-gray-20: var(--xt-g-20) !important;--cds-gray-30: var(--xt-g-30) !important;--cds-gray-40: var(--xt-g-40) !important;--cds-gray-50: var(--xt-g-50) !important;--cds-gray-60: var(--xt-g-60) !important;--cds-gray-70: var(--xt-g-70) !important;--cds-gray-80: var(--xt-g-80) !important;--cds-gray-90: var(--xt-g-90) !important;--cds-gray-100: var(--xt-g-100) !important;--cds-gray-150: var(--xt-g-150) !important;--cds-gray-200: var(--xt-g-200) !important;--cds-gray-250: var(--xt-g-250) !important;--cds-gray-300: var(--xt-g-300) !important;--cds-gray-350: var(--xt-g-350) !important;--cds-gray-400: var(--xt-g-400) !important;--cds-gray-450: var(--xt-g-450) !important;--cds-gray-500: var(--xt-g-500) !important;--cds-gray-550: var(--xt-g-550) !important;--cds-gray-600: var(--xt-g-600) !important;--cds-gray-650: var(--xt-g-650) !important;--cds-gray-700: var(--xt-g-700) !important;--cds-gray-750: var(--xt-g-750) !important;--cds-gray-800: var(--xt-g-800) !important;--cds-gray-810: var(--xt-g-810) !important;--cds-gray-820: var(--xt-g-820) !important;--cds-gray-830: var(--xt-g-830) !important;--cds-gray-840: var(--xt-g-840) !important;--cds-gray-850: var(--xt-g-850) !important;--cds-gray-860: var(--xt-g-860) !important;--cds-gray-870: var(--xt-g-870) !important;--cds-gray-880: var(--xt-g-880) !important;--cds-gray-890: var(--xt-g-890) !important;--cds-gray-900: var(--xt-g-900) !important;
  --cds-clay: var(--xt-accent) !important;

  --cds-page-bg: var(--xt-page) !important;
  --background-color-page: var(--xt-page) !important;
  --cds-surface-0: var(--xt-surface-0) !important;
  --cds-surface-1: var(--xt-surface-1) !important;
  --cds-surface-2: var(--xt-surface-2) !important;
  --cds-surface-3: var(--xt-surface-3) !important;
  --cds-surface-panel: var(--xt-surface-2) !important;
  --cds-surface-popover: var(--xt-popover) !important;

  --cds-text-primary: var(--xt-text-1) !important;
  --cds-text-secondary: var(--xt-text-2) !important;
  --cds-text-muted: var(--xt-text-3) !important;
  --muted-as-secondary: var(--xt-text-2) !important;

  --cds-ring-color: var(--xt-ring) !important;
  --cds-fill-field-ring: var(--xt-ring) !important;
  --cds-fizzy-lake-color-composer-ring: var(--xt-ring-strong) !important;

  --cds-fill-ghost-hover: var(--xt-hover) !important;
  --cds-fill-ghost-selected: var(--xt-selected) !important;
  --cds-fill-button-ghost-hover: var(--xt-hover) !important;
  --cds-bg-neutral-hover: var(--xt-hover) !important;
  --cds-fill-secondary: var(--xt-field) !important;
  --cds-fill-secondary-hover: var(--xt-hover) !important;
  --cds-fizzy-lake-color-selected-hover: var(--xt-selected-hover) !important;
  --cds-fizzy-lake-color-card-hover: var(--xt-hover) !important;

  --cds-fill-accent: var(--xt-accent) !important;
  --cds-fill-accent-hover: var(--xt-accent-hover) !important;
  --cds-role-accent-fill: var(--xt-accent) !important;
  --cds-role-accent-fill-hover: var(--xt-accent-hover) !important;
  --cds-fill-primary: var(--xt-primary) !important;
  --cds-fill-primary-hover: var(--xt-primary-hover) !important;
  --cds-bg-user-message: var(--xt-bubble-solid) !important;

  --cds-fizzy-lake-color-sidebar: var(--xt-sidebar) !important;
  --df-sidebar-bg: var(--xt-sidebar) !important;
  --df-sidebar-tint: var(--xt-sidebar) !important;
}

.dframe-sidebar, .dframe-sidebar-body { --df-web-sidebar-bg: var(--xt-sidebar) !important; }

/* 底紋：鋪在頁面最底和對話區的底 */
.tiles-shell, [data-sim-native-ground], [data-xt-ground], html, body {
  background-color: var(--xt-page) !important;
  background-image: linear-gradient(var(--xt-pattern-fade), var(--xt-pattern-fade)), var(--xt-pattern) !important;
  background-size: auto, 160px 160px !important;
}

/* 我的訊息泡泡 */
[data-cds="UserMessage"] [class*="message-bubble-radius"] {
  background: var(--xt-bubble) !important;
  border-radius: 20px 20px 6px 20px !important;
  box-shadow: var(--xt-bubble-shadow) !important;
}

/* 輸入框 */
[data-cds="ChatComposer"] .rounded-composer {
  border-radius: 24px !important;
  box-shadow: 0 4px 18px var(--xt-hover), 0 0 0 1px var(--xt-ring-strong) !important;
}

/* ======================== 背景圖模式 ======================== */
html[data-xt-veil="light"]  { --xt-veil-pct: 38%; --xt-blur: 0px; }
html[data-xt-veil="mid"]    { --xt-veil-pct: 56%; --xt-blur: 2px; }
html[data-xt-veil="strong"] { --xt-veil-pct: 72%; --xt-blur: 5px; }
html[data-xt-bg="image"] { background: var(--xt-page) !important; }
/* 圖鋪在最底下一層，上面再蓋一層跟主題同色的霧 */
html[data-xt-bg="image"]::before, html[data-xt-bg="image"]::after {
  content: ""; position: fixed; z-index: -1; pointer-events: none;
}
html[data-xt-bg="image"]::before {
  inset: -24px;
  background-image: var(--xt-bg-img, none); background-size: cover; background-repeat: no-repeat;
  background-position: var(--xt-bg-pos, center);
  filter: blur(var(--xt-blur));
}
html[data-xt-bg="image"]::after {
  inset: 0;
  background: color-mix(in srgb, var(--xt-page) var(--xt-veil-pct), transparent);
}
/* 原本鋪底紋的那幾層改成透明，讓圖透出來 */
html[data-xt-bg="image"] :is(.tiles-shell, [data-sim-native-ground], [data-xt-ground], body) {
  background: transparent !important;
}
html[data-xt-bg="image"] .dframe-sidebar, html[data-xt-bg="image"] .dframe-sidebar-body {
  --df-web-sidebar-bg: color-mix(in srgb, var(--xt-sidebar) 80%, transparent) !important;
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}
html[data-xt-bg="image"] [data-cds="UserMessage"] [class*="message-bubble-radius"] {
  background: var(--xt-bubble-glass) !important;
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
}
html[data-xt-bg="image"] [data-cds="ChatComposer"] .rounded-composer {
  background: color-mix(in srgb, var(--xt-surface-3) 84%, transparent) !important;
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
}

/* ======================== 字體：粉圓 ======================== */
html[data-xt-font="huninn"] body,
html[data-xt-font="huninn"] body :where(p, li, h1, h2, h3, h4, h5, h6, span, div, a, button, input, textarea, label, blockquote, td, th, [contenteditable]):not([class*="icon" i]):not([data-icon]) {
  font-family: ${FONT} !important;
}
html[data-xt-font="huninn"] :where(pre, code, kbd, samp, .font-mono, [class*="font-mono"]),
html[data-xt-font="huninn"] :where(pre, code, kbd, samp, .font-mono, [class*="font-mono"]) * {
  font-family: ui-monospace, "SF Mono", Menlo, monospace !important;
}

/* ======================== 舊版聊天介面（以防萬一） ======================== */
.bg-bg-300:has([data-testid="user-message"]) {
  background: var(--xt-bubble) !important;
  border-radius: 20px 20px 6px 20px !important;
}

::selection { background: var(--xt-selected-hover); }
[contenteditable="true"], textarea { caret-color: var(--xt-accent); }

/* ======================== 切換按鈕 ======================== */
#xt-skin-tab {
  position: fixed; right: 0; top: 34%; z-index: 2147483646;
  width: 30px; height: 38px; border-radius: 19px 0 0 19px;
  background: var(--xt-surface-3); color: var(--xt-accent);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.12), 0 0 0 1px var(--xt-ring);
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; opacity: 0.8; cursor: pointer; user-select: none; -webkit-user-select: none;
}
#xt-skin-panel {
  position: fixed; right: 38px; top: 50%; transform: translateY(-50%); z-index: 2147483647;
  width: 266px; max-width: calc(100vw - 52px); max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px);
  overflow-y: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box;
  padding: 12px; border-radius: 18px;
  background: var(--xt-popover); color: var(--xt-text-1);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.18), 0 0 0 1px var(--xt-ring);
  font: 14px/1.4 ${FONT};
}
#xt-skin-panel[hidden] { display: none; }
#xt-skin-panel .xt-title { font-size: 12px; color: var(--xt-text-3); margin: 2px 2px 6px; }
#xt-skin-panel .xt-title b { font-weight: normal; color: var(--xt-text-1); }
#xt-skin-panel .xt-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 12px; }
#xt-skin-panel .xt-row.two { grid-template-columns: 1fr 1fr; }
#xt-skin-panel button {
  all: unset; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  min-height: 34px; padding: 6px 8px; border-radius: 12px; background: var(--xt-field); color: var(--xt-text-1);
  font: 13px/1.2 ${FONT}; cursor: pointer; text-align: center; -webkit-tap-highlight-color: transparent;
}
#xt-skin-panel button[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--xt-accent); }
/* 顏色：五個一排的色塊 */
#xt-skin-panel .xt-swatches { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px 6px; margin-bottom: 12px; }
#xt-skin-panel .xt-swatches button { flex-direction: column; gap: 4px; padding: 0; background: none; min-height: 0; font-size: 10px; white-space: nowrap; letter-spacing: -0.02em; color: var(--xt-text-2); }
#xt-skin-panel .xt-chip {
  width: 38px; height: 38px; border-radius: 12px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.10);
}
#xt-skin-panel .xt-swatches button[aria-pressed="true"] { box-shadow: none; color: var(--xt-text-1); }
#xt-skin-panel .xt-swatches button[aria-pressed="true"] .xt-chip { box-shadow: 0 0 0 2px var(--xt-popover), 0 0 0 4px var(--xt-accent); }
/* 背景圖縮圖 */
#xt-skin-panel .xt-thumbs { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
#xt-skin-panel .xt-thumbs button { flex-direction: column; gap: 3px; padding: 0; background: none; min-height: 0; font-size: 10.5px; color: var(--xt-text-2); }
#xt-skin-panel .xt-thumb {
  width: 100%; aspect-ratio: 2 / 3; border-radius: 10px; background: var(--xt-field) center / cover no-repeat;
  display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.08);
}
#xt-skin-panel .xt-thumbs button[aria-pressed="true"] { box-shadow: none; color: var(--xt-text-1); }
#xt-skin-panel .xt-thumbs button[aria-pressed="true"] .xt-thumb { box-shadow: 0 0 0 2px var(--xt-popover), 0 0 0 4px var(--xt-accent); }
#xt-skin-panel .xt-img-only { display: none; }
html[data-xt-bg="image"] #xt-skin-panel .xt-img-only { display: block; }
#xt-skin-panel .xt-note { font-size: 11px; color: var(--xt-text-3); margin: -6px 2px 10px; min-height: 0; }
#xt-skin-panel .xt-note:empty { display: none; }
`;

  // ---------------------------------------------------------------
  // 套用樣式
  // ---------------------------------------------------------------
  const gmAddStyle = (typeof GM !== 'undefined' && GM.addStyle) ? GM.addStyle
                   : (typeof GM_addStyle === 'function') ? GM_addStyle : null;

  function addStyleFallback(text, id) {
    const el = document.createElement('style');
    el.id = id;
    el.textContent = text;
    const put = () => { if (!document.getElementById(id)) (document.head || document.documentElement).appendChild(el); };
    put();
    new MutationObserver(put).observe(document.documentElement, { childList: true, subtree: true });
  }
  function addStyle(text, id) {
    if (gmAddStyle) return Promise.resolve(gmAddStyle(text)).catch(() => addStyleFallback(text, id));
    addStyleFallback(text, id);
    return Promise.resolve();
  }
  addStyle(css, 'xiaotang-skin');

  // ---------------------------------------------------------------
  // 字體：先用一般方式載入 Google Fonts 的粉圓，被網站擋掉的話改成自己下載
  // ---------------------------------------------------------------
  const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Huninn&display=swap';
  // Safari 的 Userscripts 有 GM.xmlHttpRequest，Chrome 的 Tampermonkey 兩種都有
  const gmXhr = (typeof GM !== 'undefined' && GM.xmlHttpRequest) ? GM.xmlHttpRequest
              : (typeof GM_xmlhttpRequest === 'function') ? GM_xmlhttpRequest : null;
  let fontStarted = false;

  // 用回呼的寫法，每個擴充功能都支援
  function gmGet(url, type) {
    return new Promise((resolve, reject) => {
      let done = false;
      const ok = r => {
        if (done) return; done = true;
        if (!r || (r.status && r.status >= 400)) return reject(new Error('HTTP ' + (r && r.status)));
        resolve(type === 'text' ? (r.responseText || r.response) : r.response);
      };
      const fail = () => { if (!done) { done = true; reject(new Error('network')); } };
      try {
        const p = gmXhr({ url, method: 'GET', responseType: type, timeout: 30000, onload: ok, onerror: fail, ontimeout: fail });
        if (p && typeof p.then === 'function') p.then(ok, fail);
      } catch (e) { fail(); }
    });
  }

  async function startFont() {
    if (fontStarted || state.font !== 'huninn') return;
    fontStarted = true;
    let fontCss = null;
    if (gmXhr) {
      try { fontCss = await gmGet(FONT_CSS, 'text'); } catch (e) { fontCss = null; }
    }
    if (fontCss) await addStyle(fontCss, 'xiaotang-font');
    else await addStyle(`@import url("${FONT_CSS}");`, 'xiaotang-font');

    // 等幾秒看字體有沒有被擋（還在下載就再等一下，最多等三輪）
    let tries = 0;
    const wait = () => {
      const faces = huninnFaces();
      if (faces.some(f => f.status === 'loaded')) return;
      if (faces.some(f => f.status === 'loading') && ++tries < 3) { setTimeout(wait, 4000); return; }
      checkFont(fontCss);
    };
    setTimeout(wait, 4000);
  }

  function huninnFaces() {
    const out = [];
    try { document.fonts.forEach(f => { if (/Huninn/.test(f.family)) out.push(f); }); } catch (e) { /* 舊瀏覽器 */ }
    return out;
  }

  async function checkFont(fontCss) {
    if (!fontCss || !gmXhr) return;
    // 走到這裡代表網站擋掉了字體檔：自己下載，再交給瀏覽器
    const blocks = [...fontCss.matchAll(/@font-face\s*{([^}]*)}/g)].map(m => m[1]);
    const jobs = blocks.map(b => ({
      url: (b.match(/url\(([^)]+)\)/) || [])[1],
      range: ((b.match(/unicode-range:\s*([^;]+);/) || [])[1] || '').trim(),
    })).filter(j => j.url);
    const queue = jobs.slice();
    const worker = async () => {
      while (queue.length) {
        const j = queue.shift();
        try {
          const buf = await gmGet(j.url.replace(/["']/g, ''), 'arraybuffer');
          const face = new FontFace('XT Huninn', buf, j.range ? { unicodeRange: j.range, display: 'swap' } : { display: 'swap' });
          document.fonts.add(await face.load());
        } catch (e) { /* 單一片段失敗就跳過 */ }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  }

  // ---------------------------------------------------------------
  // 圖示字型：把網站載入的所有字體名稱接在粉圓後面
  // ---------------------------------------------------------------
  let lastFallback = '';
  function updateFallback() {
    const fams = new Set();
    const walk = list => {
      for (const r of list) {
        if (r.constructor && r.constructor.name === 'CSSFontFaceRule' || r.type === 5) {
          const f = (r.style.getPropertyValue('font-family') || '').trim().replace(/^["']|["']$/g, '');
          if (f) fams.add(f);
        }
        if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch (e) { /* 跨網域讀不到 */ }
    }
    try { document.fonts.forEach(f => fams.add(String(f.family).replace(/^["']|["']$/g, ''))); } catch (e) { /* 沒有 FontFaceSet */ }
    const list = [...fams].filter(f => !/Huninn/i.test(f));
    list.sort((a, b) => (/icon/i.test(b) ? 1 : 0) - (/icon/i.test(a) ? 1 : 0));   // 名字有 icon 的排前面
    const value = list.map(f => '"' + f.replace(/"/g, '') + '",').join(' ');
    if (!value || value === lastFallback) return;
    lastFallback = value;
    addStyle(`:root { --xt-fallback: ${value} }`, 'xiaotang-fallback-' + Date.now());
  }

  // ---------------------------------------------------------------
  // 底紋：找出蓋在對話後面的那層不透明底，把兔兔鋪上去
  // ---------------------------------------------------------------
  function alphaOf(color) {
    if (!color || color === 'transparent') return 0;
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(','); return p.length > 3 ? parseFloat(p[3]) : 1; }
    const s = color.match(/\/\s*([\d.]+)\s*\)$/);
    return s ? parseFloat(s[1]) : 1;
  }
  function markGrounds() {
    const minW = innerWidth * 0.6;
    document.querySelectorAll('[role="feed"], [data-cds="ChatComposer"]').forEach(start => {
      for (let el = start.parentElement; el && el !== document.body && el !== html; el = el.parentElement) {
        if (el.hasAttribute('data-xt-ground')) continue;
        if (el.getBoundingClientRect().width < minW) continue;
        if (alphaOf(getComputedStyle(el).backgroundColor) >= 0.5) el.setAttribute('data-xt-ground', '');
      }
    });
  }
  let groundTimer = null;
  const scheduleGrounds = () => { clearTimeout(groundTimer); groundTimer = setTimeout(markGrounds, 400); };

  // ---------------------------------------------------------------
  // 背景圖：用 GM.xmlHttpRequest 下載後轉成 data: 網址（網站的安全規則會擋外部圖片）
  // ---------------------------------------------------------------
  const portrait = matchMedia('(orientation: portrait)');
  let bgToken = 0;
  let note = () => {};

  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch (e) { return []; } }
  function writeCache(url, data) {
    // 只留最近兩張（通常是同一張的直式和橫式），手機空間有限
    let list = readCache().filter(c => c.url !== url);
    list.unshift({ url, data });
    list = list.slice(0, 2);
    for (; list.length; list.pop()) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); return; } catch (e) { /* 太大就少存一張 */ }
    }
  }
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }
  async function fetchImage(url) {
    const hit = readCache().find(c => c.url === url);
    if (hit) return hit.data;
    if (!gmXhr) return url;   // 沒有下載權限就直接給網址，碰碰運氣
    const res = await gmGet(url, 'blob');
    const blob = res instanceof Blob ? res : new Blob([res], { type: 'image/jpeg' });
    const data = await blobToDataUrl(blob);
    writeCache(url, data);
    return data;
  }
  function readPhoto() { try { return localStorage.getItem(PHOTO_KEY); } catch (e) { return null; } }

  async function applyBg() {
    const token = ++bgToken;
    if (state.bg !== 'image') { html.style.removeProperty('--xt-bg-img'); return; }
    let src, pos;
    if (state.img === 'photo') {
      src = readPhoto(); pos = 'center';
      if (!src) { note('還沒選照片，點「我的照片」挑一張。'); return; }
    } else {
      const bg = BGS.find(b => b.id === state.img) || BGS[0];
      const vertical = portrait.matches;
      pos = vertical ? bg.posP : bg.posL;
      note('圖片下載中⋯');
      try { src = await fetchImage(vertical ? bg.p : bg.l); }
      catch (e) { if (token === bgToken) note('圖片下載失敗，等一下再點一次。'); return; }
    }
    if (token !== bgToken) return;
    html.style.setProperty('--xt-bg-img', 'url("' + src + '")');
    html.style.setProperty('--xt-bg-pos', pos);
    note('');
  }
  portrait.addEventListener ? portrait.addEventListener('change', applyBg) : portrait.addListener(applyBg);

  // 自己的照片：縮小成 JPEG 存在這台裝置
  function pickPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      note('照片處理中⋯');
      try {
        const dataUrl = await blobToDataUrl(file);
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = dataUrl; });
        let saved = false;
        for (const [max, q] of [[1800, 0.82], [1400, 0.75], [1000, 0.7]]) {
          const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * k);
          c.height = Math.round(img.naturalHeight * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          try { localStorage.setItem(PHOTO_KEY, c.toDataURL('image/jpeg', q)); saved = true; break; } catch (e) { /* 太大，縮小再試 */ }
        }
        if (!saved) { note('照片太大存不下，換一張試試。'); return; }
        state.bg = 'image'; state.img = 'photo';
        save(state); applyAttrs(); refreshUI(); applyBg();
      } catch (e) { note('這張照片讀不出來，換一張試試。'); }
    });
    document.body.appendChild(input);
    input.click();
  }

  // ---------------------------------------------------------------
  // 切換按鈕（全部用 createElement 組，Chrome 的 Tampermonkey 也不會被擋）
  // ---------------------------------------------------------------
  function h(tag, props, kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'bg') el.style.background = v;
      else if (k === 'bgImage') el.style.backgroundImage = v;
      else el.setAttribute(k, v);
    }
    for (const kid of kids || []) el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    return el;
  }
  let refreshUI = () => {};

  function buildUI() {
    if (!document.body || document.getElementById('xt-skin-tab')) return;
    const tab = h('div', { id: 'xt-skin-tab', role: 'button', 'aria-label': '切換主題', text: '🐰' });

    const themeName = h('b');
    const noteEl = h('div', { class: 'xt-note' });
    note = msg => { noteEl.textContent = msg; };

    const swatches = THEMES.map(([id, name, light, accent, dark]) =>
      h('button', { 'data-theme': id, title: name }, [
        h('span', { class: 'xt-chip', bg: `linear-gradient(135deg, ${light} 0 52%, ${accent} 52% 74%, ${dark} 74%)` }),
        name,
      ]));
    const thumbs = BGS.map(b =>
      h('button', { 'data-img': b.id }, [h('span', { class: 'xt-thumb', bgImage: `url("${b.thumb}")` }), b.name]));
    const photoThumb = h('span', { class: 'xt-thumb', text: '📷' });
    thumbs.push(h('button', { 'data-img': 'photo' }, [photoThumb, '我的照片']));

    const panel = h('div', { id: 'xt-skin-panel' }, [
      h('div', { class: 'xt-title' }, ['顏色・', themeName]),
      h('div', { class: 'xt-swatches' }, swatches),
      h('div', { class: 'xt-title', text: '背景' }),
      h('div', { class: 'xt-row two' }, [
        h('button', { 'data-bg': 'pattern', text: '兔兔底紋' }),
        h('button', { 'data-bg': 'image', text: '背景圖' }),
      ]),
      h('div', { class: 'xt-img-only' }, [
        h('div', { class: 'xt-thumbs' }, thumbs),
        h('div', { class: 'xt-title', text: '霧面' }),
        h('div', { class: 'xt-row' }, [
          h('button', { 'data-veil': 'light', text: '淡' }),
          h('button', { 'data-veil': 'mid', text: '中' }),
          h('button', { 'data-veil': 'strong', text: '濃' }),
        ]),
      ]),
      noteEl,
      h('div', { class: 'xt-title', text: '字體' }),
      h('div', { class: 'xt-row two' }, [
        h('button', { 'data-font': 'huninn', text: '粉圓' }),
        h('button', { 'data-font': 'default', text: '原本的' }),
      ]),
    ]);
    panel.hidden = true;

    refreshUI = () => {
      const press = (attr, val) => panel.querySelectorAll(`[${attr}]`).forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val)));
      press('data-theme', state.theme);
      press('data-bg', state.bg);
      press('data-img', state.img);
      press('data-veil', state.veil);
      press('data-font', state.font);
      themeName.textContent = (THEMES.find(t => t[0] === state.theme) || THEMES[0])[1];
      const photo = readPhoto();
      photoThumb.style.backgroundImage = photo ? `url("${photo}")` : '';
      photoThumb.textContent = photo ? '' : '📷';
    };
    refreshUI();

    tab.addEventListener('click', e => { e.stopPropagation(); panel.hidden = !panel.hidden; });
    panel.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      let bgChanged = false;
      if (d.theme) state.theme = d.theme;
      if (d.font) state.font = d.font;
      if (d.veil) state.veil = d.veil;
      if (d.bg) { state.bg = d.bg; bgChanged = true; }
      if (d.img) {
        // 「我的照片」已經選著的時候再點一次，就換一張
        if (d.img === 'photo' && (state.img === 'photo' || !readPhoto())) { pickPhoto(); return; }
        state.img = d.img; bgChanged = true;
      }
      save(state);
      applyAttrs();
      refreshUI();
      if (bgChanged) applyBg();
      startFont();
    });
    document.addEventListener('click', e => {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== tab) panel.hidden = true;
    }, true);

    document.body.appendChild(tab);
    document.body.appendChild(panel);
  }

  function ready() {
    buildUI();
    updateFallback();
    window.addEventListener('load', updateFallback);
    setTimeout(updateFallback, 3000);
    markGrounds();
    new MutationObserver(scheduleGrounds).observe(document.body, { childList: true, subtree: true });
    // React 重畫畫面時按鈕可能被拿掉，補回來
    new MutationObserver(() => { if (!document.getElementById('xt-skin-tab')) buildUI(); })
      .observe(document.body, { childList: true });
    startFont();
    applyBg();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
