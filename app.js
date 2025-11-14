class RestaurantOrderApp {
    constructor() {
        this.basePath = window.location.pathname.includes('/BonoOrder/') 
            ? '/BonoOrder/' 
            : '/';
        
        // API URL
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyRbvBN86m1RrLdvHtrlsN5JYL4qMFGF3mIwsESxXVSmpZZEHF1i8L-QQ4Ec6YVZWSF4g/exec';
        this.currentUser = null;
        this.currentScreen = 'login';
        this.ordersHistory = [];

        // Принудительное обновление Service Worker
        this.forceUpdate();
        
        this.init();
    }
    
    init() {
        this.renderScreen('login');
        this.setupEventListeners();
        this.testConnection();
    }

    // Добавьте этот метод в класс RestaurantOrderApp
    checkUserState() {
        console.log('=== USER STATE CHECK ===');
        console.log('Current user:', this.currentUser);
        console.log('User email:', this.currentUser ? this.currentUser.email : 'NO USER');
        console.log('Screen:', this.currentScreen);
        
        if (!this.currentUser) {
            this.showNotification('error', 'Пользователь не авторизован');
        } else if (!this.currentUser.email) {
            this.showNotification('error', 'Email пользователя не найден');
        } else {
            this.showNotification('success', `Пользователь: ${this.currentUser.email}`);
        }
    }

    async forceUpdate() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                
                // Проверяем обновления каждые 30 секунд
                setInterval(async () => {
                    await registration.update();
                }, 30000);
                
                // Слушаем сообщения от Service Worker
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'NEW_VERSION') {
                        if (confirm('Доступна новая версия приложения. Обновить сейчас?')) {
                            window.location.reload();
                        }
                    }
                });
                
            } catch (error) {
                console.log('Service Worker update error:', error);
            }
        }
    }
    
    // Тест подключения
    async testConnection() {
        try {
            console.log('🔌 Testing API connection...');
            const response = await fetch(this.apiUrl);
            const result = await response.json();
            console.log('✅ API connection successful:', result);
        } catch (error) {
            console.log('⚠️ API test failed, but continuing...');
        }
    }
    
    // API CALL для реальных данных
    async apiCall(action, data = {}) {
        console.log('📡 API Call:', action, data);
        
        try {
            const url = new URL(this.apiUrl);
            url.searchParams.set('action', action);
            url.searchParams.set('data', JSON.stringify(data));
            
            const response = await fetch(url.toString());
            const result = await response.json();
            console.log('✅ API Response:', result);
            
            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ API Error:', error);
            throw new Error('Ошибка соединения: ' + error.message);
        }
    }
    // Обработка логина - исправленная версия
    async handleLogin(email, password) {
        try {
            this.showNotification('loading', 'Вход в систему...');
            const loginResult = await this.apiCall('login', { email, password });
            
            // Сохраняем всю информацию о пользователе
            this.currentUser = {
                email: loginResult.user.email,
                department: loginResult.user.department,
                position: loginResult.user.position,
                token: loginResult.token
            };

            console.log('=== AFTER LOGIN!!! ===');
            console.log('Current user object:', this.currentUser);
            console.log('User email:', this.currentUser.email);
            console.log('✅ User logged in:', this.currentUser);
            
            this.renderScreen('main');
            this.showNotification('success', `Добро пожаловать, ${this.currentUser.position}!`);
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }
    
    // Загрузка товаров
    async loadTemplateProducts(templateId) {
        try {
            this.showNotification('loading', 'Загрузка товаров...');
            const result = await this.apiCall('get_products');
            
            this.renderScreen('order_creation', { 
                templateId, 
                templateName: result.template_name || 'Заявка',
                products: result.grouped_products 
            });
        } catch (error) {
            this.showNotification('error', 'Ошибка загрузки товаров: ' + error.message);
        }
    }

    // Отправка заявки
    async submitOrder(templateName) {
        console.log('=== SUBMIT ORDER DEBUG ===');
        console.log('Current user:', this.currentUser);
        console.log('Current user email:', this.currentUser ? this.currentUser.email : 'UNDEFINED!');
        
        try {
            const items = this.collectOrderItems();
            console.log('Items to send:', items);
            
            if (items.length === 0) {
                this.showNotification('error', 'Добавьте хотя бы один товар в заявку');
                return;
            }
            
            this.showNotification('loading', 'Отправка заявки поставщикам...');
            
            const requestData = {
                userEmail: this.currentUser.email,
                templateName: templateName,
                items: items
            };
            
            console.log('API request data:', requestData);
            
            const result = await this.apiCall('create_order', requestData);
            
            // Сохраняем в историю
            this.ordersHistory.unshift({
                order_id: result.order_id,
                date: result.timestamp || new Date().toISOString(),
                template: templateName,
                status: 'success',
                items_count: items.length
            });
            
            this.showNotification('success', 
                `✅ Заявка ${result.order_id} отправлена!\n` +
                `📧 Уведомления отправлены поставщикам`
            );
            
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
                    comment: commentInput ? commentInput.value : ''
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
                        <input type="email" id="email" placeholder="Email" required value="test@restaurant.com">
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Пароль" required value="123456">
                    </div>
                    <button type="submit" class="btn primary" style="width: 100%;">Войти</button>
                </form>
                
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #7f8c8d;">
                    <strong>Тестовый доступ:</strong><br>
                    Используйте любые email и пароль
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
                /*// И добавьте кнопку для проверки в главный экран (временно)
                // В renderMainScreen добавьте
                <div class="action-card" onclick="app.checkUserState()">
                    <div class="action-icon">🔍</div>
                    <h3>Проверить состояние</h3>
                    <p>Отладочная информация</p>
                </div> */
                
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
                    <h3>🚀 Режим реального API</h3>
                    <p>Приложение подключено к Google Apps Script. Все операции выполняются в реальном времени.</p>
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
                    </div>
                    
                    <div class="template-card" onclick="app.loadTemplateProducts(2)">
                        <div class="template-icon">📦</div>
                        <h3>Еженедельная закупка</h3>
                        <p>Полный набор товаров на неделю</p>
                    </div>
                    
                    <div class="template-card" onclick="app.loadTemplateProducts(3)">
                        <div class="template-icon">🚨</div>
                        <h3>Срочная закупка</h3>
                        <p>Экспресс-заказ критичных позиций</p>
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
            if (data.products[dept].length > 0) {
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








