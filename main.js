const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

const UserDatabase = require('./src/database');
const userDB = new UserDatabase();

const MinecraftLauncher = require('./src/launcher');
const AppUpdater = require('./src/updater');

// Установка кодировки консоли
if (process.platform === 'win32') {
    process.stdout.setDefaultEncoding('utf8');
}

let mainWindow;
let authWindow;
let profileWindow;
let updater;

// ==================== ФУНКЦИИ ОКОН ====================

function checkAuth() {
    const userId = store.get('userId');
    return userId ? userDB.getUserById(userId) : null;
}

function createAuthWindow() {
    authWindow = new BrowserWindow({
        width: 450,
        height: 600,
        resizable: false,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'build/icon.ico')
    });

    authWindow.loadFile('src/auth.html');
    authWindow.setMenuBarVisibility(false);

    authWindow.on('closed', () => {
        authWindow = null;
        if (!checkAuth()) {
            app.quit();
        }
    });

    console.log('✅ Окно авторизации создано');
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        minWidth: 900,
        minHeight: 600,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'build/icon.ico')
    });

    mainWindow.loadFile('src/index.html');
    mainWindow.setMenuBarVisibility(false);

    // Инициализация автообновления
    updater = new AppUpdater(mainWindow);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    console.log('✅ Главное окно создано');
}

function createProfileWindow() {
    if (profileWindow) {
        profileWindow.focus();
        return;
    }

    profileWindow = new BrowserWindow({
        width: 500,
        height: 650,
        resizable: false,
        parent: mainWindow,
        modal: true,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'build/icon.ico')
    });

    profileWindow.loadFile('src/profile.html');
    profileWindow.setMenuBarVisibility(false);

    profileWindow.on('closed', () => {
        profileWindow = null;
    });

    console.log('✅ Окно профиля создано');
}

// ==================== IPC ОБРАБОТЧИКИ ====================

// Авторизация
ipcMain.handle('auth-login', async (event, data) => {
    console.log('🔐 Вход:', data.nickname);
    const result = userDB.login(data.nickname, data.password);
    
    if (result.success) {
        store.set('userId', result.user.id);
        store.set('userNickname', result.user.nickname);
        
        if (authWindow) authWindow.close();
        createMainWindow();
    }
    
    return result;
});

ipcMain.handle('auth-register', async (event, data) => {
    console.log('📝 Регистрация:', data.nickname);
    return userDB.register(data.nickname, data.email, data.password);
});

// Пользователь
ipcMain.handle('get-user', async () => {
    const userId = store.get('userId');
    if (!userId) return { success: false, error: 'Не авторизован' };
    
    const user = userDB.getUserById(userId);
    return user ? { success: true, user } : { success: false, error: 'Не найден' };
});

ipcMain.on('open-profile', () => {
    console.log('👤 Открытие профиля');
    createProfileWindow();
});

ipcMain.handle('update-avatar', async (event, avatar) => {
    const userId = store.get('userId');
    if (!userId) return { success: false, error: 'Не авторизован' };
    
    const result = userDB.updateAvatar(userId, avatar);
    if (result.success && mainWindow) {
        mainWindow.webContents.send('user-updated', result.user);
    }
    return result;
});

ipcMain.handle('upload-custom-skin', async (event, skinData) => {
    const userId = store.get('userId');
    if (!userId) return { success: false, error: 'Не авторизован' };
    
    const result = userDB.uploadCustomSkin(userId, skinData);
    if (result.success && mainWindow) {
        const user = userDB.getUserById(userId);
        mainWindow.webContents.send('user-updated', user);
    }
    return result;
});

ipcMain.handle('get-custom-skin', async () => {
    const userId = store.get('userId');
    return userId ? userDB.getCustomSkin(userId) : null;
});

ipcMain.handle('delete-custom-skin', async () => {
    const userId = store.get('userId');
    if (!userId) return { success: false, error: 'Не авторизован' };
    
    const result = userDB.deleteCustomSkin(userId);
    if (result.success && mainWindow) {
        const user = userDB.getUserById(userId);
        mainWindow.webContents.send('user-updated', user);
    }
    return result;
});

ipcMain.on('logout', () => {
    console.log('🚪 Выход');
    store.delete('userId');
    store.delete('userNickname');
    
    if (profileWindow) profileWindow.close();
    if (mainWindow) mainWindow.close();
    
    createAuthWindow();
});

// Minecraft
ipcMain.handle('launch-minecraft', async (event, version) => {
    console.log('🚀 Запуск Minecraft:', version);
    
    const userId = store.get('userId');
    const user = userDB.getUserById(userId);
    
    if (!user) return { success: false, error: 'Не авторизован' };
    
    try {
        const launcher = new MinecraftLauncher();
        return await launcher.launch(version, user.nickname);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-versions', async () => {
    try {
        const launcher = new MinecraftLauncher();
        return await launcher.getVersions();
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Обновления
ipcMain.on('check-for-updates', () => {
    console.log('🔍 Ручная проверка обновлений');
    if (updater) updater.checkForUpdates();
});

// Утилиты
ipcMain.handle('show-open-dialog', async (event, options) => {
    return await dialog.showOpenDialog(options);
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// ==================== ЗАПУСК ====================

app.whenReady().then(() => {
    console.log('🚀 Приложение запущено');
    console.log('📂 Путь:', app.getPath('userData'));
    
    const user = checkAuth();
    
    if (user) {
        console.log('✅ Авторизован:', user.nickname);
        createMainWindow();
    } else {
        console.log('❌ Не авторизован');
        createAuthWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            checkAuth() ? createMainWindow() : createAuthWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    console.error('💥 Критическая ошибка:', error);
    dialog.showErrorBox('Ошибка', error.message);
    app.quit();
});

console.log('✅ Main.js загружен');