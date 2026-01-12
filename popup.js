// Popup UI Controller
let recordingState = {
  isRecording: false,
  startTime: null,
  timerInterval: null,
  audioBlob: null, // Store the audio blob for download
  transcript: null,
  realtimeTranscript: '', // Store real-time transcript
  summary: null,
  mediaRecorder: null,
  audioChunks: [],
  audioContext: null,
  analyser: null,
  tabStream: null,
  micStream: null
};

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
const statusIndicator = document.querySelector('.status-dot');
const timer = document.getElementById('timer');
const recordingInfo = document.getElementById('recordingInfo');
const recordingControls = document.getElementById('recordingControls');
const processingSection = document.getElementById('processingSection');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const transcriptContent = document.getElementById('transcriptContent');
const summaryContent = document.getElementById('summaryContent');
const progressFill = document.getElementById('progressFill');
const processingText = document.getElementById('processingText');
const audioLevel = document.getElementById('audioLevel');
// Real-time transcript element removed

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
  });
});

// Start Recording
startBtn.addEventListener('click', async () => {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      showError('No active tab found. Please open a meeting tab first.');
      return;
    }

    // Step 1: Get media stream ID from background
    chrome.runtime.sendMessage({
      action: 'startRecording',
      tabId: tab.id
    }, async (response) => {
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }

      if (!response || !response.success) {
        showError(response?.error || 'Failed to get stream ID');
        return;
      }

      const streamId = response.streamId;

      if (!streamId) {
        showError('Failed to get stream ID. Please try again.');
        return;
      }

      // Step 2: Use streamId to get tab audio stream (must be done in popup, not service worker)
      try {
        await startRecordingInPopup(streamId, tab.id);
      } catch (error) {
        console.error('Recording start error:', error);
        showError(`Failed to start recording: ${error.message}`);
        // Reset UI state
        recordingState.isRecording = false;
        updateUI('ready');
      }
    });
  } catch (error) {
    showError(`Error starting recording: ${error.message}`);
  }
});

// Start recording in popup context (where getUserMedia is available)
async function startRecordingInPopup(streamId, tabId) {
  try {
    // Get tab audio stream using the streamId
    // Chrome requires specific constraint format for tab capture
    const constraints = {
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      video: false
    };

    let tabStream;
    try {
      tabStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Failed to get tab audio stream:', error);

      // Handle specific error: tab already has active stream
      if (error.message.includes('active stream') || error.name === 'NotAllowedError' || error.message.includes('Cannot capture')) {
        throw new Error(`Cannot capture tab audio: The meeting tab may already be using the microphone/camera. ` +
          `Please try: 1) Refresh the meeting page, 2) Make sure no other extension is recording, ` +
          `3) Close and reopen the meeting tab, then try again.`);
      }

      throw new Error(`Failed to capture tab audio: ${error.message}. Make sure the meeting tab is active and has audio.`);
    }

    if (!tabStream || tabStream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks found in tab stream');
    }

    // Get microphone audio
    let micStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (error) {
      console.warn('Microphone access denied, recording tab audio only:', error);
      // Continue with just tab audio
    }

    // Merge audio streams
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // Add tab audio
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    tabSource.connect(destination);

    // Add mic audio if available
    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
    }

    // Create merged stream
    const mergedStream = destination.stream;

    // Set up audio analysis for level monitoring
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(mergedStream);
    source.connect(analyser);

    // Create MediaRecorder with better settings for complete recording
    const mediaRecorder = new MediaRecorder(mergedStream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    const audioChunks = [];
    let recordingComplete = false;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
        console.log(`Audio chunk received: ${event.data.size} bytes, total chunks: ${audioChunks.length}`);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('MediaRecorder stopped, processing chunks...');

      // Wait a bit to ensure all chunks are collected
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create blob from all chunks
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log(`Total audio blob size: ${audioBlob.size} bytes, chunks: ${audioChunks.length}`);

      if (audioBlob.size === 0) {
        console.error('Warning: Audio blob is empty!');
      }

      // Store the blob in recordingState for download
      recordingState.audioBlob = audioBlob;

      // Convert blob to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        chrome.storage.local.set({ recordingBlob: base64data }, () => {
          console.log('Recording saved to storage, size:', base64data.length, 'characters');
        });
      };
      reader.onerror = () => {
        console.error('Error reading audio blob');
      };
      reader.readAsDataURL(audioBlob);

      // Clean up streams
      tabStream.getTracks().forEach(track => {
        track.stop();
        console.log('Tab stream track stopped');
      });
      if (micStream) {
        micStream.getTracks().forEach(track => {
          track.stop();
          console.log('Mic stream track stopped');
        });
      }
      audioContext.close().then(() => {
        console.log('AudioContext closed');
      }).catch(err => {
        console.error('Error closing AudioContext:', err);
      });

      recordingComplete = true;
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      showError('Recording error occurred: ' + (event.error?.message || 'Unknown error'));
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      showError('Recording error occurred');
    };

    // Verify MediaRecorder is ready
    if (!mediaRecorder) {
      throw new Error('Failed to create MediaRecorder');
    }

    // Start recording with timeslice to ensure all data is captured
    // Using 100ms intervals for more reliable chunk collection
    try {
      if (mediaRecorder.state === 'inactive') {
        mediaRecorder.start(100); // Collect data every 100ms for better reliability
        console.log('MediaRecorder started, state:', mediaRecorder.state);
      } else {
        throw new Error('MediaRecorder is not in inactive state');
      }
    } catch (error) {
      // Clean up on failure
      tabStream.getTracks().forEach(track => track.stop());
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      audioContext.close();
      throw new Error(`Failed to start MediaRecorder: ${error.message}`);
    }

    // Store state ONLY after successful start
    recordingState.isRecording = true;
    recordingState.startTime = Date.now();
    recordingState.mediaRecorder = mediaRecorder;
    recordingState.audioChunks = audioChunks;
    recordingState.audioContext = audioContext;
    recordingState.analyser = analyser;
    recordingState.tabStream = tabStream;
    recordingState.micStream = micStream;

    // Notify background of recording status
    chrome.runtime.sendMessage({
      action: 'setRecordingStatus',
      isRecording: true,
      startTime: recordingState.startTime
    }).catch(() => {
      // Ignore if background is not available
    });

    // Start audio level monitoring
    monitorAudioLevel();

    // Real-time transcription disabled
    // startRealtimeTranscription(micStream || tabStream);

    // Update UI
    updateUI('recording');
    startTimer();

    console.log('Recording started successfully');

  } catch (error) {
    console.error('Error starting recording:', error);
    // Reset state on error
    recordingState.isRecording = false;
    recordingState.mediaRecorder = null;
    updateUI('ready');
    throw error;
  }
}

// Monitor audio levels
function monitorAudioLevel() {
  if (!recordingState.analyser) return;

  const dataArray = new Uint8Array(recordingState.analyser.frequencyBinCount);

  function checkLevel() {
    if (!recordingState.isRecording || !recordingState.analyser) {
      return;
    }

    recordingState.analyser.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const level = Math.min(100, (average / 255) * 100);

    // Update UI
    updateAudioLevel(level);

    // Continue monitoring
    if (recordingState.isRecording) {
      setTimeout(checkLevel, 100);
    }
  }

  checkLevel();
}

// Real-time transcription disabled - it was causing audio muting issues
// function startRealtimeTranscription(audioStream) {
//   ... removed speech recognition code ...
// }

// function stopRealtimeTranscription() {
//   ... removed speech recognition code ...
// }

// Stop Recording
stopBtn.addEventListener('click', async () => {
  try {
    // Check if we have a valid MediaRecorder
    if (!recordingState.mediaRecorder) {
      // Reset UI state if recorder doesn't exist
      recordingState.isRecording = false;
      resetUI();
      showError('No active recording to stop. Please start a new recording.');
      return;
    }

    // Check MediaRecorder state
    if (recordingState.mediaRecorder.state === 'inactive') {
      recordingState.isRecording = false;
      resetUI();
      showError('Recording is already stopped.');
      return;
    }

    console.log('Stopping recording, current state:', recordingState.mediaRecorder.state);

    // Stop the recording properly
    recordingState.mediaRecorder.stop();
    recordingState.isRecording = false;
    stopTimer();

    // Notify background
    chrome.runtime.sendMessage({
      action: 'setRecordingStatus',
      isRecording: false
    }).catch(() => {
      // Ignore if background is not available
    });

    updateUI('processing');

    // Wait longer for all chunks to be collected and blob to be saved
    // MediaRecorder needs time to finalize all chunks
    setTimeout(async () => {
      const audioData = await getAudioFromStorage();
      if (audioData && audioData.size > 0) {
        console.log('Audio data retrieved, size:', audioData.size, 'bytes');
        await processRecording(audioData);
      } else {
        console.error('No audio data found or data is empty');
        showError('No audio data found. The recording may have been too short or failed. Please try recording again.');
        updateUI('ready');
      }
    }, 1000); // Increased wait time to ensure all chunks are processed
  } catch (error) {
    console.error('Error stopping recording:', error);
    showError(`Error stopping recording: ${error.message}`);
    // Reset state on error
    recordingState.isRecording = false;
    updateUI('ready');
  }
});

// New Recording
document.getElementById('newRecording').addEventListener('click', () => {
  resetUI();
});

// Copy buttons
document.getElementById('copyTranscript').addEventListener('click', () => {
  copyToClipboard(transcriptContent.textContent);
});

document.getElementById('copySummary').addEventListener('click', () => {
  copyToClipboard(summaryContent.textContent);
});

// Download buttons
document.getElementById('downloadAudio').addEventListener('click', () => {
  if (recordingState.audioBlob) {
    downloadAudio(recordingState.audioBlob);
  } else {
    // Try to get from storage
    getAudioFromStorage().then(blob => {
      if (blob) {
        downloadAudio(blob);
      } else {
        showError('No audio recording found. Please record a meeting first.');
      }
    });
  }
});

document.getElementById('downloadTranscript').addEventListener('click', () => {
  downloadText(transcriptContent.textContent, 'transcript.txt');
});

document.getElementById('downloadSummary').addEventListener('click', () => {
  downloadText(summaryContent.textContent, 'summary.txt');
});

// Error dismiss
document.getElementById('dismissError').addEventListener('click', () => {
  errorSection.classList.add('hidden');
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'recordingStatus') {
    if (message.isRecording) {
      recordingState.isRecording = true;
      updateUI('recording');
      if (!recordingState.timerInterval) {
        startTimer();
      }
    }
  } else if (message.type === 'audioLevel') {
    updateAudioLevel(message.level);
  } else if (message.type === 'recordingError') {
    showError(message.error);
    resetUI();
  }
});

// UI Update Functions
function updateUI(state) {
  switch (state) {
    case 'ready':
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusText.textContent = 'Ready';
      statusIndicator.classList.remove('recording');
      recordingInfo.classList.add('hidden');
      recordingControls.classList.remove('hidden');
      processingSection.classList.add('hidden');
      resultsSection.classList.add('hidden');
      break;

    case 'recording':
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusText.textContent = 'Recording...';
      statusIndicator.classList.add('recording');
      recordingInfo.classList.remove('hidden');
      recordingControls.classList.remove('hidden');
      processingSection.classList.add('hidden');
      resultsSection.classList.add('hidden');
      break;

    case 'processing':
      startBtn.disabled = true;
      stopBtn.disabled = true;
      recordingControls.classList.add('hidden');
      processingSection.classList.remove('hidden');
      resultsSection.classList.add('hidden');
      errorSection.classList.add('hidden');
      break;

    case 'results':
      recordingControls.classList.add('hidden');
      processingSection.classList.add('hidden');
      resultsSection.classList.remove('hidden');
      errorSection.classList.add('hidden');
      break;
  }
}

function startTimer() {
  if (recordingState.timerInterval) {
    clearInterval(recordingState.timerInterval);
  }

  recordingState.timerInterval = setInterval(() => {
    if (recordingState.startTime) {
      const elapsed = Date.now() - recordingState.startTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      timer.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
}

function stopTimer() {
  if (recordingState.timerInterval) {
    clearInterval(recordingState.timerInterval);
    recordingState.timerInterval = null;
  }
}

function updateAudioLevel(level) {
  // level is 0-100
  audioLevel.style.width = `${level}%`;
}

function resetUI() {
  // Speech recognition disabled
  // stopRealtimeTranscription();

  recordingState = {
    isRecording: false,
    startTime: null,
    timerInterval: null,
    audioBlob: null,
    transcript: null,
    realtimeTranscript: '',
    summary: null,
    mediaRecorder: null,
    audioChunks: [],
    audioContext: null,
    analyser: null,
    tabStream: null,
    micStream: null
  };
  stopTimer();
  timer.textContent = '00:00:00';
  updateUI('ready');
  transcriptContent.textContent = '';
  summaryContent.textContent = '';
  // Real-time transcript UI removed
}

function showError(message) {
  document.getElementById('errorText').textContent = message;
  errorSection.classList.remove('hidden');
}

// Processing Functions
async function getAudioFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['recordingBlob'], (result) => {
      if (result.recordingBlob) {
        // Convert base64 back to blob
        const byteCharacters = atob(result.recordingBlob);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/webm' });
        resolve(blob);
      } else {
        resolve(null);
      }
    });
  });
}

async function processRecording(audioBlob) {
  try {
    // Step 1: Transcribe audio (speech recognition disabled)
    updateProgress(10, 'Processing transcript...');
    let transcript;

    // Transcribe audio using fallback method (Whisper.js if available)
    updateProgress(10, 'Transcribing audio...');
    transcript = await transcribeAudio(audioBlob);
    recordingState.transcript = transcript;

    // Step 2: Generate Summary
    updateProgress(60, 'Generating AI summary...');
    const summary = await generateSummary(transcript);
    recordingState.summary = summary;

    // Step 3: Display Results
    updateProgress(100, 'Complete!');
    setTimeout(() => {
      displayResults(transcript, summary);
      updateUI('results');
    }, 500);

  } catch (error) {
    showError(`Processing error: ${error.message}`);
    updateUI('ready');
  }
}

function updateProgress(percent, text) {
  progressFill.style.width = `${percent}%`;
  processingText.textContent = text;
}

async function transcribeAudio(audioBlob) {
  // IMPORTANT: Web Speech API is NOT suitable for transcribing pre-recorded audio files
  // It's designed for real-time speech recognition, not for processing recorded audio
  // For proper transcription of recorded audio, you MUST use Whisper.js

  // First, try using the background script's transcription (if Whisper.js is integrated)
  try {
    const transcript = await transcribeWithWhisper(audioBlob);
    if (transcript && transcript.length > 0 && !transcript.includes('requires')) {
      return transcript;
    }
  } catch (error) {
    console.log('Whisper transcription not available:', error);
  }

  // Web Speech API will NOT work properly for recorded audio
  // It's only useful for real-time transcription during recording
  // For recorded audio, return a helpful message
  const audioDuration = audioBlob.size / 16000; // Rough estimate (bytes to seconds)
  if (audioDuration > 30) {
    return '[TRANSCRIPTION NOT AVAILABLE]\n\n' +
      '⚠️ IMPORTANT: Web Speech API cannot transcribe pre-recorded audio files.\n\n' +
      'Your recording (' + Math.round(audioDuration) + ' seconds) was saved successfully, ' +
      'but the Web Speech API is designed for real-time speech recognition only, not for ' +
      'processing recorded audio files. This is why only the first few seconds were transcribed.\n\n' +
      '✅ SOLUTION: Integrate Whisper.js for proper transcription\n' +
      'Whisper.js can transcribe your complete recording accurately. See README.md for setup instructions.\n\n' +
      '📥 Your audio file can be downloaded using the "Download Audio" button.\n' +
      'You can also use external tools like:\n' +
      '- OpenAI Whisper (command line)\n' +
      '- Google Cloud Speech-to-Text\n' +
      '- Azure Speech Services\n\n' +
      'See WHERE_ARE_RECORDINGS_STORED.md for more information.';
  }

  // Web Speech API disabled - it was causing audio muting issues and doesn't work reliably
  // Return helpful message pointing to Whisper.js integration
  const audioDuration = audioBlob.size / 16000; // Rough estimate (bytes to seconds)
  
  return '[TRANSCRIPTION NOT AVAILABLE]\n\n' +
    '⚠️ Real-time speech recognition has been disabled to prevent audio interference during calls.\n\n' +
    'Your recording (' + Math.round(audioDuration) + ' seconds) was saved successfully.\n\n' +
    '✅ SOLUTION: Integrate Whisper.js for offline transcription\n' +
    'Whisper.js provides accurate transcription without interfering with your call audio.\n' +
    'See WHISPER_JS_INTEGRATION.md and README.md for setup instructions.\n\n' +
    '📥 Your audio file can be downloaded using the "Download Audio" button.\n' +
    'You can also use external tools like:\n' +
    '- OpenAI Whisper (command line)\n' +
    '- Google Cloud Speech-to-Text\n' +
    '- Azure Speech Services\n\n' +
    'See WHERE_ARE_RECORDINGS_STORED.md for more information.';
}

async function transcribeWithWhisper(audioBlob) {
  // Convert blob to base64 for message passing
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      chrome.runtime.sendMessage({
        action: 'transcribe',
        audioData: base64data
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.transcript) {
          resolve(response.transcript);
        } else {
          reject(new Error(response?.error || 'Transcription failed'));
        }
      });
    };
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(audioBlob);
  });
}

async function generateSummary(transcript) {
  // Use browser-based LLM or simple prompt-based summarization
  // For now, we'll use a structured prompt approach
  // In production, integrate with Transformers.js or WebLLM

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'summarize',
      transcript: transcript
    }, (response) => {
      if (chrome.runtime.lastError || !response || !response.summary) {
        // Fallback to simple summary
        resolve(generateSimpleSummary(transcript));
      } else {
        resolve(response.summary);
      }
    });
  });
}

function generateSimpleSummary(transcript) {
  // Check if transcript is an error message about transcription not being available
  const isErrorMessage = transcript.includes('Transcription requires') ||
    transcript.includes('transcription not available') ||
    transcript.includes('Whisper.js') ||
    transcript.includes('microphone permissions') ||
    transcript.includes('recorded successfully');

  if (isErrorMessage) {
    // Provide a helpful summary when transcription isn't available
    return `# Meeting Recording Summary

## Recording Status
✅ **Audio Recording:** Successfully completed
⚠️ **Transcription:** Not available (requires setup)

## What Was Recorded
Your meeting audio has been recorded and saved successfully. The audio file contains the complete meeting conversation.

## Why No Transcript?
The automatic transcription feature requires one of the following:
1. **Microphone permissions** - Grant the extension microphone access in Chrome settings
2. **Whisper.js integration** - Set up offline transcription (recommended, see README.md)

## Next Steps

### Option 1: Enable Transcription (Quick)
1. Go to \`chrome://extensions/\`
2. Find "AI Meeting Recorder"
3. Click "Details"
4. Under "Permissions", ensure microphone access is granted
5. Try recording again

### Option 2: Set Up Whisper.js (Recommended)
For offline, high-quality transcription:
1. See the README.md file for Whisper.js integration instructions
2. This provides better accuracy and works offline
3. No microphone permissions required

## Your Recording
- The audio file has been saved
- You can replay it anytime
- Once transcription is set up, future recordings will include transcripts

## Need Help?
Check the README.md file for detailed setup instructions and troubleshooting tips.`;
  }

  // Normal summary generation for actual transcripts
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wordCount = transcript.split(/\s+/).length;

  let summary = `# Meeting Summary\n\n`;
  summary += `**Total Words:** ${wordCount}\n`;
  summary += `**Key Points:** ${sentences.length} main points discussed\n\n`;

  summary += `## Executive Summary\n`;
  summary += `This meeting covered ${Math.min(5, sentences.length)} main topics. `;
  summary += `The discussion included detailed conversations about the meeting agenda.\n\n`;

  summary += `## Key Discussion Points\n`;
  sentences.slice(0, 5).forEach((sentence, i) => {
    summary += `${i + 1}. ${sentence.trim()}\n`;
  });

  summary += `\n## Action Items\n`;
  summary += `- Review meeting notes\n`;
  summary += `- Follow up on discussed topics\n`;

  summary += `\n## Next Steps\n`;
  summary += `- Schedule follow-up meeting if needed\n`;
  summary += `- Share summary with participants\n`;

  return summary;
}

function displayResults(transcript, summary) {
  transcriptContent.textContent = transcript || 'No transcript available';
  summaryContent.innerHTML = formatSummary(summary);
}

function formatSummary(summary) {
  // Convert markdown-like formatting to HTML
  return summary
    .replace(/^# (.*$)/gim, '<h4>$1</h4>')
    .replace(/^## (.*$)/gim, '<h4>$1</h4>')
    .replace(/^\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    .replace(/\n/g, '<br>');
}

// Utility Functions
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show brief success message
    const btn = event.target;
    const original = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
      btn.textContent = original;
    }, 2000);
  });
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAudio(audioBlob) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `meeting-recording-${timestamp}.webm`;
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  console.log('Audio downloaded:', filename, 'Size:', audioBlob.size, 'bytes');
}

// Initialize UI
updateUI('ready');

// Check if recording is in progress
chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (response && response.isRecording) {
    // If popup was closed and reopened, we can't restore the MediaRecorder
    // So we need to reset the state
    console.warn('Recording state found but MediaRecorder not available (popup was closed)');
    recordingState.isRecording = false;
    updateUI('ready');

    // Optionally, we could try to stop any background recording
    chrome.runtime.sendMessage({
      action: 'setRecordingStatus',
      isRecording: false
    }).catch(() => { });
  } else {
    // Ensure clean state
    recordingState.isRecording = false;
    recordingState.mediaRecorder = null;
    updateUI('ready');
  }
});

