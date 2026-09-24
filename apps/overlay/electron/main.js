import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
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
    console.error(`[Electron] Failed to load page: ${errorDescription} (${errorCode})`);
  });

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || Boolean(process.env.VITE_DEV_SERVER_URL);
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    console.log(`[Electron] Loading dev URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);
  } else {
    console.log('[Electron] Loading production file');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC listener to dynamically toggle mouse click pass-through
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

