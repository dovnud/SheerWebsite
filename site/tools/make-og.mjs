// Renders the hero at 1200x630 for the social-share image. usage: node tools/make-og.mjs <url> <out.jpg>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
await p.goto(url); await p.locator('#enter').waitFor({ state: 'visible', timeout: 60000 }); await p.locator('#enter').click(); await p.waitForTimeout(6500);
await p.addStyleTag({ content: '.site-header,.bottom,.hero-tag,.grain{display:none!important}' }); await p.waitForTimeout(400);
await p.screenshot({ path: out, type: 'jpeg', quality: 88, timeout: 90000 }); await b.close();
