# Shady Island Tides

A mobile-first tide information application for planning beach access to Shady Island in Steveston, Richmond BC.

## Overview

Shady Island is accessible via a weir that is only exposed at low tide (approximately 1.1m or less). This application helps users determine when the island is accessible by displaying real-time tide predictions and observations from the DFO (Department of Fisheries and Oceans) API.

## Features

### Phase 1 (Current)

- **Current Status**: Real-time indication of island accessibility
- **Countdown Timer**: Time until next access window opens/closes
- **Tide Trend**: Rising or falling tide indicator
- **High/Low Tides**: Daily high and low tide times prominently displayed
- **Access Windows**: Time ranges when the island is accessible
- **Tide Schedule**: 15-minute interval tide predictions and observations (full 24-hour view)
- **Color Coding**: Auto-gradient system indicating tide accessibility levels
  - Green gradient: Accessible (≤1.1m) - darker green for lower/safer tides
  - Orange zone: Marginally accessible (1.1-1.5m)
  - Blue-white gradient: Not accessible (>1.5m)
- **Unit Toggle**: Switch between meters and feet
- **Real-Time Header**: Always displays current status regardless of date being viewed
- **Mobile-First Design**: Optimized for viewing on mobile devices in bright outdoor conditions
- **Date Navigation**: View tide information for any date
- **Smart Caching**: Predictions cached for 24 hours, observations for 15 minutes

### Phase 2 (Planned)

See [CLAUDE.MD](CLAUDE.MD) for future enhancements including:
- Multi-location support (Sand Heads Lighthouse)
- Tide charts and graphs
- Weather integration
- Sunrise/sunset times
- Historical comparisons
- Notifications/alerts
- PWA capabilities

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **No frameworks**: Vanilla JS for simplicity and performance
- **API**: DFO-MPO Water Level API
- **Caching**: In-memory browser caching
- **Deployment**: GitHub Pages ready

## Project Structure

```
/home/robbie/ShadyTimes/
├── index.html                  # Main application entry point
├── styles/
│   └── main.css               # Mobile-first responsive styles
├── scripts/
│   ├── api.js                 # DFO API client with caching
│   ├── tides.js               # Tide calculations and logic
│   └── ui.js                  # UI controller and interactions
├── prototypes/
│   └── ShadyTides2.html       # Original prototype (reference)
├── CLAUDE.MD                   # Full project specification
└── README.md                   # This file
```

## Usage

### Running Locally

Simply open `index.html` in a modern web browser (Chrome recommended).

Or use a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server
```

Then navigate to `http://localhost:8000`

### Deploying to GitHub Pages

1. Push the repository to GitHub
2. Go to Settings > Pages
3. Select branch and root directory
4. Save and wait for deployment

## API Information

**Data Source**: DFO-MPO (Fisheries and Oceans Canada)

- **Station ID**: `5cebf1e13d0f4a073c4bbf8c` (Steveston, BC)
- **Predictions Endpoint**: Water level predictions (wlp)
- **Observations Endpoint**: Water level observations (wlo)
- **Update Frequency**: Observations update every 15 minutes

## Accessibility Thresholds

- **≤1.1m (≤3'7")**: Accessible - weir is exposed
- **>1.1m (>3'7")**: Not accessible - weir is submerged

The color gradient provides visual feedback with darker green indicating lower/safer tides.

## Browser Support

- Chrome (recommended)
- Safari (iOS/macOS)
- Firefox
- Edge

Minimum: Modern browsers with ES6+ support

## Performance

- **Caching Strategy**:
  - Predictions: 24 hours (they don't change)
  - Observations: 15 minutes (updated frequently)
- **Smart Scrolling**: Auto-scrolls to current time on today's date, 10am for other dates
- **Efficient Loading**: Parallel data fetching for faster page loads
- **Responsive**: Fast loading even on slower mobile connections

## Development

### Making Changes

1. Edit source files in `scripts/` or `styles/`
2. Test in browser
3. Clear cache if needed (Ctrl+Shift+R / Cmd+Shift+R)

### Adding Features

Refer to [CLAUDE.MD](CLAUDE.MD) for the full specification and Phase 2 roadmap.

## License

Personal project for beach access planning. Data provided by DFO-MPO.

## Credits

- **Data**: [DFO-MPO Canada](https://www.dfo-mpo.gc.ca)
- **Location**: Shady Island, Steveston, Richmond BC
- **Version**: 1.0.0 (Phase 1)

## Support

For issues or questions about the application, refer to the project documentation in [CLAUDE.MD](CLAUDE.MD).
