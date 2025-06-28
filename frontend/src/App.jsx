// frontend/src/App.jsx
import { useEffect, useState } from 'react';
import './App.css';
import { marked } from 'marked';
import LanguageSelector from './components/LanguageSelector.jsx';
import SettingsForm from './components/SettingsForm.jsx';
import QuestionList from './components/QuestionList.jsx';
import FeedbackList from './components/FeedbackList.jsx';
import DownloadButton from './components/DownloadButton.jsx';



const i18n = {
  zh: {
    title: "考考你啊",
    difficulty: "难度：",
    numQuestions: "题目数量：",
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
    numQuestions: "Number of Questions:",
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
  //const [downloadContent, setDownloadContent] = useState('');
  const t = i18n[lang];
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  //const [isHovering, setIsHovering] = useState(false);
  const [articleText, setArticleText] = useState("");


  useEffect(() => {
    chrome.storage.local.get(
      ["savedQuestions", "savedLang", "savedDifficulty", "savedCount"],
      (result) => {
        if (result.savedQuestions) {
          setQuestions(result.savedQuestions);
          setLang(result.savedLang || "en");
          setDifficulty(result.savedDifficulty || "easy");
          setNumQuestions(result.savedCount || 3);
        }
      }
    );
  }, []);

  useEffect(() => {
    chrome.storage.local.set({
      savedQuestions: questions,
      savedLang: lang,
      savedDifficulty: difficulty,
      savedCount: numQuestions
    });
  }, [questions, lang, difficulty, numQuestions]);

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
    setIsGenerating(true); // 开始 loading

    chrome.storage.local.set({
      savedQuestions: questions,
      savedLang: lang,
      savedDifficulty: difficulty,
      savedCount: numQuestions
    });

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs.length){
        setIsGenerating(false);
        return alert("无法获取当前活动标签页！");
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractText' }, async res => {
        if (!res?.text){
          setIsGenerating(false);
          return alert(t.noText);
        }
        setArticleText(res.text);
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
        } finally {
          setIsGenerating(false); // 结束 loading
        }
      });
    });
  };

  const handleSubmit = async () => {
    const results = [];
    const newFeedbacks = [];
    //const articleText = res.text;
    for (let i = 0; i < answers.length; i++) {
      if (!answers[i]?.trim()) {
        alert(lang === "zh" ? `第 ${i + 1} 题未填写答案！` : `Question ${i + 1} is empty!`);
        return;
      }
    }
    setIsSubmitting(true); 
    for (let i = 0; i < questions.length; i++) {
      const prompt = lang === "zh"
        ? `问题：${questions[i]}\n回答：${answers[i]}\n请评分并解释理由，尽量严格打分,原文是：${articleText}`
        : `Question: ${questions[i]}\nAnswer: ${answers[i]}\nPlease rate the answer and give explanation, the original article is : ${articleText}`;

      try {
        const feedback = await askMyServer(prompt);
        newFeedbacks.push(feedback);
        results.push({ question: questions[i], answer: answers[i], feedback });
      } catch (err) {
        alert(t.fetchError(i));
        setIsSubmitting(false);
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

    //setDownloadContent(content);
    setCanDownload(true);
    setIsSubmitting(false);
  };

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleReset = () => {
    chrome.storage.local.clear(() => {
      window.location.reload();
    });
  };

  const downloadContent = questions.map((q, i) => {
    return (
      `【${t.question} ${i + 1}】\n${q}\n` +
      `【${t.answer} ${i + 1}】\n${answers[i]}\n` +
      `【${t.feedback(i)}】\n${feedbacks[i]}\n`
    );
  }).join('\n\n');


  return (
    <div className="container">
      <h1 className="gradient-text">{t.title}</h1>

      <LanguageSelector lang={lang} onChange={setLang} />

      <SettingsForm
        difficulty={difficulty}
        numQuestions={numQuestions}
        onDifficultyChange={setDifficulty}
        onNumChange={setNumQuestions}
        t={t}
      />

      <button onClick={handleGenerate} disabled={isGenerating} style={{ marginBottom: '20px' }}>
        {isGenerating ? (
          <>
            <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
              viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0"/>
              <path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6"/>
              <path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <span>{lang === "zh" ? "生成中..." : "Generating..."}</span>
          </>
        ) : (
          <span>{t.generate}</span>
        )}
      </button>


      {questions.length > 0 && (
        <>
          <QuestionList
            questions={questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
          />

          <div id="answers">
            <button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0"/>
                    <path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6"/>
                    <path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6"/>
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <span>{lang === "zh" ? "提交中..." : "Submitting..."}</span>
                </>
              ) : (
                <span>{t.submit}</span>
              )}
            </button>

            <button onClick={handleReset} className="reset" style={{marginTop: '10px',backgroundColor: '#ccc',color: 'white'}}>
              <span>{lang === "zh" ? "重置" : "Reset"}</span>
            </button>
          </div>
        </>
      )}

      <FeedbackList feedbacks={feedbacks} t={t} />

      <DownloadButton
        canDownload={canDownload}
        downloadContent={downloadContent}
        t={t}
      />

    </div>
  );
}
