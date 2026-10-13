import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let damageWindow = null;

// File path for persisting damage window position
function getBoundsFilePath() {
  try {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'damage-window-bounds.json');
  } catch {
    return path.join(__dirname, 'damage-window-bounds.json');
  }
}

function loadSavedBounds() {
  try {
    const filePath = getBoundsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Electron] Could not read saved window bounds:', err);
  }
  return null;
}

let saveBoundsTimer = null;
function saveBounds(bounds) {
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => {
    try {
      const filePath = getBoundsFilePath();
      fs.writeFileSync(filePath, JSON.stringify(bounds), 'utf-8');
    } catch (err) {
      console.warn('[Electron] Could not save window bounds:', err);
    }
  }, 500);
}

function notifyDamageVisibility(visible) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('damage-overlay:visibility-changed', visible);
    }
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 640,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: false,
    focusable: true, // Must be true on Windows so mouse click events reach UI buttons
    icon: path.join(__dirname, '../public/taskbar-icon.jpeg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Make window slightly transparent overall for better game visibility
  mainWindow.setOpacity(0.92);

  // Set window level to stay on top of borderless windowed games
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Start with mouse clicks enabled so buttons are interactive by default
  mainWindow.setIgnoreMouseEvents(false);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Electron] Failed to load main page: ${errorDescription} (${errorCode})`);
  });

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || Boolean(process.env.VITE_DEV_SERVER_URL);
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    console.log(`[Electron] Loading main dev URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);
  } else {
    console.log('[Electron] Loading main production file');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createDamageWindow() {
  if (damageWindow && !damageWindow.isDestroyed()) {
    damageWindow.show();
    notifyDamageVisibility(true);
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const savedBounds = loadSavedBounds();
  const defaultWidth = 380;
  const defaultHeight = 520;
  const defaultX = Math.max(0, screenWidth - defaultWidth - 20);
  const defaultY = 40;

  damageWindow = new BrowserWindow({
    width: savedBounds?.width || defaultWidth,
    height: savedBounds?.height || defaultHeight,
    x: savedBounds?.x !== undefined ? savedBounds.x : defaultX,
    y: savedBounds?.y !== undefined ? savedBounds.y : defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: false,
    focusable: true,
    icon: path.join(__dirname, '../public/taskbar-icon.jpeg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  damageWindow.setOpacity(0.95);
  damageWindow.setAlwaysOnTop(true, 'screen-saver');
  damageWindow.setIgnoreMouseEvents(false);

  damageWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Electron] Failed to load damage page: ${errorDescription} (${errorCode})`);
  });

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || Boolean(process.env.VITE_DEV_SERVER_URL);
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    const damageUrl = `${devUrl}/#damage`;
    console.log(`[Electron] Loading damage dev URL: ${damageUrl}`);
    damageWindow.loadURL(damageUrl);
  } else {
    console.log('[Electron] Loading damage production file');
    damageWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'damage' });
  }

  const recordBounds = () => {
    if (damageWindow && !damageWindow.isDestroyed()) {
      saveBounds(damageWindow.getBounds());
    }
  };

  damageWindow.on('moved', recordBounds);
  damageWindow.on('resized', recordBounds);

  damageWindow.on('show', () => notifyDamageVisibility(true));
  damageWindow.on('hide', () => notifyDamageVisibility(false));

  damageWindow.on('closed', () => {
    damageWindow = null;
    notifyDamageVisibility(false);
  });

  notifyDamageVisibility(true);
}

// IPC listener to dynamically toggle mouse click pass-through
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

// IPC listeners for Damage Overlay Window lifecycle
ipcMain.on('damage-overlay:toggle', () => {
  if (!damageWindow || damageWindow.isDestroyed()) {
    createDamageWindow();
  } else if (damageWindow.isVisible()) {
    damageWindow.hide();
  } else {
    damageWindow.show();
  }
});

ipcMain.on('damage-overlay:show', () => {
  if (!damageWindow || damageWindow.isDestroyed()) {
    createDamageWindow();
  } else {
    damageWindow.show();
  }
});

ipcMain.on('damage-overlay:hide', () => {
  if (damageWindow && !damageWindow.isDestroyed()) {
    damageWindow.hide();
  }
});

ipcMain.on('damage-overlay:reset-position', () => {
  if (damageWindow && !damageWindow.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const defaultWidth = 380;
    const defaultHeight = 520;
    const defaultX = Math.max(0, screenWidth - defaultWidth - 20);
    const defaultY = 40;

    damageWindow.setBounds({
      width: defaultWidth,
      height: defaultHeight,
      x: defaultX,
      y: defaultY,
    });
    saveBounds({ width: defaultWidth, height: defaultHeight, x: defaultX, y: defaultY });
  }
});

ipcMain.on('close-current-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win === damageWindow) {
      damageWindow.hide();
    } else {
      win.close();
    }
  }
});

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

app.whenReady().then(() => {
  createMainWindow();
  // We can automatically create the damage window in hidden state or when requested
  // By default, create damage window so users see both or have it ready
  createDamageWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
