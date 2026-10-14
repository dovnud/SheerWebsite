// Integration check: first scroll triggers the liquid exit, it finishes, and it never returns. usage: node tools/test-oneway.mjs <outDir> <baseUrl> [reduce]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, base, rm] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: rm === 'reduce' ? 'reduce' : 'no-preference' })).newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160))); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall/.test(m.text())) errs.push(m.text().slice(0, 200)); });
await p.goto(base); await p.locator('#enter').waitFor({ state: 'visible', timeout: 60000 }); await p.locator('#enter').click(); await p.waitForTimeout(5500);
const st = () => p.evaluate(() => window.__replica.world.liquidState);
console.log('before scroll:', await st());
await p.evaluate(() => window.scrollTo(0, 40)); await p.waitForTimeout(600); console.log('just after scroll:', await st());
await p.waitForFunction(() => window.__replica.world.liquidState === 'gone', null, { timeout: 60000 }); console.log('finished:', await st());
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(2500);
await p.evaluate(() => window.scrollTo(0, 60)); await p.waitForTimeout(1500);
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(2500); console.log('after returning to top and scrolling again:', await st());
await p.screenshot({ path: `${out}/oneway_top_after.png`, timeout: 90000 }); console.log('errors:', errs.join('|') || 'none'); await b.close();
