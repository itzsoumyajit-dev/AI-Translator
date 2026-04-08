const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { translate, detectLanguage } = require('./server/translation-engine');
const { languages, getLanguageName } = require('./server/languages');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 950,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    icon: path.join(__dirname, 'hub', 'icon.png'),
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'hub', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Browser Detection (for Hub UI)
function detectDefaultBrowser() {
  return new Promise((resolve) => {
    const platform = process.platform;
    if (platform === 'win32') {
      exec('reg query "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId', (error, stdout) => {
        if (error) return resolve({ detected: false, name: 'Unknown' });
        const match = stdout.match(/ProgId\s+REG_SZ\s+(\S+)/);
        if (match) {
          const progId = match[1].toLowerCase();
          let name = progId;
          if (progId.includes('chrome')) name = 'Google Chrome';
          else if (progId.includes('firefox')) name = 'Mozilla Firefox';
          else if (progId.includes('msedge')) name = 'Microsoft Edge';
          resolve({ detected: true, name });
        } else resolve({ detected: false, name: 'Unknown' });
      });
    } else {
      resolve({ detected: true, name: 'System Default' });
    }
  });
}

// IPC Handlers
ipcMain.handle('detect-browser', async () => {
  return await detectDefaultBrowser();
});

ipcMain.handle('get-languages', () => {
  return { success: true, languages };
});

ipcMain.handle('translate', async (event, { text, from, to }) => {
  try {
    let sourceCode = from;
    let isAuto = from === 'autodetect';

    // Handle auto-detection
    if (isAuto) {
      sourceCode = await detectLanguage(text.trim());
    }

    const fromName = isAuto ? `Detected: ${getLanguageName(sourceCode)}` : getLanguageName(sourceCode);
    const toName = getLanguageName(to);

    const result = await translate(text.trim(), sourceCode, to);
    
    return {
      success: true,
      originalText: text.trim(),
      translatedText: result.translatedText,
      from: { code: sourceCode, name: fromName },
      to: { code: to, name: toName },
      match: result.match,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('start-app', () => {
  if (mainWindow) {
    // Resize for translator view
    mainWindow.setSize(480, 720, true);
    mainWindow.center();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.loadFile(path.join(__dirname, 'translator', 'index.html'));
  }
});

ipcMain.handle('minimize-window', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle('close-window', () => { if (mainWindow) mainWindow.close(); });

// Lifecycle
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
