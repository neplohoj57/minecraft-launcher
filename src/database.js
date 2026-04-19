const fs = require('fs');
const path = require('path');
const crypto = require('crypto-js');
const { app } = require('electron');

class UserDatabase {
    constructor() {
        this.dataDir = path.join(app.getPath('userData'), 'data');
        this.dbPath = path.join(this.dataDir, 'users.json');
        this.skinsDir = path.join(this.dataDir, 'skins');
        
        this.ensureDirectories();
        this.loadDatabase();
    }

    ensureDirectories() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            if (!fs.existsSync(this.skinsDir)) {
                fs.mkdirSync(this.skinsDir, { recursive: true });
            }
            if (!fs.existsSync(this.dbPath)) {
                fs.writeFileSync(this.dbPath, JSON.stringify({ users: [] }, null, 2));
            }
        } catch (error) {
            console.error('❌ Ошибка создания директорий:', error);
        }
    }

    loadDatabase() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf-8');
                this.db = JSON.parse(data);
                if (!this.db.users) this.db = { users: [] };
            } else {
                this.db = { users: [] };
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки БД:', error);
            this.db = { users: [] };
        }
    }

    saveDatabase() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
        } catch (error) {
            console.error('❌ Ошибка сохранения БД:', error);
        }
    }

    hashPassword(password) {
        return crypto.SHA256(password).toString();
    }

    register(nickname, email, password) {
        const existing = this.db.users.find(
            u => u.nickname.toLowerCase() === nickname.toLowerCase() || 
                 u.email.toLowerCase() === email.toLowerCase()
        );

        if (existing) {
            return { success: false, error: 'Никнейм или Email уже занят' };
        }

        const user = {
            id: Date.now().toString(),
            nickname,
            email,
            password: this.hashPassword(password),
            avatar: 'avatar1.png',
            customSkin: null,
            createdAt: new Date().toISOString()
        };

        this.db.users.push(user);
        this.saveDatabase();

        return { success: true, user: this.sanitizeUser(user) };
    }

    login(nickname, password) {
        const user = this.db.users.find(
            u => u.nickname.toLowerCase() === nickname.toLowerCase()
        );

        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }

        if (user.password !== this.hashPassword(password)) {
            return { success: false, error: 'Неверный пароль' };
        }

        return { success: true, user: this.sanitizeUser(user) };
    }

    getUserById(id) {
        const user = this.db.users.find(u => u.id === id);
        return user ? this.sanitizeUser(user) : null;
    }

    updateAvatar(userId, avatar) {
        const user = this.db.users.find(u => u.id === userId);
        if (!user) return { success: false, error: 'Пользователь не найден' };

        user.avatar = avatar;
        this.saveDatabase();
        return { success: true, user: this.sanitizeUser(user) };
    }

    uploadCustomSkin(userId, skinData) {
        const user = this.db.users.find(u => u.id === userId);
        if (!user) return { success: false, error: 'Пользователь не найден' };

        try {
            const skinFileName = `skin_${userId}_${Date.now()}.png`;
            const skinPath = path.join(this.skinsDir, skinFileName);
            const base64Data = skinData.replace(/^data:image\/png;base64,/, '');
            
            fs.writeFileSync(skinPath, base64Data, 'base64');

            if (user.customSkin?.filePath && fs.existsSync(user.customSkin.filePath)) {
                fs.unlinkSync(user.customSkin.filePath);
            }

            user.customSkin = { fileName: skinFileName, filePath: skinPath };
            user.avatar = 'custom';
            this.saveDatabase();

            return { success: true, skin: user.customSkin };
        } catch (error) {
            return { success: false, error: 'Ошибка загрузки скина' };
        }
    }

    getCustomSkin(userId) {
        const user = this.db.users.find(u => u.id === userId);
        if (!user?.customSkin?.filePath) return null;

        try {
            if (fs.existsSync(user.customSkin.filePath)) {
                const skinData = fs.readFileSync(user.customSkin.filePath, 'base64');
                return `data:image/png;base64,${skinData}`;
            }
        } catch (error) {
            console.error('❌ Ошибка чтения скина:', error);
        }
        return null;
    }

    deleteCustomSkin(userId) {
        const user = this.db.users.find(u => u.id === userId);
        if (!user) return { success: false, error: 'Пользователь не найден' };

        if (user.customSkin?.filePath && fs.existsSync(user.customSkin.filePath)) {
            fs.unlinkSync(user.customSkin.filePath);
        }

        user.customSkin = null;
        user.avatar = 'avatar1.png';
        this.saveDatabase();

        return { success: true };
    }

    sanitizeUser(user) {
        const { password, ...safeUser } = user;
        return safeUser;
    }

    getDatabasePath() {
        return this.dbPath;
    }

    getSkinsDir() {
        return this.skinsDir;
    }
}

module.exports = UserDatabase;