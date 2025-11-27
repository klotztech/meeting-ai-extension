# How to Enable Microphone Permissions for AI Meeting Recorder

Follow these steps to grant microphone permissions to the extension:

## Method 1: Through Chrome Extensions Page (Recommended)

1. **Open Chrome Extensions Page**

   - Type `chrome://extensions/` in the address bar and press Enter
   - OR click the three dots menu (⋮) → More tools → Extensions

2. **Find the Extension**

   - Look for "AI Meeting Recorder" in the list
   - Make sure it's enabled (toggle switch is ON)

3. **Open Extension Details**

   - Click on "Details" button under the extension

4. **Check Permissions**

   - Scroll down to the "Permissions" section
   - Look for "Microphone" permission
   - If it's not listed or shows as "Not allowed", continue to step 5

5. **Grant Microphone Permission**
   - Click on "Site settings" or "Permissions"
   - Look for microphone settings
   - OR when you click "Start Recording", Chrome will prompt you
   - Click "Allow" when prompted

## Method 2: Through Chrome Settings

1. **Open Chrome Settings**

   - Click the three dots menu (⋮) → Settings
   - OR type `chrome://settings/` in the address bar

2. **Go to Privacy and Security**

   - Click "Privacy and security" in the left sidebar
   - Click "Site settings"

3. **Find Microphone Settings**

   - Scroll down and click "Microphone"
   - OR search for "microphone" in the settings search bar

4. **Check Extension Permissions**
   - Look for your extension in the list
   - Make sure it's set to "Allow"
   - If it's blocked, click on it and change to "Allow"

## Method 3: When Starting Recording (Easiest)

1. **Start a Recording**

   - Open a meeting (Google Meet, Zoom, etc.)
   - Click the extension icon
   - Click "Start Recording"

2. **Allow Permission Prompt**
   - Chrome will show a popup asking for microphone permission
   - Click "Allow" in the popup
   - The recording will start automatically

## Troubleshooting

### If you don't see the permission prompt:

1. **Check if microphone is already blocked**

   - Go to `chrome://settings/content/microphone`
   - Look for "AI Meeting Recorder" in the "Block" list
   - If it's there, click the trash icon to remove it
   - Try recording again

2. **Check system-level microphone permissions**

   - **Windows**: Settings → Privacy → Microphone → Make sure Chrome is allowed
   - **Mac**: System Preferences → Security & Privacy → Microphone → Check Chrome
   - **Linux**: Check your system's privacy settings

3. **Reload the extension**
   - Go to `chrome://extensions/`
   - Find "AI Meeting Recorder"
   - Click the reload icon (circular arrow)
   - Try recording again

### If microphone permission is granted but still not working:

1. **Check if another app is using the microphone**

   - Close other apps that might be using the microphone
   - Try recording again

2. **Check Chrome's microphone access**

   - Go to `chrome://settings/content/microphone`
   - Make sure "Ask before accessing" is enabled (not blocked)

3. **Test microphone in Chrome**
   - Go to any website that uses microphone (like Google Meet)
   - Try to use the microphone there
   - If it works there, the extension should work too

## Important Notes

- **Microphone permission is needed for:**

  - Recording your voice during meetings
  - Transcribing audio using Web Speech API

- **Tab audio (meeting participants) is recorded automatically** - no additional permissions needed

- **If you prefer not to grant microphone permissions:**
  - You can still record meeting audio (tab audio)
  - You just won't be able to transcribe using Web Speech API
  - Consider integrating Whisper.js for offline transcription (see README.md)

## Still Having Issues?

1. Check the browser console for errors:

   - Right-click the extension icon → Inspect popup
   - Check the Console tab for error messages

2. Make sure you're using a recent version of Chrome (88+)

3. Try restarting Chrome completely

4. If nothing works, consider using Whisper.js integration (see README.md) which doesn't require microphone permissions
