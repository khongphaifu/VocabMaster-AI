// d:/extension/content/content.js
// Intercepts text selection, shows floating action trigger, performs AI translation

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

let tooltip = null;
let floatTrigger = null;
let activeLibraryModal = null;
let currentSelectionText = '';
let isProcessing = false;

// Listen for mouseup on page to detect text selection
document.addEventListener('mouseup', (e) => {
  // Ignore clicks inside our own tooltip or floating button
  if (tooltip && tooltip.contains(e.target)) return;
  if (floatTrigger && floatTrigger.contains(e.target)) return;

  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText || selectedText.length < 1 || selectedText.length > 2500) {
      hideFloatTrigger();
      return;
    }

    currentSelectionText = selectedText;
    hideTooltip();

    let triggerX = e.pageX + 6;
    let triggerY = e.pageY - 34;

    try {
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && (rect.width > 0 || rect.height > 0)) {
          triggerX = window.scrollX + rect.right + 4;
          triggerY = window.scrollY + rect.top - 36;
          if (triggerY < window.scrollY + 5) {
            triggerY = window.scrollY + rect.bottom + 6;
          }
          if (triggerX > window.scrollX + window.innerWidth - 44) {
            triggerX = window.scrollX + window.innerWidth - 44;
          }
        }
      }
    } catch (_) {}

    showFloatTrigger(triggerX, triggerY, selectedText);
  }, 20);
});

// Close tooltip & trigger when clicking outside
document.addEventListener('mousedown', (e) => {
  if (tooltip && !tooltip.contains(e.target)) {
    hideTooltip();
  }
  if (floatTrigger && !floatTrigger.contains(e.target)) {
    hideFloatTrigger();
  }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (activeLibraryModal) {
      closeLibraryModal();
      return;
    }
    hideTooltip();
    hideFloatTrigger();
  }
});

function showFloatTrigger(x, y, text) {
  hideFloatTrigger();

  floatTrigger = document.createElement('div');
  floatTrigger.className = 'vm-float-trigger';
  floatTrigger.style.left = `${x}px`;
  floatTrigger.style.top = `${y}px`;
  floatTrigger.innerHTML = '✨';
  floatTrigger.title = 'Dịch bằng AI (VocabMaster)';

  floatTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const triggerRect = floatTrigger.getBoundingClientRect();
    const tooltipX = Math.min(window.scrollX + triggerRect.left, window.scrollX + window.innerWidth - 360);
    const tooltipY = window.scrollY + triggerRect.bottom + 8;

    hideFloatTrigger();
    await doTranslate(text, tooltipX, tooltipY);
  });

  document.body.appendChild(floatTrigger);
}

function hideFloatTrigger() {
  if (floatTrigger) {
    floatTrigger.remove();
    floatTrigger = null;
  }
}

async function doTranslate(text, x, y) {
  if (isProcessing) return;
  isProcessing = true;

  const isWord = !text.includes(' ') && text.length < 35;

  showLoadingTooltip(x, y);

  try {
    const sendPromise = chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text,
      isWord,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Thời gian chờ phản hồi quá lâu (15s). Vui lòng kiểm tra lại mạng hoặc thử lại.')), 15000)
    );

    const response = await Promise.race([sendPromise, timeoutPromise]);
    if (response?.success) {
      showResultTooltip(response.data, x, y);
    } else {
      showErrorTooltip(response?.error || 'Lỗi không xác định', x, y, () => doTranslate(text, x, y));
    }
  } catch (err) {
    const msg = err.message.includes('Extension context invalidated')
      ? 'Extension vừa được reload. Vui lòng F5 (tải lại) trang web này.'
      : err.message;
    showErrorTooltip(msg, x, y, () => doTranslate(text, x, y));
  } finally {
    isProcessing = false;
  }
}

// Listen for messages from background (context menu results or open library)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SHOW_RESULT') {
    const x = window.scrollX + 100;
    const y = window.scrollY + 100;
    showResultTooltip(msg.data, x, y);
  } else if (msg.type === 'SHOW_ERROR') {
    showErrorTooltip(msg.error, window.scrollX + 100, window.scrollY + 100);
  } else if (msg.type === 'OPEN_LIBRARY_MODAL') {
    openLibraryModal();
  }
});

function hideTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

function createTooltipBase(x, y) {
  const el = document.createElement('div');
  el.className = 'vm-tooltip';
  el.style.left = `${Math.max(10, x)}px`;
  el.style.top = `${Math.max(10, y)}px`;
  return el;
}

function showLoadingTooltip(x, y) {
  hideTooltip();
  tooltip = createTooltipBase(x, y);
  tooltip.innerHTML = `
    <div class="vm-loading">
      <div class="vm-spinner"></div>
      <span>Đang phân tích bằng AI...</span>
    </div>`;
  document.body.appendChild(tooltip);
}

function showErrorTooltip(msg, x, y, retryFn = null) {
  if (!tooltip) {
    tooltip = createTooltipBase(x, y);
    document.body.appendChild(tooltip);
  }
  tooltip.innerHTML = `
    <div class="vm-card" style="padding: 10px 14px; min-width: 220px; max-width: 340px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
        <span style="color:#f38ba8; font-weight:700; font-size:12.5px;">⚠️ Thông báo</span>
        <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng">${ICONS.close}</button>
      </div>
      <div class="vm-error" style="margin-bottom: ${retryFn ? '8px' : '0'}; line-height: 1.4; font-size: 12.5px;">
        ${escHtml(msg)}
      </div>
      ${retryFn ? `
        <button type="button" class="vm-retry-btn" style="appearance:none; -webkit-appearance:none; border:none; background:#89b4fa; color:#11111b; font-weight:700; font-size:12px; padding:6px 12px; border-radius:6px; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.15s;">
          🔄 Thử lại ngay
        </button>
      ` : ''}
    </div>
  `;

  tooltip.querySelector('.vm-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideTooltip();
  });

  if (retryFn) {
    tooltip.querySelector('.vm-retry-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      retryFn();
    });
  }
}

const ICONS = {
  speaker: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  copy: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  plus: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  book: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
};

function showResultTooltip(data, x, y) {
  if (!tooltip) {
    tooltip = createTooltipBase(x, y);
    document.body.appendChild(tooltip);
  }

  tooltip.innerHTML = data.type === 'word' ? buildWordHTML(data) : buildPhraseHTML(data);

  // Close button
  tooltip.querySelector('.vm-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideTooltip();
  });

  // Pronunciation audio buttons (UK & US)
  tooltip.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.getAttribute('data-speak') || data.original;
      const lang = btn.getAttribute('data-lang') || 'en-US';
      speakText(text, lang);
    });
  });

  // Fallback audio button
  tooltip.querySelectorAll('.vm-audio-btn:not([data-speak])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(data.original, 'en-US');
    });
  });

  // Copy translation button
  tooltip.querySelector('.vm-copy-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const textToCopy = data.type === 'word'
      ? `${data.original}: ${data.word?.meaning_vi || data.word?.definition_vi || ''}`
      : (data.translation || '');
    navigator.clipboard.writeText(textToCopy).then(() => {
      const origHtml = btn.innerHTML;
      btn.innerHTML = ICONS.check;
      btn.classList.add('vm-copied');
      setTimeout(() => {
        btn.innerHTML = origHtml;
        btn.classList.remove('vm-copied');
      }, 1500);
    });
  });

  // Add word & panel buttons
  const addBtn = tooltip.querySelector('.vm-add-btn');
  const panelBtn = tooltip.querySelector('.vm-panel-btn');

  // Check if word/phrase is already saved in storage
  const wordToCheck = (data.original || '').trim().toLowerCase();
  try {
    chrome.storage.local.get('vocabulary', (res) => {
      const vocab = res?.vocabulary || [];
      const isSaved = vocab.some(w => (w.word || '').trim().toLowerCase() === wordToCheck);
      if (isSaved && addBtn) {
        addBtn.classList.add('vm-btn-saved');
        addBtn.innerHTML = `${ICONS.check}<span>Đã lưu vào sổ</span>`;
        addBtn.title = 'Từ này đã có trong thư viện. Bấm để xem thư viện từ vựng.';
      }
    });
  } catch (_) {}

  if (addBtn) {
    addBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      // If already saved, clicking it opens the library modal
      if (addBtn.classList.contains('vm-btn-saved')) {
        openLibraryModal();
        return;
      }

      addBtn.innerHTML = `<span>⏳</span><span>Đang lưu...</span>`;
      addBtn.disabled = true;
      try {
        const res = await chrome.runtime.sendMessage({
          type: 'ADD_WORD',
          wordData: {
            word: data.original,
            ...(data.word || {}),
            definition_vi: data.type === 'word' ? (data.word?.meaning_vi || data.word?.definition_vi) : data.translation,
            sourceUrl: window.location.href,
          }
        });
        if (res?.success) {
          addBtn.disabled = false;
          addBtn.classList.add('vm-btn-saved');
          addBtn.innerHTML = `${ICONS.check}<span>Đã lưu vào sổ</span>`;
          addBtn.title = 'Đã lưu thành công! Bấm để mở thư viện xem lại.';
        } else {
          addBtn.innerHTML = `<span>❌ Lỗi</span>`;
          addBtn.disabled = false;
        }
      } catch {
        addBtn.innerHTML = `<span>❌ Lỗi</span>`;
        addBtn.disabled = false;
      }
    });
  }

  // Open library modal button
  if (panelBtn) {
    panelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLibraryModal();
      try {
        chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
      } catch (_) {}
    });
  }
}

function speakText(text, lang = 'en-US') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        const voice = voices.find(v => v.lang === lang) ||
                      voices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
                      voices.find(v => v.lang.includes('en'));
        if (voice) u.voice = voice;
      }
    } catch { /* ignore */ }
    window.speechSynthesis.speak(u);
  }
}

function buildWordHTML(data) {
  const w = data.word || {};
  const orig = data.original || '';
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

  const isPlaceholder = (str) => {
    if (!str || typeof str !== 'string') return true;
    const s = str.trim().toLowerCase();
    if (s.length === 0 || s === '...' || s === '-') return true;
    return s === 'nghĩa tiếng việt' ||
           s === 'nghĩa tiếng việt chuẩn xác' ||
           s === 'nghĩa thuần việt' ||
           s === 'nghĩa thuần việt chuẩn xác' ||
           s.includes('nghĩa thuần việt') ||
           s.includes('nghĩa tiếng việt') ||
           s === 'bàn điệt' ||
           s.includes('bàn điệt') ||
           s === 'từ liên quan' ||
           s === 'từ loại';
  };

  let cleanMeaning = (w.meaning_vi && !isPlaceholder(w.meaning_vi) && w.meaning_vi.trim().toLowerCase() !== orig.toLowerCase())
    ? w.meaning_vi
    : '';
  if (!cleanMeaning && w.definition_vi && !isPlaceholder(w.definition_vi) && w.definition_vi.trim().toLowerCase() !== orig.toLowerCase()) {
    cleanMeaning = w.definition_vi.split(/[:;]/)[0].trim();
  }
  if (!cleanMeaning && Array.isArray(w.other_meanings) && w.other_meanings.length > 0) {
    const validOther = w.other_meanings.find(m => m && !isPlaceholder(m.meaning_vi));
    if (validOther) cleanMeaning = validOther.meaning_vi;
  }
  if (!cleanMeaning) {
    cleanMeaning = (!isPlaceholder(w.definition_vi) && w.definition_vi) || (!isPlaceholder(w.definition_en) && w.definition_en) || orig;
  }

  const cleanDefVi = (w.definition_vi && !isPlaceholder(w.definition_vi) && w.definition_vi !== cleanMeaning) ? w.definition_vi : '';
  const cleanDefEn = (w.definition_en && !isPlaceholder(w.definition_en)) ? w.definition_en : '';

  return `
    <div class="vm-card">
      <!-- Header Row: Word & Actions -->
      <div class="vm-header">
        <div class="vm-word-wrap">
          <span class="vm-word">${escHtml(orig)}</span>
          ${rootWord ? `<span class="vm-root-tag" title="Từ nguyên thể">➔ ${escHtml(rootWord)}</span>` : ''}
          ${data.source === 'cambridge' ? `<span class="vm-source-tag" title="Bản dịch trực tiếp từ Cambridge Dictionary Online">📚 Cambridge</span>` : ''}
        </div>
        <div class="vm-header-tools">
          <button type="button" class="vm-tool-btn vm-copy-btn" title="Sao chép từ & nghĩa">${ICONS.copy}</button>
          <a href="${data.cambridgeUrl || `https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(orig.toLowerCase())}`}" target="_blank" rel="noopener noreferrer" class="vm-tool-btn" title="Xem trên Cambridge Dictionary Online" style="text-decoration:none;display:flex;align-items:center;justify-content:center;color:#89b4fa;font-size:12px;">📖</a>
          <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng">${ICONS.close}</button>
        </div>
      </div>

      <!-- Meta Row: Pronunciation Pills, POS, Level -->
      <div class="vm-meta-row">
        ${cleanIpaUk ? `
          <div class="vm-pron-pill vm-pron-uk" data-speak="${escHtml(rootWord || orig)}" data-lang="en-GB" title="Phát âm Anh (UK)">
            <span class="vm-region-tag uk">UK</span>
            <span class="vm-audio-icon">${ICONS.speaker}</span>
            <span class="vm-ipa">${escHtml(cleanIpaUk)}</span>
          </div>
        ` : ''}
        ${cleanIpaUs ? `
          <div class="vm-pron-pill vm-pron-us" data-speak="${escHtml(rootWord || orig)}" data-lang="en-US" title="Phát âm Mỹ (US)">
            <span class="vm-region-tag us">US</span>
            <span class="vm-audio-icon">${ICONS.speaker}</span>
            <span class="vm-ipa">${escHtml(cleanIpaUs)}</span>
          </div>
        ` : ''}
        <span class="vm-pos">${escHtml(cleanPos)}</span>
        ${cleanLevel ? `<span class="vm-level" style="background:${lvlStyle.bg};color:${lvlStyle.fg};">${escHtml(cleanLevel)}</span>` : ''}
      </div>

      <!-- Core Meaning (Pure Vietnamese) -->
      <div class="vm-meaning-vi">
        <span class="vm-flag-tag vi">VN</span>
        <span class="vm-meaning-text">${escHtml(cleanMeaning)}</span>
      </div>

      ${cleanDefVi ? `
        <div class="vm-def-vi">
          <span class="vm-bullet-icon">📖</span>
          <span>${escHtml(cleanDefVi)}</span>
        </div>
      ` : ''}

      ${cleanDefEn ? `
        <div class="vm-def-en">
          <span class="vm-flag-tag en">EN</span>
          <span>${escHtml(cleanDefEn)}</span>
        </div>
      ` : ''}

      <!-- 📝 Ví dụ (Examples) -->
      ${(w.examples && w.examples.length) ? `
        <div class="vm-section">
          <div class="vm-section-title">📝 Ví dụ</div>
          <div class="vm-examples-list">
            ${w.examples.filter(ex => !isPlaceholder(ex) && !ex.includes('Example sentence')).slice(0, 3).map(ex =>
              `<div class="vm-example-item">
                <span class="vm-example-bullet">•</span>
                <span class="vm-example-text">${highlightWord(escHtml(ex), orig)}</span>
              </div>`
            ).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 🌱 Các dạng từ liên quan (Word Family) -->
      ${(w.word_family && w.word_family.length) ? (() => {
        const validFamily = w.word_family.filter(f => {
          if (!f || !f.word) return false;
          const fw = String(f.word).trim();
          const fm = String(f.meaning_vi || '').trim();
          if (isPlaceholder(fw) || isPlaceholder(fm)) return false;
          if (fw.toLowerCase() === orig.toLowerCase() || fw.toLowerCase() === (rootWord || '').toLowerCase()) return false;
          return true;
        });
        return validFamily.length ? `
          <div class="vm-section">
            <div class="vm-section-title">🌱 Các dạng từ liên quan (Word Family)</div>
            <div class="vm-family-list">
              ${validFamily.map(f => `
                <div class="vm-family-item">
                  <span class="vm-family-pos">${escHtml(f.pos || '')}</span>
                  <span class="vm-family-word">${escHtml(f.word || '')}:</span>
                  <span class="vm-family-meaning">${escHtml(f.meaning_vi || '')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : '';
      })() : ''}

      <!-- 💡 Các cách dịch khác (Other Meanings) -->
      ${(w.other_meanings && w.other_meanings.length) ? (() => {
        const validOther = w.other_meanings.filter(m => m && m.meaning_vi && !isPlaceholder(m.meaning_vi));
        return validOther.length ? `
          <div class="vm-section">
            <div class="vm-section-title">💡 Các cách dịch khác</div>
            <div class="vm-other-list">
              ${validOther.map(m => `
                <div class="vm-other-item">
                  <span class="vm-family-pos">${escHtml(m.pos || '')}</span>
                  <span class="vm-other-meaning">${escHtml(m.meaning_vi || '')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : '';
      })() : ''}

      <!-- 🔗 Cụm từ thông dụng (Collocations) -->
      ${(w.collocations && w.collocations.length) ? (() => {
        const validColloc = w.collocations.filter(c => c && c.phrase && !isPlaceholder(c.phrase) && !isPlaceholder(c.meaning_vi));
        return validColloc.length ? `
          <div class="vm-section">
            <div class="vm-section-title">🔗 Cụm từ thông dụng (Collocations)</div>
            <div class="vm-colloc-list">
              ${validColloc.map(c => `
                <div class="vm-colloc-item">
                  <b class="vm-colloc-phrase">${escHtml(c.phrase || '')}</b>
                  ${c.meaning_vi ? `<span class="vm-colloc-meaning">: ${escHtml(c.meaning_vi)}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : '';
      })() : ''}

      <!-- Đồng nghĩa -->
      ${(w.synonyms && w.synonyms.length) ? (() => {
        const seenSyn = new Set();
        const validSynonyms = w.synonyms
          .map(s => String(s || '').trim())
          .filter(s => {
            if (!s || s.length < 2) return false;
            if (isPlaceholder(s)) return false;
            if (VIETNAMESE_REGEX.test(s)) return false; // Must be English
            const lower = s.toLowerCase();
            if (lower === orig.toLowerCase() || lower === (rootWord || '').toLowerCase()) return false;
            if (seenSyn.has(lower)) return false;
            seenSyn.add(lower);
            return true;
          })
          .slice(0, 4);
        return validSynonyms.length ? `
          <div class="vm-synonyms-row">
            <span class="vm-syn-label">Đồng nghĩa:</span>
            ${validSynonyms.map(s => `<span class="vm-syn-tag">${escHtml(s)}</span>`).join('')}
          </div>
        ` : '';
      })() : ''}

      <!-- Action Buttons -->
      <div class="vm-actions">
        <button type="button" class="vm-add-btn" title="Lưu vào sổ từ vựng">
          ${ICONS.plus}
          <span>Thêm từ</span>
        </button>
        <button type="button" class="vm-panel-btn" title="Mở thư viện từ vựng">
          ${ICONS.book}
          <span>Thư viện</span>
        </button>
      </div>
    </div>
  `;
}

function buildPhraseHTML(data) {
  const orig = data.original || '';
  const preview = orig.length > 180 ? orig.slice(0, 180) + '...' : orig;
  return `
    <div class="vm-card">
      <div class="vm-header">
        <div class="vm-word-wrap">
          <span class="vm-phrase-tag">Dịch câu &amp; đoạn văn</span>
        </div>
        <div class="vm-header-tools">
          <button type="button" class="vm-tool-btn vm-copy-btn" title="Sao chép bản dịch">${ICONS.copy}</button>
          <button type="button" class="vm-tool-btn vm-audio-btn" data-speak="${escHtml(orig)}" data-lang="en-US" title="Phát âm">${ICONS.speaker}</button>
          <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng">${ICONS.close}</button>
        </div>
      </div>
      <div class="vm-phrase-original">"${escHtml(preview)}"</div>
      <div class="vm-phrase-translation">${escHtml(data.translation || '')}</div>
      ${data.explanation ? `<div class="vm-phrase-explain">💡 <b>Phân tích:</b> ${escHtml(data.explanation)}</div>` : ''}
      <div class="vm-actions">
        <button type="button" class="vm-add-btn" title="Lưu câu vào sổ">
          ${ICONS.plus}
          <span>Lưu câu</span>
        </button>
        <button type="button" class="vm-panel-btn" title="Mở thư viện">
          ${ICONS.book}
          <span>Thư viện</span>
        </button>
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightWord(escapedHtml, word) {
  const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapedHtml.replace(
    new RegExp(`(${safeWord})`, 'gi'),
    '<b class="vm-highlight">$1</b>'
  );
}

function closeLibraryModal() {
  if (activeLibraryModal) {
    activeLibraryModal.remove();
    activeLibraryModal = null;
  }
}

async function openLibraryModal() {
  closeLibraryModal();

  const overlay = document.createElement('div');
  overlay.className = 'vm-modal-overlay';
  activeLibraryModal = overlay;

  overlay.innerHTML = `
    <div class="vm-modal" role="dialog" aria-label="Sổ từ vựng">
      <div class="vm-modal-header">
        <div class="vm-modal-title-wrap">
          <span style="font-size:18px;">📚</span>
          <span class="vm-modal-title">Sổ từ vựng đã lưu</span>
          <span class="vm-modal-count" id="vm-modal-count">0 từ</span>
        </div>
        <button type="button" class="vm-modal-close-btn" id="vm-modal-close" title="Đóng">${ICONS.close}</button>
      </div>

      <div class="vm-modal-toolbar">
        <input type="text" class="vm-modal-search" id="vm-modal-search" placeholder="🔍 Tìm kiếm từ vựng, nghĩa tiếng Việt..." autocomplete="off">
        <select class="vm-modal-filter" id="vm-modal-filter">
          <option value="all">Tất cả</option>
          <option value="new">Mới thêm</option>
          <option value="learning">Đang học</option>
          <option value="learned">Đã thuộc</option>
        </select>
      </div>

      <div class="vm-modal-body" id="vm-modal-body">
        <div class="vm-loading">
          <div class="vm-spinner"></div>
          <span>Đang tải danh sách từ vựng...</span>
        </div>
      </div>

      <div class="vm-modal-footer">
        <button type="button" class="vm-modal-panel-btn" id="vm-modal-panel-btn" title="Mở thanh bên mở rộng">
          ${ICONS.book}
          <span>Mở Side Panel</span>
        </button>
        <button type="button" class="vm-modal-foot-close" id="vm-modal-foot-close">Đóng</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  overlay.querySelector('#vm-modal-close')?.addEventListener('click', closeLibraryModal);
  overlay.querySelector('#vm-modal-foot-close')?.addEventListener('click', closeLibraryModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeLibraryModal();
    }
  });

  // Open sidepanel handler
  overlay.querySelector('#vm-modal-panel-btn')?.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
    } catch (_) {}
  });

  const searchInput = overlay.querySelector('#vm-modal-search');
  const filterSelect = overlay.querySelector('#vm-modal-filter');
  const modalBody = overlay.querySelector('#vm-modal-body');
  const modalCount = overlay.querySelector('#vm-modal-count');

  let vocabList = [];
  try {
    const res = await chrome.storage.local.get('vocabulary');
    vocabList = res?.vocabulary || [];
  } catch (err) {
    modalBody.innerHTML = `<div class="vm-lib-empty"><div class="vm-lib-empty-icon">⚠️</div><div>Không thể đọc dữ liệu: ${escHtml(err.message)}</div></div>`;
    return;
  }

  function renderList() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const filter = filterSelect.value;

    const filtered = vocabList.filter(item => {
      const w = (item.word || '').toLowerCase();
      const m = (item.meaning_vi || item.definition_vi || '').toLowerCase();
      const d = (item.definition_en || '').toLowerCase();
      const matchQ = !q || w.includes(q) || m.includes(q) || d.includes(q);
      const matchF = filter === 'all' || (item.status || 'new') === filter;
      return matchQ && matchF;
    }).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    modalCount.textContent = `${filtered.length} từ`;

    if (!filtered.length) {
      modalBody.innerHTML = `
        <div class="vm-lib-empty">
          <span class="vm-lib-empty-icon">📖</span>
          <div>${vocabList.length === 0 ? 'Bạn chưa lưu từ vựng nào.<br>Hãy bôi đen từ trên trang web và bấm <b>"Thêm từ"</b>!' : 'Không tìm thấy từ vựng phù hợp với tìm kiếm.'}</div>
        </div>
      `;
      return;
    }

    modalBody.innerHTML = filtered.map(w => {
      const word = w.word || '';
      const ipa = w.ipa || w.ipa_uk || w.ipa_us || '';
      const pos = w.partOfSpeech || '';
      const level = (w.level && !w.level.includes('...')) ? w.level.toUpperCase() : '';
      let meaning = w.meaning_vi || w.definition_vi || '';
      if (meaning && (meaning.toLowerCase() === 'nghĩa tiếng việt' || meaning.toLowerCase().includes('nghĩa thuần việt') || meaning.toLowerCase() === 'bàn điệt')) {
        meaning = (w.definition_vi && w.definition_vi.toLowerCase() !== 'nghĩa tiếng việt' ? w.definition_vi : '') || w.definition_en || word;
      }
      const defVi = (w.definition_vi && w.definition_vi !== meaning && w.definition_vi.toLowerCase() !== 'nghĩa tiếng việt') ? w.definition_vi : '';
      const defEn = w.definition_en || '';
      const ex = (w.examples && w.examples.length) ? w.examples[0] : (w.example || '');

      return `
        <div class="vm-lib-card" data-word-id="${escHtml(String(w.id))}">
          <div class="vm-lib-head">
            <div class="vm-lib-word-wrap">
              <span class="vm-lib-word">${escHtml(word)}</span>
              ${ipa ? `<span class="vm-lib-ipa">${escHtml(ipa)}</span>` : ''}
              ${pos ? `<span class="vm-lib-pos">${escHtml(pos)}</span>` : ''}
              ${level ? `<span class="vm-lib-level">${escHtml(level)}</span>` : ''}
            </div>
            <div class="vm-lib-actions">
              <button type="button" class="vm-lib-btn vm-btn-audio" data-speak="${escHtml(word)}" title="Phát âm">${ICONS.speaker}</button>
              <button type="button" class="vm-lib-btn del vm-btn-del" data-id="${escHtml(String(w.id))}" data-word="${escHtml(word)}" title="Xóa từ này">🗑️</button>
            </div>
          </div>
          ${meaning ? `<div class="vm-lib-meaning">👉 ${escHtml(meaning)}</div>` : ''}
          ${defVi ? `<div class="vm-lib-def">${escHtml(defVi)}</div>` : ''}
          ${defEn ? `<div class="vm-lib-def" style="color:#6c7086;">${escHtml(defEn)}</div>` : ''}
          ${ex ? `<div class="vm-lib-example">"${escHtml(ex)}"</div>` : ''}
        </div>
      `;
    }).join('');

    // Audio handlers
    modalBody.querySelectorAll('.vm-btn-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        if (text) speakText(text, 'en-US');
      });
    });

    // Delete handlers
    modalBody.querySelectorAll('.vm-btn-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const wordName = btn.getAttribute('data-word');
        if (!confirm(`Bạn có chắc muốn xóa từ "${wordName}" khỏi thư viện?`)) return;

        try {
          const res = await chrome.storage.local.get('vocabulary');
          const current = res?.vocabulary || [];
          vocabList = current.filter(item => String(item.id) !== String(id));
          await chrome.storage.local.set({ vocabulary: vocabList });
          renderList();

          // If current tooltip is displaying this word, reset its button
          if (tooltip) {
            const addBtn = tooltip.querySelector('.vm-add-btn');
            if (addBtn && addBtn.classList.contains('vm-btn-saved')) {
              const currentWordEl = tooltip.querySelector('.vm-word');
              if (currentWordEl && currentWordEl.textContent.trim().toLowerCase() === wordName.toLowerCase()) {
                addBtn.classList.remove('vm-btn-saved');
                addBtn.innerHTML = `${ICONS.plus}<span>Thêm từ</span>`;
                addBtn.title = 'Lưu vào sổ từ vựng';
              }
            }
          }
        } catch (err) {
          alert('Không thể xóa: ' + err.message);
        }
      });
    });
  }

  // Initial render & live filter
  renderList();
  searchInput.addEventListener('input', renderList);
  filterSelect.addEventListener('change', renderList);
  setTimeout(() => searchInput.focus(), 100);
}

