# Zena Sidekick Extension

**Universal Session Bridge for Zena**

This Chrome extension captures user sessions from any web-based software and bridges them to Zena's backend for intelligent data synthesis.

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `packages/extension` folder

## How It Works

### Automatic Capture
1. Register a domain for auto-capture via the popup
2. Navigate to that site and log in normally
3. The extension detects the login and captures:
   - Session cookies
   - Page DOM (for AI analysis)
   - Page URL and title

### Manual Capture
1. Log in to any site
2. Click the Zena Sidekick icon
3. Click "Bridge This Site"

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension configuration |
| `background.js` | Service worker for cookie capture and API communication |
| `content.js` | Login detection and DOM capture |
| `popup.html` | Extension popup UI |
| `popup.js` | Popup interaction logic |

## Backend API

The extension communicates with these endpoints:

- `POST /api/connections/capture-session` - Send captured session
- `GET /api/connections/sessions` - Get list of bridged domains

## Next Steps

- **Phase 3**: AI analyzes captured DOM to identify data fields
- **Phase 4**: Cloud Robot uses sessions for ongoing data extraction
