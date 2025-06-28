// frontend/src/components/FeedbackList.jsx
import { marked } from 'marked';

export default function FeedbackList({ feedbacks, t }) {
  return (
    <div id="feedback">
      {feedbacks.map((f, i) => (
        <div key={i} className="feedback-block">
          <h3>{t.feedback(i)}</h3>
          <div dangerouslySetInnerHTML={{ __html: marked.parse(f) }} />
        </div>
      ))}
    </div>
  );
}
