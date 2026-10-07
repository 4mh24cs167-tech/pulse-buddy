const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AssetStore {
    constructor(userDataPath) {
        this.assetsDir = path.join(userDataPath, 'assets');
        this.imagesDir = path.join(this.assetsDir, 'images');
        this.modelsDir = path.join(this.assetsDir, 'models');
        
        [this.assetsDir, this.imagesDir, this.modelsDir].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
    }

    /**
     * Stores a base64 asset locally and returns the local file URI
     * @param {string} dataUri 
     * @param {string} type 'image' or 'model'
     */
    storeAsset(dataUri, type = 'image') {
        if (!dataUri || !dataUri.startsWith('data:')) return dataUri;
        
        try {
            const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) return dataUri;
            
            const mime = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            
            // Limit to 50MB
            if (buffer.length > 50 * 1024 * 1024) {
                throw new Error('Asset exceeds 50MB limit');
            }
            
            const ext = mime.split('/')[1] || 'bin';
            const hash = crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
            const fileName = `${hash}.${ext}`;
            const targetDir = type === 'model' ? this.modelsDir : this.imagesDir;
            const filePath = path.join(targetDir, fileName);
            
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, buffer);
            }
            
            return `file:///${filePath.replace(/\\/g, '/')}`;
        } catch (error) {
            console.error('Failed to store asset:', error);
            return dataUri; // Fallback to original
        }
    }
}

module.exports = AssetStore;
