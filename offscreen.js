let recorder = null;
let chunks = [];
let tabStream = null;
let micStream = null;
let audioElement = null;
let recordingStartTime = null;
let callerId = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.target !== "offscreen") return;

	if (msg.action === "startRecording") {
		startRecording(msg.streamId, msg.micDeviceId)
			.then((result) => sendResponse(result))
			.catch((error) =>
				sendResponse({ success: false, error: error.message })
			);
		return true;
	}

	if (msg.action === "stopRecording") {
		stopRecording()
			.then((result) => sendResponse(result))
			.catch((error) =>
				sendResponse({ success: false, error: error.message })
			);
		return true;
	}

	if (msg.action === "getStatus") {
		const isRecording = recorder && recorder.state === "recording";
		sendResponse({
			isRecording: isRecording,
			startTime: recordingStartTime,
		});
		return false;
	}

	if (msg.action === "setCallerId") {
		callerId = msg.callerId;
		console.log("Caller ID set:", callerId);
		return false;
	}
});

async function startRecording(streamId, micDeviceId) {
	try {
		// Get tab audio
		tabStream = await navigator.mediaDevices.getUserMedia({
			audio: {
				mandatory: {
					chromeMediaSource: "tab",
					chromeMediaSourceId: streamId,
				},
			},
		});

		// Play tab audio to speakers so user can hear
		audioElement = new Audio();
		audioElement.srcObject = tabStream;
		audioElement.play();

		// Get microphone with specific device ID
		try {
			const micConstraints = {
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			};

			// Add device ID if specified
			if (micDeviceId && micDeviceId !== "default") {
				micConstraints.audio.deviceId = { exact: micDeviceId };
			}

			micStream = await navigator.mediaDevices.getUserMedia(
				micConstraints
			);
		} catch (e) {
			console.log("Mic not available:", e);
		}

		// Merge streams
		const audioContext = new AudioContext();
		const dest = audioContext.createMediaStreamDestination();

		const tabSource = audioContext.createMediaStreamSource(tabStream);
		tabSource.connect(dest);

		if (micStream) {
			const micSource = audioContext.createMediaStreamSource(micStream);
			micSource.connect(dest);
		}

		// Start recording - use WebM with Opus
		recorder = new MediaRecorder(dest.stream, {
			mimeType: "audio/webm;codecs=opus",
		});

		chunks = [];

		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) {
				chunks.push(e.data);
			}
		};

		recorder.onstop = async () => {
			const blob = new Blob(chunks, { type: "audio/webm" });

			// Download directly from offscreen (has DOM APIs)
			const url = URL.createObjectURL(blob);
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

			// Create filename with caller ID if available
			let filename;
			if (callerId) {
				// Sanitize caller ID for filename
				const sanitized = callerId.replace(/[^a-z0-9]/gi, "-");
				filename = `${sanitized}-${timestamp}.webm`;
			} else {
				filename = `recording-${timestamp}.webm`;
			}

			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();

			setTimeout(() => {
				URL.revokeObjectURL(url);
				// Notify completion
				chrome.runtime
					.sendMessage({ type: "downloadComplete" })
					.catch(() => {});
			}, 100);
			if (tabStream) {
				tabStream.getTracks().forEach((t) => t.stop());
			}
			if (micStream) {
				micStream.getTracks().forEach((t) => t.stop());
			}
			if (audioElement) {
				audioElement.pause();
				audioElement.srcObject = null;
			}
			audioContext.close();

			// Reset caller ID after download
			callerId = null;
		};

		recorder.start(1000); // 1 second timeslice for better metadata
		recordingStartTime = Date.now();

		return { success: true, startTime: recordingStartTime };
	} catch (error) {
		return { success: false, error: error.message };
	}
}

async function stopRecording() {
	if (!recorder || recorder.state === "inactive") {
		recordingStartTime = null;
		return { success: true };
	}

	recorder.stop();
	recordingStartTime = null;
	return { success: true };
}
