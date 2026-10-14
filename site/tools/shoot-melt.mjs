// Captures stages of the liquid reveal at fixed points. usage: node tools/shoot-melt.mjs <outDir> <baseUrl> [desktop|mobile]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, base, mode = 'desktop'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: vp, isMobile: mode === 'mobile', hasTouch: mode === 'mobile' })).newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall/.test(m.text())) errs.push(m.text().slice(0, 300)); });
await p.goto(base); await p.locator('#enter').waitFor({ state: 'visible', timeout: 60000 }); await p.locator('#enter').click(); await p.waitForTimeout(5500);
for (const [i, v] of [0, 0.08, 0.2, 0.32, 0.45, 0.6, 0.75, 0.9].entries()) {
  await p.evaluate((v) => window.__replica.world.debugLiquid(v), v); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${mode}_${i}_p${Math.round(v * 100)}.png`, timeout: 90000 }); console.log('shot p', v);
}
console.log('errors:', errs.join('|') || 'none'); await b.close();
