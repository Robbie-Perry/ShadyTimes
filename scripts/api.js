/**
 * DFO API Client with caching
 * Handles fetching tide predictions and observations
 */

const API_BASE_URL = 'https://api-iwls.dfo-mpo.gc.ca/api/v1/stations';
const STATION_ID = '5cebf1e13d0f4a073c4bbf8c'; // Steveston BC

// Cache configuration
const CACHE_DURATION = {
    predictions: 24 * 60 * 60 * 1000, // 24 hours
    observations: 15 * 60 * 1000       // 15 minutes
};

// Cache storage
const cache = {
    predictions: new Map(),
    observations: new Map()
};

/**
 * Generate cache key from date
 */
function getCacheKey(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cacheEntry, maxAge) {
    if (!cacheEntry) return false;
    const age = Date.now() - cacheEntry.timestamp;
    return age < maxAge;
}

/**
 * Fetch tide predictions for a given date
 */
async function fetchPredictions(date) {
    const cacheKey = getCacheKey(date);
    const cached = cache.predictions.get(cacheKey);

    if (isCacheValid(cached, CACHE_DURATION.predictions)) {
        return cached.data;
    }

    const fromDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const toDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const url = `${API_BASE_URL}/${STATION_ID}/data?time-series-code=wlp&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Cache the result
        cache.predictions.set(cacheKey, {
            timestamp: Date.now(),
            data: data
        });

        return data;
    } catch (error) {
        console.error('Error fetching predictions:', error);
        throw error;
    }
}

/**
 * Fetch tide observations for a given date
 */
async function fetchObservations(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    // Only fetch observations for past/current dates
    if (dateToCheck > today) {
        return [];
    }

    const cacheKey = getCacheKey(date);
    const cached = cache.observations.get(cacheKey);

    if (isCacheValid(cached, CACHE_DURATION.observations)) {
        return cached.data;
    }

    const fromDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const toDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const url = `${API_BASE_URL}/${STATION_ID}/data?time-series-code=wlo&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Cache the result
        cache.observations.set(cacheKey, {
            timestamp: Date.now(),
            data: data
        });

        return data;
    } catch (error) {
        console.error('Error fetching observations:', error);
        throw error;
    }
}

/**
 * Fetch both predictions and observations for a given date
 */
async function fetchTideData(date) {
    try {
        const [predictions, observations] = await Promise.all([
            fetchPredictions(date),
            fetchObservations(date)
        ]);

        return {
            predictions,
            observations
        };
    } catch (error) {
        console.error('Error fetching tide data:', error);
        throw error;
    }
}

/**
 * Clear all cached data
 */
function clearCache() {
    cache.predictions.clear();
    cache.observations.clear();
}

// Export functions
window.TideAPI = {
    fetchTideData,
    fetchPredictions,
    fetchObservations,
    clearCache
};
