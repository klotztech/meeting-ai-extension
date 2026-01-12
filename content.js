// Monitor Google Voice for caller ID
let lastCallerId = null;

function detectCallerId() {
	const titleElement = document.querySelector("div.remote-display-title");
	if (titleElement && titleElement.textContent.trim()) {
		const callerId = titleElement.textContent.trim();
		if (callerId !== lastCallerId) {
			lastCallerId = callerId;
			// Send to background/offscreen
			chrome.runtime.sendMessage({
				type: "callerIdDetected",
				callerId: callerId,
			});
			console.log("Caller ID detected:", callerId);
		}
	}
}

// Check periodically for caller ID
setInterval(detectCallerId, 1000);

// Also use MutationObserver for faster detection
const observer = new MutationObserver(() => {
	detectCallerId();
});

// Start observing when page is ready
if (document.body) {
	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true,
	});
} else {
	document.addEventListener("DOMContentLoaded", () => {
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			characterData: true,
		});
	});
}
