// Content Script - Runs in the context of web pages
// This can be used to inject UI elements or interact with meeting platforms

// Detect meeting platforms
const meetingPlatforms = {
  'meet.google.com': 'Google Meet',
  'zoom.us': 'Zoom',
  'teams.microsoft.com': 'Microsoft Teams',
  'webex.com': 'Webex',
  'skype.com': 'Skype'
};

function detectMeetingPlatform() {
  const hostname = window.location.hostname;
  for (const [domain, name] of Object.entries(meetingPlatforms)) {
    if (hostname.includes(domain)) {
      return name;
    }
  }
  return null;
}

// Notify background script about meeting platform
const platform = detectMeetingPlatform();
if (platform) {
  chrome.runtime.sendMessage({
    type: 'meetingPlatformDetected',
    platform: platform,
    url: window.location.href
  });
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getMeetingInfo') {
    sendResponse({
      platform: platform,
      title: document.title,
      url: window.location.href
    });
  }
});

// Optional: Add visual indicator when recording
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'recordingStarted') {
    showRecordingIndicator();
  } else if (message.type === 'recordingStopped') {
    hideRecordingIndicator();
  }
});

function showRecordingIndicator() {
  // Remove existing indicator if any
  const existing = document.getElementById('meeting-recorder-indicator');
  if (existing) {
    existing.remove();
  }

  // Create indicator
  const indicator = document.createElement('div');
  indicator.id = 'meeting-recorder-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 10px 20px;
      border-radius: 25px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <span style="
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        animation: pulse 1.5s infinite;
      "></span>
      Recording...
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `;
  document.body.appendChild(indicator);
}

function hideRecordingIndicator() {
  const indicator = document.getElementById('meeting-recorder-indicator');
  if (indicator) {
    indicator.remove();
  }
}

