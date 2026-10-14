// Reduced-motion and no-JS checks. usage: node tools/shoot-fallbacks.mjs <outDir>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const report = {};
// 1) prefers-reduced-motion: no smooth scroll lib, no pin, no trail; content visible
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto((process.env.BASE || 'http://localhost:5173/')); await p.locator('#enter').waitFor({ state: 'visible', timeout: 60000 }); await p.locator('#enter').click(); await p.waitForTimeout(2500);
  report.reduced = await p.evaluate(() => ({ lenis: document.documentElement.classList.contains('lenis'), trailClass: document.documentElement.classList.contains('has-trail'), scrollH: document.documentElement.scrollHeight, overflow: document.documentElement.style.overflow }));
  await p.screenshot({ path: `${out}/rm_hero.png`, timeout: 90000 });
  await p.evaluate(() => document.getElementById('services').scrollIntoView()); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/rm_services.png`, timeout: 90000 });
  report.reducedErrors = errs; await c.close();
}
// 2) JavaScript disabled: the page must still read
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }); const p = await c.newPage();
  await p.goto((process.env.BASE || 'http://localhost:5173/')); await p.waitForTimeout(1200);
  report.nojs = await p.evaluate(() => ({ gateVisible: getComputedStyle(document.getElementById('gate')).display !== 'none', h1: document.querySelector('h1').getBoundingClientRect().height, scrollH: document.documentElement.scrollHeight }));
  await p.screenshot({ path: `${out}/nojs_top.png`, fullPage: false });
  await p.screenshot({ path: `${out}/nojs_full.png`, fullPage: true, timeout: 90000 }); await c.close();
}
// 3) horizontal overflow at several widths (JS on, after entering)
for (const w of [320, 390, 768, 1024, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: 800 } }); const p = await c.newPage();
  await p.goto((process.env.BASE || 'http://localhost:5173/')); await p.locator('#enter').waitFor({ state: 'visible', timeout: 60000 }); await p.locator('#enter').click(); await p.waitForTimeout(2200);
  report['overflow_' + w] = await p.evaluate(() => { const bad = []; document.querySelectorAll('.just .line, .svc-head, .foot-mark, .site-header').forEach((el) => { if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'hidden') bad.push(el.className.toString().slice(0, 30)); }); return { docScrollW: document.documentElement.scrollWidth, innerW: innerWidth, bad }; });
  await c.close();
}
console.log(JSON.stringify(report, null, 1)); await b.close();
