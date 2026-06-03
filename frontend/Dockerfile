# Используем новую версию Node.js
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы пакетов
COPY package*.json ./

# Делаем npm устойчивым к сбоям сети и устанавливаем зависимости
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm install --network-timeout=1000000

# Копируем остальные файлы проекта
COPY . .

# Открываем порт 3000
EXPOSE 3000

# Запускаем в режиме разработчика (безотказный вариант)
CMD ["npm", "run", "dev"]