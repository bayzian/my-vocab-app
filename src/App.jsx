import React, { useState } from "react";
import { Volume2, Trash2, Pencil, PlusCircle, Shuffle } from "lucide-react";

export default function App() {
  const [items, setItems] = useState([]);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [example, setExample] = useState("");

  // 🔥 Gemini API（例文生成）
  async function generateExample(w) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return "(API key missing)";

    const prompt = `英単語「${w}」を使って、自然な日本人向けの英語例文と日本語訳を生成して。出力は「英語文\n日本語訳」の形式。`;

    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 },
            apiKey,
          }),
        }
      );

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "(no response)";
    } catch (e) {
      return "(error generating example)";
    }
  }

  function handleAdd() {
    if (!word || !meaning) return;
    setItems([
      ...items,
      {
        id: Date.now(),
        word,
        meaning,
        note,
        example: "",
      },
    ]);
    setWord("");
    setMeaning("");
    setNote("");
  }

  async function handleExample(id, w) {
    const ex = await generateExample(w);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, example: ex } : item
      )
    );
  }

  function speak(text) {
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = "en-US";
    speechSynthesis.speak(uttr);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#e8efff] p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📘 英語メモ帳
          </h1>

          <button className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition text-sm">
            <Shuffle size={16} /> テスト
          </button>
        </div>

        {/* 入力欄 */}
        <div className="bg-white p-4 rounded-xl shadow-md space-y-3">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="英単語・英文を入力"
            className="w-full p-3 border rounded-lg"
          />
          <input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="意味を入力"
            className="w-full p-3 border rounded-lg"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full p-3 border rounded-lg"
          />

          <button
            onClick={handleAdd}
            className="flex items-center bg-blue-600 text-white px-4 py-3 rounded-lg shadow hover:bg-blue-700 transition w-full justify-center"
          >
            <PlusCircle className="mr-2" /> 追加
          </button>
        </div>

        {/* 単語カード一覧 */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition border"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold">{item.word}</h2>
                  <p className="text-gray-600 mt-1">{item.meaning}</p>
                  {item.note && (
                    <p className="text-gray-500 mt-1 text-sm">✏️ {item.note}</p>
                  )}

                  {item.example && (
                    <div className="bg-gray-100 p-3 rounded mt-3 text-sm whitespace-pre-line">
                      {item.example}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 ml-3">
                  <button onClick={() => speak(item.word)}>
                    <Volume2 className="text-blue-600 hover:text-blue-800" />
                  </button>

                  <button
                    onClick={() => handleExample(item.id, item.word)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <Pencil />
                  </button>

                  <button
                    onClick={() =>
                      setItems(items.filter((x) => x.id !== item.id))
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
