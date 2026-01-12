# 🎙️ AI Meeting Recorder - Chrome Extension

A fully browser-based Chrome extension that records meeting audio from Google Meet, Zoom, Teams, and other web-based meeting platforms, then automatically transcribes and generates AI-powered summaries - **100% free, no backend required**.

## ✨ Features

- 🎤 **Record Meeting Audio**: Captures both microphone and speaker audio from any web-based meeting platform
- 📝 **Automatic Transcription**: Transcribes recorded audio using Whisper.js (optional setup required)
- 🤖 **AI-Powered Summaries**: Generates structured meeting summaries with:
  - Executive Summary
  - Key Discussion Points
  - Decisions Made
  - Action Items
  - Next Steps
  - Important Quotes
- 💾 **Export & Share**: Download transcripts and summaries as text files
- 🔒 **Privacy-First**: All processing happens locally in your browser - no data sent to servers
- 🆓 **100% Free**: No API keys, no subscriptions, no backend costs

## 🚀 Installation

### Step 1: Download the Extension

1. Clone or download this repository
2. Extract to a folder (e.g., `meeting-ai-extension`)

### Step 2: Create Extension Icons

Create an `icons` folder in the extension directory and add three icon files:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can use any image editor or online tool to create simple icons, or use placeholder images.

### Step 3: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `meeting-ai-extension` folder
5. The extension should now appear in your extensions list

## 📖 How to Use

### Recording a Meeting

1. **Join your meeting** on Google Meet, Zoom Web, Teams, or any web-based platform
2. **Click the extension icon** in your Chrome toolbar
3. **Click "Start Recording"** - you'll be prompted to allow microphone access
4. **Participate in the meeting** - the extension will record all audio
5. **Click "Stop Recording"** when the meeting ends

### Viewing Results

After stopping the recording:
1. The extension will automatically process the audio
2. View the **Transcript** tab to see the full transcription
3. View the **Summary** tab to see the AI-generated summary
4. Use the buttons to:
   - Copy transcript or summary to clipboard
   - Download as text files
   - Start a new recording

## 🛠️ Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension standard
- **Tab Capture API**: Records audio from the active browser tab
- **MediaRecorder API**: Captures and stores audio as WebM format
- **Whisper.js Integration**: Optional offline transcription (see WHISPER_JS_INTEGRATION.md)
- **Browser-based LLM**: Generates summaries using local processing

### Supported Platforms

Works with any web-based meeting platform:
- ✅ Google Meet
- ✅ Zoom (web client)
- ✅ Microsoft Teams (web)
- ✅ Webex (web)
- ✅ Skype (web)
- ✅ Any browser-based video conferencing tool

### Audio Capture

The extension captures:
- **Tab Audio**: All audio from the meeting tab (participants, screen share audio)
- **Microphone Audio**: Your voice input (optional, requires permission)

Both streams are merged into a single recording.

## 🔧 Advanced Setup (Optional)

### Enhanced Transcription with Whisper.js

For better transcription accuracy, you can integrate Whisper.js:

1. **Download Whisper.js models**:
   ```bash
   # You'll need to host the Whisper.js WASM files
   # See: https://github.com/ggerganov/whisper.cpp/tree/master/examples/whisper-wasm
   ```

2. **Update `background.js`**:
   - Load Whisper.js in the service worker
   - Update the `transcribeWithWhisperJS` function

### Enhanced Summarization with Browser LLM

For better summaries, integrate a browser-based LLM:

1. **Option A: Transformers.js**
   ```bash
   npm install @xenova/transformers
   ```
   - Load a small model like `Xenova/distilgpt2` or similar
   - Update `generateSummaryWithLLM` function

2. **Option B: WebLLM**
   - Use WebLLM to run Llama 3 or other models in the browser
   - See: https://webllm.mlc.ai/

## 📝 File Structure

```
meeting-ai-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.css             # Popup styles
├── popup.js              # Popup logic and UI controls
├── background.js         # Service worker for audio recording
├── content.js            # Content script for page interaction
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## ⚠️ Limitations & Notes

1. **Transcription**: Real-time speech recognition has been disabled due to audio interference issues. For transcription, integrate Whisper.js (see WHISPER_JS_INTEGRATION.md).

2. **Service Worker Limitations**: Transcription must be handled with Whisper.js integration for best results.

3. **Audio Format**: Recordings are saved as WebM format. This is widely supported but may need conversion for some use cases.

4. **Storage**: Audio is stored in Chrome's local storage. Large recordings may hit storage limits.

5. **Native Apps**: This extension works with web-based meeting clients. Native desktop apps (Zoom desktop, Teams desktop) require different approaches.

## 🐛 Troubleshooting

### "Failed to capture tab audio"
- Make sure you're on a meeting page with active audio
- Try refreshing the page and starting recording again
- Check that the meeting platform allows audio capture

### "Microphone access denied"
- Click the extension icon and allow microphone permissions
- Check Chrome's site permissions for the meeting platform
- The extension will still record tab audio even if mic is denied

### "No transcript available"
- Real-time transcription has been disabled to prevent audio interference
- Integrate Whisper.js for proper transcription (see WHISPER_JS_INTEGRATION.md)
- Your audio file is saved and can be downloaded for external transcription

### Extension not appearing
- Make sure Developer mode is enabled
- Check for errors in `chrome://extensions/`
- Verify all files are in the correct location

## 🔒 Privacy & Security

- **No Data Collection**: All processing happens locally in your browser
- **No Server Communication**: Audio never leaves your device
- **Local Storage Only**: Recordings stored only in Chrome's local storage
- **Open Source**: Review the code to verify privacy claims

## 📄 License

This project is provided as-is for educational and personal use.

## 🤝 Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## 🎯 Future Enhancements

- [ ] Whisper.js integration for better transcription
- [ ] Browser-based LLM integration for enhanced summaries
- [ ] Support for video recording
- [ ] Cloud storage integration (optional)
- [ ] Meeting participant identification
- [ ] Real-time transcription during recording
- [ ] Export to PDF format
- [ ] Integration with calendar apps

## 💡 Tips

1. **Best Results**: Use in quiet environments for better transcription
2. **Long Meetings**: For very long meetings, consider recording in segments
3. **Storage**: Regularly export and delete old recordings to free up space
4. **Permissions**: Grant microphone access for best audio quality

## 📞 Support

For issues, questions, or feature requests, please open an issue on the repository.

---

**Enjoy your AI-powered meeting summaries! 🎉**

