class RestaurantOrderApp {
    constructor() {
        // ЗАМЕНИТЕ НА ВАШ URL Google Apps Script после публикации
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyRbvBN86m1RrLdvHtrlsN5JYL4qMFGF3mIwsESxXVSmpZZEHF1i8L-QQ4Ec6YVZWSF4g/exec';
        this.currentUser = null;
        this.currentScreen = 'login';
        this.ordersHistory = [];
        
        this.init();
    }
    
    init() {
        this.renderScreen('login');
        this.setupEventListeners();
        this.setupPWA();
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
    
    // Экран логина
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
    
    // Главный экран
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
                    <h3>💡 Подсказка для тестирования</h3>
                    <p>Для локального тестирования API вызовы будут эмулироваться. После настройки Google Apps Script замените apiUrl на ваш URL.</p>
                </div>
            </div>
        `;
    }
    
    // Экран выбора шаблона
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
    
    // Экран создания заявки
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
                
                <button class="btn primary" onclick="app.submitOrder('${data.templateName}')" style="width: 100%; margin-top: 20px;">
                    📨 Отправить заявку
                </button>
                
                <div id="orderStatus" class="status"></div>
            </div>
        `;
    }
    
    // Экран истории заявок
    renderOrderHistoryScreen() {
        let ordersHtml = '';
        
        if (this.ordersHistory.length === 0) {
            ordersHtml = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">Заявок пока нет</p>';
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
    
    // API вызовы с эмуляцией для локального тестирования
    async apiCall(action, data = {}) {
        console.log('API Call:', action, data);
        
        // Эмуляция API для локального тестирования
        if (this.apiUrl.includes('YOUR_SCRIPT_ID')) {
            return this.mockApiCall(action, data);
        }
        
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
            
            const result = await response.json();
            
            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
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
                                    { id: 2, name: 'Морковь', unit: 'кг', department_tags: 'кухня,овощи', suppliers: [1] }
                                ],
                                'бар': [
                                    { id: 3, name: 'Виски', unit: 'шт', department_tags: 'бар,алкоголь', suppliers: [3] },
                                    { id: 4, name: 'Водка', unit: 'шт', department_tags: 'бар,алкоголь', suppliers: [3] }
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
            }, 1000); // Имитация задержки сети
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
            
            this.showNotification('success', `Заявка ${result.order_id} отправлена!`);
            
            // Возвращаем на главный экран через 2 секунды
            setTimeout(() => {
                this.renderScreen('main');
            }, 2000);
            
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
                
                document.body.appendChild(tempDiv);
                
                setTimeout(() => {
                    document.body.removeChild(tempDiv);
                }, 3000);
                return;
        }
        
        if (statusElement) {
            statusElement.className = `status ${type}`;
            statusElement.textContent = message;
            statusElement.style.display = 'block';
        }
        
        console.log(`${type}: ${message}`);
    }
    
    // Настройка PWA
    setupPWA() {
        // Регистрация Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('Service Worker зарегистрирован'))
                .catch(err => console.log('Ошибка SW:', err));
        }
        
        // Промпт установки
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('PWA можно установить');
        });
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