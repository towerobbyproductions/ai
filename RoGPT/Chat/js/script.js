// Конфигурация
const CONFIG = {
    // ЗАМЕНИ ЭТОТ URL на твой реальный Google Apps Script URL
    API_URL: 'https://script.google.com/macros/s/AKfycbxUrCC-a18KuKxh5LdMYuB-G_VF1cX7RRA7sbdoq1OAQPXNxenwQgPopyULmZTgG4AP/exec',
    USE_REAL_API: true, // Включаем реальный API
    MAX_HISTORY: 50
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
    loadState();
    setupEventListeners();
    checkAPIStatus();
});

// Проверка API статуса
async function checkAPIStatus() {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: "test",
                system: "test"
            })
        });
        
        if (response.ok) {
            showNotification('✅ API подключен', 'success');
        } else {
            showNotification('⚠️ API не отвечает, используем локальный режим', 'warning');
        }
    } catch (error) {
        console.error('API check failed:', error);
        showNotification('⚠️ Режим офлайн: используются локальные ответы', 'warning');
    }
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
        // Получаем ответ от реального AI
        console.log('Получение ответа от AI...');
        const response = await getAIResponse(message);
        console.log('Ответ получен');
        
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
        addMessage('❌ Извините, произошла ошибка при подключении к AI. Пожалуйста, проверьте настройки API.', 'bot');
    } finally {
        state.isTyping = false;
    }
}

// Получение ответа от AI
async function getAIResponse(message) {
    // Проверяем кэш
    const cached = checkCache(message);
    if (cached) return cached;
    
    // Системный промпт для Roblox эксперта
    const systemPrompt = `Ты RoGPT - эксперт по Roblox Studio и Lua программированию с многолетним опытом.

ВАЖНЫЕ ПРАВИЛА:
1. Всегда давай ПОЛНЫЕ, РАБОЧИЕ примеры кода
2. Код должен быть готов к копипасте в Roblox Studio
3. Объясняй сложные концепции простым языком
4. Предупреждай о частых ошибках
5. Предлагай оптимизации и лучшие практики

ФОРМАТ ОТВЕТА:
- Краткое объяснение (2-3 предложения)
- Полный код с комментариями в формате:
\`\`\`lua
-- Код здесь
\`\`\`
- Важные замечания и советы

Ты НЕ должен:
- Отвечать шаблонно
- Говорить "напиши конкретнее"
- Отказываться от помощи
- Давать неполные ответы

Всегда помогай с любой просьбой о Roblox разработке!`;

    try {
        // Пытаемся получить ответ от Google Apps Script (который обращается к DeepSeek)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                system: systemPrompt
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (!data.response) {
            throw new Error('Пустой ответ от API');
        }
        
        // Кэшируем ответ
        cacheResponse(message, data.response);
        
        return data.response;
        
    } catch (error) {
        console.error('API Error:', error);
        
        if (error.name === 'AbortError') {
            throw new Error('Таймаут соединения с API');
        }
        
        // Если API не работает, используем расширенную локальную версию
        console.log('Using fallback local AI...');
        return getLocalAIResponse(message);
    }
}

// Улучшенная локальная AI система (на случай если API не работает)
function getLocalAIResponse(message) {
    const lowercaseMsg = message.toLowerCase();
    
    // База знаний по Roblox
    const knowledgeBase = {
        movement: {
            keywords: ['движение', 'walk', 'run', 'бег', 'ходьба', 'передвижение'],
            response: generateMovementScript(message)
        },
        door: {
            keywords: ['дверь', 'door', 'ворота', 'открытие'],
            response: generateDoorScript(message)
        },
        datastore: {
            keywords: ['datastore', 'сохранение', 'save', 'load', 'данные'],
            response: generateDataStoreScript(message)
        },
        remote: {
            keywords: ['remote', 'event', 'функция', 'клиент', 'сервер'],
            response: generateRemoteScript(message)
        },
        gui: {
            keywords: ['gui', 'интерфейс', 'меню', 'кнопка', 'ui'],
            response: generateGUIScript(message)
        },
        combat: {
            keywords: ['оружие', 'урон', 'здоровье', 'damage', 'combat', 'бой'],
            response: generateCombatScript(message)
        },
        vehicle: {
            keywords: ['машина', 'vehicle', 'транспорт', 'езда'],
            response: generateVehicleScript(message)
        },
        animation: {
            keywords: ['анимация', 'animation', 'движение'],
            response: generateAnimationScript(message)
        },
        shop: {
            keywords: ['магазин', 'shop', 'покупка', 'buy', 'продажа'],
            response: generateShopScript(message)
        }
    };
    
    // Ищем подходящий ответ
    for (let [key, value] of Object.entries(knowledgeBase)) {
        if (value.keywords.some(keyword => lowercaseMsg.includes(keyword))) {
            return value.response;
        }
    }
    
    // Если ничего не нашли, генерируем общий ответ
    return generateGeneralScript(message);
}

// Генераторы скриптов
function generateMovementScript(query) {
    return `Вот продвинутый скрипт для движения игрока с поддержкой бега, прыжков и приседаний:

\`\`\`lua
-- Продвинутая система движения
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

-- Настройки движения
local config = {
    walkSpeed = 16,
    runSpeed = 32,
    jumpPower = 50,
    crouchSpeed = 8,
    canRun = true,
    canCrouch = true,
    canDoubleJump = false
}

local isRunning = false
local isCrouching = false
local hasDoubleJumped = false

-- Обработка ввода
UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end
    
    -- Бег (Shift)
    if input.KeyCode == Enum.KeyCode.LeftShift and config.canRun then
        isRunning = true
        humanoid.WalkSpeed = config.runSpeed
    end
    
    -- Приседание (Ctrl)
    if input.KeyCode == Enum.KeyCode.LeftControl and config.canCrouch then
        isCrouching = true
        humanoid.WalkSpeed = config.crouchSpeed
        humanoid.HipHeight = 0.5
    end
    
    -- Двойной прыжок
    if input.KeyCode == Enum.KeyCode.Space and config.canDoubleJump then
        if humanoid:GetState() == Enum.HumanoidStateType.Jumping and not hasDoubleJumped then
            humanoid.Jump = true
            hasDoubleJumped = true
        end
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        isRunning = false
        if not isCrouching then
            humanoid.WalkSpeed = config.walkSpeed
        end
    end
    
    if input.KeyCode == Enum.KeyCode.LeftControl then
        isCrouching = false
        if not isRunning then
            humanoid.WalkSpeed = config.walkSpeed
        end
        humanoid.HipHeight = 2
    end
end)

-- Сброс двойного прыжка при касании земли
humanoid.StateChanged:Connect(function(oldState, newState)
    if newState == Enum.HumanoidStateType.Landed then
        hasDoubleJumped = false
    end
end)

-- Плавное ускорение/замедление
RunService.Heartbeat:Connect(function()
    -- Здесь можно добавить дополнительные эффекты
    -- Например, камеру тряску при беге
end)

print("✅ Система движения загружена!")
\`\`\`

**🔧 Дополнительные возможности:**
1. Добавь звуки шагов
2. Настрой анимации для бега/ходьбы
3. Добавь эффекты частиц при беге
4. Настрой усталость (stamina system)

**⚠️ Важно:**
- Скрипт должен быть в StarterPlayerScripts
- Убедись что у персонажа есть Humanoid
- Настрой параметры под свою игру`;
}

function generateDoorScript(query) {
    return `Вот интерактивная система дверей с анимацией и звуками:

\`\`\`lua
-- Продвинутая система дверей
-- Вставь этот скрипт в Part (дверь)

local door = script.Parent
local tweenService = game:GetService("TweenService")
local players = game:GetService("Players")

-- Настройки двери
local config = {
    openTime = 1.5,
    closeTime = 2,
    openDistance = 5,
    autoClose = true,
    autoCloseDelay = 4,
    swingDirection = "out", -- "in" или "out"
    swingAngle = 90 -- градусы
}

local isOpen = false
local isAnimating = false
local doorHinge = door:FindFirstChild("Hinge") or door

-- Рассчитываем углы открытия
local angle = math.rad(config.swingAngle)
local closedCFrame = doorHinge.CFrame
local openCFrame = doorHinge.CFrame * CFrame.Angles(0, 
    config.swingDirection == "out" and -angle or angle, 0)

local openTweenInfo = TweenInfo.new(
    config.openTime,
    Enum.EasingStyle.Quad,
    Enum.EasingDirection.Out
)

local closeTweenInfo = TweenInfo.new(
    config.closeTime,
    Enum.EasingStyle.Quad,
    Enum.EasingDirection.In
)

-- Функция открытия
function openDoor()
    if isOpen or isAnimating then return end
    
    isAnimating = true
    local tween = tweenService:Create(doorHinge, openTweenInfo, {CFrame = openCFrame})
    tween:Play()
    
    -- Звук открытия
    local sound = Instance.new("Sound")
    sound.SoundId = "rbxassetid://9120383631" -- Замени на свой звук
    sound.Parent = door
    sound:Play()
    
    tween.Completed:Connect(function()
        isOpen = true
        isAnimating = false
        
        if config.autoClose then
            task.wait(config.autoCloseDelay)
            closeDoor()
        end
    end)
end

-- Функция закрытия
function closeDoor()
    if not isOpen or isAnimating then return end
    
    isAnimating = true
    local tween = tweenService:Create(doorHinge, closeTweenInfo, {CFrame = closedCFrame})
    tween:Play()
    
    -- Звук закрытия
    local sound = Instance.new("Sound")
    sound.SoundId = "rbxassetid://9120383632" -- Замени на свой звук
    sound.Parent = door
    sound:Play()
    
    tween.Completed:Connect(function()
        isOpen = false
        isAnimating = false
    end)
end

-- Открытие при приближении
door.Touched:Connect(function(hit)
    local character = hit.Parent
    local humanoid = character:FindFirstChild("Humanoid")
    
    if humanoid then
        local player = players:GetPlayerFromCharacter(character)
        if player then
            openDoor()
        end
    end
end)

-- Можно также открывать по нажатию кнопки
local proximityPrompt = Instance.new("ProximityPrompt")
proximityPrompt.Parent = door
proximityPrompt.ActionText = "Открыть/Закрыть"
proximityPrompt.HoldDuration = 0
proximityPrompt.MaxActivationDistance = 10

proximityPrompt.Triggered:Connect(function(player)
    if isOpen then
        closeDoor()
    else
        openDoor()
    end
end)

print("✅ Система дверей загружена!")
\`\`\`

**🎨 Дополнительные идеи:**
1. Добавь подсветку двери при наведении
2. Сделай систему ключей
3. Добавь звуки скрипа
4. Сделай анимацию ручки двери

**⚠️ Важно:**
- Создай Hinge часть внутри двери для вращения
- Настрой Anchored = true для всех частей
- Проверь коллизию двери со стенами`;
}

function generateDataStoreScript(query) {
    return `Вот полная система сохранения данных с автосохранением и обработкой ошибок:

\`\`\`lua
-- Продвинутая система DataStore
local DataStoreService = game:GetService("DataStoreService")
local players = game:GetService("Players")
local runService = game:GetService("RunService")

-- Настройки
local config = {
    autoSaveInterval = 60, -- секунды
    maxRetries = 3,
    saveOnExit = true,
    dataStoreName = "PlayerData_v2"
}

local dataStore = DataStoreService:GetDataStore(config.dataStoreName)

-- Шаблон данных игрока
local defaultPlayerData = {
    level = 1,
    experience = 0,
    coins = 100,
    gems = 0,
    inventory = {},
    achievements = {},
    settings = {
        volume = 50,
        graphics = "Auto"
    },
    lastSave = os.time()
}

-- Функция загрузки данных
function loadPlayerData(player)
    local success = false
    local data = nil
    local retries = 0
    
    while not success and retries < config.maxRetries do
        retries += 1
        
        -- Используем pcall для безопасной загрузки
        success, data = pcall(function()
            return dataStore:GetAsync(player.UserId)
        end)
        
        if not success then
            warn("⚠️ Ошибка загрузки данных (попытка " .. retries .. "):", data)
            task.wait(1) -- Ждем перед повторной попыткой
        end
    end
    
    -- Если загрузка не удалась, используем данные по умолчанию
    if not success or not data then
        warn("⚠️ Используются данные по умолчанию для", player.Name)
        data = table.clone(defaultPlayerData)
        data.joinedTime = os.time()
    end
    
    -- Создаем папку с данными
    local dataFolder = Instance.new("Folder")
    dataFolder.Name = "PlayerData"
    dataFolder.Parent = player
    
    -- Загружаем данные в объекты для удобного доступа
    for key, value in pairs(data) do
        if type(value) ~= "table" then
            local valueObject = Instance.new("NumberValue")
            valueObject.Name = key
            valueObject.Value = value
            valueObject.Parent = dataFolder
        else
            -- Для таблиц создаем папки
            local folder = Instance.new("Folder")
            folder.Name = key
            folder.Parent = dataFolder
            
            for subKey, subValue in pairs(value) do
                local subObject = Instance.new("NumberValue")
                subObject.Name = subKey
                subObject.Value = subValue
                subObject.Parent = folder
            end
        end
    end
    
    -- Добавляем метаданные
    dataFolder:SetAttribute("LoadedTime", os.time())
    dataFolder:SetAttribute("UserId", player.UserId)
    
    print("✅ Данные загружены для", player.Name)
    return dataFolder
end

-- Функция сохранения данных
function savePlayerData(player)
    local dataFolder = player:FindFirstChild("PlayerData")
    if not dataFolder then
        warn("⚠️ Нет данных для сохранения у", player.Name)
        return false
    end
    
    -- Собираем данные из папки
    local data = {
        inventory = {},
        settings = {}
    }
    
    for _, child in ipairs(dataFolder:GetChildren()) do
        if child:IsA("NumberValue") then
            data[child.Name] = child.Value
        elseif child:IsA("Folder") then
            data[child.Name] = {}
            for _, subChild in ipairs(child:GetChildren()) do
                if subChild:IsA("NumberValue") then
                    data[child.Name][subChild.Name] = subChild.Value
                end
            end
        end
    end
    
    -- Добавляем время сохранения
    data.lastSave = os.time()
    
    -- Сохраняем с обработкой ошибок
    local success, error = pcall(function()
        dataStore:SetAsync(player.UserId, data)
    end)
    
    if success then
        print("✅ Данные сохранены для", player.Name)
        dataFolder:SetAttribute("LastSaveTime", os.time())
        return true
    else
        warn("❌ Ошибка сохранения для", player.Name, ":", error)
        return false
    end
end

-- Автосохранение
function setupAutoSave()
    while true do
        task.wait(config.autoSaveInterval)
        
        for _, player in ipairs(players:GetPlayers()) do
            task.spawn(function()
                savePlayerData(player)
            end)
        end
        
        print("🔄 Автосохранение выполнено")
    end
end

-- Обработчики событий
players.PlayerAdded:Connect(function(player)
    local dataFolder = loadPlayerData(player)
    
    -- Можно добавить приветственное сообщение
    player:WaitForChild("PlayerGui").ChildAdded:Connect(function()
        local screenGui = Instance.new("ScreenGui")
        local welcomeMessage = Instance.new("TextLabel")
        
        welcomeMessage.Text = "Добро пожаловать, " .. player.Name .. "!"
        welcomeMessage.Size = UDim2.new(0, 300, 0, 50)
        welcomeMessage.Position = UDim2.new(0.5, -150, 0.2, 0)
        welcomeMessage.BackgroundColor3 = Color3.new(0, 0, 0)
        welcomeMessage.TextColor3 = Color3.new(1, 1, 1)
        welcomeMessage.FontSize = Enum.FontSize.Size24
        welcomeMessage.Parent = screenGui
        screenGui.Parent = player.PlayerGui
        
        task.wait(3)
        screenGui:Destroy()
    end)
end)

players.PlayerRemoving:Connect(function(player)
    if config.saveOnExit then
        savePlayerData(player)
    end
end)

-- Запускаем автосохранение
task.spawn(setupAutoSave)

print("✅ Система DataStore загружена!")

-- Утилиты для доступа к данным
function getPlayerData(player, key)
    local dataFolder = player:FindFirstChild("PlayerData")
    if not dataFolder then return nil end
    
    local valueObject = dataFolder:FindFirstChild(key)
    return valueObject and valueObject.Value
end

function setPlayerData(player, key, value)
    local dataFolder = player:FindFirstChild("PlayerData")
    if not dataFolder then return false end
    
    local valueObject = dataFolder:FindFirstChild(key)
    if valueObject and valueObject:IsA("NumberValue") then
        valueObject.Value = value
        return true
    end
    
    return false
end
\`\`\`

**💡 Полезные функции для использования:**

\`\`\`lua
-- В других скриптах можно использовать:
local Players = game:GetService("Players")

-- Получить данные игрока
local player = Players.LocalPlayer
local coins = getPlayerData(player, "coins")

-- Добавить монеты
setPlayerData(player, "coins", coins + 100)

-- Сохранить вручную
savePlayerData(player)
\`\`\`

**⚠️ Важные замечания:**
1. DataStore имеет лимиты - до 60 операций в минуту
2. Всегда используй pcall для защиты
3. Делай бэкапы данных
4. Тестируй в Studio перед публикацией
5. Учитывай региональные ограничения`;
}

function generateRemoteScript(query) {
    return `Вот полное руководство по RemoteEvents и RemoteFunctions:

\`\`\`lua
-- ==========================================
-- REMOTE EVENTS - ПОЛНОЕ РУКОВОДСТВО
-- ==========================================

-- 1. СОЗДАНИЕ В ReplicatedStorage
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Создаем папку для всех Remote объектов
local RemoteFolder = Instance.new("Folder")
RemoteFolder.Name = "Remotes"
RemoteFolder.Parent = ReplicatedStorage

-- Создаем RemoteEvent (односторонняя связь)
local chatEvent = Instance.new("RemoteEvent")
chatEvent.Name = "ChatMessage"
chatEvent.Parent = RemoteFolder

-- Создаем RemoteFunction (с возвратом значения)
local getDataFunction = Instance.new("RemoteFunction")
getDataFunction.Name = "GetPlayerData"
getDataFunction.Parent = RemoteFolder

-- ==========================================
-- 2. СЕРВЕРНЫЙ СКРИПТ (ServerScriptService)
-- ==========================================
local serverScript = [[
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local RemoteFolder = ReplicatedStorage:WaitForChild("Remotes")
local chatEvent = RemoteFolder:WaitForChild("ChatMessage")
local getDataFunction = RemoteFolder:WaitForChild("GetPlayerData")

-- Словарь с данными игроков (в реальном проекте используй DataStore)
local playerData = {}

-- Обработка входящих сообщений от клиентов
chatEvent.OnServerEvent:Connect(function(player, message)
    print(player.Name .. " написал: " .. message)
    
    -- Проверяем сообщение на спам
    if #message > 200 then
        message = message:sub(1, 200) .. "..."
    end
    
    -- Добавляем теги если есть
    if player:GetRankInGroup(123456) > 0 then
        message = "[ADMIN] " .. message
    end
    
    -- Отправляем всем игрокам
    chatEvent:FireAllClients(player.Name, message, os.time())
    
    -- Сохраняем в историю
    if not playerData[player] then
        playerData[player] = {messages = {}}
    end
    table.insert(playerData[player].messages, {message = message, time = os.time()})
    
    -- Ограничиваем историю
    if #playerData[player].messages > 50 then
        table.remove(playerData[player].messages, 1)
    end
end)

-- Обработка запросов данных от клиентов
getDataFunction.OnServerInvoke = function(player, dataType)
    print(player.Name .. " запросил данные: " .. dataType)
    
    if dataType == "messages" then
        -- Возвращаем историю сообщений игрока
        return playerData[player] and playerData[player].messages or {}
        
    elseif dataType == "playerInfo" then
        -- Возвращаем информацию об игроке
        return {
            name = player.Name,
            userId = player.UserId,
            accountAge = player.AccountAge,
            membershipType = player.MembershipType
        }
        
    elseif dataType == "serverTime" then
        return os.time()
    end
    
    return nil
end

-- Отправка системных сообщений
function broadcastSystemMessage(message)
    chatEvent:FireAllClients("Система", message, os.time())
end

-- Пример использования
task.wait(5)
broadcastSystemMessage("Добро пожаловать на сервер!")

print("✅ Серверные Remote скрипты загружены")
]]

-- ==========================================
-- 3. КЛИЕНТСКИЙ СКРИПТ (StarterPlayerScripts)
-- ==========================================
local clientScript = [[
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local RemoteFolder = ReplicatedStorage:WaitForChild("Remotes")
local chatEvent = RemoteFolder:WaitForChild("ChatMessage")
local getDataFunction = RemoteFolder:WaitForChild("GetPlayerData")

-- Создаем интерфейс чата
local screenGui = Instance.new("ScreenGui")
screenGui.Parent = player:WaitForChild("PlayerGui")

local chatFrame = Instance.new("Frame")
chatFrame.Size = UDim2.new(0, 400, 0, 300)
chatFrame.Position = UDim2.new(0, 10, 0.5, -150)
chatFrame.BackgroundColor3 = Color3.new(0, 0, 0)
chatFrame.BackgroundTransparency = 0.5
chatFrame.Parent = screenGui

local chatBox = Instance.new("ScrollingFrame")
chatBox.Size = UDim2.new(1, 0, 0.8, 0)
chatBox.BackgroundColor3 = Color3.new(1, 1, 1)
chatBox.BackgroundTransparency = 0.9
chatBox.Parent = chatFrame

local messageList = Instance.new("UIListLayout")
messageList.Parent = chatBox
messageList.SortOrder = Enum.SortOrder.LayoutOrder

local inputFrame = Instance.new("Frame")
inputFrame.Size = UDim2.new(1, 0, 0.2, 0)
inputFrame.Position = UDim2.new(0, 0, 0.8, 0)
inputFrame.BackgroundColor3 = Color3.new(0.2, 0.2, 0.2)
inputFrame.Parent = chatFrame

local textBox = Instance.new("TextBox")
textBox.Size = UDim2.new(0.8, 0, 1, 0)
textBox.Position = UDim2.new(0, 0, 0, 0)
textBox.BackgroundColor3 = Color3.new(0.1, 0.1, 0.1)
textBox.TextColor3 = Color3.new(1, 1, 1)
textBox.PlaceholderText = "Введите сообщение..."
textBox.ClearTextOnFocus = false
textBox.Parent = inputFrame

local sendButton = Instance.new("TextButton")
sendButton.Size = UDim2.new(0.2, 0, 1, 0)
sendButton.Position = UDim2.new(0.8, 0, 0, 0)
sendButton.Text = "→"
sendButton.BackgroundColor3 = Color3.new(0.3, 0.6, 1)
sendButton.Parent = inputFrame

-- Функция добавления сообщения в чат
function addChatMessage(sender, message, timestamp)
    local messageLabel = Instance.new("TextLabel")
    messageLabel.Size = UDim2.new(1, 0, 0, 30)
    messageLabel.BackgroundTransparency = 1
    messageLabel.TextColor3 = sender == "Система" and Color3.new(1, 1, 0) or Color3.new(1, 1, 1)
    messageLabel.TextXAlignment = Enum.TextXAlignment.Left
    messageLabel.RichText = true
    
    local timeString = os.date("%H:%M", timestamp or os.time())
    messageLabel.Text = string.format("[%s] %s: %s", timeString, sender, message)
    
    messageLabel.Parent = chatBox
    task.wait()
    chatBox.CanvasPosition = Vector2.new(0, chatBox.CanvasSize.Y.Offset)
end

-- Отправка сообщения
function sendMessage()
    local message = textBox.Text:gsub("%s+$", "")
    if #message > 0 then
        chatEvent:FireServer(message)
        textBox.Text = ""
    end
end

sendButton.MouseButton1Click:Connect(sendMessage)
textBox.FocusLost:Connect(function(enterPressed)
    if enterPressed then
        sendMessage()
    end
end)

-- Получение сообщений от сервера
chatEvent.OnClientEvent:Connect(function(sender, message, timestamp)
    addChatMessage(sender, message, timestamp)
end)

-- Получение данных с сервера
local playerInfo = getDataFunction:InvokeServer("playerInfo")
print("Информация об игроке:", playerInfo)

local messages = getDataFunction:InvokeServer("messages")
for _, msg in ipairs(messages) do
    addChatMessage("История", msg.message, msg.time)
end

-- Горячие клавиши
UserInputService.InputBegan:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.Slash and not textBox:IsFocused() then
        textBox:CaptureFocus()
    end
end)

print("✅ Клиентские Remote скрипты загружены")
]]

-- ==========================================
-- 4. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ==========================================

-- Пример 1: Торговая система
local tradeExample = [[
-- RemoteEvent для торговли
local tradeEvent = Instance.new("RemoteEvent")
tradeEvent.Name = "TradeRequest"
tradeEvent.Parent = RemoteFolder

-- Сервер
tradeEvent.OnServerEvent:Connect(function(player, targetPlayer, offer)
    -- Проверяем, что игроки существуют
    if not targetPlayer or not offer then return end
    
    -- Проверяем предметы
    if validateItems(player, offer) then
        -- Отправляем запрос целевому игроку
        tradeEvent:FireClient(targetPlayer, "request", player, offer)
    end
end)

-- Клиент
local tradeEvent = RemoteFolder:WaitForChild("TradeRequest")
tradeEvent.OnClientEvent:Connect(function(type, player, data)
    if type == "request" then
        -- Показываем диалог принятия/отказа
        showTradeDialog(player, data)
    elseif type == "accepted" then
        -- Обмениваем предметы
        exchangeItems(player, data)
    end
end)
]]

-- Пример 2: Система лидерборда
local leaderboardExample = [[
-- RemoteFunction для получения топ-игроков
local getLeaderboard = Instance.new("RemoteFunction")
getLeaderboard.Name = "GetLeaderboard"
getLeaderboard.Parent = RemoteFolder

-- Сервер
getLeaderboard.OnServerInvoke = function(player, count)
    count = math.min(count or 10, 100)
    local topPlayers = {}
    
    -- Сортируем игроков по уровню
    for _, p in ipairs(Players:GetPlayers()) do
        local level = getPlayerData(p, "level") or 1
        table.insert(topPlayers, {
            name = p.Name,
            level = level,
            userId = p.UserId
        })
    end
    
    table.sort(topPlayers, function(a, b)
        return a.level > b.level
    end)
    
    return {unpack(topPlayers, 1, count)}
end

-- Клиент
local leaderboard = getLeaderboard:InvokeServer(10)
for i, playerData in ipairs(leaderboard) do
    print(i .. ". " .. playerData.name .. " - Уровень " .. playerData.level)
end
]]

-- ==========================================
-- 5. ЛУЧШИЕ ПРАКТИКИ И ЗАЩИТА
-- ==========================================

local securityExample = [[
-- Защита от спама
local rateLimits = {}

chatEvent.OnServerEvent:Connect(function(player, message)
    local now = os.time()
    local lastMessage = rateLimits[player] or 0
    
    if now - lastMessage < 2 then
        -- Слишком часто
        return
    end
    
    rateLimits[player] = now
    
    -- Проверка на плохие слова
    if containsProfanity(message) then
        player:Kick("Неприемлемое поведение")
        return
    end
    
    -- Разрешенные теги
    local allowedTags = {"[ADMIN]", "[VIP]"}
    for _, tag in ipairs(allowedTags) do
        if message:find(tag) and not player:GetRankInGroup(123456) > 0 then
            message = message:gsub(tag, "")
        end
    end
    
    -- Обработка сообщения
    processMessage(player, message)
end)
]]

print("✅ RemoteEvents руководство загружено!")
\`\`\`

**📚 Ключевые концепции:**

1. **RemoteEvent** - односторонняя связь (fire)
2. **RemoteFunction** - двухсторонняя связь (invoke)
3. **UnreliableRemoteEvent** - для некритичных данных

**⚠️ Важные правила безопасности:**

- Никогда не доверяй клиенту
- Всегда проверяй данные на сервере
- Используй rate limiting
- Не передавай большие объемы данных
- Защищай от инъекций

**🚀 Оптимизация:**

- Группируй данные в одну отправку
- Используй битовые операции для флагов
- Кэшируй часто запрашиваемые данные`;
}

function generateGeneralScript(query) {
    return `Отличный запрос! Вот универсальный шаблон скрипта, который можно адаптировать под твои нужды:

\`\`\`lua
-- Универсальный скрипт для Roblox
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

-- Настройки
local config = {
    enabled = true,
    debug = true,
    version = "1.0.0"
}

-- Главная функция
function initialize()
    print("✅ Скрипт инициализирован, версия " .. config.version)
    
    -- Подключаем обработчики событий
    setupEventHandlers()
    
    if config.debug then
        print("🔧 Режим отладки включен")
    end
end

-- Обработчики событий
function setupEventHandlers()
    -- Игрок присоединился
    Players.PlayerAdded:Connect(function(player)
        if config.debug then
            print("Игрок присоединился:", player.Name)
        end
        onPlayerJoin(player)
    end)
    
    -- Игрок покинул
    Players.PlayerRemoving:Connect(function(player)
        if config.debug then
            print("Игрок покинул:", player.Name)
        end
        onPlayerLeave(player)
    end)
end

-- При присоединении игрока
function onPlayerJoin(player)
    -- Ждем загрузки персонажа
    player.CharacterAdded:Connect(function(character)
        task.wait(1) -- Даем время на загрузку
        onCharacterAdded(player, character)
    end)
    
    -- Если персонаж уже загружен
    if player.Character then
        onCharacterAdded(player, player.Character)
    end
end

-- При загрузке персонажа
function onCharacterAdded(player, character)
    local humanoid = character:WaitForChild("Humanoid")
    
    if config.debug then
        print("Персонаж загружен для", player.Name)
    end
    
    -- Добавляем скрипты в персонажа
    addScriptsToCharacter(character)
end

-- Добавление скриптов
function addScriptsToCharacter(character)
    -- Пример: добавляем скрипт движения
    local movementScript = Instance.new("Script")
    movementScript.Name = "MovementHandler"
    movementScript.Source = [[
        local player = script.Parent.Parent
        local humanoid = script.Parent.Humanoid
        
        -- Настройки движения
        humanoid.WalkSpeed = 16
        humanoid.JumpPower = 50
        
        print("Скрипт движения загружен для", player.Name)
    ]]
    movementScript.Parent = character
end

-- При покидании игрока
function onPlayerLeave(player)
    if config.debug then
        print("Очистка данных для", player.Name)
    end
    -- Здесь можно сохранять данные
end

-- Запуск
initialize()

-- Периодическое обновление
while config.enabled do
    task.wait(60) -- Каждую минуту
    
    if config.debug then
        print("🔄 Сердцебиение скрипта")
        print("Активных игроков:", #Players:GetPlayers())
    end
end
\`\`\`

**🔧 Как адаптировать скрипт:**

1. Измени `config` под свои нужды
2. Добавь свою логику в `onPlayerJoin`
3. Настрой периодичность обновлений
4. Добавь сохранение данных

**📝 Что именно ты хочешь создать?**
Я могу сгенерировать конкретный скрипт для:
- PvP арены
- RPG системы
- Паркур карты
- Экономической системы
- И многого другого!

Просто опиши подробнее свою идею! 🚀`;
}

// Остальные функции (кэширование, добавление сообщений, и т.д.) остаются такими же как в предыдущем ответе
// ... (весь остальной код из предыдущего ответа)
