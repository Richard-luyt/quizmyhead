// src/components/DownloadButton.jsx
export default function DownloadButton({ canDownload, downloadContent, t }) {
  if (!canDownload) return null;

  const handleDownload = () => {
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
  };

  return (
    <button onClick={handleDownload}>
      <span>{t.save}</span>
    </button>
  );
}
