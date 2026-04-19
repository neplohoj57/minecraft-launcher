const { Client } = require('minecraft-launcher-core');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class MinecraftLauncher {
    constructor() {
        this.minecraftPath = path.join(app.getPath('userData'), 'minecraft');
        
        if (!fs.existsSync(this.minecraftPath)) {
            fs.mkdirSync(this.minecraftPath, { recursive: true });
        }
    }

    async launch(version, username) {
        console.log(`🚀 Запуск Minecraft ${version} для ${username}`);

        try {
            const launcher = new Client();

            const opts = {
                authorization: {
                    access_token: 'token',
                    client_token: 'token',
                    uuid: this.generateUUID(username),
                    name: username,
                    user_properties: '{}'
                },
                root: this.minecraftPath,
                version: {
                    number: version,
                    type: 'release'
                },
                memory: {
                    max: '4G',
                    min: '2G'
                }
            };

            launcher.launch(opts);

            launcher.on('progress', (e) => {
                console.log(`[PROGRESS] ${e.type}: ${e.task} ${e.percent}%`);
            });

            launcher.on('close', (code) => {
                console.log(`[CLOSE] Code: ${code}`);
            });

            return { success: true, message: 'Игра запущена!' };
        } catch (error) {
            console.error('❌ Ошибка запуска:', error);
            return { success: false, error: error.message };
        }
    }

    async getVersions() {
        return {
            success: true,
            versions: [
                { id: '1.20.4', type: 'release', recommended: true },
                { id: '1.20.1', type: 'release' },
                { id: '1.19.4', type: 'release' },
                { id: '1.19.2', type: 'release' },
                { id: '1.18.2', type: 'release' },
                { id: '1.16.5', type: 'release' },
                { id: '1.12.2', type: 'release' },
                { id: '1.8.9', type: 'release' }
            ]
        };
    }

    generateUUID(username) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(username).digest('hex');
        return [
            hash.substring(0, 8),
            hash.substring(8, 12),
            hash.substring(12, 16),
            hash.substring(16, 20),
            hash.substring(20, 32)
        ].join('-');
    }
}

module.exports = MinecraftLauncher;