const TimeUtils = require('./TimeUtils');

class Scheduler {
    constructor(stateStore, fireCallback) {
        this.stateStore = stateStore;
        this.fireCallback = fireCallback;
        this.timer = null;
        this.pausedUntil = 0;
        this.lastTick = Date.now();
    }

    start() {
        if (this.timer) return;
        this.timer = setInterval(() => this.tick(), 1000);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    pause(minutes) {
        if (typeof minutes !== 'number' || minutes < 0) return;
        this.pausedUntil = minutes > 0 ? Date.now() + (minutes * 60000) : 0;
    }

    resume() {
        this.pausedUntil = 0;
    }

    tick() {
        const now = Date.now();
        
        // Detect system sleep/resume leaps
        if (now - this.lastTick > 10000) {
            console.log('System wake detected, recalculating schedules...');
        }
        this.lastTick = now;

        if (this.pausedUntil > now) return;

        const state = this.stateStore.getState();
        let changed = false;
        const dueList = [];

        state.reminders.forEach(r => {
            if (!r.active || !r.next) return;

            // Missed reminder intelligence:
            // If the reminder is more than 24 hours late (e.g. laptop closed over weekend),
            // we should not fire it, but instead quietly reschedule it.
            if (now - r.next > 86400000) {
                console.log(`Reminder ${r.id} is deeply stale. Rescheduling without firing.`);
                r.next = this.calculateNext(r, now);
                changed = true;
                return;
            }

            // Normal due trigger
            if (now >= r.next) {
                // Deduplication check: if we just fired it, wait
                if (r._lastFired && (now - r._lastFired < 60000)) return;
                
                r._lastFired = now;
                dueList.push({...r}); // clone to prevent UI mutation bleeding
                
                // Calculate next recurrence
                const nextTime = this.calculateNext(r, now);
                if (nextTime === null) {
                    r.active = false;
                    r.next = 0;
                } else {
                    r.next = nextTime;
                }
                changed = true;
            }
        });

        if (changed) {
            this.stateStore.persist();
        }

        if (dueList.length > 0 && this.fireCallback) {
            this.fireCallback(dueList);
        }
    }

    calculateNext(r, fromTime) {
        if (r.mode === 'interval') {
            const every = parseInt(r.every, 10);
            if (isNaN(every) || every <= 0) return null;
            
            let t = fromTime + (every * 60000);
            return TimeUtils.constrainToActiveHours(t, r.hs, r.he);
        }
        
        if (r.mode === 'daily') {
            if (!Array.isArray(r.times) || r.times.length === 0) return null;
            let best = null;
            
            for (const t of r.times) {
                const nextT = TimeUtils.nextDaily(t, fromTime);
                if (nextT && (best === null || nextT < best)) {
                    best = nextT;
                }
            }
            return best;
        }

        if (r.mode === 'once') {
            // Once reminders don't recur. They are deactivated upon firing.
            return null;
        }

        return null;
    }
}

module.exports = Scheduler;
