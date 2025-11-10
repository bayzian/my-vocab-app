import React, { useEffect, useState } from "react";
import { Volume2, Trash2, PlusCircle, Shuffle, List, Check, X } from "lucide-react";

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

const preferredVoiceNames = [
  "Google UK English Male",
  "Google US English",
  "Daniel",
  "Alex",
  "Microsoft David",
];

export default function App() {
  const [items, setItems] = useState([]);
  const [word, setWord] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // テストモード
  const [mode, setMode] = useState("list"); // "list" or "test"
  const [testIndex, setTestIndex] = useState(0);
  const [shuffledItems, setShuffledItems] = useState([]);
  const [choices, setChoices] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // 音声
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState(null);

  // ローカルストレージから読み込み
  useEffect(() => {
    const saved = localStorage.getItem("vocabItems");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load items:", e);
      }
    }
  }, []);

  // ローカルストレージに保存
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem("vocabItems", JSON.stringify(items));
    }
  }, [items]);

  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);

      const preferred = preferredVoiceNames
        .map((name) => v.find((vc) => vc.name.includes(name)))
        .find(Boolean);
      const fallback = v.find((vc) => vc.lang?.startsWith("en")) || null;
      setVoice(preferred || fallback);
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  function speak(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (voice) u.voice = voice;
    u.rate = 0.85;
    u.pitch = 0.8;
    speechSynthesis.speak(u);
  }

  // 🔥 Gemini API（日本語訳取得）
  async function translateWord(targetWord) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setErrorMessage(
        "APIキーが設定されていません。環境変数 VITE_GEMINI_API_KEY を確認してください。"
      );
      return "";
    }

    const prompt = `「${targetWord}」の日本語訳を簡潔に答えてください。単語の場合は主な意味1つ、熟語や文の場合は主な意味を答えてください。説明は不要で、翻訳だけを答えてください。`;

    try {
      const res = await fetch(`${MODEL_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!res.ok) {
        let apiMessage = "";
        try {
          const errorBody = await res.json();
          apiMessage = errorBody?.error?.message
            ? `: ${errorBody.error.message}`
            : "";
        } catch (parseError) {
          console.error("Failed to parse API error response:", parseError);
        }
        throw new Error(`API Error ${res.status}${apiMessage}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!text) {
        setErrorMessage("翻訳結果を取得できませんでした。もう一度お試しください。");
        return "";
      }

      setErrorMessage("");
      return text;
    } catch (e) {
      console.error("Translation error:", e);
      setErrorMessage(
        `翻訳に失敗しました。設定したAPIキーが正しいか、ネットワーク状況を確認してください。（詳細: ${e.message}）`
      );
      return "";
    }
  }

  async function handleAdd() {
    if (!word.trim()) return;

    setIsTranslating(true);
    const translation = await translateWord(word.trim());
    setIsTranslating(false);

    if (translation) {
      setItems((prev) => [
        {
          id: Date.now(),
          word: word.trim(),
          meaning: translation,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      setWord("");
    }
  }

  function handleDelete(id) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  // テスト機能
  function startTest() {
    if (items.length < 3) {
      alert("テストを開始するには3つ以上の単語が必要です");
      return;
    }

    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setShuffledItems(shuffled);
    setTestIndex(0);
    setScore({ correct: 0, total: 0 });
    setMode("test");
    generateChoices(shuffled, 0);
  }

  function generateChoices(itemList, index) {
    const currentItem = itemList[index];
    const otherItems = itemList.filter((it) => it.id !== currentItem.id);

    const incorrectChoices = otherItems
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((it) => it.meaning);

    const allChoices = [currentItem.meaning, ...incorrectChoices].sort(
      () => Math.random() - 0.5
    );

    setChoices(allChoices);
    setSelectedAnswer(null);
    setShowResult(false);
  }

  function handleAnswer(answer) {
    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === shuffledItems[testIndex].meaning;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  }

  function nextQuestion() {
    if (testIndex + 1 < shuffledItems.length) {
      const newIndex = testIndex + 1;
      setTestIndex(newIndex);
      generateChoices(shuffledItems, newIndex);
    } else {
      const finalCorrect =
        score.correct +
        (selectedAnswer === shuffledItems[testIndex].meaning ? 1 : 0);
      const finalTotal = score.total + 1;
      alert(`テスト終了！\n正解: ${finalCorrect}/${finalTotal}\n正答率: ${Math.round((finalCorrect / finalTotal) * 100)}%`);
      setMode("list");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">📘 英語メモ帳</h1>

          {mode === "list" && (
            <button
              onClick={startTest}
              disabled={items.length < 3}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Shuffle className="w-5 h-5" />
              テスト
            </button>
          )}

          {mode === "test" && (
            <button
              onClick={() => setMode("list")}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <List className="w-5 h-5" />
              一覧へ
            </button>
          )}
        </div>

        {/* 入力エリア - リストモードのみ */}
        {mode === "list" && (
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTranslating && handleAdd()}
                placeholder="英単語・英文を入力"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 text-base"
                disabled={isTranslating}
              />
              <button
                onClick={handleAdd}
                disabled={isTranslating || !word.trim()}
                className="bg-indigo-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isTranslating ? "..." : <PlusCircle className="w-6 h-6" />}
              </button>
            </div>
            {errorMessage && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </div>

      {/* コンテンツエリア */}
      {mode === "list" ? (
        // 単語リスト
        <div className="px-4 py-4 pb-20 space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 mt-8">
              <p className="text-base">まだ単語が登録されていません</p>
              <p className="text-sm mt-2">上のフォームから追加してください</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-800 break-words flex-1">
                        {item.word}
                      </h3>
                      <button
                        onClick={() => speak(item.word)}
                        className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 transition-colors p-1"
                        aria-label="発音を聞く"
                      >
                        <Volume2 className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="text-base text-gray-600 break-words">
                      {item.meaning}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors p-1"
                    aria-label="削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // テストモード
        <div className="px-4 py-8 pb-20">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto">
            {/* スコア表示 */}
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-500 mb-1">
                問題 {testIndex + 1} / {shuffledItems.length}
              </p>
              <p className="text-lg font-semibold text-indigo-600">
                正解: {score.correct} / {score.total}
              </p>
            </div>

            {/* 問題 */}
            <div className="mb-8 text-center">
              <div className="flex items-start justify-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-800 break-words flex-1">
                  {shuffledItems[testIndex]?.word}
                </h2>
                <button
                  onClick={() => speak(shuffledItems[testIndex]?.word)}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors flex-shrink-0"
                  aria-label="発音を聞く"
                >
                  <Volume2 className="w-7 h-7" />
                </button>
              </div>
              <p className="text-gray-600">日本語訳を選んでください</p>
            </div>

            {/* 選択肢 */}
            <div className="space-y-3 mb-6">
              {choices.map((choice, index) => {
                const isSelected = selectedAnswer === choice;
                const isCorrect = choice === shuffledItems[testIndex]?.meaning;
                const showCorrect = showResult && isCorrect;
                const showIncorrect = showResult && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => !showResult && handleAnswer(choice)}
                    disabled={showResult}
                    className={`w-full px-6 py-4 rounded-lg text-left text-base font-medium transition-all break-words ${
                      showCorrect
                        ? "bg-green-500 text-white"
                        : showIncorrect
                        ? "bg-red-500 text-white"
                        : isSelected
                        ? "bg-indigo-100 border-2 border-indigo-500"
                        : "bg-gray-50 border-2 border-gray-200 hover:border-indigo-300 active:bg-gray-100"
                    } ${showResult ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {/* 次へボタン */}
            {showResult && (
              <button
                onClick={nextQuestion}
                className="w-full bg-indigo-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
              >
                {testIndex + 1 < shuffledItems.length
                  ? "次の問題へ"
                  : "結果を見る"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
