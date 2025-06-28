// frontend/src/components/QuestionList.jsx
export default function QuestionList({ questions, answers, onAnswerChange }) {
  return (
    <div id="questions">
      {questions.map((q, i) => (
        <div key={i} className="question-block">
          <p><strong>{`问题 ${i + 1}：`}</strong>{q}</p>
          <textarea
            rows={2}
            value={answers[i]}
            onChange={e => onAnswerChange(i, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
