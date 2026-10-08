const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const fileUrl = 'file://' + path.resolve(__dirname, 'www/index.html').replace(/\\/g, '/');
    await page.goto(fileUrl);
    const hasConfigs = await page.evaluate(() => !!window.Buddy3D.Configs);
    console.log("Has Configs:", hasConfigs);
    if (!hasConfigs) {
        const keys = await page.evaluate(() => Object.keys(window.Buddy3D));
        console.log("Keys:", keys);
    }
    await browser.close();
})();
