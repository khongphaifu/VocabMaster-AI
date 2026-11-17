// d:/extension/ipad/pdf-ipad.js
// Multi-format Touch Document Reader for iPadOS (.pdf, scanned PDF OCR, .docx, .txt, .md, .srt, Images)

import { extractDocxText } from '../utils/docx-reader.js';
import { extractTextFromImageAI } from '../utils/ai-client.js';

const IDB_NAME = 'vm_ipad_files_db';
const IDB_STORE = 'recent_files';
const MAX_PERSIST_BYTES = 25 * 1024 * 1024; // 25MB limit for smooth iPad storage

/**
 * Extract clean English word around a DOM text-node caret offset (used by 1-tap word mode).
 */
export function extractWordAtCaret(text, offset) {
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

function openFileDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function saveRecentDoc({ name, ext, bytes, pageNum = 1 }) {
  if (!bytes || bytes.byteLength > MAX_PERSIST_BYTES) return;
  const db = await openFileDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ name, ext, bytes, pageNum, savedAt: Date.now() }, 'last_doc');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

async function loadRecentDoc() {
  const db = await openFileDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('last_doc');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function updateRecentPageNum(pageNum) {
  const rec = await loadRecentDoc();
  if (!rec) return;
  rec.pageNum = pageNum;
  await saveRecentDoc(rec);
}

function uint8ToDataUrl(bytes, mimeType) {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export function createIpadPdfController({ showToast, getVisionCredentials, onOpenTextArticle }) {
  let pdfDoc = null;
  let currentScale = 1.0;
  let pageCount = 0;
  let currentPageNum = 1;
  let currentDocName = '';
  let renderedPages = new Set();
  let observer = null;
  const themes = ['theme-dark', 'theme-sepia', 'theme-light'];
  let themeIdx = 0;

  const pdfInput = document.getElementById('ipad-pdf-input');
  const viewportEl = document.getElementById('ipad-pdf-viewport');
  const pagesEl = document.getElementById('ipad-pdf-pages');
  const dropEmpty = document.getElementById('pdf-drop-empty');
  const navGroup = document.getElementById('pdf-nav-group');
  const docTitleEl = document.getElementById('pdf-doc-title');
  const pageInput = document.getElementById('pdf-page-input');
  const pageTotal = document.getElementById('pdf-page-total');
  const loadingEl = document.getElementById('pdf-loading');
  const urlRow = document.getElementById('pdf-url-row');
  const urlInput = document.getElementById('pdf-url-input');
  const resumeWrap = document.getElementById('pdf-resume-wrap');
  const resumeBtn = document.getElementById('btn-resume-file');
  const resumeNameEl = document.getElementById('resume-file-name');

  function ensureWorker() {
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.js';
    }
  }

  function showLoading(show, msg = 'Đang dựng tài liệu sắc nét cho iPad...') {
    const msgEl = document.getElementById('pdf-loading-msg');
    if (msgEl) msgEl.textContent = msg;
    loadingEl?.classList.toggle('hidden', !show);
  }

  function updatePageUi(p) {
    currentPageNum = p;
    if (pageInput) pageInput.value = String(p);
    if (pageTotal) pageTotal.textContent = `/ ${pageCount}`;
  }

  async function computeFitScale() {
    if (!pdfDoc) return 1.0;
    try {
      const page = await pdfDoc.getPage(1);
      const rawVp = page.getViewport({ scale: 1.0 });
      const availW = Math.max(280, (viewportEl?.clientWidth || window.innerWidth) - 24);
      const fit = Math.min(1.6, Math.max(0.55, availW / rawVp.width));
      return Number(fit.toFixed(2));
    } catch (_) {
      return 1.0;
    }
  }

  async function loadPdfData(source, fileName = 'Document.pdf', startPage = 1) {
    ensureWorker();
    if (typeof pdfjsLib === 'undefined') {
      showToast('❌ Chưa tải được thư viện PDF.js.', 'error');
      return;
    }

    document.getElementById('mode-btn-pdf')?.click();
    showLoading(true);
    dropEmpty?.classList.add('hidden');
    currentDocName = fileName;
    if (docTitleEl) docTitleEl.textContent = fileName;

    try {
      const task = pdfjsLib.getDocument(source);
      pdfDoc = await task.promise;
      pageCount = pdfDoc.numPages;
      const clampedStart = Math.max(1, Math.min(pageCount, startPage));
      updatePageUi(clampedStart);
      if (pageInput) pageInput.max = String(pageCount);

      currentScale = await computeFitScale();
      await rebuildPages(clampedStart);
      navGroup?.classList.remove('hidden');
      viewportEl?.classList.remove('hidden');

      if (clampedStart > 1) {
        setTimeout(() => scrollToPage(clampedStart), 120);
      }
    } catch (err) {
      console.error('iPad PDF load error:', err);
      showToast(`❌ Không mở được PDF: ${err.message}`, 'error');
      dropEmpty?.classList.remove('hidden');
      viewportEl?.classList.add('hidden');
    } finally {
      showLoading(false);
    }
  }

  async function rebuildPages(priorityPage = 1) {
    if (!pdfDoc || !pagesEl) return;
    if (observer) observer.disconnect();
    renderedPages.clear();
    pagesEl.innerHTML = '';

    for (let i = 1; i <= pageCount; i++) {
      const shell = document.createElement('div');
      shell.className = 'pdf-page-shell';
      shell.id = `ipad-pdf-page-${i}`;
      shell.dataset.pageNum = String(i);
      shell.style.width = `${Math.round(595 * currentScale)}px`;
      shell.style.minHeight = `${Math.round(842 * currentScale)}px`;
      pagesEl.appendChild(shell);
    }

    await renderPage(priorityPage);
    if (priorityPage + 1 <= pageCount) await renderPage(priorityPage + 1);

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const p = parseInt(entry.target.dataset.pageNum, 10);
          if (p) {
            updatePageUi(p);
            updateRecentPageNum(p).catch(() => {});
            if (!renderedPages.has(p)) renderPage(p);
          }
        }
      }
    }, { root: viewportEl, rootMargin: '400px 0px', threshold: 0.05 });

    pagesEl.querySelectorAll('.pdf-page-shell').forEach(el => observer.observe(el));
  }

  async function renderPage(pageNum) {
    if (!pdfDoc || renderedPages.has(pageNum)) return;
    renderedPages.add(pageNum);

    const shell = document.getElementById(`ipad-pdf-page-${pageNum}`);
    if (!shell) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: currentScale });
      const w = Math.floor(vp.width);
      const h = Math.floor(vp.height);

      shell.style.width = `${w}px`;
      shell.style.minHeight = `${h}px`;
      shell.innerHTML = '';

      const canvasWrap = document.createElement('div');
      canvasWrap.style.position = 'relative';
      canvasWrap.style.width = `${w}px`;
      canvasWrap.style.height = `${h}px`;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      await page.render({
        canvasContext: ctx,
        viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
      }).promise;
      canvasWrap.appendChild(canvas);

      const textContent = await page.getTextContent();
      const textLayer = document.createElement('div');
      textLayer.className = 'textLayer';
      textLayer.style.width = `${w}px`;
      textLayer.style.height = `${h}px`;
      textLayer.style.setProperty('--scale-factor', vp.scale);

      await pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport: vp
      }).promise;
      canvasWrap.appendChild(textLayer);
      shell.appendChild(canvasWrap);

      // Detect Scanned Image-only PDF page and offer 1-Tap AI Vision OCR
      const hasSelectableText = Array.isArray(textContent?.items) &&
        textContent.items.some(it => String(it.str || '').trim().length > 0);

      if (!hasSelectableText) {
        const ocrBar = document.createElement('div');
        ocrBar.className = 'scanned-ocr-bar';
        ocrBar.innerHTML = `
          <span>📷 Trang ${pageNum} là <b>PDF Scan (dạng ảnh)</b> chưa có chữ để bôi đen.</span>
          <button type="button" class="btn-touch-primary btn-compact">🔍 Quét chữ AI (OCR) trang này</button>
        `;
        const ocrBtn = ocrBar.querySelector('button');
        ocrBtn?.addEventListener('click', async () => {
          const creds = typeof getVisionCredentials === 'function' ? getVisionCredentials() : null;
          if (!creds?.apiKey) {
            showToast('⚠️ Hãy thêm Gemini hoặc OpenAI API Key trong ⚙️ Cài đặt để quét PDF Scan!', 'error');
            return;
          }
          ocrBtn.disabled = true;
          ocrBtn.textContent = '⏳ Đang quét chữ...';
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
            const text = await extractTextFromImageAI({
              provider: creds.provider,
              apiKey: creds.apiKey,
              dataUrl
            });
            ocrBar.remove();
            const textBox = document.createElement('div');
            textBox.className = 'scanned-text-box';
            textBox.textContent = text;
            shell.appendChild(textBox);
            showToast('✅ Đã tách chữ xong! Hãy chạm hoặc bôi đen văn bản bên dưới trang.', 'success');
          } catch (err) {
            ocrBtn.disabled = false;
            ocrBtn.textContent = '🔍 Thử quét lại OCR';
            showToast(`❌ ${err.message}`, 'error');
          }
        });
        shell.appendChild(ocrBar);
      }
    } catch (err) {
      console.error(`Render page ${pageNum} failed:`, err);
      renderedPages.delete(pageNum);
    }
  }

  function scrollToPage(p) {
    if (!pageCount) return;
    const target = Math.max(1, Math.min(pageCount, p));
    const el = document.getElementById(`ipad-pdf-page-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      updatePageUi(target);
      updateRecentPageNum(target).catch(() => {});
      if (!renderedPages.has(target)) renderPage(target);
    }
  }

  async function changeZoom(delta) {
    if (!pdfDoc) return;
    currentScale = Number(Math.max(0.5, Math.min(2.6, currentScale + delta)).toFixed(2));
    await rebuildPages(currentPageNum);
    scrollToPage(currentPageNum);
  }

  async function openDocumentFromBytes(name, uint8Bytes, startPage = 1, skipPersist = false) {
    const ext = (name.split('.').pop() || '').toLowerCase();

    if (!skipPersist) {
      await saveRecentDoc({ name, ext, bytes: uint8Bytes, pageNum: startPage });
      refreshRecentPrompt().catch(() => {});
    }

    if (ext === 'pdf') {
      await loadPdfData({ data: uint8Bytes }, name, startPage);
      return;
    }

    if (ext === 'docx') {
      showLoading(true, `Đang giải nén văn bản từ "${name}"...`);
      try {
        const text = await extractDocxText(uint8Bytes);
        if (!text.trim()) throw new Error('Tài liệu Word này trống hoặc không có văn bản đọc được.');
        onOpenTextArticle?.({ title: `📘 ${name}`, text });
        showToast(`✅ Đã mở "${name}"! Chạm từ hoặc bôi đen để dịch.`, 'success');
      } catch (err) {
        showToast(`❌ Lỗi đọc DOCX: ${err.message}`, 'error');
      } finally {
        showLoading(false);
      }
      return;
    }

    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const dataUrl = uint8ToDataUrl(uint8Bytes, mime);
      onOpenTextArticle?.({ title: `🖼️ ${name} (Đang nhận diện chữ OCR...)`, text: '⏳ Đang dùng AI quét chữ từ hình ảnh...', imageDataUrl: dataUrl });
      const creds = typeof getVisionCredentials === 'function' ? getVisionCredentials() : null;
      if (!creds?.apiKey) {
        onOpenTextArticle?.({
          title: `🖼️ ${name}`,
          text: '⚠️ Cần nhập Gemini hoặc OpenAI API Key trong ⚙️ Cài đặt để AI trích xuất chữ từ hình ảnh!',
          imageDataUrl: dataUrl
        });
        return;
      }
      try {
        const extracted = await extractTextFromImageAI({ provider: creds.provider, apiKey: creds.apiKey, dataUrl });
        onOpenTextArticle?.({ title: `🖼️ ${name}`, text: extracted || '(Không tìm thấy chữ trong ảnh)', imageDataUrl: dataUrl });
        showToast('✅ Đã trích xuất văn bản từ ảnh! Hãy bôi đen hoặc chạm từ để dịch.', 'success');
      } catch (err) {
        onOpenTextArticle?.({ title: `🖼️ ${name}`, text: `❌ Lỗi OCR: ${err.message}`, imageDataUrl: dataUrl });
      }
      return;
    }

    // Plain text formats: .txt, .md, .srt, .csv, etc.
    try {
      let decoded = new TextDecoder('utf-8').decode(uint8Bytes);
      if (ext === 'srt') {
        decoded = decoded
          .replace(/\r/g, '')
          .replace(/^\d+\n\d{2}:\d{2}:\d{2},\d{3} --> .*$/gm, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
      onOpenTextArticle?.({ title: `📝 ${name}`, text: decoded });
      showToast(`✅ Đã mở "${name}"!`, 'success');
    } catch (err) {
      showToast(`❌ Không đọc được file: ${err.message}`, 'error');
    }
  }

  async function openDocumentFile(file) {
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    await openDocumentFromBytes(file.name, buf, 1, false);
  }

  async function refreshRecentPrompt() {
    const rec = await loadRecentDoc();
    if (rec && rec.bytes && resumeWrap && resumeNameEl) {
      const pageTxt = rec.ext === 'pdf' && rec.pageNum ? ` (Trang ${rec.pageNum})` : '';
      resumeNameEl.textContent = `${rec.name}${pageTxt}`;
      resumeWrap.classList.remove('hidden');
    }
  }

  resumeBtn?.addEventListener('click', async () => {
    const rec = await loadRecentDoc();
    if (!rec?.bytes) return;
    const bytes = rec.bytes instanceof Uint8Array ? rec.bytes : new Uint8Array(rec.bytes);
    await openDocumentFromBytes(rec.name, bytes, rec.pageNum || 1, true);
  });

  function buildSamplePdfBytes() {
    const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 510 >>
stream
BT
/F1 19 Tf
48 730 Td
(VocabMaster AI - iPad PDF Reading Sample) Tj
/F1 12 Tf
0 -34 Td
(Artificial intelligence has achieved remarkable breakthroughs across education and science.) Tj
0 -22 Td
(Researchers observed extraordinary resilience in deep neural architectures under heavy noise.) Tj
0 -22 Td
(The university principal made an important announcement about international scholarships.) Tj
0 -22 Td
(Sustainable infrastructure requires meticulous planning before major construction begins.) Tj
0 -22 Td
(Students celebrated after completing their thesis because it was not a piece of cake.) Tj
0 -22 Td
(Highlight any word or sentence on this page to trigger the floating AI translation button!) Tj
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
0000000808 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
885
%%EOF`;
    return new TextEncoder().encode(pdf);
  }

  document.getElementById('pdf-btn-file')?.addEventListener('click', () => pdfInput?.click());
  pdfInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await openDocumentFile(file);
    e.target.value = '';
  });

  document.getElementById('pdf-btn-sample')?.addEventListener('click', async () => {
    await loadPdfData({ data: buildSamplePdfBytes() }, 'Sample_IELTS_Reading.pdf', 1);
  });

  document.getElementById('pdf-btn-url')?.addEventListener('click', () => {
    urlRow?.classList.toggle('hidden');
    urlInput?.focus();
  });

  document.getElementById('pdf-url-go')?.addEventListener('click', async () => {
    const u = urlInput?.value.trim();
    if (!u) return;
    urlRow?.classList.add('hidden');
    showLoading(true, 'Đang tải file PDF từ đường dẫn...');
    try {
      const resp = await fetch(u);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buf = new Uint8Array(await resp.arrayBuffer());
      const urlName = u.split('?')[0].split('/').pop() || 'Remote_Document.pdf';
      await openDocumentFromBytes(urlName, buf, 1, false);
    } catch (err) {
      showLoading(false);
      showToast(`⚠️ Link PDF này chặn tải trực tiếp (${err.message}). Hãy lưu file vào Tệp (Files) rồi mở bằng "📂 Mở File iPad"!`, 'error');
    }
  });

  document.getElementById('pdf-prev')?.addEventListener('click', () => scrollToPage(currentPageNum - 1));
  document.getElementById('pdf-next')?.addEventListener('click', () => scrollToPage(currentPageNum + 1));
  pageInput?.addEventListener('change', () => {
    const val = parseInt(pageInput.value, 10);
    if (!Number.isNaN(val)) scrollToPage(val);
  });
  document.getElementById('pdf-zoom-out')?.addEventListener('click', () => changeZoom(-0.15));
  document.getElementById('pdf-zoom-in')?.addEventListener('click', () => changeZoom(0.15));
  document.getElementById('pdf-theme-cycle')?.addEventListener('click', () => {
    if (!viewportEl) return;
    viewportEl.classList.remove(themes[themeIdx]);
    themeIdx = (themeIdx + 1) % themes.length;
    viewportEl.classList.add(themes[themeIdx]);
  });

  refreshRecentPrompt().catch(() => {});

  return { loadPdfData, openDocumentFile };
}
