import { contextBridge, clipboard } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  readClipboard: () => clipboard.readText(),
  writeClipboard: (text) => clipboard.writeText(text)
});
