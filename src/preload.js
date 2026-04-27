const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    authenticate: (username, password, mode) => ipcRenderer.invoke('authenticate', { username, password, mode }),
    toggleAuthMode: () => ipcRenderer.send('toggle-auth-mode'),
    onAuthModeChange: (callback) => ipcRenderer.on('auth-mode-changed', (event, mode) => callback(mode)),
    
    // User
    logout: () => ipcRenderer.send('logout'),
    onUserInfo: (callback) => ipcRenderer.on('user-info', (event, info) => callback(info)),
    
    // Game
    updateRam: (ram) => ipcRenderer.send('update-ram', ram),
    updateVersion: (version) => ipcRenderer.send('update-version', version),
    launchGame: () => ipcRenderer.send('launch-game'),
    onProgress: (callback) => ipcRenderer.on('launch-progress', (event, percent, message) => callback(percent, message)),
    onGameLaunch: (callback) => ipcRenderer.on('game-launch-result', (event, result) => callback(result)),
    
    // Profile
    openProfile: () => ipcRenderer.send('open-profile'),
    uploadSkin: (skinData) => ipcRenderer.invoke('upload-skin', skinData),
    saveProfile: (skinData) => ipcRenderer.invoke('save-profile', skinData),
    goBack: () => ipcRenderer.send('go-back'),
    deleteAccount: () => ipcRenderer.send('delete-account'),
    
    // Utils
    getPlatform: () => ipcRenderer.invoke('get-platform')
});

console.log('✅ Preload loaded');
