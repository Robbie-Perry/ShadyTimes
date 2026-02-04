/**
 * UI Controller - Manages all user interface updates and interactions
 */

let currentDate = new Date();
let tideData = [];
let todayTideData = []; // Always contains today's data for header status
let countdownInterval = null;
let currentUnit = 'meters';

/**
 * Initialize the application
 */
async function init() {
    setupEventListeners();
    setDateToToday();
    await loadTideData();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    document.getElementById('prev-day').addEventListener('click', navigatePreviousDay);
    document.getElementById('next-day').addEventListener('click', navigateNextDay);
    document.getElementById('date-picker').addEventListener('change', handleDatePickerChange);
    document.getElementById('unit-toggle').addEventListener('click', toggleUnit);
    document.getElementById('refresh-btn').addEventListener('click', handleRefresh);
}

/**
 * Set date to today
 */
function setDateToToday() {
    currentDate = new Date();
    updateDatePicker();
}

/**
 * Update date picker value
 */
function updateDatePicker() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    document.getElementById('date-picker').value = `${year}-${month}-${day}`;
}


/**
 * Navigate to previous day
 */
function navigatePreviousDay() {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDatePicker();
    loadTideData();
}

/**
 * Navigate to next day
 */
function navigateNextDay() {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDatePicker();
    loadTideData();
}

/**
 * Handle date picker change
 */
function handleDatePickerChange(event) {
    currentDate = new Date(event.target.value + 'T12:00:00');
    updateDateText();
    loadTideData();
}

/**
 * Toggle between meters and feet
 */
function toggleUnit() {
    currentUnit = currentUnit === 'meters' ? 'feet' : 'meters';
    // Button text stays the same: "Metric / Imperial"
    renderAllComponents(); // Re-render everything with new units
}

/**
 * Handle refresh button
 */
async function handleRefresh() {
    window.TideAPI.clearCache();
    await loadTideData();
}

/**
 * Load tide data for current date
 */
async function loadTideData() {
    showLoading();

    try {
        // Always load today's data for the header status
        const today = new Date();
        const isToday = currentDate.toDateString() === today.toDateString();

        if (isToday) {
            // If viewing today, load once and use for both
            const data = await window.TideAPI.fetchTideData(currentDate);
            const merged = window.TideCalc.mergeTideData(data.predictions, data.observations);
            tideData = merged;
            todayTideData = merged;
        } else {
            // If viewing another date, load both today's data and the selected date's data
            const [todayData, selectedData] = await Promise.all([
                window.TideAPI.fetchTideData(today),
                window.TideAPI.fetchTideData(currentDate)
            ]);

            todayTideData = window.TideCalc.mergeTideData(todayData.predictions, todayData.observations);
            tideData = window.TideCalc.mergeTideData(selectedData.predictions, selectedData.observations);
        }

        renderAllComponents();
        hideLoading();
    } catch (error) {
        console.error('Error loading tide data:', error);
        showError('Failed to load tide data. Please try again.');
        hideLoading();
    }
}

/**
 * Render all UI components
 */
function renderAllComponents() {
    updateHeaderStatus();
    updateDateTideSummary();
    updateAccessWindows();
    renderTideTable();
    startCountdownTimer();
}

/**
 * Update header status bar (always shows TODAY's status)
 */
function updateHeaderStatus() {
    const status = window.TideCalc.getCurrentAccessStatus(todayTideData);
    const headerStatus = document.getElementById('header-status');
    const statusText = document.getElementById('header-status-text');
    const tideLevel = document.getElementById('header-tide-level');
    const trendIcon = document.getElementById('header-trend');

    headerStatus.className = 'header-status';

    if (status.accessible) {
        headerStatus.classList.add('accessible');
        statusText.textContent = '✓ Accessible';
    } else {
        headerStatus.classList.add('not-accessible');
        statusText.textContent = '✗ Not Accessible';
    }

    if (status.tide !== null) {
        tideLevel.textContent = `${window.TideCalc.formatHeight(status.tide, currentUnit)}`;
    }

    const trend = window.TideCalc.getTideTrend(todayTideData);
    if (trend === 'rising') {
        trendIcon.textContent = '↑ Rising';
    } else if (trend === 'falling') {
        trendIcon.textContent = '↓ Falling';
    } else {
        trendIcon.textContent = '';
    }
}

/**
 * Update countdown timer
 */
function startCountdownTimer() {
    // Clear existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    updateCountdown();

    // Update every second
    countdownInterval = setInterval(updateCountdown, 1000);
}

/**
 * Update countdown display in header (always shows TODAY's countdown)
 */
function updateCountdown() {
    const countdown = window.TideCalc.getCountdown(todayTideData);
    const countdownElement = document.getElementById('header-countdown');

    if (!countdown) {
        countdownElement.textContent = 'No upcoming access windows today';
        return;
    }

    const timeStr = window.TideCalc.formatCountdown(countdown.ms);

    if (countdown.type === 'window-closing') {
        countdownElement.textContent = `Window closes in ${timeStr}`;
    } else {
        countdownElement.textContent = `Next access in ${timeStr}`;
    }
}

/**
 * Update combined date and tide summary
 */
function updateDateTideSummary() {
    const { high, low } = window.TideCalc.findHighLowTides(tideData);
    const summaryElement = document.getElementById('date-tide-text');

    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = currentDate.toLocaleDateString('en-US', options);
    const parts = formattedDate.split(', ');
    const dayName = parts[0];
    const monthDay = parts[1];
    const year = parts[2];
    const dateStr = `${dayName} - ${monthDay}, ${year}`;

    if (high && low) {
        const highStr = `High: ${high.timeString} (${window.TideCalc.formatHeight(high.prediction, currentUnit)})`;
        const lowStr = `Low: ${low.timeString} (${window.TideCalc.formatHeight(low.prediction, currentUnit)})`;
        summaryElement.innerHTML = `<strong>${dateStr}</strong><br>${highStr} &nbsp;|&nbsp; ${lowStr}`;
    } else {
        summaryElement.textContent = dateStr;
    }
}

/**
 * Update access windows display
 */
function updateAccessWindows() {
    const accessWindows = window.TideCalc.findAccessWindows(tideData);
    const windowsElement = document.getElementById('access-windows');

    if (accessWindows.length === 0) {
        windowsElement.innerHTML = '<p class="no-windows">No access windows today</p>';
        return;
    }

    let html = '<div class="windows-list">';

    accessWindows.forEach(window => {
        const startTime = window.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const endTime = window.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        // Format duration in hours and minutes
        const durationMs = window.end - window.start;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        let durationStr = '';
        if (hours > 0) {
            durationStr = `${hours}h ${minutes}m`;
        } else {
            durationStr = `${minutes}m`;
        }

        html += `<div class="access-window">${startTime} - ${endTime} <span class="duration">(${durationStr})</span></div>`;
    });

    html += '</div>';
    windowsElement.innerHTML = html;
}

/**
 * Render tide table
 */
function renderTideTable() {
    const tableBody = document.getElementById('tide-table-body');
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const viewingToday = currentDate.toDateString() === today.toDateString();

    // Calculate max tide level for gradient
    const tideLevels = tideData.map(d => d.prediction);
    const maxTide = Math.max(...tideLevels);

    let html = '';
    let currentTimeRowId = null;

    tideData.forEach((entry, index) => {
        // Highlight the current 15-minute interval only when viewing today
        const isCurrentTime = viewingToday && entry.time <= now && (index === tideData.length - 1 || tideData[index + 1].time > now);
        const accessibility = window.TideCalc.getAccessibilityLevel(entry.prediction);
        const bgColor = getGradientColor(entry.prediction, accessibility, maxTide, index);

        const predictionText = window.TideCalc.formatHeight(entry.prediction, currentUnit);
        const observationText = entry.observation ? window.TideCalc.formatHeight(entry.observation, currentUnit) : '-';

        const rowClass = isCurrentTime ? 'current-time' : '';
        const rowId = isCurrentTime ? 'id="current-time-row"' : '';

        if (isCurrentTime) {
            currentTimeRowId = 'current-time-row';
        }

        html += `
            <tr ${rowId} class="${rowClass}" style="background-color: ${bgColor}">
                <td>${entry.timeString}</td>
                <td>${predictionText}</td>
                <td>${observationText}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;

    // Auto-scroll to current time or 10am (only within table container)
    setTimeout(() => {
        const tableContainer = document.querySelector('.table-container');

        if (currentTimeRowId) {
            // Scroll to current time if it exists
            const currentRow = document.getElementById(currentTimeRowId);
            if (currentRow && tableContainer) {
                const rowTop = currentRow.offsetTop;
                const containerHeight = tableContainer.clientHeight;
                const scrollPosition = rowTop - (containerHeight / 2) + (currentRow.clientHeight / 2);
                tableContainer.scrollTop = scrollPosition;
            }
        } else {
            // Scroll to 10am row for other days
            const tenAmRow = Array.from(tableBody.querySelectorAll('tr')).find(row => {
                const timeText = row.querySelector('td')?.textContent;
                return timeText && timeText.includes('10:00 AM');
            });
            if (tenAmRow && tableContainer) {
                const rowTop = tenAmRow.offsetTop;
                tableContainer.scrollTop = rowTop - 50; // Offset for header
            }
        }
    }, 100);
}

/**
 * Calculate gradient color based on tide level and accessibility
 */
function getGradientColor(tide, accessibility, maxTide, rowIndex) {
    const even = rowIndex % 2 === 0;
    const accessThreshold = 1.1;

    if (accessibility === 'accessible') {
        // Green gradient: darker green for lower tides, lighter/whiter near 1.1m for smooth transition to orange
        const normalizedTide = tide / accessThreshold; // 0 at low tide, 1 at 1.1m
        const greenValue = Math.round(100 + normalizedTide * 120); // 100-220 (always green, but lighter as tide rises)
        const whiteningValue = Math.round(normalizedTide * 100); // 0-100 (add white as approaching threshold)
        const base = even ? 0 : 10;
        return `rgb(${whiteningValue + base}, ${greenValue}, ${whiteningValue + base})`;
    } else {
        // Not accessible: gradient from light orange (just above 1.1m) to white-blue (highest tides)
        const range = maxTide - accessThreshold;
        const position = Math.min(1, (tide - accessThreshold) / range);

        if (tide <= 1.5) {
            // Orange zone for 1.1-1.5m
            const orangePosition = (tide - accessThreshold) / 0.4; // 0-1 over 0.4m range
            const orangeValue = Math.round(200 - orangePosition * 50); // 200-150
            const base = even ? 0 : -10;
            return `rgb(255, ${orangeValue + base}, 100)`;
        } else {
            // White-blue gradient for >1.5m: whiter as it approaches window
            const blueValue = Math.round(210 + position * 45); // 210-255
            const whiteValue = Math.round(255 - position * 40); // 255-215
            const base = even ? 0 : -5;
            return `rgb(${whiteValue + base}, ${whiteValue + base}, ${blueValue})`;
        }
    }
}

/**
 * Show loading spinner
 */
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('content').style.opacity = '0.5';
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.opacity = '1';
}

/**
 * Show error modal
 */
function showError(message) {
    const modal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    modal.style.display = 'flex';
}

/**
 * Hide error modal
 */
function hideError() {
    document.getElementById('error-modal').style.display = 'none';
}

/**
 * Retry after error
 */
function retryAfterError() {
    hideError();
    loadTideData();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Set up error modal buttons
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('error-close').addEventListener('click', hideError);
    document.getElementById('error-retry').addEventListener('click', retryAfterError);
});

// Export for testing
window.TideUI = {
    init,
    loadTideData,
    toggleUnit,
    navigatePreviousDay,
    navigateNextDay
};
