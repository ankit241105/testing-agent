const OBSERVE_ENDPOINT = "http://localhost:3000/observe";

async function captureTabScreenshot(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "OBSERVE_STEP") {
    return false;
  }

  const tabId = sender?.tab?.id;
  if (!tabId) {
    sendResponse({ ok: false, error: "No active tab id found." });
    return false;
  }

  (async () => {
    try {
      const screenshotDataUrl = await captureTabScreenshot(tabId);
      const base64 = screenshotDataUrl.includes(",")
        ? screenshotDataUrl.split(",")[1]
        : screenshotDataUrl;

      const payload = {
        executionId: message.executionId,
        stepIndex: message.stepIndex,
        step: message.step,
        html: message.html,
        screenshot: base64,
        timestamp: new Date().toISOString(),
        network: message.network || null
      };

      const response = await fetch(OBSERVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      sendResponse({ ok: response.ok, data });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || "Observation failed." });
    }
  })();

  return true;
});
