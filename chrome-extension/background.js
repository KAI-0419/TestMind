chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url.includes("https://www.youtube.com/playlist?list=LL")
  ) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }, () => {
      console.log("[background.js] ✅ content.js injected on 'Liked Videos' page only");
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startAnalysis" || request.action === "pauseAnalysis") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      chrome.tabs.sendMessage(tabId, request);
    });
  }
  if (message.action === "getScrapedTitles") {
    console.log("[background.js] getScrapedTitles 메시지 수신!", message);
    chrome.runtime.sendMessage(message);
  }
});