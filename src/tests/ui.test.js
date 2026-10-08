const assert = require("assert");
const fs = require("fs");
const html = fs.readFileSync("www/index.html", "utf8");

describe("UI Paths Integrity", () => {
    it("72 picker entries uses BuddyCatalog", () => {
        assert.ok(html.includes("window.BuddyCatalog.forEach(c => {"), "Must use BuddyCatalog for 72 entries");
        assert.ok(!html.includes("for(let i=1; i<=60; i++)"), "Must not use 60-item hardcoded loop");
    });
    
    it("five categories are present in Studio Species picker", () => {
        assert.ok(html.includes("<option value=\"robot\">Robot</option>"), "Robot must be in picker");
        assert.ok(html.includes("<option value=\"fantasy\">Fantasy</option>"), "Fantasy must be in picker");
        assert.ok(html.includes("<option value=\"human\">Human</option>"));
        assert.ok(html.includes("<option value=\"animal\">Animal</option>"));
        assert.ok(html.includes("<option value=\"vehicle\">Vehicle</option>"));
    });
    
    it("Studio emotion preview triggers Actual BuddyEngine update", () => {
        assert.ok(html.includes("window.Sprites.update(studioInst, emotion);"), "Must trigger Sprite update");
        assert.ok(!html.includes("window.EmotionEngine.react({ domElement"), "Must NOT use legacy CSS engine");
    });
    
    it("Studio custom upload uses AssetStore", () => {
        assert.ok(html.includes("api.saveAsset("), "Must use saveAsset API");
        assert.ok(html.includes("const buddyState = { id: newId, name: 'Custom Photo', asset: assetId, isPhoto: true };"), "Must create proper buddy state");
    });
});

