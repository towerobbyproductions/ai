// Конфигурация
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/ВАШ_ID_СКРИПТА/exec',
    DEEPSEEK_API_KEY: 'ВАШ_API_КЛЮЧ',
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
    initializeApp();
    loadState();
    setupEventListeners();
});

// Инициализация приложения
function initializeApp() {
    // Загружаем историю из localStorage
    loadFromStorage();
    
    // Настраиваем auto-resize для textarea
    setupTextareaResize();
    
    // Показываем приветственное сообщение
    addWelcomeMessage();
}

// Загрузка состояния из localStorage
function loadFromStorage() {
    try {
        const savedHistory = localStorage.getItem('roGptHistory');
        if (savedHistory) {
            state.history = JSON.parse(savedHistory);
        }
        
        const savedFavorites = localStorage.getItem('roGptFavorites');
        if (savedFavorites) {
            state.favorites = JSON.parse(savedFavorites);
        }
    } catch (e) {
        console.error('Error loading from storage:', e);
    }
}

// Сохранение в localStorage
function saveToStorage() {
    localStorage.setItem('roGptHistory', JSON.stringify(state.history.slice(-CONFIG.MAX_HISTORY)));
    localStorage.setItem('roGptFavorites', JSON.stringify(state.favorites));
}

// Настройка auto-resize для textarea
function setupTextareaResize() {
    const textarea = document.getElementById('userInput');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Отправка сообщения
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Быстрые шаблоны
    document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            document.getElementById('userInput').value = prompt;
            sendMessage();
        });
    });
    
    // Категории
    document.querySelectorAll('.category').forEach(cat => {
        cat.addEventListener('click', () => {
            document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            state.currentCategory = cat.dataset.cat;
            filterMessages();
        });
    });
    
    // Кнопки инструментов
    document.getElementById('attachFile').addEventListener('click', attachFile);
    document.getElementById('insertCode').addEventListener('click', showCodeModal);
    document.getElementById('clearChat').addEventListener('click', clearChat);
    
    // Модальное окно
    document.querySelector('.close-modal').addEventListener('click', hideCodeModal);
    document.querySelector('.cancel-btn').addEventListener('click', hideCodeModal);
    document.querySelector('.analyze-btn').addEventListener('click', analyzeCode);
    
    // Переключение темы
    document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);
}

// Отправка сообщения
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message || state.isTyping) return;
    
    // Добавляем сообщение пользователя
    addMessage(message, 'user');
    input.value = '';
    input.style.height = 'auto';
    
    // Показываем индикатор печатания
    showTypingIndicator();
    state.isTyping = true;
    
    try {
        // Получаем ответ от API
        const response = await getAIResponse(message);
        
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
        console.error('Error:', error);
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
    
    if (lowercaseMsg.includes('движение') || lowercaseMsg.includes('walk')) {
        return `Вот базовый скрипт для движения игрока:

\`\`\`lua
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local speed = 16
local isMoving = false

UserInputService.InputBegan:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.W then
        isMoving = true
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.W then
        isMoving = false
    end
end)

RunService.Heartbeat:Connect(function()
    if isMoving then
        humanoid.WalkSpeed = speed
    else
        humanoid.WalkSpeed = 0
    end
end)
\`\`\`

**Советы:**
- Используй \`Humanoid.WalkSpeed\` для управления скоростью
- Добавь обработку всех клавиш WASD
- Не забудь про анимации!`;
    }
    
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
- CanCollide должен быть true`;
    }
    
    return "Извини, я не совсем понял вопрос. Можешь уточнить, что именно тебе нужно? Я могу помочь с:\n- Скриптами движения\n- Интерактивными объектами\n- GUI интерфейсами\n- DataStore\n- RemoteEvents\n- И многим другим!";
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
    setTimeout(() => cache.delete(hash), 3600000); // 1 час
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
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
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
                <button class="action-btn copy-msg" onclick="copyMessage(this)">
                    <i class="far fa-copy"></i>
                </button>
                <button class="action-btn favorite" onclick="toggleFavorite(this)">
                    <i class="far fa-star"></i>
                </button>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Подсвечиваем синтаксис
    messageDiv.querySelectorAll('pre code
