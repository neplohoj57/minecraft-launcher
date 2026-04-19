const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

class AppUpdater {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        
        // Настройка логирования
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        
        // Автоматическая загрузка обновлений
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        
        this.setupEvents();
        
        // Проверка обновлений через 10 секунд после запуска
        setTimeout(() => {
            this.checkForUpdates();
        }, 10000);
        
        console.log('✅ Updater инициализирован');
    }

    setupEvents() {
        autoUpdater.on('checking-for-update', () => {
            console.log('🔍 Проверка обновлений...');
            this.sendToRenderer('update-checking');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('✅ Доступно обновление:', info.version);
            this.sendToRenderer('update-available', info.version);
        });

        autoUpdater.on('update-not-available', () => {
            console.log('✅ Обновлений нет');
            this.sendToRenderer('update-not-available');
        });

        autoUpdater.on('error', (err) => {
            console.error('❌ Ошибка обновления:', err);
            this.sendToRenderer('update-error', err.message);
        });

        autoUpdater.on('download-progress', (progress) => {
            const percent = Math.round(progress.percent);
            console.log(`📥 Загрузка: ${percent}%`);
            this.sendToRenderer('update-progress', percent);
        });

        autoUpdater.on('update-downloaded', (info) => {
            console.log('✅ Обновление загружено:', info.version);
            this.sendToRenderer('update-downloaded', info.version);
            
            // Установка через 5 секунд
            setTimeout(() => {
                autoUpdater.quitAndInstall();
            }, 5000);
        });
    }

    checkForUpdates() {
        console.log('🔍 Ручная проверка обновлений');
        autoUpdater.checkForUpdatesAndNotify();
    }

    sendToRenderer(channel, data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
        }
    }
}

module.exports = AppUpdater;