const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE EXCEPTION:', err.message));
    
    await page.evaluateOnNewDocument(() => {
        window.api = { get: async () => ({ settings: {}, reminders: [], buddies: [] }) };
    });
    
    const fileUrl = 'file://' + path.resolve(__dirname, 'www/index.html').replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    await browser.close();
})();
