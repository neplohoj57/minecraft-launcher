const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

const UserDatabase = require('./src/database');
const userDB = new UserDatabase();

const MinecraftLauncher = require('./src/launcher');
const AppUpdater = require('./src/updater');

let mainWindow;
let authWindow;
let profileWindow;
let updater;
let currentAuthMode = 'login';
let settings = { ram: 4, version: '1.20.4' };

// ==================== ОКНА ====================

function createAuthWindow() {
    if (authWindow) return;
    
    authWindow = new BrowserWindow({
        width: 450,
        height: 650,
        resizable: false,
        frame: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src/preload.js')
        },
        icon: path.join(__dirname, 'build/icon.ico')
    });

    authWindow.loadFile('src/auth.html');
    authWindow.setMenuBarVisibility(false);
    
    authWindow.webContents.on('did-finish-load', () => {
        authWindow.webContents.send('auth-mode-changed', currentAuthMode);
    });

    authWindow.on('closed', () => {
        authWindow = null;
    });
}

function createMainWindow() {
    if (mainWindow) return;
    
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 900,
        minHeight: 600,
        frame: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src/preload.js')
        },
        icon: path.join(__dirname, 'build/icon.ico')
    });

    mainWindow.loadFile('src/index.html');
    mainWindow.setMenuBarVisibility(false);

    updater = new AppUpdater(mainWindow);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // Отправляем инфо о пользователе
    const userId = store.get('userId');
    if (userId) {
        const user = userDB.getUserById(userId);
        if (user) {
            setTimeout(() => {
                mainWindow.webContents.send('user-info', {
                    username: user.nickname,
                    id: user.id,
                    skin: user.customSkin,
                    gamesPlayed: user.gamesPlayed || 0,
                    playTime: user.playTime || 0
                });
            }, 500);
        }
    }
}

function createProfileWindow() {
    if (profileWindow) {
        profileWindow.focus();
        return;
    }

    profileWindow = new BrowserWindow({
        width: 500,
        height: 700,
        resizable: false,
        parent: mainWindow,
        modal: true,
        frame: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src/preload.js')
        }
    });

    profileWindow.loadFile('src/profile.html');
    profileWindow.setMenuBarVisibility(false);

    const userId = store.get('userId');
    if (userId) {
        const user = userDB.getUserById(userId);
        if (user) {
            profileWindow.webContents.on('did-finish-load', () => {
                profileWindow.webContents.send('user-info', {
                    username: user.nickname,
                    id: user.id,
                    skin: user.customSkin,
                    gamesPlayed: user.gamesPlayed || 0,
                    playTime: user.playTime || 0
                });
            });
        }
    }

    profileWindow.on('closed', () => {
        profileWindow = null;
    });
}

// ==================== IPC ====================

ipcMain.on('toggle-auth-mode', () => {
    currentAuthMode = currentAuthMode === 'login' ? 'register' : 'login';
    if (authWindow) {
        authWindow.webContents.send('auth-mode-changed', currentAuthMode);
    }
});

ipcMain.handle('authenticate', async (event, { username, password, mode }) => {
    let result;
    
    if (mode === 'register') {
        result = userDB.register(username, username + '@example.com', password);
    } else {
        result = userDB.login(username, password);
    }

    if (result.success) {
        store.set('userId', result.user.id);
        store.set('userNickname', result.user.nickname);
        
        if (authWindow) authWindow.close();
        createMainWindow();
    }

    return result;
});

ipcMain.on('logout', () => {
    store.delete('userId');
    store.delete('userNickname');
    
    if (profileWindow) profileWindow.close();
    if (mainWindow) mainWindow.close();
    
    createAuthWindow();
});

ipcMain.on('update-ram', (event, ram) => {
    settings.ram = parseInt(ram);
    console.log('RAM:', settings.ram + 'GB');
});

ipcMain.on('update-version', (event, version) => {
    settings.version = version;
    console.log('Version:', version);
});

ipcMain.on('launch-game', async () => {
    const userId = store.get('userId');
    const user = userDB.getUserById(userId);

    if (!user || !mainWindow) {
        mainWindow?.webContents.send('game-launch-result', { success: false, message: 'Не авторизован' });
        return;
    }

    try {
        const launcher = new MinecraftLauncher();
        
        launcher.on('progress', (percent, message) => {
            mainWindow.webContents.send('launch-progress', percent, message);
        });

        const result = await launcher.launch(settings.version, user.nickname, settings.ram);
        
        if (result.success) {
            userDB.incrementGamesPlayed(user.id);
            mainWindow.webContents.send('game-launch-result', { success: true });
        } else {
            mainWindow.webContents.send('game-launch-result', { success: false, message: result.error });
        }
    } catch (error) {
        mainWindow.webContents.send('game-launch-result', { success: false, message: error.message });
    }
});

ipcMain.on('open-profile', () => {
    createProfileWindow();
});

ipcMain.on('go-back', () => {
    if (profileWindow) profileWindow.close();
});

ipcMain.handle('upload-skin', async (event, skinData) => {
    const userId = store.get('userId');
    if (!userId) return { success: false, message: 'Не авторизован' };

    const result = userDB.uploadCustomSkin(userId, skinData);
    
    if (result.success && mainWindow) {
        const user = userDB.getUserById(userId);
        mainWindow.webContents.send('user-info', {
            username: user.nickname,
            id: user.id,
            skin: user.customSkin,
            gamesPlayed: user.gamesPlayed || 0,
            playTime: user.playTime || 0
        });
    }
    
    return result;
});

ipcMain.handle('save-profile', async (event, skinData) => {
    const userId = store.get('userId');
    if (!userId) return { success: false };

    if (skinData) {
        await userDB.uploadCustomSkin(userId, skinData);
    }
    
    return { success: true };
});

ipcMain.on('delete-account', () => {
    const userId = store.get('userId');
    if (userId) {
        userDB.deleteUser(userId);
        store.delete('userId');
        store.delete('userNickname');
    }
    
    if (profileWindow) profileWindow.close();
    if (mainWindow) mainWindow.close();
    
    createAuthWindow();
});

ipcMain.handle('get-platform', () => {
    return process.platform === 'win32' ? 'Windows' : 
           process.platform === 'darwin' ? 'macOS' : 'Linux';
});

// ==================== ЗАПУСК ====================

app.whenReady().then(() => {
    const user = checkAuth();
    
    if (user) {
        createMainWindow();
    } else {
        createAuthWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            checkAuth() ? createMainWindow() : createAuthWindow();
        }
    });
});

function checkAuth() {
    const userId = store.get('userId');
    return userId ? userDB.getUserById(userId) : null;
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => {
    console.error('Critical error:', error);
    app.quit();
});
