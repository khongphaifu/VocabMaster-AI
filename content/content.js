// d:/extension/content/content.js
// Intercepts text selection, shows floating action trigger, performs AI translation

// Top-level state variable declarations (must precede removeAllVocabMasterUI to prevent TDZ ReferenceError)
let tooltip = null;
let floatTrigger = null;
let activeLibraryModal = null;
let embedPdfPill = null;
let currentSelectionText = '';
let currentAnchorRect = null;
let currentContextSentence = '';
let lastPointerClient = null;
let isProcessing = false;
let isExitingTrigger = false;
let exitTriggerTimer = null;
let isExitingTooltip = false;
let exitTooltipTimer = null;
let activeTypewriterTimer = null;
let selectionChangeDebounceTimer = null;
let isCapturingDocsCopy = false;
let docsCaptureCache = { key: '', text: '', at: 0 };
let docsBridgeObserver = null;
let docsBridgeTimer = null;
const boundDocsIframes = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
const bridgedIframeDocs = [];

function removeAllVocabMasterUI() {
  safeQueryAll(document, '.vm-tooltip, .vm-float-trigger, .vm-modal-overlay, .vm-embed-pdf-pill').forEach(el => {
    try { el.remove(); } catch (_) {}
  });
  tooltip = null;
  floatTrigger = null;
  activeLibraryModal = null;
  embedPdfPill = null;
}

// Unbind any previous orphaned content script instance if re-injected
if (typeof window.__VOCAB_MASTER_CLEANUP__ === 'function') {
  try {
    window.__VOCAB_MASTER_CLEANUP__();
  } catch (_) {}
}
removeAllVocabMasterUI();

function isExtensionValid() {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime && typeof chrome.runtime.sendMessage === 'function' && !!chrome.runtime.id;
  } catch (_) {
    return false;
  }
}

function safeQueryAll(root, selector) {
  try {
    return root && typeof root.querySelectorAll === 'function' ? Array.from(root.querySelectorAll(selector) || []) : [];
  } catch (_) {
    return [];
  }
}

function getSafeHostname() {
  try {
    return String(window.location?.hostname || document.location?.hostname || '').toLowerCase();
  } catch (_) {
    return '';
  }
}

const RICH_EDITOR_HOSTS = [
  'docs.google.com',
  'drive.google.com',
  'notion.so',
  'notion.site',
  'office.com',
  'officeapps.live.com',
  'sharepoint.com',
  'onedrive.live.com',
  'overleaf.com',
  'medium.com',
  'substack.com',
  'figma.com',
  'canva.com'
];

function hostMatchesList(hostname, list) {
  return !!hostname && list.some(h => hostname === h || hostname.endsWith('.' + h));
}

function isRichEditorHost() {
  return hostMatchesList(getSafeHostname(), RICH_EDITOR_HOSTS);
}

function isGoogleWorkspaceHost() {
  return hostMatchesList(getSafeHostname(), ['docs.google.com', 'drive.google.com']);
}

function normalizeRectObj(r) {
  if (!r || (r.width === 0 && r.height === 0)) return null;
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height
  };
}

function getRangeAnchorRect(range) {
  if (!range || typeof range.getBoundingClientRect !== 'function') return null;
  if (typeof range.getClientRects === 'function') {
    const clientRects = Array.from(range.getClientRects() || []).filter(r => r && r.width > 1 && r.height > 1);
    if (clientRects.length > 1) {
      const minLeft = Math.min(...clientRects.map(r => r.left));
      const lastRect = clientRects[clientRects.length - 1];
      return {
        left: minLeft,
        top: lastRect.top,
        right: lastRect.right,
        bottom: lastRect.bottom,
        width: lastRect.width,
        height: lastRect.height
      };
    }
    if (clientRects.length === 1) {
      return normalizeRectObj(clientRects[0]);
    }
  }
  return normalizeRectObj(range.getBoundingClientRect());
}

function isPdfSelectionNode(node) {
  if (!node) return false;
  const el = node.nodeType === 3 ? (node.parentElement || node.parentNode) : node;
  if (!el || typeof el.closest !== 'function') return false;
  return !!(el.closest('.textLayer') || el.closest('.pdf-ocr-result-box') || el.closest('.scanned-text-box'));
}

function normalizeSelectedPdfText(rawText, node) {
  if (!rawText) return '';
  if (!isPdfSelectionNode(node)) return String(rawText).trim();
  return String(rawText)
    .replace(/([A-Za-z])-\s*\r?\n\s*([a-z])/g, '$1$2')
    .replace(/[\s\u00A0]+/g, ' ')
    .trim();
}

function uniteElementRects(elements) {
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  const rects = [];

  for (const el of elements) {
    if (!el || typeof el.getBoundingClientRect !== 'function') continue;
    const r = el.getBoundingClientRect();
    if (!r || r.width <= 0 || r.height <= 0) continue;
    rects.push(r);
    if (r.left < minL) minL = r.left;
    if (r.top < minT) minT = r.top;
    if (r.right > maxR) maxR = r.right;
    if (r.bottom > maxB) maxB = r.bottom;
  }

  if (!rects.length) return { unionRect: null, rects };
  return {
    unionRect: {
      left: minL,
      top: minT,
      right: maxR,
      bottom: maxB,
      width: Math.max(0, maxR - minL),
      height: Math.max(0, maxB - minT)
    },
    rects
  };
}

function attachPointerShield(el, preventFocusLoss = false) {
  if (!el || typeof el.addEventListener !== 'function') return;
  ['pointerdown', 'mousedown'].forEach(evName => {
    el.addEventListener(evName, (e) => {
      e.stopPropagation();
      if (preventFocusLoss && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
    }, true);
  });
  ['pointerup', 'mouseup', 'touchstart', 'touchend'].forEach(evName => {
    el.addEventListener(evName, (e) => {
      e.stopPropagation();
    }, true);
  });
}

function isInsideVocabMaster(node) {
  if (!node) return false;
  const el = node.nodeType === 3 ? (node.parentElement || node.parentNode) : node;
  if (!el || typeof el.closest !== 'function') return false;
  return !!(el.closest('.vm-tooltip') || el.closest('.vm-float-trigger') || el.closest('.vm-modal-overlay') || el.closest('.vm-embed-pdf-pill'));
}

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// Anti-select and Anti-copy bypass for protected websites (skip Rich Editors/Canvas so toolbars & drag work)
async function enableUniversalSelection() {
  try {
    if (isRichEditorHost()) return;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const { anti_select_enabled = true } = await chrome.storage.local.get('anti_select_enabled').catch(() => ({ anti_select_enabled: true }));
      if (anti_select_enabled === false) return;
    }
    const styleId = 'vm-universal-select-style';
    if (typeof document.getElementById === 'function' && !document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* VocabMaster Universal Selection Unlocker */
        html, body, p, span, div, td, th, li, a, h1, h2, h3, h4, h5, h6, article, section, main, b, i, strong, em {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }
  } catch (_) {}
}
enableUniversalSelection();

function getSurroundingSentence(selection) {
  if (!selection || selection.rangeCount === 0) return '';
  try {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    let block = container.nodeType === 3 ? container.parentNode : container;

    const blockTags = ['P', 'DIV', 'LI', 'BLOCKQUOTE', 'ARTICLE', 'SECTION', 'TD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    while (block && block !== document.body && !blockTags.includes(block.nodeName)) {
      block = block.parentNode;
    }
    const text = (block || container).innerText || (block || container).textContent || '';
    if (!text) return '';

    const selectedStr = selection.toString().trim();
    if (!selectedStr) return '';

    const sentences = text.split(/(?<=[.!?\n])\s+/);
    for (const s of sentences) {
      if (s.includes(selectedStr)) {
        return s.trim().replace(/\s+/g, ' ').slice(0, 300);
      }
    }
    return text.trim().replace(/\s+/g, ' ').slice(0, 300);
  } catch (_) {
    return '';
  }
}

/**
 * Extracts text from Google Docs hidden iframe.docs-texteventtarget-iframe using selection or copy capture.
 */
function captureTextFromDocsIframe(iframeDoc, rectKey) {
  if (!iframeDoc || isCapturingDocsCopy) return '';
  if (rectKey && docsCaptureCache.key === rectKey && Date.now() - docsCaptureCache.at < 3500) {
    return docsCaptureCache.text;
  }

  // First try direct iframe selection without firing copy event
  try {
    const iSel = iframeDoc.getSelection?.();
    const direct = iSel ? iSel.toString().trim() : '';
    if (direct) {
      docsCaptureCache = { key: rectKey, text: direct, at: Date.now() };
      return direct;
    }
  } catch (_) {}

  // Temporary copy listener + MAIN-world DataTransfer capture bridge
  isCapturingDocsCopy = true;
  let captured = '';
  const onCopy = (ev) => {
    try {
      const txt = ev?.clipboardData?.getData?.('text/plain');
      if (txt && txt.trim()) {
        captured = txt.trim();
        ev.preventDefault?.();
      }
    } catch (_) {}
  };

  try {
    if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('vm-gdocs-capture-start'));
    }
    iframeDoc.addEventListener?.('copy', onCopy, false);
    if (typeof iframeDoc.execCommand === 'function') {
      iframeDoc.execCommand('copy');
    }
    if (!captured && typeof document.documentElement?.getAttribute === 'function') {
      const mainCaptured = document.documentElement.getAttribute('data-vm-gdocs-captured');
      if (mainCaptured && mainCaptured.trim()) captured = mainCaptured.trim();
    }
  } catch (_) {
  } finally {
    try {
      iframeDoc.removeEventListener?.('copy', onCopy, false);
      document.documentElement?.removeAttribute?.('data-vm-gdocs-captured');
      if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('vm-gdocs-capture-end'));
      }
    } catch (_) {}
    isCapturingDocsCopy = false;
  }

  if (captured && rectKey) {
    docsCaptureCache = { key: rectKey, text: captured, at: Date.now() };
  }
  return captured;
}

function extractGoogleDocsSvgText(selectionRects) {
  if (!selectionRects || !selectionRects.length) return '';
  const candidates = safeQueryAll(
    document,
    '.kix-canvas-tile-content svg [aria-label], .kix-page-paginated svg [aria-label], .kix-lineview-text-block, .kix-wordhtmlgenerator-word-node'
  );
  if (!candidates.length) return '';

  const matched = [];
  for (const el of candidates) {
    // Skip container groups whose children also hold aria-label
    if (el.tagName?.toLowerCase?.() === 'g' && safeQueryAll(el, '[aria-label]').length > 0) continue;
    const text = (el.getAttribute?.('aria-label') || el.textContent || '').trim();
    if (!text) continue;
    const r = el.getBoundingClientRect?.();
    if (!r || r.width <= 0 || r.height <= 0) continue;

    const overlaps = selectionRects.some(sr => {
      const overlapX = Math.min(r.right, sr.right) - Math.max(r.left, sr.left);
      const overlapY = Math.min(r.bottom, sr.bottom) - Math.max(r.top, sr.top);
      return overlapX > Math.min(3, r.width * 0.25) && overlapY > Math.min(3, r.height * 0.25);
    });
    if (overlaps) matched.push({ text, top: r.top, left: r.left });
  }

  if (!matched.length) return '';
  matched.sort((a, b) => (Math.abs(a.top - b.top) > 6 ? a.top - b.top : a.left - b.left));
  return matched.map(m => m.text).join(' ').replace(/\s+/g, ' ').trim();
}

function extractGoogleDocsSelection(source) {
  const hasDocsDom = isGoogleWorkspaceHost() ||
    safeQueryAll(document, 'iframe.docs-texteventtarget-iframe, .kix-appview-editor').length > 0;
  if (!hasDocsDom) return null;

  // 1. Measure selection highlight rects on Kix Canvas or Docs overlay
  const selEls = safeQueryAll(
    document,
    '.kix-canvas-tile-selection rect, .kix-canvas-tile-selection, .kix-selection-overlay, .docs-gm-selection-overlay'
  );
  const { unionRect, rects } = uniteElementRects(selEls);
  const hasSelectionRect = !!(unionRect && unionRect.width > 2 && unionRect.height > 2);

  // 2. Google Sheets formula bar / active cell input
  const sheetInputs = safeQueryAll(document, '#waffle-rich-text-editor, .cell-input');
  for (const cellEl of sheetInputs) {
    try {
      const sel = window.getSelection?.();
      const txt = sel && sel.rangeCount > 0 ? sel.toString().trim() : '';
      if (txt && typeof cellEl.contains === 'function' && cellEl.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        return {
          selectedText: txt,
          selObj: sel,
          anchorRect: getRangeAnchorRect(sel.getRangeAt(0)) || normalizeRectObj(cellEl.getBoundingClientRect?.()),
          contextSentence: (cellEl.textContent || '').trim().slice(0, 300)
        };
      }
    } catch (_) {}
  }

  if (!hasSelectionRect) return null;

  const rectKey = `${Math.round(unionRect.left)}:${Math.round(unionRect.top)}:${Math.round(unionRect.right)}:${Math.round(unionRect.bottom)}`;
  let selectedText = '';

  // 3. Docs text-event iframe (direct selection or non-destructive copy capture)
  const iframes = safeQueryAll(document, 'iframe.docs-texteventtarget-iframe');
  for (const frame of iframes) {
    try {
      const fDoc = frame.contentDocument || frame.contentWindow?.document;
      if (!fDoc) continue;
      if (source === 'mouseup' || source === 'keyup' || source === 'hotkey' || source === 'pointerup') {
        selectedText = captureTextFromDocsIframe(fDoc, rectKey);
      } else if (docsCaptureCache.key === rectKey) {
        selectedText = docsCaptureCache.text;
      }
      if (selectedText) break;
    } catch (_) {}
  }

  // 4. Fallback: SVG [aria-label] / accessible word nodes (e.g. Copy-restricted View-only Docs)
  if (!selectedText) {
    selectedText = extractGoogleDocsSvgText(rects);
  }

  if (!selectedText) return null;
  return {
    selectedText,
    selObj: null,
    anchorRect: unionRect,
    contextSentence: ''
  };
}

/**
 * Resolve ShadowRoot candidates from both event.composedPath() (Reddit, web components)
 * and document.activeElement chain.
 */
function collectShadowRoots(lastEvent) {
  const roots = [];
  const seen = new Set();
  const pushRoot = (r) => {
    if (r && !seen.has(r) && typeof r.getSelection === 'function') {
      seen.add(r);
      roots.push(r);
    }
  };

  try {
    if (lastEvent && typeof lastEvent.composedPath === 'function') {
      for (const node of lastEvent.composedPath()) {
        if (!node) continue;
        if (node.shadowRoot) pushRoot(node.shadowRoot);
        const root = typeof node.getRootNode === 'function' ? node.getRootNode() : null;
        if (root && root.host) pushRoot(root);
      }
    }
  } catch (_) {}

  try {
    let active = document.activeElement;
    while (active && active.shadowRoot) {
      pushRoot(active.shadowRoot);
      active = active.shadowRoot.activeElement;
    }
  } catch (_) {}

  return roots;
}

function getFormOrCodeEditorAnchor(activeEl) {
  try {
    const monaco = activeEl.closest?.('.monaco-editor');
    if (monaco) {
      const { unionRect } = uniteElementRects(safeQueryAll(monaco, '.selected-text'));
      if (unionRect && unionRect.width > 0) return unionRect;
    }
    const cm = activeEl.closest?.('.cm-editor');
    if (cm) {
      const { unionRect } = uniteElementRects(safeQueryAll(cm, '.cm-selectionBackground'));
      if (unionRect && unionRect.width > 0) return unionRect;
    }
  } catch (_) {}

  if (lastPointerClient) {
    return {
      left: lastPointerClient.x - 10,
      top: Math.max(0, lastPointerClient.y - 20),
      right: lastPointerClient.x + 10,
      bottom: lastPointerClient.y + 4,
      width: 20,
      height: 24
    };
  }
  return typeof activeEl.getBoundingClientRect === 'function' ? normalizeRectObj(activeEl.getBoundingClientRect()) : null;
}

/**
 * Universal Selection Engine:
 * Standard DOM selection -> Shadow DOM (composedPath + activeElement) -> Inputs/Monaco/CodeMirror -> Google Docs Kix.
 */
function getDeepActiveSelection(lastEvent = null, source = '') {
  let selectedText = '';
  let selObj = null;
  let anchorRect = null;
  let contextSentence = '';

  // 1. Standard window selection
  try {
    const sel = window.getSelection?.();
    if (sel && sel.rangeCount > 0 && sel.toString().trim()) {
      const range = sel.getRangeAt(0);
      if (isInsideVocabMaster(range.commonAncestorContainer) ||
          isInsideVocabMaster(range.startContainer) ||
          isInsideVocabMaster(range.endContainer)) {
        return { selectedText: '', selObj: null, anchorRect: null, contextSentence: '' };
      }

      selectedText = normalizeSelectedPdfText(sel.toString(), range.commonAncestorContainer);
      selObj = sel;
      anchorRect = getRangeAnchorRect(range);
      contextSentence = getSurroundingSentence(sel);
    }
  } catch (_) {}

  // 2. Shadow DOM traversal (handles Reddit <shreddit-post> even when activeElement === document.body)
  if (!selectedText) {
    for (const root of collectShadowRoots(lastEvent)) {
      try {
        const sSel = root.getSelection();
        if (sSel && sSel.rangeCount > 0 && sSel.toString().trim()) {
          const sRange = sSel.getRangeAt(0);
          if (isInsideVocabMaster(sRange.commonAncestorContainer) ||
              isInsideVocabMaster(sRange.startContainer) ||
              isInsideVocabMaster(sRange.endContainer)) {
            return { selectedText: '', selObj: null, anchorRect: null, contextSentence: '' };
          }
          selectedText = sSel.toString().trim();
          selObj = sSel;
          anchorRect = getRangeAnchorRect(sRange);
          contextSentence = getSurroundingSentence(sSel);
          break;
        }
      } catch (_) {}
    }
  }

  // 3. Form controls (<input>, <textarea>) & Code Editors (Monaco, CodeMirror)
  if (!selectedText) {
    try {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        if (isInsideVocabMaster(active)) {
          return { selectedText: '', selObj: null, anchorRect: null, contextSentence: '' };
        }
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && start < end) {
          selectedText = active.value.substring(start, end).trim();
          if (selectedText) {
            anchorRect = getFormOrCodeEditorAnchor(active);
            contextSentence = active.value.slice(0, 300);
          }
        }
      }
    } catch (_) {}
  }

  // 4. Google Docs / Slides / Sheets Canvas Kix Engine
  if (!selectedText) {
    const gdocs = extractGoogleDocsSelection(source);
    if (gdocs && gdocs.selectedText) {
      return gdocs;
    }
  }

  return { selectedText, selObj, anchorRect, contextSentence };
}

function evaluateSelection(source, e) {
  if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
    lastPointerClient = { x: e.clientX, y: e.clientY };
  }

  // 1. Mutual exclusion: If any tooltip or library modal is currently open, NEVER show floatTrigger
  const activeTooltip = safeQueryAll(document, '.vm-tooltip:not(.vm-tooltip-exit)')[0];
  if (activeTooltip || (tooltip && !isExitingTooltip && document.body.contains(tooltip)) || activeLibraryModal) {
    hideFloatTrigger(true);
    return;
  }

  // 2. Ignore events originating inside our own UI
  if (e && e.target && isInsideVocabMaster(e.target)) {
    return;
  }

  const { selectedText, anchorRect, contextSentence } = getDeepActiveSelection(e, source);

  if (!selectedText || selectedText.length < 1 || selectedText.length > 2500) {
    hideFloatTrigger();
    return;
  }

  // Prevent flicker if button is already shown for the exact same text
  if (floatTrigger && currentSelectionText === selectedText && source === 'selectionchange') {
    return;
  }

  currentSelectionText = selectedText;
  currentContextSentence = contextSentence;

  let triggerX = 0;
  let triggerY = 0;
  const scrollX = window.scrollX || window.pageXOffset || 0;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const viewW = window.innerWidth || 300;
  const viewH = window.innerHeight || 400;
  const richEditor = isRichEditorHost();

  if (anchorRect && (anchorRect.width > 0 || anchorRect.height > 0)) {
    currentAnchorRect = anchorRect;
    triggerX = scrollX + anchorRect.right + 4;
    if (richEditor) {
      // Place BELOW selection on Rich Editors (Google Docs, Notion, Word, Medium) to dodge top formatting toolbars
      triggerY = scrollY + anchorRect.bottom + 8;
      if (triggerY > scrollY + viewH - 44) {
        triggerY = scrollY + anchorRect.top - 36;
      }
    } else {
      triggerY = scrollY + anchorRect.top - 36;
      if (triggerY < scrollY + 5) {
        triggerY = scrollY + anchorRect.bottom + 6;
      }
    }
  } else if (e && typeof e.pageX === 'number' && typeof e.pageY === 'number') {
    triggerX = e.pageX + 6;
    triggerY = richEditor ? (e.pageY + 14) : (e.pageY - 34);
    currentAnchorRect = {
      left: e.clientX,
      top: Math.max(0, e.clientY - 20),
      right: e.clientX,
      bottom: e.clientY,
      width: 0,
      height: 20
    };
  } else {
    triggerX = scrollX + (viewW / 2);
    triggerY = scrollY + 40;
    currentAnchorRect = {
      left: viewW / 2,
      top: 40,
      right: viewW / 2,
      bottom: 60,
      width: 0,
      height: 20
    };
  }

  // Viewport & iframe boundaries clamping (ensures button never overflows outside frame)
  const minX = scrollX + 4;
  const maxX = scrollX + Math.max(minX + 10, viewW - 40);
  triggerX = Math.max(minX, Math.min(triggerX, maxX));

  const minY = scrollY + 4;
  const maxY = scrollY + Math.max(minY + 10, viewH - 40);
  triggerY = Math.max(minY, Math.min(triggerY, maxY));

  showFloatTrigger(triggerX, triggerY, selectedText);

  // Speculative Selection Prefetching:
  const cleanPrefetch = selectedText.trim();
  const isSingleWord = !cleanPrefetch.includes(' ') && cleanPrefetch.length < 35;
  if (isSingleWord && isExtensionValid()) {
    try {
      chrome.runtime.sendMessage({
        type: 'PREFETCH_WORD',
        text: cleanPrefetch,
        contextSentence: currentContextSentence
      }).catch(() => {});
    } catch (_) {}
  }
}

function handleMouseUp(e) {
  setTimeout(() => evaluateSelection('mouseup', e), 20);
}

function handleTouchEnd(e) {
  // iOS/iPadOS WebKit updates selection range asynchronously slightly after touchend
  setTimeout(() => evaluateSelection('touchend', e), 95);
}

function handleKeyUp(e) {
  if (['Shift', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
    setTimeout(() => evaluateSelection('keyup', e), 50);
  }
}

function handleSelectionChange() {
  clearTimeout(selectionChangeDebounceTimer);
  selectionChangeDebounceTimer = setTimeout(() => {
    if (document.activeElement && isInsideVocabMaster(document.activeElement)) {
      return;
    }
    evaluateSelection('selectionchange', null);
  }, 350);
}

function handleMouseDown(e) {
  if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
    lastPointerClient = { x: e.clientX, y: e.clientY };
  }
  if (e.target && isInsideVocabMaster(e.target)) {
    return;
  }
  if (tooltip && !tooltip.contains(e.target)) {
    hideTooltip(true);
  }
  if (floatTrigger && !floatTrigger.contains(e.target)) {
    hideFloatTrigger(true);
  }
}

function handleShortcutKeyDown(e) {
  if (e.key === 'Escape') {
    if (activeLibraryModal) {
      closeLibraryModal();
      return;
    }
    hideTooltip();
    hideFloatTrigger();
    return;
  }

  // Alt+D shortcut for instant lookup/translation inside any webpage, Docs, Notion, or input
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === 'd' || e.key === 'D' || e.code === 'KeyD')) {
    const deep = getDeepActiveSelection(e, 'hotkey');
    const text = (deep.selectedText || currentSelectionText || '').trim();
    if (!text || text.length > 2500) return;

    e.preventDefault?.();
    e.stopPropagation?.();
    const anchor = deep.anchorRect || currentAnchorRect || (lastPointerClient ? {
      left: lastPointerClient.x,
      top: Math.max(0, lastPointerClient.y - 18),
      right: lastPointerClient.x + 12,
      bottom: lastPointerClient.y + 4,
      width: 12,
      height: 22
    } : null);
    const ctx = deep.contextSentence || currentContextSentence || '';
    hideFloatTrigger(true);
    doTranslate(text, anchor, ctx);
  }
}

function bindDocsIframeBridge() {
  if (!isGoogleWorkspaceHost() && safeQueryAll(document, 'iframe.docs-texteventtarget-iframe').length === 0) {
    return;
  }
  const attach = () => {
    let boundCount = 0;
    for (const frame of safeQueryAll(document, 'iframe.docs-texteventtarget-iframe')) {
      try {
        if (boundDocsIframes && boundDocsIframes.has(frame)) {
          boundCount++;
          continue;
        }
        const fDoc = frame.contentDocument || frame.contentWindow?.document;
        if (!fDoc || typeof fDoc.addEventListener !== 'function') continue;
        boundDocsIframes?.add(frame);
        bridgedIframeDocs.push(fDoc);
        fDoc.addEventListener('keyup', handleKeyUp, true);
        fDoc.addEventListener('keydown', handleShortcutKeyDown, true);
        boundCount++;
      } catch (_) {}
    }
    if (boundCount > 0 && docsBridgeTimer) {
      clearInterval(docsBridgeTimer);
      docsBridgeTimer = null;
    }
  };
  attach();
  if (typeof MutationObserver === 'function' && document.body && !docsBridgeObserver) {
    try {
      docsBridgeObserver = new MutationObserver(() => attach());
      docsBridgeObserver.observe(document.body, { childList: true, subtree: true });
    } catch (_) {}
  }
  if (typeof setInterval === 'function' && !docsBridgeTimer && bridgedIframeDocs.length === 0) {
    let attempts = 0;
    docsBridgeTimer = setInterval(() => {
      attempts++;
      attach();
      if (attempts >= 8 && docsBridgeTimer) {
        clearInterval(docsBridgeTimer);
        docsBridgeTimer = null;
      }
    }, 2000);
    docsBridgeTimer?.unref?.();
  }
}

async function detectEmbeddedPdfFrames() {
  try {
    if ((window.top || window) !== window) return;
    if (!isExtensionValid() || typeof chrome.runtime.getURL !== 'function') return;

    const curHref = (() => {
      try { return String(window.location?.href || document.location?.href || ''); } catch (_) { return ''; }
    })();
    const isTopNativePdf = document.contentType === 'application/pdf' ||
      safeQueryAll(document, 'embed[type="application/x-google-chrome-pdf"]').length > 0;

    let pdfSrc = '';
    if (isTopNativePdf && curHref && /^(https?|file):/i.test(curHref) && !curHref.includes('#vm_native_pdf=1')) {
      let autoIntercept = true;
      try {
        if (chrome.storage?.local?.get) {
          const cfg = await chrome.storage.local.get('pdf_auto_intercept');
          autoIntercept = cfg?.pdf_auto_intercept !== false;
        }
      } catch (_) {}

      if (autoIntercept) {
        chrome.runtime.sendMessage({
          type: 'OPEN_IN_PDF_READER',
          url: curHref,
          replaceCurrentTab: true
        }).catch(() => {});
        return;
      }
      pdfSrc = curHref;
    }

    if (!pdfSrc) {
      const embeds = safeQueryAll(document, 'embed[type*="pdf"], object[type*="pdf"], iframe[src*=".pdf"]');
      for (const el of embeds) {
        const r = el.getBoundingClientRect?.();
        if (r && (r.width < 180 || r.height < 180)) continue;
        const candidate = el.src || el.data || '';
        if (candidate && /^(https?|file):/i.test(candidate) && !candidate.startsWith('chrome-extension://')) {
          pdfSrc = candidate;
          break;
        }
      }
    }
    if (!pdfSrc || safeQueryAll(document, '.vm-embed-pdf-pill').length > 0) return;

    const pill = document.createElement('div');
    pill.className = 'vm-embed-pdf-pill';
    pill.innerHTML = `
      <button type="button" class="vm-embed-pdf-open" title="Mở file PDF này trong trình đọc hỗ trợ bôi đen dịch">📄 Mở trong VocabMaster PDF</button>
      <button type="button" class="vm-embed-pdf-close" title="Ẩn">✕</button>
    `;
    attachPointerShield(pill, false);
    pill.querySelector?.('.vm-embed-pdf-open')?.addEventListener?.('click', () => {
      const targetUrl = chrome.runtime.getURL(`pdf/reader.html?file=${encodeURIComponent(pdfSrc)}`);
      window.open?.(targetUrl, '_blank');
    });
    pill.querySelector?.('.vm-embed-pdf-close')?.addEventListener?.('click', () => {
      pill.remove();
      embedPdfPill = null;
    });
    (document.body || document.documentElement).appendChild(pill);
    embedPdfPill = pill;
  } catch (_) {}
}

// Attach event listeners using CAPTURE phase (useCapture: true) to bypass e.stopPropagation()
document.addEventListener('mouseup', handleMouseUp, true);
document.addEventListener('keyup', handleKeyUp, true);
document.addEventListener('touchend', handleTouchEnd, true);
document.addEventListener('selectionchange', handleSelectionChange, false);
document.addEventListener('mousedown', handleMouseDown, true);
document.addEventListener('touchstart', handleMouseDown, true);
document.addEventListener('keydown', handleShortcutKeyDown, true);
bindDocsIframeBridge();
detectEmbeddedPdfFrames();
if (typeof setTimeout === 'function') {
  const pdfTimer = setTimeout(detectEmbeddedPdfFrames, 1400);
  pdfTimer?.unref?.();
}

window.__VOCAB_MASTER_CLEANUP__ = () => {
  document.removeEventListener('mouseup', handleMouseUp, true);
  document.removeEventListener('keyup', handleKeyUp, true);
  document.removeEventListener('touchend', handleTouchEnd, true);
  document.removeEventListener('selectionchange', handleSelectionChange, false);
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('touchstart', handleMouseDown, true);
  document.removeEventListener('keydown', handleShortcutKeyDown, true);
  for (const fDoc of bridgedIframeDocs) {
    try {
      fDoc.removeEventListener?.('keyup', handleKeyUp, true);
      fDoc.removeEventListener?.('keydown', handleShortcutKeyDown, true);
    } catch (_) {}
  }
  docsBridgeObserver?.disconnect?.();
  docsBridgeObserver = null;
  if (docsBridgeTimer) {
    clearInterval(docsBridgeTimer);
    docsBridgeTimer = null;
  }
  removeAllVocabMasterUI();
};

function showFloatTrigger(x, y, text) {
  // Mutual exclusion: never spawn float trigger if any tooltip or modal is open
  const activeTooltip = safeQueryAll(document, '.vm-tooltip:not(.vm-tooltip-exit)')[0];
  if (activeTooltip || (tooltip && !isExitingTooltip && document.body.contains(tooltip)) || activeLibraryModal) {
    hideFloatTrigger(true);
    return;
  }

  hideFloatTrigger(true);

  floatTrigger = document.createElement('div');
  floatTrigger.className = 'vm-float-trigger';
  floatTrigger.style.setProperty('left', `${Math.round(x)}px`, 'important');
  floatTrigger.style.setProperty('top', `${Math.round(y)}px`, 'important');
  floatTrigger.style.setProperty('display', 'flex', 'important');
  floatTrigger.style.setProperty('visibility', 'visible', 'important');
  floatTrigger.style.setProperty('opacity', '1', 'important');
  floatTrigger.style.setProperty('pointer-events', 'auto', 'important');
  floatTrigger.style.setProperty('z-index', '2147483647', 'important');
  floatTrigger.innerHTML = '✨';
  floatTrigger.title = 'Dịch bằng AI (VocabMaster · Alt+D)';

  // Prevent editor focus loss / selection clearing when clicking ✨
  attachPointerShield(floatTrigger, true);

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
    await doTranslate(text, anchor, currentContextSentence);
  });

  (document.body || document.documentElement).appendChild(floatTrigger);
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

async function doTranslate(text, anchorRect, contextSentence = null) {
  if (isProcessing) return;
  isProcessing = true;

  const cleanText = (text || '').replace(/[\s\u00A0]+/g, ' ').trim();
  const isWord = !cleanText.includes(' ') && cleanText.length < 35;
  const anchor = anchorRect || currentAnchorRect;
  if (anchor) currentAnchorRect = anchor;

  const ctxSentence = contextSentence !== null ? contextSentence : currentContextSentence;

  // Top-Frame Tooltip Relay: push card out of tiny iframes (e.g. Canvas/Moodle/Youpass embeds)
  let isTinyIframe = false;
  try {
    isTinyIframe = (window.top || window) !== window && ((window.innerHeight || 0) < 340 || (window.innerWidth || 0) < 380);
  } catch (_) {}

  if (isTinyIframe && isExtensionValid()) {
    hideFloatTrigger(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'RELAY_TRANSLATE_TO_TOP',
        text: cleanText,
        isWord,
        contextSentence: ctxSentence,
        anchorRect: anchor
      });
    } catch (_) {}
    isProcessing = false;
    return;
  }

  if (!isExtensionValid()) {
    showExtensionReloadedTooltip(anchor);
    isProcessing = false;
    return;
  }

  // Instant Shell (0ms): render card shell immediately with word header and AI shimmer skeleton
  showStreamingTooltip(cleanText, isWord, anchor);

  let timeoutId = null;
  try {
    const sendPromise = chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text: cleanText,
      isWord,
      contextSentence: ctxSentence,
    });

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Thời gian chờ phản hồi quá lâu (15s). Vui lòng kiểm tra lại mạng hoặc thử lại.')),
        15000
      );
      timeoutId?.unref?.();
    });

    const response = await Promise.race([sendPromise, timeoutPromise]);
    if (response?.success) {
      showResultTooltip(response.data, anchor);
    } else {
      showErrorTooltip(response?.error || 'Lỗi không xác định', anchor, () => doTranslate(text, anchor, ctxSentence));
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
      showErrorTooltip(err.message, anchor, () => doTranslate(text, anchor, ctxSentence));
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    isProcessing = false;
  }
}

window.__VM_TRANSLATE_SELECTION__ = (text, rect = null, ctx = null) => doTranslate(text, rect, ctx);

// Listen for messages from background (context menu results, top-frame relay, or open library)
if (isExtensionValid() && chrome.runtime.onMessage?.addListener) {
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'SHOW_RESULT') {
        showResultTooltip(msg.data, currentAnchorRect);
      } else if (msg.type === 'SHOW_ERROR') {
        showErrorTooltip(msg.error, currentAnchorRect);
      } else if (msg.type === 'OPEN_LIBRARY_MODAL') {
        openLibraryModal();
      } else if (msg.type === 'RENDER_RELAYED_TOOLTIP') {
        let isTopFrame = true;
        try { isTopFrame = (window.top || window) === window; } catch (_) {}
        if (!isTopFrame || !msg.text) return;

        let topAnchor = null;
        try {
          const activeEl = document.activeElement;
          if (activeEl && activeEl.tagName === 'IFRAME' && typeof activeEl.getBoundingClientRect === 'function') {
            const fRect = activeEl.getBoundingClientRect();
            const rel = msg.anchorRect || { left: 20, top: 20, right: 80, bottom: 40, width: 60, height: 20 };
            topAnchor = {
              left: fRect.left + (rel.left || 0),
              top: fRect.top + (rel.top || 0),
              right: fRect.left + (rel.right || 60),
              bottom: fRect.top + (rel.bottom || 30),
              width: rel.width || 60,
              height: rel.height || 20
            };
          }
        } catch (_) {}
        if (!topAnchor) {
          const vw = window.innerWidth || 900;
          topAnchor = { left: Math.max(20, vw / 2 - 140), top: 90, right: vw / 2 + 40, bottom: 112, width: 180, height: 22 };
        }
        doTranslate(msg.text, topAnchor, msg.contextSentence || '');
      }
    });
  } catch (_) {}
}

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
  hideFloatTrigger(true);
  safeQueryAll(document, '.vm-tooltip').forEach(el => {
    try { el.remove(); } catch (_) {}
  });
  const el = document.createElement('div');
  el.className = 'vm-tooltip';
  el.style.visibility = 'hidden';
  el.style.left = '0px';
  el.style.top = '0px';
  attachPointerShield(el, false);
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
  hideFloatTrigger(true);
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

  (document.body || document.documentElement).appendChild(tooltip);
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
  hideFloatTrigger(true);
  hideTooltip(true);
  tooltip = createTooltipBase();
  (document.body || document.documentElement).appendChild(tooltip);

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
  hideFloatTrigger(true);
  if (!tooltip || isExitingTooltip) {
    hideTooltip(true);
    tooltip = createTooltipBase();
    (document.body || document.documentElement).appendChild(tooltip);
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
  hideFloatTrigger(true);
  if (!tooltip || isExitingTooltip) {
    hideTooltip(true);
    tooltip = createTooltipBase();
    (document.body || document.documentElement).appendChild(tooltip);
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

  // User custom edit button
  tooltip.querySelectorAll('.vm-edit-meaning-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const targetWord = btn.getAttribute('data-word') || data.original;
      const curMeaning = btn.getAttribute('data-current-meaning') || '';
      const newMeaning = window.prompt(`Sửa nghĩa tiếng Việt cho từ "${targetWord}":`, curMeaning);
      if (newMeaning !== null && newMeaning.trim() !== '') {
        const trimmed = newMeaning.trim();
        try {
          await chrome.runtime.sendMessage({
            type: 'SAVE_USER_MEANING',
            word: targetWord,
            meaning_vi: trimmed
          });
          // Update displayed text
          const meaningTextEl = tooltip.querySelector('.vm-meaning-text');
          if (meaningTextEl) {
            meaningTextEl.textContent = trimmed;
          }
          btn.setAttribute('data-current-meaning', trimmed);
          // Show custom badge if not yet present
          let badge = tooltip.querySelector('.vm-user-custom-tag');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'vm-user-custom-tag';
            badge.title = 'Nghĩa do bạn tự lưu';
            badge.textContent = '✓ Tùy chỉnh';
            btn.parentNode.insertBefore(badge, btn);
          }
        } catch (err) {
          console.error('Failed to save user meaning:', err);
        }
      }
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

      <!-- Core Meaning (Pure Vietnamese) with streaming typewriter reveal & custom edit -->
      <div class="vm-meaning-vi vm-cascade-item vm-cascade-delay-2">
        <span class="vm-flag-tag vi">VN</span>
        <span class="vm-meaning-text" data-stream-text="${escHtml(cleanMeaning)}">${escHtml(cleanMeaning)}</span>
        ${w.isUserCustom ? `<span class="vm-user-custom-tag" title="Nghĩa do bạn tự lưu">✓ Tùy chỉnh</span>` : ''}
        <button type="button" class="vm-edit-meaning-btn" data-word="${escHtml(orig)}" data-current-meaning="${escHtml(cleanMeaning)}" title="Tự sửa/nhập nghĩa chuẩn theo ý bạn">✏️</button>
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

  (document.body || document.documentElement).appendChild(overlay);

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
          const res = await chrome.storage.local.get(['vocabulary', 'vocab_tombstones']);
          const current = res?.vocabulary || [];
          const tombstones = res?.vocab_tombstones || {};
          if (wordName) {
            tombstones[wordName.toLowerCase().trim()] = Date.now();
          }
          vocabList = current.filter(item => String(item.id) !== String(id));
          await chrome.storage.local.set({ vocabulary: vocabList, vocab_tombstones: tombstones });
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

