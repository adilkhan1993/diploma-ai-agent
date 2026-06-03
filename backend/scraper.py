import requests
from bs4 import BeautifulSoup

def scrape_website(url: str) -> str:
    """
    Функция получает URL, скачивает страницу и возвращает чистый текст.
    """
    try:
        # Притворяемся обычным браузером (чтобы сайты нас не блокировали)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
        
        # Делаем запрос к сайту
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Проверяем, нет ли ошибок (например, 404)
        
        # Парсим HTML
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Удаляем скрипты и стили (нам нужен только текст)
        for script_or_style in soup(["script", "style", "header", "footer", "nav"]):
            script_or_style.extract()
            
        # Достаем текст
        text = soup.get_text(separator=' ')
        
        # Очищаем текст от лишних пробелов и пустых строк
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Возвращаем первые 3000 символов (чтобы не перегрузить ИИ в будущем)
        return clean_text[:3000]

    except Exception as e:
        return f"Не удалось прочитать сайт {url}. Ошибка: {str(e)}"

# Блок для проверки парсера
if __name__ == "__main__":
    test_url = "https://ru.wikipedia.org/wiki/Искусственный_интеллект"
    print(f"Пытаюсь прочитать сайт: {test_url}\n" + "-"*50)
    
    result = scrape_website(test_url)
    print(result)