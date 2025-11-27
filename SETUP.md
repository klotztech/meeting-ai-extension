# Quick Setup Guide

## Step 1: Create Icons

You need to create three icon files. Here are quick options:

### Option A: Use Online Icon Generator
1. Go to https://www.favicon-generator.org/ or similar
2. Upload or create a simple icon
3. Download the 16x16, 48x48, and 128x128 versions
4. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

### Option B: Create Simple Icons
1. Create an `icons` folder in the extension directory
2. Use any image editor to create simple microphone icons
3. Export at the three required sizes

### Option C: Use Placeholder Icons
For testing, you can use any PNG images temporarily. The extension will work without proper icons, but Chrome will show a default icon.

## Step 2: Load Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `meeting-ai-extension` folder
6. Done! The extension icon should appear in your toolbar

## Step 3: Test It

1. Open a YouTube video or any page with audio
2. Click the extension icon
3. Click "Start Recording"
4. Allow microphone access if prompted
5. Let it record for a few seconds
6. Click "Stop Recording"
7. Wait for processing
8. View the transcript and summary

## Troubleshooting

### Icons Missing
- Create the `icons/` folder
- Add the three icon files (can be placeholder images for now)

### Extension Won't Load
- Check that `manifest.json` is in the root folder
- Verify all files are present
- Check the console in `chrome://extensions/` for errors

### Recording Not Working
- Make sure you're on a page with audio
- Grant microphone permissions
- Check that the meeting platform allows audio capture

## Next Steps

Once basic setup works, you can:
1. Test with actual meeting platforms (Google Meet, Zoom, etc.)
2. Integrate Whisper.js for better transcription (see README)
3. Add browser-based LLM for better summaries (see README)

