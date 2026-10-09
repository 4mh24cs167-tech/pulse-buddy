const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

describe('Overlay UI Test', function() {
    this.timeout(120000);
    let browser;
    let page;

    before(async () => {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        page = await browser.newPage();
        
        await page.evaluateOnNewDocument(() => {
            window.api = {
                onFire: (cb) => window._fireOverlay = cb,
                ignore: () => {},
                answer: async () => ({ count: 1, goal: 1 }),
                closeOverlay: () => window._overlayClosed = true
            };
        });
        
        const fileUrl = 'file://' + path.resolve(__dirname, '../../www/overlay.html').replace(/\\/g, '/');
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    });

    after(async () => {
        if(browser) await browser.close();
    });

    it('should fire reminder without DOM movement', async () => {
        const hasLeft = await page.evaluate(() => {
            return document.querySelector('#buddy').style.left !== '';
        });
        assert.ok(!hasLeft, 'Buddy DOM element should not have inline left style');

        await page.evaluate(() => {
            window._fireOverlay({
                sound: false,
                r: { id: 'test1', title: 'Test', buddy: 1, yes: 'Done', ent: 'walk' }
            });
        });
        
        // Wait for it to walk in and display buttons
        await page.waitForFunction(() => document.querySelector('.btns').style.display === 'flex');
        
        const msg = await page.evaluate(() => document.querySelector('#msg').textContent);
        assert.ok(msg.includes('Test'), 'Message should show title');

        // Click yes
        await page.evaluate(() => document.querySelector('#yes').click());
        
        // Wait for celebrate and ring to show
        await page.waitForFunction(() => document.querySelector('#ring').style.display === 'block');
        
        // Wait for closeOverlay flag
        await page.waitForFunction(() => window._overlayClosed, { timeout: 10000 });
        assert.ok(true, 'Overlay closed successfully');
    });
});
