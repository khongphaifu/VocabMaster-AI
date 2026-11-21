// d:/extension/content/gdocs-preload.js
// Runs at document_start in MAIN world on docs.google.com to enable Kix Canvas DOM/SVG annotations
// and bridge Kix copy payloads safely to the content script without losing selection.
(function () {
  try {
    if (!window._docs_annotate_canvas_by_ext) {
      window._docs_annotate_canvas_by_ext = 'kix';
    }

    if (!window.__vmDocsCopyHooked && typeof DataTransfer !== 'undefined' && DataTransfer.prototype?.setData) {
      window.__vmDocsCopyHooked = true;
      const origSetData = DataTransfer.prototype.setData;
      DataTransfer.prototype.setData = function (format, data) {
        try {
          if (window.__vmCapturingDocsCopy && String(format || '').toLowerCase() === 'text/plain' && typeof data === 'string') {
            document.documentElement?.setAttribute('data-vm-gdocs-captured', data);
          }
        } catch (_) {}
        return origSetData.apply(this, arguments);
      };

      window.addEventListener('vm-gdocs-capture-start', () => {
        try {
          window.__vmCapturingDocsCopy = true;
          document.documentElement?.removeAttribute('data-vm-gdocs-captured');
        } catch (_) {}
      });

      window.addEventListener('vm-gdocs-capture-end', () => {
        try {
          window.__vmCapturingDocsCopy = false;
        } catch (_) {}
      });
    }
  } catch (_) {}
})();
