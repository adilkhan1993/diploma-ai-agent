import { useState } from "react";

export type Message = { role: "user" | "assistant"; content: string };

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Привет! Я твой ИИ-ассистент. Чем могу помочь сегодня?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    // Добавляем сообщение пользователя и пустую заготовку для ответа ИИ
    setMessages((prev) => [...prev, { role: "user", content: prompt }, { role: "assistant", content: "" }]);
    setIsLoading(true);

    try {
      // Стучимся строго на наш локальный FastAPI бэкенд
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ prompt: prompt }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      // Читаем потоковый ответ (Streaming) по кусочкам
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content += chunk;
            return newMsgs;
          });
        }
      }
    } catch (error) {
      console.error("Ошибка сети:", error);
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: "❌ Ошибка соединения. Проверьте запущен ли бэкенд." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading };
}