
console.log("✅ content.js 已注入并运行！");

function extractMainText() {
  // ✅ 优先提取博客园文章正文
  const cnblogs = document.querySelector("#cnblogs_post_body");
  if (cnblogs && cnblogs.innerText.length > 200) {
    return cnblogs.innerText.trim();
  }

  // ✅ 其他通用选择器
  const selectors = [
    ".entry", ".post", ".content", ".main-content", "article", "#article"
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.length > 200) {
      return el.innerText.trim();
    }
  }

  // ❗ fallback: 删除干扰元素后再提取
  const clone = document.body.cloneNode(true);
  const removeSelectors = [
    "header", "footer", "nav", "aside", ".sidebar", ".ads", ".comment", "script", "style"
  ];
  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(e => e.remove());
  });

  const text = clone.innerText.trim();
  return text.length > 200 ? text : document.body.innerText.trim();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extractText') {
    // 提取 HTML 源码并构造 Readability
    const articleDoc = document.cloneNode(true);
    const reader = new Readability(articleDoc);
    const article = reader.parse();

    // 返回提取的正文
    sendResponse({ text: article?.textContent || "" });
  }
  return true;
});


console.log("提取到的正文内容：", text.slice(0, 1000));
