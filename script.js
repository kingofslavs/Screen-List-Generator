class VideoScreenshotGenerator {
    constructor() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentVideoFile = null;
        this.screenshots = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Загрузка файла
        const videoInput = document.getElementById('videoInput');
        const uploadArea = document.getElementById('uploadArea');
        
        videoInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag & Drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('video/')) {
                this.loadVideo(files[0]);
            }
        });
        
        // Контролы
        const frameCount = document.getElementById('frameCount');
        const frameCountValue = document.getElementById('frameCountValue');
        frameCount.addEventListener('input', () => {
            frameCountValue.textContent = frameCount.value;
        });
        
        const gridWidth = document.getElementById('gridWidth');
        const gridWidthValue = document.getElementById('gridWidthValue');
        gridWidth.addEventListener('input', () => {
            gridWidthValue.textContent = gridWidth.value + 'px';
            this.updateGridWidth(gridWidth.value);
        });
        
        const columns = document.getElementById('columns');
        columns.addEventListener('change', () => {
            const grid = document.getElementById('screenshotGrid');
            grid.style.setProperty('--columns', columns.value);
        });
        
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateScreenshots();
        });
        
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadScreenshots();
            });
        }
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('video/')) {
            this.loadVideo(file);
        } else {
            alert('Пожалуйста, выберите видео файл');
        }
    }

    loadVideo(file) {
        this.currentVideoFile = file;
        const url = URL.createObjectURL(file);
        
        this.video.src = url;
        this.video.addEventListener('loadedmetadata', () => {
            this.showVideoInfo();
            this.showControls();
        });
        
        this.video.addEventListener('error', () => {
            alert('Ошибка при загрузке видео. Убедитесь, что файл не поврежден.');
        });
    }

    showVideoInfo() {
        const videoInfo = document.getElementById('videoInfo');
        const duration = this.formatTime(this.video.duration);
        const fileSize = this.formatFileSize(this.currentVideoFile.size);
        
        videoInfo.innerHTML = `
            <h4>📹 Информация о видео</h4>
            <div class="video-info-item">
                <span>Название:</span>
                <strong>${this.currentVideoFile.name}</strong>
            </div>
            <div class="video-info-item">
                <span>Длительность:</span>
                <strong>${duration}</strong>
            </div>
            <div class="video-info-item">
                <span>Разрешение:</span>
                <strong>${this.video.videoWidth} × ${this.video.videoHeight}</strong>
            </div>
            <div class="video-info-item">
                <span>Размер файла:</span>
                <strong>${fileSize}</strong>
            </div>
        `;
    }

    showControls() {
        document.getElementById('controlsSection').style.display = 'block';
        document.getElementById('uploadArea').style.display = 'none';
    }

    async generateScreenshots() {
        const frameCount = parseInt(document.getElementById('frameCount').value);
        const showTimestamps = document.getElementById('showTimestamps').checked;
        const columns = document.getElementById('columns').value;
        
        // Показать прогресс
        this.showProgress();
        
        this.screenshots = [];
        const duration = this.video.duration;
        const interval = duration / (frameCount + 1);
        
        // Настроить canvas
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        for (let i = 1; i <= frameCount; i++) {
            const time = interval * i;
            
            try {
                const screenshot = await this.captureFrame(time);
                this.screenshots.push({
                    image: screenshot,
                    timestamp: time,
                    formattedTime: this.formatTime(time)
                });
                
                // Обновить прогресс
                this.updateProgress((i / frameCount) * 100);
            } catch (error) {
                console.error('Ошибка при создании скриншота:', error);
            }
        }
        
        this.hideProgress();
        this.displayScreenshots(columns, showTimestamps);
    }

    captureFrame(time) {
        return new Promise((resolve, reject) => {
            const video = this.video;
            
            const onSeeked = () => {
                try {
                    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
                    const dataURL = this.canvas.toDataURL('image/jpeg', 0.8);
                    video.removeEventListener('seeked', onSeeked);
                    resolve(dataURL);
                } catch (error) {
                    video.removeEventListener('seeked', onSeeked);
                    reject(error);
                }
            };
            
            video.addEventListener('seeked', onSeeked);
            video.currentTime = time;
        });
    }

    displayScreenshots(columns, showTimestamps) {
        const grid = document.getElementById('screenshotGrid');
        
        grid.style.setProperty('--columns', columns);
        grid.innerHTML = '';
        
        this.screenshots.forEach((screenshot, index) => {
            const item = document.createElement('div');
            item.className = 'screenshot-item';
            
            const img = document.createElement('img');
            img.src = screenshot.image;
            img.alt = `Кадр ${index + 1}`;
            img.loading = 'lazy';
            
            item.appendChild(img);
            
            if (showTimestamps) {
                const timestamp = document.createElement('div');
                timestamp.className = 'screenshot-timestamp';
                timestamp.textContent = screenshot.formattedTime;
                item.appendChild(timestamp);
            }
            
            grid.appendChild(item);
        });
        
        document.getElementById('previewSection').style.display = 'block';
    }

    updateGridWidth(width) {
        // Для предварительного просмотра не ограничиваем ширину
        // Размер скриншотов будет определяться CSS
    }

    async downloadScreenshots() {
        if (this.screenshots.length === 0) {
            alert('Сначала создайте скринлист');
            return;
        }
        
        const columns = parseInt(document.getElementById('columns').value);
        const showTimestamps = document.getElementById('showTimestamps').checked;
        const gridWidth = parseInt(document.getElementById('gridWidth').value);
        
        // Создать большой canvas для всех скриншотов
        const downloadCanvas = document.createElement('canvas');
        const downloadCtx = downloadCanvas.getContext('2d');
        
        // Расчет размеров canvas
        const rows = Math.ceil(this.screenshots.length / columns);
        const padding = 10;
        const gap = 2;
        const timestampHeight = showTimestamps ? 20 : 0;
        
        // Ширина canvas точно соответствует заданной ширине скринлиста
        downloadCanvas.width = gridWidth;
        
        // Автоматический расчет размеров скриншотов
        const availableWidth = gridWidth - 2 * padding - (columns - 1) * gap;
        const screenshotWidth = availableWidth / columns;
        const screenshotHeight = Math.round((screenshotWidth / this.video.videoWidth) * this.video.videoHeight);
        const itemHeight = screenshotHeight + timestampHeight;
        
        // Высота canvas с минимальным заголовком и компактным размещением
        downloadCanvas.height = rows * itemHeight + (rows - 1) * gap + 2 * padding + 65;
        
        // Фон
        downloadCtx.fillStyle = '#ffffff';
        downloadCtx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
        
        // Минималистичный заголовок
        downloadCtx.fillStyle = '#333';
        downloadCtx.font = 'bold 14px Arial';
        downloadCtx.textAlign = 'left';
        downloadCtx.fillText(
            `${this.currentVideoFile.name}`,
            10,
            20
        );
        
        downloadCtx.font = '12px Arial';
        downloadCtx.fillStyle = '#666';
        const fileSize = this.formatFileSize(this.currentVideoFile.size);
        downloadCtx.fillText(
            `${this.formatTime(this.video.duration)} | ${this.video.videoWidth}×${this.video.videoHeight} | ${fileSize} | ${this.screenshots.length} кадров`,
            10,
            35
        );
        
        // Дополнительная информация о скриншотах
        downloadCtx.font = '12px Arial';
        downloadCtx.fillStyle = '#888';
        downloadCtx.fillText(
            `Размер скриншота: ${Math.round(screenshotWidth)}×${Math.round(screenshotHeight)}px | Сетка: ${columns} колонки`,
            10,
            48
        );
        
        // Отрисовка скриншотов с минимальными отступами
        for (let i = 0; i < this.screenshots.length; i++) {
            const row = Math.floor(i / columns);
            const col = i % columns;
            
            const x = padding + col * (screenshotWidth + gap);
            const y = 55 + padding + row * (itemHeight + gap);
            
            // Загрузить изображение
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = this.screenshots[i].image;
            });
            
            // Отрисовать скриншот
            downloadCtx.drawImage(img, x, y, screenshotWidth, screenshotHeight);
            
            // Компактные временные метки
            if (showTimestamps) {
                downloadCtx.fillStyle = '#333';
                downloadCtx.fillRect(x, y + screenshotHeight, screenshotWidth, timestampHeight);
                
                downloadCtx.fillStyle = '#ffffff';
                downloadCtx.font = 'bold 9px Arial';
                downloadCtx.textAlign = 'center';
                downloadCtx.fillText(
                    this.screenshots[i].formattedTime,
                    x + screenshotWidth / 2,
                    y + screenshotHeight + timestampHeight / 2 + 3
                );
            }
        }
        
        // Скачать
        downloadCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `screenlist_${this.currentVideoFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.9);
    }

    showProgress() {
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('generateBtn').disabled = true;
        this.updateProgress(0);
    }

    updateProgress(percent) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = 
            `Обработка видео... ${Math.round(percent)}%`;
    }

    hideProgress() {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('generateBtn').disabled = false;
    }

    reset() {
        try {
            // Скрыть все секции кроме загрузки
            const controlsSection = document.getElementById('controlsSection');
            const previewSection = document.getElementById('previewSection');
            const progressSection = document.getElementById('progressSection');
            const uploadArea = document.getElementById('uploadArea');
            
            if (controlsSection) controlsSection.style.display = 'none';
            if (previewSection) previewSection.style.display = 'none';
            if (progressSection) progressSection.style.display = 'none';
            if (uploadArea) uploadArea.style.display = 'block';
            
            // Очистить данные
            this.currentVideoFile = null;
            this.screenshots = [];
            
            const videoInput = document.getElementById('videoInput');
            if (videoInput) videoInput.value = '';
            
            // Освободить память
            if (this.video && this.video.src && this.video.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.video.src);
                this.video.src = '';
            }
            
            // Сбросить видео элемент
            if (this.video) {
                this.video.removeAttribute('src');
                this.video.load();
            }
        } catch (error) {
            console.error('Ошибка при сбросе:', error);
            // Принудительно показать область загрузки даже при ошибке
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) uploadArea.style.display = 'block';
        }
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatFileSize(bytes) {
        const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
        if (bytes === 0) return '0 Б';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new VideoScreenshotGenerator();
});

// Предотвращение drag & drop на странице
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());