async function askGPT(prompt) {
  const url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "deepseek-r1",  // 或 deepseek-r1
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await res.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("DeepSeek 返回结构异常：" + JSON.stringify(data));
  }

  const msg = data.choices[0].message;

  return {
    answer: msg.content || "（无 content）",
    reasoning: msg.reasoning_content || "（无 reasoning_content）"
  };
}