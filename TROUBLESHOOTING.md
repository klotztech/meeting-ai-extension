# Troubleshooting Guide

## Error: "chrome.tabCapture.capture is not a function"

If you see this error, follow these steps:

### Step 1: Reload the Extension
1. Go to `chrome://extensions/`
2. Find "AI Meeting Recorder" extension
3. Click the **reload icon** (circular arrow) on the extension card
4. Wait for it to reload completely

### Step 2: Verify Permissions
1. In `chrome://extensions/`, click **Details** on the extension
2. Scroll down to **Permissions**
3. Make sure you see:
   - ✅ Tab capture
   - ✅ Active tab
   - ✅ Storage
   - ✅ Tabs

### Step 3: Check Developer Mode
1. Make sure **Developer mode** is enabled (toggle in top-right of `chrome://extensions/`)
2. If it wasn't enabled, enable it and reload the extension

### Step 4: Test Again
1. Open a Google Meet, Zoom, or Teams meeting
2. Make sure the meeting tab is **active** (click on it)
3. Click the extension icon
4. Click "Start Recording"

### Step 5: If Still Not Working

**Option A: Remove and Re-add Extension**
1. Remove the extension completely
2. Close all Chrome windows
3. Reopen Chrome
4. Load the extension again as a new extension

**Option B: Check Chrome Version**
- Make sure you're using Chrome 88 or later (Manifest V3 requires newer Chrome)
- Go to `chrome://version/` to check your version

**Option C: Check Console for Errors**
1. Go to `chrome://extensions/`
2. Click **Service worker** link under the extension (if available)
3. Check the console for any errors
4. Also check the popup console:
   - Right-click the extension icon → Inspect popup
   - Check the Console tab for errors

### Common Issues

**"Tab capture API not available"**
- The extension needs to be reloaded
- Make sure Developer mode is enabled
- Try removing and re-adding the extension

**"Failed to capture tab audio"**
- Make sure you're on a meeting page with active audio
- The meeting tab must be the active tab
- Some meeting platforms may block audio capture - try a different platform

**"No active tab found"**
- Make sure you have a tab open
- Try clicking on the meeting tab before starting recording

### Still Having Issues?

1. Check that all files are in the correct location
2. Verify `manifest.json` has `"tabCapture"` in permissions
3. Make sure you're not using an outdated version of the code
4. Try in an incognito window (with extension enabled for incognito)

---

**Note**: After making any changes to the extension code, you MUST reload the extension in `chrome://extensions/` for changes to take effect.

