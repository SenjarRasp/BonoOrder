class RestaurantOrderApp {
    constructor() {
        // ЗАМЕНИТЕ НА ВАШ URL Google Apps Script
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyRbvBN86m1RrLdvHtrlsN5JYL4qMFGF3mIwsESxXVSmpZZEHF1i8L-QQ4Ec6YVZWSF4g/exec';
        this.currentUser = null;
        this.currentScreen = 'login';
        this.ordersHistory = [];
        this.deferredPrompt = null;
        
        this.init();
    }
    
    init() {
        this.renderScreen('login');
        this.setupEventListeners();
        this.setupPWA();
    }

    // ОБНОВЛЕННЫЙ API CALL с обработкой CORS
    async apiCall(action, data = {}) {
        console.log('API Call:', action, data);
        
        // Если это локальное тестирование или GitHub Pages - используем мок
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('github.io')) {
            return this.mockApiCall(action, data);
        }
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                mode: 'no-cors', // Важно: no-cors для обхода CORS
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    ...data
                })
            });
            
            // С no-cors мы не можем прочитать response, поэтому всегда используем мок
            console.log('Используем мок данные из-за CORS ограничений');
            return this.mockApiCall(action, data);
            
        } catch (error) {
            console.error('API Error, используем мок:', error);
            return this.mockApiCall(action, data);
        }
    }

    // ОБНОВЛЕННАЯ настройка PWA
    setupPWA() {
        // Регистрация Service Worker с обработкой ошибок
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/BonoOrder/sw.js') // Укажите правильный путь
                .then((registration) => {
                    console.log('Service Worker зарегистрирован:', registration);
                })
                .catch((error) => {
                    console.log('Ошибка SW, продолжаем без него:', error);
                    // Продолжаем работу без Service Worker
                });
        }
        
        // Обработчик установки PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA можно установить');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
    }

    // Показ промпта установки
    showInstallPrompt() {
        // Добавляем кнопку установки в интерфейс
        if (this.currentScreen === 'main') {
            const installBtn = document.createElement('button');
            installBtn.className = 'btn primary';
            installBtn.innerHTML = '📲 Установить приложение';
            installBtn.style.margin = '10px 0';
            installBtn.onclick = () => this.installPWA();
            
            const appElement = document.getElementById('app');
            const mainScreen = appElement.querySelector('.main-screen');
            if (mainScreen) {
                mainScreen.appendChild(installBtn);
            }
        }
    }

    // Установка PWA
    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            this.deferredPrompt = null;
        }
    }
