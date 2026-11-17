// d:/extension/ipad/app.js
// VocabMaster AI - iPadOS PWA Edition (Full AI, Touch PDF/Article Selection, 2-Way Cloud Sync)

import { resolveDictionaryWord } from '../utils/dict-resolver.js';
import {
  callAI,
  testDirectAI,
  isPlaceholderText,
  findFallbackData,
  buildFallbackWordResponse
} from '../utils/ai-client.js';
import {
  normalizeVocabEntry,
  mergeSyncState,
  syncWithGitHubGist,
  encodePairingPayload,
  decodePairingPayload
} from '../utils/cloud-sync.js';
import { StorageAdapter } from './storage-adapter.js';
import { createIpadPdfController } from './pdf-ipad.js';

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const state = {
  currentResult: null,
  vocabList: [],
  tombstones: {},
  customLexicon: {},
  settings: {
    aiProvider: 'gemini',
    apiKeys: {
      gemini: '',
      groq: '',
      openai: '',
      claude: ''
    },
    autoSpeech: true,
    autoClipboard: false,
    cloudSyncEnabled: false,
    cloudSyncToken: '',
    cloudSyncGistId: '',
    lastCloudSyncAt: ''
  },
  fcIndex: 0,
  quizScore: 0,
  currentQuizWord: null,
  typingStreak: 0,
  currentTypingWord: null,
  lastClipboardText: ''
};

let syncDebounceTimer = null;
let isSyncingNow = false;
let toastTimer = null;

// ==========================================
// 0. IOS-STYLE TOAST, CONFIRM MODAL & ESCAPING
// ==========================================
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showToast(msg, type = 'info') {
  const el = document.getElementById('vm-toast');
  if (!el) return;
  el.textContent = msg;
  el.style.borderColor = type === 'error' ? 'var(--danger)' : (type === 'success' ? 'var(--success)' : 'var(--apple-blue)');
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

function showConfirm(title, text) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('vm-confirm-overlay');
    const titleEl = document.getElementById('vm-confirm-title');
    const textEl = document.getElementById('vm-confirm-text');
    const okBtn = document.getElementById('vm-confirm-ok');
    const cancelBtn = document.getElementById('vm-confirm-cancel');

    if (!overlay) return resolve(false);
    titleEl.textContent = title;
    textEl.textContent = text;
    overlay.classList.remove('hidden');

    const cleanup = (result) => {
      overlay.classList.add('hidden');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// ==========================================
// 1. PERSISTENCE & 2-WAY CLOUD SYNC ENGINE
// ==========================================
async function persistLocalState() {
  await StorageAdapter.set({
    vocab_list: state.vocabList,
    vocab_tombstones: state.tombstones,
    user_custom_lexicon: state.customLexicon,
    settings: state.settings
  });
}

function updateSyncPill(status, text) {
  const pill = document.getElementById('btn-sync-pill');
  const ico = document.getElementById('sync-pill-ico');
  const txt = document.getElementById('sync-pill-text');
  if (!pill) return;
  pill.classList.remove('syncing', 'synced', 'error');
  if (status) pill.classList.add(status);
  if (ico) ico.textContent = status === 'syncing' ? '⏳' : (status === 'error' ? '⚠️' : (status === 'synced' ? '✅' : '☁️'));
  if (txt && text) txt.textContent = text;
}

function updateCloudStatusText() {
  const el = document.getElementById('ipad-cloud-status');
  if (!el) return;
  if (!state.settings.cloudSyncToken) {
    el.textContent = 'Chưa liên kết Cloud. Dán Mã Ghép Nối hoặc Token GitHub để đồng bộ với Chrome PC.';
    return;
  }
  const t = state.settings.lastCloudSyncAt
    ? new Date(state.settings.lastCloudSyncAt).toLocaleString('vi-VN')
    : 'Chưa đồng bộ lần nào';
  const gistTxt = state.settings.cloudSyncGistId ? `Gist: ${state.settings.cloudSyncGistId}` : 'Sẽ tự tạo Gist khi bấm Đồng bộ';
  el.textContent = `✓ Đã cấu hình (${gistTxt}) · Lần cuối: ${t}`;
}

function scheduleCloudSync(delayMs = 1500) {
  if (!state.settings.cloudSyncEnabled || !state.settings.cloudSyncToken) return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    runCloudSync(true).catch(() => {});
  }, delayMs);
}

async function runCloudSync(silent = false) {
  const token = (state.settings.cloudSyncToken || '').trim();
  if (!token) {
    if (!silent) showToast('Vui lòng nhập GitHub Token hoặc dán Mã Ghép Nối ở tab Cài đặt.', 'error');
    return null;
  }
  if (isSyncingNow) return null;
  isSyncingNow = true;
  updateSyncPill('syncing', 'Đang sync...');

  try {
    const res = await syncWithGitHubGist({
      token,
      gistId: state.settings.cloudSyncGistId || '',
      localVocab: state.vocabList,
      localTombstones: state.tombstones,
      localLexicon: state.customLexicon
    });

    state.vocabList = res.vocabulary;
    state.tombstones = res.tombstones;
    state.customLexicon = res.customLexicon;
    state.settings.cloudSyncGistId = res.gistId;
    state.settings.lastCloudSyncAt = res.syncedAt;

    await persistLocalState();
    updateNavBadge();
    refreshSettingsInputs();
    updateSyncPill('synced', `${state.vocabList.length} từ`);

    if (document.getElementById('pane-library')?.classList.contains('active')) {
      renderLibrary();
    }
    if (!silent) {
      showToast(`✅ Đã đồng bộ 2 chiều (${state.vocabList.length} từ)!`, 'success');
    }
    return res;
  } catch (err) {
    console.warn('Cloud sync error:', err);
    updateSyncPill('error', 'Lỗi Sync');
    if (!silent) showToast(`❌ ${err.message}`, 'error');
    return null;
  } finally {
    isSyncingNow = false;
  }
}

async function loadAllState() {
  const data = await StorageAdapter.get([
    'vocab_list',
    'vocab_tombstones',
    'user_custom_lexicon',
    'settings'
  ]);

  const rawList = Array.isArray(data.vocab_list) ? data.vocab_list : [];
  state.vocabList = rawList.map(normalizeVocabEntry).filter(Boolean);
  state.tombstones = data.vocab_tombstones && typeof data.vocab_tombstones === 'object' ? data.vocab_tombstones : {};
  state.customLexicon = data.user_custom_lexicon && typeof data.user_custom_lexicon === 'object' ? data.user_custom_lexicon : {};

  if (data.settings) {
    const s = data.settings;
    state.settings = {
      ...state.settings,
      ...s,
      apiKeys: {
        gemini: s.apiKeys?.gemini || s.geminiApiKey || '',
        groq: s.apiKeys?.groq || s.groqApiKey || '',
        openai: s.apiKeys?.openai || '',
        claude: s.apiKeys?.claude || ''
      }
    };
  }

  updateNavBadge();
  updateSyncPill(state.settings.cloudSyncToken ? 'synced' : '', state.settings.cloudSyncToken ? `${state.vocabList.length} từ` : 'Sync');
}

function updateNavBadge() {
  const b = document.getElementById('nav-count');
  if (b) b.textContent = String(state.vocabList.length);
}

// ==========================================
// 2. TRANSLATION ENGINE (WORDS + AI PHRASES)
// ==========================================
async function fetchGoogleTranslatePhrase(text, direction = 'auto') {
  const clean = (text || '').trim();
  if (!clean) return null;
  const isVi = direction === 'vi-en' || (direction === 'auto' && VIETNAMESE_REGEX.test(clean));
  const sl = isVi ? 'vi' : 'en';
  const tl = isVi ? 'en' : 'vi';

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
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

function getActiveAiCredentials() {
  const provider = state.settings.aiProvider || 'gemini';
  const key = (state.settings.apiKeys?.[provider] || '').trim();
  if (key) return { provider, apiKey: key };
  for (const p of ['groq', 'gemini', 'openai', 'claude']) {
    const k = (state.settings.apiKeys?.[p] || '').trim();
    if (k) return { provider: p, apiKey: k };
  }
  return { provider, apiKey: '' };
}

export async function performLookupOrTranslate(rawText, contextSentence = '') {
  const cleanText = (rawText || '').replace(/[\s\u00A0]+/g, ' ').trim();
  if (!cleanText) return null;

  const isViInput = VIETNAMESE_REGEX.test(cleanText);
  const isWord = !cleanText.includes(' ') && cleanText.length < 35;
  const customMeaning = state.customLexicon[cleanText.toLowerCase()];

  // 1. Single English word fast multi-tier dictionary (0ms offline -> ~130ms Google Dict + FreeDict + Datamuse)
  let dictResult = null;
  if (isWord && !isViInput) {
    try {
      dictResult = await resolveDictionaryWord(cleanText, contextSentence);
      if (dictResult?.word?.meaning_vi && !isPlaceholderText(dictResult.word.meaning_vi)) {
        if (customMeaning) {
          dictResult.word.meaning_vi = customMeaning;
          dictResult.word.isUserCustom = true;
        }
        return dictResult;
      }
    } catch (e) {
      console.warn('Dictionary resolve warning:', e);
    }
  }

  // 2. AI Engine (Phrases, Sentences, Vietnamese->English, or obscure words)
  const { provider, apiKey } = getActiveAiCredentials();
  if (apiKey) {
    try {
      const aiRes = await callAI(
        provider,
        apiKey,
        cleanText,
        isWord,
        'auto',
        dictResult?.word || null,
        contextSentence
      );
      if (aiRes) {
        if (customMeaning && aiRes.word) {
          aiRes.word.meaning_vi = customMeaning;
          aiRes.word.isUserCustom = true;
        }
        if (dictResult) {
          aiRes.source = dictResult.source || 'dictionary';
          if (!aiRes.audioUk && dictResult.audioUk) aiRes.audioUk = dictResult.audioUk;
          if (!aiRes.audioUs && dictResult.audioUs) aiRes.audioUs = dictResult.audioUs;
        }
        return aiRes;
      }
    } catch (aiErr) {
      console.warn('AI call failed, checking fallbacks:', aiErr);
    }
  }

  // 3. Offline / Free Fallbacks (zero blocking even without API Key)
  if (isWord && !isViInput) {
    if (dictResult?.word?.meaning_vi) return dictResult;
    const fb = findFallbackData(cleanText);
    if (fb) return buildFallbackWordResponse(cleanText, fb);
  }

  const gTrans = await fetchGoogleTranslatePhrase(cleanText, 'auto');
  if (gTrans) {
    return {
      type: 'phrase',
      original: cleanText,
      translation: gTrans,
      alternative_translation: '',
      explanation: apiKey
        ? '⚠️ AI đang bận, hiển thị bản dịch nhanh Google.'
        : '💡 Mẹo: Thêm Gemini hoặc Groq API Key miễn phí trong tab ⚙️ Cài đặt để AI phân tích ngữ pháp & trích xuất từ vựng từng câu.',
      vocabulary: [],
      fallbackSource: 'google_translate'
    };
  }

  throw new Error('Không thể dịch từ/câu này lúc này. Kiểm tra kết nối mạng hoặc thêm API key.');
}

// ==========================================
// 3. SAVE WORD / AUDIO / NAVIGATION
// ==========================================
function switchTab(tabKey) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${tabKey}`));

  if (tabKey === 'library') {
    renderLibrary();
    runCloudSync(true).catch(() => {});
  } else if (tabKey === 'flashcard') {
    renderFlashcard();
  } else if (tabKey === 'quiz') {
    startQuizRound();
  } else if (tabKey === 'typing') {
    startTypingRound();
  } else if (tabKey === 'settings') {
    refreshSettingsInputs();
  }
}

function initNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  const btnTheme = document.getElementById('btn-theme');
  btnTheme?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');
    const isLight = document.body.classList.contains('light-theme');
    btnTheme.textContent = isLight ? '☀️' : '🌙';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', isLight ? '#f8fafc' : '#0f172a');
  });

  document.getElementById('btn-sync-pill')?.addEventListener('click', () => runCloudSync(false));
}

async function saveNormalizedWord(payload) {
  const entry = normalizeVocabEntry({
    ...payload,
    addedAt: Date.now(),
    updatedAt: Date.now(),
    status: 'new'
  });
  if (!entry || !entry.word) return false;

  const key = entry.word.toLowerCase();
  const existing = state.vocabList.find(w => w.word.toLowerCase() === key);
  if (existing) {
    showToast(`Từ "${entry.word}" đã có trong sổ từ chung!`);
    return false;
  }

  if (state.tombstones[key]) {
    delete state.tombstones[key];
  }

  state.vocabList.unshift(entry);
  await persistLocalState();
  updateNavBadge();
  showToast(`✅ Đã lưu "${entry.word}" (đồng bộ PC ↔ iPad)!`, 'success');
  scheduleCloudSync(800);
  return true;
}

function playAudio(word, accent = 'us', audioUrl = '') {
  if (!word && !audioUrl) return;
  if (audioUrl) {
    try {
      const a = new Audio(audioUrl);
      let handled = false;
      const fallback = () => {
        if (handled) return;
        handled = true;
        speakFallback(word, accent);
      };
      a.addEventListener('error', fallback, { once: true });
      a.play().catch(fallback);
      return;
    } catch (_) {}
  }
  speakFallback(word, accent);
}

function speakFallback(word, accent = 'us') {
  if (!word || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

// ==========================================
// 4. LOOKUP RENDERING (WORD + PHRASE)
// ==========================================
function renderLookupResultCard(res) {
  state.currentResult = res;
  const wordCard = document.getElementById('lookup-result');
  const phraseCard = document.getElementById('phrase-result');
  document.getElementById('lookup-empty')?.classList.add('hidden');

  const isWord = res.type === 'word' || (res.word && typeof res.word === 'object');

  if (isWord) {
    phraseCard?.classList.add('hidden');
    wordCard?.classList.remove('hidden');

    const w = res.word || {};
    const displayWord = res.original || w.word_root || '';
    const rootWord = (w.word_root && w.word_root.toLowerCase() !== displayWord.toLowerCase()) ? w.word_root : '';

    document.getElementById('res-word').textContent = displayWord;
    const rootPill = document.getElementById('res-root-tag');
    if (rootPill) {
      if (rootWord) {
        rootPill.textContent = `➔ ${rootWord}`;
        rootPill.classList.remove('hidden');
      } else {
        rootPill.classList.add('hidden');
      }
    }

    document.getElementById('res-pos').textContent = w.partOfSpeech || w.pos || 'word';
    document.getElementById('res-cefr').textContent = (w.level || 'B1').toUpperCase();
    document.getElementById('res-source').textContent = res.source === 'cambridge'
      ? '📚 Cambridge Online'
      : (res.source === 'dictionary' ? '📖 Từ điển chuẩn' : '✨ AI Thuần Việt');

    const ipaUk = w.ipa_uk || w.ipa || w.ipa_us || '';
    const ipaUs = w.ipa_us || w.ipa || ipaUk;
    document.getElementById('res-ipa-uk').textContent = ipaUk || '—';
    document.getElementById('res-ipa-us').textContent = ipaUs || '—';

    document.getElementById('res-meaning-vi').textContent = w.meaning_vi || w.definition_vi || '';
    document.getElementById('res-def-vi').textContent = (w.definition_vi && w.definition_vi !== w.meaning_vi) ? w.definition_vi : '';
    document.getElementById('res-def-en').textContent = w.definition_en || '';

    const saveBtn = document.getElementById('btn-add-vocab');
    const already = state.vocabList.some(item => item.word.toLowerCase() === displayWord.toLowerCase());
    if (saveBtn) {
      saveBtn.textContent = already ? '✓ Đã có trong sổ' : '+ Lưu vào sổ';
    }

    // Synonyms
    const synBox = document.getElementById('res-synonyms');
    synBox.innerHTML = '';
    if (w.synonyms?.length) {
      document.getElementById('block-synonyms')?.classList.remove('hidden');
      w.synonyms.slice(0, 6).forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'chip-item';
        chip.textContent = s;
        chip.addEventListener('click', () => {
          document.getElementById('lookup-input').value = s;
          triggerLookup(s);
        });
        synBox.appendChild(chip);
      });
    } else {
      document.getElementById('block-synonyms')?.classList.add('hidden');
    }

    // Collocations
    const colBox = document.getElementById('res-collocations');
    colBox.innerHTML = '';
    if (w.collocations?.length) {
      document.getElementById('block-collocations')?.classList.remove('hidden');
      w.collocations.slice(0, 4).forEach(c => {
        const phraseText = typeof c === 'string' ? c : (c.phrase || c.collocation || '');
        const meaning = typeof c === 'string' ? '' : (c.meaning_vi || '');
        if (!phraseText) return;
        const div = document.createElement('div');
        div.className = 'touch-list-item';
        div.innerHTML = `<strong>${escHtml(phraseText)}</strong>${meaning ? `: <span style="color: var(--text-sub);">${escHtml(meaning)}</span>` : ''}`;
        colBox.appendChild(div);
      });
    } else {
      document.getElementById('block-collocations')?.classList.add('hidden');
    }

    // Word Family
    const famBox = document.getElementById('res-family');
    famBox.innerHTML = '';
    if (w.word_family?.length) {
      document.getElementById('block-family')?.classList.remove('hidden');
      w.word_family.slice(0, 4).forEach(f => {
        const div = document.createElement('div');
        div.className = 'touch-list-item';
        div.innerHTML = `<em>${escHtml(f.pos || '')}</em> <strong>${escHtml(f.word || '')}</strong>${f.meaning_vi ? `: <span>${escHtml(f.meaning_vi)}</span>` : ''}`;
        famBox.appendChild(div);
      });
    } else {
      document.getElementById('block-family')?.classList.add('hidden');
    }

    // Examples
    const exBox = document.getElementById('res-examples');
    exBox.innerHTML = '';
    if (w.examples?.length) {
      document.getElementById('block-examples')?.classList.remove('hidden');
      w.examples.slice(0, 3).forEach(ex => {
        const text = typeof ex === 'string' ? ex : (ex.en || '');
        if (!text) return;
        const div = document.createElement('div');
        div.className = 'touch-list-item';
        div.textContent = `"${text}"`;
        exBox.appendChild(div);
      });
    } else {
      document.getElementById('block-examples')?.classList.add('hidden');
    }

    if (state.settings.autoSpeech && !VIETNAMESE_REGEX.test(displayWord)) {
      playAudio(rootWord || displayWord, 'us', res.audioUs || res.audioUk);
    }
  } else {
    // PHRASE / SENTENCE CARD
    wordCard?.classList.add('hidden');
    phraseCard?.classList.remove('hidden');

    document.getElementById('phrase-original').textContent = `"${res.original || ''}"`;
    document.getElementById('phrase-translation').textContent = res.translation || '';
    document.getElementById('phrase-badge').textContent = res.fallbackSource === 'google_translate'
      ? 'Google Translate'
      : '✨ AI Thuần Việt';

    const altBlock = document.getElementById('block-phrase-alt');
    const altEl = document.getElementById('phrase-alt');
    if (res.alternative_translation) {
      altEl.textContent = res.alternative_translation;
      altBlock?.classList.remove('hidden');
    } else {
      altBlock?.classList.add('hidden');
    }

    const expBlock = document.getElementById('block-phrase-explain');
    const expEl = document.getElementById('phrase-explain');
    if (res.explanation) {
      expEl.textContent = res.explanation;
      expBlock?.classList.remove('hidden');
    } else {
      expBlock?.classList.add('hidden');
    }

    const vocabBlock = document.getElementById('block-phrase-vocab');
    const vocabListEl = document.getElementById('phrase-vocab-list');
    vocabListEl.innerHTML = '';
    if (Array.isArray(res.vocabulary) && res.vocabulary.length) {
      vocabBlock?.classList.remove('hidden');
      res.vocabulary.forEach(item => {
        const wText = item.word || '';
        if (!wText) return;
        const row = document.createElement('div');
        row.className = 'touch-list-item';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        row.innerHTML = `
          <div>
            <strong>${escHtml(wText)}</strong>
            ${item.ipa ? `<span style="font-family:monospace;font-size:12px;color:var(--text-muted);margin-left:6px;">${escHtml(item.ipa)}</span>` : ''}
            ${item.pos ? `<span style="font-size:11px;color:var(--apple-blue);margin-left:6px;">(${escHtml(item.pos)})</span>` : ''}
            <div style="font-size:13px;color:var(--text-sub);margin-top:2px;">${escHtml(item.meaning || item.meaning_vi || '')}</div>
          </div>
          <button type="button" class="btn-touch-save btn-compact">+ Lưu</button>
        `;
        row.querySelector('button')?.addEventListener('click', async (ev) => {
          const b = ev.currentTarget;
          const ok = await saveNormalizedWord({
            word: wText,
            ipa: item.ipa || '',
            partOfSpeech: item.pos || '',
            meaning_vi: item.meaning || item.meaning_vi || '',
            definition_vi: item.meaning || item.meaning_vi || '',
            examples: [res.original],
            sourceUrl: 'iPad Sentence Extraction'
          });
          if (ok) {
            b.textContent = '✓ Đã lưu';
            b.disabled = true;
          }
        });
        vocabListEl.appendChild(row);
      });
    } else {
      vocabBlock?.classList.add('hidden');
    }
  }
}

async function triggerLookup(textOverride = null) {
  const input = document.getElementById('lookup-input');
  const text = (textOverride !== null ? textOverride : (input?.value || '')).trim();
  if (!text) return;

  const loading = document.getElementById('lookup-loading');
  loading?.classList.remove('hidden');
  document.getElementById('lookup-result')?.classList.add('hidden');
  document.getElementById('phrase-result')?.classList.add('hidden');
  document.getElementById('lookup-empty')?.classList.add('hidden');

  try {
    const res = await performLookupOrTranslate(text);
    if (res) {
      renderLookupResultCard(res);
    } else {
      showToast(`Không tìm thấy dữ liệu cho "${text}"`, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loading?.classList.add('hidden');
  }
}

function initLookup() {
  const input = document.getElementById('lookup-input');
  const btnSearch = document.getElementById('btn-search');
  const btnClear = document.getElementById('btn-clear');
  const btnPaste = document.getElementById('btn-paste-translate');
  const toggleClip = document.getElementById('toggle-auto-clipboard');

  btnSearch?.addEventListener('click', () => triggerLookup());
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerLookup();
  });
  btnClear?.addEventListener('click', () => {
    if (input) {
      input.value = '';
      input.focus();
    }
  });

  btnPaste?.addEventListener('click', async () => {
    try {
      const clip = (await navigator.clipboard.readText()).trim();
      if (!clip) {
        showToast('Clipboard đang trống!', 'error');
        return;
      }
      state.lastClipboardText = clip;
      if (input) input.value = clip;
      await triggerLookup(clip);
    } catch (_) {
      showToast('Hãy chạm vào ô tìm kiếm và bấm Dán (Paste) trực tiếp trên bàn phím iPad!', 'error');
      input?.focus();
    }
  });

  if (toggleClip) {
    toggleClip.checked = !!state.settings.autoClipboard;
    toggleClip.addEventListener('change', async () => {
      state.settings.autoClipboard = toggleClip.checked;
      await persistLocalState();
      if (toggleClip.checked) {
        showToast('✓ Đã bật tự dịch khi quay lại từ app khác!');
      }
    });
  }

  document.getElementById('btn-add-vocab')?.addEventListener('click', async (ev) => {
    if (!state.currentResult?.word) return;
    const w = state.currentResult.word;
    const saved = await saveNormalizedWord({
      word: state.currentResult.original || w.word_root,
      ...w,
      sourceUrl: 'iPad App Lookup'
    });
    if (saved) ev.currentTarget.textContent = '✓ Đã lưu';
  });

  document.getElementById('btn-audio-uk')?.addEventListener('click', () => {
    const res = state.currentResult;
    if (res) playAudio(res.word?.word_root || res.original, 'uk', res.audioUk);
  });

  document.getElementById('btn-audio-us')?.addEventListener('click', () => {
    const res = state.currentResult;
    if (res) playAudio(res.word?.word_root || res.original, 'us', res.audioUs);
  });

  document.getElementById('btn-phrase-audio')?.addEventListener('click', () => {
    if (state.currentResult?.original) playAudio(state.currentResult.original, 'us');
  });

  document.getElementById('btn-copy-phrase')?.addEventListener('click', async () => {
    if (!state.currentResult?.translation) return;
    try {
      await navigator.clipboard.writeText(state.currentResult.translation);
      showToast('✓ Đã sao chép bản dịch!', 'success');
    } catch (_) {}
  });
}

// ==========================================
// 5. READER (PDF + ARTICLE) & FLOATING ✨ SELECTION TRIGGER
// ==========================================
function renderBottomSheetResult(res) {
  const titleEl = document.getElementById('sheet-title');
  const bodyEl = document.getElementById('sheet-body');
  if (!bodyEl) return;

  const isWord = res.type === 'word' || (res.word && typeof res.word === 'object');
  if (isWord) {
    const w = res.word || {};
    const orig = res.original || w.word_root || '';
    const already = state.vocabList.some(item => item.word.toLowerCase() === orig.toLowerCase());
    if (titleEl) titleEl.textContent = `✨ ${orig}`;

    bodyEl.innerHTML = `
      <div class="result-top" style="margin-bottom:12px;">
        <div>
          <div class="tags-row" style="margin-top:0;">
            <span class="tag tag-pos">${escHtml(w.partOfSpeech || 'word')}</span>
            <span class="tag tag-cefr">${escHtml((w.level || 'B1').toUpperCase())}</span>
          </div>
          <div style="margin-top:8px;font-size:13px;color:var(--text-sub);font-family:monospace;">
            🇬🇧 ${escHtml(w.ipa_uk || w.ipa || '')} &nbsp; 🇺🇸 ${escHtml(w.ipa_us || w.ipa || '')}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" id="sheet-audio-btn" class="btn-touch-audio">🔊</button>
          <button type="button" id="sheet-save-btn" class="btn-touch-save">${already ? '✓ Đã lưu' : '+ Lưu vào sổ'}</button>
        </div>
      </div>

      <div class="block-meaning">
        <div class="block-label">Nghĩa Thuần Việt</div>
        <div class="meaning-highlight">${escHtml(w.meaning_vi || w.definition_vi || '')}</div>
      </div>

      ${w.definition_vi && w.definition_vi !== w.meaning_vi ? `<div class="def-vi" style="margin-bottom:6px;">${escHtml(w.definition_vi)}</div>` : ''}
      ${w.definition_en ? `<div class="def-en" style="margin-bottom:12px;">${escHtml(w.definition_en)}</div>` : ''}

      ${w.collocations?.length ? `
        <div class="block-section">
          <div class="block-label">Collocations</div>
          <div class="items-column">
            ${w.collocations.slice(0, 3).map(c => `<div class="touch-list-item"><strong>${escHtml(c.phrase || c.collocation || c)}</strong>${c.meaning_vi ? `: ${escHtml(c.meaning_vi)}` : ''}</div>`).join('')}
          </div>
        </div>
      ` : ''}

      ${w.examples?.length ? `
        <div class="block-section">
          <div class="block-label">Ví dụ ngữ cảnh</div>
          <div class="items-column">
            ${w.examples.slice(0, 2).map(ex => `<div class="touch-list-item">"${escHtml(typeof ex === 'string' ? ex : (ex.en || ''))}"</div>`).join('')}
          </div>
        </div>
      ` : ''}
    `;

    document.getElementById('sheet-audio-btn')?.addEventListener('click', () => {
      playAudio(w.word_root || orig, 'us', res.audioUs || res.audioUk);
    });
    document.getElementById('sheet-save-btn')?.addEventListener('click', async (ev) => {
      const ok = await saveNormalizedWord({ word: orig, ...w, sourceUrl: 'iPad Reader' });
      if (ok) ev.currentTarget.textContent = '✓ Đã lưu';
    });

    if (state.settings.autoSpeech && !VIETNAMESE_REGEX.test(orig)) {
      playAudio(w.word_root || orig, 'us', res.audioUs || res.audioUk);
    }
  } else {
    if (titleEl) titleEl.textContent = '✨ Dịch câu & đoạn văn';
    bodyEl.innerHTML = `
      <div class="phrase-original-box">"${escHtml(res.original || '')}"</div>
      <div class="block-meaning">
        <div class="block-label">Bản dịch tự nhiên</div>
        <div class="meaning-highlight">${escHtml(res.translation || '')}</div>
      </div>
      ${res.alternative_translation ? `<div class="block-section"><div class="block-label">Cách diễn đạt khác</div><div class="def-vi">${escHtml(res.alternative_translation)}</div></div>` : ''}
      ${res.explanation ? `<div class="block-section"><div class="block-label">Giải thích</div><div class="def-vi">${escHtml(res.explanation)}</div></div>` : ''}
      ${Array.isArray(res.vocabulary) && res.vocabulary.length ? `
        <div class="block-section">
          <div class="block-label">Từ vựng quan trọng trong câu</div>
          <div class="items-column" id="sheet-phrase-vocab"></div>
        </div>
      ` : ''}
    `;

    const listEl = document.getElementById('sheet-phrase-vocab');
    if (listEl) {
      res.vocabulary.forEach(item => {
        if (!item.word) return;
        const row = document.createElement('div');
        row.className = 'touch-list-item';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.innerHTML = `
          <div>
            <strong>${escHtml(item.word)}</strong> <span style="font-size:12px;color:var(--apple-blue);">${escHtml(item.pos || '')}</span>
            <div style="font-size:13px;color:var(--text-sub);">${escHtml(item.meaning || item.meaning_vi || '')}</div>
          </div>
          <button type="button" class="btn-touch-save btn-compact">+ Lưu</button>
        `;
        row.querySelector('button')?.addEventListener('click', async (ev) => {
          const ok = await saveNormalizedWord({
            word: item.word,
            ipa: item.ipa || '',
            partOfSpeech: item.pos || '',
            meaning_vi: item.meaning || item.meaning_vi || '',
            examples: [res.original],
            sourceUrl: 'iPad Reader'
          });
          if (ok) {
            ev.currentTarget.textContent = '✓ Đã lưu';
            ev.currentTarget.disabled = true;
          }
        });
        listEl.appendChild(row);
      });
    }
  }
}

function initReaderAndSelection() {
  createIpadPdfController({ showToast });

  const modePdfBtn = document.getElementById('mode-btn-pdf');
  const modeArtBtn = document.getElementById('mode-btn-article');
  const pdfView = document.getElementById('reader-pdf-view');
  const artView = document.getElementById('reader-article-view');

  modePdfBtn?.addEventListener('click', () => {
    modePdfBtn.classList.add('active');
    modeArtBtn?.classList.remove('active');
    pdfView?.classList.remove('hidden');
    artView?.classList.add('hidden');
  });

  modeArtBtn?.addEventListener('click', () => {
    modeArtBtn.classList.add('active');
    modePdfBtn?.classList.remove('active');
    artView?.classList.remove('hidden');
    pdfView?.classList.add('hidden');
  });

  // Article Paste & Render Mode
  const artTextarea = document.getElementById('article-textarea');
  const artEditorBox = document.getElementById('article-editor-box');
  const artDisplayBox = document.getElementById('article-display-box');
  const artBody = document.getElementById('article-reader-body');

  document.getElementById('btn-article-paste')?.addEventListener('click', async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && artTextarea) artTextarea.value = clip;
    } catch (_) {
      showToast('Hãy chạm vào ô văn bản và bấm Dán trực tiếp!', 'error');
      artTextarea?.focus();
    }
  });

  document.getElementById('btn-article-render')?.addEventListener('click', () => {
    const txt = (artTextarea?.value || '').trim();
    if (!txt) {
      showToast('Hãy dán văn bản tiếng Anh vào trước nhé!', 'error');
      return;
    }
    if (artBody) artBody.textContent = txt;
    artEditorBox?.classList.add('hidden');
    artDisplayBox?.classList.remove('hidden');
  });

  document.getElementById('btn-article-edit')?.addEventListener('click', () => {
    artDisplayBox?.classList.add('hidden');
    artEditorBox?.classList.remove('hidden');
  });

  // Floating ✨ Selection Trigger specifically inside Reader (PDF + Article)
  const triggerBtn = document.getElementById('reader-float-trigger');
  const sheetOverlay = document.getElementById('reader-sheet-overlay');
  const sheetBody = document.getElementById('sheet-body');
  const sheetTitle = document.getElementById('sheet-title');
  let pendingSelectedText = '';
  let selDebounce = null;

  function hideTrigger() {
    triggerBtn?.classList.add('hidden');
  }

  function evaluateReaderSelection() {
    if (!sheetOverlay?.classList.contains('hidden')) {
      hideTrigger();
      return;
    }
    const pdfPaneActive = document.getElementById('pane-reader')?.classList.contains('active');
    if (!pdfPaneActive) {
      hideTrigger();
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      hideTrigger();
      return;
    }
    const text = sel.toString().replace(/[\s\u00A0]+/g, ' ').trim();
    if (!text || text.length < 1 || text.length > 2500) {
      hideTrigger();
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = container.nodeType === 3 ? container.parentElement : container;
    if (!el || (!el.closest('#ipad-pdf-pages') && !el.closest('#article-reader-body'))) {
      hideTrigger();
      return;
    }

    pendingSelectedText = text;
    let rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const rects = range.getClientRects();
      if (rects?.length) rect = rects[0];
    }

    // Place BELOW selection on iPadOS so Apple's native Copy/Look Up black menu above doesn't cover ✨
    let top = rect ? (rect.bottom + 14) : (window.innerHeight - 130);
    let left = rect ? rect.left : (window.innerWidth / 2 - 55);
    const maxTop = window.innerHeight - 115;
    if (top > maxTop) {
      top = Math.max(70, (rect ? rect.top - 54 : maxTop));
    }
    left = Math.max(12, Math.min(left, window.innerWidth - 130));

    if (triggerBtn) {
      triggerBtn.style.top = `${Math.round(top)}px`;
      triggerBtn.style.left = `${Math.round(left)}px`;
      triggerBtn.classList.remove('hidden');
    }
  }

  document.addEventListener('selectionchange', () => {
    clearTimeout(selDebounce);
    selDebounce = setTimeout(evaluateReaderSelection, 220);
  });
  document.addEventListener('touchend', () => {
    setTimeout(evaluateReaderSelection, 110);
  }, { passive: true });
  document.addEventListener('mouseup', () => {
    setTimeout(evaluateReaderSelection, 30);
  });

  triggerBtn?.addEventListener('click', async () => {
    const text = pendingSelectedText;
    hideTrigger();
    if (!text) return;

    if (sheetTitle) sheetTitle.textContent = '⏳ Đang phân tích AI...';
    if (sheetBody) sheetBody.innerHTML = '<div class="ios-spinner"></div><p style="text-align:center;color:var(--text-sub)">Đang giải nghĩa chuẩn Cambridge & AI Thuần Việt...</p>';
    sheetOverlay?.classList.remove('hidden');

    try {
      const res = await performLookupOrTranslate(text);
      if (res) renderBottomSheetResult(res);
    } catch (err) {
      if (sheetBody) sheetBody.innerHTML = `<p style="color:var(--danger);text-align:center;padding:20px;">❌ ${escHtml(err.message)}</p>`;
    }
  });

  document.getElementById('sheet-close')?.addEventListener('click', () => {
    sheetOverlay?.classList.add('hidden');
  });
  sheetOverlay?.addEventListener('click', (e) => {
    if (e.target === sheetOverlay) sheetOverlay.classList.add('hidden');
  });
}

// ==========================================
// 6. LIBRARY TAB + JSON/CSV EXPORT & IMPORT
// ==========================================
const STATUS_CYCLE = ['new', 'learning', 'learned'];
const STATUS_LABELS = { new: 'Mới', learning: 'Đang học', learned: 'Đã thuộc' };

function renderLibrary() {
  const grid = document.getElementById('lib-grid');
  const empty = document.getElementById('lib-empty');
  const query = (document.getElementById('lib-search')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('lib-status-filter')?.value || 'all';

  const filtered = state.vocabList.filter(w => {
    const matchQ = !query || w.word.toLowerCase().includes(query) || (w.meaning_vi || w.definition_vi || '').toLowerCase().includes(query);
    const matchS = filter === 'all' || (w.status || 'new') === filter;
    return matchQ && matchS;
  });

  if (!filtered.length) {
    if (grid) grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  if (!grid) return;
  grid.innerHTML = '';

  filtered.forEach(w => {
    const card = document.createElement('div');
    card.className = 'touch-list-item';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.style.gap = '10px';
    const st = w.status || 'new';
    const meaning = w.meaning_vi || w.definition_vi || '';

    card.innerHTML = `
      <div style="min-width:0;flex:1;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size: 16.5px; font-weight: 800;">${escHtml(w.word)}</span>
          ${w.partOfSpeech ? `<span style="font-size: 12px; color: var(--apple-blue); font-weight: 600;">(${escHtml(w.partOfSpeech)})</span>` : ''}
          <button type="button" class="lib-status-btn lib-status-${escHtml(st)}" title="Chạm để đổi trạng thái">${escHtml(STATUS_LABELS[st] || 'Mới')}</button>
        </div>
        <div style="font-size: 14px; color: var(--text-main); font-weight:600; margin-top: 4px;">${escHtml(meaning)}</div>
        ${w.ipa ? `<div style="font-size: 12px; color: var(--text-muted); font-family: monospace; margin-top:2px;">${escHtml(w.ipa)}</div>` : ''}
      </div>
      <div style="display: flex; gap: 6px; flex-shrink:0;">
        <button type="button" class="btn-touch-audio" data-speak="${escHtml(w.word)}">🔊</button>
        <button type="button" class="btn-touch-clear" data-del-word="${escHtml(w.word)}" style="color: var(--danger);">🗑️</button>
      </div>
    `;

    card.querySelector('[data-speak]')?.addEventListener('click', () => playAudio(w.word, 'us'));

    card.querySelector('.lib-status-btn')?.addEventListener('click', async () => {
      const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(w.status || 'new') + 1) % STATUS_CYCLE.length];
      w.status = nextStatus;
      w.updatedAt = Date.now();
      await persistLocalState();
      renderLibrary();
      scheduleCloudSync(1200);
    });

    card.querySelector('[data-del-word]')?.addEventListener('click', async () => {
      const yes = await showConfirm('Xóa từ vựng?', `Xóa từ "${w.word}" khỏi sổ từ chung (sẽ đồng bộ xóa trên cả PC)?`);
      if (!yes) return;
      const wordKey = w.word.toLowerCase().trim();
      state.tombstones[wordKey] = Date.now();
      state.vocabList = state.vocabList.filter(item => item.word.toLowerCase().trim() !== wordKey);
      await persistLocalState();
      updateNavBadge();
      renderLibrary();
      scheduleCloudSync(800);
    });

    grid.appendChild(card);
  });
}

function downloadFileBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function initLibEvents() {
  document.getElementById('lib-search')?.addEventListener('input', renderLibrary);
  document.getElementById('lib-status-filter')?.addEventListener('change', renderLibrary);
  document.getElementById('btn-lib-sync')?.addEventListener('click', () => runCloudSync(false));

  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    if (!state.vocabList.length) return showToast('Chưa có từ để xuất!', 'error');
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      vocabulary: state.vocabList,
      tombstones: state.tombstones,
      customLexicon: state.customLexicon
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadFileBlob(blob, `VocabMaster_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    showToast('✅ Đã xuất file Backup JSON!', 'success');
  });

  const importInput = document.getElementById('ipad-import-file');
  document.getElementById('btn-import-json')?.addEventListener('click', () => importInput?.click());
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const raw = JSON.parse(text);
        const incoming = Array.isArray(raw) ? raw : (raw.vocabulary || raw.vocab_list || []);
        const merged = mergeSyncState(
          { vocabulary: state.vocabList, tombstones: state.tombstones, customLexicon: state.customLexicon },
          { vocabulary: incoming, tombstones: raw.tombstones || {}, customLexicon: raw.customLexicon || {} }
        );
        state.vocabList = merged.vocabulary;
        state.tombstones = merged.tombstones;
        state.customLexicon = merged.customLexicon;
      } else {
        // Basic CSV import compatible with Chrome Extension CSV
        const lines = text.replace(/\r/g, '').split('\n').slice(1);
        const imported = [];
        for (const line of lines) {
          if (!line.trim()) continue;
          const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols[0]) {
            imported.push({
              word: cols[0],
              ipa: cols[1] || '',
              partOfSpeech: cols[2] || '',
              meaning_vi: cols[3] || '',
              definition_vi: cols[3] || '',
              status: 'new',
              addedAt: Date.now()
            });
          }
        }
        const merged = mergeSyncState(
          { vocabulary: state.vocabList, tombstones: state.tombstones, customLexicon: state.customLexicon },
          { vocabulary: imported }
        );
        state.vocabList = merged.vocabulary;
      }
      await persistLocalState();
      updateNavBadge();
      renderLibrary();
      scheduleCloudSync(800);
      showToast(`✅ Đã nhập xong! Sổ hiện có ${state.vocabList.length} từ.`, 'success');
    } catch (err) {
      showToast(`❌ Lỗi đọc file: ${err.message}`, 'error');
    }
    e.target.value = '';
  });

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    if (!state.vocabList.length) return showToast('Chưa có từ để xuất!', 'error');
    let csv = 'Từ,IPA,Từ loại,Nghĩa VI,Định nghĩa EN,Level,Trạng thái\n';
    state.vocabList.forEach(w => {
      const escCsv = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
      csv += [
        escCsv(w.word),
        escCsv(w.ipa),
        escCsv(w.partOfSpeech),
        escCsv(w.meaning_vi || w.definition_vi),
        escCsv(w.definition_en),
        escCsv(w.level),
        escCsv(w.status)
      ].join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadFileBlob(blob, `VocabMaster_iPad_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('✅ Đã xuất file CSV!', 'success');
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    const yes = await showConfirm('Xóa toàn bộ sổ từ?', 'Thao tác này sẽ xóa tất cả từ vựng trên iPad (với đồng bộ Cloud sẽ đánh dấu xóa).');
    if (!yes) return;
    const now = Date.now();
    state.vocabList.forEach(w => {
      state.tombstones[w.word.toLowerCase().trim()] = now;
    });
    state.vocabList = [];
    await persistLocalState();
    updateNavBadge();
    renderLibrary();
    scheduleCloudSync(800);
    showToast('Đã xóa sạch sổ từ.');
  });
}

// ==========================================
// 7. STUDY PROGRESS + FLASHCARDS + QUIZ + TYPING
// ==========================================
async function recordWordPractice(wordObj, isCorrect) {
  if (!wordObj) return;
  wordObj.reviewCount = (wordObj.reviewCount || 0) + 1;
  wordObj.lastReviewed = Date.now();
  wordObj.updatedAt = Date.now();
  if (isCorrect) wordObj.correctCount = (wordObj.correctCount || 0) + 1;
  const acc = wordObj.correctCount / wordObj.reviewCount;
  if (wordObj.reviewCount >= 5 && acc >= 0.8) wordObj.status = 'learned';
  else if (wordObj.reviewCount >= 2 && wordObj.status === 'new') wordObj.status = 'learning';
  await persistLocalState();
  scheduleCloudSync(2500);
}

function renderFlashcard() {
  const card = document.getElementById('fc-touch-card');
  card?.classList.remove('flipped');

  if (!state.vocabList.length) {
    document.getElementById('fc-word').textContent = 'Chưa có từ vựng';
    document.getElementById('fc-ipa').textContent = 'Hãy lưu từ để bắt đầu';
    document.getElementById('fc-meaning').textContent = 'Chạm tab "Tra & Dịch"';
    document.getElementById('fc-ex').textContent = '';
    document.getElementById('fc-counter').textContent = '0 / 0';
    return;
  }

  if (state.fcIndex >= state.vocabList.length) state.fcIndex = 0;
  if (state.fcIndex < 0) state.fcIndex = state.vocabList.length - 1;

  const w = state.vocabList[state.fcIndex];
  document.getElementById('fc-word').textContent = w.word;
  document.getElementById('fc-ipa').textContent = w.ipa || '';
  document.getElementById('fc-pos').textContent = w.partOfSpeech || 'word';
  document.getElementById('fc-meaning').textContent = w.meaning_vi || w.definition_vi || '';
  document.getElementById('fc-ex').textContent = w.examples?.[0] || '';
  document.getElementById('fc-counter').textContent = `${state.fcIndex + 1} / ${state.vocabList.length}`;
}

function initFlashcardGestures() {
  const card = document.getElementById('fc-touch-card');
  card?.addEventListener('click', () => card.classList.toggle('flipped'));

  let touchStartX = 0;
  let touchStartY = 0;
  card?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  card?.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      state.fcIndex += dx < 0 ? 1 : -1;
      renderFlashcard();
    }
  }, { passive: true });

  document.getElementById('fc-btn-next')?.addEventListener('click', () => { state.fcIndex++; renderFlashcard(); });
  document.getElementById('fc-btn-prev')?.addEventListener('click', () => { state.fcIndex--; renderFlashcard(); });
  document.getElementById('fc-audio')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.vocabList[state.fcIndex]) playAudio(state.vocabList[state.fcIndex].word, 'us');
  });
  document.getElementById('fc-btn-learned')?.addEventListener('click', async () => {
    const w = state.vocabList[state.fcIndex];
    if (w) {
      w.status = 'learned';
      w.updatedAt = Date.now();
      await persistLocalState();
      scheduleCloudSync(1500);
      state.fcIndex++;
      renderFlashcard();
    }
  });
}

function startQuizRound() {
  const grid = document.getElementById('quiz-opts');
  const msg = document.getElementById('quiz-msg');
  const btnNext = document.getElementById('quiz-next-btn');

  msg?.classList.add('hidden');
  btnNext?.classList.add('hidden');
  if (!grid) return;
  grid.innerHTML = '';

  const validWords = state.vocabList.filter(w => (w.meaning_vi || w.definition_vi));
  if (validWords.length < 4) {
    grid.innerHTML = '<p style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 20px;">Lưu ít nhất 4 từ vựng có nghĩa để kích hoạt bài trắc nghiệm!</p>';
    document.getElementById('quiz-word').textContent = '...';
    return;
  }

  const target = validWords[Math.floor(Math.random() * validWords.length)];
  const targetMeaning = target.meaning_vi || target.definition_vi;
  state.currentQuizWord = target;
  document.getElementById('quiz-word').textContent = target.word;

  const others = validWords
    .filter(w => w.word.toLowerCase() !== target.word.toLowerCase())
    .map(w => w.meaning_vi || w.definition_vi)
    .filter(m => m && m !== targetMeaning);

  const uniqueDistractors = [...new Set(others)].sort(() => 0.5 - Math.random()).slice(0, 3);
  const choices = [targetMeaning, ...uniqueDistractors].sort(() => 0.5 - Math.random());

  choices.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'quiz-touch-btn';
    btn.textContent = ch;
    btn.addEventListener('click', async () => {
      grid.querySelectorAll('.quiz-touch-btn').forEach(b => b.disabled = true);
      const ok = ch === targetMeaning;
      if (ok) {
        btn.classList.add('correct');
        msg.textContent = '✓ Chuẩn xác!';
        msg.style.color = 'var(--success)';
        state.quizScore += 10;
      } else {
        btn.classList.add('wrong');
        msg.textContent = `✕ Nghĩa đúng là: ${targetMeaning}`;
        msg.style.color = 'var(--danger)';
        grid.querySelectorAll('.quiz-touch-btn').forEach(b => {
          if (b.textContent === targetMeaning) b.classList.add('correct');
        });
      }
      await recordWordPractice(target, ok);
      document.getElementById('quiz-points').textContent = `Điểm: ${state.quizScore}`;
      msg.classList.remove('hidden');
      btnNext?.classList.remove('hidden');
    });
    grid.appendChild(btn);
  });
}

function initQuizEvents() {
  document.getElementById('quiz-next-btn')?.addEventListener('click', startQuizRound);
  document.getElementById('quiz-audio')?.addEventListener('click', () => {
    if (state.currentQuizWord) playAudio(state.currentQuizWord.word, 'us');
  });
}

function startTypingRound() {
  const input = document.getElementById('typing-input');
  const msg = document.getElementById('typing-msg');
  msg?.classList.add('hidden');
  if (input) input.value = '';

  if (!state.vocabList.length) {
    document.getElementById('typing-hint').textContent = 'Chưa có từ vựng trong sổ';
    return;
  }

  const target = state.vocabList[Math.floor(Math.random() * state.vocabList.length)];
  state.currentTypingWord = target;
  document.getElementById('typing-hint').textContent = target.meaning_vi || target.definition_vi || '';

  if (state.settings.autoSpeech) playAudio(target.word, 'us');
}

function initTypingEvents() {
  const input = document.getElementById('typing-input');
  const btn = document.getElementById('typing-submit');
  const msg = document.getElementById('typing-msg');

  const check = async () => {
    if (!state.currentTypingWord) return;
    const val = (input?.value || '').trim().toLowerCase();
    const target = state.currentTypingWord.word.trim().toLowerCase();
    const ok = val === target;

    if (ok) {
      msg.textContent = `✓ Chính xác! "${target}"`;
      msg.style.color = 'var(--success)';
      state.typingStreak++;
      setTimeout(startTypingRound, 1100);
    } else {
      msg.textContent = `✕ Chưa đúng! Từ cần gõ là: "${target}"`;
      msg.style.color = 'var(--danger)';
      state.typingStreak = 0;
    }
    await recordWordPractice(state.currentTypingWord, ok);
    document.getElementById('typing-counter').textContent = `Chuỗi đúng: ${state.typingStreak}`;
    msg.classList.remove('hidden');
  };

  btn?.addEventListener('click', check);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
  });
  document.getElementById('typing-audio')?.addEventListener('click', () => {
    if (state.currentTypingWord) playAudio(state.currentTypingWord.word, 'us');
  });
}

// ==========================================
// 8. SETTINGS, PAIRING CODE & SAFARI USERSCRIPT SETUP
// ==========================================
function refreshSettingsInputs() {
  const s = state.settings;
  const prov = document.getElementById('set-provider');
  const gKey = document.getElementById('set-gemini-key');
  const qKey = document.getElementById('set-groq-key');
  const oKey = document.getElementById('set-openai-key');
  const cKey = document.getElementById('set-claude-key');
  const speech = document.getElementById('set-auto-speech');
  const ghTok = document.getElementById('set-gh-token');
  const gistId = document.getElementById('set-gist-id');
  const cloudEn = document.getElementById('set-cloud-enabled');

  if (prov && s.aiProvider) prov.value = s.aiProvider;
  if (gKey) gKey.value = s.apiKeys?.gemini || '';
  if (qKey) qKey.value = s.apiKeys?.groq || '';
  if (oKey) oKey.value = s.apiKeys?.openai || '';
  if (cKey) cKey.value = s.apiKeys?.claude || '';
  if (speech) speech.checked = !!s.autoSpeech;
  if (ghTok) ghTok.value = s.cloudSyncToken || '';
  if (gistId) gistId.value = s.cloudSyncGistId || '';
  if (cloudEn) cloudEn.checked = !!s.cloudSyncEnabled;
  updateCloudStatusText();
}

async function applyPairingConfig(rawString) {
  const parsed = decodePairingPayload(rawString);
  if (!parsed) return false;

  if (parsed.ghToken) state.settings.cloudSyncToken = parsed.ghToken;
  if (parsed.gistId) state.settings.cloudSyncGistId = parsed.gistId;
  if (parsed.ghToken) state.settings.cloudSyncEnabled = true;
  if (parsed.aiProvider) state.settings.aiProvider = parsed.aiProvider;
  if (parsed.apiKeys) {
    state.settings.apiKeys = {
      ...state.settings.apiKeys,
      ...parsed.apiKeys
    };
  }

  await persistLocalState();
  refreshSettingsInputs();
  showToast('🔗 Đã nạp cấu hình ghép nối từ PC! Đang đồng bộ từ vựng...', 'success');
  await runCloudSync(false);
  return true;
}

function initSettings() {
  refreshSettingsInputs();

  document.getElementById('btn-apply-pair')?.addEventListener('click', async () => {
    const val = document.getElementById('set-pair-code')?.value.trim();
    if (!val) return showToast('Vui lòng dán Mã hoặc Link ghép nối từ Chrome PC.', 'error');
    const ok = await applyPairingConfig(val);
    if (!ok) showToast('❌ Mã ghép nối không hợp lệ!', 'error');
    else document.getElementById('set-pair-code').value = '';
  });

  document.getElementById('btn-save-sync')?.addEventListener('click', async () => {
    state.settings.cloudSyncToken = document.getElementById('set-gh-token')?.value.trim() || '';
    state.settings.cloudSyncGistId = document.getElementById('set-gist-id')?.value.trim() || '';
    state.settings.cloudSyncEnabled = !!(document.getElementById('set-cloud-enabled')?.checked);
    await persistLocalState();
    await runCloudSync(false);
  });

  document.getElementById('btn-copy-userscript-config')?.addEventListener('click', async () => {
    const code = encodePairingPayload({
      ghToken: state.settings.cloudSyncToken || '',
      gistId: state.settings.cloudSyncGistId || '',
      aiProvider: state.settings.aiProvider,
      apiKeys: state.settings.apiKeys
    });
    try {
      await navigator.clipboard.writeText(code);
      showToast('✅ Đã copy Mã Cấu Hình cho Safari Userscript!', 'success');
    } catch (_) {
      showToast('❌ Trình duyệt chặn clipboard.', 'error');
    }
  });

  document.getElementById('btn-copy-shortcut-url')?.addEventListener('click', async () => {
    const base = window.location.href.split('#')[0].split('?')[0];
    const shortcutUrl = `${base}?q=`;
    try {
      await navigator.clipboard.writeText(shortcutUrl);
      showToast('✅ Đã copy Link Apple Shortcut!', 'success');
    } catch (_) {}
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    state.settings.aiProvider = document.getElementById('set-provider')?.value || 'gemini';
    state.settings.apiKeys = {
      gemini: document.getElementById('set-gemini-key')?.value.trim() || '',
      groq: document.getElementById('set-groq-key')?.value.trim() || '',
      openai: document.getElementById('set-openai-key')?.value.trim() || '',
      claude: document.getElementById('set-claude-key')?.value.trim() || ''
    };
    state.settings.autoSpeech = !!(document.getElementById('set-auto-speech')?.checked);
    await persistLocalState();
    showToast('✅ Đã lưu cài đặt AI trên iPad!', 'success');
  });

  document.getElementById('btn-test-ai-ipad')?.addEventListener('click', async () => {
    const prov = document.getElementById('set-provider')?.value || 'gemini';
    const keyMap = {
      gemini: document.getElementById('set-gemini-key')?.value.trim() || '',
      groq: document.getElementById('set-groq-key')?.value.trim() || '',
      openai: document.getElementById('set-openai-key')?.value.trim() || '',
      claude: document.getElementById('set-claude-key')?.value.trim() || ''
    };
    const key = keyMap[prov];
    const msgEl = document.getElementById('save-success-msg');
    if (!key) {
      showToast(`❌ Vui lòng nhập API key cho ${prov}`, 'error');
      return;
    }
    if (msgEl) {
      msgEl.classList.remove('hidden');
      msgEl.style.color = 'var(--apple-blue)';
      msgEl.textContent = `⏳ Đang kiểm tra kết nối ${prov}...`;
    }
    const res = await testDirectAI(prov, key);
    if (msgEl) {
      msgEl.style.color = res?.ok ? 'var(--success)' : 'var(--danger)';
      msgEl.textContent = res?.ok ? `✅ ${res.msg}` : `❌ ${res?.msg || 'Lỗi kết nối AI'}`;
    }
  });
}

// ==========================================
// 9. BOOTSTRAP, URL SCHEMES (?q=, #pair=) & AUTO CLIPBOARD
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
  await loadAllState();

  initNavigation();
  initLookup();
  initReaderAndSelection();
  initLibEvents();
  initFlashcardGestures();
  initQuizEvents();
  initTypingEvents();
  initSettings();

  // 1. Handle Magic Pairing Hash (#pair=...) cleanly & scrub from address bar
  if (window.location.hash && window.location.hash.includes('pair=')) {
    const hashStr = window.location.hash;
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (_) {}
    await applyPairingConfig(hashStr);
  } else if (state.settings.cloudSyncEnabled && state.settings.cloudSyncToken) {
    runCloudSync(true).catch(() => {});
  }

  // 2. Handle Apple Shortcuts Deep Link (?q=... & ?tab=...)
  const params = new URLSearchParams(window.location.search);
  const queryText = (params.get('q') || '').trim();
  const targetTab = (params.get('tab') || '').trim();

  if (queryText) {
    switchTab('lookup');
    const input = document.getElementById('lookup-input');
    if (input) input.value = queryText;
    await triggerLookup(queryText);
  } else if (targetTab && document.getElementById(`pane-${targetTab}`)) {
    switchTab(targetTab);
  }

  // 3. Auto-sync & Slide-Over Auto-Clipboard when switching back to iPad app
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      if (state.settings.cloudSyncEnabled && state.settings.cloudSyncToken) {
        runCloudSync(true).catch(() => {});
      }
      if (state.settings.autoClipboard && document.getElementById('pane-lookup')?.classList.contains('active')) {
        try {
          const clip = (await navigator.clipboard.readText()).trim();
          if (clip && clip.length > 0 && clip.length <= 450 && clip !== state.lastClipboardText) {
            state.lastClipboardText = clip;
            const input = document.getElementById('lookup-input');
            if (input) input.value = clip;
            await triggerLookup(clip);
          }
        } catch (_) {}
      }
    }
  });
});
