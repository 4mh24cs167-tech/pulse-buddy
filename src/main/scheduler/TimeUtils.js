class TimeUtils {
    /**
     * Parse HH:MM into total minutes from midnight
     */
    static parseTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return null;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
        return (h * 60) + m;
    }

    /**
     * Get next timestamp for a daily time string (HH:MM)
     * If the time has passed today, returns tomorrow's timestamp.
     */
    static nextDaily(timeStr, fromTime = Date.now()) {
        const mins = this.parseTime(timeStr);
        if (mins === null) return null;
        
        const d = new Date(fromTime);
        d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
        
        if (d.getTime() <= fromTime) {
            d.setDate(d.getDate() + 1);
        }
        return d.getTime();
    }

    /**
     * Constrain a timestamp to active hours (HH:MM)
     * If the timestamp falls outside the active window, it gets pushed to the start of the next active window.
     */
    static constrainToActiveHours(timestamp, startStr, endStr) {
        if (!startStr || !endStr) return timestamp;
        
        const startMins = this.parseTime(startStr);
        const endMins = this.parseTime(endStr);
        if (startMins === null || endMins === null) return timestamp;

        const d = new Date(timestamp);
        const currentMins = (d.getHours() * 60) + d.getMinutes();

        // If start < end (e.g. 09:00 to 17:00)
        if (startMins < endMins) {
            if (currentMins < startMins) {
                d.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
            } else if (currentMins > endMins) {
                d.setDate(d.getDate() + 1);
                d.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
            }
        } 
        // If start > end (e.g. 22:00 to 06:00 overnight)
        else {
            if (currentMins > endMins && currentMins < startMins) {
                d.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
            }
        }

        return d.getTime();
    }
}

module.exports = TimeUtils;
