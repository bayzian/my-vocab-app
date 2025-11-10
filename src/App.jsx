import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

export default function App() {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("vocab-items");
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    localStorage.setItem("vocab-items", JSON.stringify(items));
  }, [items]);

  const addItem = () => {
    if (!word.trim()) return;
    const newItem = {
      id: crypto.randomUUID(),
      word: word.trim(),
      meaning: meaning.trim(),
      note: note.trim(),
      example: "",
      createdAt: Date.now(),
    };
    setItems([newItem, ...items]);
    setWord("");
    setMeaning("");
    setNote("");
  };

  const removeItem = (id) => {
    setItems(items.filter((x) => x.id !== id));
  };

  const askGeminiForExample = async (id, w) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("VITE_GEMINI_API_KEY が設定されていません（VercelのEnvで設定）");
      return;
    }
    try {
      setLoadingId(id);
      const prompt = `英単語「${w}」を使って、自然な英語の例文を1つ。中級レベル、15語以内。日本語訳も1行で。フォーマット: EN: ... / JA: ...`;
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "(no response)";
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, example: text } : it))
      );
    } catch (e) {
      console.error(e);
      alert("例文の生成に失敗しました");
    } finally {
      setLoadingId(null);
    }
  };

  const count = useMemo(() => items.length, [items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">英語メモ帳（my-vocab-app）</h1>

        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded-lg p-2"
              placeholder="word（例: compelling）"
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
            <input
              className="border rounded-lg p-2"
              placeholder="meaning（例: 説得力のある）"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
            />
            <input
              className="border rounded-lg p-2"
              placeholder="note（例: 類義語: persuasive）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button
            onClick={addItem}
            className="mt-3 inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg"
          >
            <Plus size={18} />
            追加
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-2">合計 {count} 件</div>

        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{it.word}</div>
                  {it.meaning && (
                    <div className="text-gray-700">意味: {it.meaning}</div>
                  )}
                  {it.note && (
                    <div className="text-gray-500 text-sm mt-1">
                      メモ: {it.note}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => askGeminiForExample(it.id, it.word)}
                    disabled={loadingId === it.id}
                    className="inline-flex items-center gap-1 border px-3 py-1.5 rounded-lg"
                  >
                    <Wand2 size={16} />
                    {loadingId === it.id ? "生成中…" : "例文"}
                  </button>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="inline-flex items-center gap-1 border px-3 py-1.5 rounded-lg"
                  >
                    <Trash2 size={16} />
                    削除
                  </button>
                </div>
              </div>

              {it.example && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                  {it.example}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
