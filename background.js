chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !tab.url.includes('cursor.com/agents')) {
    chrome.action.setBadgeText({ text: '✗', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
    return;
  }
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['scraper.js']
  });
});
