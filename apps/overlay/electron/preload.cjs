const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  toggleDamageOverlay: () => {
    ipcRenderer.send('damage-overlay:toggle');
  },
  showDamageOverlay: () => {
    ipcRenderer.send('damage-overlay:show');
  },
  hideDamageOverlay: () => {
    ipcRenderer.send('damage-overlay:hide');
  },
  resetDamagePosition: () => {
    ipcRenderer.send('damage-overlay:reset-position');
  },
  closeCurrentWindow: () => {
    ipcRenderer.send('close-current-window');
  },
  onDamageVisibilityChanged: (callback) => {
    const handler = (_event, visible) => callback(visible);
    ipcRenderer.on('damage-overlay:visibility-changed', handler);
    return () => ipcRenderer.removeListener('damage-overlay:visibility-changed', handler);
  },
});
