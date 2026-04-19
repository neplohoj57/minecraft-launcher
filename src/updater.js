const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');
const log = require('electron-log');

class AppUpdater {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.setupLogger();
        this.setupUpdater();
    }

    setupLogger() {
        // Настройка логирования
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        log.info('Updater initialized');
    }

    setupUpdater() {
        // Настройки автообновления
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.allowDowngrade = false;
        autoUpdater.allowPrerelease = false;

        // Для тестирования (закомментируй в продакшене)
        // autoUpdater.forceDevUpdateConfig = true;

        // Проверка обновлений при запуске
        autoUpdater.on('checking-for-update', () => {
            this.sendStatus('🔍 Проверка обновлений...');
            log.info('Checking for updates...');
        });

        // Обновление доступно
        autoUpdater.on('update-available', (info) => {
            this.sendStatus(`✨ Доступна версия ${info.version}`);
            log.info('Update available:', info.version);
            
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Обновление доступно! 🎉',
                message: `Найдена новая версия ${info.version}!\n\nТекущая версия: ${app.getVersion()}\n\nЧто нового:\n${info.releaseNotes || 'Улучшения и исправления'}\n\nХотите загрузить обновление?`,
                buttons: ['✅ Да, обновить', '❌ Позже'],
                defaultId: 0,
                cancelId: 1,
                noLink: true
            }).then(result => {
                if (result.response === 0) {
                    autoUpdater.downloadUpdate();
                    this.sendStatus('📥 Загрузка обновления...');
                } else {
                    this.sendStatus('Обновление отложено');
                }
            });
        });

        // Обновление не доступно
        autoUpdater.on('update-not-available', (info) => {
            this.sendStatus(`✅ Последняя версия (${app.getVersion()})`);
            log.info('Update not available');
        });

        // Ошибка при проверке
        autoUpdater.on('error', (err) => {
            this.sendStatus('❌ Ошибка проверки обновлений');
            log.error('Update error:', err);
            
            // Не показываем диалог ошибки при запуске (чтобы не мешать)
            // Только логируем
        });

        // Прогресс загрузки
        autoUpdater.on('download-progress', (progressObj) => {
            const percent = Math.round(progressObj.percent);
            const speed = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
            const downloaded = (progressObj.transferred / 1024 / 1024).toFixed(2);
            const total = (progressObj.total / 1024 / 1024).toFixed(2);
            
            const message = `📥 Загрузка: ${percent}% (${downloaded}/${total} MB) • ${speed} MB/s`;
            this.sendStatus(message);
            log.info(`Download progress: ${percent}%`);
        });

        // Обновление загружено
        autoUpdater.on('update-downloaded', (info) => {
            this.sendStatus('✅ Обновление готово!');
            log.info('Update downloaded');
            
            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Обновление готово! 🚀',
                message: `Версия ${info.version} загружена!\n\nПерезапустить лаунчер и установить обновление сейчас?`,
                buttons: ['🚀 Перезапустить', '⏰ Установить при выходе'],
                defaultId: 0,
                cancelId: 1,
                noLink: true
            }).then(result => {
                if (result.response === 0) {
                    // Немедленная установка
                    autoUpdater.quitAndInstall(false, true);
                } else {
                    // Установка при выходе
                    this.sendStatus('Обновление установится при выходе');
                }
            });
        });
    }

    checkForUpdates() {
        log.info('Manual update check triggered');
        this.sendStatus('🔍 Проверка обновлений...');
        autoUpdater.checkForUpdates();
    }

    sendStatus(text) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('update-status', text);
        }
    }
}

module.exports = AppUpdater;