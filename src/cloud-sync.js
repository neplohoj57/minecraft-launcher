const axios = require('axios');
const Store = require('electron-store');

class CloudSync {
    constructor() {
        this.store = new Store();
        this.apiUrl = 'https://api.jsonbin.io/v3/b'; // JSONBin.io - бесплатное облако
        this.apiKey = '$2a$10$YOUR_API_KEY_HERE'; // Получить на jsonbin.io
        this.syncInterval = null;
    }

    // Получить API ключ: https://jsonbin.io/api-reference/quickstart
    setApiKey(key) {
        this.apiKey = key;
        this.store.set('cloudApiKey', key);
    }

    getApiKey() {
        return this.store.get('cloudApiKey', this.apiKey);
    }

    // Загрузка данных в облако
    async uploadData(userId, data) {
        try {
            const binId = this.store.get(`cloudBinId_${userId}`);
            const headers = {
                'Content-Type': 'application/json',
                'X-Master-Key': this.getApiKey()
            };

            const payload = {
                userId: userId,
                timestamp: new Date().toISOString(),
                data: data
            };

            let response;

            if (binId) {
                // Обновляем существующий bin
                response = await axios.put(
                    `${this.apiUrl}/${binId}`,
                    payload,
                    { headers }
                );
                console.log('☁️ Данные обновлены в облаке');
            } else {
                // Создаём новый bin
                response = await axios.post(
                    this.apiUrl,
                    payload,
                    { headers }
                );
                this.store.set(`cloudBinId_${userId}`, response.data.metadata.id);
                console.log('☁️ Данные загружены в облако');
            }

            return { success: true, message: 'Синхронизировано с облаком' };

        } catch (error) {
            console.error('❌ Ошибка загрузки в облако:', error.message);
            return { success: false, error: 'Ошибка синхронизации' };
        }
    }

    // Скачивание данных из облака
    async downloadData(userId) {
        try {
            const binId = this.store.get(`cloudBinId_${userId}`);

            if (!binId) {
                return { success: false, error: 'Нет облачных данных' };
            }

            const headers = {
                'X-Master-Key': this.getApiKey()
            };

            const response = await axios.get(
                `${this.apiUrl}/${binId}/latest`,
                { headers }
            );

            console.log('☁️ Данные загружены из облака');
            return { success: true, data: response.data.record.data };

        } catch (error) {
            console.error('❌ Ошибка загрузки из облака:', error.message);
            return { success: false, error: 'Ошибка загрузки' };
        }
    }

    // Автоматическая синхронизация
    startAutoSync(userId, getData, interval = 300000) { // 5 минут
        this.stopAutoSync();

        this.syncInterval = setInterval(async () => {
            const data = getData();
            await this.uploadData(userId, data);
        }, interval);

        console.log('🔄 Автосинхронизация включена');
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏸️ Автосинхронизация отключена');
        }
    }

    // Получить данные для синхронизации
    getLocalData() {
        return {
            nickname: this.store.get('nickname'),
            version: this.store.get('version'),
            memory: this.store.get('memory'),
            settings: {
                // Добавь другие настройки если нужно
            }
        };
    }

    // Применить данные из облака
    applyCloudData(data) {
        if (data.nickname) this.store.set('nickname', data.nickname);
        if (data.version) this.store.set('version', data.version);
        if (data.memory) this.store.set('memory', data.memory);
        console.log('✅ Настройки применены из облака');
    }
}

module.exports = CloudSync;