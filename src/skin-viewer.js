// Простой 3D viewer для скинов Minecraft
class SkinViewer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.skinImage = null;
        this.rotation = 0;
        this.autoRotate = true;
    }

    loadSkin(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.skinImage = img;
                this.draw();
                resolve();
            };
            
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    loadSkinFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Проверяем размер (должен быть 64x64 или 64x32)
                    if ((img.width === 64 && (img.height === 64 || img.height === 32))) {
                        this.skinImage = img;
                        this.draw();
                        resolve(e.target.result);
                    } else {
                        reject(new Error('Неверный размер скина. Нужен 64x64 или 64x32'));
                    }
                };
                img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
                img.src = e.target.result;
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    draw() {
        if (!this.skinImage) return;

        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рисуем упрощённую 3D модель (вид спереди)
        const scale = 3;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Голова (front)
        this.drawSkinPart(ctx, 8, 8, 8, 8, centerX - 32, centerY - 80, 64, 64, scale);
        
        // Overlay головы (hat)
        this.drawSkinPart(ctx, 40, 8, 8, 8, centerX - 36, centerY - 84, 72, 72, scale);

        // Тело (front)
        this.drawSkinPart(ctx, 20, 20, 8, 12, centerX - 32, centerY - 16, 64, 96, scale);

        // Правая рука
        this.drawSkinPart(ctx, 44, 20, 4, 12, centerX - 64, centerY - 16, 32, 96, scale);

        // Левая рука
        this.drawSkinPart(ctx, 36, 52, 4, 12, centerX + 32, centerY - 16, 32, 96, scale);

        // Правая нога
        this.drawSkinPart(ctx, 4, 20, 4, 12, centerX - 32, centerY + 80, 32, 96, scale);

        // Левая нога
        this.drawSkinPart(ctx, 20, 52, 4, 12, centerX, centerY + 80, 32, 96, scale);
    }

    drawSkinPart(ctx, sx, sy, sw, sh, dx, dy, dw, dh, scale) {
        if (!this.skinImage) return;
        
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            this.skinImage,
            sx, sy, sw, sh,
            dx, dy, dw, dh
        );
    }

    startAutoRotate() {
        this.autoRotate = true;
        this.animate();
    }

    stopAutoRotate() {
        this.autoRotate = false;
    }

    animate() {
        if (!this.autoRotate) return;
        
        this.rotation += 0.5;
        if (this.rotation >= 360) this.rotation = 0;
        
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

module.exports = SkinViewer;