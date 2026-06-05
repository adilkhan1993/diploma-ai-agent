"use client";

import { useState, useRef } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Привет! Я твой ИИ-аналитик. Скинь мне ссылку или загрузи PDF-документ, и я его изучу!" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [documentContext, setDocumentContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessages((prev) => [...prev, { role: "user", content: `📎 Загружаю документ: ${file.name}...` }]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://my-rag-backend-o39g.onrender.com/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.status === "success") {
        setDocumentContext(data.text);
        setMessages((prev) => [...prev, { role: "assistant", content: `✅ Документ "${data.filename}" успешно прочитан! Что именно вы хотите узнать из него?` }]);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Ошибка при чтении PDF." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userPrompt = input;
    const updatedMessages: Message[] = [...messages, { role: "user", content: userPrompt }];
    
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      // Подготавливаем историю для отправки
      const historyToSend = updatedMessages.filter((_, index) => index !== 0).map(m => ({ role: m.role, content: m.content }));
      
      // Добавляем PDF контекст в последний запрос
      if (documentContext) {
        const lastIndex = historyToSend.length - 1;
        historyToSend[lastIndex].content = `[КОНТЕКСТ ДОКУМЕНТА: ${documentContext}]\n\nОпираясь на контекст выше, ответь на вопрос: ${historyToSend[lastIndex].content}`;
      }

      const response = await fetch("https://my-rag-backend-o39g.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyToSend }),
      });

      if (response.status === 429) {
        throw new Error("Слишком много запросов. Подождите немного (Rate Limit).");
      }
      if (!response.ok) throw new Error("Ошибка сети");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) return;

      let aiResponseText = ""; 
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        // --- 100% ГАРАНТИЯ ПЛАВНОСТИ (Фронтенд-печатная машинка) ---
        // Печатаем прилетевший текст по одной букве
        for (let i = 0; i < chunk.length; i++) {
          aiResponseText += chunk[i];
          
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: "assistant", content: aiResponseText };
            return newMessages;
          });
          
          // Искусственная задержка в 15 миллисекунд между буквами
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
        // -----------------------------------------------------------
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ Ошибка: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">MyRAGproject Analyst</h1>
        {documentContext && <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">📄 PDF загружен в память</span>}
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`p-4 rounded-xl max-w-[80%] shadow-sm ${
              msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-800"
            }`}>
              
              {/* === АНИМАЦИЯ ЗАГРУЗКИ === */}
              {msg.role === "assistant" && msg.content === "" && isLoading ? (
                <div className="flex items-center space-x-3 text-blue-600 animate-pulse font-medium">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>🤖 Агент читает сайт и анализирует данные...</span>
                </div>
              ) : (
                msg.content
              )}
              {/* ======================= */}

            </div>
          </div>
        ))}
      </main>

      <footer className="bg-white p-4 border-t">
        <div className="max-w-4xl mx-auto flex gap-3 items-center">
          
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            title="Загрузить PDF"
            className="p-3 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            📎
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Задайте вопрос по документу или отправьте ссылку..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black disabled:bg-gray-100"
          />
          
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            Отправить
          </button>
        </div>
      </footer>
    </div>
  );
}