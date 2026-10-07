const fs = require('fs');
const path = require('path');
const SchemaValidator = require('./SchemaValidator');
const MigrationManager = require('./MigrationManager');
const AtomicWriter = require('./AtomicWriter');
const RecoveryManager = require('./RecoveryManager');

class StateStore {
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
        this.dataDir = path.join(userDataPath, 'data');
        this.filePath = path.join(this.dataDir, 'state.json');
        this.legacyPath = path.join(userDataPath, 'data.json');
        
        // Ensure data directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        
        this.state = this.load();
    }

    load() {
        let rawData = null;
        let activePath = this.filePath;
        
        // Check for new state file, fallback to legacy
        if (fs.existsSync(this.filePath)) {
            try {
                rawData = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            } catch (e) {
                console.error('Failed to parse state.json, attempting recovery...');
                RecoveryManager.backupCorrupted(this.filePath);
                // We don't crash, we fall through to return safe defaults later
            }
        } else if (fs.existsSync(this.legacyPath)) {
            try {
                rawData = JSON.parse(fs.readFileSync(this.legacyPath, 'utf8'));
                activePath = this.legacyPath;
            } catch (e) {
                console.error('Failed to parse legacy data.json, attempting recovery...');
                RecoveryManager.backupCorrupted(this.legacyPath);
            }
        }

        if (rawData) {
            // Backup before migration
            RecoveryManager.createSafeBackup(activePath, this.userDataPath);

            try {
                const migrated = MigrationManager.migrate(rawData);
                return SchemaValidator.validate(migrated);
            } catch (e) {
                console.error('Validation/Migration failed, generating safe defaults:', e);
            }
        }

        // Safe Defaults
        return SchemaValidator.validate({ schemaVersion: 1 });
    }

    persist() {
        try {
            const dataString = JSON.stringify(this.state, null, 2);
            AtomicWriter.writeSync(this.filePath, dataString);
        } catch (error) {
            console.error('Persistence failed:', error);
        }
    }

    getState() {
        return this.state;
    }
}

module.exports = StateStore;
