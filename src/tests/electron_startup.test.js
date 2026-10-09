const { spawn } = require('child_process');
const assert = require('assert');

describe('Electron Startup Test', function() {
    this.timeout(120000);

    it('should start electron without errors and load index.html', (done) => {
        let stdoutData = '';
        let stderrData = '';
        const child = spawn('npx', ['electron', '.', '--no-sandbox'], { shell: true });

        child.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        // We assume main.js logs "App ready" or something similar.
        // Let's just wait 5 seconds and kill it. If it throws an uncaught exception, it will exit with code 1.
        setTimeout(() => {
            child.kill();
        }, 5000);

        child.on('close', (code) => {
            console.log("Stdout:", stdoutData);
            console.log("Stderr:", stderrData);
            assert.ok(!stderrData.includes('Error: Cannot find module'), 'Should not have MODULE_NOT_FOUND error');
            assert.ok(!stderrData.includes('Error:'), 'Should not have an uncaught exception');
            done();
        });
    });
});
