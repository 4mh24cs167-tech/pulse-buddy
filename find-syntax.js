const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString(), err.stack));
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.url()));
    page.on('response', res => {
      // ignore
    });
    
    await page.evaluateOnNewDocument(() => {
        // DON'T inject window.api!
        // The user says "The actual production renderer". In Electron or Capacitor, preload handles it.
        // Let's just load it.
    });
    
    const fileUrl = 'file://' + path.resolve(__dirname, 'www/index.html').replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
})();
