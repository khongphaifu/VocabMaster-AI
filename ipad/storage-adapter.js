// storage-adapter.js - Bộ lưu trữ tương thích cho iPad & iOS Safari
export const StorageAdapter = {
  async get(keys) {
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
    for (const [k, v] of Object.entries(items)) {
      try {
        localStorage.setItem(`vm_${k}`, JSON.stringify(v));
      } catch (e) {
        console.warn('Lỗi ghi localStorage trên iPad:', e);
      }
    }
  },

  async remove(keys) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      localStorage.removeItem(`vm_${k}`);
    }
  },

  async clear() {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('vm_')) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }
};
