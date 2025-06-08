chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extractText') {
    const bodyText = document.body.innerText;
    sendResponse({ text: bodyText });
  }
  return true;
});