// d:/extension/utils/qr-svg.js
// Pure ES-module offline QR Code SVG renderer (MV3 CSP compliant)

import qrcode from '../lib/qrcode.mjs';

/**
 * Generates an inline SVG QR code with a white quiet-zone margin for iPad Camera scanning.
 */
export function generateQrSvg(text, sizePx = 220) {
  const qr = qrcode(0, 'M');
  qr.addData(String(text || ''), 'Byte');
  qr.make();

  const count = qr.getModuleCount();
  const margin = 3;
  const total = count + margin * 2;
  let paths = [];

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        paths.push(`M${c + margin},${r + margin}h1v1h-1z`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR Code ghép nối iPad">` +
    `<rect width="${total}" height="${total}" fill="#ffffff" rx="2"/>` +
    `<path d="${paths.join('')}" fill="#11111b"/>` +
    `</svg>`;
}

export { qrcode };
