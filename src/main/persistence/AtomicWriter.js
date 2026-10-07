const fs = require('fs');
const path = require('path');

class AtomicWriter {
    static writeSync(filePath, data) {
        const tmpPath = filePath + '.tmp.' + Date.now();
        try {
            // Write to a temporary file first
            fs.writeFileSync(tmpPath, data, { encoding: 'utf8', mode: 0o600 });
            
            // Atomically replace the destination file
            fs.renameSync(tmpPath, filePath);
            return true;
        } catch (error) {
            // If anything fails, clean up the temp file if it exists
            if (fs.existsSync(tmpPath)) {
                try { fs.unlinkSync(tmpPath); } catch (e) {}
            }
            throw new Error(`Atomic write failed: ${error.message}`);
        }
    }
}

module.exports = AtomicWriter;
