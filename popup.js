let lang = localStorage.getItem("lang") || "zh";

const i18n = {
  zh: {
    title: "考考你啊",
    difficulty: "难度：",
    count: "题目数量：",
    generate: "生成问题",
    submit: "提交回答",
    feedback: i => `第 ${i + 1} 题 GPT 反馈：`,
    fetchError: i => `提交第 ${i + 1} 题失败！`,
    noText: "无法获取网页正文！"
  },
  en: {
    title: "Quiz My Head",
    difficulty: "Difficulty:",
    count: "Number of Questions:",
    generate: "Generate",
    submit: "Submit",
    feedback: i => `GPT Feedback for Question ${i + 1}:`,
    fetchError: i => `Failed to submit question ${i + 1}`,
    noText: "Unable to extract main content!"
  }
};

function applyLanguage(l) {
  lang = l;
  const t = i18n[lang];

  document.querySelector("h1").textContent = t.title;
  document.querySelector('label[for="difficulty"]').textContent = t.difficulty;
  document.querySelector('label[for="numQuestions"]').textContent = t.count;
  document.getElementById("generate").textContent = t.generate;

  const diffSelect = document.getElementById("difficulty");
  if (lang === "zh") {
    diffSelect.options[0].text = "简单";
    diffSelect.options[1].text = "中等";
    diffSelect.options[2].text = "困难";
  } else {
    diffSelect.options[0].text = "Easy";
    diffSelect.options[1].text = "Medium";
    diffSelect.options[2].text = "Hard";
  }

  const submit = document.querySelector("#answers button");
  if (submit) submit.textContent = t.submit;
}

document.addEventListener("DOMContentLoaded", () => {
  const langSelect = document.getElementById("language-select");
  langSelect.value = lang;
  applyLanguage(lang);

  langSelect.addEventListener("change", () => {
    localStorage.setItem("lang", langSelect.value);
    applyLanguage(langSelect.value);
  });
});

function getDifficultyText() {
  const value = document.getElementById("difficulty").value;
  if (lang === "zh") return value;
  if (value === "简单") return "easy";
  if (value === "中等") return "medium";
  if (value === "困难") return "hard";
  return value; // fallback
}

async function askMyServer(prompt) {
  const res = await fetch("https://quizmyhead-server.vercel.app/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  console.log("🔍 askMyServer 接收到响应：", data);

  if (!data.result) {
    throw new Error("服务器返回异常：" + JSON.stringify(data));
  }
  return data.result;
}

console.log("插件启动");
console.log("marked 是否可用：", typeof marked);

document.getElementById('generate').addEventListener('click', async () => {
  console.log("点击了按钮");
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tabs.length) {
    alert("无法获取当前活动标签页！");
    return;
  }
  const tab = tabs[0];
  
  chrome.tabs.sendMessage(tab.id, { action: 'extractText' }, async (response) => {
    if (!response || !response.text) {
      alert(i18n[lang].noText);
      return;
    }

    console.log("✅ 提取正文内容前 100 字：", response.text);

    const difficulty = getDifficultyText();
    const numQuestions = document.getElementById('numQuestions').value;

    const prompt = lang === "zh"
    ? `请根据以下文章内容，提出 ${numQuestions} 个${difficulty}难度的问题：\n${response.text}。\n请只输出题目列表，格式为1. 问题内容 2. 问题内容。不要写解释、说明或前言。`
    : `Based on the following article, generate ${numQuestions} ${difficulty} questions.\nPlease output only the list of questions starting with '1.', '2.' etc., and **do not include any introduction or explanation**.\n\n${response.text}`;

    const questionsText = await askMyServer(prompt);
    const rawLines = questionsText.split("\n");
    const questions = rawLines
      .filter(line => /^\s*\d+\./.test(line))
      .map(q => q.trim());

    if (questions.length === 0) {
      alert("没有成功生成问题，请重试或换一篇文章。");
      return;
    }


    const questionsContainer = document.getElementById('questions');
    questionsContainer.innerHTML = '';
    questions.forEach((q, i) => {
      const block = document.createElement('div');
      block.className = "question-block";
      block.innerHTML = `<p><strong>问题 ${i + 1}：</strong> ${q}</p><textarea id="answer${i}" rows="2"></textarea>`;
      questionsContainer.appendChild(block);
    });

    const submit = document.createElement('button');
    submit.textContent = i18n[lang].submit;
    submit.onclick = async () => {
      console.log("点击了submit");
      const feedbackDiv = document.getElementById('feedback');
      feedbackDiv.innerHTML = '';

      const results = [];

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answerText = document.getElementById(`answer${i}`).value;

        const feedbackPrompt = lang === "zh"
        ? `问题：${question}\n回答：${answerText}\n请评分并解释理由，尽量严格打分`
        : `question: ${question}\n answer:${answerText}\nplease rate the answer and give your explanation, be rigorous`

        //const feedbackPrompt = `问题：${question}\n回答：${answerText}\n请评分并解释理由`;

        try {
          const feedback = await askMyServer(feedbackPrompt);
          const container = document.createElement('div');
          container.className = "feedback-block";
          container.innerHTML = `
            <h3>${i18n[lang].feedback(i)}</h3>
            <div class="markdown-body">${marked.parse(feedback)}</div>
          `;
          feedbackDiv.appendChild(container);

          results.push({ question, answer: answerText, feedback });

        } catch (e) {
          console.error("GPT 请求失败", e);
          alert(i18n[lang].fetchError(i));
        }
      }

      // 所有 GPT 反馈完成后，显示“保存为 TXT”按钮
      const saveButton = document.createElement('button');
      saveButton.textContent = lang === "zh" ? "保存为 TXT" : "Save as TXT";
      saveButton.style.marginTop = "20px";
      feedbackDiv.appendChild(saveButton);

      saveButton.addEventListener("click", () => {
        let content = "";
        results.forEach((item, idx) => {
          content += `${lang === "zh" ? "问题" : "Question"} ${idx + 1}：${item.question}\n`;
          content += `${lang === "zh" ? "回答" : "Answer"}：${item.answer}\n`;
          content += `${lang === "zh" ? "GPT 反馈" : "GPT Feedback"}：${item.feedback}\n\n`;
        });

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gpt_feedback.txt";
        a.click();
        URL.revokeObjectURL(url);
      });

    };

    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';
    answersDiv.appendChild(submit);
  });
});

