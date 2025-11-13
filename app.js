class RestaurantOrderApp {
    constructor() {
        this.basePath = window.location.pathname.includes('/BonoOrder/') 
            ? '/BonoOrder/' 
            : '/';
        
        // РЕАЛЬНЫЙ API URL
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
        this.testConnection();
    }

    // ТЕСТ ПОДКЛЮЧЕНИЯ
    async testConnection() {
        try {
            console.log('Testing API connection...');
            // Простой тест - попробуем получить продукты
            await this.apiCall('get_products', { templateId: 1 });
            console.log('✅ API connection successful');
        } catch (error) {
            console.log('❌ API connection failed:', error);
            this.showNotification('error', 
                'Ошибка подключения к серверу. Проверьте настройки Google Apps Script.'
            );
        }
    }

    // ВРЕМЕННЫЙ API CALL для отладки
    async apiCall(action, data = {}) {
        console.log('📡 API Call:', action, data);
        
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    ...data
                })
            });
            
            console.log('✅ Response status:', response.status);
            console.log('✅ Response headers:', response.headers);
            
            const result = await response.text();
            console.log('✅ Response text:', result);
            
            const jsonResult = JSON.parse(result);
            
            if (jsonResult.status === 'success') {
                return jsonResult.data;
            } else {
                throw new Error(jsonResult.message);
            }
            
        } catch (error) {
            console.error('❌ API Error:', error);
            throw new Error('Ошибка соединения: ' + error.message);
        }
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

    // ОБРАБОТКА ЛОГИНА С РЕАЛЬНЫМИ ДАННЫМИ
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

    // ЗАГРУЗКА РЕАЛЬНЫХ ТОВАРОВ
    async loadTemplateProducts(templateId) {
        try {
            this.showNotification('loading', 'Загрузка товаров...');
            const result = await this.apiCall('get_products', { templateId });
            
            this.renderScreen('order_creation', { 
                templateId, 
                templateName: result.template_name || 'Шаблон',
                products: result.grouped_products 
            });
        } catch (error) {
            this.showNotification('error', 'Ошибка загрузки товаров: ' + error.message);
        }
    }

    // ОТПРАВКА РЕАЛЬНОЙ ЗАЯВКИ
    async submitOrder(templateName) {
        try {
            const items = this.collectOrderItems();
            
            if (items.length === 0) {
                this.showNotification('error', 'Добавьте хотя бы один товар в заявку');
                return;
            }
            
            this.showNotification('loading', 'Отправка заявки поставщикам...');
            
            const result = await this.apiCall('create_order', {
                userEmail: this.currentUser.email,
                templateName: templateName,
                items: items
            });
            
            // Сохраняем в историю
            this.ordersHistory.unshift({
                order_id: result.order_id,
                date: result.timestamp || new Date().toISOString(),
                template: templateName,
                status: 'success',
                items_count: items.length
            });
            
            // Показываем результаты отправки
            const successCount = result.send_results.filter(r => r.status === 'success').length;
            const totalCount = result.send_results.length;
            
            this.showNotification('success', 
                `✅ Заявка ${result.order_id} отправлена!\n` +
                `📧 Уведомления отправлены ${successCount} из ${totalCount} поставщиков`
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
                    suppliers: [1, 2] // Базовые поставщики
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
            this.showNotification('error', 'Ошибка загрузки истории: ' + error.message);
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
                        <input type="email" id="email" placeholder="Email" required>
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Пароль" required>
                    </div>
                    <button type="submit" class="btn primary" style="width: 100%;">Войти</button>
                </form>
                
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #7f8c8d;">
                    <strong>Тестовые данные из Google Sheets:</strong><br>
                    Используйте данные из таблицы Users
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
                    <h3>📡 Режим реальных данных</h3>
                    <p>Приложение подключено к Google Sheets и Telegram. Все данные сохраняются в реальном времени.</p>
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
                        <small style="color: #27ae60;">Товары из таблицы Products</small>
                    </div>
                    
                    <div class="template-card" onclick="app.loadTemplateProducts(2)">
                        <div class="template-icon">📦</div>
                        <h3>Еженедельная закупка</h3>
                        <p>Полный набор товаров на неделю</p>
                        <small style="color: #2980b9;">Все категории товаров</small>
                    </div>
                    
                    <div class="template-card" onclick="app.loadTemplateProducts(3)">
                        <div class="template-icon">🚨</div>
                        <h3>Срочная закупка</h3>
                        <p>Экспресс-заказ критичных позиций</p>
                        <small style="color: #e74c3c;">Срочные поставки</small>
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
        let hasProducts = false;
        
        Object.keys(data.products).forEach(dept => {
            if (data.products[dept].length > 0) {
                hasProducts = true;
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
            }
        });
        
        if (!hasProducts) {
            productsHtml = `
                <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📦</div>
                    <h3>Товары не найдены</h3>
                    <p>Добавьте товары в таблицу Products в Google Sheets</p>
                </div>
            `;
        }
        
        return `
            <div class="order-screen">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('template_selection')">← Назад</button>
                    <h1>${data.templateName}</h1>
                </header>
                
                ${productsHtml}
                
                ${hasProducts ? `
                    <button class="btn primary" onclick="app.submitOrder('${data.templateName}')" style="width: 100%; margin-top: 20px; padding: 15px; font-size: 18px;">
                        📨 Отправить заявку поставщикам
                    </button>
                ` : ''}
                
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


