# Demo Environment Usage Example

**Feature**: Browser-Accessible Demo Environment (005-chromeos-testing-setup)
**Date**: 2026-01-16

## Overview

This document demonstrates how to use the browser-accessible demo environment for testing Debrief on ChromeOS or any device with a web browser.

## Accessing the Demo

### Step 1: Navigate to Demo URL

Open your browser and go to:

```
https://debrief-demo.fly.dev
```

The noVNC connection page will load.

### Step 2: Connect to Desktop

1. Click the "Connect" button
2. Enter the VNC password when prompted
3. The XFCE desktop will appear in your browser

## Using the Demo Environment

### Opening a Sample File

1. **Open File Manager**: Click the file manager icon in the panel
2. **Navigate to Documents**: Open the "Documents" folder
3. **Open Debrief Samples**: Open the "Debrief Samples" folder
4. **Open a REP File**:
   - Right-click on `example-track.rep`
   - Select "Open in Debrief"
5. **View in VS Code**: VS Code will launch with the Debrief extension

### Testing File Associations

The demo has file associations configured for:
- `.rep` files - Debrief REP (Replay) format

Right-clicking any `.rep` file shows "Open in Debrief" in the context menu.

## Screenshots

### Desktop View
*Note: Screenshot to be captured after deployment*

The XFCE desktop shows:
- File manager icon in the panel
- Documents folder with sample files
- Clean, minimal desktop for testing

### File Manager with Samples
*Note: Screenshot to be captured after deployment*

The Documents folder contains:
- Debrief Samples/
  - example-track.rep
  - (additional sample files)

### VS Code with Debrief Extension
*Note: Screenshot to be captured after deployment*

When opening a REP file:
- VS Code launches automatically
- Debrief extension activates
- Maritime analysis view displays track data

## Tips for Testers

1. **Connection Issues**: If noVNC shows "Disconnected", wait 30s for cold start
2. **Slow Response**: First connection may take 30-60s if container was suspended
3. **Password**: Contact the development team for the current password
4. **Resolution**: noVNC adapts to your browser window size
5. **Clipboard**: Use the noVNC sidebar for copy/paste between local and remote

## Technical Details

| Component | Value |
|-----------|-------|
| Demo URL | https://debrief-demo.fly.dev |
| Container | linuxserver/webtop:ubuntu-xfce |
| Desktop | XFCE 4.x |
| File Manager | Thunar |
| Code Editor | VS Code |
| VNC Port | 3000 (via noVNC) |
| Region | London (lhr) |

## Feedback

Please report any issues or suggestions:
- GitHub Issues: https://github.com/debrief/debrief-future/issues
- Include: Browser, OS, steps to reproduce
