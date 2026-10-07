const fs = require('fs');
const path = require('path');

class RecoveryManager {
    static backupCorrupted(filePath) {
        if (!fs.existsSync(filePath)) return null;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.corrupt-${timestamp}`;
        
        try {
            fs.copyFileSync(filePath, backupPath);
            return backupPath;
        } catch (error) {
            console.error('Failed to backup corrupted state:', error);
            return null;
        }
    }

    static createSafeBackup(filePath, userDataPath) {
        if (!fs.existsSync(filePath)) return null;
        
        const backupDir = path.join(userDataPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupPath = path.join(backupDir, 'data.backup.json');
        
        try {
            fs.copyFileSync(filePath, backupPath);
            return backupPath;
        } catch (error) {
            console.error('Failed to create safe backup:', error);
            return null;
        }
    }
}

module.exports = RecoveryManager;
