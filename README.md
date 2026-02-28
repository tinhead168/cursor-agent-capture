# Cursor Agent Capture

One-click export of Cursor agent sessions to structured JSON.

## What it does
- Extracts agent name, work time, files changed, git info, and chat content
- Exports the currently open cursor.com/agents page into a downloadable JSON file
- Shows visual confirmation toast on the page
- Runs locally in your browser (no server, no analytics)

## Install (developer mode)
1) Open `chrome://extensions`
2) Enable **Developer mode**
3) Click **Load unpacked**
4) Select this folder

## Use
1) Open any cursor.com/agents page
2) Click the extension icon
3) JSON file downloads automatically (named `Agent-Name_timestamp.json`)

## Permissions (why they exist)
- `activeTab`: read the current agent page you are viewing
- `scripting`: inject the scraper into the page

## Privacy
- No accounts, no analytics, no telemetry
- No data leaves your machine
- Exports only what is already visible in the page

## License
MIT
