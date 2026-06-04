# Market Intelligence Agent 🕵️‍♂️

**Market Intelligence Agent** — это автономный AI-аналитик, который собирает, анализирует и структурирует информацию из веб-страниц и загруженных PDF-документов.

## 🌐 Live Demo
**Публичная версия проекта:** [https://diploma-ai-agent.vercel.app](https://diploma-ai-agent.vercel.app)

## 📸 Скриншот интерфейса
*(Добавьте сюда скриншот вашего работающего чата или короткую GIF, например `![Demo](./docs/demo.png)`)*

## 🚀 Технологический стек
* **Frontend:** Next.js, React, Tailwind CSS (Vercel)
* **Backend:** Python, FastAPI, Uvicorn, Slowapi (Render)
* **AI & Логика:** LangGraph, LangChain, Groq API (Llama 3.1)
* **Инфраструктура:** Docker, Docker Compose

## 🌟 Ключевые особенности (Stand Out)
* **Streaming end-to-end:** Плавный потоковый вывод текста, аналогичный ChatGPT, с индикацией работы агента и мгновенным откликом.
* **Продвинутый RAG:** Извлечение и анализ текста из PDF-документов "на лету" без предварительной подготовки векторной базы.
* **Автономные Tools:** ИИ сам принимает решение, когда использовать Web Scraper для чтения ссылок, а когда — парсер документов для работы с загруженными файлами.

## 🛠 Инструкция по локальному запуску
Для запуска проекта на вашем компьютере потребуется установленный Docker Desktop.

1. Склонируйте репозиторий:
```bash
   git clone [https://github.com/adilkhan1993/diploma-ai-agent.git](https://github.com/adilkhan1993/diploma-ai-agent.git)
   cd diploma-ai-agent