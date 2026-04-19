process.noDeprecation = true;

const CloudSync = require('./src/cloud-sync');
const cloudSync = new CloudSync();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const UserDatabase = require('./src/database');
const SkinInstaller = require('./src/skin-installer');
const skinInstaller = new SkinInstaller();
const AppUpdater = require('./src/updater');
let updater;

// Инициализация
const store = new Store();
const db = new UserDatabase();

let mainWindow;
let authWindow;
let profileWindow;

// Создаём окно авторизации
function createAuthWindow() {
    authWindow = new BrowserWindow({
        width: 500,
        height: 850,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#1a1a1a',
        icon: path.join(__dirname, 'build/icon.ico'),
        title: 'Вход - Minecraft Launcher',
        autoHideMenuBar: true
    });

    authWindow.loadFile(path.join(__dirname, 'src/auth.html'));

    authWindow.on('closed', () => {
        authWindow = null;
        if (!mainWindow) {
            app.quit();
        }
    });
}

// Создаём главное окно
function createMainWindow(user) {
    mainWindow = new BrowserWindow({
        width: 950,
        height: 700,
        minWidth: 900,
        minHeight: 650,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        resizable: true,
        backgroundColor: '#1a1a1a',
        icon: path.join(__dirname, 'build/icon.ico'),
        title: 'Minecraft Launcher',
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

    // Инициализация автообновления
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('user-data', user);
        
        // Проверка обновлений через 3 секунды после загрузки
        setTimeout(() => {
            if (!updater) {
                updater = new AppUpdater(mainWindow);
                updater.checkForUpdates();
            }
        }, 3000);
    });

    // Передаём данные пользователя в окно
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('user-data', user);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Закрываем окно авторизации
    if (authWindow) {
        authWindow.close();
    }
}

// Создаём окно профиля
function createProfileWindow() {
    if (profileWindow) {
        profileWindow.focus();
        return;
    }

    const userId = store.get('userId');
    const user = db.getUserById(userId);

    if (!user) {
        console.error('❌ Пользователь не найден');
        return;
    }

    profileWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 900,
        minHeight: 650,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#1a1a1a',
        icon: path.join(__dirname, 'build/icon.ico'),
        title: 'Профиль - Minecraft Launcher',
        autoHideMenuBar: true,
        parent: mainWindow
    });

    profileWindow.loadFile(path.join(__dirname, 'src/profile.html'));

    profileWindow.webContents.on('did-finish-load', () => {
        profileWindow.webContents.send('profile-data', user);
    });

    profileWindow.on('closed', () => {
        profileWindow = null;
    });
}

// Создаём окно облачных настроек
function createCloudWindow() {
    const cloudWindow = new BrowserWindow({
        width: 550,
        height: 700,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: '#667eea',
        icon: path.join(__dirname, 'build/icon.ico'),
        title: 'Облачная синхронизация',
        autoHideMenuBar: true,
        parent: mainWindow,
        modal: true
    });

    cloudWindow.loadFile(path.join(__dirname, 'src/cloud.html'));
}

// Запуск приложения
app.whenReady().then(() => {
    const savedUserId = store.get('userId');
    
    if (savedUserId) {
        const user = db.getUserById(savedUserId);
        if (user) {
            console.log('✅ Автоматический вход:', user.username);
            createMainWindow(user);
            return;
        }
    }

    createAuthWindow();
});

// ============= IPC ОБРАБОТЧИКИ =============

// Открыть окно облака
ipcMain.on('open-cloud', () => {
    console.log('☁️ Открытие настроек облака');
    createCloudWindow();
});

// Облачная синхронизация
ipcMain.handle('cloud-upload', async () => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    const data = cloudSync.getLocalData();
    return await cloudSync.uploadData(userId, data);
});

ipcMain.handle('cloud-download', async () => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    const result = await cloudSync.downloadData(userId);
    if (result.success) {
        cloudSync.applyCloudData(result.data);
    }
    return result;
});

ipcMain.handle('cloud-toggle-auto', async (event, enabled) => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    if (enabled) {
        cloudSync.startAutoSync(userId, () => cloudSync.getLocalData());
        return { success: true, message: 'Автосинхронизация включена' };
    } else {
        cloudSync.stopAutoSync();
        return { success: true, message: 'Автосинхронизация отключена' };
    }
});

// Регистрация
ipcMain.handle('register', async (event, { username, email, password }) => {
    console.log('📝 Попытка регистрации:', username);
    return db.registerUser(username, email, password);
});

// Вход
ipcMain.handle('login', async (event, { username, password }) => {
    console.log('🔐 Попытка входа:', username);
    const result = db.loginUser(username, password);
    
    if (result.success) {
        store.set('userId', result.user.id);
        store.set('username', result.user.username);
    }
    
    return result;
});

// Успешная авторизация
ipcMain.on('auth-success', (event, user) => {
    console.log('✅ Вход выполнен:', user.username);
    createMainWindow(user);
});

// Офлайн режим
ipcMain.on('offline-mode', () => {
    console.log('🎮 Офлайн режим');
    createMainWindow({
        username: 'Steve',
        email: null,
        avatar: 'steve',
        customSkin: null,
        offline: true,
        stats: { launches: 0, playtime: 0, last_version: null }
    });
});

// Выход из аккаунта
ipcMain.on('logout', () => {
    console.log('👋 Выход из аккаунта');
    store.delete('userId');
    store.delete('username');
    
    if (mainWindow) {
        mainWindow.close();
    }
    
    if (profileWindow) {
        profileWindow.close();
    }
    
    createAuthWindow();
});

// Получить текущего пользователя
ipcMain.handle('get-current-user', () => {
    const userId = store.get('userId');
    if (userId) {
        return db.getUserById(userId);
    }
    return null;
});

// Открыть профиль
ipcMain.on('open-profile', () => {
    console.log('👤 Открытие профиля');
    createProfileWindow();
});

// Закрыть профиль
ipcMain.on('close-profile', () => {
    if (profileWindow) {
        profileWindow.close();
    }
    
    // Обновляем данные в главном окне
    if (mainWindow) {
        const userId = store.get('userId');
        const user = db.getUserById(userId);
        if (user) {
            mainWindow.webContents.send('user-data', user);
        }
    }
});

// Обновить аватар
ipcMain.handle('update-avatar', async (event, avatar) => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    console.log('🎨 Обновление аватара:', avatar);
    return db.updateAvatar(userId, avatar);
});

// Обновить email
ipcMain.handle('update-email', async (event, newEmail) => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    console.log('📧 Обновление email');
    return db.updateEmail(userId, newEmail);
});

// Сменить пароль
ipcMain.handle('change-password', async (event, { oldPassword, newPassword }) => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    console.log('🔒 Смена пароля');
    return db.changePassword(userId, oldPassword, newPassword);
});

// Увеличить счётчик запусков
ipcMain.on('increment-launches', (event, version) => {
    const userId = store.get('userId');
    if (userId) {
        db.incrementLaunches(userId, version);
    }
});

// Добавить время игры
ipcMain.on('add-playtime', (event, minutes) => {
    const userId = store.get('userId');
    if (userId) {
        db.addPlaytime(userId, minutes);
    }
});

// НОВОЕ: Сохранить кастомный скин
ipcMain.handle('save-custom-skin', async (event, skinData) => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    console.log('🎨 Сохранение кастомного скина');
    return db.saveCustomSkin(userId, skinData);
});

// НОВОЕ: Удалить кастомный скин
ipcMain.handle('remove-custom-skin', async () => {
    const userId = store.get('userId');
    if (!userId) {
        return { success: false, error: 'Не авторизован' };
    }
    
    console.log('🗑️ Удаление кастомного скина');
    return db.removeCustomSkin(userId);
});

// Установить скин в Minecraft
ipcMain.handle('install-skin', async (event, skinPath, username) => {
    console.log('🎨 Установка скина в Minecraft');
    const result = skinInstaller.installSkin(skinPath, username);
    if (result.success) {
        skinInstaller.createSkinConfig(username, result.path);
    }
    return result;
});

// Ручная проверка обновлений
ipcMain.on('check-updates', () => {
    if (updater) {
        updater.checkForUpdates();
    }
});

// Закрытие приложения
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        db.close();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const savedUserId = store.get('userId');
        if (savedUserId) {
            const user = db.getUserById(savedUserId);
            if (user) {
                createMainWindow(user);
            } else {
                createAuthWindow();
            }
        } else {
            createAuthWindow();
        }
    }
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('❌ Критическая ошибка:', error);
});