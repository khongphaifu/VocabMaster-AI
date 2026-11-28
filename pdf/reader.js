// d:/extension/pdf/reader.js
// VocabMaster AI - High Performance PDF Reader with Instant Translation & Text Layer

// Initialize PDF.js Worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.js';
}

// State
let pdfDoc = null;
let currentScale = 1.25;
let pageCount = 0;
let currentPageNum = 1;
let currentFileName = '';
let currentSourceUrl = '';
let currentPdfBytes = null;
let renderedPages = new Set();
let pageViewports = new Map();
let isRendering = false;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const pdfViewer = document.getElementById('pdf-viewer');
const navControls = document.getElementById('nav-controls');
const docInfo = document.getElementById('doc-info');
const docTitle = document.getElementById('doc-title');
const pageNumInput = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const zoomVal = document.getElementById('zoom-val');
const fileInput = document.getElementById('file-input');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

const urlModal = document.getElementById('url-modal');
const urlInput = document.getElementById('url-input');
const helpModal = document.getElementById('help-modal');

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSavedTheme();
  checkUrlParams();
});

function setupEventListeners() {
  // File Open Buttons
  document.getElementById('btn-open-file')?.addEventListener('click', () => fileInput.click());
  document.getElementById('btn-drop-select')?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // Drag & Drop
  const viewport = document.getElementById('reader-viewport');
  ['dragenter', 'dragover'].forEach(name => {
    viewport.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.querySelector('.drop-card')?.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    viewport.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.querySelector('.drop-card')?.classList.remove('drag-over');
    });
  });

  viewport.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt ? dt.files : null;
    if (files && files.length > 0 && files[0].type === 'application/pdf') {
      loadPdfFromFile(files[0]);
    }
  });

  // Sample document
  document.getElementById('btn-drop-sample')?.addEventListener('click', loadSamplePdf);

  // URL Open
  document.getElementById('btn-open-url')?.addEventListener('click', () => {
    urlInput.value = '';
    urlModal.style.display = 'flex';
    urlInput.focus();
  });
  document.getElementById('btn-close-url')?.addEventListener('click', () => urlModal.style.display = 'none');
  document.getElementById('btn-cancel-url')?.addEventListener('click', () => urlModal.style.display = 'none');
  document.getElementById('btn-confirm-url')?.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) {
      urlModal.style.display = 'none';
      loadPdfFromUrl(url);
    }
  });

  // Page Navigation
  document.getElementById('btn-prev')?.addEventListener('click', () => scrollToPage(currentPageNum - 1));
  document.getElementById('btn-next')?.addEventListener('click', () => scrollToPage(currentPageNum + 1));
  pageNumInput?.addEventListener('change', () => {
    const p = parseInt(pageNumInput.value, 10);
    if (p >= 1 && p <= pageCount) scrollToPage(p);
  });

  // Zoom & Actions
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => changeZoom(0.15));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => changeZoom(-0.15));
  document.getElementById('btn-fit-width')?.addEventListener('click', fitWidth);
  document.getElementById('btn-ocr-page')?.addEventListener('click', (e) => {
    runOcrForPage(currentPageNum, e.currentTarget);
  });
  document.getElementById('btn-download-pdf')?.addEventListener('click', downloadCurrentPdf);
  document.getElementById('btn-raw-pdf')?.addEventListener('click', openRawPdfInBrowser);

  // 1-Tap Word Translator inside PDF TextLayer & OCR Boxes
  pdfViewer?.addEventListener('click', handlePdfTapWord);

  // Themes
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
    });
  });

  // Open Vocab Sổ từ
  document.getElementById('btn-open-vocab')?.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_PANEL' }).catch(() => {});
    }
  });

  // Help Modal
  document.getElementById('btn-help')?.addEventListener('click', () => helpModal.style.display = 'flex');
  document.getElementById('btn-close-help')?.addEventListener('click', () => helpModal.style.display = 'none');
  document.getElementById('btn-ok-help')?.addEventListener('click', () => helpModal.style.display = 'none');

  // Keyboard Shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Scroll Tracking for Active Page
  viewport.addEventListener('scroll', handleViewportScroll);
}

// ═══════════════════════════════════════════════
// PDF LOADING & RENDERING
// ═══════════════════════════════════════════════
function showLoading(text = 'Đang tải tài liệu...') {
  loadingText.textContent = text;
  loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  loadingOverlay.style.display = 'none';
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (file && file.type === 'application/pdf') {
    loadPdfFromFile(file);
  }
}

async function loadPdfFromFile(file) {
  showLoading(`Đang mở: ${file.name}...`);
  currentFileName = file.name;
  currentSourceUrl = '';

  try {
    const arrayBuffer = await file.arrayBuffer();
    currentPdfBytes = new Uint8Array(arrayBuffer);
    await loadPdfData(currentPdfBytes);
  } catch (err) {
    alert(`Lỗi khi mở file PDF: ${err.message}`);
    hideLoading();
  }
}

async function openPdfTask(sourceOpts) {
  try {
    const task = pdfjsLib.getDocument({
      ...sourceOpts,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true
    });
    return await task.promise;
  } catch (err) {
    if (sourceOpts.data) {
      return await pdfjsLib.getDocument({ data: sourceOpts.data }).promise;
    }
    throw err;
  }
}

async function loadPdfFromUrl(url) {
  showLoading('Đang tải PDF từ liên kết...');
  currentSourceUrl = url;
  currentPdfBytes = null;
  try {
    const parts = url.split('/');
    const rawTail = decodeURIComponent(parts[parts.length - 1].split('?')[0].split('#')[0]) || 'TaiLieu.pdf';
    currentFileName = rawTail.toLowerCase().endsWith('.pdf') ? rawTail : `${rawTail}.pdf`;

    // First attempt: direct fetch via PDF.js
    try {
      pdfDoc = await openPdfTask({ url });
      try {
        currentPdfBytes = new Uint8Array(await pdfDoc.getData());
      } catch (_) {}
      await onPdfLoaded();
      return;
    } catch (directErr) {
      console.warn('Direct PDF load failed (likely CORS). Attempting background proxy fetch...', directErr);
    }

    // Second attempt: background proxy fetch via service-worker (bypasses CORS restrictions)
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      showLoading('Đang tải tài liệu qua kênh nền bảo mật...');
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_PDF_BUFFER',
        url
      });
      if (response && response.success && response.base64) {
        const binaryStr = atob(response.base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        currentPdfBytes = bytes;
        await loadPdfData(bytes);
        return;
      } else {
        throw new Error(response?.error || 'Không nhận được dữ liệu PDF từ background worker');
      }
    } else {
      throw new Error('Môi trường không hỗ trợ chrome.runtime');
    }
  } catch (err) {
    alert(`Không thể tải PDF từ link: ${err.message}. Bạn có thể tải file PDF về máy và mở bằng nút "Mở file PDF".`);
    hideLoading();
  }
}

async function loadPdfData(data) {
  try {
    currentPdfBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    pdfDoc = await openPdfTask({ data: currentPdfBytes });
    await onPdfLoaded();
  } catch (err) {
    alert(`Lỗi phân tích tài liệu PDF: ${err.message}`);
    hideLoading();
  }
}

async function onPdfLoaded() {
  pageCount = pdfDoc.numPages;
  pageCountSpan.textContent = pageCount;
  pageNumInput.max = pageCount;
  pageNumInput.value = 1;
  currentPageNum = 1;

  // Smart initial fit scale
  try {
    const viewport = document.getElementById('reader-viewport');
    const availableWidth = (viewport?.clientWidth || window.innerWidth) - 80;
    const firstPage = await pdfDoc.getPage(1);
    const unscaledVp = firstPage.getViewport({ scale: 1.0 });
    if (availableWidth > 300 && unscaledVp.width > 0) {
      currentScale = parseFloat(Math.max(0.95, Math.min(1.5, availableWidth / unscaledVp.width)).toFixed(2));
    }
  } catch (_) {}

  docTitle.textContent = currentFileName;
  docTitle.title = currentFileName;
  docInfo.style.display = 'flex';
  navControls.style.display = 'flex';
  dropZone.style.display = 'none';
  pdfViewer.style.display = 'flex';

  const ocrBtn = document.getElementById('btn-ocr-page');
  const dlBtn = document.getElementById('btn-download-pdf');
  const rawBtn = document.getElementById('btn-raw-pdf');
  if (ocrBtn) ocrBtn.style.display = 'inline-flex';
  if (dlBtn) dlBtn.style.display = currentPdfBytes ? 'inline-flex' : 'none';
  if (rawBtn) rawBtn.style.display = currentSourceUrl && /^https?:/i.test(currentSourceUrl) ? 'inline-flex' : 'none';

  // Build skeleton shells for all pages
  pdfViewer.innerHTML = '';
  renderedPages.clear();
  pageViewports.clear();

  for (let i = 1; i <= pageCount; i++) {
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page-wrapper';
    pageWrapper.id = `page-${i}`;
    pageWrapper.dataset.pageNum = i;
    // Temporary min height
    pageWrapper.style.minHeight = `${Math.round(840 * currentScale)}px`;
    pageWrapper.style.width = `${Math.round(595 * currentScale)}px`;
    pdfViewer.appendChild(pageWrapper);
  }

  hideLoading();
  updateZoomDisplay();

  // Render first 2 pages immediately
  await renderPage(1);
  if (pageCount >= 2) await renderPage(2);

  // Setup lazy rendering via IntersectionObserver for remaining pages
  setupLazyPageRendering();
}

function setupLazyPageRendering() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNum = parseInt(entry.target.dataset.pageNum, 10);
        if (pageNum && !renderedPages.has(pageNum)) {
          renderPage(pageNum);
        }
      }
    });
  }, {
    root: document.getElementById('reader-viewport'),
    rootMargin: '600px 0px',
    threshold: 0.01
  });

  document.querySelectorAll('.pdf-page-wrapper').forEach(el => observer.observe(el));
}

/**
 * Render an individual PDF page: High-DPI Canvas + HTML TextLayer
 */
async function renderPage(pageNum) {
  if (!pdfDoc || renderedPages.has(pageNum)) return;
  renderedPages.add(pageNum);

  const wrapper = document.getElementById(`page-${pageNum}`);
  if (!wrapper) return;

  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentScale });
    pageViewports.set(pageNum, viewport);

    wrapper.style.width = `${Math.floor(viewport.width)}px`;
    wrapper.style.height = `${Math.floor(viewport.height)}px`;
    wrapper.innerHTML = '';

    // 1. Render Canvas (High-DPI aware)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
    };
    await page.render(renderContext).promise;
    wrapper.appendChild(canvas);

    // 2. Render TextLayer (enables native text selection for VocabMaster translation)
    const textContent = await page.getTextContent();
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
    textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
    textLayerDiv.style.setProperty('--scale-factor', viewport.scale);

    const textLayerRenderTask = pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport: viewport
    });
    await textLayerRenderTask.promise;
    wrapper.appendChild(textLayerDiv);

    // If page has no selectable text items (scanned PDF / image-only page), show 1-click OCR prompt bar
    const hasText = Array.isArray(textContent?.items) && textContent.items.some(it => String(it.str || '').trim().length > 0);
    const existingOcrBar = document.getElementById(`ocr-bar-${pageNum}`);
    if (!hasText && !existingOcrBar && !document.getElementById(`ocr-box-${pageNum}`)) {
      const bar = document.createElement('div');
      bar.className = 'pdf-ocr-bar';
      bar.id = `ocr-bar-${pageNum}`;
      bar.innerHTML = `
        <span>📷 Trang ${pageNum} là <b>PDF Scan (dạng ảnh)</b> chưa có lớp chữ để bôi đen.</span>
        <button type="button" class="btn-tool">🔍 Quét chữ AI (OCR) trang này</button>
      `;
      const barBtn = bar.querySelector('button');
      barBtn?.addEventListener('click', () => runOcrForPage(pageNum, barBtn));
      wrapper.insertAdjacentElement('afterend', bar);
    }

  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err);
    renderedPages.delete(pageNum);
  }
}

async function runOcrForPage(pageNum, btnEl = null) {
  if (!pdfDoc) return;
  const targetPage = Math.max(1, Math.min(pageCount, pageNum || currentPageNum || 1));
  if (!renderedPages.has(targetPage)) {
    await renderPage(targetPage);
  }
  const wrapper = document.getElementById(`page-${targetPage}`);
  const canvas = wrapper?.querySelector('canvas');
  if (!canvas) {
    alert('Không tìm thấy hình ảnh trang PDF để quét chữ.');
    return;
  }

  const origHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '⏳ Đang quét chữ AI...';
  }

  try {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const res = await chrome.runtime.sendMessage({
      type: 'OCR_PDF_PAGE',
      dataUrl
    });
    if (!res?.success) {
      throw new Error(res?.error || 'Không thể tách chữ từ trang PDF này.');
    }

    document.getElementById(`ocr-bar-${targetPage}`)?.remove();
    let box = document.getElementById(`ocr-box-${targetPage}`);
    if (!box) {
      box = document.createElement('div');
      box.className = 'pdf-ocr-result-box';
      box.id = `ocr-box-${targetPage}`;
      wrapper.insertAdjacentElement('afterend', box);
    }

    box.innerHTML = `
      <div class="pdf-ocr-result-header">
        <span>📷 Văn bản trích xuất AI từ hình vẽ / Trang ${targetPage} (Bôi đen hoặc chạm từ để dịch)</span>
        <button type="button" class="btn-nav" title="Đóng">✕</button>
      </div>
      <div class="pdf-ocr-text"></div>
    `;
    box.querySelector('.pdf-ocr-text').textContent = res.text || '(Không tìm thấy chữ trong trang này)';
    box.querySelector('button')?.addEventListener('click', () => box.remove());
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    alert(`❌ Lỗi quét chữ AI (OCR): ${err.message}`);
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = origHtml;
    }
  }
}

function downloadCurrentPdf() {
  if (!currentPdfBytes) return;
  const blob = new Blob([currentPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentFileName || 'document.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function openRawPdfInBrowser() {
  if (!currentSourceUrl) return;
  const base = currentSourceUrl.split('#')[0];
  window.open(`${base}#vm_native_pdf=1`, '_blank');
}

function extractPdfWordAtCaret(text, offset) {
  if (!text || typeof offset !== 'number' || offset < 0 || offset > text.length) return '';
  const isWordChar = (ch) => /[A-Za-z0-9'’-]/.test(ch);
  let start = offset;
  let end = offset;
  if (start === text.length && start > 0) start--;
  if (start > 0 && !isWordChar(text[start]) && isWordChar(text[start - 1])) {
    start--;
    end = start;
  }
  if (!isWordChar(text[start])) return '';
  while (start > 0 && isWordChar(text[start - 1])) start--;
  while (end < text.length && isWordChar(text[end])) end++;
  const word = text.slice(start, end).replace(/^['’-]+|['’-]+$/g, '');
  return /[A-Za-z]/.test(word) ? word : '';
}

function handlePdfTapWord(e) {
  const toggle = document.getElementById('toggle-pdf-tap-word');
  if (!toggle?.checked) return;
  if (e.detail > 1) return;
  if (e.target.closest('button, a, input, label, .vm-tooltip, .vm-float-trigger')) return;

  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;

  let textNode = null;
  let offset = 0;
  if (typeof document.caretRangeFromPoint === 'function') {
    const r = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (r) {
      textNode = r.startContainer;
      offset = r.startOffset;
    }
  } else if (typeof document.caretPositionFromPoint === 'function') {
    const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
    if (pos) {
      textNode = pos.offsetNode;
      offset = pos.offset;
    }
  }

  if (!textNode || textNode.nodeType !== 3) return;
  const parentEl = textNode.parentElement;
  if (!parentEl || (!parentEl.closest('.textLayer') && !parentEl.closest('.pdf-ocr-result-box'))) return;

  const fullText = textNode.textContent || '';
  const word = extractPdfWordAtCaret(fullText, offset);
  if (!word || word.length < 2) return;

  let anchorRect = null;
  const startIdx = Math.max(0, fullText.lastIndexOf(word, offset));
  if (startIdx <= offset && startIdx + word.length >= offset) {
    const checkRange = document.createRange();
    checkRange.setStart(textNode, startIdx);
    checkRange.setEnd(textNode, startIdx + word.length);
    const rect = checkRange.getBoundingClientRect();
    if (!rect || rect.width === 0 ||
        e.clientX < rect.left - 18 || e.clientX > rect.right + 18 ||
        e.clientY < rect.top - 14 || e.clientY > rect.bottom + 14) {
      return;
    }
    anchorRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  }

  if (typeof window.__VM_TRANSLATE_SELECTION__ === 'function') {
    const ctx = fullText.slice(Math.max(0, offset - 80), Math.min(fullText.length, offset + 120)).trim();
    window.__VM_TRANSLATE_SELECTION__(word, anchorRect, ctx);
  }
}

// ═══════════════════════════════════════════════
// ZOOM & NAVIGATION
// ═══════════════════════════════════════════════
async function changeZoom(delta) {
  if (!pdfDoc) return;
  const newScale = Math.max(0.6, Math.min(3.0, currentScale + delta));
  if (Math.abs(newScale - currentScale) < 0.01) return;

  currentScale = parseFloat(newScale.toFixed(2));
  updateZoomDisplay();

  // Clear cached page shells so zoom/fitWidth clean up old OCR prompt bars
  document.querySelectorAll('.pdf-ocr-bar').forEach(el => el.remove());

  // Re-render all loaded pages with new scale
  renderedPages.clear();
  const pageWrappers = document.querySelectorAll('.pdf-page-wrapper');
  for (const w of pageWrappers) {
    w.innerHTML = '';
    w.style.minHeight = `${Math.round(840 * currentScale)}px`;
    w.style.width = `${Math.round(595 * currentScale)}px`;
  }

  // Immediately render current page and adjacent
  await renderPage(currentPageNum);
  if (currentPageNum > 1) renderPage(currentPageNum - 1);
  if (currentPageNum < pageCount) renderPage(currentPageNum + 1);
}

async function fitWidth() {
  if (!pdfDoc) return;
  const viewport = document.getElementById('reader-viewport');
  const availableWidth = viewport.clientWidth - 80;
  if (availableWidth <= 200) return;

  try {
    const page = await pdfDoc.getPage(currentPageNum || 1);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const targetScale = availableWidth / unscaledViewport.width;
    currentScale = Math.max(0.6, Math.min(2.5, parseFloat(targetScale.toFixed(2))));
    updateZoomDisplay();

    renderedPages.clear();
    const pageWrappers = document.querySelectorAll('.pdf-page-wrapper');
    for (const w of pageWrappers) {
      w.innerHTML = '';
      w.style.minHeight = `${Math.round(840 * currentScale)}px`;
      w.style.width = `${Math.round(595 * currentScale)}px`;
    }
    await renderPage(currentPageNum);
  } catch (_) {}
}

function updateZoomDisplay() {
  zoomVal.textContent = `${Math.round(currentScale * 100)}%`;
}

function scrollToPage(pageNum) {
  if (pageNum < 1 || pageNum > pageCount) return;
  const targetPage = document.getElementById(`page-${pageNum}`);
  if (targetPage) {
    targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    currentPageNum = pageNum;
    pageNumInput.value = pageNum;
    renderPage(pageNum);
  }
}

function handleViewportScroll() {
  if (!pdfDoc) return;
  const wrappers = document.querySelectorAll('.pdf-page-wrapper');
  const viewportRect = document.getElementById('reader-viewport').getBoundingClientRect();
  const middleY = viewportRect.top + viewportRect.height / 3;

  for (const w of wrappers) {
    const rect = w.getBoundingClientRect();
    if (rect.top <= middleY && rect.bottom >= middleY) {
      const pageNum = parseInt(w.dataset.pageNum, 10);
      if (pageNum && pageNum !== currentPageNum) {
        currentPageNum = pageNum;
        pageNumInput.value = pageNum;
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════
// THEMES & SHORTCUTS
// ═══════════════════════════════════════════════
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  try {
    localStorage.setItem('vm_pdf_theme', theme);
  } catch (_) {}
}

function loadSavedTheme() {
  try {
    const saved = localStorage.getItem('vm_pdf_theme') || 'dark';
    setTheme(saved);
  } catch (_) {}
}

function handleKeyboardShortcuts(e) {
  // If user is typing in an input box, skip shortcuts
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      changeZoom(0.15);
    } else if (e.key === '-') {
      e.preventDefault();
      changeZoom(-0.15);
    } else if (e.key === '0') {
      e.preventDefault();
      fitWidth();
    } else if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      fileInput.click();
    }
  } else {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      scrollToPage(currentPageNum + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      scrollToPage(currentPageNum - 1);
    } else if (e.key === 'Escape') {
      urlModal.style.display = 'none';
      helpModal.style.display = 'none';
    }
  }
}

// Check URL parameters for direct PDF loading
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileParam = urlParams.get('file');
  if (fileParam) {
    loadPdfFromUrl(fileParam);
  }
}

// Load built-in sample academic paper
async function loadSamplePdf() {
  showLoading('Đang nạp bài báo mẫu...');
  currentFileName = 'Deep_Learning_Overview_Sample.pdf';

  // Create an informative sample PDF on the fly using minimal PDF specifications
  const samplePdfData = generateSamplePdfBinary();
  await loadPdfData(samplePdfData);
}

function generateSamplePdfBinary() {
  // Minimal valid PDF with English academic content for instant translation test
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 520 >>
stream
BT
/F1 20 Tf
50 720 Td
(VocabMaster AI - Academic Reading Sample) Tj
/F1 12 Tf
0 -36 Td
(Artificial intelligence and machine learning have achieved significant breakthroughs in recent years.) Tj
0 -22 Td
(Researchers continue to observe remarkable resilience in deep neural network architectures.) Tj
0 -22 Td
(The university principal made an important announcement regarding the research grant.) Tj
0 -22 Td
(The chemical plant was closed temporarily for routine maintenance and safety inspections.) Tj
0 -22 Td
(Students enjoyed a sumptuous feast after finishing their demanding graduation thesis.) Tj
0 -22 Td
(Solving complex optimization algorithms is definitely not a piece of cake.) Tj
0 -22 Td
(You can select any word or phrase above to test instant pure Vietnamese translation!) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000818 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
895
%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(content);
}
