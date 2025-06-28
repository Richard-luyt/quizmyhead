// frontend/src/components/LanguageSelector.jsx
export default function LanguageSelector({ lang, onChange }) {
  return (
    <>
      <label htmlFor="language-select">Language:</label>
      <select
        id="language-select"
        value={lang}
        onChange={e => onChange(e.target.value)}
      >
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
    </>
  );
}