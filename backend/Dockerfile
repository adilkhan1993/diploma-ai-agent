# Используем официальный образ Python
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы проекта
COPY . /app/

# Устанавливаем зависимости
RUN pip install --no-cache-dir fastapi uvicorn pydantic requests beautifulsoup4 python-dotenv groq slowapi PyPDF2 python-multipart

# Открываем порт 8000
EXPOSE 8000

# Команда для запуска сервера
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]