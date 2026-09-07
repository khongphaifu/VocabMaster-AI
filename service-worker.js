// d:/extension/service-worker.js
// Service Worker (MV3) - routes messages, calls AI, manages vocabulary storage
// Static import is required - dynamic import() is NOT allowed in service workers

import { callAI } from './utils/ai-client.js';
import { fetchFromCambridge } from './utils/cambridge-client.js';

chrome.runtime.onInstalled.addListener(() => {
  // Setup context menus
  chrome.contextMenus.create({
    id: 'vm-translate',
    title: 'VocabMaster: Dịch & phân tích',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'vm-add',
    title: 'VocabMaster: Thêm từ này vào từ điển',
    contexts: ['selection'],
  });

  // Configure side panel - must call inside onInstalled (not top-level)
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) return;
  const text = info.selectionText.trim();
  const isWord = !text.includes(' ') && text.length < 30;

  if (info.menuItemId === 'vm-translate') {
    try {
      const result = await handleTranslate(text, isWord);
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_RESULT',
        data: result,
      });
    } catch (err) {
      // Tab may not have content script (e.g. chrome:// pages)
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_ERROR',
        error: err.message,
      }).catch(() => {});
    }
  }

  if (info.menuItemId === 'vm-add' && isWord) {
    try {
      const result = await handleTranslate(text, true);
      if (result.type === 'word') {
        await handleAddWord({ word: text, ...result.word, sourceUrl: tab.url });
        chrome.action.setBadgeText({ text: '+1' });
        chrome.action.setBadgeBackgroundColor({ color: '#a6e3a1' });
        setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
      }
    } catch (err) {
      console.error('Add word failed:', err);
    }
  }
});

// Handle messages from content scripts, popup, and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'TRANSLATE') {
        const data = await handleTranslate(message.text, message.isWord, message.direction || 'auto');
        sendResponse({ success: true, data });

      } else if (message.type === 'ADD_WORD') {
        const id = await handleAddWord(message.wordData);
        sendResponse({ success: true, id });

      } else if (message.type === 'OPEN_PANEL') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) await chrome.sidePanel.open({ windowId: tab.windowId });
        sendResponse({ success: true });

      } else if (message.type === 'GET_STATS') {
        const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');
        sendResponse({
          success: true,
          stats: {
            total: vocabulary.length,
            learned: vocabulary.filter(w => w.status === 'learned').length,
            learning: vocabulary.filter(w => w.status === 'learning').length,
            new: vocabulary.filter(w => w.status === 'new').length,
          }
        });

      } else {
        sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // Keep message channel open for async response
});

const memoryCache = new Map();

async function getCachedTranslation(key, cleanText) {
  let cached = memoryCache.get(key);
  if (!cached) {
    try {
      const { dict_cache = {} } = await chrome.storage.local.get('dict_cache');
      if (dict_cache && dict_cache[key]) {
        cached = dict_cache[key];
        memoryCache.set(key, cached);
      }
    } catch (_) {}
  }

  if (cached) {
    // Validate entry integrity
    if (cached.type === 'word') {
      const w = cached.word;
      if (!w || typeof w !== 'object' || w.meaning_vi === cleanText || !w.meaning_vi) {
        memoryCache.delete(key);
        try {
          const { dict_cache = {} } = await chrome.storage.local.get('dict_cache');
          delete dict_cache[key];
          await chrome.storage.local.set({ dict_cache });
        } catch (_) {}
        return null;
      }
    }
    return cached;
  }
  return null;
}

async function setCachedTranslation(key, result) {
  if (!result) return;
  if (memoryCache.size > 200) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  memoryCache.set(key, result);

  try {
    const { dict_cache = {} } = await chrome.storage.local.get('dict_cache');
    dict_cache[key] = result;
    const keys = Object.keys(dict_cache);
    if (keys.length > 200) {
      delete dict_cache[keys[0]];
    }
    await chrome.storage.local.set({ dict_cache });
  } catch (_) {}
}

async function handleTranslate(text, isWord, direction = 'auto') {
  const cleanText = (text || '').trim();
  const cacheKey = `${cleanText.toLowerCase()}_${isWord}_${direction}`;

  // 1. FAST PERSISTENT CACHE CHECK (0ms)
  const cached = await getCachedTranslation(cacheKey, cleanText);
  if (cached) {
    return cached;
  }

  // 2. PRIORITIZE CAMBRIDGE DICTIONARY ONLINE (fast 1.8s timeout + lemmatization)
  if (isWord && (direction === 'auto' || direction === 'en-vi')) {
    try {
      const cambridgeResult = await fetchFromCambridge(cleanText);
      if (cambridgeResult && cambridgeResult.word?.meaning_vi) {
        await setCachedTranslation(cacheKey, cambridgeResult);
        return cambridgeResult;
      }
    } catch (e) {
      console.warn('Cambridge Dictionary lookup failed, falling back to AI:', e);
    }
  }

  // 3. FALLBACK TO AI (Optimized prompt & token limits for speed)
  const { aiProvider = 'gemini', apiKey = '' } =
    await chrome.storage.sync.get(['aiProvider', 'apiKey']);
  if (!apiKey) {
    throw new Error('Chưa cài API key. Mở Settings (biểu tượng extension → ⚙️) để cài đặt.');
  }

  const result = await callAI(aiProvider, apiKey, cleanText, isWord, direction);
  if (result) {
    await setCachedTranslation(cacheKey, result);
  }
  return result;
}

async function handleAddWord(wordData) {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');
  // Check for duplicate (case-insensitive)
  const existing = vocabulary.find(
    w => w.word.toLowerCase() === (wordData.word || '').toLowerCase()
  );
  if (existing) return existing.id;

  const id = Date.now();
  const entry = {
    id,
    word: wordData.word || '',
    ipa: wordData.ipa || '',
    partOfSpeech: wordData.partOfSpeech || '',
    meaning_vi: wordData.meaning_vi || wordData.definition_vi || '',
    definition_vi: wordData.definition_vi || '',
    definition_en: wordData.definition_en || '',
    examples: wordData.examples || [],
    synonyms: wordData.synonyms || [],
    antonyms: wordData.antonyms || [],
    level: wordData.level || '',
    etymology: wordData.etymology || '',
    sourceUrl: wordData.sourceUrl || '',
    addedAt: Date.now(),
    lastReviewed: 0,
    reviewCount: 0,
    correctCount: 0,
    status: 'new',
  };
  vocabulary.push(entry);
  await chrome.storage.local.set({ vocabulary });
  return id;
}
