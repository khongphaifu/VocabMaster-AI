// storage-adapter.js - Cầu nối lưu trữ tương thích cho Windows Desktop & Web
export const StorageAdapter = {
  async get(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
    }
    const result = {};
    if (!keys) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('vm_')) {
          const rawKey = k.replace(/^vm_/, '');
          try {
            result[rawKey] = JSON.parse(localStorage.getItem(k));
          } catch (_) {
            result[rawKey] = localStorage.getItem(k);
          }
        }
      }
      return result;
    }

    const keyList = Array.isArray(keys) ? keys : (typeof keys === 'string' ? [keys] : Object.keys(keys));
    for (const k of keyList) {
      const stored = localStorage.getItem(`vm_${k}`);
      if (stored !== null) {
        try {
          result[k] = JSON.parse(stored);
        } catch (_) {
          result[k] = stored;
        }
      } else if (typeof keys === 'object' && !Array.isArray(keys) && keys[k] !== undefined) {
        result[k] = keys[k];
      }
    }
    return result;
  },

  async set(items) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => chrome.storage.local.set(items, resolve));
    }
    for (const [k, v] of Object.entries(items)) {
      localStorage.setItem(`vm_${k}`, JSON.stringify(v));
    }
  },

  async remove(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
    }
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      localStorage.removeItem(`vm_${k}`);
    }
  },

  async clear() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => chrome.storage.local.clear(resolve));
    }
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('vm_')) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }
};

// Polyfill window.chrome.storage.local nếu chạy trên môi trường Electron/Trình duyệt chuẩn
if (typeof window !== 'undefined') {
  window.chrome = window.chrome || {};
  window.chrome.storage = window.chrome.storage || {};
  if (!window.chrome.storage.local) {
    window.chrome.storage.local = StorageAdapter;
  }
}
