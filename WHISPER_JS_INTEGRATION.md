# Whisper.js Integration Guide for Real-Time Video Audio Transcription

## The Problem

Web Speech API can only transcribe microphone input, not MediaStreams directly. To transcribe video audio in real-time, you need **Whisper.js**.

## Solution: Integrate Whisper.js

Whisper.js allows you to transcribe audio streams directly in the browser without needing a microphone.

### Option 1: Use @xenova/transformers (Recommended)

This is the easiest way to add Whisper.js to your extension.

#### Step 1: Install Dependencies

Create a `package.json` file:

```json
{
  "name": "meeting-ai-extension",
  "version": "1.0.0",
  "dependencies": {
    "@xenova/transformers": "^2.17.0"
  }
}
```

Then run:
```bash
npm install
```

#### Step 2: Update manifest.json

Add to `manifest.json`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

#### Step 3: Create whisper-transcriber.js

Create a new file `whisper-transcriber.js`:

```javascript
import { pipeline } from '@xenova/transformers';

let transcriber = null;

export async function initializeWhisper() {
  if (transcriber) return transcriber;
  
  transcriber = await pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-tiny.en' // or whisper-small.en, whisper-base.en for better accuracy
  );
  
  return transcriber;
}

export async function transcribeAudioStream(audioStream, onTranscript) {
  if (!transcriber) {
    await initializeWhisper();
  }
  
  // Process audio stream in chunks
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(audioStream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  let audioBuffer = [];
  const CHUNK_DURATION = 3000; // 3 seconds
  let lastTranscription = Date.now();
  
  processor.onaudioprocess = async (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    audioBuffer.push(...Array.from(inputData));
    
    const now = Date.now();
    if (now - lastTranscription >= CHUNK_DURATION && audioBuffer.length > 0) {
      lastTranscription = now;
      
      // Convert to format Whisper expects
      const audioData = new Float32Array(audioBuffer);
      audioBuffer = []; // Clear buffer
      
      try {
        const result = await transcriber(audioData, {
          return_timestamps: true,
          chunk_length_s: 30,
        });
        
        if (result && result.text) {
          onTranscript(result.text);
        }
      } catch (error) {
        console.error('Whisper transcription error:', error);
      }
    }
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
  
  return { processor, audioContext };
}
```

#### Step 4: Update popup.js

In `popup.js`, import and use:

```javascript
import { transcribeAudioStream } from './whisper-transcriber.js';

// In startRealtimeTranscription function:
async function startRealtimeTranscription(audioStream) {
  // Use Whisper.js for real-time transcription
  const { processor, audioContext } = await transcribeAudioStream(
    audioStream,
    (transcript) => {
      recordingState.realtimeTranscript += '[VIDEO] ' + transcript + ' ';
      if (realtimeTranscript) {
        realtimeTranscript.innerHTML = recordingState.realtimeTranscript
          .replace(/\[MIC\]/g, '<span style="color: #667eea;">[MIC]</span>')
          .replace(/\[VIDEO\]/g, '<span style="color: #4caf50;">[VIDEO]</span>');
        realtimeTranscript.scrollTop = realtimeTranscript.scrollHeight;
      }
    }
  );
  
  recordingState.whisperProcessor = processor;
  recordingState.whisperAudioContext = audioContext;
}
```

### Option 2: Use whisper.cpp WebAssembly

This is more complex but gives you more control.

1. Download whisper.cpp WASM files
2. Load the model
3. Process audio chunks

See: https://github.com/ggerganov/whisper.cpp/tree/master/examples/whisper-wasm

## Current Workaround

Until Whisper.js is integrated, the extension uses:
- **Web Speech API** for microphone transcription (real-time)
- **Chunk-based processing** for video audio (plays audio and transcribes via mic)

This works but has limitations:
- Requires speakers to be on
- May have feedback/echo
- Not as accurate as Whisper.js

## Quick Start with Transformers.js

1. **Install:**
   ```bash
   npm install @xenova/transformers
   ```

2. **Bundle for extension:**
   ```bash
   npm install -D webpack webpack-cli
   npx webpack --mode production
   ```

3. **Update popup.js** to use Whisper.js instead of Web Speech API for video audio

## Model Sizes

- `whisper-tiny.en` - ~75MB, fastest, lower accuracy
- `whisper-small.en` - ~244MB, good balance
- `whisper-base.en` - ~142MB, better accuracy
- `whisper-medium.en` - ~769MB, best accuracy (slower)

For browser use, start with `whisper-tiny.en` or `whisper-small.en`.

## Performance Notes

- First load will download the model (one-time)
- Transcription happens in the browser (no server needed)
- Uses WebAssembly for fast processing
- May use significant CPU/RAM

## Need Help?

See the transformers.js documentation: https://huggingface.co/docs/transformers.js

