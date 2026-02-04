/**
 * Tide calculations and data processing
 */

const THRESHOLDS = {
    safeAccess: 1.05,      // ≤1.05m is safely accessible (green)
    barelyAccess: 1.3      // 1.05-1.3m is barely accessible (orange)
};

const METERS_TO_FEET = 3.28084;

/**
 * Filter data to only 15-minute intervals (0, 15, 30, 45)
 */
function filterQuarterHour(data) {
    return data.filter(entry => {
        const date = new Date(entry.eventDate);
        const minutes = date.getMinutes();
        return minutes === 0 || minutes === 15 || minutes === 30 || minutes === 45;
    });
}

/**
 * Convert meters to feet
 */
function metersToFeet(meters) {
    return meters * METERS_TO_FEET;
}

/**
 * Format height value based on unit
 */
function formatHeight(meters, unit = 'meters') {
    if (unit === 'feet') {
        const totalFeet = metersToFeet(meters);
        const feet = Math.floor(totalFeet);
        const inches = Math.round((totalFeet - feet) * 12);
        return `${feet}' ${inches}"`;
    }
    return `${meters.toFixed(2)}m`;
}

/**
 * Parse height value back to meters from display format
 */
function parseHeight(value, unit = 'meters') {
    if (unit === 'feet') {
        const feet = parseFloat(value);
        return feet / METERS_TO_FEET;
    }
    const cm = parseFloat(value);
    return cm / 100;
}

/**
 * Combine predictions with observations
 */
function mergeTideData(predictions, observations) {
    // Filter to 15-minute intervals
    const filteredPredictions = filterQuarterHour(predictions);
    const filteredObservations = filterQuarterHour(observations);

    // Create observation map keyed by timestamp (rounded to 15-min intervals)
    const obsMap = new Map();
    filteredObservations.forEach(obs => {
        const date = new Date(obs.eventDate);
        // Round to nearest 15 minutes for matching
        const timestamp = Math.floor(date.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
        obsMap.set(timestamp, obs.value);
    });

    // Merge data
    return filteredPredictions.map(pred => {
        const date = new Date(pred.eventDate);
        const timeKey = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Round to nearest 15 minutes for matching
        const timestamp = Math.floor(date.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000);
        const observation = obsMap.get(timestamp) || null;

        return {
            time: date,
            timeString: timeKey,
            prediction: pred.value,
            observation: observation
        };
    });
}

/**
 * Find high and low tides for the day
 */
function findHighLowTides(tideData) {
    if (tideData.length === 0) return { high: null, low: null };

    let high = tideData[0];
    let low = tideData[0];

    for (const entry of tideData) {
        if (entry.prediction > high.prediction) {
            high = entry;
        }
        if (entry.prediction < low.prediction) {
            low = entry;
        }
    }

    return { high, low };
}

/**
 * Determine tide trend (rising or falling)
 */
function getTideTrend(tideData, currentTime) {
    const now = currentTime || new Date();

    // Find the closest data points before and after current time
    let before = null;
    let after = null;

    for (let i = 0; i < tideData.length - 1; i++) {
        if (tideData[i].time <= now && tideData[i + 1].time > now) {
            before = tideData[i];
            after = tideData[i + 1];
            break;
        }
    }

    if (!before || !after) {
        // Current time is outside the data range
        return 'unknown';
    }

    return after.prediction > before.prediction ? 'rising' : 'falling';
}

/**
 * Find access windows (periods when tide is ≤1.1m - accessible)
 */
function findAccessWindows(tideData) {
    const accessWindows = [];
    let currentWindow = null;
    const accessThreshold = 1.1; // Island accessible when tide ≤1.1m

    tideData.forEach((entry) => {
        const tide = entry.prediction;

        // Access window (≤1.1m)
        if (tide <= accessThreshold) {
            if (!currentWindow) {
                currentWindow = { start: entry.time, startTide: tide, entries: [] };
            }
            currentWindow.entries.push(entry);
            currentWindow.end = entry.time;
            currentWindow.endTide = tide;
        } else if (currentWindow) {
            accessWindows.push(currentWindow);
            currentWindow = null;
        }
    });

    // Close any open window
    if (currentWindow) accessWindows.push(currentWindow);

    return accessWindows;
}

/**
 * Get current access status
 */
function getCurrentAccessStatus(tideData, currentTime) {
    const now = currentTime || new Date();
    const accessThreshold = 1.1; // Island accessible when tide ≤1.1m

    // Find the closest tide reading
    let closest = null;
    let minDiff = Infinity;

    for (const entry of tideData) {
        const diff = Math.abs(entry.time - now);
        if (diff < minDiff) {
            minDiff = diff;
            closest = entry;
        }
    }

    if (!closest) {
        return { accessible: false, status: 'unknown', tide: null };
    }

    const tide = closest.observation || closest.prediction;

    if (tide <= accessThreshold) {
        return { accessible: true, status: 'accessible', tide, entry: closest };
    } else {
        return { accessible: false, status: 'not-accessible', tide, entry: closest };
    }
}

/**
 * Calculate countdown to next access window or end of current window
 */
function getCountdown(tideData, currentTime) {
    const now = currentTime || new Date();
    const accessWindows = findAccessWindows(tideData);

    // Check if we're currently in a window
    for (const window of accessWindows) {
        if (now >= window.start && now <= window.end) {
            // Currently in an access window
            const msUntilEnd = window.end - now;
            return {
                type: 'window-closing',
                ms: msUntilEnd,
                window: window
            };
        }
    }

    // Find next window
    for (const window of accessWindows) {
        if (window.start > now) {
            const msUntilStart = window.start - now;
            return {
                type: 'window-opening',
                ms: msUntilStart,
                window: window
            };
        }
    }

    return null; // No upcoming windows
}

/**
 * Format countdown time
 */
function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Filter tide data to display window (10am-10pm)
 */
function filterDisplayWindow(tideData, startHour = 10, endHour = 22) {
    return tideData.filter(entry => {
        const hour = entry.time.getHours();
        return hour >= startHour && hour < endHour;
    });
}

/**
 * Get accessibility level for color coding
 */
function getAccessibilityLevel(tide) {
    const accessThreshold = 1.1; // Island accessible when tide ≤1.1m

    if (tide <= accessThreshold) {
        return 'accessible';
    } else {
        return 'not-accessible';
    }
}

// Export functions
window.TideCalc = {
    filterQuarterHour,
    metersToFeet,
    formatHeight,
    parseHeight,
    mergeTideData,
    findHighLowTides,
    getTideTrend,
    findAccessWindows,
    getCurrentAccessStatus,
    getCountdown,
    formatCountdown,
    filterDisplayWindow,
    getAccessibilityLevel,
    THRESHOLDS
};
