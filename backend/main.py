from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import os
import json
import asyncio
import io
import PyPDF2
import logging # <-- ЛОГИРОВАНИЕ
from dotenv import load_dotenv
from groq import AsyncGroq

# <-- ЗАЩИТА ОТ СПАМА (RATE LIMITING)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from scraper import scrape_website

# Настраиваем красивое логирование в терминал
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = AsyncGroq(api_key=GROQ_API_KEY)

app = FastAPI(title="Market Intelligence Agent API")

# Настраиваем лимитер (определяет пользователя по IP)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# НОВАЯ МОДЕЛЬ: теперь мы принимаем не одну строку, а список сообщений
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]

tools = [
    {
        "type": "function",
        "function": {
            "name": "scrape_website",
            "description": "Используй этот инструмент, чтобы скачивать и читать текст с сайтов по URL ссылке. Полезно для анализа новостей, конкурентов и статей.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Полный URL адрес сайта"}
                },
                "required": ["url"],
            },
        },
    }
]

async def agent_streamer(history_messages: list[Message]):
    try:
        logger.info("Начало генерации ответа ИИ...")
        
        # 1. Строгий системный промпт (защита от галлюцинаций и зацикливания)
        messages = [
            {
                "role": "system", 
                "content": (
                    "Ты — профессиональный ИИ-аналитик. "
                    "ВНИМАНИЕ: Используй инструмент 'scrape_website' ТОЛЬКО если пользователь прислал новую ссылку В СВОЕМ САМОМ ПОСЛЕДНЕМ СООБЩЕНИИ. "
                    "ИГНОРИРУЙ любые ссылки, которые были в истории прошлых сообщений. Не вызывай инструмент для старых ссылок. "
                    "НИКОГДА не придумывай и не генерируй ссылки самостоятельно! "
                    "Если пользователь просит перевести текст, уточнить детали или просто общается без новых ссылок, "
                    "отвечай опираясь на историю диалога из своей памяти, СТРОГО БЕЗ ВЫЗОВА инструментов."
                )
            }
        ]
        
        # 2. Добавляем всю историю переписки из фронтенда! (Память)
        for msg in history_messages:
            messages.append({"role": msg.role, "content": msg.content})
            
        # Запрашиваем ИИ
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls
        
        if tool_calls:
            logger.info(f"ИИ решил использовать инструменты: {len(tool_calls)} шт.")
            messages.append(response_message)
            
            for tool_call in tool_calls:
                if tool_call.function.name == "scrape_website":
                    function_args = json.loads(tool_call.function.arguments)
                    url_to_scrape = function_args.get("url")
                    
                    logger.info(f"Парсим сайт: {url_to_scrape}")
                    yield f"⏳ **[Агент читает сайт: {url_to_scrape}]**...\n\n"
                    await asyncio.sleep(0.1)
                    
                    scraped_text = scrape_website(url_to_scrape)
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": "scrape_website",
                        "content": scraped_text,
                    })
            
            # Финальный ответ после прочтения сайтов
            stream = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
                    await asyncio.sleep(0.02)
                    
        else:
            logger.info("ИИ отвечает из памяти (без инструментов).")
            content = response_message.content
            if content:
                words = content.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
                    await asyncio.sleep(0.02)

        logger.info("Генерация успешно завершена.")
    except Exception as e:
        logger.error(f"Ошибка ИИ: {str(e)}")
        yield f"Ошибка при обращении к ИИ: {str(e)}"

# Защищаем эндпоинт: не более 5 запросов в минуту от одного пользователя
@app.post("/api/chat")
@limiter.limit("5/minute")
async def chat(request: Request, body: ChatRequest):
    logger.info(f"Получен запрос в чат. Сообщений в истории: {len(body.messages)}")
    return StreamingResponse(
        agent_streamer(body.messages), 
        media_type="text/plain",
        headers={
            "X-Accel-Buffering": "no",  # <-- Жестко отключаем прокси-накопитель Render
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        logger.info(f"Загрузка файла: {file.filename}")
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        extracted_text = "".join(page.extract_text() + "\n" for page in pdf_reader.pages)
        logger.info("Файл успешно прочитан.")
        return {"status": "success", "filename": file.filename, "text": extracted_text[:15000]}
    except Exception as e:
        logger.error(f"Ошибка чтения PDF: {str(e)}")
        return {"status": "error", "message": str(e)}