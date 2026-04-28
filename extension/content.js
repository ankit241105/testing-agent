function getReducedHtml() {
  if (!document.body) return "";
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("script,style,noscript,template").forEach((node) => node.remove());
  return clone.innerHTML;
}

function sendObservation(detail) {
  const payload = {
    executionId: detail?.executionId,
    stepIndex: detail?.stepIndex,
    step: detail?.step || { action: "unknown" },
    html: getReducedHtml(),
    network: detail?.network || null
  };

  chrome.runtime.sendMessage(
    {
      type: "OBSERVE_STEP",
      ...payload
    },
    () => {
      void chrome.runtime.lastError;
    }
  );
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "AI_TEST_AGENT_OBSERVE") return;
  sendObservation(event.data);
});

window.addEventListener("ai-test-agent-observe", (event) => {
  sendObservation(event.detail || {});
});
