// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import './App.css'; // 你可以把 style.css 内容复制到这个文件
import { marked } from 'marked';


const i18n = {
  zh: {
    title: "考考你啊",
    difficulty: "难度：",
    count: "题目数量：",
    generate: "生成问题",
    submit: "提交回答",
    feedback: i => `第 ${i + 1} 题 GPT 反馈：`,
    fetchError: i => `提交第 ${i + 1} 题失败！`,
    noText: "无法获取网页正文！",
    save: "保存为 TXT"
  },
  en: {
    title: "Quiz My Head",
    difficulty: "Difficulty:",
    count: "Number of Questions:",
    generate: "Generate",
    submit: "Submit",
    feedback: i => `GPT Feedback for Question ${i + 1}:`,
    fetchError: i => `Failed to submit question ${i + 1}`,
    noText: "Unable to extract main content!",
    save: "Save as TXT"
  }
};

export default function App() {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "zh");
  const [difficulty, setDifficulty] = useState("简单");
  const [numQuestions, setNumQuestions] = useState("3");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [canDownload, setCanDownload] = useState(false);
  const [downloadContent, setDownloadContent] = useState('');
  const t = i18n[lang];

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const getDifficultyText = () => {
    if (lang === "zh") return difficulty;
    if (difficulty === "简单") return "easy";
    if (difficulty === "中等") return "medium";
    if (difficulty === "困难") return "hard";
    return difficulty;
  };

  const askMyServer = async (prompt) => {
    const res = await fetch("https://quizmyhead-server.vercel.app/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    if (!data.result) throw new Error("服务器返回异常：" + JSON.stringify(data));
    return data.result;
  };

  const handleGenerate = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs.length) return alert("无法获取当前活动标签页！");
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractText' }, async res => {
        if (!res?.text) return alert(t.noText);
        const prompt = lang === "zh"
          ? `请根据以下文章内容，提出 ${numQuestions} 个${getDifficultyText()}难度的问题：\n${res.text}。\n请只输出题目列表，格式为1. 问题内容 2. 问题内容。不要写解释、说明或前言。`
          : `Based on the following article, generate ${numQuestions} ${getDifficultyText()} questions.\nPlease output only the list of questions starting with '1.', '2.' etc., and **do not include any introduction or explanation**.\n\n${res.text}`;
        try {
          const result = await askMyServer(prompt);
          const qList = result.split("\n").filter(line => /^\s*\d+\./.test(line)).map(line => line.trim());
          setQuestions(qList);
          setAnswers(new Array(qList.length).fill(""));
          setFeedbacks([]);
        } catch (err) {
          alert("生成失败：" + err.message);
        }
      });
    });
  };

  const handleSubmit = async () => {
    const results = [];
    const newFeedbacks = [];

    for (let i = 0; i < questions.length; i++) {
      const prompt = lang === "zh"
        ? `问题：${questions[i]}\n回答：${answers[i]}\n请评分并解释理由，尽量严格打分`
        : `Question: ${questions[i]}\nAnswer: ${answers[i]}\nPlease rate the answer and give explanation`;

      try {
        const feedback = await askMyServer(prompt);
        newFeedbacks.push(feedback);
        results.push({ question: questions[i], answer: answers[i], feedback });
      } catch (err) {
        alert(t.fetchError(i));
        return;
      }
    }
    setFeedbacks(newFeedbacks);

    // 自动保存为 TXT 文件
    const content = results.map((r, i) => 
      `${lang === "zh" ? "问题" : "Question"} ${i+1}：${r.question}\n` +
      `${lang === "zh" ? "回答" : "Answer"}：${r.answer}\n` +
      `${lang === "zh" ? "GPT 反馈" : "GPT Feedback"}：${r.feedback}\n`
    ).join("\n\n");

    setDownloadContent(content);
    setCanDownload(true);
  };

  return (
    <div className="container">
      <h1>{t.title}</h1>

      <label htmlFor="language-select">🌐 Language:</label>
      <select id="language-select" value={lang} onChange={e => setLang(e.target.value)}>
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>

      <label htmlFor="difficulty">{t.difficulty}</label>
      <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
        <option value="简单">简单</option>
        <option value="中等">中等</option>
        <option value="困难">困难</option>
      </select>

      <label htmlFor="numQuestions">{t.count}</label>
      <select id="numQuestions" value={numQuestions} onChange={e => setNumQuestions(e.target.value)}>
        <option value="1">1</option>
        <option value="3">3</option>
        <option value="5">5</option>
      </select>

      <button onClick={handleGenerate}>{t.generate}</button>

      <div id="questions">
        {questions.map((q, i) => (
          <div key={i} className="question-block">
            <p><strong>{`问题 ${i + 1}：`}</strong>{q}</p>
            <textarea rows={2} value={answers[i]} onChange={e => {
              const newAnswers = [...answers];
              newAnswers[i] = e.target.value;
              setAnswers(newAnswers);
            }} />
          </div>
        ))}
      </div>

      {questions.length > 0 && (
        <div id="answers">
          <button onClick={handleSubmit}>{t.submit}</button>
        </div>
      )}

      <div id="feedback">
        {feedbacks.map((f, i) => (
          <div key={i} className="feedback-block">
            <h3>{t.feedback(i)}</h3>
            <div dangerouslySetInnerHTML={{ __html: marked.parse(f) }} />
          </div>
        ))}
      </div>

      {canDownload && (
        <button
          onClick={() => {
            const blob = new Blob([downloadContent], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "gpt_feedback.txt";
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          {t.save}
        </button>
      )}
    </div>
  );
}
