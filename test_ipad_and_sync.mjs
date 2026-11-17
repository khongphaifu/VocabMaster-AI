// d:/extension/test_ipad_and_sync.mjs
// Automated verification for iPad PWA, 2-Way Cloud Sync, CORS Safari compatibility, QR Pairing & Userscript

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  normalizeVocabEntry,
  mergeSyncState,
  encodePairingPayload,
  decodePairingPayload
} from './utils/cloud-sync.js';
import { generateQrSvg } from './utils/qr-svg.js';
import { resolveDictionaryWord } from './utils/dict-resolver.js';
import { fetchFromCambridge } from './utils/cambridge-client.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

console.log('--- 🧪 STARTING IPAD ECOSYSTEM & 2-WAY CLOUD SYNC VERIFICATION ---\n');

// =========================================================================
// TEST 1: Unified Schema Normalization & Legacy iPad Migration
// =========================================================================
{
  const chromeItem = normalizeVocabEntry({
    id: 1730000001000,
    word: 'meticulous',
    ipa: '/məˈtɪk.jə.ləs/',
    partOfSpeech: 'adjective',
    level: 'C1',
    meaning_vi: 'tỉ mỉ',
    definition_vi: 'rất cẩn thận và chú ý từng chi tiết nhỏ',
    collocations: [{ phrase: 'meticulous attention', meaning_vi: 'sự chú ý tỉ mỉ' }],
    examples: ['She is meticulous about keeping records.'],
    addedAt: 1730000001000,
    status: 'learning',
    reviewCount: 3,
    correctCount: 2
  });
  assert.strictEqual(chromeItem.word, 'meticulous');
  assert.strictEqual(chromeItem.partOfSpeech, 'adjective');
  assert.strictEqual(chromeItem.collocations[0].phrase, 'meticulous attention');

  // Legacy iPad entry format
  const legacyIpadItem = normalizeVocabEntry({
    id: '1730000002000',
    word: 'observation',
    pos: 'noun',
    cefr: 'B2',
    meaning_vi: 'sự quan sát',
    ipa: '/ˌɒb.zəˈveɪ.ʃən/',
    example: 'Direct observation is required.',
    created_at: '2026-11-10T10:00:00.000Z',
    collocations: [{ collocation: 'close observation', meaning_vi: 'quan sát kỹ' }]
  });
  assert.strictEqual(legacyIpadItem.word, 'observation');
  assert.strictEqual(legacyIpadItem.partOfSpeech, 'noun');
  assert.strictEqual(legacyIpadItem.level, 'B2');
  assert.strictEqual(legacyIpadItem.examples[0], 'Direct observation is required.');
  assert.strictEqual(legacyIpadItem.collocations[0].phrase, 'close observation');
  console.log('[TEST 1] Unified schema normalization & legacy iPad migration ✓');
}

// =========================================================================
// TEST 2: Bi-directional Cloud Merge + Conflict + Delete Tombstones
// =========================================================================
{
  const t1 = Date.now() - 60000;
  const t2 = Date.now() - 20000;
  const t3 = Date.now() - 5000;

  const pcState = {
    vocabulary: [
      { word: 'resilience', meaning_vi: 'khả năng phục hồi', status: 'new', reviewCount: 1, updatedAt: t1, addedAt: t1 },
      { word: 'principal', meaning_vi: 'giám đốc trường', status: 'new', updatedAt: t1, addedAt: t1 },
      { word: 'obsolete', meaning_vi: 'lỗi thời', status: 'new', updatedAt: t1, addedAt: t1 } // deleted on iPad at t2
    ],
    tombstones: {},
    customLexicon: { bank: 'ngân hàng' }
  };

  const ipadState = {
    vocabulary: [
      { word: 'ephemeral', meaning_vi: 'ngắn ngủi', status: 'new', updatedAt: t2, addedAt: t2 },
      { word: 'principal', meaning_vi: 'hiệu trưởng', status: 'learned', reviewCount: 5, correctCount: 5, updatedAt: t2, addedAt: t1 }
    ],
    tombstones: { obsolete: t2 },
    customLexicon: { principal: 'hiệu trưởng' }
  };

  const merged = mergeSyncState(pcState, ipadState);
  const words = merged.vocabulary.map(w => w.word.toLowerCase());

  assert(words.includes('resilience'), 'PC word kept');
  assert(words.includes('ephemeral'), 'iPad word merged to PC');
  assert(!words.includes('obsolete'), 'Tombstone deletion respected across devices');

  const principal = merged.vocabulary.find(w => w.word === 'principal');
  assert.strictEqual(principal.meaning_vi, 'hiệu trưởng', 'Newer edit wins');
  assert.strictEqual(principal.status, 'learned', 'Higher study progress preserved');
  assert.strictEqual(merged.customLexicon.bank, 'ngân hàng');
  assert.strictEqual(merged.customLexicon.principal, 'hiệu trưởng');

  // Re-adding a previously deleted word at t3 > t2 revives cleanly
  const revived = mergeSyncState(
    { vocabulary: [{ word: 'obsolete', meaning_vi: 'lỗi thời', updatedAt: t3, addedAt: t3 }], tombstones: {} },
    merged
  );
  assert(revived.vocabulary.some(w => w.word === 'obsolete'), 'Re-added word newer than tombstone revives');
  assert.strictEqual(revived.tombstones.obsolete, undefined, 'Stale tombstone cleared after revive');
  console.log('[TEST 2] 2-way bi-directional merge + conflict resolution + delete tombstones ✓');
}

// =========================================================================
// TEST 3: UTF-8 Magic Pairing Payload & SVG QR Generation
// =========================================================================
{
  const payload = {
    ghToken: 'ghp_ExampleToken12345',
    gistId: '9876543210abcdef',
    aiProvider: 'gemini',
    apiKeys: { gemini: 'AIzaSyTestKey_Vietnamese_ThửNghiệm', groq: 'gsk_test123' }
  };
  const encoded = encodePairingPayload(payload);
  const fullUrl = `https://khongphaifu.github.io/VocabMaster-AI/ipad/#pair=${encoded}`;
  const decoded = decodePairingPayload(fullUrl);

  assert.strictEqual(decoded.ghToken, payload.ghToken);
  assert.strictEqual(decoded.gistId, payload.gistId);
  assert.strictEqual(decoded.apiKeys.gemini, payload.apiKeys.gemini);

  const svg = generateQrSvg(fullUrl, 220);
  assert(svg.includes('<svg') && svg.includes('#ffffff') && svg.includes('<path'), 'Valid SVG QR code with white quiet zone generated');
  console.log('[TEST 3] UTF-8 Pairing URL roundtrip + Offline SVG QR code generation ✓');
}

// =========================================================================
// TEST 4: Safari CORS Compatibility Check
// =========================================================================
{
  const resolverSrc = fs.readFileSync(path.join(ROOT, 'utils', 'dict-resolver.js'), 'utf8');
  assert(!resolverSrc.includes("'User-Agent':"), 'dict-resolver must not send forbidden User-Agent header in browser fetch');
  assert(resolverSrc.includes('origin=*'), 'Wiktionary fetch must pass origin=* for Safari CORS');

  // Simulate Safari PWA environment (window + document present, chrome undefined)
  globalThis.window = {};
  globalThis.document = {};
  const cambridgeSkipped = await fetchFromCambridge('meticulous');
  assert.strictEqual(cambridgeSkipped, null, 'Cambridge HTML fetch cleanly skipped in web browser PWA when no proxy/extension is present');

  const resolved = await resolveDictionaryWord('principal', 'The university principal spoke clearly.');
  assert(resolved && resolved.word.meaning_vi.includes('hiệu trưởng'), 'Core offline lexicon resolves in Safari PWA environment (0ms)');
  delete globalThis.window;
  delete globalThis.document;
  console.log('[TEST 4] Safari PWA CORS compatibility & instant resolution ✓');
}

// =========================================================================
// TEST 5: Apple Retina Icons, PWA Manifest & Safari Userscript Sandbox Execution
// =========================================================================
{
  for (const sz of [16, 48, 128, 180, 192, 512]) {
    const p = path.join(ROOT, 'icons', `icon-${sz}.png`);
    assert(fs.existsSync(p), `Missing icon-${sz}.png`);
    const buf = fs.readFileSync(p);
    assert(buf.length > 50 && buf[0] === 0x89 && buf[1] === 0x50, `icon-${sz}.png is valid PNG`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'ipad', 'manifest.webmanifest'), 'utf8'));
  assert(manifest.icons.some(i => i.sizes === '512x512'), 'PWA manifest includes 512x512 icon');
  assert(manifest.icons.some(i => i.sizes === '180x180'), 'PWA manifest includes 180x180 Apple icon');

  const userscriptSrc = fs.readFileSync(path.join(ROOT, 'ipad', 'vocabmaster.user.js'), 'utf8');
  assert(userscriptSrc.includes('// ==UserScript=='), 'Userscript header valid');
  assert(userscriptSrc.includes('@grant        GM_xmlhttpRequest'), 'Userscript requests GM_xmlhttpRequest');
  assert(userscriptSrc.includes('MODERN_LEXICON'), 'Userscript includes modern Vietnamese lexicon');

  // Execute Userscript in mock DOM sandbox and simulate text selection
  const appended = [];
  const listeners = {};
  const mockTrigger = {
    className: '',
    innerHTML: '',
    title: '',
    style: { setProperty(k, v) { this[k] = v; } },
    addEventListener() {},
    remove() {}
  };
  const mockText = {
    nodeType: 3,
    textContent: 'The principal announced a plan.',
    parentElement: { closest: () => null },
    parentNode: { closest: () => null }
  };
  const mockWin = {
    scrollX: 0,
    scrollY: 0,
    innerWidth: 1024,
    innerHeight: 768,
    location: { href: 'https://example.com', pathname: '/', hostname: 'example.com' },
    getSelection: () => ({
      rangeCount: 1,
      toString: () => 'principal',
      getRangeAt: () => ({
        commonAncestorContainer: mockText,
        startContainer: mockText,
        getBoundingClientRect: () => ({ left: 100, top: 200, right: 170, bottom: 220, width: 70, height: 20 }),
        getClientRects: () => []
      })
    })
  };
  const mockDoc = {
    head: { appendChild() {} },
    body: {
      contains: () => false,
      appendChild(el) { appended.push(el); }
    },
    documentElement: { appendChild(el) { appended.push(el); } },
    createElement(tag) {
      if (tag === 'style') return { id: '', textContent: '' };
      return { ...mockTrigger, style: { setProperty(k, v) { this[k] = v; } } };
    },
    addEventListener(ev, fn) {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    }
  };
  mockDoc.location = mockWin.location;

  const runner = new Function(
    'window', 'document', 'location', 'GM_getValue', 'GM_setValue', 'GM_xmlhttpRequest', 'GM_registerMenuCommand',
    userscriptSrc
  );
  runner(mockWin, mockDoc, mockWin.location, () => null, () => {}, () => {}, () => {});

  // Trigger simulated touch selection on iPad Safari
  (listeners.touchend || []).forEach(fn => fn());
  await new Promise(r => setTimeout(r, 160));
  assert(appended.some(el => el.className === 'vm-float-trigger'), 'Safari Userscript spawned floating ✨ button after iPad touch selection!');
  console.log('[TEST 5] Icons, Manifest & Safari Userscript runtime touch selection ✓');
}

console.log('\n======================================================');
console.log('🎉 ALL IPAD & CLOUD SYNC TESTS PASSED 100%!');
console.log('======================================================');
