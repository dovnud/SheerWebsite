// Renders the hero for each candidate object. usage: node tools/shoot-hero.mjs <outDir> <baseUrl> [desktop|mobile]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, base, mode = 'desktop'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
for (const v of (process.env.VARIANTS || 'halo,lens,curtain,ghost').split(',')) {
  const p = await (await b.newContext({ viewport: vp, isMobile: mode === 'mobile', hasTouch: mode === 'mobile' })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(`${base}?obj=${v}`); await p.locator('#enter').waitFor({ state: 'visible', timeout: 60000 }); await p.locator('#enter').click(); await p.waitForTimeout(5200);
  await p.screenshot({ path: `${out}/${mode}_${v}_a.png`, timeout: 90000 }); await p.waitForTimeout(3200); await p.screenshot({ path: `${out}/${mode}_${v}_b.png`, timeout: 90000 });
  console.log(v, 'ok', errs.join('|') || 'no errors'); await p.context().close();
}
await b.close();
