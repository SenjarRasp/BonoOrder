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
        this.currentGroupBy = 'supplier'; // 'supplier' или 'tags'
        this.currentProducts = [];
        this.currentTemplateName = '';
        this.currentOrderData = {}; // Для хранения введённых данных
        this.isAdmin = false;
        this.isSuperAdmin = false;
        
        this.init();
    }

    init() {
        this.renderScreen('login');
        this.setupEventListeners();
        this.hideLoading(); // Убедимся, что загрузка скрыта при старте
    }

    // Метод для сохранения текущих данных формы
    saveCurrentFormData() {
        const formData = {};
        const quantityInputs = document.querySelectorAll('.quantity-input');
        const commentInputs = document.querySelectorAll('.comment-input');
        
        quantityInputs.forEach(input => {
            const productName = input.dataset.productName;
            const supplier = input.dataset.supplier;
            const key = `${productName}|${supplier}`;
            const quantity = parseInt(input.value) || 0;
            
            if (!formData[key]) {
                formData[key] = {};
            }
            formData[key].quantity = quantity;
        });
        
        commentInputs.forEach(input => {
            const productName = input.dataset.productName;
            const supplier = input.dataset.supplier;
            const key = `${productName}|${supplier}`;
            const comment = input.value;
            
            if (!formData[key]) {
                formData[key] = {};
            }
            formData[key].comment = comment;
        });
        
        // Сохраняем данные перед перерисовкой
        this.currentOrderData = { ...this.currentOrderData, ...formData };
    }

    // Метод для восстановления данных в форме
    restoreFormData() {
        Object.keys(this.currentOrderData).forEach(key => {
            const [productName, supplier] = key.split('|');
            const data = this.currentOrderData[key];
            
            // Восстанавливаем количество
            const quantityInput = document.querySelector(`.quantity-input[data-product-name="${productName}"][data-supplier="${supplier}"]`);
            if (quantityInput && data.quantity) {
                quantityInput.value = data.quantity;
            }
            
            // Восстанавливаем комментарий
            const commentInput = document.querySelector(`.comment-input[data-product-name="${productName}"][data-supplier="${supplier}"]`);
            if (commentInput && data.comment) {
                commentInput.value = data.comment;
            }
        });
    }
    
    // Метод для изменения способа группировки
    changeGroupBy(groupBy) {
        this.saveCurrentFormData();
        this.currentGroupBy = groupBy;
        // Перерисовываем экран с новым способом группировки
        this.renderScreen('order_creation', {
            templateName: this.currentTemplateName,
            products: this.currentProducts
        });
    }
     // Показать анимацию загрузки
    showLoading(text = 'Загрузка...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay && loadingText) {
            loadingText.textContent = text;
            overlay.classList.add('active');
        }
    }

    // Скрыть анимацию загрузки
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        this.enableUI(); // Всегда разблокируем UI при скрытии загрузки
    }

    // Блокировка всех интерактивных элементов
    disableUI() {
        const interactiveElements = document.querySelectorAll('.action-card, .template-card, .btn, .back-btn');
        interactiveElements.forEach(element => {
            element.classList.add('disabled', 'loading');
        });
    }

    // Разблокировка всех интерактивных элементов
    enableUI() {
        const interactiveElements = document.querySelectorAll('.action-card, .template-card, .btn, .back-btn');
        interactiveElements.forEach(element => {
            element.classList.remove('disabled', 'loading');
        });
    }
    
    // Показать успешную анимацию
    showSuccess(message = 'Успешно!') {
        this.showLoading(message);
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay && loadingText) {
            // Меняем анимацию на успех
            overlay.innerHTML = `
                <div class="loading-text">${message}</div>
                <div class="success-checkmark">
                    <div class="check-icon">
                        <span class="icon-line line-tip"></span>
                        <span class="icon-line line-long"></span>
                        <div class="icon-circle"></div>
                        <div class="icon-fix"></div>
                    </div>
                </div>
            `;
            
            // Автоматически скрываем через 2 секунды
            setTimeout(() => {
                this.hideLoading();
            }, 2000);
        }
    }

    // Анимация нажатия на карточку
    animateCardClick(cardElement, callback) {
        // Добавляем класс нажатия
        cardElement.classList.add('loading');
        
        // Создаем элемент прогресс-бара
        const loadingBar = document.createElement('div');
        loadingBar.className = 'card-loading-bar';
        cardElement.appendChild(loadingBar);
        
        // Анимация нажатия
        cardElement.style.transform = 'scale(0.95)';
        
        // Запускаем callback после короткой задержки для анимации
        setTimeout(() => {
            if (callback) {
                callback();
            }
        }, 150);
        
        // Убираем анимацию через 1 секунду (на случай долгой загрузки)
        setTimeout(() => {
            this.resetCardAnimation(cardElement);
        }, 1000);
    }

    // Сброс анимации карточки
    resetCardAnimation(cardElement) {
        cardElement.classList.remove('loading');
        cardElement.style.transform = '';
        const loadingBar = cardElement.querySelector('.card-loading-bar');
        if (loadingBar) {
            loadingBar.remove();
        }
    }

    // Показать успех на карточке
    showCardSuccess(cardElement) {
        cardElement.classList.add('success');
        
        const successCheck = document.createElement('div');
        successCheck.className = 'success-check';
        successCheck.innerHTML = '✓';
        cardElement.appendChild(successCheck);
        
        setTimeout(() => {
            cardElement.classList.remove('success');
            if (successCheck.parentNode === cardElement) {
                cardElement.removeChild(successCheck);
            }
        }, 2000);
    }
    
    // Обработка логина
    async handleLogin(phone, password) {
        try {
            this.showLoading('Вход в систему...');
            const loginResult = await this.apiCall('login', { phone, password });
           
            this.currentUser = {
                phone: loginResult.user.phone,
                name: loginResult.user.name,
                department: loginResult.user.department,
                position: loginResult.user.position,
                templates: loginResult.user.templates,
                isAdmin: loginResult.user.isAdmin || false
            };
    
            // Улучшенная проверка прав - обрабатываем разные форматы
            const adminValue = this.currentUser.isAdmin;
            console.log('Raw admin value:', adminValue, 'Type:', typeof adminValue);
            
            let adminStatus;
            if (typeof adminValue === 'boolean') {
                adminStatus = adminValue ? 'TRUE' : 'FALSE';
            } else if (typeof adminValue === 'string') {
                adminStatus = adminValue.toUpperCase();
            } else {
                adminStatus = String(adminValue).toUpperCase();
            }
            
            this.isAdmin = adminStatus === 'TRUE' || adminStatus === 'SUPER';
            this.isSuperAdmin = adminStatus === 'SUPER';
        
            console.log('Login debug:', {
                rawAdmin: adminValue,
                adminStatus,
                isAdmin: this.isAdmin,
                isSuperAdmin: this.isSuperAdmin
            });
        
            this.showSuccess(`Добро пожаловать, ${this.currentUser.name}!`);
            setTimeout(() => {
                this.renderScreen('main');
            }, 2000);
            
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', error.message);
        }
    }

    // Загрузка доступных шаблонов
    async loadUserTemplates() {
        try {
            this.showLoading('Загрузка шаблонов...');
            const result = await this.apiCall('get_user_templates', {
                userPhone: this.currentUser.phone
            });
            
            this.availableTemplates = result.templates;
            this.hideLoading();
            this.enableUI(); // Разблокируем UI после загрузки
            this.renderScreen('template_selection');
        } catch (error) {
            this.hideLoading();
            this.enableUI(); // Разблокируем UI при ошибке
            this.showNotification('error', 'Ошибка загрузки шаблонов: ' + error.message);
        }
    }

    // Загрузка товаров по шаблону
    async loadTemplateProducts(templateName) {
        try {
            this.showLoading('Загрузка товаров...');
            const result = await this.apiCall('get_products_by_template', {
                templateName: templateName,
                userPhone: this.currentUser.phone
            });
            
            this.hideLoading();
            this.enableUI();
            
            // Сохраняем товары и название шаблона для перерисовки
            this.currentProducts = result.products;
            this.currentTemplateName = templateName;
            
            this.renderScreen('order_creation', { 
                templateName: templateName,
                products: result.products 
            });
        } catch (error) {
            this.hideLoading();
            this.enableUI();
            this.showNotification('error', 'Ошибка загрузки товаров: ' + error.message);
        }
    }

    // Отправка заявки
    async submitOrder(templateName) {
        if (!this.currentUser || !this.currentUser.phone) {
            this.showNotification('error', 'Ошибка: пользователь не авторизован');
            this.renderScreen('login');
            return;
        }
        
        try {
            // СОХРАНЯЕМ ДАННЫЕ ПЕРЕД ОТПРАВКОЙ
            this.saveCurrentFormData();
            this.disableUI(); // Блокируем UI перед отправкой
            const items = this.collectOrderItems();
            if (items.length === 0) {
                this.enableUI(); // Разблокируем если нет товаров
                this.showNotification('error', 'Добавьте хотя бы один товар в заявку');
                return;
            }
            
            this.showLoading('Отправка заявки поставщикам...');
            
            const requestData = {
                userPhone: this.currentUser.phone,
                userName: this.currentUser.name,
                department: this.currentUser.department,
                templateName: templateName,
                items: items
            };
            
            const result = await this.apiCall('create_order', requestData);
            
            this.ordersHistory.unshift({
                order_id: result.order_id,
                date: result.timestamp || new Date().toISOString(),
                template: templateName,
                status: 'success',
                items_count: items.length
            });
            
            // Очищаем сохранённые данные после успешной отправки
            this.currentOrderData = {};
            
            this.showSuccess(`Заявка ${result.order_id} отправлена!`);
            this.enableUI(); // Разблокируем после успешной отправки
            
            setTimeout(() => {
                this.renderScreen('main');
            }, 2000);
            
        } catch (error) {
            this.hideLoading();
            this.enableUI(); // Разблокируем при ошибке
            this.showNotification('error', 'Ошибка отправки: ' + error.message);
        }
    }

    // API вызов
    async apiCall(action, data = {}) {
        console.log('📡 API Call:', action, data);

        // Блокируем UI перед запросом
        this.disableUI();
        
        try {
            // Добавляем небольшую задержку между запросами
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const url = new URL(this.apiUrl);
            url.searchParams.set('action', action);
            url.searchParams.set('data', JSON.stringify(data));
            
            console.log('Fetching URL:', url.toString());
            
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ API Response:', result);
            
            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message || 'Unknown API error');
            }
            
        } catch (error) {
            console.error('❌ API Error:', error);
            
            // Специальная обработка для CORS ошибок
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('status: 0')) {
                console.log('CORS/Network error detected, trying JSONP approach...');
                return this.apiCallJSONP(action, data);
            }
            
            throw new Error('Ошибка соединения: ' + error.message);
        } finally {
            // Всегда разблокируем UI после завершения запроса
            this.hideLoading();
        }
    }

    // Альтернативный метод для обхода CORS
    async apiCallAlternative(action, data = {}) {
        try {
            // Используем proxy или другой метод
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const targetUrl = `${this.apiUrl}?action=${action}&data=${encodeURIComponent(JSON.stringify(data))}`;
            
            const response = await fetch(proxyUrl + targetUrl);
            const result = await response.json();
            
            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            throw new Error('Ошибка альтернативного соединения: ' + error.message);
        }
    }
    
    // Сбор данных из формы заявки
    collectOrderItems() {
        const items = [];
        
        // Используем сохранённые данные вместо прямого чтения из DOM
        Object.keys(this.currentOrderData).forEach(key => {
            const [productName, supplier] = key.split('|');
            const data = this.currentOrderData[key];
            
            if (data.quantity > 0) {
                // Находим соответствующий продукт для получения unit
                const product = this.currentProducts.find(p => 
                    p.name === productName && p.supplier === supplier
                );
                
                if (product) {
                    items.push({
                        product_name: productName,
                        quantity: data.quantity,
                        unit: product.unit,
                        supplier: supplier,
                        comment: data.comment || ''
                    });
                }
            }
        });
        
        return items;
    }
    // Загрузка истории заявок
    async loadOrderHistory() {
        try {
            
            // Защита от слишком частых вызовов
            if (this._loadingHistory) {
                console.log('History already loading, skipping...');
                return;
            }
            this._loadingHistory = true;
            
            this.disableUI(); // Блокируем UI перед загрузкой   
            console.log('=== LOAD ORDER HISTORY CLIENT ===');
            console.log('Current user phone:', this.currentUser.phone);
            
            this.showLoading('Загрузка истории...');

            // Добавляем задержку перед запросом
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const history = await this.apiCall('get_order_history', {
                userPhone: this.currentUser.phone
            });
            
            console.log('Received history from API:', history);
            console.log('History type:', typeof history);
            console.log('Is array:', Array.isArray(history));
            
            if (Array.isArray(history)) {
                this.ordersHistory = history;
                console.log('Processed history:', this.ordersHistory);
            } else {
                console.log('History is not array, setting empty array');
                this.ordersHistory = [];
            }
            
            this.hideLoading();
            this.enableUI(); // Разблокируем UI после загрузки
            this.renderScreen('order_history');
            
        } catch (error) {
            console.error('Load history error:', error);
            this.hideLoading();
            this.enableUI(); // Разблокируем UI при ошибке
            this.showNotification('error', 'Ошибка загрузки истории: ' + error.message);
            // Все равно показываем экран истории, но с пустым списком
            this.ordersHistory = [];
            this.renderScreen('order_history');
        } finally {
            this._loadingHistory = false;
        }
    }    

    // Рендер экранов
    renderScreen(screenName, data = null) {
        this.currentScreen = screenName;
        const app = document.getElementById('app');
        
        const isBackNavigation = screenName === 'main' || screenName === 'template_selection';
        const exitAnimation = isBackNavigation ? 'screen-exit-back' : 'screen-exit';
        
        if (app.children.length > 0) {
            const currentScreen = app.children[0];
            currentScreen.classList.add(exitAnimation);
        }
        
        setTimeout(() => {
            let screenHTML = '';
            switch(screenName) {
                case 'login':
                    screenHTML = this.renderLoginScreen();
                    break;
                case 'main':
                    screenHTML = this.renderMainScreen();
                    break;
                case 'template_selection':
                    screenHTML = this.renderTemplateSelectionScreen();
                    break;
                case 'add_product':
                    screenHTML = this.renderAddProductScreen(data);
                    break;
                case 'add_supplier':
                    screenHTML = this.renderAddSupplierScreen();
                    break;
                case 'delete_product':
                    screenHTML = this.renderDeleteProductScreen(data);
                    break;
                case 'delete_supplier':
                    screenHTML = this.renderDeleteSupplierScreen(data);
                    break;
                case 'delete_product':
                    screenHTML = this.renderDeleteProductScreen(data);
                    break;
                case 'manage_templates':
                    screenHTML = this.renderTemplatesManagementScreen(data);
                    break;
                case 'manage_users':
                    screenHTML = this.renderUsersManagementScreen(data);
                    break;
                case 'order_creation':
                    screenHTML = this.renderOrderCreationScreen(data);
                    break;
                case 'order_history':
                    screenHTML = this.renderOrderHistoryScreen();
                    break;
            }
            
            app.innerHTML = screenHTML;

            if (screenName === 'order_creation') {
                this.initToggleSwitch();
            }
            if (screenName === 'delete_product') {
                setTimeout(() => {
                    this.setupProductSelection();
                }, 100);
            }
            if (screenName === 'order_history') {
                setTimeout(() => {
                    this.setupModalClose();
                }, 100);
            }
            
        }, 300);
    }
    
    // Рендер экрана добавления товара
    renderAddProductScreen(data) {
        const tagsOptions = data.tags ? data.tags.map(tag => 
            `<option value="${tag}">${tag}</option>`
        ).join('') : '';
    
        const suppliersOptions = data.suppliers ? data.suppliers.map(supplier => 
            `<option value="${supplier}">${supplier}</option>`
        ).join('') : '';
    
        return `
            <div class="main-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">◀️ Назад</button>
                    <h1>Добавить товар</h1>
                </header>
                
                <form id="addProductForm" class="form">
                    <div class="input-group">
                        <label>Название товара *</label>
                        <input type="text" id="productName" required>
                    </div>
                    
                    <div class="input-group">
                        <label>Теги *</label>
                        <select id="productTags" required>
                            <option value="">-- Выберите тег --</option>
                            ${tagsOptions}
                            <option value="_custom">-- Добавить свой тег --</option>
                        </select>
                    </div>

                    <div class="input-group" id="customTagGroup" style="display: none;">
                        <label>Новый тег *</label>
                        <input type="text" id="customTag" placeholder="Введите новый тег">
                    </div>
                    
                    <div class="input-group">
                        <label>Единица измерения *</label>
                        <input type="text" id="productUnit" required value="шт">
                    </div>
                    
                    <div class="input-group">
                        <label>Срок годности (дни)</label>
                        <input type="number" id="productShelfLife" min="0">
                    </div>
                    
                    <div class="input-group">
                        <label>Минимальный запас *</label>
                        <input type="number" id="productMinStock" required min="0" value="1">
                    </div>
                    
                    <div class="input-group">
                        <label>Поставщик *</label>
                        <select id="productSupplier" required>
                            <option value="">-- Выберите поставщика --</option>
                            ${suppliersOptions}
                        </select>
                    </div>
                    
                    <button type="submit" class="btn primary" style="width: 100%;">
                        ➕ Добавить товар
                    </button>
                </form>
                
                <div id="productStatus" class="status"></div>
            </div>
        `;
    }
    
    // Рендер экрана добавления поставщика
    renderAddSupplierScreen() {
        return `
            <div class="main-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">◀️ Назад</button>
                    <h1>Добавить поставщика</h1>
                </header>
                
                <form id="addSupplierForm" class="form">
                    <div class="input-group">
                        <label>Название поставщика *</label>
                        <input type="text" id="supplierName" required>
                    </div>
                    
                    <div class="input-group">
                        <label>Telegram ID</label>
                        <input type="text" id="supplierTgId">
                    </div>
                    
                    <div class="input-group">
                        <label>Телефон *</label>
                        <input type="tel" id="supplierPhone" required>
                    </div>
                    
                    <button type="submit" class="btn primary" style="width: 100%;">
                        🏢 Добавить поставщика
                    </button>
                </form>
                
                <div id="supplierStatus" class="status"></div>
            </div>
        `;
    }
    renderLoginScreen() {
        return `
            <div class="login-screen">
                <div class="logo">
                    <img src="data:image/png;base64,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" alt="Restaurant Orders" style="width: 80px; height: 80px;">
                </div>
                <h1>Bono заявки</h1>
                <p style="color: #7f8c8d; margin-bottom: 30px; text-align: center;">Система управления заявками</p>
                
                <form id="loginForm" class="form">
                    <div class="input-group">
                        <input type="tel" id="phone" placeholder="Телефон" required>
                    </div>
                    <div class="input-group">
                        <input type="password" id="password" placeholder="Пароль" required>
                    </div>
                    <button type="submit" class="btn primary" style="width: 100%;">Войти</button>
                </form>
                
                <div id="loginStatus" class="status"></div>
            </div>
        `;
    }

    // Рендер главного экрана
    renderMainScreen() {
        const adminActions = this.isAdmin ? `
            <div class="action-card" onclick="app.handleMainAction('add_product')">
                <div class="action-content">
                    <div class="action-icon">➕</div>
                    <h3>Добавить товар</h3>
                    <p>Добавить новый товар в базу</p>
                </div>
            </div>
            
            <div class="action-card" onclick="app.handleMainAction('add_supplier')">
                <div class="action-content">
                    <div class="action-icon">🏢</div>
                    <h3>Добавить поставщика</h3>
                    <p>Добавить нового поставщика</p>
                </div>
            </div>
    
            <div class="action-card" onclick="app.handleMainAction('delete_product')">
                <div class="action-content">
                    <div class="action-icon">🗑️</div>
                    <h3>Удалить товар</h3>
                    <p>Удалить товары из базы</p>
                </div>
            </div>
    
            <div class="action-card" onclick="app.handleMainAction('delete_supplier')">
                <div class="action-content">
                    <div class="action-icon">❌</div>
                    <h3>Удалить поставщика</h3>
                    <p>Удалить поставщиков из базы</p>
                </div>
            </div>
        ` : '';
    
        const superAdminActions = this.isSuperAdmin ? `
            <div class="action-card" onclick="app.handleMainAction('manage_templates')">
                <div class="action-content">
                    <div class="action-icon">⚙️</div>
                    <h3>Настроить шаблоны</h3>
                    <p>Управление шаблонами заявок</p>
                </div>
            </div>
    
            <div class="action-card" onclick="app.handleMainAction('manage_users')">
                <div class="action-content">
                    <div class="action-icon">👥</div>
                    <h3>Пользователи</h3>
                    <p>Управление пользователями</p>
                </div>
            </div>
        ` : '';
    
        return `
            <div class="main-screen screen-transition">
                <header class="header">
                    <h1>Главная</h1>
                    <div class="user-info">
                        ${this.currentUser.department} • ${this.currentUser.position}
                        ${this.isAdmin ? ' • 👑 Админ' : ''}
                        ${this.isSuperAdmin ? ' • 👑 Супер-админ' : ''}
                    </div>
                </header>
                
                <div class="actions-grid">
                    <div class="action-card" onclick="app.handleMainAction('new_order')">
                        <div class="action-content">
                            <div class="action-icon">📋</div>
                            <h3>Новая заявка</h3>
                            <p>Создать заказ поставщикам</p>
                        </div>
                    </div>
                    
                    <div class="action-card" onclick="app.handleMainAction('history')">
                        <div class="action-content">
                            <div class="action-icon">📊</div>
                            <h3>История заявок</h3>
                            <p>Посмотреть отправленные</p>
                        </div>
                    </div>
                    
                    ${adminActions}
                    ${superAdminActions}
                    
                    <div class="action-card" onclick="app.handleMainAction('logout')">
                        <div class="action-content">
                            <div class="action-icon">🚪</div>
                            <h3>Выйти</h3>
                            <p>Завершить сеанс</p>
                        </div>
                    </div>
                </div>
                
                <div class="notifications">
                    <h3>👋 Добро пожаловать, ${this.currentUser.name}!</h3>
                    <p>Доступные шаблоны: ${this.currentUser.templates.join(', ')}</p>
                </div>
            </div>
        `;
    }
    // Обработчик действий на главной странице
    handleMainAction(action) {
        const card = event.currentTarget;
        
        this.disableUI();
        this.animateCardClick(card, () => {
            switch(action) {
                case 'new_order':
                    this.loadUserTemplates();
                    break;
                    
                case 'history':
                    this.loadOrderHistory();
                    break;
                
                case 'add_product':
                    this.showAddProductScreen();
                    break;
                
                case 'add_supplier':
                    this.showAddSupplierScreen();
                    break;

                case 'delete_product':
                    this.showDeleteProductScreen();
                    break;

                case 'delete_supplier':
                    this.showDeleteSupplierScreen();
                    break;

                case 'manage_templates':
                    this.showTemplatesManagementScreen();
                    break;

                case 'manage_users':
                    this.showUsersManagementScreen();
                    break;
                    
                case 'logout':
                    this.showLoading('Выход из системы...');
                    setTimeout(() => {
                        this.logout();
                    }, 500);
                    break;
            }
        });
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
            
            this.availableTemplates.forEach((template, index) => {
                templatesHtml += `
                    <div class="template-card" onclick="app.handleTemplateSelect('${template.name}', this)">
                        <div class="template-content">
                            <div class="template-icon">${template.type === 'daily' ? '📅' : '📦'}</div>
                            <h3>${template.name}</h3>
                            <p>${template.type === 'daily' ? 'Ежедневная закупка' : 'Еженедельная закупка'}</p>
                        </div>
                    </div>
                `;
            });
            
            templatesHtml += '</div>';
        }
        
        return `
            <div class="template-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.handleBackButton()">◀️ Назад</button>
                    <h1>Выбор шаблона</h1>
                </header>
                ${templatesHtml}
            </div>
        `;
    }

    // Показать экран добавления товара
    async showAddProductScreen() {
        try {
            this.showLoading('Загрузка данных...');
            const data = await this.apiCall('get_product_form_data');
            this.hideLoading();
            this.renderScreen('add_product', data);
            
            // Добавляем обработчики после рендера
            setTimeout(() => {
                const tagsSelect = document.getElementById('productTags');
                if (tagsSelect) {
                    tagsSelect.addEventListener('change', (e) => {
                        this.handleTagSelection(e.target.value);
                    });
                }
            }, 100);
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка загрузки: ' + error.message);
        }
    }
    
    // Показать экран добавления поставщика
    showAddSupplierScreen() {
        this.renderScreen('add_supplier');
    }
    // Новые методы для удаления товаров
    async showDeleteProductScreen() {
        try {
            this.showLoading('Загрузка товаров...');
            const result = await this.apiCall('get_all_products');
            const formData = await this.apiCall('get_product_form_data');
            this.hideLoading();
            
            // Проверяем структуру ответа
            console.log('Products result:', result);
            const products = result.products || [];
            
            this.renderScreen('delete_product', { 
                products: products, 
                tags: formData.tags || [] 
            });
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка загрузки: ' + error.message);
        }
    }

    // Обновленный renderDeleteProductScreen с правильным расположением поиска
    renderDeleteProductScreen(data) {
        const { products = [], tags = [] } = data;
        
        const tagsOptions = tags.map(tag => 
            `<option value="${tag}">${tag}</option>`
        ).join('');
    
        const renderProductsList = (productsToRender) => {
            return productsToRender.length > 0 ? productsToRender.map(product => `
                <div class="product-item" data-tags="${product.product_tags}" data-name="${product.name.toLowerCase()}">
                    <input type="checkbox" id="product_${product.id}" name="products" value="${product.id}">
                    <label for="product_${product.id}">
                        <strong>${product.name}</strong> 
                        <span style="color: #666; font-size: 12px;">
                            (${product.product_tags} • ${product.unit} • ${product.supplier})
                        </span>
                    </label>
                </div>
            `).join('') : `
                <div style="text-align: center; padding: 20px; color: #7f8c8d;">
                    <p>Товары не найдены</p>
                </div>
            `;
        };
    
        return `
            <div class="main-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">◀️ Назад</button>
                    <h1>Удаление товаров</h1>
                </header>
                
                <div class="form">
                    <div class="input-group">
                        <label>Фильтр по тегам (можно выбрать несколько):</label>
                        <select id="tagFilter" multiple style="height: 120px;" onchange="app.filterProducts()">
                            ${tagsOptions}
                        </select>
                        <small>Удерживайте Ctrl для выбора нескольких тегов</small>
                        <div style="margin-top: 5px;">
                            <button class="btn secondary" onclick="app.clearTagFilter()" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">
                                Очистить теги
                            </button>
                            <button class="btn secondary" onclick="app.selectAllTags()" style="padding: 5px 10px; font-size: 12px;">
                                Выбрать все
                            </button>
                        </div>
                    </div>
    
                    <div class="input-group">
                        <label>Список товаров (можно выбрать несколько):</label>
                        
                        <!-- Поиск по названию ПРЯМО ПЕРЕД списком -->
                        <div style="margin-bottom: 10px;">
                            <input type="text" id="productSearch" placeholder="Поиск по названию товара..." 
                                   oninput="app.filterProductsBySearch()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        
                        <!-- Чекбокс "Выбрать все видимые" ПРЯМО ПЕРЕД списком -->
                        <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="selectAllProducts" onchange="app.toggleSelectAllProducts()">
                            <label for="selectAllProducts" style="font-size: 14px; margin: 0;">
                                Выбрать все видимые товары
                            </label>
                        </div>
                        
                        <div id="productsListContainer" class="products-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
                            ${renderProductsList(products)}
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">
                            Найдено товаров: <span id="productsCount">${products.length}</span> | 
                            Выбрано: <span id="selectedCount">0</span>
                        </div>
                    </div>
                    
                    <button class="btn primary" onclick="app.deleteSelectedProducts()" style="width: 100%; background-color: #e74c3c;">
                        🗑️ Удалить выбранные товары (0)
                    </button>
                </div>
                
                <div id="deleteProductStatus" class="status"></div>
            </div>
        `;
    }
    // Метод для поиска по названию
    filterProductsBySearch() {
        this.filterProducts();
    }

    // Метод для выбора всех тегов
    selectAllTags() {
        const tagFilter = document.getElementById('tagFilter');
        for (let i = 0; i < tagFilter.options.length; i++) {
            tagFilter.options[i].selected = true;
        }
        this.filterProducts();
    }

    // Исправленный метод для выбора всех видимых товаров
    toggleSelectAllProducts() {
        const selectAllCheckbox = document.getElementById('selectAllProducts');
        const isChecked = selectAllCheckbox.checked;
        
        console.log('Toggle select all:', isChecked);
        
        // Находим все ВИДИМЫЕ товары (используем более надежный метод)
        const allProductItems = document.querySelectorAll('.product-item');
        let visibleCount = 0;
        
        allProductItems.forEach(item => {
            // Проверяем видимость через computed style
            const style = window.getComputedStyle(item);
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            
            if (isVisible) {
                visibleCount++;
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = isChecked;
                    console.log('Setting checkbox:', checkbox.id, isChecked);
                }
            }
        });
        
        console.log('Visible items:', visibleCount);
        this.updateSelectionCount();
    }
    // Метод для обновления счетчика выбранных товаров
    updateSelectionCount() {
        const selectedCheckboxes = document.querySelectorAll('.product-item input[type="checkbox"]:checked');
        const selectedCount = selectedCheckboxes.length;
        
        document.getElementById('selectedCount').textContent = selectedCount;
        
        const deleteButton = document.querySelector('.btn.primary');
        if (deleteButton) {
            deleteButton.textContent = `🗑️ Удалить выбранные товары (${selectedCount})`;
        }
    }
    // Добавим обработчик событий для чекбоксов после рендера
    setupProductSelection() {
        const checkboxes = document.querySelectorAll('.product-item input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionCount();
            });
        });
    }
    
    // Улучшенный метод фильтрации
    filterProducts() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const tagFilter = document.getElementById('tagFilter');
        const selectedTags = Array.from(tagFilter.selectedOptions).map(option => option.value);
        
        const allProductItems = document.querySelectorAll('.product-item');
        let visibleCount = 0;
        
        allProductItems.forEach(item => {
            const productTags = item.getAttribute('data-tags');
            const productName = item.getAttribute('data-name');
            const productTagArray = productTags ? productTags.split(',').map(tag => tag.trim()) : [];
            
            const matchesSearch = !searchTerm || productName.includes(searchTerm);
            const matchesTags = selectedTags.length === 0 || 
                              productTagArray.some(tag => selectedTags.includes(tag));
            
            const shouldShow = matchesSearch && matchesTags;
            item.style.display = shouldShow ? 'block' : 'none';
            
            if (shouldShow) visibleCount++;
        });
        
        document.getElementById('productsCount').textContent = visibleCount;
        this.updateSelectionCount();
        
        // Сбрасываем "Выбрать все" при фильтрации
        const selectAllCheckbox = document.getElementById('selectAllProducts');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }
    
    // Новый метод для фильтрации товаров по тегам
    filterProductsByTags() {
        const tagFilter = document.getElementById('tagFilter');
        const selectedTags = Array.from(tagFilter.selectedOptions).map(option => option.value);
        
        const allProductItems = document.querySelectorAll('.product-item');
        let visibleCount = 0;
        
        allProductItems.forEach(item => {
            const productTags = item.getAttribute('data-tags');
            const productTagArray = productTags ? productTags.split(',').map(tag => tag.trim()) : [];
            
            // Показываем товар если:
            // - не выбраны теги (показываем все)
            // - или товар имеет хотя бы один из выбранных тегов
            const shouldShow = selectedTags.length === 0 || 
                              productTagArray.some(tag => selectedTags.includes(tag));
            
            item.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) visibleCount++;
        });
        
        // Обновляем счетчик
        document.getElementById('productsCount').textContent = visibleCount;
    }
    
    // Метод для очистки фильтра
    clearTagFilter() {
        const tagFilter = document.getElementById('tagFilter');
        tagFilter.selectedIndex = -1;
        this.filterProductsByTags();
    }
    
    // Обновленный метод для удаления товаров с учетом фильтрации
    async deleteSelectedProducts() {
        const selectedProducts = Array.from(document.querySelectorAll('.product-item input[name="products"]:checked'))
            .map(checkbox => checkbox.value);
    
        if (selectedProducts.length === 0) {
            this.showNotification('error', 'Выберите хотя бы один товар для удаления');
            return;
        }

         // Кастомное подтверждение вместо стандартного confirm
        const userConfirmed = await this.showCustomConfirm(`Удалить ${selectedProducts.length} товар(ов)?`);
        if (!userConfirmed) {
            return;
        }
    
        try {
            this.showLoading('Удаление товаров...');
            await this.apiCall('delete_products', { productIds: selectedProducts });
            this.showSuccess('Товары успешно удалены!');
            setTimeout(() => {
                this.showDeleteProductScreen();
            }, 2000);
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка удаления: ' + error.message);
        }
    }
    // Новые методы для удаления поставщиков
    async showDeleteSupplierScreen() {
        try {
            this.showLoading('Загрузка поставщиков...');
            const result = await this.apiCall('get_all_suppliers');
            this.hideLoading();
            
            // Проверяем структуру ответа
            console.log('Suppliers result:', result);
            const suppliers = result.suppliers || [];
            
            this.renderScreen('delete_supplier', { suppliers });
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка загрузки: ' + error.message);
        }
    }
    
    renderDeleteSupplierScreen(data) {
        const { suppliers = [] } = data;
        
        console.log('Rendering delete suppliers:', suppliers);
        
        const suppliersList = suppliers.length > 0 ? suppliers.map(supplier => `
            <div class="supplier-item">
                <input type="checkbox" id="supplier_${supplier.id}" name="suppliers" value="${supplier.id}">
                <label for="supplier_${supplier.id}">
                    <strong>${supplier.name}</strong> 
                    <span style="color: #666; font-size: 12px;">
                        (${supplier.phone} ${supplier.tg_id ? '• TG: ' + supplier.tg_id : ''})
                    </span>
                </label>
            </div>
        `).join('') : `
            <div style="text-align: center; padding: 20px; color: #7f8c8d;">
                <p>Поставщики не найдены</p>
            </div>
        `;
    
        return `
            <div class="main-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">◀️ Назад</button>
                    <h1>Удаление поставщиков</h1>
                </header>
                
                <div class="form">
                    <div class="input-group">
                        <label>Список поставщиков (можно выбрать несколько):</label>
                        <div class="suppliers-list" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
                            ${suppliersList}
                        </div>
                    </div>
                    
                    <button class="btn primary" onclick="app.deleteSelectedSuppliers()" style="width: 100%; background-color: #e74c3c;">
                        🗑️ Удалить выбранных поставщиков
                    </button>
                </div>
                
                <div id="deleteSupplierStatus" class="status"></div>
            </div>
        `;
    }
    
    // Метод для кастомного подтверждения
    showCustomConfirm(message) {
        return new Promise((resolvePromise) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.display = 'flex';
            overlay.style.zIndex = '10001';
            
            overlay.innerHTML = `
                <div class="modal-content" style="max-width: 300px; text-align: center;">
                    <div style="padding: 20px;">
                        <h3 style="margin-bottom: 15px;">Подтверждение</h3>
                        <p style="margin-bottom: 20px;">${message}</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button id="confirmCancel" class="btn secondary" style="flex: 1;">
                                Отмена
                            </button>
                            <button id="confirmOk" class="btn primary" style="flex: 1; background-color: #e74c3c;">
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Обработчики событий
            const cancelButton = overlay.querySelector('#confirmCancel');
            const okButton = overlay.querySelector('#confirmOk');
            
            const closeModal = (result) => {
                overlay.remove();
                resolvePromise(result);
            };
            
            cancelButton.addEventListener('click', () => closeModal(false));
            okButton.addEventListener('click', () => closeModal(true));
            
            // Закрытие по клику на overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(false);
                }
            });
            
            // Закрытие по ESC
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                }
            };
            document.addEventListener('keydown', handleKeydown);
            
            // Убираем обработчик после закрытия
            overlay.addEventListener('remove', () => {
                document.removeEventListener('keydown', handleKeydown);
            });
        });
    }
    async deleteSelectedSuppliers() {
        const selectedSuppliers = Array.from(document.querySelectorAll('input[name="suppliers"]:checked'))
            .map(checkbox => checkbox.value);
    
        if (selectedSuppliers.length === 0) {
            this.showNotification('error', 'Выберите хотя бы одного поставщика для удаления');
            return;
        }
    
        const userConfirmed = await this.showCustomConfirm(`Удалить ${selectedSuppliers.length} поставщик(ов)?`);
        if (!userConfirmed) {
            return;
        }
    
        try {
            this.showLoading('Удаление поставщиков...');
            await this.apiCall('delete_suppliers', { supplierIds: selectedSuppliers });
            this.showSuccess('Поставщики успешно удалены!');
            setTimeout(() => {
                this.showDeleteSupplierScreen();
            }, 2000);
        } catch (error) {
            this.showNotification('error', 'Ошибка удаления: ' + error.message);
        }
    }

    // Новые методы для управления шаблонами
    async showTemplatesManagementScreen() {
        try {
            this.showLoading('Загрузка шаблонов...');
            const result = await this.apiCall('get_all_templates');
            const formData = await this.apiCall('get_product_form_data');
            this.hideLoading();
            
            const templates = result.templates || [];
            const tags = formData.tags || [];
            
            this.renderScreen('manage_templates', { templates, tags });
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка загрузки: ' + error.message);
        }
    }
    
    // Обновленный renderTemplatesManagementScreen с правильным отображением выбранных тегов
    renderTemplatesManagementScreen(data) {
        const { templates = [], tags = [] } = data;
        
        const templatesList = templates.length > 0 ? templates.map(template => {
            // Подготавливаем выбранные теги для этого шаблона
            const templateTags = template.product_tags ? template.product_tags.split(',').map(tag => tag.trim()) : [];
            
            const tagsOptions = tags.map(tag => 
                `<option value="${tag}" ${templateTags.includes(tag) ? 'selected' : ''}>${tag}</option>`
            ).join('');
    
            return `
                <div class="template-item" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                    <div class="input-group">
                        <label>Название шаблона:</label>
                        <input type="text" id="name_${template.id}" value="${template.name}" style="width: 100%;">
                    </div>
                    <div class="input-group">
                        <label>Тип:</label>
                        <select id="type_${template.id}" style="width: 100%;">
                            <option value="daily" ${template.type === 'daily' ? 'selected' : ''}>Ежедневный</option>
                            <option value="weekly" ${template.type === 'weekly' ? 'selected' : ''}>Еженедельный</option>
                            <option value="anytime" ${template.type === 'anytime' ? 'selected' : ''}>Любое время</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Теги товаров (можно выбрать несколько):</label>
                        <select id="tags_${template.id}" multiple style="height: 100px; width: 100%;">
                            ${tagsOptions}
                        </select>
                        <small>Удерживайте Ctrl для выбора нескольких тегов</small>
                        <div style="margin-top: 5px;">
                            <button type="button" class="btn secondary" onclick="app.selectAllTemplateTags('${template.id}')" style="padding: 3px 8px; font-size: 11px;">
                                Выбрать все
                            </button>
                            <button type="button" class="btn secondary" onclick="app.clearTemplateTags('${template.id}')" style="padding: 3px 8px; font-size: 11px; margin-left: 5px;">
                                Очистить
                            </button>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Telegram ID админа (через запятую):</label>
                        <input type="text" id="tg_admin_${template.id}" value="${template.tg_id_admin ? template.tg_id_admin.replace(/'/g, '') : ''}" style="width: 100%;" placeholder="940486322,123456789">
                        <small>Введите ID через запятую без пробелов</small>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn primary" onclick="app.updateTemplate('${template.id}')" style="flex: 1;">💾 Сохранить</button>
                        <button class="btn" onclick="app.deleteTemplate('${template.id}')" style="flex: 1; background-color: #e74c3c; color: white;">🗑️ Удалить</button>
                    </div>
                </div>
            `;
        }).join('') : `
            <div style="text-align: center; padding: 20px; color: #7f8c8d;">
                <p>Шаблоны не найдены</p>
            </div>
        `;
    
        return `
            <div class="main-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">◀️ Назад</button>
                    <h1>Управление шаблонами</h1>
                </header>
                
                <div class="form">
                    <h3>Добавить новый шаблон</h3>
                    <div class="input-group">
                        <label>Название шаблона:</label>
                        <input type="text" id="newTemplateName">
                    </div>
                    <div class="input-group">
                        <label>Тип:</label>
                        <select id="newTemplateType">
                            <option value="daily">Ежедневный</option>
                            <option value="weekly">Еженедельный</option>
                            <option value="anytime">Любое время</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Теги товаров (можно выбрать несколько):</label>
                        <select id="newTemplateTags" multiple style="height: 100px; width: 100%;">
                            ${tags.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
                        </select>
                        <small>Удерживайте Ctrl для выбора нескольких тегов</small>
                        <div style="margin-top: 5px;">
                            <button type="button" class="btn secondary" onclick="app.selectAllNewTemplateTags()" style="padding: 3px 8px; font-size: 11px;">
                                Выбрать все
                            </button>
                            <button type="button" class="btn secondary" onclick="app.clearNewTemplateTags()" style="padding: 3px 8px; font-size: 11px; margin-left: 5px;">
                                Очистить
                            </button>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Telegram ID админа (через запятую):</label>
                        <input type="text" id="newTemplateTgAdmin" placeholder="940486322,123456789">
                        <small>Введите ID через запятую без пробелов</small>
                    </div>
                    <button class="btn primary" onclick="app.addNewTemplate()" style="width: 100%;">
                        ➕ Добавить шаблон
                    </button>
                </div>
    
                <div style="margin-top: 30px;">
                    <h3>Существующие шаблоны</h3>
                    ${templatesList}
                </div>
                
                <div id="templateStatus" class="status"></div>
            </div>
        `;
    }
    
    // Исправленный метод обновления шаблона
    async updateTemplate(templateId) {
        const name = document.getElementById(`name_${templateId}`).value;
        const type = document.getElementById(`type_${templateId}`).value;
        
        // Получаем выбранные теги
        const tagsSelect = document.getElementById(`tags_${templateId}`);
        const selectedTags = Array.from(tagsSelect.selectedOptions).map(option => option.value);
        const product_tags = selectedTags.join(', ');
        
        const tg_id_admin = document.getElementById(`tg_admin_${templateId}`).value;
    
        if (!name || !type || selectedTags.length === 0) {
            this.showNotification('error', 'Заполните все обязательные поля');
            return;
        }
    
        try {
            this.showLoading('Обновление шаблона...');
            const result = await this.apiCall('update_template', { 
                templateId, 
                name, 
                type, 
                product_tags, 
                tg_id_admin 
            });
            this.showSuccess('Шаблон успешно обновлен!');
            // Перезагружаем экран чтобы обновить данные
            setTimeout(() => {
                this.showTemplatesManagementScreen();
            }, 1500);
        } catch (error) {
            this.showNotification('error', 'Ошибка обновления: ' + error.message);
        }
}
    
    // Исправленный метод добавления шаблона
    async addNewTemplate() {
        const name = document.getElementById('newTemplateName').value;
        const type = document.getElementById('newTemplateType').value;
        
        // Получаем выбранные теги для нового шаблона
        const tagsSelect = document.getElementById('newTemplateTags');
        const selectedTags = Array.from(tagsSelect.selectedOptions).map(option => option.value);
        const product_tags = selectedTags.join(', ');
        
        let tg_id_admin = document.getElementById('newTemplateTgAdmin').value;
        
        // Очищаем Telegram ID от лишних пробелов, но сохраняем как строку
        tg_id_admin = tg_id_admin.split(',')
            .map(id => String(id.trim())) // Сохраняем как строку
            .filter(id => id)
            .join(',');
    
        if (!name || !type || selectedTags.length === 0) {
            this.showNotification('error', 'Заполните все обязательные поля');
            return;
        }
    
        try {
            this.showLoading('Добавление шаблона...');
            await this.apiCall('add_template', { 
                name, 
                type, 
                product_tags, 
                tg_id_admin 
            });
            this.showSuccess('Шаблон успешно добавлен!');
            setTimeout(() => {
                this.showTemplatesManagementScreen();
            }, 2000);
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка добавления: ' + error.message);
        }
    }
    // Методы для работы с тегами в шаблонах
    selectAllTemplateTags(templateId) {
        const tagsSelect = document.getElementById(`tags_${templateId}`);
        for (let i = 0; i < tagsSelect.options.length; i++) {
            tagsSelect.options[i].selected = true;
        }
    }
    
    clearTemplateTags(templateId) {
        const tagsSelect = document.getElementById(`tags_${templateId}`);
        tagsSelect.selectedIndex = -1;
    }
    
    selectAllNewTemplateTags() {
        const tagsSelect = document.getElementById('newTemplateTags');
        for (let i = 0; i < tagsSelect.options.length; i++) {
            tagsSelect.options[i].selected = true;
        }
    }
    
    clearNewTemplateTags() {
        const tagsSelect = document.getElementById('newTemplateTags');
        tagsSelect.selectedIndex = -1;
    }
    
    // Добавим инициализацию выбранных тегов при загрузке экрана
    async showTemplatesManagementScreen() {
        try {
            this.showLoading('Загрузка шаблонов...');
            const result = await this.apiCall('get_all_templates');
            const formData = await this.apiCall('get_product_form_data');
            this.hideLoading();
            
            const templates = result.templates || [];
            const tags = formData.tags || [];
            
            this.renderScreen('manage_templates', { templates, tags });
            
            // Инициализируем выбранные теги после рендера
            setTimeout(() => {
                this.initTemplateTagsSelection(templates);
            }, 100);
            
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка загрузки: ' + error.message);
        }
    }
    
    // Метод для инициализации выбранных тегов в существующих шаблонах
    initTemplateTagsSelection(templates) {
        templates.forEach(template => {
            const tagsSelect = document.getElementById(`tags_${template.id}`);
            if (tagsSelect && template.product_tags) {
                const templateTags = template.product_tags.split(',').map(tag => tag.trim());
                for (let i = 0; i < tagsSelect.options.length; i++) {
                    const option = tagsSelect.options[i];
                    option.selected = templateTags.includes(option.value);
                }
            }
        });
    }
    
    async deleteTemplate(templateId) {
        const userConfirmed = await this.showCustomConfirm('Удалить этот шаблон?');
        if (!userConfirmed) {
            return;
        }
    
        try {
            this.showLoading('Удаление шаблона...');
            await this.apiCall('delete_template', { templateId });
            this.showSuccess('Шаблон успешно удален!');
            setTimeout(() => {
                this.showTemplatesManagementScreen();
            }, 2000);
        } catch (error) {
            this.showNotification('error', 'Ошибка удаления: ' + error.message);
        }
    }

    // методы для управления пользователями
   async showUsersManagementScreen() {
        try {
            this.showLoading('Загрузка пользователей...');
            const usersResult = await this.apiCall('get_all_users');
            const templatesResult = await this.apiCall('get_all_templates');
            this.hideLoading();
            
            const users = usersResult.users || [];
            const templates = templatesResult.templates || [];
            
            this.renderScreen('manage_users', { users, templates });
            
            // Инициализируем выбранные шаблоны после рендера
            setTimeout(() => {
                this.initUserTemplatesSelection(users);
            }, 100);
            
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка загрузки: ' + error.message);
        }
    }

    // Метод для инициализации выбранных шаблонов в существующих пользователях
    initUserTemplatesSelection(users) {
        users.forEach(user => {
            const templatesSelect = document.getElementById(`templates_${user.phone}`);
            if (templatesSelect && user.templates) {
                const userTemplates = user.templates.split(',').map(template => template.trim());
                for (let i = 0; i < templatesSelect.options.length; i++) {
                    const option = templatesSelect.options[i];
                    option.selected = userTemplates.includes(option.value);
                }
            }
        });
    }
    
    // Обновленный renderUsersManagementScreen с правильным отображением выбранных шаблонов
    renderUsersManagementScreen(data) {
        const { users = [], templates = [] } = data;
        
        const usersList = users.length > 0 ? users.map(user => {
            // Подготавливаем выбранные шаблоны для этого пользователя
            const userTemplates = user.templates ? user.templates.split(',').map(template => template.trim()) : [];
            
            const templatesOptions = templates.map(template => 
                `<option value="${template.name}" ${userTemplates.includes(template.name) ? 'selected' : ''}>${template.name}</option>`
            ).join('');
    
            return `
                <div class="user-item" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                    <h3>${user.name} (${user.phone ? user.phone.replace(/^'/, '') : ''})</h3>
                    <div class="input-group">
                        <label>Имя:</label>
                        <input type="text" id="name_${user.phone}" value="${user.name}" style="width: 100%;">
                    </div>
                    <div class="input-group">
                        <label>Пароль:</label>
                        <input type="text" id="password_${user.phone}" value="${user.password}" style="width: 100%;">
                    </div>
                    <div class="input-group">
                        <label>Отдел:</label>
                        <input type="text" id="department_${user.phone}" value="${user.department}" style="width: 100%;">
                    </div>
                    <div class="input-group">
                        <label>Должность:</label>
                        <input type="text" id="position_${user.phone}" value="${user.position}" style="width: 100%;">
                    </div>
                    <div class="input-group">
                        <label>Активен:</label>
                        <select id="active_${user.phone}" style="width: 100%;">
                            <option value="TRUE" ${user.is_active === 'TRUE' ? 'selected' : ''}>Активен</option>
                            <option value="FALSE" ${user.is_active === 'FALSE' ? 'selected' : ''}>Неактивен</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Шаблоны (можно выбрать несколько):</label>
                        <select id="templates_${user.phone}" multiple style="height: 100px; width: 100%;">
                            ${templatesOptions}
                        </select>
                        <small>Удерживайте Ctrl для выбора нескольких шаблонов</small>
                        <div style="margin-top: 5px;">
                            <button type="button" class="btn secondary" onclick="app.selectAllUserTemplates('${user.phone}')" style="padding: 3px 8px; font-size: 11px;">
                                Выбрать все
                            </button>
                            <button type="button" class="btn secondary" onclick="app.clearUserTemplates('${user.phone}')" style="padding: 3px 8px; font-size: 11px; margin-left: 5px;">
                                Очистить
                            </button>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Права:</label>
                        <select id="admin_${user.phone}" style="width: 100%;">
                            <option value="FALSE" ${user.admin === 'FALSE' ? 'selected' : ''}>Обычный пользователь</option>
                            <option value="TRUE" ${user.admin === 'TRUE' ? 'selected' : ''}>Администратор</option>
                            <option value="SUPER" ${user.admin === 'SUPER' ? 'selected' : ''}>Супер-администратор</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn primary" onclick="app.updateUser('${user.phone}')" style="flex: 1;">💾 Сохранить</button>
                        <button class="btn" onclick="app.deleteUser('${user.phone}')" style="flex: 1; background-color: #e74c3c; color: white;">🗑️ Удалить</button>
                    </div>
                </div>
            `;
        }).join('') : `
            <div style="text-align: center; padding: 20px; color: #7f8c8d;">
                <p>Пользователи не найдены</p>
            </div>
        `;
    
        return `
            <div class="main-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">◀️ Назад</button>
                    <h1>Управление пользователями</h1>
                </header>
                
                <div class="form">
                    <h3>Добавить нового пользователя</h3>
                    <div class="input-group">
                        <label>Телефон:</label>
                        <input type="tel" id="newUserPhone">
                    </div>
                    <div class="input-group">
                        <label>Имя:</label>
                        <input type="text" id="newUserName">
                    </div>
                    <div class="input-group">
                        <label>Пароль:</label>
                        <input type="text" id="newUserPassword">
                    </div>
                    <div class="input-group">
                        <label>Отдел:</label>
                        <input type="text" id="newUserDepartment">
                    </div>
                    <div class="input-group">
                        <label>Должность:</label>
                        <input type="text" id="newUserPosition">
                    </div>
                    <div class="input-group">
                        <label>Шаблоны (можно выбрать несколько):</label>
                        <select id="newUserTemplates" multiple style="height: 100px; width: 100%;">
                            ${templates.map(template => `<option value="${template.name}">${template.name}</option>`).join('')}
                        </select>
                        <small>Удерживайте Ctrl для выбора нескольких шаблонов</small>
                        <div style="margin-top: 5px;">
                            <button type="button" class="btn secondary" onclick="app.selectAllNewUserTemplates()" style="padding: 3px 8px; font-size: 11px;">
                                Выбрать все
                            </button>
                            <button type="button" class="btn secondary" onclick="app.clearNewUserTemplates()" style="padding: 3px 8px; font-size: 11px; margin-left: 5px;">
                                Очистить
                            </button>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Права:</label>
                        <select id="newUserAdmin">
                            <option value="FALSE">Обычный пользователь</option>
                            <option value="TRUE">Администратор</option>
                            <option value="SUPER">Супер-администратор</option>
                        </select>
                    </div>
                    <button class="btn primary" onclick="app.addNewUser()" style="width: 100%;">
                        👥 Добавить пользователя
                    </button>
                </div>
    
                <div style="margin-top: 30px;">
                    <h3>Существующие пользователи</h3>
                    ${usersList}
                </div>
                
                <div id="userStatus" class="status"></div>
            </div>
        `;
    }

    // Методы для работы с шаблонами пользователей
    selectAllUserTemplates(userPhone) {
        const templatesSelect = document.getElementById(`templates_${userPhone}`);
        for (let i = 0; i < templatesSelect.options.length; i++) {
            templatesSelect.options[i].selected = true;
        }
    }
    
    clearUserTemplates(userPhone) {
        const templatesSelect = document.getElementById(`templates_${userPhone}`);
        templatesSelect.selectedIndex = -1;
    }
    
    selectAllNewUserTemplates() {
        const templatesSelect = document.getElementById('newUserTemplates');
        for (let i = 0; i < templatesSelect.options.length; i++) {
            templatesSelect.options[i].selected = true;
        }
    }
    
    clearNewUserTemplates() {
        const templatesSelect = document.getElementById('newUserTemplates');
        templatesSelect.selectedIndex = -1;
    }
    
    // Исправленный метод добавления пользователя
    async addNewUser() {
    const phone = document.getElementById('newUserPhone').value;
        const name = document.getElementById('newUserName').value;
        const password = document.getElementById('newUserPassword').value;
        const department = document.getElementById('newUserDepartment').value;
        const position = document.getElementById('newUserPosition').value;
        
        // Получаем выбранные шаблоны
        const templatesSelect = document.getElementById('newUserTemplates');
        const selectedTemplates = Array.from(templatesSelect.selectedOptions).map(option => option.value);
        const templates = selectedTemplates.join(', ');
        
        const admin = document.getElementById('newUserAdmin').value;
    
        if (!phone || !name || !password) {
            this.showNotification('error', 'Заполните все обязательные поля');
            return;
        }
    
        try {
            this.showLoading('Добавление пользователя...');
            await this.apiCall('add_user', { 
                phone: String(phone), // Сохраняем как строку
                name, 
                password, 
                department, 
                position, 
                templates, 
                admin, 
                is_active: 'TRUE' 
            });
            this.showSuccess('Пользователь успешно добавлен!');
            setTimeout(() => {
                this.showUsersManagementScreen();
            }, 2000);
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка добавления: ' + error.message);
        }
    }
    // Исправленный метод обновления пользователя
    async updateUser(userPhone) {
        const name = document.getElementById(`name_${userPhone}`).value;
        const password = document.getElementById(`password_${userPhone}`).value;
        const department = document.getElementById(`department_${userPhone}`).value;
        const position = document.getElementById(`position_${userPhone}`).value;
        const is_active = document.getElementById(`active_${userPhone}`).value;
        
        // Получаем выбранные шаблоны
        const templatesSelect = document.getElementById(`templates_${userPhone}`);
        const selectedTemplates = Array.from(templatesSelect.selectedOptions).map(option => option.value);
        const templates = selectedTemplates.join(', ');
        
        const admin = document.getElementById(`admin_${userPhone}`).value;
    
        try {
            this.showLoading('Обновление пользователя...');
            await this.apiCall('update_user', { 
                userPhone, 
                name, 
                password, 
                department, 
                position, 
                is_active, 
                templates, 
                admin 
            });
            this.showSuccess('Пользователь успешно обновлен!');
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка обновления: ' + error.message);
        }
    }

    async deleteUser(userPhone) {
        const userConfirmed = await this.showCustomConfirm('Удалить этого пользователя?');
        if (!userConfirmed) {
            return;
        }
    
        try {
            this.showLoading('Удаление пользователя...');
            await this.apiCall('delete_user', { userPhone });
            this.showSuccess('Пользователь успешно удален!');
            setTimeout(() => {
                this.showUsersManagementScreen();
            }, 2000);
        } catch (error) {
            this.showNotification('error', 'Ошибка удаления: ' + error.message);
        }
    }
    
    // Добавить товар
    async addProduct(productData) {
        try {
            this.showLoading('Добавление товара...');
            const result = await this.apiCall('add_product', productData);
            this.showSuccess('Товар успешно добавлен!');
            setTimeout(() => {
                this.renderScreen('main');
            }, 2000);
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка добавления: ' + error.message);
        }
    }
    
    // Добавить поставщика
    async addSupplier(supplierData) {
        try {
            this.showLoading('Добавление поставщика...');
            
            // Сохраняем как строки для сохранения ведущих нулей
            const data = {
                name: supplierData.name,
                tg_id: String(supplierData.tg_id || ''), // Сохраняем как строку
                phone: String(supplierData.phone) // Сохраняем как строку
            };
            
            const result = await this.apiCall('add_supplier', data);
            this.showSuccess('Поставщик успешно добавлен!');
            setTimeout(() => {
                this.renderScreen('main');
            }, 2000);
        } catch (error) {
            this.hideLoading();
            this.showNotification('error', 'Ошибка добавления: ' + error.message);
        }
    }
    
    // Обработчик выбора шаблона
    handleTemplateSelect(templateName, cardElement) {
        // Анимация нажатия
        cardElement.style.transform = 'scale(0.98)';
        this.disableUI();
        setTimeout(() => {
            this.loadTemplateProducts(templateName);
        }, 150);
    }

    // Обработчик кнопки "Назад" с анимацией
    handleBackButton() {
        const button = event.currentTarget;
        
        // Анимация кнопки
        button.style.transform = 'translateX(-3px)';
        this.disableUI();
        setTimeout(() => {
            button.style.transform = '';
            this.renderScreen('main');
        }, 300);
    }
    
    // Рендер экрана создания заявки
    renderOrderCreationScreen(data) {
        if (!data || !data.products) {
            return this.renderTemplateSelectionScreen();
        }
        
        let productsHtml = '';
        
        // Группируем товары в зависимости от выбранного способа
        if (this.currentGroupBy === 'supplier') {
            productsHtml = this.renderProductsBySupplier(data.products);
        } else {
            productsHtml = this.renderProductsByTags(data.products);
        }
        
        return `
            <div class="order-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('template_selection')">◀️ Назад</button>
                    <h1>${data.templateName}</h1>
                </header>
                
                <!-- Toggle Switch для сортировки -->
                <div class="grouping-toggle-container">
                    <div class="toggle-switch">
                        <input type="checkbox" id="groupingToggle" class="toggle-checkbox" 
                               ${this.currentGroupBy === 'tags' ? 'checked' : ''}>
                        <label class="toggle-label" for="groupingToggle">
                            <span class="toggle-handle"></span>
                            <span class="toggle-text-supplier">📦 Поставщикам</span>
                            <span class="toggle-text-tags">🏷️ По тегам</span>
                        </label>
                    </div>
                </div>
                
                ${productsHtml}
                
                <button class="btn primary" onclick="app.submitOrder('${data.templateName}')" 
                        style="width: 100%; margin-top: 20px; padding: 15px; font-size: 18px;">
                    📨 Отправить заявку
                </button>
                
                <div id="orderStatus" class="status"></div>
            </div>
        `;
    }
    // Новый метод для обработки выхода из экрана заявки
    handleBackFromOrder() {
        // Сохраняем данные перед уходом
        this.saveCurrentFormData();
        this.renderScreen('template_selection');
    }
    // Рендер товаров по поставщикам (существующая логика)
    renderProductsBySupplier(products) {
        const groupedBySupplier = {};
        products.forEach(product => {
            if (!groupedBySupplier[product.supplier]) {
                groupedBySupplier[product.supplier] = [];
            }
            groupedBySupplier[product.supplier].push(product);
        });
        
        let productsHtml = '';
        Object.keys(groupedBySupplier).forEach(supplier => {
            productsHtml += `
                <div class="department-group">
                    <div class="department-header">${supplier}</div>
            `;
            
            groupedBySupplier[supplier].forEach(product => {
                productsHtml += this.renderProductItem(product);
            });
            
            productsHtml += `</div>`;
        });
        
        return productsHtml;
    }

    // Метод для рендера товаров по тегам
    renderProductsByTags(products) {
        // Создаем объект для группировки по тегам
        const groupedByTags = {};
        
        products.forEach(product => {
            // Получаем теги из product_tags (предполагаем, что это строка с тегами через запятую)
            const tags = product.product_tags ? 
                product.product_tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
                ['Без тега'];
            
            // Используем первый тег для группировки (по условию тег может быть только один)
            const mainTag = tags[0];
            
            if (!groupedByTags[mainTag]) {
                groupedByTags[mainTag] = [];
            }
            groupedByTags[mainTag].push(product);
        });
        
        let productsHtml = '';
        Object.keys(groupedByTags).sort().forEach(tag => {
            productsHtml += `
                <div class="department-group">
                    <div class="department-header">
                        🏷️ ${tag}
                    </div>
            `;
            
            groupedByTags[tag].forEach(product => {
                productsHtml += this.renderProductItem(product);
            });
            
            productsHtml += `</div>`;
        });
        
        return productsHtml;
    }
    // Вынесенный метод рендера одного товара (для переиспользования)
    renderProductItem(product) {
        const key = `${product.name}|${product.supplier}`;
        const savedData = this.currentOrderData[key] || {};
        const savedQuantity = savedData.quantity || 0;
        const savedComment = savedData.comment || '';
        
        // Формируем дополнительную информацию
        const additionalInfo = [];
        if (product.shelf_life) {
            additionalInfo.push(`🕒 ${product.shelf_life}д`);
        }
        if (product.min_stock) {
            additionalInfo.push(`📦 ${product.min_stock}`);
        }
        
        return `
            <div class="product-item">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-details" style="font-size: 12px; color: #7f8c8d;">
                        ${product.unit} • ${product.supplier}
                        ${additionalInfo.length > 0 ? ` • ${additionalInfo.join(' • ')}` : ''}
                    </div>
                </div>
                <input type="number" 
                       class="quantity-input" 
                       min="0" 
                       value="${savedQuantity}"
                       data-product-name="${product.name}"
                       data-product-unit="${product.unit}"
                       data-supplier="${product.supplier}"
                       placeholder="0">
                <input type="text" 
                       class="comment-input" 
                       placeholder="Комментарий"
                       data-product-name="${product.name}"
                       data-supplier="${product.supplier}"
                       value="${savedComment}">
            </div>
        `;
    }
    
    // Рендер экрана истории заявок
    renderOrderHistoryScreen() {
        console.log('Rendering history screen, orders count:', this.ordersHistory.length);
        
        let ordersHtml = '';
        
        if (!this.ordersHistory || this.ordersHistory.length === 0) {
            ordersHtml = `
                <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📭</div>
                    <h3>Заявок пока нет</h3>
                    <p>Создайте первую заявку на главном экране</p>
                </div>
            `;
        } else {
            this.ordersHistory.forEach((order) => {
                console.log('Rendering order:', order);
                
                // Безопасное форматирование даты
                let orderDate = 'Дата неизвестна';
                let orderTime = '';
                try {
                    const date = new Date(order.date);
                    orderDate = date.toLocaleDateString('ru-RU');
                    orderTime = date.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                } catch (e) {
                    console.log('Date parsing error:', e);
                }
                
                ordersHtml += `
                    <div class="order-item ${order.status || 'sent'}" onclick="app.showOrderDetails('${order.order_id}')">
                        <div class="order-header">
                            <span class="order-id">${order.order_id || 'Без номера'}</span>
                            <span class="order-date">${orderDate}</span>
                        </div>
                        <div class="order-details">
                            <span>${order.template || 'Без шаблона'}</span>
                            <span>${order.items_count || 0} товаров</span>
                        </div>
                        <div class="order-time">${orderTime}</div>
                        <div style="margin-top: 8px; font-size: 12px; color: #27ae60;">
                            ✅ Успешно отправлена
                        </div>
                    </div>
                `;
            });
        }
        
        return `
            <div class="history-screen screen-transition">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('main')">◀️ Назад</button>
                    <h1>История заявок</h1>
                </header>
                
                <div class="orders-list">
                    ${ordersHtml}
                </div>
                
                <!-- Модальное окно для деталей заявки -->
                <div id="orderDetailsModal" class="modal-overlay" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="modalTitle">Детали заявки</h2>
                            <button class="close-btn" onclick="app.hideOrderDetails()">×</button>
                        </div>
                        <div id="modalContent">
                            <!-- Контент будет заполнен динамически -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Показать детали заявки
    showOrderDetails(orderId) {
        console.log('Showing details for order:', orderId);
        
        // Находим заявку в истории
        const order = this.ordersHistory.find(o => o.order_id === orderId);
        if (!order) {
            this.showNotification('error', 'Заявка не найдена');
            return;
        }
        
        // Форматируем дату
        let orderDate = 'Дата неизвестна';
        let orderTime = '';
        try {
            const date = new Date(order.date);
            orderDate = date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            orderTime = date.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (e) {
            console.log('Date parsing error:', e);
        }
        
        // Получаем детали товаров
        let itemsHtml = '';
        let totalItems = 0;
        
        try {
            // Предполагаем, что items хранится в order.items
            const items = order.items || [];
            totalItems = items.length;
            
            if (items.length === 0) {
                itemsHtml = `
                    <div class="no-items">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📦</div>
                        <p>Информация о товарах недоступна</p>
                    </div>
                `;
            } else {
                items.forEach((item, index) => {
                    itemsHtml += `
                        <div class="order-detail-item">
                            <div class="order-detail-info">
                                <div class="order-detail-name">${item.product_name || 'Неизвестный товар'}</div>
                                <div class="order-detail-meta">
                                    ${item.supplier || 'Поставщик не указан'} • ${item.unit || 'шт'}
                                </div>
                                ${item.comment ? `<div class="order-detail-comment">💬 ${item.comment}</div>` : ''}
                            </div>
                            <div class="order-detail-quantity">
                                ${item.quantity || 0} ${item.unit || 'шт'}
                            </div>
                        </div>
                    `;
                });
            }
        } catch (error) {
            console.error('Error parsing order items:', error);
            itemsHtml = `
                <div class="no-items">
                    <div style="font-size: 2rem; margin-bottom: 10px;">❌</div>
                    <p>Ошибка загрузки деталей заявки</p>
                </div>
            `;
        }
        
        // Создаем содержимое модального окна
        const modalContent = `
            <div class="order-summary">
                <div class="order-summary-item">
                    <span>Номер заявки:</span>
                    <span><strong>${order.order_id}</strong></span>
                </div>
                <div class="order-summary-item">
                    <span>Шаблон:</span>
                    <span>${order.template || 'Не указан'}</span>
                </div>
                <div class="order-summary-item">
                    <span>Создал:</span>
                    <span>${order.user_name || 'Неизвестно'}</span>
                </div>
                <div class="order-summary-item">
                    <span>Дата:</span>
                    <span>${orderDate}</span>
                </div>
                <div class="order-summary-item">
                    <span>Время:</span>
                    <span>${orderTime}</span>
                </div>
                <div class="order-summary-total">
                    <span>Всего товаров:</span>
                    <span><strong>${totalItems}</strong></span>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <h3 style="margin-bottom: 15px; color: #2c3e50;">Товары в заявке:</h3>
                <div class="order-items-list">
                    ${itemsHtml}
                </div>
            </div>
        `;
        
        // Показываем модальное окно
        const modal = document.getElementById('orderDetailsModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContentDiv = document.getElementById('modalContent');
        
        if (modal && modalTitle && modalContentDiv) {
            modalTitle.textContent = `Заявка ${order.order_id}`;
            modalContentDiv.innerHTML = modalContent;
            modal.style.display = 'flex';
            
            // Блокируем прокрутку основного контента
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Скрыть модальное окно
    hideOrderDetails() {
        const modal = document.getElementById('orderDetailsModal');
        if (modal) {
            modal.style.display = 'none';
            // Восстанавливаем прокрутку
            document.body.style.overflow = 'auto';
        }
    }
    
    // Закрытие модального окна по клику на overlay
    setupModalClose() {
        const modal = document.getElementById('orderDetailsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideOrderDetails();
                }
            });
        }
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
            
            if (e.target.id === 'addProductForm') {
                e.preventDefault();
                this.handleAddProduct();
            }
            
            if (e.target.id === 'addSupplierForm') {
                e.preventDefault();
                this.handleAddSupplier();
            }
        });
    
        // Обработчик изменения выбора тега
        document.addEventListener('change', (e) => {
            if (e.target.id === 'productTags') {
                this.handleTagSelection(e.target.value);
            }
        });
        
        // Динамическая обработка изменений чекбоксов товаров
        document.addEventListener('change', (e) => {
            if (e.target.name === 'products') {
                this.updateSelectionCount();
            }
        });
    }
    
    // Обновленный метод для настройки выбора товаров
    setupProductSelection() {
        const checkboxes = document.querySelectorAll('.product-item input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionCount();
            });
        });
        
        // Добавляем обработчик для чекбокса "Выбрать все"
        const selectAllCheckbox = document.getElementById('selectAllProducts');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                this.toggleSelectAllProducts();
            });
        }
    }
    
    // Обработчик выбора тега
    handleTagSelection(selectedValue) {
        const customTagGroup = document.getElementById('customTagGroup');
        const customTagInput = document.getElementById('customTag');
        
        if (selectedValue === '_custom') {
            customTagGroup.style.display = 'block';
            customTagInput.required = true;
        } else {
            customTagGroup.style.display = 'none';
            customTagInput.required = false;
            customTagInput.value = '';
        }
    }

    // Обработчик добавления товара
    handleAddProduct() {
        const name = document.getElementById('productName').value;
        const selectedTag = document.getElementById('productTags').value;
        const customTag = document.getElementById('customTag').value;
        const unit = document.getElementById('productUnit').value;
        const shelfLife = document.getElementById('productShelfLife').value;
        const minStock = document.getElementById('productMinStock').value;
        const supplier = document.getElementById('productSupplier').value;
    
        // Определяем итоговый тег
        let finalTag;
        if (selectedTag === '_custom') {
            if (!customTag) {
                this.showNotification('error', 'Введите новый тег');
                return;
            }
            finalTag = customTag;
        } else {
            if (!selectedTag) {
                this.showNotification('error', 'Выберите тег');
                return;
            }
            finalTag = selectedTag;
        }
    
        if (!name || !unit || !minStock || !supplier) {
            this.showNotification('error', 'Заполните все обязательные поля');
            return;
        }
    
        this.addProduct({
            name,
            product_tags: finalTag,
            unit,
            shelf_life: shelfLife,
            min_stock: minStock,
            suppliers: supplier
        });
    }
    
    // Обработчик добавления поставщика
    handleAddSupplier() {
        const name = document.getElementById('supplierName').value;
        const tgId = document.getElementById('supplierTgId').value;
        const phone = document.getElementById('supplierPhone').value;
    
        if (!name || !phone) {
            this.showNotification('error', 'Заполните все обязательные поля');
            return;
        }
    
        this.addSupplier({
            name,
            tg_id: tgId,
            phone
        });
    }
    
    initToggleSwitch() {
        const toggle = document.getElementById('groupingToggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.changeGroupBy(e.target.checked ? 'tags' : 'supplier');
            });
        }
        
        // Восстанавливаем данные формы после рендера
        setTimeout(() => {
            this.restoreFormData();
        }, 100);
    }
    // Выход из системы
    logout() {
        this.currentUser = null;
        this.ordersHistory = [];
        this.availableTemplates = [];
        this.enableUI(); // Разблокируем UI
        this.renderScreen('login');
    }
}

// Инициализация приложения
const app = new RestaurantOrderApp();










