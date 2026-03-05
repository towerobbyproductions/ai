// Конфигурация
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbxUrCC-a18KuKxh5LdMYuB-G_VF1cX7RRA7sbdoq1OAQPXNxenwQgPopyULmZTgG4AP/exec',
    DEEPSEEK_API_KEY: 'sk-c5d3651df6864e1aa121c9f65b108fb4',
    MAX_HISTORY: 50,
    TYPING_DELAY: 500
};

// Состояние приложения
const state = {
    messages: [],
    history: [],
    favorites: [],
    isTyping: false,
    currentCategory: 'all',
    theme: 'dark'
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('RoGPT инициализация...');
    initializeApp();
    loadState(); // Теперь функция определена!
    setupEventListeners();
});

// Инициализация приложения
function initializeApp() {
    console.log('Запуск приложения...');
    
    // Загружаем историю из localStorage
    loadFromStorage();
    
    // Настраиваем auto-resize для textarea
    setupTextareaResize();
    
    // Показываем приветственное сообщение (только если нет сообщений)
    if (document.querySelectorAll('.message').length === 0) {
        addWelcomeMessage();
    }
}

// Загрузка состояния
function loadState() {
    console.log('Загрузка состояния...');
    // Здесь можно добавить логику загрузки состояния
    updateSidebar();
    updateFavorites();
}

// Загрузка из localStorage
function loadFromStorage() {
    try {
        const savedHistory = localStorage.getItem('roGptHistory');
        if (savedHistory) {
            state.history = JSON.parse(savedHistory);
            console.log('История загружена:', state.history.length);
        }
        
        const savedFavorites = localStorage.getItem('roGptFavorites');
        if (savedFavorites) {
            state.favorites = JSON.parse(savedFavorites);
            console.log('Избранное загружено:', state.favorites.length);
        }
        
        const savedTheme = localStorage.getItem('roGptTheme');
        if (savedTheme) {
            state.theme = savedTheme;
            applyTheme(savedTheme);
        }
    } catch (e) {
        console.error('Error loading from storage:', e);
    }
}

// Сохранение в localStorage
function saveToStorage() {
    try {
        localStorage.setItem('roGptHistory', JSON.stringify(state.history.slice(-CONFIG.MAX_HISTORY)));
        localStorage.setItem('roGptFavorites', JSON.stringify(state.favorites));
        localStorage.setItem('roGptTheme', state.theme);
        console.log('Сохранено в localStorage');
    } catch (e) {
        console.error('Error saving to storage:', e);
    }
}

// Применение темы
function applyTheme(theme) {
    const root = document.documentElement;
    const icon = document.querySelector('.theme-toggle i');
    
    if (theme === 'light') {
        root.style.setProperty('--bg-dark', '#f5f5f5');
        root.style.setProperty('--bg-darker', '#ffffff');
        root.style.setProperty('--bg-light', '#e0e0e0');
        root.style.setProperty('--text-primary', '#333333');
        root.style.setProperty('--text-secondary', '#666666');
        root.style.setProperty('--border-color', '#dddddd');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    } else {
        root.style.setProperty('--bg-dark', '#1a1b1e');
        root.style.setProperty('--bg-darker', '#141517');
        root.style.setProperty('--bg-light', '#2c2d32');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#a0a0a0');
        root.style.setProperty('--border-color', '#3a3b3f');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
}

// Настройка auto-resize для textarea
function setupTextareaResize() {
    const textarea = document.getElementById('userInput');
    if (!textarea) {
        console.error('Textarea не найдена!');
        return;
    }
    
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков...');
    
    // Отправка сообщения
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        console.log('Обработчик sendBtn добавлен');
    } else {
        console.error('sendBtn не найден!');
    }
    
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        console.log('Обработчик userInput добавлен');
    }
    
    // Быстрые шаблоны
    const templates = document.querySelectorAll('.template-chip');
    if (templates.length > 0) {
        templates.forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.dataset.prompt || chip.textContent.trim();
                if (userInput) {
                    userInput.value = prompt;
                    sendMessage();
                }
            });
        });
        console.log('Обработчики шаблонов добавлены');
    }
    
    // Категории
    const categories = document.querySelectorAll('.category');
    categories.forEach(cat => {
        cat.addEventListener('click', () => {
            categories.forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            state.currentCategory = cat.dataset.cat || 'all';
            filterMessages();
        });
    });
    
    // Кнопки инструментов
    const attachBtn = document.getElementById('attachFile');
    if (attachBtn) attachBtn.addEventListener('click', attachFile);
    
    const insertBtn = document.getElementById('insertCode');
    if (insertBtn) insertBtn.addEventListener('click', showCodeModal);
    
    const clearBtn = document.getElementById('clearChat');
    if (clearBtn) clearBtn.addEventListener('click', clearChat);
    
    // Модальное окно
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const analyzeBtn = document.querySelector('.analyze-btn');
    
    if (closeModal) closeModal.addEventListener('click', hideCodeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideCodeModal);
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeCode);
    
    // Переключение темы
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Закрытие модального окна по клику вне его
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('codeModal');
        if (e.target === modal) {
            hideCodeModal();
        }
    });
}

// Отправка сообщения
async function sendMessage() {
    console.log('sendMessage вызван');
    
    const input = document.getElementById('userInput');
    if (!input) {
        console.error('Input не найден!');
        return;
    }
    
    const message = input.value.trim();
    console.log('Сообщение:', message);
    
    if (!message) {
        showNotification('Введите сообщение', 'warning');
        return;
    }
    
    if (state.isTyping) {
        showNotification('Подождите, я еще думаю...', 'info');
        return;
    }
    
    // Добавляем сообщение пользователя
    addMessage(message, 'user');
    input.value = '';
    input.style.height = 'auto';
    
    // Показываем индикатор печатания
    showTypingIndicator();
    state.isTyping = true;
    
    try {
        // Получаем ответ от API
        console.log('Получение ответа от AI...');
        const response = await getAIResponse(message);
        console.log('Ответ получен:', response.substring(0, 50) + '...');
        
        // Убираем индикатор
        hideTypingIndicator();
        
        // Добавляем ответ
        addMessage(response, 'bot');
        
        // Сохраняем в историю
        state.history.push({
            question: message,
            answer: response,
            timestamp: new Date().toISOString()
        });
        saveToStorage();
        
        // Обновляем боковую панель
        updateSidebar();
        
    } catch (error) {
        console.error('Ошибка:', error);
        hideTypingIndicator();
        addMessage('❌ Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.', 'bot');
    } finally {
        state.isTyping = false;
    }
}

// Получение ответа от AI
async function getAIResponse(message) {
    // Проверяем, есть ли в кэше
    const cached = checkCache(message);
    if (cached) return cached;
    
    // Специализированный промпт для Roblox
    const systemPrompt = `Ты RoGPT - эксперт по Roblox Studio и Lua программированию.
    
    Правила ответов:
    1. Всегда давай полные, рабочие примеры кода
    2. Объясняй сложные концепции простым языком
    3. Используй лучшие практики Roblox разработки
    4. Предупреждай о возможных ошибках
    5. Предлагай оптимизации
    
    Формат ответа:
    - Сначала краткое объяснение
    - Затем код с комментариями в формате:
    \`\`\`lua
    -- Твой код здесь
    \`\`\`
    - В конце дополнительные советы и предупреждения`;
    
    try {
        // Пробуем сначала через Google Apps Script
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                system: systemPrompt
            })
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const data = await response.json();
        
        // Кэшируем ответ
        cacheResponse(message, data.response);
        
        return data.response;
        
    } catch (error) {
        console.log('Falling back to local AI...');
        // Если API недоступен, используем локальную имитацию
        return getLocalResponse(message);
    }
}

// Локальные ответы (запасной вариант)
function getLocalResponse(message) {
    const lowercaseMsg = message.toLowerCase();
    
    // Приветствия
    if (lowercaseMsg.includes('привет') || lowercaseMsg.includes('здравствуй')) {
        return `Привет! 👋 Я RoGPT, твой помощник по Roblox Studio. Чем могу помочь?

Я могу:
• Написать скрипт на Lua
• Объяснить механику игры
• Помочь с отладкой
• Предложить оптимизации

Просто напиши, что тебе нужно!`;
    }
    
    // Движение
    if (lowercaseMsg.includes('движение') || lowercaseMsg.includes('walk') || lowercaseMsg.includes('бег')) {
        return `Вот базовый скрипт для движения игрока:

\`\`\`lua
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local speed = 16
local moveDirection = Vector3.new(0,0,0)

UserInputService.InputBegan:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.W then
        moveDirection = moveDirection + Vector3.new(0,0,-1)
    elseif input.KeyCode == Enum.KeyCode.S then
        moveDirection = moveDirection + Vector3.new(0,0,1)
    elseif input.KeyCode == Enum.KeyCode.A then
        moveDirection = moveDirection + Vector3.new(-1,0,0)
    elseif input.KeyCode == Enum.KeyCode.D then
        moveDirection = moveDirection + Vector3.new(1,0,0)
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.W then
        moveDirection = moveDirection - Vector3.new(0,0,-1)
    elseif input.KeyCode == Enum.KeyCode.S then
        moveDirection = moveDirection - Vector3.new(0,0,1)
    elseif input.KeyCode == Enum.KeyCode.A then
        moveDirection = moveDirection - Vector3.new(-1,0,0)
    elseif input.KeyCode == Enum.KeyCode.D then
        moveDirection = moveDirection - Vector3.new(1,0,0)
    end
end)

RunService.Heartbeat:Connect(function()
    if moveDirection.Magnitude > 0 then
        humanoid.WalkSpeed = speed
        humanoid.MoveDirection = moveDirection.Unit
    else
        humanoid.WalkSpeed = 0
    end
end)
\`\`\`

**Советы:**
- Добавь обработку Shift для бега
- Можно использовать TweenService для плавности
- Не забудь про анимации!`;
    }
    
    // Дверь
    if (lowercaseMsg.includes('дверь') || lowercaseMsg.includes('door')) {
        return `Скрипт для интерактивной двери:

\`\`\`lua
-- Вставь этот скрипт в Part (дверь)
local door = script.Parent
local tweenService = game:GetService("TweenService")

local isOpen = false
local openPosition = door.Position + Vector3.new(0, 0, 5)
local closedPosition = door.Position

local tweenInfo = TweenInfo.new(
    1, -- Время анимации
    Enum.EasingStyle.Quad,
    Enum.EasingDirection.Out
)

door.Touched:Connect(function(hit)
    local character = hit.Parent
    local humanoid = character:FindFirstChild("Humanoid")
    
    if humanoid and not isOpen then
        isOpen = true
        
        -- Открываем дверь
        local tween = tweenService:Create(door, tweenInfo, {Position = openPosition})
        tween:Play()
        
        -- Закрываем через 3 секунды
        task.wait(3)
        
        local closeTween = tweenService:Create(door, tweenInfo, {Position = closedPosition})
        closeTween:Play()
        isOpen = false
    end
end)
\`\`\`

**Важно:**
- Убедись что дверь - это Part, а не Model
- Anchored должен быть true
- CanCollide должен быть true
- Можно добавить звук открытия/закрытия`;
    }
    
    // DataStore
    if (lowercaseMsg.includes('datastore') || lowercaseMsg.includes('сохранение')) {
        return `Система сохранения через DataStore:

\`\`\`lua
local DataStoreService = game:GetService("DataStoreService")
local playerDataStore = DataStoreService:GetDataStore("PlayerData")

game.Players.PlayerAdded:Connect(function(player)
    -- Загружаем данные игрока
    local success, data = pcall(function()
        return playerDataStore:GetAsync(player.UserId)
    end)
    
    if success and data then
        -- Создаем папку с данными
        local dataFolder = Instance.new("Folder")
        dataFolder.Name = "PlayerData"
        dataFolder.Parent = player
        
        -- Загружаем данные
        for key, value in pairs(data) do
            local valueObject = Instance.new("NumberValue")
            valueObject.Name = key
            valueObject.Value = value
            valueObject.Parent = dataFolder
        end
        
        print("Данные загружены для", player.Name)
    else
        print("Новый игрок:", player.Name)
    end
end)

game.Players.PlayerRemoving:Connect(function(player)
    -- Сохраняем данные игрока
    local dataFolder = player:FindFirstChild("PlayerData")
    if dataFolder then
        local data = {}
        for _, child in ipairs(dataFolder:GetChildren()) do
            if child:IsA("NumberValue") then
                data[child.Name] = child.Value
            end
        end
        
        local success, error = pcall(function()
            playerDataStore:SetAsync(player.UserId, data)
        end)
        
        if success then
            print("Данные сохранены для", player.Name)
        else
            warn("Ошибка сохранения:", error)
        end
    end
end)
\`\`\`

**Важно:**
- DataStore работает только на сервере
- Всегда используй pcall для защиты
- Учитывай лимиты DataStore (в секунду)`;
    }
    
    // RemoteEvents
    if (lowercaseMsg.includes('remote') || lowercaseMsg.includes('event')) {
        return `Объяснение RemoteEvents:

**RemoteEvents** - это способ связи между клиентом и сервером.

\`\`\`lua
-- 1. Создай RemoteEvent в ReplicatedStorage
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local remoteEvent = Instance.new("RemoteEvent")
remoteEvent.Name = "MyRemoteEvent"
remoteEvent.Parent = ReplicatedStorage

-- 2. Серверный скрипт (ServerScriptService)
local remoteEvent = game.ReplicatedStorage:WaitForChild("MyRemoteEvent")

remoteEvent.OnServerEvent:Connect(function(player, ...)
    local args = {...}
    print("Получено от", player.Name, "аргументы:", args)
    
    -- Отвечаем всем игрокам
    remoteEvent:FireAllClients("Ответ от сервера")
end)

-- 3. Клиентский скрипт (StarterPlayerScripts)
local remoteEvent = game.ReplicatedStorage:WaitForChild("MyRemoteEvent")

-- Отправляем на сервер
remoteEvent:FireServer("Привет сервер!", 123, true)

-- Получаем от сервера
remoteEvent.OnClientEvent:Connect(function(...)
    local args = {...}
    print("Получено от сервера:", args)
end)
\`\`\`

**Важно:**
- Не доверяй клиенту - проверяй данные на сервере
- Ограничивай частоту вызовов
- Используй RemoteFunction для получения ответа`;
    }
    
    // Если ничего не подошло
    return `Я могу помочь с различными аспектами Roblox разработки:

**Популярные темы:**
• 🏃 **Движение игрока** - бег, прыжки, паркур
• 🚪 **Интерактивные объекты** - двери, кнопки, ловушки
• 💾 **Сохранение данных** - DataStore, профили игроков
• 📡 **RemoteEvents** - связь клиент-сервер
• 🎮 **GUI интерфейсы** - меню, инвентарь, худи
• ⚔️ **Боевая система** - оружие, урон, здоровье

**Напиши конкретнее, что именно тебя интересует!**`;
}

// Кэширование
const cache = new Map();

function checkCache(message) {
    const hash = hashCode(message);
    return cache.get(hash);
}

function cacheResponse(message, response) {
    const hash = hashCode(message);
    cache.set(hash, response);
    // Очищаем через час
    setTimeout(() => cache.delete(hash), 3600000);
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// Добавление сообщения в чат
function addMessage(text, sender) {
    console.log('Добавление сообщения:', sender);
    
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) {
        console.error('messagesContainer не найден!');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'bot-message'}`;
    
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Обрабатываем markdown и код
    const formattedText = formatMessage(text);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${sender === 'user' ? 'Вы' : 'RoGPT'}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">
                ${formattedText}
            </div>
            <div class="message-actions">
                <button class="action-btn copy-msg" onclick="window.copyMessage(this)">
                    <i class="far fa-copy"></i>
                </button>
                <button class="action-btn favorite" onclick="window.toggleFavorite(this)">
                    <i class="far fa-star"></i>
                </button>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Подсвечиваем синтаксис
    if (window.hljs) {
        messageDiv.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }
}

// Форматирование сообщения
function formatMessage(text) {
    if (!text) return '';
    
    // Экранируем HTML
    text = text.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
    
    // Конвертируем markdown в HTML
    if (window.marked) {
        try {
            text = marked.parse(text, {
                highlight: function(code, lang) {
                    if (lang === 'lua' && window.hljs) {
                        return hljs.highlight(code, { language: 'lua' }).value;
                    }
                    return code;
                }
            });
        } catch (e) {
            console.error('Markdown error:', e);
        }
    }
    
    return text;
}

// Индикатор печатания
function showTypingIndicator() {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    // Проверяем, нет ли уже индикатора
    if (document.getElementById('typingIndicator')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'message bot-message';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        .typing-dots {
            display: flex;
            gap: 5px;
            padding: 10px;
            background: var(--bg-light);
            border-radius: 12px;
            width: fit-content;
        }
        
        .typing-dots span {
            width: 8px;
            height: 8px;
            background: var(--text-secondary);
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        
        .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.6;
            }
            30% {
                transform: translateY(-10px);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Приветственное сообщение
function addWelcomeMessage() {
    const welcomeText = `# 👋 Привет! Я RoGPT

Я твой персональный AI помощник для **Roblox Studio**!

## Что я умею:
• 📝 **Писать скрипты** на Lua
• 🎮 **Создавать механики** игр
• 🔧 **Оптимизировать код**
• 🐛 **Исправлять ошибки**
• 📚 **Обучать** разработке

## Попробуй спросить:
• "Напиши скрипт для движения"
• "Как сделать дверь?"
• "Объясни RemoteEvents"
• "Сохранение данных"

**Чем могу помочь?** 🚀`;
    
    addMessage(welcomeText, 'bot');
}

// Копирование сообщения
function copyMessage(button) {
    const messageContent = button.closest('.message-content');
    if (!messageContent) return;
    
    const messageText = messageContent.querySelector('.message-text').innerText;
    
    navigator.clipboard.writeText(messageText).then(() => {
        showNotification('Скопировано! 📋', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = messageText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Скопировано! 📋', 'success');
    });
}

// Избранное
function toggleFavorite(button) {
    const messageContent = button.closest('.message-content');
    if (!messageContent) return;
    
    const messageText = messageContent.querySelector('.message-text').innerHTML;
    const icon = button.querySelector('i');
    
    if (icon.classList.contains('fas')) {
        icon.classList.remove('fas');
        icon.classList.add('far');
        // Удаляем из избранного
        state.favorites = state.favorites.filter(f => f.content !== messageText);
        showNotification('Удалено из избранного', 'info');
    } else {
        icon.classList.remove('far');
        icon.classList.add('fas');
        // Добавляем в избранное
        state.favorites.push({
            content: messageText,
            timestamp: new Date().toISOString()
        });
        showNotification('Добавлено в избранное ⭐', 'success');
    }
    
    saveToStorage();
    updateFavorites();
}

// Обновление избранного
function updateFavorites() {
    const favoritesList = document.querySelector('.favorites-list');
    if (!favoritesList) return;
    
    favoritesList.innerHTML = '';
    
    if (state.favorites.length === 0) {
        favoritesList.innerHTML = '<div class="empty-list">Нет избранного</div>';
        return;
    }
    
    state.favorites.slice(-5).forEach(fav => {
        const div = document.createElement('div');
        div.className = 'favorite-item';
        
        // Очищаем от HTML тегов для превью
        const textPreview = fav.content.replace(/<[^>]*>/g, '').substring(0, 50);
        
        div.innerHTML = `
            <i class="fas fa-star" style="color: #ffd700;"></i>
            <span>${textPreview}...</span>
        `;
        
        // При клике показываем полное сообщение
        div.addEventListener('click', () => {
            addMessage('Из избранного:', 'user');
            addMessage(fav.content, 'bot');
        });
        
        favoritesList.appendChild(div);
    });
}

// Прикрепление файла
function attachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.lua,.txt,.rbxmx';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('userInput').value = 
                `Проанализируй этот код:\n\n\`\`\`lua\n${e.target.result}\n\`\`\``;
            showNotification('Файл загружен! 📎', 'success');
        };
        reader.readAsText(file);
    };
    input.click();
}

// Модальное окно для кода
function showCodeModal() {
    const modal = document.getElementById('codeModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function hideCodeModal() {
    const modal = document.getElementById('codeModal');
    if (modal) {
        modal.classList.remove('active');
    }
    const input = document.getElementById('codeInput');
    if (input) {
        input.value = '';
    }
}

function analyzeCode() {
    const code = document.getElementById('codeInput')?.value.trim();
    if (code) {
        document.getElementById('userInput').value = 
            `Проанализируй этот код и предложи улучшения:\n\n\`\`\`lua\n${code}\n\`\`\``;
        hideCodeModal();
        sendMessage();
    } else {
        showNotification('Вставьте код для анализа', 'warning');
    }
}

// Очистка чата
function clearChat() {
    if (confirm('Очистить историю чата?')) {
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            addWelcomeMessage();
            state.messages = [];
            showNotification('Чат очищен', 'info');
        }
    }
}

// Фильтрация сообщений (заглушка)
function filterMessages() {
    console.log('Фильтрация по категории:', state.currentCategory);
    // Здесь можно добавить логику фильтрации
}

// Переключение темы
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    saveToStorage();
    
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    showNotification(`Тема: ${state.theme === 'dark' ? '🌙 Темная' : '☀️ Светлая'}`, 'success');
}

// Уведомления
function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    // Стили для уведомлений
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'success' ? '#4caf50' : 
                     type === 'error' ? '#f44336' : 
                     type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    
    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Обновление боковой панели
function updateSidebar() {
    // История
    const historyContainer = document.querySelector('.chat-history');
    if (historyContainer) {
        historyContainer.innerHTML = '';
        
        if (state.history.length === 0) {
            historyContainer.innerHTML = '<div class="empty-list">Нет истории</div>';
            return;
        }
        
        state.history.slice(-5).reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <i class="fas fa-message"></i>
                <span>${item.question.substring(0, 30)}...</span>
            `;
            div.onclick = () => {
                document.getElementById('userInput').value = item.question;
                sendMessage();
            };
            historyContainer.appendChild(div);
        });
    }
    
    // Последние запросы в info panel
    const recentRequests = document.querySelector('.recent-requests');
    if (recentRequests && state.history.length > 0) {
        recentRequests.innerHTML = '';
        state.history.slice(-3).reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'recent-item';
            div.innerHTML = `
                <i class="fas fa-history"></i>
                <span>${item.question.substring(0, 25)}...</span>
            `;
            recentRequests.appendChild(div);
        });
    }
    
    updateFavorites();
}

// Делаем функции глобальными
window.sendMessage = sendMessage;
window.copyMessage = copyMessage;
window.toggleFavorite = toggleFavorite;
window.attachFile = attachFile;
window.showCodeModal = showCodeModal;
window.analyzeCode = analyzeCode;
window.clearChat = clearChat;
window.toggleTheme = toggleTheme;

console.log('Script.js загружен и готов к работе!');
