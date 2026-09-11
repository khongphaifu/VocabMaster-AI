// d:/extension/content/content.js
// Intercepts text selection, shows floating action trigger, performs AI translation

// Unbind any previous orphaned content script instance if re-injected
if (window.__VOCAB_MASTER_CLEANUP__) {
  try {
    window.__VOCAB_MASTER_CLEANUP__();
  } catch (_) {}
}

function isExtensionValid() {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime && typeof chrome.runtime.sendMessage === 'function' && !!chrome.runtime.id;
  } catch (_) {
    return false;
  }
}

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

let tooltip = null;
let floatTrigger = null;
let activeLibraryModal = null;
let currentSelectionText = '';
let currentAnchorRect = null;
let isProcessing = false;

function handleMouseUp(e) {
  if (!isExtensionValid()) {
    document.removeEventListener('mouseup', handleMouseUp);
    hideFloatTrigger();
    hideTooltip();
    return;
  }

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
          currentAnchorRect = {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
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

    if (!currentAnchorRect) {
      currentAnchorRect = {
        left: e.clientX,
        top: Math.max(0, e.clientY - 20),
        right: e.clientX,
        bottom: e.clientY,
        width: 0,
        height: 20
      };
    }

    showFloatTrigger(triggerX, triggerY, selectedText);
  }, 20);
}

document.addEventListener('mouseup', handleMouseUp);

function handleMouseDown(e) {
  if (tooltip && !tooltip.contains(e.target)) {
    hideTooltip();
  }
  if (floatTrigger && !floatTrigger.contains(e.target)) {
    hideFloatTrigger();
  }
}

document.addEventListener('mousedown', handleMouseDown);

window.__VOCAB_MASTER_CLEANUP__ = () => {
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('mousedown', handleMouseDown);
  hideFloatTrigger();
  hideTooltip();
};

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

let isExitingTrigger = false;
let exitTriggerTimer = null;

function showFloatTrigger(x, y, text) {
  hideFloatTrigger(true);

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
    const anchor = currentAnchorRect || {
      left: triggerRect.left,
      top: triggerRect.top,
      right: triggerRect.right,
      bottom: triggerRect.bottom,
      width: triggerRect.width,
      height: triggerRect.height
    };

    hideFloatTrigger(true);
    await doTranslate(text, anchor);
  });

  document.body.appendChild(floatTrigger);
}

function hideFloatTrigger(immediate = false) {
  if (!floatTrigger) return;

  if (immediate) {
    if (exitTriggerTimer) {
      clearTimeout(exitTriggerTimer);
      exitTriggerTimer = null;
    }
    isExitingTrigger = false;
    floatTrigger.remove();
    floatTrigger = null;
    return;
  }

  if (isExitingTrigger) return;
  isExitingTrigger = true;

  const currentTrigger = floatTrigger;
  currentTrigger.classList.add('vm-float-trigger-exit');

  exitTriggerTimer = setTimeout(() => {
    if (floatTrigger === currentTrigger) {
      currentTrigger.remove();
      floatTrigger = null;
    }
    isExitingTrigger = false;
    exitTriggerTimer = null;
  }, 150);
}

let activeTypewriterTimer = null;

async function doTranslate(text, anchorRect) {
  if (isProcessing) return;
  isProcessing = true;

  const cleanText = (text || '').replace(/[\s\u00A0]+/g, ' ').trim();
  const isWord = !cleanText.includes(' ') && cleanText.length < 35;
  const anchor = anchorRect || currentAnchorRect;
  if (anchor) currentAnchorRect = anchor;

  if (!isExtensionValid()) {
    showExtensionReloadedTooltip(anchor);
    isProcessing = false;
    return;
  }

  // Instant Shell (0ms): render card shell immediately with word header and AI shimmer skeleton
  showStreamingTooltip(cleanText, isWord, anchor);

  try {
    const sendPromise = chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text: cleanText,
      isWord,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Thời gian chờ phản hồi quá lâu (15s). Vui lòng kiểm tra lại mạng hoặc thử lại.')), 15000)
    );

    const response = await Promise.race([sendPromise, timeoutPromise]);
    if (response?.success) {
      showResultTooltip(response.data, anchor);
    } else {
      showErrorTooltip(response?.error || 'Lỗi không xác định', anchor, () => doTranslate(text, anchor));
    }
  } catch (err) {
    const isDisconnected = !isExtensionValid() ||
      (err && (
        String(err.message || '').includes('Extension context invalidated') ||
        String(err.message || '').includes('sendMessage') ||
        String(err.message || '').includes('undefined (reading')
      ));
    if (isDisconnected) {
      showExtensionReloadedTooltip(anchor);
    } else {
      showErrorTooltip(err.message, anchor, () => doTranslate(text, anchor));
    }
  } finally {
    isProcessing = false;
  }
}

// Listen for messages from background (context menu results or open library)
if (isExtensionValid()) {
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'SHOW_RESULT') {
        showResultTooltip(msg.data, currentAnchorRect);
      } else if (msg.type === 'SHOW_ERROR') {
        showErrorTooltip(msg.error, currentAnchorRect);
      } else if (msg.type === 'OPEN_LIBRARY_MODAL') {
        openLibraryModal();
      }
    });
  } catch (_) {}
}

let isExitingTooltip = false;
let exitTooltipTimer = null;

function hideTooltip(immediate = false) {
  if (activeTypewriterTimer) {
    clearInterval(activeTypewriterTimer);
    activeTypewriterTimer = null;
  }
  if (!tooltip) return;

  if (immediate) {
    if (exitTooltipTimer) {
      clearTimeout(exitTooltipTimer);
      exitTooltipTimer = null;
    }
    isExitingTooltip = false;
    tooltip.remove();
    tooltip = null;
    return;
  }

  if (isExitingTooltip) return;
  isExitingTooltip = true;

  const currentTip = tooltip;
  currentTip.classList.add('vm-tooltip-exit');

  exitTooltipTimer = setTimeout(() => {
    if (tooltip === currentTip) {
      currentTip.remove();
      tooltip = null;
    }
    isExitingTooltip = false;
    exitTooltipTimer = null;
  }, 190);
}

function createTooltipBase() {
  const el = document.createElement('div');
  el.className = 'vm-tooltip';
  el.style.visibility = 'hidden';
  el.style.left = '0px';
  el.style.top = '0px';
  return el;
}

/**
 * Smart Tooltip Positioning:
 * - Automatically checks available space above and below the anchor.
 * - If space below is insufficient, flips tooltip ABOVE the selected word.
 * - Clamps coordinates to keep the tooltip fully visible within the viewport (no screen cutoff).
 */
function smartPositionTooltip(anchorRect) {
  if (!tooltip) return;

  const target = anchorRect || currentAnchorRect;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset || 0;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const padding = 12;
  const gap = 8;

  // Measure tooltip rendered dimensions
  const tipRect = tooltip.getBoundingClientRect();
  const tipWidth = tipRect.width || 360;
  const tipHeight = tipRect.height || 220;

  let idealTop;
  let idealLeft;

  if (target) {
    const targetTop = target.top;
    const targetBottom = target.bottom;
    const targetLeft = target.left;

    const spaceBelow = viewportHeight - targetBottom - padding;
    const spaceAbove = targetTop - padding;

    let viewportTop;

    // Check whether to place below or flip above
    if (spaceBelow >= tipHeight + gap) {
      viewportTop = targetBottom + gap;
    } else if (spaceAbove >= tipHeight + gap) {
      viewportTop = targetTop - tipHeight - gap;
    } else {
      if (spaceBelow >= spaceAbove) {
        viewportTop = targetBottom + gap;
      } else {
        viewportTop = targetTop - tipHeight - gap;
      }
    }

    // Clamp viewportTop so tooltip stays completely within viewport bounds
    const maxTop = Math.max(padding, viewportHeight - tipHeight - padding);
    const minTop = padding;
    viewportTop = Math.max(minTop, Math.min(viewportTop, maxTop));

    idealTop = scrollY + viewportTop;

    // Horizontally align with target.left, clamped within viewport
    let viewportLeft = targetLeft;
    const maxLeft = Math.max(padding, viewportWidth - tipWidth - padding);
    const minLeft = padding;
    viewportLeft = Math.max(minLeft, Math.min(viewportLeft, maxLeft));

    idealLeft = scrollX + viewportLeft;
  } else {
    // Fallback: centered near top of screen
    idealLeft = scrollX + Math.max(padding, (viewportWidth - tipWidth) / 2);
    idealTop = scrollY + Math.max(padding, 60);
  }

  tooltip.style.left = `${Math.round(idealLeft)}px`;
  tooltip.style.top = `${Math.round(idealTop)}px`;
  tooltip.style.visibility = 'visible';
}

/**
 * Instant Shell (0ms): Renders popup card immediately with word header and AI shimmer skeleton
 */
function showStreamingTooltip(text, isWord, anchorRect) {
  hideTooltip(true);
  tooltip = createTooltipBase();

  const cleanText = (text || '').trim();
  const cambridgeUrl = `https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(cleanText.toLowerCase())}`;

  tooltip.innerHTML = `
    <div class="vm-card">
      <!-- Header Row: Word & Instant Actions -->
      <div class="vm-header">
        <div class="vm-word-wrap">
          <span class="vm-word">${escHtml(cleanText)}</span>
          <span class="vm-source-tag" style="animation: vm-stream-in 0.2s ease;">
            <span class="vm-stream-sparkle">✨</span> AI Thinking...
          </span>
        </div>
        <div class="vm-header-tools">
          <button type="button" class="vm-tool-btn vm-copy-btn" title="Sao chép từ">${ICONS.copy}</button>
          <a href="${cambridgeUrl}" target="_blank" rel="noopener noreferrer" class="vm-tool-btn" title="Xem trên Cambridge Dictionary Online" style="text-decoration:none;display:flex;align-items:center;justify-content:center;color:#89b4fa;font-size:12px;">📖</a>
          <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng">${ICONS.close}</button>
        </div>
      </div>

      <!-- AI Shimmer Skeleton -->
      <div class="vm-stream-skeleton">
        ${isWord ? `
          <div class="vm-skeleton-pills">
            <div class="vm-skeleton-pill" style="width: 78px;"></div>
            <div class="vm-skeleton-pill" style="width: 78px;"></div>
            <div class="vm-skeleton-pill" style="width: 48px;"></div>
          </div>
          <div class="vm-skeleton-meaning"></div>
          <div class="vm-skeleton-line" style="width: 90%;"></div>
          <div class="vm-skeleton-line" style="width: 65%;"></div>
        ` : `
          <div class="vm-skeleton-meaning" style="height: 52px;"></div>
          <div class="vm-skeleton-line" style="width: 92%;"></div>
          <div class="vm-skeleton-line" style="width: 70%;"></div>
        `}
        <div class="vm-stream-status">
          <span class="vm-stream-sparkle">✨</span>
          <span>Đang phân tích & dịch từ chuẩn Cambridge...</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(tooltip);
  smartPositionTooltip(anchorRect);

  // Hook close button
  tooltip.querySelector('.vm-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideTooltip();
  });

  // Hook copy button
  tooltip.querySelector('.vm-copy-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    navigator.clipboard.writeText(cleanText).then(() => {
      const origHtml = btn.innerHTML;
      btn.innerHTML = ICONS.check;
      btn.classList.add('vm-copied');
      setTimeout(() => {
        btn.innerHTML = origHtml;
        btn.classList.remove('vm-copied');
      }, 1500);
    });
  });
}

/**
 * Progressive Typewriter Streaming for Core Meaning / Translation
 */
function streamTypewriter(element, fullText, speed = 20, onComplete = null) {
  if (!element || !fullText) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  if (activeTypewriterTimer) {
    clearInterval(activeTypewriterTimer);
    activeTypewriterTimer = null;
  }

  const cleanStr = String(fullText).trim();
  const words = cleanStr.split(' ');
  let idx = 0;
  let currentText = '';

  element.innerHTML = '';
  const cursor = document.createElement('span');
  cursor.className = 'vm-stream-cursor';
  element.appendChild(cursor);

  activeTypewriterTimer = setInterval(() => {
    if (idx < words.length) {
      currentText += (idx > 0 ? ' ' : '') + words[idx];
      element.innerHTML = escHtml(currentText);
      element.appendChild(cursor);
      idx++;
    } else {
      clearInterval(activeTypewriterTimer);
      activeTypewriterTimer = null;
      cursor.remove();
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  }, speed);
}

function formatErrorContent(msg) {
  const safe = escHtml(msg || '');
  const withLinks = safe.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#89b4fa;text-decoration:underline;font-weight:600;word-break:break-all;">${url}</a>`;
  });
  return withLinks.replace(/\n/g, '<br>');
}

function showExtensionReloadedTooltip(anchorRect) {
  if (!tooltip || isExitingTooltip) {
    hideTooltip(true);
    tooltip = createTooltipBase();
    document.body.appendChild(tooltip);
  }

  tooltip.innerHTML = `
    <div class="vm-card" style="padding: 14px 16px; min-width: 290px; max-width: 420px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px;">
        <span style="color:#f9e2af; font-weight:700; font-size:13px; display:flex; align-items:center; gap:6px;">
          <span>⚠️</span> Tiện ích vừa được tải lại
        </span>
        <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng">${ICONS.close}</button>
      </div>
      <div style="color:#cdd6f4; font-size:12.5px; line-height:1.5; margin-bottom: 12px;">
        Tiện ích <strong>VocabMaster AI</strong> vừa được nâng cấp phiên bản mới.<br>
        Vui lòng bấm nút bên dưới để tải lại (F5) trang web và kích hoạt kết nối.
      </div>
      <button type="button" class="vm-reload-page-btn" style="appearance:none; -webkit-appearance:none; border:none; background:linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%); color:#11111b; font-weight:700; font-size:12.5px; padding:8px 14px; border-radius:6px; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 8px rgba(166, 227, 161, 0.25);">
        🔄 Tải lại trang web (F5)
      </button>
    </div>
  `;

  smartPositionTooltip(anchorRect);

  tooltip.querySelector('.vm-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideTooltip();
  });

  tooltip.querySelector('.vm-reload-page-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.reload();
  });
}

function showErrorTooltip(msg, anchorRect, retryFn = null) {
  if (!tooltip || isExitingTooltip) {
    hideTooltip(true);
    tooltip = createTooltipBase();
    document.body.appendChild(tooltip);
  }

  const isGeminiIssue = msg && (msg.includes('Generative Language API') || msg.includes('Google Cloud Project') || msg.includes('API restrictions') || msg.includes('API Key'));

  tooltip.innerHTML = `
    <div class="vm-card" style="padding: 12px 14px; min-width: 280px; max-width: 400px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
        <span style="color:#f38ba8; font-weight:700; font-size:12.5px;">⚠️ Thông báo kết nối AI</span>
        <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng">${ICONS.close}</button>
      </div>
      <div class="vm-error" style="margin-bottom: ${(retryFn || isGeminiIssue) ? '10px' : '0'}; line-height: 1.5; font-size: 12px;">
        ${formatErrorContent(msg)}
      </div>
      ${isGeminiIssue ? `
        <button type="button" class="vm-open-settings-btn" style="appearance:none; -webkit-appearance:none; border:none; background:#89b4fa; color:#11111b; font-weight:700; font-size:12px; padding:7px 12px; border-radius:6px; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:6px; transition:0.15s;">
          ⚙️ Mở Cài đặt để Chẩn đoán & Bật API
        </button>
      ` : ''}
      ${retryFn ? `
        <button type="button" class="vm-retry-btn" style="appearance:none; -webkit-appearance:none; border:none; background:#a6e3a1; color:#11111b; font-weight:700; font-size:12px; padding:7px 12px; border-radius:6px; cursor:pointer; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; transition:0.15s;">
          🔄 Thử lại ngay
        </button>
      ` : ''}
    </div>
  `;

  smartPositionTooltip(anchorRect);

  tooltip.querySelector('.vm-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideTooltip();
  });

  tooltip.querySelector('.vm-open-settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
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

function showResultTooltip(data, anchorRect) {
  if (!tooltip || isExitingTooltip) {
    hideTooltip(true);
    tooltip = createTooltipBase();
    document.body.appendChild(tooltip);
  }

  let isWord = data.type === 'word' || (data.word && typeof data.word === 'object');

  // Emergency safety check: if data arrived marked as phrase, but original was a single word
  // and translation contains raw JSON artifacts (e.g. "type: word" or "word_root:"):
  if (!isWord && !data.original?.includes(' ') && (data.original?.length || 0) < 35) {
    const trans = String(data.translation || '');
    if (trans.includes('type: word') || trans.includes('word_root:') || trans.includes('"word":') || trans.startsWith('{')) {
      console.warn('Detected leaked raw JSON in phrase translation. Converting to word card.');
      const mMatch = trans.match(/meaning_vi[":\s]+([^,\n\r"}]+)/i);
      const meaning = mMatch ? mMatch[1].trim() : data.original;
      data = {
        type: 'word',
        original: data.original,
        word: {
          word_root: data.original,
          meaning_vi: meaning,
          partOfSpeech: 'word',
          ipa_uk: '',
          ipa_us: '',
          definition_vi: meaning,
          definition_en: '',
          examples: [],
          collocations: [],
          word_family: [],
          synonyms: []
        }
      };
      isWord = true;
    }
  }

  tooltip.innerHTML = isWord ? buildWordHTML(data) : buildPhraseHTML(data);

  // Position immediately with full rendered contents
  smartPositionTooltip(anchorRect);
  requestAnimationFrame(() => {
    smartPositionTooltip(anchorRect);
  });

  // Trigger typewriter streaming on core meaning / translation
  const streamEl = tooltip.querySelector('[data-stream-text]');
  if (streamEl) {
    const rawText = streamEl.getAttribute('data-stream-text') || '';
    streamTypewriter(streamEl, rawText, 18, () => {
      smartPositionTooltip(anchorRect);
    });
  }

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
      const audioUrl = (lang === 'en-GB' ? data.audioUk : data.audioUs) || data.audioUk || data.audioUs;
      if (audioUrl) {
        try {
          const audio = new Audio(audioUrl);
          audio.play().catch(() => speakText(text, lang));
        } catch (_) {
          speakText(text, lang);
        }
      } else {
        speakText(text, lang);
      }
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
  if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
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
  }

  if (addBtn) {
    addBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!isExtensionValid()) {
        showExtensionReloadedTooltip(currentAnchorRect);
        return;
      }
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
      } catch (err) {
        if (!isExtensionValid()) {
          showExtensionReloadedTooltip(currentAnchorRect);
        } else {
          addBtn.innerHTML = `<span>❌ Lỗi</span>`;
          addBtn.disabled = false;
        }
      }
    });
  }

  // Open library modal button
  if (panelBtn) {
    panelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLibraryModal();
      if (isExtensionValid()) {
        try {
          chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
        } catch (_) {}
      }
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
           s.includes('trong tiếng việt có nghĩa là') ||
           s.includes('giải thích chi tiết ý nghĩa') ||
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
          ${rootWord ? `<span class="vm-root-tag vm-cascade-item vm-cascade-delay-1" title="Từ nguyên thể">➔ ${escHtml(rootWord)}</span>` : ''}
          ${data.source === 'cambridge'
            ? `<span class="vm-source-tag vm-cascade-item vm-cascade-delay-1" title="Bản dịch trực tiếp từ Cambridge Dictionary Online">📚 Cambridge</span>`
            : (data.aiWarning
              ? `<span class="vm-source-tag vm-cascade-item vm-cascade-delay-1" style="background:rgba(249,226,175,0.18);color:#f9e2af;border:1px solid rgba(249,226,175,0.4);" title="${escHtml(data.aiWarning)}">📖 Từ điển chuẩn</span>`
              : (data.source === 'dictionary'
                ? `<span class="vm-source-tag vm-cascade-item vm-cascade-delay-1" title="Bản dịch chuẩn từ điển đã xác thực">📚 Từ điển chuẩn</span>`
                : ''))}
        </div>
        <div class="vm-header-tools">
          <button type="button" class="vm-tool-btn vm-copy-btn" title="Sao chép từ & nghĩa">${ICONS.copy}</button>
          <a href="${data.cambridgeUrl || `https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(orig.toLowerCase())}`}" target="_blank" rel="noopener noreferrer" class="vm-tool-btn" title="Xem trên Cambridge Dictionary Online" style="text-decoration:none;display:flex;align-items:center;justify-content:center;color:#89b4fa;font-size:12px;">📖</a>
          <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng">${ICONS.close}</button>
        </div>
      </div>

      <!-- Meta Row: Pronunciation Pills, POS, Level -->
      <div class="vm-meta-row vm-cascade-item vm-cascade-delay-1">
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

      <!-- Core Meaning (Pure Vietnamese) with streaming typewriter reveal -->
      <div class="vm-meaning-vi vm-cascade-item vm-cascade-delay-2">
        <span class="vm-flag-tag vi">VN</span>
        <span class="vm-meaning-text" data-stream-text="${escHtml(cleanMeaning)}">${escHtml(cleanMeaning)}</span>
      </div>

      ${cleanDefVi ? `
        <div class="vm-def-vi vm-cascade-item vm-cascade-delay-3">
          <span class="vm-bullet-icon">📖</span>
          <span>${escHtml(cleanDefVi)}</span>
        </div>
      ` : ''}

      ${cleanDefEn ? `
        <div class="vm-def-en vm-cascade-item vm-cascade-delay-3">
          <span class="vm-flag-tag en">EN</span>
          <span>${escHtml(cleanDefEn)}</span>
        </div>
      ` : ''}

      <!-- Đồng nghĩa (Synonyms) - High priority right below definitions -->
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
          <div class="vm-synonyms-row vm-cascade-item vm-cascade-delay-3">
            <span class="vm-syn-label">Đồng nghĩa:</span>
            ${validSynonyms.map(s => `<span class="vm-syn-tag">${escHtml(s)}</span>`).join('')}
          </div>
        ` : '';
      })() : ''}

      <!-- 🔗 Cụm từ thông dụng (Collocations) -->
      ${(w.collocations && w.collocations.length) ? (() => {
        const validColloc = w.collocations.filter(c => c && c.phrase && !isPlaceholder(c.phrase) && !isPlaceholder(c.meaning_vi));
        return validColloc.length ? `
          <div class="vm-section vm-cascade-item vm-cascade-delay-4">
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

      <!-- 💡 Các cách dịch khác (Other Meanings) -->
      ${(w.other_meanings && w.other_meanings.length) ? (() => {
        const validOther = w.other_meanings.filter(m => m && m.meaning_vi && !isPlaceholder(m.meaning_vi));
        return validOther.length ? `
          <div class="vm-section vm-cascade-item vm-cascade-delay-4">
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

      <!-- 📝 Ví dụ (Examples) -->
      ${(w.examples && w.examples.length) ? `
        <div class="vm-section vm-cascade-item vm-cascade-delay-5">
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
          <div class="vm-section vm-cascade-item vm-cascade-delay-5">
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

      <!-- Action Buttons -->
      <div class="vm-actions vm-cascade-item vm-cascade-delay-6">
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
  const preview = orig.length > 200 ? orig.slice(0, 200) + '...' : orig;
  const translation = data.translation || '';
  const alt = data.natural_alternative || '';
  const vocab = Array.isArray(data.key_vocabulary) ? data.key_vocabulary : [];
  const explanation = data.explanation || '';

  return `
    <div class="vm-card">
      <!-- Header Row: Title & Actions -->
      <div class="vm-header">
        <div class="vm-word-wrap">
          <span class="vm-phrase-tag">Dịch câu &amp; đoạn văn</span>
        </div>
        <div class="vm-header-tools">
          <button type="button" class="vm-tool-btn vm-copy-btn" title="Sao chép bản dịch">${ICONS.copy}</button>
          <button type="button" class="vm-tool-btn vm-audio-btn" data-speak="${escHtml(orig)}" data-lang="en-US" title="Phát âm câu">${ICONS.speaker}</button>
          <button type="button" class="vm-tool-btn vm-close-btn" title="Đóng (Esc)">${ICONS.close}</button>
        </div>
      </div>

      <!-- Original Text Preview -->
      <div class="vm-phrase-original vm-cascade-item vm-cascade-delay-1">"${escHtml(preview)}"</div>

      <!-- Core Translation (Natural, Pure Vietnamese) -->
      <div class="vm-phrase-translation vm-cascade-item vm-cascade-delay-2" data-stream-text="${escHtml(translation)}">${escHtml(translation)}</div>

      <!-- Alternative Phrasing (if available) -->
      ${alt ? `
        <div class="vm-phrase-alt vm-cascade-item vm-cascade-delay-2">
          <span class="vm-phrase-alt-tag">✨ Diễn đạt khác:</span>
          <span class="vm-phrase-alt-text">${escHtml(alt)}</span>
        </div>
      ` : ''}

      <!-- Key Vocabulary in Sentence -->
      ${vocab.length ? `
        <div class="vm-section vm-cascade-item vm-cascade-delay-3">
          <div class="vm-section-title">🔑 Từ vựng & cụm từ trong câu</div>
          <div class="vm-phrase-vocab-list">
            ${vocab.map(item => `
              <div class="vm-phrase-vocab-item">
                <button type="button" class="vm-vocab-speak-btn" data-speak="${escHtml(item.word)}" data-lang="en-US" title="Nghe phát âm">
                  ${ICONS.speaker}
                </button>
                <b class="vm-phrase-vocab-word">${escHtml(item.word)}</b>
                ${item.ipa ? `<span class="vm-phrase-vocab-ipa">${escHtml(item.ipa)}</span>` : ''}
                ${item.pos ? `<span class="vm-family-pos">${escHtml(item.pos)}</span>` : ''}
                <span class="vm-phrase-vocab-meaning">: ${escHtml(item.meaning_vi)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Vietnamese Linguistic & Grammar Analysis -->
      ${explanation ? `
        <div class="vm-phrase-explain vm-cascade-item vm-cascade-delay-4">
          💡 <b>Phân tích:</b> ${escHtml(explanation)}
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div class="vm-actions vm-cascade-item vm-cascade-delay-5">
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

