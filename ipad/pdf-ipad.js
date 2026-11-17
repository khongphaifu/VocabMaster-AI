// d:/extension/ipad/pdf-ipad.js
// Touch-optimized PDF Reader & Select-to-Translate controller for iPad PWA

export function createIpadPdfController({ showToast }) {
  let pdfDoc = null;
  let currentScale = 1.0;
  let pageCount = 0;
  let currentPageNum = 1;
  let renderedPages = new Set();
  let observer = null;
  const themes = ['theme-dark', 'theme-sepia', 'theme-light'];
  let themeIdx = 0;

  const pdfInput = document.getElementById('ipad-pdf-input');
  const viewportEl = document.getElementById('ipad-pdf-viewport');
  const pagesEl = document.getElementById('ipad-pdf-pages');
  const dropEmpty = document.getElementById('pdf-drop-empty');
  const navGroup = document.getElementById('pdf-nav-group');
  const pageLabel = document.getElementById('pdf-page-label');
  const loadingEl = document.getElementById('pdf-loading');
  const urlRow = document.getElementById('pdf-url-row');
  const urlInput = document.getElementById('pdf-url-input');

  function ensureWorker() {
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.js';
    }
  }

  function showLoading(show, msg = 'Đang dựng trang PDF sắc nét cho iPad...') {
    const msgEl = document.getElementById('pdf-loading-msg');
    if (msgEl) msgEl.textContent = msg;
    loadingEl?.classList.toggle('hidden', !show);
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

  async function loadPdfData(source) {
    ensureWorker();
    if (typeof pdfjsLib === 'undefined') {
      showToast('❌ Chưa tải được thư viện PDF.js.', 'error');
      return;
    }

    showLoading(true);
    dropEmpty?.classList.add('hidden');

    try {
      const task = pdfjsLib.getDocument(source);
      pdfDoc = await task.promise;
      pageCount = pdfDoc.numPages;
      currentPageNum = 1;
      currentScale = await computeFitScale();
      await rebuildPages();
      navGroup?.classList.remove('hidden');
      viewportEl?.classList.remove('hidden');
      if (pageLabel) pageLabel.textContent = `1 / ${pageCount}`;
    } catch (err) {
      console.error('iPad PDF load error:', err);
      showToast(`❌ Không mở được PDF: ${err.message}`, 'error');
      dropEmpty?.classList.remove('hidden');
      viewportEl?.classList.add('hidden');
    } finally {
      showLoading(false);
    }
  }

  async function rebuildPages() {
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
      shell.style.height = `${Math.round(842 * currentScale)}px`;
      pagesEl.appendChild(shell);
    }

    await renderPage(1);
    if (pageCount >= 2) await renderPage(2);

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const p = parseInt(entry.target.dataset.pageNum, 10);
          if (p) {
            currentPageNum = p;
            if (pageLabel) pageLabel.textContent = `${p} / ${pageCount}`;
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
      shell.style.height = `${h}px`;
      shell.innerHTML = '';

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
      shell.appendChild(canvas);

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
      shell.appendChild(textLayer);
    } catch (err) {
      console.error(`Render page ${pageNum} failed:`, err);
      renderedPages.delete(pageNum);
    }
  }

  function scrollToPage(p) {
    const target = Math.max(1, Math.min(pageCount, p));
    const el = document.getElementById(`ipad-pdf-page-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      currentPageNum = target;
      if (pageLabel) pageLabel.textContent = `${target} / ${pageCount}`;
      if (!renderedPages.has(target)) renderPage(target);
    }
  }

  async function changeZoom(delta) {
    if (!pdfDoc) return;
    currentScale = Number(Math.max(0.5, Math.min(2.6, currentScale + delta)).toFixed(2));
    await rebuildPages();
    scrollToPage(currentPageNum);
  }

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
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    await loadPdfData({ data: buf });
    e.target.value = '';
  });

  document.getElementById('pdf-btn-sample')?.addEventListener('click', async () => {
    await loadPdfData({ data: buildSamplePdfBytes() });
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
      await loadPdfData({ data: buf });
    } catch (err) {
      showLoading(false);
      showToast(`⚠️ Link PDF này chặn tải trực tiếp (${err.message}). Hãy tải file về Tệp (Files) rồi mở bằng "📂 Mở PDF từ iPad Files"!`, 'error');
    }
  });

  document.getElementById('pdf-prev')?.addEventListener('click', () => scrollToPage(currentPageNum - 1));
  document.getElementById('pdf-next')?.addEventListener('click', () => scrollToPage(currentPageNum + 1));
  document.getElementById('pdf-zoom-out')?.addEventListener('click', () => changeZoom(-0.15));
  document.getElementById('pdf-zoom-in')?.addEventListener('click', () => changeZoom(0.15));
  document.getElementById('pdf-theme-cycle')?.addEventListener('click', () => {
    if (!viewportEl) return;
    viewportEl.classList.remove(themes[themeIdx]);
    themeIdx = (themeIdx + 1) % themes.length;
    viewportEl.classList.add(themes[themeIdx]);
  });

  return { loadPdfData };
}
