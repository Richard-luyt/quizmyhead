document.getElementById('generate').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'extractText' }, async (response) => {
    const prompt = `请根据以下文章内容提出 3 个问题：\n${response.text}`;
    const questionsText = await askGPT(prompt);
    const questions = questionsText.split(/\n|\d[\.|、]/).filter(q => q.trim());

    const questionsContainer = document.getElementById('questions');
    questionsContainer.innerHTML = '';
    questions.forEach((q, i) => {
      const el = document.createElement('div');
      el.innerHTML = `<p>${q}</p><textarea id="answer${i}" rows="2" cols="40"></textarea>`;
      questionsContainer.appendChild(el);
    });

    const submit = document.createElement('button');
    submit.textContent = '提交回答';
    submit.onclick = async () => {
      const feedbackDiv = document.getElementById('feedback');
      feedbackDiv.innerHTML = '';
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answer = document.getElementById(`answer${i}`).value;
        const review = await askGPT(`问题：${question}\n回答：${answer}\n请给出一个 1-10 的评分，并简短点评`);
        const p = document.createElement('p');
        p.textContent = `第 ${i + 1} 题评分反馈：${review}`;
        feedbackDiv.appendChild(p);
      }
    };
    document.getElementById('answers').appendChild(submit);
  });
});