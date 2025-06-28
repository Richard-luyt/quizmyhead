// frontend/src/components/SettingsForm.jsx
export default function SettingsForm({ difficulty, numQuestions, onDifficultyChange, onNumChange, t }) {
  return (
    <>
      <label htmlFor="difficulty">{t.difficulty}</label>
      <select id="difficulty" value={difficulty} onChange={e => onDifficultyChange(e.target.value)}>
        <option value="简单">{t.difficulty === "Difficulty:" ? "Easy" : "简单"}</option>
        <option value="中等">{t.difficulty === "Difficulty:" ? "Medium" : "中等"}</option>
        <option value="困难">{t.difficulty === "Difficulty:" ? "Hard" : "困难"}</option>

      </select>

      <label htmlFor="numQuestions">{t.numQuestions}</label>
      <select id="numQuestions" value={numQuestions} onChange={e => onNumChange(e.target.value)}>
        <option value="1">1</option>
        <option value="3">3</option>
        <option value="5">5</option>
      </select>
    </>
  );
}
