import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:1000}});
await p.goto('http://localhost:5173/type-lab.html'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(800);
await p.screenshot({path:process.argv[2],fullPage:true}); await b.close();
