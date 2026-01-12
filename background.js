let offscreenReady = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.action === "start") {
		handleStart(msg.tabId, msg.micDeviceId).then(sendResponse);
		return true;
	}

	if (msg.action === "stop") {
		handleStop().then(sendResponse);
		return true;
	}

	if (msg.type === "downloadComplete") {
		// Forward to popup
		chrome.runtime
			.sendMessage({ type: "downloadComplete" })
			.catch(() => {});
		return false;
	}

	if (msg.type === "callerIdDetected") {
		// Forward caller ID to offscreen document
		chrome.runtime
			.sendMessage({
				target: "offscreen",
				action: "setCallerId",
				callerId: msg.callerId,
			})
			.catch(() => {});
		return false;
	}
});

async function handleStart(tabId, micDeviceId) {
	try {
		await ensureOffscreen();

		const streamId = await new Promise((resolve, reject) => {
			chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
				} else {
					resolve(id);
				}
			});
		});

		const response = await chrome.runtime.sendMessage({
			target: "offscreen",
			action: "startRecording",
			streamId,
			micDeviceId,
		});

		return response;
	} catch (error) {
		return { success: false, error: error.message };
	}
}

async function handleStop() {
	try {
		const response = await chrome.runtime.sendMessage({
			target: "offscreen",
			action: "stopRecording",
		});
		return response;
	} catch (error) {
		return { success: false, error: error.message };
	}
}

async function ensureOffscreen() {
	if (offscreenReady) return;

	const existing = await chrome.runtime.getContexts({
		contextTypes: ["OFFSCREEN_DOCUMENT"],
	});

	if (existing.length > 0) {
		offscreenReady = true;
		return;
	}

	await chrome.offscreen.createDocument({
		url: "offscreen.html",
		reasons: ["USER_MEDIA"],
		justification: "Recording tab audio with microphone",
	});

	offscreenReady = true;
}
