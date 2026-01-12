// Background Service Worker - Handles getting media stream ID
// Actual recording is done in popup.js where getUserMedia is available
let recordingState = {
  isRecording: false,
  startTime: null
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startRecording') {
    getMediaStreamId(message.tabId).then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'startRecordingWithStreamId') {
    startRecordingWithStreamId(message.streamId, message.tabId).then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.action === 'stopRecording') {
    // Recording is handled in popup, but we can update state
    recordingState.isRecording = false;
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'getStatus') {
    sendResponse({
      isRecording: recordingState.isRecording,
      startTime: recordingState.startTime
    });
    return false;
  }

  if (message.action === 'setRecordingStatus') {
    recordingState.isRecording = message.isRecording;
    recordingState.startTime = message.startTime || null;
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'transcribe') {
    // Convert base64 back to blob
    const byteCharacters = atob(message.audioData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const audioBlob = new Blob([byteArray], { type: 'audio/webm' });

    transcribeAudio(audioBlob).then((transcript) => {
      sendResponse({ transcript });
    }).catch((error) => {
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (message.action === 'summarize') {
    summarizeTranscript(message.transcript).then((summary) => {
      sendResponse({ summary });
    }).catch((error) => {
      sendResponse({ error: error.message });
    });
    return true;
  }
});

// Get Media Stream ID (works in service worker)
async function getMediaStreamId(tabId) {
  try {
    // Check if tabCapture API is available
    if (!chrome.tabCapture) {
      return {
        success: false,
        error: 'Tab capture API not available. Please reload the extension (chrome://extensions/) and ensure Developer mode is enabled.'
      };
    }

    // Check if getMediaStreamId is available
    if (typeof chrome.tabCapture.getMediaStreamId !== 'function') {
      return {
        success: false,
        error: 'Tab capture API method not available. Please reload the extension completely.'
      };
    }

    // Get the media stream ID for the target tab
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId
      }, (id) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (id) {
          resolve(id);
        } else {
          reject(new Error('Failed to get media stream ID. Make sure the tab has audio.'));
        }
      });
    });

    return { success: true, streamId: streamId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Start Recording with Stream ID (called from popup after getting streamId)
// Note: Recording is now handled in popup.js where getUserMedia is available
async function startRecordingWithStreamId(streamId, tabId) {
  // Recording is handled in popup.js where getUserMedia is available
  // This function is kept for message handler compatibility
  return { success: true, message: 'Recording handled in popup' };
}

// Note: Recording is now handled in popup.js
// Background script only provides the media stream ID

// Send Message to Popup
function sendMessageToPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup might be closed, ignore error
  });
}

// Transcribe Audio (using Whisper.js only - Web Speech API disabled)
async function transcribeAudio(audioBlob) {
  // Web Speech API has been disabled as it was causing audio interference
  // Only Whisper.js integration is supported for transcription
  
  return new Promise((resolve, reject) => {
    // Try Whisper.js integration
    transcribeWithWhisperJS(audioBlob).then(resolve).catch(reject);
  });
}

// Transcribe with Whisper.js (placeholder - needs implementation)
async function transcribeWithWhisperJS(audioBlob) {
  // This would integrate Whisper.js
  // For now, return a message
  return 'Full transcription requires Whisper.js integration. Please see the README for setup instructions.';
}

// Summarize Transcript
async function summarizeTranscript(transcript) {
  // Use a browser-based LLM or structured prompt
  // For now, use a simple but effective prompt-based approach

  const prompt = `You are an AI meeting assistant. Analyze the following meeting transcript and generate a comprehensive summary.

Transcript:
${transcript}

Please provide a structured summary with the following sections:
1. Executive Summary (2-3 sentences)
2. Key Discussion Points (bullet points)
3. Decisions Made
4. Action Items (with suggested owners if mentioned)
5. Next Steps
6. Important Quotes (if any)

Format the response in markdown.`;

  // For browser-based summarization, we can use:
  // 1. Transformers.js with a small model
  // 2. WebLLM
  // 3. Or a simple rule-based approach for now

  return generateSummaryWithLLM(transcript, prompt);
}

// Generate Summary with LLM (placeholder - needs implementation)
async function generateSummaryWithLLM(transcript, prompt) {
  // This would integrate a browser-based LLM
  // For now, return a structured summary using simple rules

  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const words = transcript.split(/\s+/);

  let summary = `# Meeting Summary\n\n`;

  summary += `## Executive Summary\n`;
  summary += `This meeting covered ${Math.min(sentences.length, 10)} main discussion points. `;
  summary += `The conversation included ${words.length} words of dialogue. `;
  summary += `Key topics were discussed and action items were identified.\n\n`;

  summary += `## Key Discussion Points\n`;
  sentences.slice(0, 8).forEach((sentence, i) => {
    const trimmed = sentence.trim();
    if (trimmed.length > 0) {
      summary += `${i + 1}. ${trimmed}\n`;
    }
  });

  summary += `\n## Decisions Made\n`;
  // Look for decision keywords
  const decisionKeywords = ['decided', 'agreed', 'approved', 'chose', 'selected'];
  const decisions = sentences.filter(s =>
    decisionKeywords.some(keyword => s.toLowerCase().includes(keyword))
  );
  if (decisions.length > 0) {
    decisions.slice(0, 5).forEach((decision, i) => {
      summary += `${i + 1}. ${decision.trim()}\n`;
    });
  } else {
    summary += `- Review transcript for specific decisions\n`;
  }

  summary += `\n## Action Items\n`;
  const actionKeywords = ['will', 'should', 'need to', 'must', 'action', 'task'];
  const actions = sentences.filter(s =>
    actionKeywords.some(keyword => s.toLowerCase().includes(keyword))
  );
  if (actions.length > 0) {
    actions.slice(0, 5).forEach((action, i) => {
      summary += `${i + 1}. ${action.trim()}\n`;
    });
  } else {
    summary += `- Follow up on discussed topics\n`;
    summary += `- Review meeting notes\n`;
  }

  summary += `\n## Next Steps\n`;
  summary += `- Share this summary with all participants\n`;
  summary += `- Schedule follow-up meeting if needed\n`;
  summary += `- Track action items and deadlines\n`;

  summary += `\n## Important Quotes\n`;
  const quotes = sentences.filter(s => s.length > 50).slice(0, 3);
  if (quotes.length > 0) {
    quotes.forEach((quote, i) => {
      summary += `${i + 1.} "${quote.trim()}"\n`;
    });
  } else {
    summary += `- Review full transcript for specific quotes\n`;
  }

  return summary;
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Meeting Recorder extension installed');
});

// Handle tab updates (in case meeting tab is closed)
chrome.tabs.onRemoved.addListener((tabId) => {
  if (recordingState.isRecording) {
    // Check if the closed tab was the one being recorded
    // This is a simplified check - in production, track the exact tab
    stopRecording();
  }
});

