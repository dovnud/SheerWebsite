// Render the replica at a given viewport and save screenshots. usage: node tools/shoot.mjs <outDir> <desktop|mobile> [reduce] [url]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, mode = 'desktop', rm, url = 'http://localhost:5173/'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const vp = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mode === 'mobile', hasTouch: mode === 'mobile', reducedMotion: rm === 'reduce' ? 'reduce' : 'no-preference' });
const p = await ctx.newPage(); const logs = [];
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().slice(0, 240)); });
p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message.slice(0, 300)));
const shot = async (n) => { await p.screenshot({ path: `${out}/${mode}${rm === 'reduce' ? '_rm' : ''}_${n}.png`, timeout: 90000 }); console.log('shot', n); };
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(1200); await shot('01_gate_loading');
await p.locator('#enter').waitFor({ state: 'visible', timeout: 60000 }); await p.waitForTimeout(500); await shot('02_gate_ready');
await p.locator('#enter').click(); await p.waitForTimeout(1100); await shot('03_wipe'); await p.waitForTimeout(3800); await shot('04_hero');
const H = await p.evaluate(() => document.documentElement.scrollHeight); console.log('scrollHeight', H);
const stops = (process.env.STOPS || '1').split(',').map(Number);
for (const s of stops) { await p.evaluate((y) => window.scrollTo(0, y), s * vp.height); await p.waitForTimeout(2200); await shot(`05_y${String(Math.round(s * 100)).padStart(4, '0')}`); }
if (process.env.CONTACT) { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1500); await p.locator('#contact-open').click(); await p.waitForTimeout(2500); await shot('06_contact_overlay'); await p.keyboard.press('Escape'); await p.waitForTimeout(1800); await shot('07_contact_closed'); await p.locator('#ar').click(); await p.waitForTimeout(1200); await shot('08_ar_panel'); }
fs.writeFileSync(`${out}/${mode}_console.txt`, logs.join('\n')); console.log('LOGS', logs.slice(0, 8).join('\n'));
await b.close();
