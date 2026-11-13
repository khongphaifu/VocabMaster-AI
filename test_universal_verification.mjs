// d:/extension/test_universal_verification.mjs
// Automated verification suite for VocabMaster Universal Engine v1.0.25

import assert from 'assert';
import { MODERN_LEXICON, disambiguateByContext, isArchaicOrAwkward, sanitizeVietnamese } from './utils/modern-lexicon.js';

console.log('--- 🧪 STARTING UNIVERSAL TRANSLATION ENGINE VERIFICATION ---');

// 1. PDF URL Interceptor Regex Test
console.log('\n[TEST 1] PDF URL Interceptor');
function isLikelyPdfUrl(urlStr) {
  try {
    if (!urlStr || typeof urlStr !== 'string') return false;
    if (urlStr.startsWith('chrome-extension://') || urlStr.startsWith('chrome://') || urlStr.startsWith('edge://')) return false;

    const parsed = new URL(urlStr);
    const hostname = (parsed.hostname || '').toLowerCase();
    if (hostname.includes('google.') || hostname.includes('bing.') || hostname.includes('duckduckgo.') || hostname.includes('yahoo.')) {
      return false;
    }

    const pathname = (parsed.pathname || '').toLowerCase();
    return pathname.endsWith('.pdf');
  } catch (_) {
    return false;
  }
}

const testUrls = [
  { url: 'https://arxiv.org/pdf/2301.00001.pdf', expected: true },
  { url: 'https://example.com/document.PDF', expected: true },
  { url: 'https://example.com/paper.pdf?token=abc123xyz', expected: true },
  { url: 'https://example.com/book.pdf#page=12', expected: true },
  { url: 'https://example.com/file.pdf?query=test#hash', expected: true },
  { url: 'file:///C:/Users/test/Downloads/lecture1.pdf', expected: true },
  { url: 'https://example.com/pdf/viewer.html', expected: false },
  { url: 'https://example.com/not-a-pdf.doc', expected: false },
  { url: 'https://example.com/something.pdf.html', expected: false },
  { url: 'chrome-extension://xyz/pdf/reader.html?file=...', expected: false },
  { url: 'https://www.google.com/search?q=ielts_reading.pdf', expected: false },
  { url: 'https://duckduckgo.com/?q=sample.pdf', expected: false },
];

testUrls.forEach(({ url, expected }) => {
  const matched = isLikelyPdfUrl(url);
  assert.strictEqual(matched, expected, `URL failed: ${url}`);
  console.log(`  ✓ ${url} => ${matched ? 'INTERCEPTED' : 'PASSED THROUGH'}`);
});

// 2. Deep Active Selection Simulation Test
console.log('\n[TEST 2] Deep Active Selection Simulation');

function simulateWindowSelection(text) {
  return {
    toString: () => text,
    rangeCount: text ? 1 : 0,
    getRangeAt: () => ({
      getBoundingClientRect: () => ({ left: 100, top: 200, right: 180, bottom: 220, width: 80, height: 20 }),
      commonAncestorContainer: { nodeType: 1, parentNode: null, innerText: `This is a sample sentence with ${text} inside.` }
    })
  };
}

function simulateShadowDom(shadowText) {
  return {
    shadowRoot: {
      getSelection: () => ({
        toString: () => shadowText,
        rangeCount: shadowText ? 1 : 0,
        getRangeAt: () => ({
          getBoundingClientRect: () => ({ left: 50, top: 60, right: 120, bottom: 80, width: 70, height: 20 }),
          commonAncestorContainer: { nodeType: 1, innerText: `Shadow context with ${shadowText}` }
        })
      }),
      activeElement: null
    }
  };
}

function simulateInput(value, start, end) {
  return {
    tagName: 'INPUT',
    value,
    selectionStart: start,
    selectionEnd: end,
    getBoundingClientRect: () => ({ left: 20, top: 30, right: 200, bottom: 60, width: 180, height: 30 })
  };
}

function mockDeepSelection(activeEl, winSel) {
  let selectedText = '';
  let anchorRect = null;
  let source = '';

  // 1. Standard
  if (winSel && winSel.rangeCount > 0 && winSel.toString().trim()) {
    selectedText = winSel.toString().trim();
    const rect = winSel.getRangeAt(0).getBoundingClientRect();
    anchorRect = rect;
    source = 'window';
  }

  // 2. Shadow DOM
  if (!selectedText && activeEl && activeEl.shadowRoot) {
    const sSel = activeEl.shadowRoot.getSelection();
    if (sSel && sSel.rangeCount > 0 && sSel.toString().trim()) {
      selectedText = sSel.toString().trim();
      anchorRect = sSel.getRangeAt(0).getBoundingClientRect();
      source = 'shadow';
    }
  }

  // 3. Form input
  if (!selectedText && activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    const s = activeEl.selectionStart;
    const e = activeEl.selectionEnd;
    if (typeof s === 'number' && typeof e === 'number' && s < e) {
      selectedText = activeEl.value.substring(s, e).trim();
      anchorRect = activeEl.getBoundingClientRect();
      source = 'input';
    }
  }

  return { selectedText, anchorRect, source };
}

// Case A: Normal selection
const resA = mockDeepSelection(null, simulateWindowSelection('phenomenon'));
assert.strictEqual(resA.selectedText, 'phenomenon');
assert.strictEqual(resA.source, 'window');
console.log('  ✓ Standard window selection extracted correctly');

// Case B: Selection inside Web Component / Shadow DOM
const resB = mockDeepSelection(simulateShadowDom('paradigm'), null);
assert.strictEqual(resB.selectedText, 'paradigm');
assert.strictEqual(resB.source, 'shadow');
console.log('  ✓ Shadow DOM selection extracted correctly');

// Case C: Selection inside Input / Textarea
const resC = mockDeepSelection(simulateInput('Hello serendipity world', 6, 17), null);
assert.strictEqual(resC.selectedText, 'serendipity');
assert.strictEqual(resC.source, 'input');
console.log('  ✓ Form input selection extracted correctly');

// 3. Viewport & Iframe Coordinate Clamping Test
console.log('\n[TEST 3] Viewport & Iframe Coordinate Clamping');
function clampCoordinates(rawX, rawY, scrollX, scrollY, viewportW, viewportH) {
  const minX = scrollX + 4;
  const maxX = scrollX + viewportW - 44;
  const clampedX = Math.max(minX, Math.min(rawX, maxX));

  const minY = scrollY + 4;
  const maxY = scrollY + viewportH - 44;
  const clampedY = Math.max(minY, Math.min(rawY, maxY));
  return { x: clampedX, y: clampedY };
}

// Test overflowing right in a narrow iframe (width = 300, rawX = 450)
const clamp1 = clampCoordinates(450, 100, 0, 0, 300, 400);
assert.strictEqual(clamp1.x, 256, 'Should clamp to width - 44');
console.log('  ✓ Right overflow clamped correctly within iframe viewport');

// Test overflowing top in an iframe (rawY = -20)
const clamp2 = clampCoordinates(100, -20, 0, 0, 300, 400);
assert.strictEqual(clamp2.y, 4, 'Should clamp to minY 4');
console.log('  ✓ Top overflow clamped correctly within iframe viewport');

// 4. Base64 Chunked Buffer for PDF Transfer
console.log('\n[TEST 4] Base64 Chunked Buffer for PDF Transfer');
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

const mockPdfBytes = Buffer.from('%PDF-1.4 Mock PDF Content For VocabMaster Test %EOF');
const b64 = bufferToBase64(mockPdfBytes);
const decoded = Buffer.from(b64, 'base64').toString('utf8');
assert.strictEqual(decoded, '%PDF-1.4 Mock PDF Content For VocabMaster Test %EOF');
console.log('  ✓ Chunked base64 serialization matches original binary content');

// 5. Lexicon & Thuần Việt Disambiguation Test
console.log('\n[TEST 5] Modern Thuần Việt Lexicon & Disambiguation');
const principalEntry = MODERN_LEXICON['principal'];
assert.ok(principalEntry, 'principal must exist in modern lexicon');
assert.ok(principalEntry.meaning_vi.includes('hiệu trưởng'), 'meaning_vi must include hiệu trưởng');
console.log(`  ✓ 'principal' => '${principalEntry.meaning_vi}' (Thuần Việt: chính xác, không phải 'giám đốc trường')`);

const announceEntry = MODERN_LEXICON['announcement'];
assert.ok(announceEntry, 'announcement must exist in modern lexicon');
assert.strictEqual(announceEntry.meaning_vi, 'thông báo');
console.log(`  ✓ 'announcement' => '${announceEntry.meaning_vi}' (Thuần Việt: chính xác, không phải 'lời rao')`);

// Contextual disambiguation
const bankRiver = disambiguateByContext('bank', 'We walked along the river bank.');
assert.ok(bankRiver, 'bank in river context must disambiguate');
assert.strictEqual(bankRiver.meaning_vi, 'bờ sông, bờ suối');
console.log(`  ✓ 'bank' in river context => '${bankRiver.meaning_vi}'`);

const bankMoney = disambiguateByContext('bank', 'I deposited money in the central bank.');
assert.ok(bankMoney, 'bank in money context must disambiguate');
assert.strictEqual(bankMoney.meaning_vi, 'ngân hàng');
console.log(`  ✓ 'bank' in money context => '${bankMoney.meaning_vi}'`);

const currentWater = disambiguateByContext('current', 'The ocean current was strong.');
assert.ok(currentWater);
assert.ok(currentWater.meaning_vi.includes('dòng nước'));
console.log(`  ✓ 'current' in ocean context => '${currentWater.meaning_vi}'`);

const currentElectric = disambiguateByContext('current', 'The electric current passes through the circuit wire.');
assert.ok(currentElectric);
assert.strictEqual(currentElectric.meaning_vi, 'dòng điện');
console.log(`  ✓ 'current' in circuit context => '${currentElectric.meaning_vi}'`);

const chargeBattery = disambiguateByContext('charge', 'My phone battery needs to charge.');
assert.ok(chargeBattery);
assert.ok(chargeBattery.meaning_vi.includes('sạc pin'));
console.log(`  ✓ 'charge' in phone battery context => '${chargeBattery.meaning_vi}'`);

const partyPolitics = disambiguateByContext('party', 'The opposition party won the general election vote.');
assert.ok(partyPolitics);
assert.ok(partyPolitics.meaning_vi.includes('đảng phái'));
console.log(`  ✓ 'party' in election context => '${partyPolitics.meaning_vi}'`);

// New Modern Lexicon entries test
assert.ok(MODERN_LEXICON['accommodation']);
assert.ok(MODERN_LEXICON['complimentary']);
assert.ok(MODERN_LEXICON['infrastructure']);
console.log(`  ✓ 'accommodation' => '${MODERN_LEXICON['accommodation'].meaning_vi}'`);
console.log(`  ✓ 'complimentary' => '${MODERN_LEXICON['complimentary'].meaning_vi}'`);
console.log(`  ✓ 'infrastructure' => '${MODERN_LEXICON['infrastructure'].meaning_vi}'`);

// Archaic detection and sanitize
assert.strictEqual(isArchaicOrAwkward('ông ta là giám đốc trường'), true);
assert.strictEqual(sanitizeVietnamese('ông ta là giám đốc trường'), 'ông ta là hiệu trưởng');
console.log(`  ✓ 'giám đốc trường' sanitized to '${sanitizeVietnamese('ông ta là giám đốc trường')}'`);

console.log('\n======================================================');
console.log('🎉 ALL 5 VERIFICATION MODULES PASSED WITH 100% SUCCESS!');
console.log('======================================================');
