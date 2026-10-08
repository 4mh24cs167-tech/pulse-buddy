const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'www', 'assets', 'buddies');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const types = ['human', 'animal', 'vehicle', 'robot', 'fantasy'];
let count = 1;

function createSvg(id, name, color1, color2, category) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#grad)" rx="50" />
        <circle cx="200" cy="150" r="80" fill="#ffffff" opacity="0.8" />
        <text x="200" y="280" font-family="sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">${category.toUpperCase()}</text>
        <text x="200" y="320" font-family="sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">${name}</text>
    </svg>`;
}

const catalog = [];
function addBuddy(name, category, c1, c2) {
    const id = `b_${count}`;
    const filename = `${id}.svg`;
    fs.writeFileSync(path.join(outDir, filename), createSvg(id, name, c1, c2, category));
    catalog.push({
        id,
        name,
        category,
        personality: ['friendly', 'energetic', 'calm', 'professional'][count % 4],
        asset: `assets/buddies/${filename}`
    });
    count++;
}

// 18 Humans
for(let i=1; i<=18; i++) addBuddy(`Human ${i}`, 'human', '#ff7e5f', '#feb47b');
// 24 Animals
for(let i=1; i<=24; i++) addBuddy(`Animal ${i}`, 'animal', '#00c6ff', '#0072ff');
// 12 Vehicles
for(let i=1; i<=12; i++) addBuddy(`Vehicle ${i}`, 'vehicle', '#f7971e', '#ffd200');
// 10 Robots
for(let i=1; i<=10; i++) addBuddy(`Robot ${i}`, 'robot', '#43ceA2', '#185a9d');
// 8 Fantasy
for(let i=1; i<=8; i++) addBuddy(`Fantasy ${i}`, 'fantasy', '#cc2b5e', '#753a88');

const jsContent = `const BuddyCatalog = ${JSON.stringify(catalog, null, 2)};
const EmotionEngine = {
    react: (buddyInst, eventType) => {
        if (!buddyInst) return;
        let emotion = 'idle';
        switch(eventType) {
            case 'DONE': emotion = 'happy'; break;
            case 'MISSED': emotion = 'sad'; break;
            case 'SNOOZE': emotion = 'focused'; break;
            case 'GOAL': emotion = 'celebrating'; break;
        }
        if (buddyInst.domElement) {
            buddyInst.domElement.style.transition = 'transform 0.5s ease';
            buddyInst.domElement.style.transform = emotion === 'happy' || emotion === 'celebrating' ? 'scale(1.1) translateY(-10px)' : (emotion === 'sad' ? 'scale(0.95) translateY(10px) grayscale(0.5)' : 'scale(1.0)');
            setTimeout(() => { if(buddyInst.domElement) { buddyInst.domElement.style.transform = 'scale(1.0) translateY(0) grayscale(0)'; } }, 2000);
        }
    }
};
if (typeof module !== 'undefined') module.exports = { BuddyCatalog, EmotionEngine };
if (typeof window !== 'undefined') { window.BuddyCatalog = BuddyCatalog; window.EmotionEngine = EmotionEngine; }
`;

fs.writeFileSync(path.join(__dirname, 'www', 'buddy-catalog.js'), jsContent);
console.log(`Successfully generated 72 physical buddy assets and catalog.`);
