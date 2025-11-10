import React, { useEffect, useState } from "react";
import { Volume2, Trash2, Pencil, PlusCircle, Shuffle } from "lucide-react";

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// 男性っぽい英語音声の優先候補（環境に無ければスキップされます）
const preferredVoiceNames = [
  "Google UK English Male",
  "Google US English",
  "Daniel",            // macOS
  "Alex",              // macOS
  "Microsoft David",   // Windows
];

export default function App() {
  const [items, setItems] = useState([]);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");

  // ---- 音声（成人男性っぽい声の自動選択）----
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);

      const preferred =
        preferredVoiceNames
          .map((name) => v.find((vc) => vc.name.includes(name)))
          .find(Boolean);
      const fallback = v.find((vc) => vc.lang?.startsWith("en")) || null;
      setVoice(preferred || fallback);
    }
    loadVoices();
    // Chromeは非同期ロードのためイベント必要
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  function speak(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (voice) u.voice = voice;
    u.rate = 0.95; // 少しゆっくり
    u.pitch = 0.9; // 低め
    speechSynthesis.speak(u);
  }
  // -------------------------------------------

  // 🔥 Gemini API（例文生成）
  async function generateExample(targetWord) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return "(API key missing)";

    const prompt =
      `英単語「${targetWord}」を使って、中級レベルで15語以内の英語例文を1つだけ作成。` +
      `次の行に日本語訳を1行。出力は必ず以下の形式：\nEN: ...\nJA: ...`;

    try {
      const res = await fetch(`${MODEL_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      return text || "(no response)";
    } catch (e) {
      console.error(e);
      return "(error generating example)";
    }
  }

  function handleAdd() {
    if (!word || !meaning) return;
    setItems((prev) => [
      ...prev,
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
    // 生成中の表示（任意）
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, example: "（生成中…）" } : it))
    );

    const ex = await generateExample(w);

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, example: ex } : item))
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#e8efff] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">📘 英語メモ帳</h1>
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
                    title="例文生成"
                  >
                    <Pencil />
                  </button>

                  <button
                    onClick={() =>
                      setItems((prev) => prev.filter((x) => x.id !== item.id))
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

        {/* （任意）英語ボイス選択UIを出したい人向け
        {voices.filter(v => v.lang?.startsWith("en")).length > 0 && (
          <select
            value={voice?.name || ""}
            onChange={(e) =>
              setVoice(voices.find((v) => v.name === e.target.value) || null)
            }
            className="border rounded px-2 py-1 text-sm"
            title="Voice"
          >
            {voices
              .filter((v) => v.lang?.startsWith("en"))
              .map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
          </select>
        )}
        */}
      </div>
    </div>
  );
}
