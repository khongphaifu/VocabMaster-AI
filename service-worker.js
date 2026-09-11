// d:/extension/service-worker.js
// Service Worker (MV3) - routes messages, calls AI, manages vocabulary storage
// Static import is required - dynamic import() is NOT allowed in service workers

import { callAI, testDirectAI, isPlaceholderText, findFallbackData, buildFallbackWordResponse } from './utils/ai-client.js';
import { fetchFromCambridge } from './utils/cambridge-client.js';
import { resolveDictionaryWord } from './utils/dict-resolver.js';

chrome.runtime.onInstalled.addListener((details) => {
  // On UPDATE: clear dictionary cache so words are re-fetched with improved parser
  if (details.reason === 'update') {
    chrome.storage.local.remove('dict_cache').catch(() => {});
  }

  // Cleanup corrupted cache entries (e.g. placeholder texts like "nghĩa tiếng Việt" or hallucinated translations)
  (async () => {
    try {
      const { dict_cache = {} } = await chrome.storage.local.get('dict_cache');
      let modified = false;
      for (const k of Object.keys(dict_cache)) {
        const item = dict_cache[k];
        const m = item?.word?.meaning_vi?.toLowerCase();
        const hasVerifiedSource = item?.source === 'cambridge' || item?.source === 'dictionary';
        if (
          !m ||
          !hasVerifiedSource ||
          isPlaceholderText(m) ||
          m === 'tựa ứng' ||
          m === 'nơn' ||
          m === 'máy xe' ||
          m === 'bữa ăn lớn' ||
          item?.word?.ipa_uk?.includes('sə\'fər') ||
          item?.word?.ipa_us?.includes('sə\'fər')
        ) {
          delete dict_cache[k];
          modified = true;
        }
      }
      if (modified) {
        await chrome.storage.local.set({ dict_cache });
      }
    } catch (_) {}
  })();

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

  // Seamless re-injection into existing tabs on install/update
  try {
    chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id && tab.url && !tab.url.startsWith('chrome') && !tab.url.startsWith('edge')) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
          }).catch(() => {});
          chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content/content.css']
          }).catch(() => {});
        }
      }
    }).catch(() => {});
  } catch (_) {}
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

      } else if (message.type === 'OPEN_OPTIONS') {
        chrome.runtime.openOptionsPage();
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

      } else if (message.type === 'TEST_AI_CONNECTION') {
        const testResult = await testDirectAI(message.provider, message.apiKey);
        sendResponse(testResult);

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
      const m = w?.meaning_vi?.toLowerCase();
      const hasVerifiedSource = cached.source === 'cambridge' || cached.source === 'dictionary';
      if (
        !w ||
        typeof w !== 'object' ||
        !hasVerifiedSource ||
        w.meaning_vi === cleanText ||
        !w.meaning_vi ||
        isPlaceholderText(w.meaning_vi) ||
        m === 'tựa ứng' ||
        m === 'nơn' ||
        m === 'máy xe' ||
        m === 'bữa ăn lớn' ||
        m.includes('một miếng vật liệu') ||
        m.length > 35 ||
        m.startsWith('một ') ||
        (!w.examples || w.examples.length === 0) ||
        (!w.collocations || w.collocations.length === 0) ||
        w.ipa_uk?.includes('sə\'fər') ||
        w.ipa_us?.includes('sə\'fər')
      ) {
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

  // 2. BULLETPROOF MULTI-TIER DICTIONARY RESOLUTION
  // Pipeline: 1. Offline Core Dict -> 2. Cambridge Online -> 3. Google Dict + Datamuse IPA
  let dictResult = null;
  if (isWord && (direction === 'auto' || direction === 'en-vi')) {
    try {
      dictResult = await resolveDictionaryWord(cleanText);
    } catch (e) {
      console.warn('Dictionary resolution failed, falling back:', e);
    }
  }

  // 3. AI ENRICHMENT (Optional - enriches collocations, examples, and CEFR level)
  const { aiProvider = 'gemini', apiKey = '' } =
    await chrome.storage.sync.get(['aiProvider', 'apiKey']);

  // If user has no API key configured:
  if (!apiKey) {
    if (dictResult && dictResult.word?.meaning_vi) {
      await setCachedTranslation(cacheKey, dictResult);
      return dictResult;
    }
    if (isWord) {
      const fb = findFallbackData(cleanText);
      if (fb) {
        const resp = buildFallbackWordResponse(cleanText, fb);
        await setCachedTranslation(cacheKey, resp);
        return resp;
      }
    }
    throw new Error('Chưa cài API key. Mở Settings (biểu tượng extension → ⚙️) để cài đặt.');
  }

  // If user HAS API key: call AI with ground-truth dictionary data injected (RAG)
  try {
    const result = await callAI(aiProvider, apiKey, cleanText, isWord, direction, dictResult?.word || null);
    if (result) {
      // SAFETY CHECK: If this is a word lookup, result MUST be type 'word'
      if (isWord && result.type !== 'word') {
        console.warn('AI returned non-word response for word lookup. Reverting to verified dictionary result.');
        if (dictResult && dictResult.word?.meaning_vi) {
          await setCachedTranslation(cacheKey, dictResult);
          return dictResult;
        }
      }

      // Retain verified dictionary source badge and official audio
      if (dictResult) {
        result.source = dictResult.source || 'dictionary';
        if (!result.audioUk && dictResult.audioUk) result.audioUk = dictResult.audioUk;
        if (!result.audioUs && dictResult.audioUs) result.audioUs = dictResult.audioUs;
        if (!result.cambridgeUrl && dictResult.cambridgeUrl) result.cambridgeUrl = dictResult.cambridgeUrl;
      }
      await setCachedTranslation(cacheKey, result);
      return result;
    }
  } catch (aiErr) {
    console.warn('AI call failed, checking fallbacks:', aiErr);
    if (!dictResult && isWord) {
      try {
        dictResult = await resolveDictionaryWord(cleanText);
      } catch (_) {}
    }
    if (dictResult && dictResult.word?.meaning_vi) {
      dictResult.aiWarning = aiErr.message || 'AI đang bận, hiển thị từ điển chuẩn';
      await setCachedTranslation(cacheKey, dictResult);
      return dictResult;
    }
    if (isWord) {
      const fb = findFallbackData(cleanText);
      if (fb) {
        const resp = buildFallbackWordResponse(cleanText, fb);
        resp.aiWarning = aiErr.message || 'AI đang bận, hiển thị từ điển chuẩn';
        await setCachedTranslation(cacheKey, resp);
        return resp;
      }
    }
    // For phrases/sentences: fallback to Google Translate so user is never blocked
    if (!isWord) {
      try {
        const gTrans = await fetchGoogleTranslatePhrase(cleanText, direction);
        if (gTrans) {
          const fallbackPhrase = {
            type: 'phrase',
            original: cleanText,
            translation: gTrans,
            explanation: aiErr.message ? `⚠️ [Chế độ dự phòng] ${aiErr.message}` : '',
            fallbackSource: 'google_translate',
            aiError: {
              status: aiErr.status,
              reason: aiErr.reason,
              projectId: aiErr.projectId,
              activationUrl: aiErr.activationUrl,
              credentialsUrl: aiErr.credentialsUrl
            }
          };
          return fallbackPhrase;
        }
      } catch (_) {}
    }
    throw aiErr;
  }
}

async function fetchGoogleTranslatePhrase(text, direction = 'auto') {
  const clean = (text || '').trim();
  if (!clean) return null;
  const isVi = direction === 'vi-en' || (direction === 'auto' && /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean));
  const sl = isVi ? 'vi' : 'en';
  const tl = isVi ? 'en' : 'vi';

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    let trans = '';
    if (Array.isArray(data[0])) {
      for (const seg of data[0]) {
        if (seg[0]) trans += seg[0];
      }
    }
    return trans.trim() || null;
  } catch (_) {
    return null;
  }
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
