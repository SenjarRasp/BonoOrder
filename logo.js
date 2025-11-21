// Логотип приложения Bono заявки
// Вставьте ваше base64 изображение логотипа здесь
const APP_LOGO_BASE64 = ``;

// Альтернативно можно использовать URL до изображения
const APP_LOGO_URL = '';

// Метод для получения логотипа
function getAppLogo() {
    if (APP_LOGO_BASE64) {
        return `data:image/png;base64,${APP_LOGO_BASE64}`;
    }
    if (APP_LOGO_URL) {
        return APP_LOGO_URL;
    }
    // Заглушка если лого нет
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzQ5OGRiIiByeD0iOCI+PC9yZWN0Pgo8dGV4dCB4PSI0MCIgeT0iNDUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJPTk88L3RleHQ+Cjwvc3ZnPgo=';
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getAppLogo };
}
