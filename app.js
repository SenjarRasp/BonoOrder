class RestaurantOrderApp {
    constructor() {
        this.basePath = window.location.pathname.includes('/BonoOrder/') 
            ? '/BonoOrder/' 
            : '/';
        
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyRbvBN86m1RrLdvHtrlsN5JYL4qMFGF3mIwsESxXVSmpZZEHF1i8L-QQ4Ec6YVZWSF4g/exec';
        this.currentUser = null;
        this.currentScreen = 'login';
        this.ordersHistory = [];
        this.availableTemplates = [];
        
        this.init();
    }
    
    init() {
        this.renderScreen('login');
        this.setupEventListeners();
    }

    // Обработка логина
    async handleLogin(phone, password) {
        try {
            this.showNotification('loading', 'Вход в систему...');
            const loginResult = await this.apiCall('login', { phone, password });
           
            // Сохраняем информацию о пользователе
            this.currentUser = {
                phone: loginResult.user.phone,
                name: loginResult.user.name,
                department: loginResult.user.department,
                position: loginResult.user.position,
                templates: loginResult.user.templates
            };
            
            console.log('✅ User logged in:', this.currentUser);
            
            this.renderScreen('main');
            this.showNotification('success', `Добро пожаловать, ${this.currentUser.name}!`);
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }

    // Загрузка доступных шаблонов
    async loadUserTemplates() {
        try {
            this.showNotification('loading', 'Загрузка шаблонов...');
            const result = await this.apiCall('get_user_templates', {
                userPhone: this.currentUser.phone
            });
            
            this.availableTemplates = result.templates;
            this.renderScreen('template_selection');
        } catch (error) {
            this.showNotification('error', 'Ошибка загрузки шаблонов: ' + error.message);
        }
    }

    // Загрузка товаров по шаблону
    async loadTemplateProducts(templateName) {
        try {
            this.showNotification('loading', 'Загрузка товаров...');
            const result = await this.apiCall('get_products_by_template', {
                templateName: templateName,
                userPhone: this.currentUser.phone
            });
            
            this.renderScreen('order_creation', { 
                templateName: templateName,
                products: result.products 
            });
        } catch (error) {
            this.showNotification('error', 'Ошибка загрузки товаров: ' + error.message);
        }
    }

    // Отправка заявки - ОБНОВЛЕННАЯ ВЕРСИЯ
    async submitOrder(templateName) {
        if (!this.currentUser || !this.currentUser.phone) {
            this.showNotification('error', 'Ошибка: пользователь не авторизован');
            this.renderScreen('login');
            return;
        }
        
        try {
            const items = this.collectOrderItems();
            console.log('Items to send:', items);
            
            if (items.length === 0) {
                this.showNotification('error', 'Добавьте хотя бы один товар в заявку');
                return;
            }
            
            this.showNotification('loading', 'Отправка заявки...');
            
            const requestData = {
                userPhone: this.currentUser.phone,
                userName: this.currentUser.name,
                department: this.currentUser.department, // Добавляем отдел
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
                `📧 Уведомления разосланы`
            );
            
            setTimeout(() => {
                this.renderScreen('main');
            }, 3000);
            
        } catch (error) {
            this.showNotification('error', 'Ошибка отправки: ' + error.message);
        }
    }

    // API вызов
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

    // Сбор данных из формы заявки
    collectOrderItems() {
        const items = [];
        const quantityInputs = document.querySelectorAll('.quantity-input');
        
        quantityInputs.forEach(input => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                const productName = input.dataset.productName;
                const supplier = input.dataset.supplier;
                const unit = input.dataset.productUnit; // Добавляем единицу измерения
                const commentInput = document.querySelector(`.comment-input[data-product-name="${productName}"]`);
                
                items.push({
                    product_name: productName,
                    quantity: quantity,
                    unit: unit, // Добавляем единицу измерения
                    supplier: supplier,
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
                userPhone: this.currentUser.phone
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
                        <input type="tel" id="phone" placeholder="Телефон" required value="0705072507">
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Пароль" required value="123456">
                    </div>
                    <button type="submit" class="btn primary" style="width: 100%;">Войти</button>
                </form>
                
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #7f8c8d;">
                    <strong>Тестовый доступ:</strong><br>
                    Телефон: 0705072507<br>
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
                    <div class="action-card" onclick="app.loadUserTemplates()">
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
                    <h3>👋 Добро пожаловать, ${this.currentUser.name}!</h3>
                    <p>Доступные шаблоны: ${this.currentUser.templates.join(', ')}</p>
                </div>
            </div>
        `;
    }

    // Рендер экрана выбора шаблона
    renderTemplateSelectionScreen() {
        let templatesHtml = '';
        
        if (this.availableTemplates.length === 0) {
            templatesHtml = `
                <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📭</div>
                    <h3>Шаблоны не найдены</h3>
                    <p>Обратитесь к администратору для настройки доступов</p>
                </div>
            `;
        } else {
            templatesHtml = '<div class="templates-grid">';
            
            this.availableTemplates.forEach(template => {
                templatesHtml += `
                    <div class="template-card" onclick="app.loadTemplateProducts('${template.name}')">
                        <div class="template-icon">${template.type === 'daily' ? '📅' : '📦'}</div>
                        <h3>${template.name}</h3>
                        <p>${template.type === 'daily' ? 'Ежедневная закупка' : 'Еженедельная закупка'}</p>
                    </div>
                `;
            });
            
            templatesHtml += '</div>';
        }
        
        return `
            <div class="template-screen">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">← Назад</button>
                    <h1>Выбор шаблона</h1>
                </header>
                ${templatesHtml}
            </div>
        `;
    }

    // Рендер экрана создания заявки
    renderOrderCreationScreen(data) {
        if (!data || !data.products) {
            return this.renderTemplateSelectionScreen();
        }
        
        let productsHtml = '';
        
        // Группируем товары по поставщикам
        const groupedBySupplier = {};
        data.products.forEach(product => {
            if (!groupedBySupplier[product.supplier]) {
                groupedBySupplier[product.supplier] = [];
            }
            groupedBySupplier[product.supplier].push(product);
        });
        
        Object.keys(groupedBySupplier).forEach(supplier => {
            productsHtml += `
                <div class="department-group">
                    <div class="department-header">${supplier}</div>
            `;
            
            groupedBySupplier[supplier].forEach(product => {
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
                               data-product-name="${product.name}"
                               data-product-unit="${product.unit}"
                               data-supplier="${supplier}"
                               placeholder="0">
                        <input type="text" 
                               class="comment-input" 
                               placeholder="Комментарий"
                               data-product-name="${product.name}">
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
                    📨 Отправить заявку
                </button>
                
                <div id="orderStatus" class="status"></div>
            </div>
        `;
    }

    // Рендер экрана истории заявок (остается без изменений)
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

    // Показать уведомление (без изменений)
    showNotification(type, message) {
        // ... существующий код без изменений
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                const phone = document.getElementById('phone').value;
                const password = document.getElementById('password').value;
                this.handleLogin(phone, password);
            }
        });
    }

    // Выход из системы
    logout() {
        this.currentUser = null;
        this.ordersHistory = [];
        this.availableTemplates = [];
        this.renderScreen('login');
    }
}

// Инициализация приложения
const app = new RestaurantOrderApp();


