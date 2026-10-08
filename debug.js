const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('PAGE ERROR STACK:', err.stack));
    const fileUrl = 'file://' + path.resolve(__dirname, '../../www/index.html').replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await browser.close();
})();
