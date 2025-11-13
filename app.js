class RestaurantOrderApp {
    constructor() {
        // Определяем базовый путь для GitHub Pages
        this.basePath = window.location.pathname.includes('/BonoOrder/') 
            ? '/BonoOrder/' 
            : '/';
        
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyRbvBN86m1RrLdvHtrlsN5JYL4qMFGF3mIwsESxXVSmpZZEHF1i8L-QQ4Ec6YVZWSF4g/exec';
        this.currentUser = null;
        this.currentScreen = 'login';
        this.ordersHistory = [];
        this.deferredPrompt = null;
        this.installPromptShown = false;
        
        this.init();
    }
    
    init() {
        this.renderScreen('login');
        this.setupEventListeners();
        this.setupPWA();
    }

    // ОБНОВЛЕННАЯ настройка PWA с правильными путями
    setupPWA() {
        // Регистрация Service Worker с правильным путем
        if ('serviceWorker' in navigator) {
            const swPath = `${this.basePath}sw.js`;
            
            navigator.serviceWorker.register(swPath)
                .then((registration) => {
                    console.log('Service Worker зарегистрирован:', registration);
                })
                .catch((error) => {
                    console.log('Ошибка SW, продолжаем без него:', error);
                    // Создаем заглушку если файла нет
                    this.createFallbackSW();
                });
        }
        
        // Обработчик установки PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA можно установить');
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Показываем кнопку установки через 3 секунды
            if (!this.installPromptShown) {
                setTimeout(() => this.showInstallPrompt(), 3000);
                this.installPromptShown = true;
            }
        });

        // Отслеживание успешной установки
        window.addEventListener('appinstalled', (evt) => {
            console.log('PWA успешно установлено');
            this.deferredPrompt = null;
        });
    }

    // Создание заглушки если SW файла нет
    createFallbackSW() {
        const blob = new Blob([
            `self.addEventListener('install', (e) => { 
                self.skipWaiting(); 
            });
            self.addEventListener('activate', (e) => {
                e.waitUntil(self.clients.claim());
            });
            self.addEventListener('fetch', (e) => {
                e.respondWith(fetch(e.request));
            });`
        ], { type: 'application/javascript' });
        
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then(reg => console.log('Fallback SW registered'))
            .catch(err => console.log('Fallback SW failed:', err));
    }

    // Показ промпта установки
    showInstallPrompt() {
        if (this.deferredPrompt && this.currentScreen === 'main') {
            const installSection = document.createElement('div');
            installSection.className = 'install-prompt';
            installSection.innerHTML = `
                <div style="background: #e8f5e8; border: 2px solid #4caf50; border-radius: 10px; padding: 15px; margin: 15px 0; text-align: center;">
                    <h3 style="margin: 0 0 10px 0; color: #2e7d32;">📱 Установить приложение</h3>
                    <p style="margin: 0 0 15px 0; color: #555;">Установите приложение для быстрого доступа</p>
                    <button class="btn primary" id="installBtn" style="margin: 5px;">Установить</button>
                    <button class="btn secondary" id="laterBtn" style="margin: 5px;">Позже</button>
                </div>
            `;
            
            const appElement = document.getElementById('app');
            const mainScreen = appElement.querySelector('.main-screen');
            if (mainScreen) {
                mainScreen.insertBefore(installSection, mainScreen.firstChild);
                
                document.getElementById('installBtn').onclick = () => this.installPWA();
                document.getElementById('laterBtn').onclick = () => {
                    installSection.remove();
                    this.installPromptShown = false;
                };
            }
        }
    }

    // Установка PWA
    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`User response: ${outcome}`);
            
            if (outcome === 'accepted') {
                this.deferredPrompt = null;
                // Скрываем промпт после установки
                const installPrompt = document.querySelector('.install-prompt');
                if (installPrompt) installPrompt.remove();
            }
        }
    }

    // ОБНОВЛЕННЫЙ API CALL
    async apiCall(action, data = {}) {
        console.log('API Call:', action, data);
        
        // Всегда используем мок для GitHub Pages из-за CORS
        return this.mockApiCall(action, data);
    }

    // Мок API для локального тестирования
    mockApiCall(action, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                switch(action) {
                    case 'login':
                        if (data.email === 'chef@restaurant.com' && data.password === '123456') {
                            resolve({
                                user: { 
                                    email: data.email, 
                                    department: 'кухня', 
                                    position: 'шеф-повар' 
                                },
                                token: 'mock_token_' + Date.now()
                            });
                        } else {
                            reject(new Error('Неверный email или пароль'));
                        }
                        break;
                        
                    case 'get_products':
                        const mockProducts = {
                            grouped_products: {
                                'кухня': [
                                    { id: 1, name: 'Картофель', unit: 'кг', department_tags: 'кухня,овощи', suppliers: [1,2] },
                                    { id: 2, name: 'Морковь', unit: 'кг', department_tags: 'кухня,овощи', suppliers: [1] },
                                    { id: 3, name: 'Лук репчатый', unit: 'кг', department_tags: 'кухня,овощи', suppliers: [1,2] },
                                    { id: 4, name: 'Говядина', unit: 'кг', department_tags: 'кухня,мясо', suppliers: [2] }
                                ],
                                'бар': [
                                    { id: 5, name: 'Виски', unit: 'шт', department_tags: 'бар,алкоголь', suppliers: [3] },
                                    { id: 6, name: 'Водка', unit: 'шт', department_tags: 'бар,алкоголь', suppliers: [3] },
                                    { id: 7, name: 'Тоник', unit: 'л', department_tags: 'бар,напитки', suppliers: [4] }
                                ],
                                'зал': [
                                    { id: 8, name: 'Салфетки', unit: 'уп', department_tags: 'зал,расходники', suppliers: [5] },
                                    { id: 9, name: 'Свечи', unit: 'шт', department_tags: 'зал,декор', suppliers: [5] }
                                ]
                            }
                        };
                        resolve(mockProducts);
                        break;
                        
                    case 'create_order':
                        const orderId = 'ORD_' + Math.random().toString(36).substr(2, 8).toUpperCase();
                        resolve({ 
                            order_id: orderId,
                            send_results: [
                                { supplier: 'ООО "Овощи"', status: 'success' },
                                { supplier: 'ООО "Мясо"', status: 'success' },
                                { supplier: 'ООО "Алкоголь"', status: 'success' }
                            ]
                        });
                        break;
                        
                    case 'get_order_history':
                        resolve(this.ordersHistory);
                        break;
                        
                    default:
                        reject(new Error('Unknown action'));
                }
            }, 800); // Имитация задержки сети
        });
    }

    // Обработка логина
    async handleLogin(email, password) {
        try {
            this.showNotification('loading', 'Вход в систему...');
            this.currentUser = await this.apiCall('login', { email, password });
            this.renderScreen('main');
            this.showNotification('success', `Добро пожаловать, ${this.currentUser.position}!`);
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }

    // Загрузка товаров по шаблону
    async loadTemplateProducts(templateId) {
        try {
            this.showNotification('loading', 'Загрузка товаров...');
            const templateName = ['', 'Ежедневная', 'Еженедельная', 'Срочная'][templateId];
            const products = await this.apiCall('get_products', { templateId });
            this.renderScreen('order_creation', { 
                templateId, 
                templateName, 
                products: products.grouped_products 
            });
        } catch (error) {
            this.showNotification('error', 'Ошибка загрузки товаров: ' + error.message);
        }
    }

    // Отправка заявки
    async submitOrder(templateName) {
        try {
            const items = this.collectOrderItems();
            
            if (items.length === 0) {
                this.showNotification('error', 'Добавьте хотя бы один товар в заявку');
                return;
            }
            
            this.showNotification('loading', 'Отправка заявки...');
            
            const result = await this.apiCall('create_order', {
                userEmail: this.currentUser.email,
                templateName: templateName,
                items: items
            });
            
            // Сохраняем в историю
            this.ordersHistory.unshift({
                order_id: result.order_id,
                date: new Date().toISOString(),
                template: templateName,
                status: 'success',
                items_count: items.length
            });
            
            this.showNotification('success', 
                `✅ Заявка ${result.order_id} отправлена!\n` +
                `📧 Уведомления отправлены поставщикам`
            );
            
            // Возвращаем на главный экран через 3 секунды
            setTimeout(() => {
                this.renderScreen('main');
            }, 3000);
            
        } catch (error) {
            this.showNotification('error', 'Ошибка отправки: ' + error.message);
        }
    }

    // Сбор данных из формы заявки
    collectOrderItems() {
        const items = [];
        const quantityInputs = document.querySelectorAll('.quantity-input');
        
        quantityInputs.forEach(input => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                const productId = input.dataset.productId;
                const commentInput = document.querySelector(`.comment-input[data-product-id="${productId}"]`);
                const productElement = input.closest('.product-item');
                const productName = productElement.querySelector('.product-name').textContent;
                const productUnit = productElement.querySelector('.product-unit').textContent;
                
                items.push({
                    product_id: productId,
                    product_name: productName,
                    quantity: quantity,
                    unit: productUnit,
                    comment: commentInput ? commentInput.value : '',
                    suppliers: [1, 2, 3] // Mock suppliers
                });
            }
        });
        
        return items;
    }

    // Загрузка истории заявок
    async loadOrderHistory() {
        try {
            this.showNotification('loading', 'Загрузка истории...');
            this.ordersHistory = await this.apiCall('get_order_history', {
                userEmail: this.currentUser.email
            });
            this.renderScreen('order_history');
        } catch (error) {
            this.showNotification('error', 'Ошибка загрузки истории');
            this.renderScreen('order_history');
        }
    }

    // Рендер экранов
    renderScreen(screenName, data = null) {
        this.currentScreen = screenName;
        const app = document.getElementById('app');
        
        switch(screenName) {
            case 'login':
                app.innerHTML = this.renderLoginScreen();
                break;
            case 'main':
                app.innerHTML = this.renderMainScreen();
                break;
            case 'template_selection':
                app.innerHTML = this.renderTemplateSelectionScreen();
                break;
            case 'order_creation':
                app.innerHTML = this.renderOrderCreationScreen(data);
                break;
            case 'order_history':
                app.innerHTML = this.renderOrderHistoryScreen();
                break;
        }

        // После рендера обновляем промпт установки
        if (screenName === 'main' && this.deferredPrompt && !this.installPromptShown) {
            setTimeout(() => this.showInstallPrompt(), 1000);
        }
    }

    // Рендер экрана логина
    renderLoginScreen() {
        return `
            <div class="login-screen">
                <div class="logo">🍽️</div>
                <h1>Restaurant Orders</h1>
                <p style="color: #7f8c8d; margin-bottom: 30px; text-align: center;">Система управления заявками</p>
                
                <form id="loginForm" class="form">
                    <div class="input-group">
                        <input type="email" id="email" placeholder="Email" required value="chef@restaurant.com">
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Пароль" required value="123456">
                    </div>
                    <button type="submit" class="btn primary" style="width: 100%;">Войти</button>
                </form>
                
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #7f8c8d;">
                    <strong>Тестовые данные:</strong><br>
                    Email: chef@restaurant.com<br>
                    Пароль: 123456
                </div>
                
                <div id="loginStatus" class="status"></div>
            </div>
        `;
    }

    // Рендер главного экрана
    renderMainScreen() {
        return `
            <div class="main-screen">
                <header class="header">
                    <h1>Главная</h1>
                    <div class="user-info">
                        ${this.currentUser.department} • ${this.currentUser.position}
                    </div>
                </header>
                
                <div class="actions-grid">
                    <div class="action-card" onclick="app.renderScreen('template_selection')">
                        <div class="action-icon">📋</div>
                        <h3>Новая заявка</h3>
                        <p>Создать заказ поставщикам</p>
                    </div>
                    
                    <div class="action-card" onclick="app.loadOrderHistory()">
                        <div class="action-icon">📊</div>
                        <h3>История заявок</h3>
                        <p>Посмотреть отправленные</p>
                    </div>
                    
                    <div class="action-card" onclick="app.logout()">
                        <div class="action-icon">🚪</div>
                        <h3>Выйти</h3>
                        <p>Завершить сеанс</p>
                    </div>
                </div>
                
                <div class="notifications">
                    <h3>💡 Режим демонстрации</h3>
                    <p>Приложение работает с тестовыми данными. Все функции доступны для тестирования.</p>
                </div>
            </div>
        `;
    }

    // Рендер экрана выбора шаблона
    renderTemplateSelectionScreen() {
        return `
            <div class="template-screen">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">← Назад</button>
                    <h1>Выбор шаблона</h1>
                </header>
                
                <div class="templates-grid">
                    <div class="template-card" onclick="app.loadTemplateProducts(1)">
                        <div class="template-icon">📅</div>
                        <h3>Ежедневная закупка</h3>
                        <p>Основные позиции для ежедневных нужд</p>
                        <small style="color: #27ae60;">Овощи, мясо, базовые продукты</small>
                    </div>
                    
                    <div class="template-card" onclick="app.loadTemplateProducts(2)">
                        <div class="template-icon">📦</div>
                        <h3>Еженедельная закупка</h3>
                        <p>Полный набор товаров на неделю</p>
                        <small style="color: #2980b9;">Все категории: кухня, бар, зал</small>
                    </div>
                    
                    <div class="template-card" onclick="app.loadTemplateProducts(3)">
                        <div class="template-icon">🚨</div>
                        <h3>Срочная закупка</h3>
                        <p>Экспресс-заказ критичных позиций</p>
                        <small style="color: #e74c3c;">Только самые необходимые товары</small>
                    </div>
                </div>
            </div>
        `;
    }

    // Рендер экрана создания заявки
    renderOrderCreationScreen(data) {
        if (!data || !data.products) {
            return this.renderTemplateSelectionScreen();
        }
        
        let productsHtml = '';
        
        Object.keys(data.products).forEach(dept => {
            productsHtml += `
                <div class="department-group">
                    <div class="department-header">${dept.toUpperCase()}</div>
            `;
            
            data.products[dept].forEach(product => {
                productsHtml += `
                    <div class="product-item">
                        <div class="product-info">
                            <div class="product-name">${product.name}</div>
                            <div class="product-unit">${product.unit}</div>
                        </div>
                        <input type="number" 
                               class="quantity-input" 
                               min="0" 
                               value="0" 
                               data-product-id="${product.id}"
                               placeholder="0">
                        <input type="text" 
                               class="comment-input" 
                               placeholder="Комментарий"
                               data-product-id="${product.id}">
                    </div>
                `;
            });
            
            productsHtml += `</div>`;
        });
        
        return `
            <div class="order-screen">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('template_selection')">← Назад</button>
                    <h1>${data.templateName}</h1>
                </header>
                
                ${productsHtml}
                
                <button class="btn primary" onclick="app.submitOrder('${data.templateName}')" style="width: 100%; margin-top: 20px; padding: 15px; font-size: 18px;">
                    📨 Отправить заявку поставщикам
                </button>
                
                <div id="orderStatus" class="status"></div>
            </div>
        `;
    }

    // Рендер экрана истории заявок
    renderOrderHistoryScreen() {
        let ordersHtml = '';
        
        if (this.ordersHistory.length === 0) {
            ordersHtml = `
                <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📭</div>
                    <h3>Заявок пока нет</h3>
                    <p>Создайте первую заявку на главном экране</p>
                </div>
            `;
        } else {
            this.ordersHistory.forEach(order => {
                ordersHtml += `
                    <div class="order-item ${order.status}">
                        <div class="order-header">
                            <span class="order-id">${order.order_id}</span>
                            <span class="order-date">${new Date(order.date).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div class="order-details">
                            <span>${order.template}</span>
                            <span>${order.items_count} товаров</span>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px; color: #27ae60;">
                            ✅ Успешно отправлена
                        </div>
                    </div>
                `;
            });
        }
        
        return `
            <div class="history-screen">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">← Назад</button>
                    <h1>История заявок</h1>
                </header>
                
                ${ordersHtml}
            </div>
        `;
    }

    // Показать уведомление
    showNotification(type, message) {
        let statusElement;
        
        switch(this.currentScreen) {
            case 'login':
                statusElement = document.getElementById('loginStatus');
                break;
            case 'order_creation':
                statusElement = document.getElementById('orderStatus');
                break;
            default:
                // Создаем временное уведомление
                const tempDiv = document.createElement('div');
                tempDiv.className = `status ${type}`;
                tempDiv.textContent = message;
                tempDiv.style.position = 'fixed';
                tempDiv.style.top = '20px';
                tempDiv.style.left = '50%';
                tempDiv.style.transform = 'translateX(-50%)';
                tempDiv.style.zIndex = '1000';
                tempDiv.style.maxWidth = '90%';
                tempDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                
                document.body.appendChild(tempDiv);
                
                setTimeout(() => {
                    if (document.body.contains(tempDiv)) {
                        document.body.removeChild(tempDiv);
                    }
                }, 4000);
                return;
        }
        
        if (statusElement) {
            statusElement.className = `status ${type}`;
            statusElement.textContent = message;
            statusElement.style.display = 'block';
            
            if (type !== 'loading') {
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 4000);
            }
        }
        
        console.log(`${type}: ${message}`);
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                this.handleLogin(email, password);
            }
        });
    }

    // Выход из системы
    logout() {
        this.currentUser = null;
        this.ordersHistory = [];
        this.renderScreen('login');
    }
}

// Инициализация приложения
const app = new RestaurantOrderApp();
