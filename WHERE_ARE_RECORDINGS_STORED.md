# Where Are My Recordings Stored?

## Storage Location

Your meeting recordings are stored in **Chrome's Local Storage** (browser storage), not as files on your computer by default.

### How to Access Your Recordings

#### Method 1: Download from Extension (Easiest)

1. After recording, click the **"🎵 Download Audio"** button in the extension popup
2. The audio file will be saved to your Downloads folder
3. File format: `meeting-recording-YYYY-MM-DD-HHMMSS.webm`
4. You can play it with any media player that supports WebM format

#### Method 2: Access Chrome Storage Directly

1. Open Chrome DevTools (F12)
2. Go to **Application** tab (or **Storage** in older Chrome)
3. Expand **Local Storage**
4. Click on `chrome-extension://[your-extension-id]`
5. Look for `recordingBlob` key
6. The value is base64-encoded audio data

**Note:** This method is technical and not recommended for regular use.

### Storage Details

- **Storage Type:** Chrome Local Storage
- **Format:** Base64-encoded WebM audio
- **Size Limit:** Chrome Local Storage has a ~10MB limit per extension
- **Persistence:** Recordings persist until:
  - You clear browser data
  - You uninstall the extension
  - Storage limit is exceeded

### Important Notes

⚠️ **Recordings are NOT automatically saved as files** - they're stored in browser memory.

⚠️ **Storage is limited** - If you record many long meetings, you may hit the storage limit.

✅ **Download your recordings** - Use the "Download Audio" button to save recordings as files.

✅ **Clear old recordings** - After downloading, you can clear storage to free up space.

## How to Download Your Recording

### From the Extension UI:

1. Complete a recording
2. Wait for processing to finish
3. Click **"🎵 Download Audio"** button
4. File will be saved to your Downloads folder

### If the Button Doesn't Work:

1. Go to `chrome://extensions/`
2. Find "AI Meeting Recorder"
3. Click "Inspect views: popup"
4. In the Console, run:

```javascript
// Get the recording from storage
chrome.storage.local.get(["recordingBlob"], (result) => {
  if (result.recordingBlob) {
    // Convert base64 to blob
    const byteCharacters = atob(result.recordingBlob);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "audio/webm" });

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.webm";
    a.click();
    URL.revokeObjectURL(url);
  }
});
```

## Why Transcription is Incomplete

### The Problem:

The **Web Speech API** (used for transcription) is designed for **real-time speech recognition**, NOT for transcribing pre-recorded audio files. This is why:

- Only the first few seconds get transcribed
- Most of your recording is missing from the transcript
- It's not a bug - it's a limitation of the API

### The Solution:

You need to use **Whisper.js** for proper transcription of recorded audio:

1. **Whisper.js Integration** (Recommended)

   - See README.md for setup instructions
   - Works offline
   - Handles long recordings
   - High accuracy

2. **External Tools** (Alternative)
   - Download your audio file
   - Use OpenAI Whisper (command line)
   - Use Google Cloud Speech-to-Text
   - Use Azure Speech Services

## File Format

- **Format:** WebM (audio only)
- **Codec:** Opus
- **Extension:** `.webm`
- **Playback:** Works in Chrome, Firefox, VLC, and most modern media players

## Converting to Other Formats

If you need MP3 or WAV format:

1. **Online Converters:**

   - CloudConvert.com
   - Online-Convert.com
   - Zamzar.com

2. **Desktop Software:**

   - VLC Media Player (Convert/Save)
   - FFmpeg (command line)
   - Audacity

3. **FFmpeg Command:**

```bash
# Convert to MP3
ffmpeg -i recording.webm recording.mp3

# Convert to WAV
ffmpeg -i recording.webm recording.wav
```

## Clearing Old Recordings

To free up storage space:

1. **Download all recordings first** (important!)
2. Go to `chrome://extensions/`
3. Find "AI Meeting Recorder"
4. Click "Details"
5. Scroll to "Storage"
6. Click "Clear storage" or "Clear site data"

**Warning:** This will delete all stored recordings. Make sure you've downloaded them first!

## Troubleshooting

### "Download Audio button doesn't work"

- Make sure you've completed a recording
- Check browser console for errors
- Try the manual download method above

### "Recording is missing"

- Check if storage limit was exceeded
- Recordings are stored in memory - if browser was closed, they may be lost
- Always download important recordings immediately

### "Can't play the audio file"

- WebM format requires a compatible player
- Use VLC Media Player (free, works everywhere)
- Or convert to MP3 using online tools

## Best Practices

1. ✅ **Download recordings immediately** after important meetings
2. ✅ **Use Whisper.js** for proper transcription
3. ✅ **Clear old recordings** regularly to free up space
4. ✅ **Backup important recordings** to cloud storage or external drive
5. ✅ **Convert to MP3** if you need compatibility with older devices

---

**Need help?** Check the README.md for more information about Whisper.js integration.
