const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');

class UserDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/users.json');
        
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.initDatabase();
    }

    initDatabase() {
        if (!fs.existsSync(this.dbPath)) {
            const emptyDb = {
                users: [],
                nextId: 1
            };
            fs.writeFileSync(this.dbPath, JSON.stringify(emptyDb, null, 2));
            console.log('✅ База данных создана:', this.dbPath);
        } else {
            console.log('✅ База данных загружена');
        }
    }

    readDatabase() {
        try {
            const data = fs.readFileSync(this.dbPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Ошибка чтения БД:', error);
            return { users: [], nextId: 1 };
        }
    }

    writeDatabase(data) {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Ошибка записи БД:', error);
            return false;
        }
    }

    hashPassword(password) {
        return CryptoJS.SHA256(password).toString();
    }

    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    registerUser(username, email, password) {
        try {
            const db = this.readDatabase();

            const existingUser = db.users.find(
                u => u.username === username || u.email === email
            );

            if (existingUser) {
                if (existingUser.username === username) {
                    return { success: false, error: 'Это имя пользователя уже занято' };
                }
                if (existingUser.email === email) {
                    return { success: false, error: 'Этот email уже зарегистрирован' };
                }
            }

            const newUser = {
                id: db.nextId,
                username: username,
                email: email,
                password: this.hashPassword(password),
                avatar: 'steve',
                customSkin: null,
                skinPath: null,
                created_at: new Date().toISOString(),
                last_login: null,
                stats: {
                    launches: 0,
                    playtime: 0,
                    last_version: null
                }
            };

            db.users.push(newUser);
            db.nextId++;

            if (this.writeDatabase(db)) {
                console.log('✅ Пользователь зарегистрирован:', username);
                return { 
                    success: true, 
                    userId: newUser.id,
                    message: 'Регистрация успешна!' 
                };
            } else {
                return { success: false, error: 'Ошибка сохранения данных' };
            }

        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: 'Ошибка при регистрации' };
        }
    }

    loginUser(username, password) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.username === username);

            if (!user) {
                return { success: false, error: 'Неверный логин или пароль' };
            }

            if (!this.verifyPassword(password, user.password)) {
                return { success: false, error: 'Неверный логин или пароль' };
            }

            user.last_login = new Date().toISOString();
            this.writeDatabase(db);

            console.log('✅ Вход выполнен:', username);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar || 'steve',
                    customSkin: user.customSkin || null,
                    skinPath: user.skinPath || null,
                    created_at: user.created_at,
                    last_login: user.last_login,
                    stats: user.stats || { launches: 0, playtime: 0, last_version: null }
                },
                message: 'Вход выполнен успешно!'
            };

        } catch (error) {
            console.error('Ошибка входа:', error);
            return { success: false, error: 'Ошибка при входе' };
        }
    }

    getUserById(userId) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.id === userId);
            
            if (user) {
                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar || 'steve',
                    customSkin: user.customSkin || null,
                    skinPath: user.skinPath || null,
                    created_at: user.created_at,
                    last_login: user.last_login,
                    stats: user.stats || { launches: 0, playtime: 0, last_version: null }
                };
            }
            
            return null;
        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
            return null;
        }
    }

    updateAvatar(userId, avatar) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.id === userId);
            
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            user.avatar = avatar;

            if (this.writeDatabase(db)) {
                console.log('✅ Аватар обновлён:', avatar);
                return { success: true, message: 'Аватар изменён' };
            }
            
            return { success: false, error: 'Ошибка сохранения' };

        } catch (error) {
            console.error('Ошибка обновления аватара:', error);
            return { success: false, error: 'Ошибка обновления' };
        }
    }

    updateEmail(userId, newEmail) {
        try {
            const db = this.readDatabase();
            
            const existingUser = db.users.find(u => u.email === newEmail && u.id !== userId);
            if (existingUser) {
                return { success: false, error: 'Этот email уже используется' };
            }

            const user = db.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            user.email = newEmail;

            if (this.writeDatabase(db)) {
                console.log('✅ Email обновлён');
                return { success: true, message: 'Email изменён' };
            }
            
            return { success: false, error: 'Ошибка сохранения' };

        } catch (error) {
            console.error('Ошибка обновления email:', error);
            return { success: false, error: 'Ошибка обновления' };
        }
    }

    incrementLaunches(userId, version) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.id === userId);
            
            if (user) {
                if (!user.stats) {
                    user.stats = { launches: 0, playtime: 0, last_version: null };
                }
                user.stats.launches++;
                user.stats.last_version = version;
                this.writeDatabase(db);
                console.log('📊 Запусков:', user.stats.launches);
            }

        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
        }
    }

    addPlaytime(userId, minutes) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.id === userId);
            
            if (user) {
                if (!user.stats) {
                    user.stats = { launches: 0, playtime: 0, last_version: null };
                }
                user.stats.playtime += minutes;
                this.writeDatabase(db);
                console.log('⏱️ Время игры:', user.stats.playtime, 'мин');
            }

        } catch (error) {
            console.error('Ошибка обновления времени:', error);
        }
    }

    changePassword(userId, oldPassword, newPassword) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.id === userId);
            
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            if (!this.verifyPassword(oldPassword, user.password)) {
                return { success: false, error: 'Неверный текущий пароль' };
            }

            user.password = this.hashPassword(newPassword);

            if (this.writeDatabase(db)) {
                console.log('✅ Пароль изменён для:', user.username);
                return { success: true, message: 'Пароль успешно изменён' };
            } else {
                return { success: false, error: 'Ошибка сохранения' };
            }

        } catch (error) {
            console.error('Ошибка смены пароля:', error);
            return { success: false, error: 'Ошибка при смене пароля' };
        }
    }

    saveCustomSkin(userId, skinData) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.id === userId);
            
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            user.customSkin = skinData;

            // Сохраняем скин в файл
            const skinsDir = path.join(__dirname, '../minecraft/skins');
            if (!fs.existsSync(skinsDir)) {
                fs.mkdirSync(skinsDir, { recursive: true });
            }

            const skinPath = path.join(skinsDir, `${user.username}.png`);
            
            // Конвертируем base64 в файл
            const base64Data = skinData.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(skinPath, base64Data, 'base64');

            user.skinPath = skinPath;

            if (this.writeDatabase(db)) {
                console.log('✅ Скин сохранён:', skinPath);
                return { success: true, message: 'Скин сохранён', skinPath: skinPath };
            }
            
            return { success: false, error: 'Ошибка сохранения' };

        } catch (error) {
            console.error('Ошибка сохранения скина:', error);
            return { success: false, error: 'Ошибка сохранения' };
        }
    }

    removeCustomSkin(userId) {
        try {
            const db = this.readDatabase();
            const user = db.users.find(u => u.id === userId);
            
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Удаляем файл скина
            if (user.skinPath && fs.existsSync(user.skinPath)) {
                fs.unlinkSync(user.skinPath);
                console.log('🗑️ Файл скина удалён:', user.skinPath);
            }

            user.customSkin = null;
            user.skinPath = null;

            if (this.writeDatabase(db)) {
                console.log('✅ Скин удалён');
                return { success: true, message: 'Скин удалён' };
            }
            
            return { success: false, error: 'Ошибка удаления' };

        } catch (error) {
            console.error('Ошибка удаления скина:', error);
            return { success: false, error: 'Ошибка удаления' };
        }
    }

    getAllUsers() {
        const db = this.readDatabase();
        return db.users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            created_at: u.created_at
        }));
    }

    deleteUser(userId) {
        try {
            const db = this.readDatabase();
            const index = db.users.findIndex(u => u.id === userId);
            
            if (index === -1) {
                return { success: false, error: 'Пользователь не найден' };
            }

            const username = db.users[index].username;
            
            // Удаляем скин если есть
            if (db.users[index].skinPath && fs.existsSync(db.users[index].skinPath)) {
                fs.unlinkSync(db.users[index].skinPath);
            }

            db.users.splice(index, 1);

            if (this.writeDatabase(db)) {
                console.log('✅ Пользователь удалён:', username);
                return { success: true, message: 'Пользователь удалён' };
            } else {
                return { success: false, error: 'Ошибка удаления' };
            }

        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            return { success: false, error: 'Ошибка при удалении' };
        }
    }

    close() {
        console.log('✅ База данных закрыта');
    }
}

module.exports = UserDatabase;