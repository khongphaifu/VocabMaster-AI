// d:/extension/scripts/build-safari-userscript.mjs
// Compiles shared repo modules (modern-lexicon.js, content.css, cloud-sync merge logic)
// into a single self-contained Safari Userscript (ipad/vocabmaster.user.js) with zero logic duplication.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function stripExports(jsCode) {
  return jsCode
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')
    .replace(/^\s*export\s+(?=(?:const|let|var|function|async\s+function|class)\b)/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, '');
}

const lexiconRaw = fs.readFileSync(path.join(ROOT, 'utils', 'modern-lexicon.js'), 'utf8');
const cloudSyncRaw = fs.readFileSync(path.join(ROOT, 'utils', 'cloud-sync.js'), 'utf8');
const contentCssRaw = fs.readFileSync(path.join(ROOT, 'content', 'content.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const lexiconBundle = stripExports(lexiconRaw);
const cloudSyncBundle = stripExports(cloudSyncRaw)
  // Keep only pure normalization & merge & pairing helpers (http handled via GM_xmlhttpRequest below)
  .split('/**\n * Computes canonical stable digest')[0];

const userscript = `// ==UserScript==
// @name         VocabMaster AI — Dịch Thuần Việt & Lưu Sổ Chung (Safari iPad)
// @namespace    https://github.com/khongphaifu/VocabMaster-AI
// @version      ${manifest.version || '1.1.0'}
// @description  Bôi đen từ/câu bất kỳ trên mọi website ở Safari iPad -> hiện nút ✨ dịch AI Thuần Việt + đồng bộ 2 chiều thẳng về Sổ Chrome PC & iPad PWA!
// @author       VocabMaster AI
// @match        *://*/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @connect      *
// @downloadURL  https://khongphaifu.github.io/VocabMaster-AI/ipad/vocabmaster.user.js
// @updateURL    https://khongphaifu.github.io/VocabMaster-AI/ipad/vocabmaster.user.js
// ==/UserScript==

(function () {
  'use strict';
  if (window.__VM_SAFARI_USERSCRIPT_LOADED__) return;
  // Avoid double UI if Chrome/Orion extension content script is already running on the page
  if (typeof window.__VOCAB_MASTER_CLEANUP__ === 'function') return;
  window.__VM_SAFARI_USERSCRIPT_LOADED__ = true;

  // =========================================================================
  // 1. GM STORAGE & CORS-BYPASS HTTP ADAPTER (Safari Userscripts App Store)
  // =========================================================================
  async function gmGet(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue(key, fallback);
      if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') return await GM.getValue(key, fallback);
    } catch (_) {}
    try {
      const v = localStorage.getItem('vm_us_' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch (_) { return fallback; }
  }

  async function gmSet(key, val) {
    try {
      if (typeof GM_setValue === 'function') { GM_setValue(key, val); return; }
      if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') { await GM.setValue(key, val); return; }
    } catch (_) {}
    try { localStorage.setItem('vm_us_' + key, JSON.stringify(val)); } catch (_) {}
  }

  function gmRequest(url, options = {}) {
    const reqFn = typeof GM_xmlhttpRequest === 'function'
      ? GM_xmlhttpRequest
      : (typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function' ? GM.xmlHttpRequest : null);

    if (!reqFn) {
      return fetch(url, options).then(async (r) => ({
        ok: r.ok,
        status: r.status,
        text: await r.text()
      }));
    }

    return new Promise((resolve, reject) => {
      reqFn({
        method: options.method || 'GET',
        url,
        headers: options.headers || {},
        data: options.body || undefined,
        timeout: options.timeout || 12000,
        onload: (res) => resolve({
          ok: res.status >= 200 && res.status < 300,
          status: res.status,
          text: res.responseText || ''
        }),
        onerror: (err) => reject(new Error(err?.error || 'Network error')),
        ontimeout: () => reject(new Error('Request timeout'))
      });
    });
  }

  // =========================================================================
  // 2. SHARED PURE VIETNAMESE LEXICON & CLOUD MERGE ENGINE (Auto-generated)
  // =========================================================================
${lexiconBundle}
${cloudSyncBundle}

  // =========================================================================
  // 3. AUTO-HANDSHAKE SETTINGS FROM IPAD PWA WHEN VISITED IN SAFARI
  // =========================================================================
  async function tryAutoSyncSettingsFromPWA() {
    try {
      if (location.pathname.includes('/ipad') || location.hostname.includes('khongphaifu.github.io')) {
        const raw = localStorage.getItem('vm_settings');
        if (raw) {
          const pwaSet = JSON.parse(raw);
          if (pwaSet && typeof pwaSet === 'object') {
            const cur = await getConfig();
            const merged = {
              ...cur,
              aiProvider: pwaSet.aiProvider || cur.aiProvider,
              apiKeys: { ...(cur.apiKeys || {}), ...(pwaSet.apiKeys || {}) },
              cloudSyncToken: pwaSet.cloudSyncToken || cur.cloudSyncToken,
              cloudSyncGistId: pwaSet.cloudSyncGistId || cur.cloudSyncGistId
            };
            await gmSet('vm_config', merged);
          }
        }
      }
    } catch (_) {}
  }

  async function getConfig() {
    const def = {
      aiProvider: 'gemini',
      apiKeys: { gemini: '', groq: '', openai: '', claude: '' },
      cloudSyncToken: '',
      cloudSyncGistId: ''
    };
    const stored = await gmGet('vm_config', null);
    if (stored && typeof stored === 'object') return { ...def, ...stored };
    if (typeof stored === 'string') {
      try { return { ...def, ...JSON.parse(stored) }; } catch (_) {}
    }
    return def;
  }

  // =========================================================================
  // 4. MULTI-TIER DICTIONARY, AI CALLER & 2-WAY GIST SYNC (VIA GM CORS)
  // =========================================================================
  const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

  async function fetchGoogleDict(text, isWord) {
    const clean = (text || '').trim();
    const isVi = VIETNAMESE_REGEX.test(clean);
    const sl = isVi ? 'vi' : 'en';
    const tl = isVi ? 'en' : 'vi';
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + sl + '&tl=' + tl + '&dt=t&dt=bd&dt=md&dt=ss&dt=ex&q=' + encodeURIComponent(clean);
    const res = await gmRequest(url, { timeout: 3500 });
    if (!res.ok) return null;
    const data = JSON.parse(res.text);
    const trans = Array.isArray(data[0]) ? data[0].map(s => s[0] || '').join('').trim() : '';
    if (!isWord) {
      return trans ? { type: 'phrase', original: clean, translation: trans, alternative_translation: '', explanation: '', vocabulary: [] } : null;
    }
    const altMeanings = [];
    let pos = data[12]?.[0]?.[0] || data[1]?.[0]?.[0] || 'word';
    if (Array.isArray(data[1]?.[0]?.[1])) {
      for (const m of data[1][0][1]) {
        if (m && !isArchaicOrAwkward(m)) altMeanings.push(sanitizeVietnamese(m));
      }
    }
    const primary = sanitizeVietnamese(altMeanings[0] || trans);
    if (!primary) return null;
    return {
      type: 'word',
      source: 'dictionary',
      original: clean,
      word: {
        word_root: clean,
        ipa_uk: '',
        ipa_us: '',
        partOfSpeech: pos,
        level: 'B1',
        meaning_vi: primary,
        definition_vi: data[12]?.[0]?.[1]?.[0]?.[0] || primary,
        definition_en: '',
        examples: [],
        collocations: [],
        word_family: [],
        synonyms: []
      }
    };
  }

  async function fetchEnrichPhonetics(word) {
    try {
      const r = await gmRequest('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.toLowerCase()), { timeout: 2200 });
      if (!r.ok) return null;
      const arr = JSON.parse(r.text);
      const entry = arr?.[0];
      if (!entry) return null;
      let ipa = entry.phonetic || '';
      let audio = '';
      for (const p of (entry.phonetics || [])) {
        if (!ipa && p.text) ipa = p.text;
        if (!audio && p.audio) audio = p.audio;
      }
      const ex = [];
      for (const m of (entry.meanings || [])) {
        for (const d of (m.definitions || [])) {
          if (d.example && ex.length < 2) ex.push(d.example);
        }
      }
      return { ipa, audio, examples: ex };
    } catch (_) { return null; }
  }

  async function callAISafari(cfg, text, isWord, contextSentence) {
    const pref = cfg.aiProvider || 'gemini';
    let provider = pref;
    let apiKey = (cfg.apiKeys?.[pref] || '').trim();
    if (!apiKey) {
      for (const p of ['groq', 'gemini', 'openai', 'claude']) {
        if ((cfg.apiKeys?.[p] || '').trim()) { provider = p; apiKey = cfg.apiKeys[p].trim(); break; }
      }
    }
    if (!apiKey) return null;

    const prompt = isWord
      ? \`Phân tích từ tiếng Anh "\${text}"\${contextSentence ? \` trong ngữ cảnh: "\${contextSentence}"\` : ''} theo chuẩn Cambridge English-Vietnamese, nghĩa Thuần Việt ngắn gọn tự nhiên. Trả về ONLY JSON: {"type":"word","original":"\${text}","word":{"word_root":"","ipa_uk":"","ipa_us":"","partOfSpeech":"","level":"","meaning_vi":"","definition_vi":"","definition_en":"","examples":[""],"collocations":[{"phrase":"","meaning_vi":""}],"synonyms":[""]}}\`
      : \`Dịch câu/đoạn sau sang tiếng Việt (nếu là tiếng Việt thì dịch sang tiếng Anh) thật tự nhiên, thuần Việt, không máy móc: "\${text}". Trả về ONLY JSON: {"type":"phrase","original":"\${text}","translation":"...","alternative_translation":"...","explanation":"Giải thích ngắn gọn bằng tiếng Việt","vocabulary":[{"word":"","ipa":"","pos":"","meaning":""}]}\`;

    let raw = '';
    if (provider === 'gemini') {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
      const res = await gmRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) throw new Error('Gemini ' + res.status);
      const j = JSON.parse(res.text);
      raw = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'groq' || provider === 'openai') {
      const url = provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
      const res = await gmRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });
      if (!res.ok) throw new Error(provider + ' ' + res.status);
      const j = JSON.parse(res.text);
      raw = j?.choices?.[0]?.message?.content || '';
    } else if (provider === 'claude') {
      const res = await gmRequest('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 900,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) throw new Error('Claude ' + res.status);
      const j = JSON.parse(res.text);
      raw = j?.content?.[0]?.text || '';
    }

    const cleaned = raw.replace(/^\\s*\`\`\`(?:json)?/i, '').replace(/\`\`\`\\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  }

  async function translateTextSafari(text, contextSentence) {
    const clean = (text || '').trim();
    const isVi = VIETNAMESE_REGEX.test(clean);
    const isWord = !clean.includes(' ') && clean.length < 35;

    if (isWord && !isVi) {
      const lexHit = lookupModernLexicon(clean);
      if (lexHit) {
        const sense = disambiguateByContext(clean, contextSentence);
        const phon = await fetchEnrichPhonetics(lexHit.root || clean);
        return {
          type: 'word',
          source: 'dictionary',
          original: clean,
          audioUs: phon?.audio || '',
          word: {
            word_root: lexHit.root || clean,
            ipa_uk: phon?.ipa || '',
            ipa_us: phon?.ipa || '',
            partOfSpeech: sense?.pos || lexHit.pos || 'word',
            level: 'B1',
            meaning_vi: sense?.meaning_vi || lexHit.meaning_vi,
            definition_vi: sense?.meaning_vi || lexHit.meaning_vi,
            definition_en: '',
            examples: phon?.examples || [],
            collocations: [],
            synonyms: []
          }
        };
      }
    }

    const cfg = await getConfig();
    if (isWord && !isVi) {
      const [gRes, phon] = await Promise.all([
        fetchGoogleDict(clean, true).catch(() => null),
        fetchEnrichPhonetics(clean).catch(() => null)
      ]);
      if (gRes && gRes.word) {
        if (phon?.ipa) { gRes.word.ipa_uk = phon.ipa; gRes.word.ipa_us = phon.ipa; }
        if (phon?.audio) gRes.audioUs = phon.audio;
        if (phon?.examples?.length) gRes.word.examples = phon.examples;
        return gRes;
      }
    }

    try {
      const aiRes = await callAISafari(cfg, clean, isWord, contextSentence);
      if (aiRes) return aiRes;
    } catch (_) {}

    const gFallback = await fetchGoogleDict(clean, isWord).catch(() => null);
    if (gFallback) return gFallback;

    throw new Error('Không thể dịch lúc này. Kiểm tra mạng hoặc bấm ⚙️ trong thẻ để cấu hình API/Sync.');
  }

  async function saveAndSyncWordSafari(wordPayload) {
    const cfg = await getConfig();
    const entry = normalizeVocabEntry({ ...wordPayload, sourceUrl: location.href, addedAt: Date.now(), updatedAt: Date.now() });
    if (!entry) return { saved: false };

    let localList = await gmGet('vm_local_vocab', []);
    if (!Array.isArray(localList)) localList = [];
    if (!localList.some(w => w.word.toLowerCase() === entry.word.toLowerCase())) {
      localList.unshift(entry);
      await gmSet('vm_local_vocab', localList);
    }

    if (!cfg.cloudSyncToken) {
      return { saved: true, synced: false };
    }

    // Sync directly to shared GitHub Secret Gist via GM_xmlhttpRequest
    const headers = {
      'Authorization': 'Bearer ' + cfg.cloudSyncToken.trim(),
      'Accept': 'application/vnd.github+json'
    };

    let gistId = (cfg.cloudSyncGistId || '').trim();
    if (!gistId) {
      const listRes = await gmRequest('https://api.github.com/gists?per_page=30&_t=' + Date.now(), { headers });
      if (listRes.ok) {
        const gists = JSON.parse(listRes.text);
        const found = gists.find(g => g.files && g.files['vocabmaster-sync-v1.json']);
        if (found) gistId = found.id;
      }
    }
    if (!gistId) return { saved: true, synced: false };

    const getRes = await gmRequest('https://api.github.com/gists/' + encodeURIComponent(gistId) + '?_t=' + Date.now(), { headers });
    if (!getRes.ok) throw new Error('GitHub Sync lỗi ' + getRes.status);
    const gistData = JSON.parse(getRes.text);
    const rawContent = gistData.files?.['vocabmaster-sync-v1.json']?.content || '{}';
    let remote = {};
    try { remote = JSON.parse(rawContent); } catch (_) {}

    const merged = mergeSyncState(
      { vocabulary: [entry], tombstones: {}, customLexicon: {} },
      { vocabulary: remote.vocabulary || [], tombstones: remote.tombstones || {}, customLexicon: remote.customLexicon || {} }
    );

    const patchBody = JSON.stringify({
      files: {
        'vocabmaster-sync-v1.json': {
          content: JSON.stringify({
            schemaVersion: 1,
            lastSyncedAt: new Date().toISOString(),
            vocabulary: merged.vocabulary,
            tombstones: merged.tombstones,
            customLexicon: merged.customLexicon
          }, null, 2)
        }
      }
    });

    const patchRes = await gmRequest('https://api.github.com/gists/' + encodeURIComponent(gistId), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: patchBody
    });
    if (!patchRes.ok) throw new Error('Không thể ghi Gist (' + patchRes.status + ')');

    if (gistId !== cfg.cloudSyncGistId) {
      cfg.cloudSyncGistId = gistId;
      await gmSet('vm_config', cfg);
    }
    return { saved: true, synced: true, total: merged.vocabulary.length };
  }

  // =========================================================================
  // 5. INJECT ISOLATED STYLES & TOUCH SELECTION UI (SAFARI IPADOS)
  // =========================================================================
  const styleEl = document.createElement('style');
  styleEl.id = 'vm-safari-userscript-css';
  styleEl.textContent = ${JSON.stringify(contentCssRaw)};
  (document.head || document.documentElement).appendChild(styleEl);

  let triggerEl = null;
  let tooltipEl = null;
  let selTimer = null;
  let lastText = '';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isInsideUI(node) {
    if (!node) return false;
    const el = node.nodeType === 3 ? (node.parentElement || node.parentNode) : node;
    if (!el || typeof el.closest !== 'function') return false;
    return !!(el.closest('.vm-tooltip') || el.closest('.vm-float-trigger'));
  }

  function hideTrigger() {
    if (triggerEl) { triggerEl.remove(); triggerEl = null; }
  }

  function hideTooltip() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  }

  function speakWord(w, audioUrl) {
    if (audioUrl) {
      try { new Audio(audioUrl).play().catch(() => {}); return; } catch (_) {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(w);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      } catch (_) {}
    }
  }

  async function openConfigPrompt() {
    const cur = await getConfig();
    const val = window.prompt(
      'Dán Mã Cấu Hình (hoặc link #pair=...) lấy từ Cài đặt PC/iPad PWA để liên kết AI & Sổ từ chung:',
      ''
    );
    if (!val || !val.trim()) return;
    const decoded = decodePairingPayload(val.trim());
    if (!decoded) {
      alert('❌ Mã ghép nối không hợp lệ!');
      return;
    }
    const next = {
      ...cur,
      aiProvider: decoded.aiProvider || cur.aiProvider,
      apiKeys: { ...(cur.apiKeys || {}), ...(decoded.apiKeys || {}) },
      cloudSyncToken: decoded.ghToken || cur.cloudSyncToken,
      cloudSyncGistId: decoded.gistId || cur.cloudSyncGistId
    };
    await gmSet('vm_config', next);
    alert('✅ Đã liên kết Safari iPad với Sổ Từ & AI của bạn thành công!');
  }

  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('⚙️ Nhập Mã Ghép Nối VocabMaster (PC/iPad)', openConfigPrompt);
    }
  } catch (_) {}

  function positionCard(rect) {
    if (!tooltipEl) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    const r = tooltipEl.getBoundingClientRect();
    const w = r.width || 320;
    const h = r.height || 220;

    let top = rect ? rect.bottom + 10 : 60;
    if (top + h > vh - 12 && rect && rect.top - h - 10 > 12) {
      top = rect.top - h - 10;
    }
    top = Math.max(12, Math.min(top, Math.max(12, vh - h - 12)));
    let left = rect ? rect.left : (vw - w) / 2;
    left = Math.max(10, Math.min(left, Math.max(10, vw - w - 10)));

    tooltipEl.style.left = Math.round(sx + left) + 'px';
    tooltipEl.style.top = Math.round(sy + top) + 'px';
    tooltipEl.style.visibility = 'visible';
  }

  async function runTranslatePopup(text, rect, contextSentence) {
    hideTrigger();
    hideTooltip();

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'vm-tooltip';
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.innerHTML = '<div class="vm-card"><div class="vm-header"><span class="vm-word">' + esc(text.slice(0, 48)) + '</span><button type="button" class="vm-tool-btn vm-close-btn">✕</button></div><div class="vm-stream-status">✨ Đang dịch Thuần Việt...</div></div>';
    (document.body || document.documentElement).appendChild(tooltipEl);
    tooltipEl.querySelector('.vm-close-btn')?.addEventListener('click', hideTooltip);
    positionCard(rect);

    try {
      const res = await translateTextSafari(text, contextSentence);
      if (!tooltipEl) return;

      if (res.type === 'word' && res.word) {
        const w = res.word;
        tooltipEl.innerHTML = \`
          <div class="vm-card">
            <div class="vm-header">
              <div class="vm-word-wrap">
                <span class="vm-word">\${esc(res.original || w.word_root)}</span>
                <span class="vm-pos">\${esc(w.partOfSpeech || 'word')}</span>
              </div>
              <div class="vm-header-tools">
                <button type="button" class="vm-tool-btn vm-cfg-btn" title="Liên kết Sổ/AI">⚙️</button>
                <button type="button" class="vm-tool-btn vm-close-btn">✕</button>
              </div>
            </div>
            <div class="vm-meta-row">
              \${w.ipa_us ? '<span class="vm-ipa">' + esc(w.ipa_us) + '</span>' : ''}
              <button type="button" class="vm-tool-btn vm-speak-btn" style="width:auto;padding:0 8px;">🔊 Nghe</button>
            </div>
            <div class="vm-meaning-vi"><span class="vm-meaning-text">\${esc(w.meaning_vi)}</span></div>
            \${w.definition_vi && w.definition_vi !== w.meaning_vi ? '<div class="vm-def-vi">' + esc(w.definition_vi) + '</div>' : ''}
            \${w.examples?.[0] ? '<div class="vm-def-en">"' + esc(w.examples[0]) + '"</div>' : ''}
            <div class="vm-footer" style="margin-top:10px;">
              <button type="button" class="vm-add-btn">+ Lưu vào Sổ chung (PC & iPad)</button>
            </div>
          </div>\`;

        tooltipEl.querySelector('.vm-speak-btn')?.addEventListener('click', () => speakWord(res.original, res.audioUs));
        tooltipEl.querySelector('.vm-add-btn')?.addEventListener('click', async (ev) => {
          const btn = ev.currentTarget;
          btn.disabled = true;
          btn.textContent = '⏳ Đang lưu & đồng bộ...';
          try {
            const st = await saveAndSyncWordSafari({ word: res.original || w.word_root, ...w });
            btn.textContent = st.synced ? '✓ Đã đồng bộ lên Sổ chung!' : '✓ Đã lưu (Bấm ⚙️ để Sync Cloud)';
            btn.classList.add('vm-btn-saved');
          } catch (err) {
            btn.disabled = false;
            btn.textContent = '❌ ' + err.message;
          }
        });
      } else {
        tooltipEl.innerHTML = \`
          <div class="vm-card">
            <div class="vm-header">
              <span class="vm-word" style="font-size:15px;">✨ Dịch Câu & Đoạn</span>
              <div class="vm-header-tools">
                <button type="button" class="vm-tool-btn vm-cfg-btn" title="Liên kết Sổ/AI">⚙️</button>
                <button type="button" class="vm-tool-btn vm-close-btn">✕</button>
              </div>
            </div>
            <div class="vm-meaning-vi"><span class="vm-meaning-text">\${esc(res.translation)}</span></div>
            \${res.explanation ? '<div class="vm-def-vi" style="margin-top:6px;">' + esc(res.explanation) + '</div>' : ''}
          </div>\`;
      }

      tooltipEl.querySelector('.vm-close-btn')?.addEventListener('click', hideTooltip);
      tooltipEl.querySelector('.vm-cfg-btn')?.addEventListener('click', openConfigPrompt);
      positionCard(rect);
    } catch (err) {
      if (!tooltipEl) return;
      tooltipEl.innerHTML = '<div class="vm-card"><div class="vm-header"><span style="color:#f38ba8;font-weight:700;">⚠️ Lỗi dịch</span><button type="button" class="vm-tool-btn vm-close-btn">✕</button></div><div class="vm-error">' + esc(err.message) + '</div><div class="vm-footer" style="margin-top:8px;"><button type="button" class="vm-add-btn vm-cfg-btn">⚙️ Nhập Mã Ghép Nối</button></div></div>';
      tooltipEl.querySelector('.vm-close-btn')?.addEventListener('click', hideTooltip);
      tooltipEl.querySelector('.vm-cfg-btn')?.addEventListener('click', openConfigPrompt);
      positionCard(rect);
    }
  }

  function evaluateSafariSelection() {
    if (tooltipEl && document.body.contains(tooltipEl)) {
      hideTrigger();
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { hideTrigger(); return; }
    const text = sel.toString().replace(/[\\s\\u00A0]+/g, ' ').trim();
    if (!text || text.length < 1 || text.length > 2500) { hideTrigger(); return; }

    const range = sel.getRangeAt(0);
    if (isInsideUI(range.commonAncestorContainer) || isInsideUI(range.startContainer)) return;

    let rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const rects = range.getClientRects();
      if (rects?.length) rect = rects[0];
    }
    if (!rect) return;

    lastText = text;
    const context = (range.startContainer?.textContent || '').slice(0, 220);

    hideTrigger();
    triggerEl = document.createElement('div');
    triggerEl.className = 'vm-float-trigger';
    triggerEl.innerHTML = '✨';
    triggerEl.title = 'Dịch với VocabMaster AI';

    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    // Place slightly below selection on touch Safari so native Apple black bar above doesn't block tap
    let top = sy + rect.bottom + 12;
    if (rect.bottom + 54 > window.innerHeight) {
      top = Math.max(sy + 6, sy + rect.top - 44);
    }
    const left = Math.max(sx + 8, Math.min(sx + rect.right - 10, sx + window.innerWidth - 46));

    triggerEl.style.setProperty('left', Math.round(left) + 'px', 'important');
    triggerEl.style.setProperty('top', Math.round(top) + 'px', 'important');
    triggerEl.style.setProperty('z-index', '2147483647', 'important');

    triggerEl.addEventListener('touchstart', (e) => e.stopPropagation(), true);
    triggerEl.addEventListener('mousedown', (e) => e.stopPropagation(), true);
    triggerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      runTranslatePopup(lastText, rect, context);
    }, true);

    (document.body || document.documentElement).appendChild(triggerEl);
  }

  document.addEventListener('mouseup', () => setTimeout(evaluateSafariSelection, 25), true);
  document.addEventListener('touchend', () => setTimeout(evaluateSafariSelection, 120), true);
  document.addEventListener('selectionchange', () => {
    clearTimeout(selTimer);
    selTimer = setTimeout(evaluateSafariSelection, 260);
  });

  function onOutsideTap(e) {
    if (isInsideUI(e.target)) return;
    hideTrigger();
    hideTooltip();
  }
  document.addEventListener('mousedown', onOutsideTap, true);
  document.addEventListener('touchstart', onOutsideTap, true);

  tryAutoSyncSettingsFromPWA();
})();
`;

const outPath = path.join(ROOT, 'ipad', 'vocabmaster.user.js');
fs.writeFileSync(outPath, userscript, 'utf8');
console.log(`✅ Built Safari Userscript: ${outPath} (${(Buffer.byteLength(userscript) / 1024).toFixed(1)} KB)`);
