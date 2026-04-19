const fs = require('fs');
const path = require('path');

class SkinInstaller {
    constructor() {
        this.minecraftDir = this.getMinecraftDirectory();
    }

    getMinecraftDirectory() {
        const os = require('os');
        const platform = process.platform;

        if (platform === 'win32') {
            return path.join(os.homedir(), 'AppData', 'Roaming', '.minecraft');
        } else if (platform === 'darwin') {
            return path.join(os.homedir(), 'Library', 'Application Support', 'minecraft');
        } else {
            return path.join(os.homedir(), '.minecraft');
        }
    }

    installSkin(skinPath, username) {
        try {
            // Создаём директорию для скинов
            const skinsDir = path.join(this.minecraftDir, 'assets', 'skins');
            
            if (!fs.existsSync(skinsDir)) {
                fs.mkdirSync(skinsDir, { recursive: true });
            }

            // Копируем скин
            const targetPath = path.join(skinsDir, `${username}.png`);
            
            if (fs.existsSync(skinPath)) {
                fs.copyFileSync(skinPath, targetPath);
                console.log('✅ Скин установлен:', targetPath);
                return { success: true, path: targetPath };
            } else {
                return { success: false, error: 'Файл скина не найден' };
            }

        } catch (error) {
            console.error('❌ Ошибка установки скина:', error);
            return { success: false, error: error.message };
        }
    }

    createSkinConfig(username, skinPath) {
        try {
            const configPath = path.join(this.minecraftDir, 'options.txt');
            let config = '';

            // Читаем существующий конфиг если есть
            if (fs.existsSync(configPath)) {
                config = fs.readFileSync(configPath, 'utf8');
            }

            // Добавляем/обновляем параметр скина
            const skinLine = `skin:${username}:${skinPath}`;
            
            if (config.includes('skin:')) {
                config = config.replace(/skin:.*/, skinLine);
            } else {
                config += `\n${skinLine}`;
            }

            fs.writeFileSync(configPath, config);
            console.log('✅ Конфиг скина создан');
            return true;

        } catch (error) {
            console.error('❌ Ошибка создания конфига:', error);
            return false;
        }
    }
}

module.exports = SkinInstaller;