let startTime;
let timerInterval;

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const micSelect = document.getElementById("micSelect");

// Populate microphone devices
async function loadMicrophoneDevices() {
	try {
		// Request permission first
		await navigator.mediaDevices.getUserMedia({ audio: true });

		const devices = await navigator.mediaDevices.enumerateDevices();
		const audioInputs = devices.filter((d) => d.kind === "audioinput");

		micSelect.innerHTML = "";

		if (audioInputs.length === 0) {
			micSelect.innerHTML =
				'<option value="">No microphone found</option>';
			return;
		}

		audioInputs.forEach((device, index) => {
			const option = document.createElement("option");
			option.value = device.deviceId;
			option.textContent = device.label || `Microphone ${index + 1}`;
			micSelect.appendChild(option);
		});

		// Select default device
		const defaultDevice = audioInputs.find((d) => d.deviceId === "default");
		if (defaultDevice) {
			micSelect.value = defaultDevice.deviceId;
		}
	} catch (error) {
		console.error("Error loading microphones:", error);
		micSelect.innerHTML = '<option value="">Mic permission denied</option>';
	}
}

// Load devices on startup
loadMicrophoneDevices();

startBtn.addEventListener("click", async () => {
	const [tab] = await chrome.tabs.query({
		active: true,
		currentWindow: true,
	});

	const selectedMicId = micSelect.value;

	chrome.runtime.sendMessage(
		{ action: "start", tabId: tab.id, micDeviceId: selectedMicId },
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
