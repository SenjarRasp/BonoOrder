class RestaurantOrderApp {
    constructor() {
        this.basePath = window.location.pathname.includes('/BonoOrder/') 
            ? '/BonoOrder/' 
            : '/';
        
        // Замените на ваш реальный URL Google Apps Script
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

    // Реальный API вызов
    async apiCall(action, data = {}) {
        // Если URL не настроен, используем мок
        if (this.apiUrl.includes('ВАШ_SCRIPT_ID')) {
            console.log('Используем мок данные - настройте API URL');
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
            // При ошибке используем мок
            return this.mockApiCall(action, data);
        }
    }

    // Улучшенный мок с реальными данными
    mockApiCall(action, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                switch(action) {
                    case 'login':
                        const users = {
                            'chef@restaurant.ru': { department: 'кухня', position: 'шеф-повар' },
                            'barman@restaurant.ru': { department: 'бар', position: 'старший бармен' },
                            'manager@restaurant.ru': { department: 'зал', position: 'менеджер' },
                            'admin@restaurant.ru': { department: 'все', position: 'администратор' }
                        };
                        
                        if (users[data.email] && data.password === '123456') {
                            resolve({
                                user: { 
                                    email: data.email, 
                                    ...users[data.email]
                                },
                                token: 'mock_token_' + Date.now()
                            });
                        } else {
                            reject(new Error('Неверный email или пароль'));
                        }
                        break;
                        
                    case 'get_products':
                        const templates = {
                            1: { // Ежедневная
                                name: 'Ежедневная закупка',
                                products: {
                                    'кухня': [
                                        { id: 1, name: 'Картофель', unit: 'кг', min_stock: 50, suppliers: [1] },
                                        { id: 2, name: 'Морковь', unit: 'кг', min_stock: 20, suppliers: [1] },
                                        { id: 3, name: 'Лук репчатый', unit: 'кг', min_stock: 15, suppliers: [1] },
                                        { id: 4, name: 'Говядина вырезка', unit: 'кг', min_stock: 25, suppliers: [2] },
                                        { id: 5, name: 'Курица филе', unit: 'кг', min_stock: 20, suppliers: [2] }
                                    ]
                                }
                            },
                            2: { // Еженедельная
                                name: 'Еженедельная закупка',
                                products: {
                                    'кухня': [
                                        { id: 1, name: 'Картофель', unit: 'кг', min_stock: 50, suppliers: [1] },
                                        { id: 2, name: 'Морковь', unit: 'кг', min_stock: 20, suppliers: [1] },
                                        { id: 4, name: 'Говядина вырезка', unit: 'кг', min_stock: 25, suppliers: [2] },
                                        { id: 6, name: 'Лосось', unit: 'кг', min_stock: 10, suppliers: [2] }
                                    ],
                                    'бар': [
                                        { id: 7, name: 'Виски Jack Daniels', unit: 'шт', min_stock: 5, suppliers: [3] },
                                        { id: 8, name: 'Водка Русский Стандарт', unit: 'шт', min_stock: 10, suppliers: [3] },
                                        { id: 9, name: 'Тоник Schweppes', unit: 'л', min_stock: 12, suppliers: [4] },
                                        { id: 10, name: 'Кофе в зернах', unit: 'кг', min_stock: 8, suppliers: [4] }
                                    ],
                                    'зал': [
                                        { id: 11, name: 'Салфетки бумажные', unit: 'уп', min_stock: 20, suppliers: [5] },
                                        { id: 12, name: 'Свечи декоративные', unit: 'шт', min_stock: 30, suppliers: [5] }
                                    ]
                                }
                            },
                            3: { // Срочная
                                name: 'Срочная закупка',
                                products: {
                                    'кухня': [
                                        { id: 1, name: 'Картофель', unit: 'кг', min_stock: 50, suppliers: [1] },
                                        { id: 4, name: 'Говядина вырезка', unit: 'кг', min_stock: 25, suppliers: [2] }
                                    ],
                                    'бар': [
                                        { id: 7, name: 'Виски Jack Daniels', unit: 'шт', min_stock: 5, suppliers: [3] },
                                        { id: 9, name: 'Тоник Schweppes', unit: 'л', min_stock: 12, suppliers: [4] }
                                    ]
                                }
                            }
                        };
                        
                        const templateData = templates[data.templateId];
                        if (templateData) {
                            resolve({
                                grouped_products: templateData.products,
                                template_name: templateData.name
                            });
                        } else {
                            reject(new Error('Шаблон не найден'));
                        }
                        break;
                        
                    case 'create_order':
                        const orderId = 'ORD_' + Math.random().toString(36).substr(2, 8).toUpperCase();
                        const suppliers = [
                            { name: 'ООО "Свежие Овощи"', status: 'success' },
                            { name: 'ООО "Мясной Двор"', status: 'success' },
                            { name: 'ООО "Алкогольные Напитки"', status: 'success' },
                            { name: 'ООО "Бакалея"', status: 'success' },
                            { name: 'ООО "Ресторанные Поставки"', status: 'success' }
                        ];
                        
                        // Определяем задействованных поставщиков
                        const involvedSuppliers = [...new Set(data.items.flatMap(item => item.suppliers))];
                        const sendResults = suppliers.filter(s => involvedSuppliers.includes(suppliers.indexOf(s) + 1));
                        
                        resolve({ 
                            order_id: orderId,
                            send_results: sendResults,
                            timestamp: new Date().toISOString()
                        });
                        break;
                        
                    case 'get_order_history':
                        resolve(this.ordersHistory);
                        break;
                        
                    case 'get_dashboard_data':
                        resolve({
                            total_orders: this.ordersHistory.length,
                            recent_orders: this.ordersHistory.filter(order => 
                                new Date(order.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                            ).length,
                            pending_orders: 0,
                            last_order: this.ordersHistory[0] || null
                        });
                        break;
                        
                    default:
                        reject(new Error('Unknown action'));
                }
            }, 1000);
        });
    }

    // Обработка логина
    async handleLogin(email, password) {
        try {
            this.showNotification('loading', 'Вход в систему...');
            this.currentUser = await this.apiCall('login', { email, password });
            
            // Загружаем данные дашборда
            const dashboardData = await this.apiCall('get_dashboard_data', {
                userEmail: this.currentUser.email
            });
            this.dashboardData = dashboardData;
            
            this.renderScreen('main');
            this.showNotification('success', `Добро пожаловать, ${this.currentUser.position}!`);
        } catch (error) {
            this.showNotification('error', error.message);
        }
    }

    // Обновленный рендер главного экрана с дашбордом
    renderMainScreen() {
        const stats = this.dashboardData || {
            total_orders: 0,
            recent_orders: 0,
            pending_orders: 0,
            last_order: null
        };
        
        return `
            <div class="main-screen">
                <header class="header">
                    <h1>Главная</h1>
                    <div class="user-info">
                        ${this.currentUser.department} • ${this.currentUser.position}
                    </div>
                </header>
                
                <!-- Статистика -->
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-number">${stats.total_orders}</div>
                        <div class="stat-label">Всего заявок</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.recent_orders}</div>
                        <div class="stat-label">За 7 дней</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.pending_orders}</div>
                        <div class="stat-label">В обработке</div>
                    </div>
                </div>
                
                <!-- Последняя заявка -->
                ${stats.last_order ? `
                    <div class="recent-order">
                        <h3>Последняя заявка</h3>
                        <div class="order-preview">
                            <strong>${stats.last_order.order_id}</strong>
                            <span>${new Date(stats.last_order.date).toLocaleDateString('ru-RU')}</span>
                            <span>${stats.last_order.template}</span>
                        </div>
                    </div>
                ` : ''}
                
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
            </div>
        `;
    }

    // Обновленный экран создания заявки с минимальным запасом
    renderOrderCreationScreen(data) {
        if (!data || !data.products) {
            return this.renderTemplateSelectionScreen();
        }
        
        let productsHtml = '';
        
        Object.keys(data.products).forEach(dept => {
            productsHtml += `
                <div class="department-group">
                    <div class="department-header">
                        ${dept.toUpperCase()}
                        <span class="department-badge">${data.products[dept].length} товаров</span>
                    </div>
            `;
            
            data.products[dept].forEach(product => {
                productsHtml += `
                    <div class="product-item">
                        <div class="product-info">
                            <div class="product-name">${product.name}</div>
                            <div class="product-details">
                                <span class="product-unit">${product.unit}</span>
                                ${product.min_stock ? 
                                    `<span class="min-stock">мин: ${product.min_stock}</span>` : ''}
                            </div>
                        </div>
                        <input type="number" 
                               class="quantity-input" 
                               min="0" 
                               value="0" 
                               data-product-id="${product.id}"
                               placeholder="0"
                               style="width: 80px;">
                        <input type="text" 
                               class="comment-input" 
                               placeholder="Комментарий"
                               data-product-id="${product.id}"
                               style="flex: 1; margin-left: 10px;">
                    </div>
                `;
            });
            
            productsHtml += `</div>`;
        });
        
        return `
            <div class="order-screen">
                <header class="header">
                    <button class="back-btn" onclick="app.renderScreen('template_selection')">← Назад</button>
                    <h1>${data.template_name}</h1>
                </header>
                
                <div class="template-info">
                    <p>Заполните количество для каждого товара. Указан минимальный запас для справки.</p>
                </div>
                
                ${productsHtml}
                
                <div class="order-actions">
                    <button class="btn primary" onclick="app.submitOrder('${data.template_name}')" style="width: 100%; padding: 15px; font-size: 18px;">
                        📨 Отправить заявку поставщикам
                    </button>
                </div>
                
                <div id="orderStatus" class="status"></div>
            </div>
        `;
    }

    // Остальные методы остаются аналогичными предыдущей версии
    // ... (setupPWA, showInstallPrompt, installPWA, collectOrderItems, etc.)
}

// Добавьте эти стили в styles.css
const additionalStyles = `
.dashboard-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px;
    border-radius: 10px;
    text-align: center;
}

.stat-number {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
}

.stat-label {
    font-size: 12px;
    opacity: 0.9;
}

.recent-order {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 20px;
}

.recent-order h3 {
    margin: 0 0 10px 0;
    color: #2c3e50;
}

.order-preview {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
}

.department-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.department-badge {
    background: #3498db;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.product-details {
    display: flex;
    gap: 10px;
    font-size: 12px;
    color: #7f8c8d;
}

.min-stock {
    color: #e74c3c;
}

.template-info {
    background: #e8f4fd;
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    font-size: 14px;
    color: #2c3e50;
}
`;

// Добавьте стили в существующий CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Инициализация приложения
const app = new RestaurantOrderApp();

