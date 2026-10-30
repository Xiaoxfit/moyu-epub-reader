const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
// 引入 nut-js 屏幕模块
const { screen: nutScreen, mouse } = require('@nut-tree-fork/nut-js');

const configPath = path.join(app.getPath('userData'), 'window-config.json');

function loadWindowConfig() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {}
    return { width: 800, height: 600 };
}

function saveWindowConfig(win) {
    try {
        if (!win.isMinimized() && !win.isMaximized()) {
            const bounds = win.getBounds();
            fs.writeFileSync(configPath, JSON.stringify(bounds));
        }
    } catch (e) {}
}

function createWindow() {
    const savedBounds = loadWindowConfig();

    const mainWindow = new BrowserWindow({
        width: savedBounds.width || 800,
        height: savedBounds.height || 600,
        x: savedBounds.x,
        y: savedBounds.y,
        frame: false,
        transparent: true,
        hasShadow: false,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // 允许加载本地 foliate-js 的 ES Module
            webSecurity: false
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', () => {
        saveWindowConfig(mainWindow);
    });
}

// ========== 改造：全局实时取色 ==========
ipcMain.handle('color-picker:start', async () => {
    try {
        // 获取当前鼠标所在位置
        const mousePos = await mouse.getPosition();
        // 获取该位置的像素颜色
        const color = await nutScreen.colorAt(mousePos);
        
        // 转换成标准 Hex 颜色码
        const hex = '#' + [color.R, color.G, color.B]
            .map(v => v.toString(16).padStart(2, '0'))
            .join('');

        return { 
            hex, 
            x: mousePos.x, 
            y: mousePos.y 
        };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('dialog:open-epub', async () => {
    const result = await dialog.showOpenDialog({
        title: '选择 EPUB 电子书',
        filters: [
            { name: 'EPUB 书籍', extensions: ['epub'] },
            { name: '所有支持格式', extensions: ['epub', 'mobi', 'azw3', 'fb2', 'cbz'] }
        ],
        properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
