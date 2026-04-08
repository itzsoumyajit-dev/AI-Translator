const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Hub specific
  detectBrowser: () => ipcRenderer.invoke('detect-browser'),
  startApp: () => ipcRenderer.invoke('start-app'),
  
  // Translator specific
  getLanguages: () => ipcRenderer.invoke('get-languages'),
  translate: (payload) => ipcRenderer.invoke('translate', payload),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});
