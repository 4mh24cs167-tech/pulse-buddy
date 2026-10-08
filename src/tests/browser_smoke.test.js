const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

describe('Browser Smoke Test', function() {
    this.timeout(30000); // 30s timeout for browser
    let browser;
    let page;

    before(async () => {
        browser = await puppeteer.launch({ headless: true });
        page = await browser.newPage();
        
        page.on('requestfailed', request => { console.log('REQ FAILED:', request.url()); });
        page.on('pageerror', err => console.log('PAGE EXCEPTION:', err.message));
        
        // Expose a fake API so UI initializes without waiting for electron IPC
        await page.evaluateOnNewDocument(() => {
            window.api = {
                get: async () => ({ settings: {}, reminders: [], buddies: [] }),
                save: async () => {},
                onRefresh: () => {}
            };
        });
        
        const fileUrl = 'file://' + path.resolve(__dirname, '../../www/index.html').replace(/\\/g, '/');
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    });

    after(async () => {
        if(browser) await browser.close();
    });

    const viewports = [
        { width: 320, height: 640 },
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1280, height: 800 }
    ];

    for (const vp of viewports) {
        it(`should interact correctly at ${vp.width}x${vp.height}`, async () => {
            await page.setViewport(vp);
            
            // Wait for DOM
            await page.waitForSelector('.sidebar');
            
            // Click Reminders tab
            await page.evaluate(() => document.querySelector('.sidebar button[data-tab="reminders"]').click());
            let tabActive = await page.evaluate(() => document.querySelector('#tab-reminders').classList.contains('active'));
            assert.ok(tabActive, "Reminders tab should be active");

            // Click Buddies tab
            await page.evaluate(() => document.querySelector('.sidebar button[data-tab="buddies"]').click());
            tabActive = await page.evaluate(() => document.querySelector('#tab-buddies').classList.contains('active'));
            assert.ok(tabActive, "Buddies tab should be active");
            
            // Click New Reminder (opens dialog)
            await page.evaluate(() => document.querySelector('#add').click());
            const isDialogOpen = await page.evaluate(() => document.querySelector('#dlg').hasAttribute('open'));
            assert.ok(isDialogOpen, "Dialog should open");
            
            // Click Cancel
            await page.evaluate(() => document.querySelector('#cx').click());
            const isDialogClosed = await page.evaluate(() => !document.querySelector('#dlg').hasAttribute('open'));
            assert.ok(isDialogClosed, "Dialog should close");
            
            // Click Studio
            await page.evaluate(() => {
                const btn = document.querySelector('#openStudioBtnMain') || document.querySelector('#openStudioBtn');
                if(btn) btn.click();
            });
            const isStudioOpen = await page.evaluate(() => document.querySelector('#studioDlg').hasAttribute('open'));
            assert.ok(isStudioOpen, "Studio dialog should open");
            
            // Close Studio
            await page.evaluate(() => document.querySelector('#studioDlg').close());
        });
    }
});
