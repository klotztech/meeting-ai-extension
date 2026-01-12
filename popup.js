let startTime;
let timerInterval;

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");

startBtn.addEventListener("click", async () => {
	const [tab] = await chrome.tabs.query({
		active: true,
		currentWindow: true,
	});

	chrome.runtime.sendMessage(
		{ action: "start", tabId: tab.id },
		(response) => {
			if (response?.success) {
				startBtn.disabled = true;
				stopBtn.disabled = false;
				statusEl.textContent = "🔴 Recording...";
				statusEl.classList.add("recording");
				startTime = response.startTime || Date.now();
				startTimer();
			} else {
				statusEl.textContent =
					"Error: " + (response?.error || "Failed to start");
			}
		}
	);
});

stopBtn.addEventListener("click", () => {
	chrome.runtime.sendMessage({ action: "stop" }, (response) => {
		if (response?.success) {
			startBtn.disabled = false;
			stopBtn.disabled = true;
			statusEl.textContent = "Downloading...";
			statusEl.classList.remove("recording");
			stopTimer();
		}
	});
});

function startTimer() {
	timerInterval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const hours = Math.floor(elapsed / 3600000);
		const minutes = Math.floor((elapsed % 3600000) / 60000);
		const seconds = Math.floor((elapsed % 60000) / 1000);
		timerEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	}, 1000);
}

function stopTimer() {
	clearInterval(timerInterval);
	timerEl.textContent = "00:00:00";
}

function pad(n) {
	return n.toString().padStart(2, "0");
}

// Listen for download complete
chrome.runtime.onMessage.addListener((msg) => {
	if (msg.type === "downloadComplete") {
		statusEl.textContent = "Ready";
		statusEl.classList.remove("recording");
	}
});

// On popup open, check if recording is in progress
(async function initializeUI() {
	const response = await chrome.runtime.sendMessage({
		target: "offscreen",
		action: "getStatus",
	});

	if (response?.isRecording) {
		// Restore recording state
		startBtn.disabled = true;
		stopBtn.disabled = false;
		statusEl.textContent = "🔴 Recording...";
		statusEl.classList.add("recording");
		startTime = response.startTime;
		startTimer();
	}
})();
