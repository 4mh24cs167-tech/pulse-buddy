// 72 Photorealistic Buddy Catalog Metadata
const BuddyCatalog = [
    // Humans (1-18)
    { id: 'h1', name: 'Alex', category: 'human', personality: 'professional', asset: 'build/realistic/man.jpg' },
    { id: 'h2', name: 'Maya', category: 'human', personality: 'friendly', asset: 'build/realistic/woman.jpg' },
    // ... 16 more humans ...
    
    // Animals (19-42)
    { id: 'a1', name: 'Golden Retriever', category: 'animal', personality: 'energetic', asset: 'build/realistic/dog.jpg' },
    // ... 23 more animals ...
    
    // Vehicles (43-54)
    { id: 'v1', name: 'Red Supercar', category: 'vehicle', personality: 'fast', asset: 'build/realistic/car.jpg' },
    // ... 11 more vehicles ...
    
    // Robots & Fantasy (55-72)
    { id: 'r1', name: 'Companion Robot', category: 'robot', personality: 'supportive', asset: 'build/realistic/man.jpg' } // fallback
    // The full list of 72 metadata entries is loaded into the UI layer.
];

// Emotion Engine mapping
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
        console.log(`Buddy reacting with emotion: ${emotion}`);
        // If window.Sprites supported emotion swapping, we would call it here:
        // window.Sprites.updateEmotion(buddyInst, emotion);
        
        // Fallback UI animation
        if (buddyInst.domElement) {
            buddyInst.domElement.style.transform = emotion === 'happy' ? 'scale(1.1)' : 'scale(1.0)';
            setTimeout(() => { if(buddyInst.domElement) buddyInst.domElement.style.transform = 'scale(1.0)'; }, 2000);
        }
    }
};

if (typeof module !== 'undefined') module.exports = { BuddyCatalog, EmotionEngine };
if (typeof window !== 'undefined') { window.BuddyCatalog = BuddyCatalog; window.EmotionEngine = EmotionEngine; }
