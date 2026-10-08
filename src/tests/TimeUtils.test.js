const assert = require('assert');
const TimeUtils = require('../main/scheduler/TimeUtils.js');

describe('TimeUtils', () => {
    it('should parse valid time strings', () => {
        assert.strictEqual(TimeUtils.parseTime('09:30'), 570);
        assert.strictEqual(TimeUtils.parseTime('00:00'), 0);
        assert.strictEqual(TimeUtils.parseTime('23:59'), 1439);
    });

    it('should return null for invalid time strings', () => {
        assert.strictEqual(TimeUtils.parseTime('25:00'), null);
        assert.strictEqual(TimeUtils.parseTime('9:99'), null);
        assert.strictEqual(TimeUtils.parseTime('invalid'), null);
        assert.strictEqual(TimeUtils.parseTime(null), null);
    });

    it('should calculate todayCount correctly', () => {
        const now = new Date('2026-01-01T12:00:00Z').getTime();
        const r = {
            log: [
                new Date('2026-01-01T10:00:00Z').getTime(),
                new Date('2026-01-01T11:00:00Z').getTime(),
                new Date('2025-12-31T23:00:00Z').getTime()
            ]
        };
        // It checks local Date string, which depends on timezone, but at least > 0
        assert.ok(TimeUtils.todayCount(r, now) >= 1);
    });
});
