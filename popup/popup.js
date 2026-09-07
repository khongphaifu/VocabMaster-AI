// d:/extension/popup/popup.js

let currentDirection = 'auto'; // 'auto' | 'en-vi' | 'vi-en'
let lastResultData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await checkConfig();
  await loadStats();
  setupEventListeners();
  setupSpeechSynthesis();
});

async function checkConfig() {
  const { apiKey = '', aiProvider = 'groq' } =
    await chrome.storage.sync.get(['apiKey', 'aiProvider']);

  const badge = document.getElementById('ai-badge');
  if (badge) {
    const names = {
      gemini: 'Gemini',
      groq: 'Groq',
      openai: 'GPT-4o Mini',
      claude: 'Claude 3.5'
    };
    badge.textContent = names[aiProvider] || aiProvider;
  }

  const warn = document.getElementById('warn');
  if (warn) {
    warn.style.display = !apiKey ? 'block' : 'none';
  }
}

async function loadStats() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    if (res?.success && res.stats) {
      document.getElementById('s-total').textContent = res.stats.total || 0;
      document.getElementById('s-learned').textContent = res.stats.learned || 0;
      document.getElementById('s-learning').textContent = res.stats.learning || 0;
      document.getElementById('s-new').textContent = res.stats.new || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function setupEventListeners() {
  const input = document.getElementById('input-text');
  const btnTranslate = document.getElementById('btn-translate');
  const btnClear = document.getElementById('btn-clear');
  const btnSwap = document.getElementById('btn-swap-lang');
  const langModeBtn = document.getElementById('lang-mode-btn');
  const langDesc = document.getElementById('lang-desc');

  // Input events
  input.addEventListener('input', () => {
    btnClear.style.display = input.value.trim() ? 'block' : 'none';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  });

  btnTranslate.addEventListener('click', handleTranslate);

  btnClear.addEventListener('click', () => {
    input.value = '';
    btnClear.style.display = 'none';
    document.getElementById('result-box').style.display = 'none';
    input.focus();
  });

  // Language mode toggle & swap
  btnSwap.addEventListener('click', () => {
    if (currentDirection === 'auto' || currentDirection === 'en-vi') {
      currentDirection = 'vi-en';
      langModeBtn.textContent = '🇻🇳 Tiếng Việt ➔ 🇬🇧 Anh';
      langDesc.textContent = 'Dịch sang tiếng Anh';
    } else {
      currentDirection = 'en-vi';
      langModeBtn.textContent = '🇬🇧 Anh ➔ 🇻🇳 Tiếng Việt';
      langDesc.textContent = 'Dịch sang tiếng Việt';
    }
    langModeBtn.classList.remove('active');
  });

  langModeBtn.addEventListener('click', () => {
    currentDirection = 'auto';
    langModeBtn.textContent = '🌐 Tự động (Auto)';
    langModeBtn.classList.add('active');
    langDesc.textContent = 'EN ➔ VI / VI ➔ EN';
  });

  // Settings & Panel navigation
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  const goSettings = document.getElementById('go-settings');
  if (goSettings) {
    goSettings.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  document.getElementById('btn-panel').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
    window.close();
  });
}

async function handleTranslate() {
  const input = document.getElementById('input-text');
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  const btnTranslate = document.getElementById('btn-translate');
  const btnIcon = document.getElementById('trans-btn-icon');
  const btnText = document.getElementById('trans-btn-text');
  const resultBox = document.getElementById('result-box');

  btnTranslate.disabled = true;
  btnIcon.innerHTML = '<span class="spinner"></span>';
  btnText.textContent = 'Đang dịch...';
  resultBox.style.display = 'none';

  const isWord = !text.includes(' ') && text.length < 35;

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text,
      isWord,
      direction: currentDirection
    });

    if (res?.success && res.data) {
      lastResultData = res.data;
      renderResult(res.data, isWord, text);
    } else {
      renderError(res?.error || 'Lỗi không xác định');
    }
  } catch (err) {
    renderError(err.message || 'Lỗi kết nối');
  } finally {
    btnTranslate.disabled = false;
    btnIcon.textContent = '✨';
    btnText.textContent = 'Dịch ngay (Enter)';
  }
}

const ICONS = {
  speaker: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  plus: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  book: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
};

function renderResult(data, isWord, originalText) {
  const resultBox = document.getElementById('result-box');
  resultBox.innerHTML = '';
  resultBox.style.display = 'block';

  if (data.type === 'word' && data.word) {
    const w = data.word;
    const orig = data.original || originalText;
    const rootWord = (w.word_root && w.word_root.toLowerCase() !== orig.toLowerCase()) ? w.word_root : '';

    const lvl = (w.level || '').toLowerCase();
    const levelColors = {
      a1: { bg: '#a6e3a1', fg: '#11111b' },
      a2: { bg: '#94e2d5', fg: '#11111b' },
      b1: { bg: '#f9e2af', fg: '#11111b' },
      b2: { bg: '#fab387', fg: '#11111b' },
      c1: { bg: '#f38ba8', fg: '#11111b' },
      c2: { bg: '#eba0ac', fg: '#11111b' }
    };
    const lvlStyle = levelColors[lvl] || { bg: '#45475a', fg: '#cdd6f4' };

    const cleanIpaUk = (w.ipa_uk && !w.ipa_uk.includes('...')) ? w.ipa_uk : (w.ipa || '');
    const cleanIpaUs = (w.ipa_us && !w.ipa_us.includes('...')) ? w.ipa_us : cleanIpaUk;
    const cleanPos = (w.partOfSpeech && !w.partOfSpeech.includes('...')) ? w.partOfSpeech : 'noun';
    const cleanLevel = (w.level && !w.level.includes('...')) ? w.level.toUpperCase() : '';
    let cleanMeaning = (w.meaning_vi && !w.meaning_vi.includes('...') && w.meaning_vi.trim().toLowerCase() !== orig.toLowerCase())
      ? w.meaning_vi
      : '';
    if (!cleanMeaning && w.definition_vi && !w.definition_vi.includes('...') && w.definition_vi.trim().toLowerCase() !== orig.toLowerCase()) {
      cleanMeaning = w.definition_vi.split(/[:;]/)[0].trim();
    }
    if (!cleanMeaning) {
      cleanMeaning = w.definition_vi || w.definition_en || orig;
    }

    const cleanDefVi = (w.definition_vi && !w.definition_vi.includes('...') && w.definition_vi !== cleanMeaning) ? w.definition_vi : '';
    const cleanDefEn = (w.definition_en && !w.definition_en.includes('...')) ? w.definition_en : '';

    const wordHtml = `
      <div class="dict-card">
        <!-- Headword & Quick Copy -->
        <div class="dict-head">
          <div class="headword-wrap">
            <span class="headword-text">${esc(orig)}</span>
            ${rootWord ? `<span class="root-tag" title="Từ nguyên thể">➔ ${esc(rootWord)}</span>` : ''}
            ${data.source === 'cambridge' ? `<span style="font-size:10px;font-weight:700;color:#fab387;background:rgba(250,179,135,0.15);border:1px solid rgba(250,179,135,0.3);padding:1px 6px;border-radius:4px;">📚 Cambridge</span>` : ''}
          </div>
          <div style="display:flex;gap:4px;align-items:center;">
            <a href="${data.cambridgeUrl || `https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(orig.toLowerCase())}`}" target="_blank" rel="noopener noreferrer" class="icon-btn" title="Xem trên Cambridge Dictionary Online" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;color:#89b4fa;font-size:11px;">📖</a>
            <button class="icon-btn btn-copy" data-copy="${esc(orig + ': ' + cleanMeaning)}" title="Sao chép từ & nghĩa">${ICONS.copy}</button>
          </div>
        </div>

        <!-- UK & US Pronunciation Bar, POS, Level -->
        <div class="prons-bar">
          ${cleanIpaUk ? `
            <div class="pron-pill" data-speak="${esc(rootWord || orig)}" data-lang="en-GB" title="Phát âm Anh (UK)">
              <span class="region-tag uk">UK</span>
              <button class="icon-btn pron-audio-btn">${ICONS.speaker}</button>
              <span class="pron-ipa">${esc(cleanIpaUk)}</span>
            </div>
          ` : ''}
          ${cleanIpaUs ? `
            <div class="pron-pill" data-speak="${esc(rootWord || orig)}" data-lang="en-US" title="Phát âm Mỹ (US)">
              <span class="region-tag us">US</span>
              <button class="icon-btn pron-audio-btn">${ICONS.speaker}</button>
              <span class="pron-ipa">${esc(cleanIpaUs)}</span>
            </div>
          ` : ''}
          <span class="pos-badge">${esc(cleanPos)}</span>
          ${cleanLevel ? `<span class="level-badge" style="background:${lvlStyle.bg};color:${lvlStyle.fg};">${esc(cleanLevel)}</span>` : ''}
        </div>

        <!-- Main Meaning / Sense Box -->
        <div class="sense-box">
          <div class="meaning-row">
            <span class="badge-lang vi">VI</span>
            <span class="meaning-text">${esc(cleanMeaning)}</span>
          </div>
          ${cleanDefEn ? `
            <div class="def-row en">
              <span class="badge-lang en">EN</span>
              <span class="def-text">${esc(cleanDefEn)}</span>
            </div>
          ` : ''}
          ${cleanDefVi ? `
            <div class="explain-row">
              <span class="explain-dot">•</span>
              <span class="explain-text">${esc(cleanDefVi)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Examples -->
        ${(w.examples && w.examples.length) ? `
          <div class="dict-section">
            <div class="section-label">📝 VÍ DỤ / EXAMPLES</div>
            <div class="examples-list">
              ${w.examples.slice(0, 2).map(ex => `
                <div class="example-item">
                  <span style="color:#89b4fa;">•</span>
                  <span>${esc(ex)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Collocations -->
        ${(w.collocations && w.collocations.length) ? `
          <div class="dict-section">
            <div class="section-label">🔗 CỤM TỪ THÔNG DỤNG (COLLOCATIONS)</div>
            <div class="colloc-list">
              ${w.collocations.map(c => `
                <div class="colloc-item">
                  <b style="color:#fab387;">${esc(c.phrase || '')}</b>
                  ${c.meaning_vi ? `<span style="color:#a6adc8;">: ${esc(c.meaning_vi)}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Word Family -->
        ${(w.word_family && w.word_family.length) ? `
          <div class="dict-section">
            <div class="section-label">🌱 CÁC DẠNG TỪ LIÊN QUAN (WORD FAMILY)</div>
            <div class="family-list">
              ${w.word_family.map(f => `
                <div class="family-row">
                  <span class="family-pos">${esc(f.pos || '')}</span>
                  <span class="family-word">${esc(f.word || '')}:</span>
                  <span class="family-meaning">${esc(f.meaning_vi || '')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Other Meanings -->
        ${(w.other_meanings && w.other_meanings.length) ? `
          <div class="dict-section">
            <div class="section-label">💡 CÁC NGHĨA KHÁC (OTHER SENSES)</div>
            <div class="other-list">
              ${w.other_meanings.map(m => `
                <div class="other-row">
                  <span class="other-pos">${esc(m.pos || '')}</span>
                  <span class="other-meaning">${esc(m.meaning_vi || '')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Synonyms -->
        ${(w.synonyms && w.synonyms.length) ? `
          <div class="synonyms-bar">
            <span style="font-size:11px;color:#6c7086;font-weight:600;">Đồng nghĩa:</span>
            ${w.synonyms.slice(0, 4).map(s => `<span class="word-tag">${esc(s)}</span>`).join('')}
          </div>
        ` : ''}

        <!-- Tools / Actions -->
        <div class="result-tools">
          <button class="btn-save-word" id="btn-save-vocab">
            ${ICONS.plus}
            <span>Lưu vào Sổ từ vựng</span>
          </button>
        </div>
      </div>
    `;
    resultBox.innerHTML = wordHtml;

    const btnSave = resultBox.querySelector('#btn-save-vocab');
    if (btnSave) {
      try {
        chrome.storage.local.get('vocabulary', (res) => {
          const vocab = res?.vocabulary || [];
          const isSaved = vocab.some(item => (item.word || '').trim().toLowerCase() === orig.toLowerCase());
          if (isSaved) {
            btnSave.textContent = '✅ Đã lưu vào sổ từ';
            btnSave.style.background = '#a6e3a1';
            btnSave.style.color = '#11111b';
            btnSave.style.borderColor = '#a6e3a1';
          }
        });
      } catch (_) {}

      btnSave.addEventListener('click', async () => {
        if (btnSave.textContent.includes('Đã lưu')) return;
        btnSave.disabled = true;
        btnSave.textContent = '⏳ Đang lưu...';
        try {
          const addRes = await chrome.runtime.sendMessage({
            type: 'ADD_WORD',
            wordData: {
              word: orig,
              ipa: cleanIpaUk || cleanIpaUs,
              partOfSpeech: cleanPos,
              definition_vi: cleanMeaning || cleanDefVi,
              definition_en: cleanDefEn,
              examples: w.examples || [],
              synonyms: w.synonyms || [],
              antonyms: w.antonyms || [],
              level: cleanLevel || 'B1',
              etymology: w.etymology || '',
              sourceUrl: 'Popup Quick Translate'
            }
          });
          if (addRes?.success) {
            btnSave.disabled = false;
            btnSave.textContent = '✅ Đã lưu vào sổ từ';
            btnSave.style.background = '#a6e3a1';
            btnSave.style.color = '#11111b';
            btnSave.style.borderColor = '#a6e3a1';
            await loadStats();
          }
        } catch (_) {
          btnSave.disabled = false;
          btnSave.textContent = '❌ Lỗi khi lưu';
        }
      });
    }

  } else {
    // Phrase / Sentence view
    const translation = data.translation || '';
    const explanation = data.explanation || '';
    const textToSpeak = currentDirection === 'vi-en' ? translation : (data.original || originalText);

    const phraseHtml = `
      <div class="word-head" style="margin-bottom:8px;">
        <span style="color:#89b4fa; font-weight:700;">📖 Bản dịch</span>
        <div style="display:flex; gap:4px;">
          <button class="icon-btn btn-audio" data-speak="${esc(textToSpeak)}" data-lang="en-US" title="Phát âm">🔊</button>
          <button class="icon-btn btn-copy" data-copy="${esc(translation)}" title="Sao chép bản dịch">📋</button>
        </div>
      </div>
      <div class="phrase-trans">${esc(translation)}</div>
      ${explanation ? `<div class="phrase-explain">💡 <b>Phân tích:</b> ${esc(explanation)}</div>` : ''}
    `;
    resultBox.innerHTML = phraseHtml;
  }

  // Attach audio & copy handlers
  resultBox.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.getAttribute('data-speak') || originalText;
      const lang = btn.getAttribute('data-lang') || 'en-US';
      speak(text, lang);
    });
  });

  resultBox.querySelectorAll('.btn-audio:not([data-speak])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(btn.dataset.speak || originalText, 'en-US');
    });
  });

  resultBox.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const prev = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => { btn.textContent = prev; }, 1500);
      } catch (_) {}
    });
  });
}

function renderError(msg) {
  const resultBox = document.getElementById('result-box');
  resultBox.innerHTML = `
    <div style="color:#f38ba8; font-size:13px; line-height:1.45; background:rgba(243,139,168,0.1); border:1px solid rgba(243,139,168,0.3); padding:8px 10px; border-radius:8px;">
      ❌ ${esc(msg)}
    </div>
  `;
  resultBox.style.display = 'block';
}

function speak(text, lang = 'en-US') {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      const voice = voices.find(v => v.lang === lang) ||
                    voices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
                    voices.find(v => v.lang.includes('en'));
      if (voice) utterance.voice = voice;
    }
  } catch { /* ignore */ }
  window.speechSynthesis.speak(utterance);
}

function setupSpeechSynthesis() {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
