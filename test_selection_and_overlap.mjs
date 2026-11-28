import assert from 'node:assert';
import fs from 'node:fs';

console.log('--- 🧪 TESTING SELECTION BOUNDARY & OVERLAP PROTECTION ---');

// Mock DOM elements
class MockNode {
  constructor(nodeName, nodeType = 1) {
    this.nodeName = nodeName;
    this.nodeType = nodeType;
    this.parentNode = null;
    this.parentElement = null;
    this.classList = new Set();
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; }
    };
    this.children = [];
    this._listeners = {};
  }
  get className() {
    return Array.from(this.classList).join(' ');
  }
  set className(val) {
    this.classList = new Set(val.split(' ').filter(Boolean));
  }
  contains(target) {
    if (this === target) return true;
    for (const child of this.children) {
      if (child.contains(target)) return true;
    }
    return false;
  }
  closest(selector) {
    const cls = selector.replace('.', '');
    let curr = this;
    while (curr) {
      if (curr.classList && curr.classList.has(cls)) return curr;
      curr = curr.parentElement || curr.parentNode;
    }
    return null;
  }
  appendChild(child) {
    child.parentNode = this;
    if (this.nodeType === 1) {
      child.parentElement = this;
    }
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
      this.parentElement = null;
    }
  }
  addEventListener(event, fn) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }
  dispatchEvent(event, data) {
    if (this._listeners[event]) {
      for (const fn of this._listeners[event]) {
        fn(data);
      }
    }
  }
  getBoundingClientRect() {
    return { left: 100, top: 200, right: 180, bottom: 220, width: 80, height: 20 };
  }
  getClientRects() {
    return [this.getBoundingClientRect()];
  }
}

// 1. Test Selection boundary checks
const tooltip = new MockNode('DIV');
tooltip.className = 'vm-tooltip';

const cardContent = new MockNode('DIV');
cardContent.className = 'vm-card';
tooltip.appendChild(cardContent);

const meaningText = new MockNode('SPAN');
meaningText.className = 'vm-meaning';
cardContent.appendChild(meaningText);

// Text node child inside meaningText
const textNode = new MockNode('#text', 3);
meaningText.appendChild(textNode);

function isInsideVocabMaster(node) {
  if (!node) return false;
  const el = node.nodeType === 3 ? (node.parentElement || node.parentNode) : node;
  if (!el || typeof el.closest !== 'function') return false;
  return !!(el.closest('.vm-tooltip') || el.closest('.vm-float-trigger') || el.closest('.vm-modal-overlay'));
}

assert.strictEqual(isInsideVocabMaster(textNode), true, 'TextNode inside vm-tooltip must be recognized');
assert.strictEqual(isInsideVocabMaster(meaningText), true, 'Element inside vm-tooltip must be recognized');

// Selection on ordinary page element
const pageArticle = new MockNode('ARTICLE');
const paragraph = new MockNode('P');
pageArticle.appendChild(paragraph);
const pageText = new MockNode('#text', 3);
paragraph.appendChild(pageText);

assert.strictEqual(isInsideVocabMaster(pageText), false, 'Page text must NOT be inside VocabMaster');

// 2. Test Full Execution of content.js in Mocked DOM
const doc = new MockNode('DOCUMENT', 9);
const body = new MockNode('BODY', 1);
doc.appendChild(body);
doc.body = body;
doc.documentElement = body;
doc.querySelectorAll = (sel) => {
  const results = [];
  function search(node) {
    if (node.classList && (
      (sel.includes('vm-tooltip') && node.classList.has('vm-tooltip')) ||
      (sel.includes('vm-float-trigger') && node.classList.has('vm-float-trigger')) ||
      (sel.includes('vm-modal-overlay') && node.classList.has('vm-modal-overlay'))
    )) {
      results.push(node);
    }
    for (const ch of node.children) search(ch);
  }
  search(body);
  return results;
};
doc.querySelector = (sel) => doc.querySelectorAll(sel)[0] || null;
doc.createElement = (tag) => new MockNode(tag.toUpperCase(), 1);
doc.getElementById = () => null;

const win = {
  getSelection: () => ({
    rangeCount: 1,
    toString: () => 'meticulous',
    getRangeAt: () => ({
      commonAncestorContainer: pageText,
      startContainer: pageText,
      endContainer: pageText,
      getBoundingClientRect: () => ({ left: 50, top: 100, right: 120, bottom: 120, width: 70, height: 20 }),
      getClientRects: () => []
    })
  }),
  scrollX: 0,
  scrollY: 0,
  innerWidth: 1200,
  innerHeight: 800
};

const chromeMock = {
  runtime: {
    id: 'test-ext-id',
    sendMessage: () => Promise.resolve({ success: true, data: { type: 'word', original: 'meticulous', word: { meaning_vi: 'tỉ mỉ' } } }),
    onMessage: { addListener: () => {} }
  },
  storage: {
    local: { get: () => Promise.resolve({ anti_select_enabled: true }) }
  }
};

const contentJsCode = fs.readFileSync('d:/extension/content/content.js', 'utf8');

// Execute content.js in sandbox
const sandbox = new Function('window', 'document', 'chrome', contentJsCode);
sandbox(win, doc, chromeMock);

console.log('✓ content.js loaded and executed cleanly without TDZ or initialization errors');

// Dispatch mouseup event
doc.dispatchEvent('mouseup', { clientX: 100, clientY: 100 });

// Wait for mouseup 20ms timeout
await new Promise(r => setTimeout(r, 50));

const triggers = doc.querySelectorAll('.vm-float-trigger');
assert.strictEqual(triggers.length, 1, 'Float trigger ✨ must be successfully created on page selection');
console.log('✓ Float trigger ✨ spawned successfully at coordinates:', triggers[0].style.left, triggers[0].style.top);

// Now simulate an open tooltip:
const mockTip = new MockNode('DIV');
mockTip.className = 'vm-tooltip';
body.appendChild(mockTip);

// Trigger another selection while tooltip is open:
doc.dispatchEvent('mouseup', { clientX: 150, clientY: 150 });
await new Promise(r => setTimeout(r, 50));

const triggersWhileTooltipOpen = doc.querySelectorAll('.vm-float-trigger');
assert.strictEqual(triggersWhileTooltipOpen.length, 0, 'Float trigger must NEVER exist while tooltip is open');
console.log('✓ Mutual exclusion verified: Float trigger is suppressed when tooltip is active');

console.log('======================================================');
console.log('🎉 ALL SELECTION & OVERLAP PROTECTION CHECKS PASSED 100%!');
console.log('======================================================');

// =========================================================================
// PART 2: v1.1.2 UNIVERSAL ENGINE TESTS (Google Docs, Reddit Shadow DOM, Monaco, Alt+D, Small Iframe Relay)
// =========================================================================
console.log('\n--- 🧪 TESTING v1.1.2 GOOGLE DOCS, SHADOW DOM, MONACO, ALT+D & IFRAME RELAY ---');

function createDomSandbox({
  hostname = 'example.com',
  innerWidth = 1200,
  innerHeight = 800,
  isIframe = false,
  winSelectionText = ''
} = {}) {
  class RichMockNode extends MockNode {
    constructor(nodeName, nodeType = 1, rect = null) {
      super(nodeName, nodeType);
      this.tagName = nodeName;
      this._rect = rect || { left: 100, top: 200, right: 180, bottom: 220, width: 80, height: 20 };
      this._attrs = {};
      this.shadowRoot = null;
      this.contentDocument = null;
    }
    setAttribute(k, v) { this._attrs[k] = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; }
    removeAttribute(k) { delete this._attrs[k]; }
    getBoundingClientRect() { return this._rect; }
    closest(selector) {
      let curr = this;
      while (curr) {
        if (matchesSimple(curr, selector)) return curr;
        curr = curr.parentElement || curr.parentNode;
      }
      return null;
    }
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => {
        if (n !== this && matchesSimple(n, sel)) out.push(n);
        for (const c of n.children || []) walk(c);
      };
      walk(this);
      return out;
    }
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    }
  }

  function matchesSingleSelector(node, part) {
    const p = part.trim();
    if (!p || !node || node.nodeType !== 1) return false;
    // Handle descendant selector like ".monaco-editor .selected-text" or ".kix-canvas-tile-selection rect"
    if (p.includes(' ')) {
      const tokens = p.split(/\s+/).filter(Boolean);
      const tail = tokens[tokens.length - 1];
      if (!matchesSingleSelector(node, tail)) return false;
      let ancestor = node.parentElement || node.parentNode;
      for (let i = tokens.length - 2; i >= 0; i--) {
        while (ancestor && !matchesSingleSelector(ancestor, tokens[i])) {
          ancestor = ancestor.parentElement || ancestor.parentNode;
        }
        if (!ancestor) return false;
        ancestor = ancestor.parentElement || ancestor.parentNode;
      }
      return true;
    }
    const cleanP = p.replace(/:not\([^)]+\)/g, '');
    const m = cleanP.match(/^([a-zA-Z0-9_-]+)?(?:\.([a-zA-Z0-9_.-]+))?(?:\[[^\]]+\])?$/);
    if (!m) return false;
    const tag = m[1];
    const clsList = m[2] ? m[2].split('.') : [];
    if (tag && String(node.tagName || '').toUpperCase() !== tag.toUpperCase()) return false;
    for (const c of clsList) {
      if (!node.classList || !node.classList.has(c)) return false;
    }
    if (p.includes(':not(.vm-tooltip-exit)') && node.classList?.has('vm-tooltip-exit')) return false;
    return true;
  }

  function matchesSimple(node, selectorList) {
    return selectorList.split(',').some(sel => matchesSingleSelector(node, sel));
  }

  const sDoc = new RichMockNode('DOCUMENT', 9);
  const sBody = new RichMockNode('BODY', 1);
  sDoc.appendChild(sBody);
  sDoc.body = sBody;
  sDoc.documentElement = sBody;
  sDoc.activeElement = sBody;
  sDoc.createElement = (tag) => new RichMockNode(tag.toUpperCase(), 1);
  sDoc.getElementById = () => null;
  sDoc.querySelectorAll = (sel) => {
    const out = [];
    const walk = (n) => {
      if (matchesSimple(n, sel)) out.push(n);
      for (const c of n.children || []) walk(c);
    };
    walk(sBody);
    return out;
  };
  sDoc.querySelector = (sel) => sDoc.querySelectorAll(sel)[0] || null;

  const sentMessages = [];
  const sWin = {
    location: { hostname },
    scrollX: 0,
    scrollY: 0,
    innerWidth,
    innerHeight,
    getSelection: () => winSelectionText
      ? {
          rangeCount: 1,
          toString: () => winSelectionText,
          getRangeAt: () => ({
            commonAncestorContainer: sBody,
            startContainer: sBody,
            endContainer: sBody,
            getBoundingClientRect: () => ({ left: 40, top: 60, right: 120, bottom: 80, width: 80, height: 20 }),
            getClientRects: () => []
          })
        }
      : { rangeCount: 0, toString: () => '' },
    dispatchEvent() {}
  };
  sWin.top = isIframe ? { fakeTop: true } : sWin;

  const sChrome = {
    runtime: {
      id: 'test-ext-id',
      sendMessage: (msg) => {
        sentMessages.push(msg);
        return Promise.resolve({ success: true, data: { type: 'word', original: msg.text, word: { meaning_vi: 'ok' } } });
      },
      onMessage: { addListener: () => {} }
    },
    storage: { local: { get: () => Promise.resolve({ anti_select_enabled: true }) } }
  };

  return { RichMockNode, sDoc, sBody, sWin, sChrome, sentMessages };
}

// TEST 3: Google Docs (docs.google.com) Canvas + docs-texteventtarget-iframe + below-selection placement + pointerdown shield
{
  const sb = createDomSandbox({ hostname: 'docs.google.com', winSelectionText: '' });
  const selWrap = new sb.RichMockNode('DIV', 1);
  selWrap.className = 'kix-canvas-tile-selection';
  const selRect = new sb.RichMockNode('RECT', 1, { left: 200, top: 300, right: 310, bottom: 324, width: 110, height: 24 });
  selWrap.appendChild(selRect);
  sb.sBody.appendChild(selWrap);

  const iframe = new sb.RichMockNode('IFRAME', 1);
  iframe.className = 'docs-texteventtarget-iframe';
  const fDocListeners = {};
  const fakeIframeDoc = {
    addEventListener(ev, fn) { fDocListeners[ev] = fDocListeners[ev] || []; fDocListeners[ev].push(fn); },
    removeEventListener(ev, fn) { if (fDocListeners[ev]) fDocListeners[ev] = fDocListeners[ev].filter(f => f !== fn); },
    execCommand(cmd) {
      if (cmd === 'copy') {
        for (const fn of (fDocListeners.copy || [])) {
          fn({ clipboardData: { getData: () => 'sustainable infrastructure' }, preventDefault() {} });
        }
      }
      return true;
    }
  };
  iframe.contentDocument = fakeIframeDoc;
  sb.sBody.appendChild(iframe);

  const runDocs = new Function('window', 'document', 'chrome', contentJsCode);
  runDocs(sb.sWin, sb.sDoc, sb.sChrome);

  sb.sDoc.dispatchEvent('mouseup', { clientX: 250, clientY: 312 });
  await new Promise(r => setTimeout(r, 45));

  const triggers = sb.sDoc.querySelectorAll('.vm-float-trigger');
  assert.strictEqual(triggers.length, 1, 'Google Docs selection must spawn ✨ trigger');
  const topPx = parseInt(triggers[0].style.top, 10);
  assert(topPx >= 324, `Google Docs trigger must sit BELOW selection (${topPx} >= 324) to avoid formatting toolbar`);

  // Verify pointerdown shield stops propagation & prevents focus loss
  let stopped = false;
  let prevented = false;
  triggers[0].dispatchEvent('pointerdown', {
    stopPropagation() { stopped = true; },
    preventDefault() { prevented = true; }
  });
  assert(stopped && prevented, 'PointerDown shield must call stopPropagation and preventDefault');
  console.log('✓ Google Docs Kix Canvas + docs-texteventtarget-iframe + below-selection placement + pointerdown shield passed');
}

// TEST 4: Shadow DOM via event.composedPath() when document.activeElement === body (Reddit <shreddit-post>)
{
  const sb = createDomSandbox({ hostname: 'www.reddit.com', winSelectionText: '' });
  const shredditPost = new sb.RichMockNode('SHREDDIT-POST', 1);
  const innerSpan = new sb.RichMockNode('SPAN', 1);
  const mockShadowRoot = {
    host: shredditPost,
    getSelection: () => ({
      rangeCount: 1,
      toString: () => 'serendipity',
      getRangeAt: () => ({
        commonAncestorContainer: innerSpan,
        startContainer: innerSpan,
        endContainer: innerSpan,
        getBoundingClientRect: () => ({ left: 150, top: 240, right: 230, bottom: 260, width: 80, height: 20 }),
        getClientRects: () => []
      })
    })
  };
  innerSpan.getRootNode = () => mockShadowRoot;
  shredditPost.shadowRoot = mockShadowRoot;
  sb.sBody.appendChild(shredditPost);

  const runReddit = new Function('window', 'document', 'chrome', contentJsCode);
  runReddit(sb.sWin, sb.sDoc, sb.sChrome);

  sb.sDoc.dispatchEvent('mouseup', {
    clientX: 190,
    clientY: 250,
    target: shredditPost,
    composedPath: () => [innerSpan, mockShadowRoot, shredditPost, sb.sBody]
  });
  await new Promise(r => setTimeout(r, 45));

  const triggers = sb.sDoc.querySelectorAll('.vm-float-trigger');
  assert.strictEqual(triggers.length, 1, 'Shadow DOM selection via composedPath() must spawn ✨ trigger');
  console.log('✓ Reddit-style Shadow DOM composedPath() extraction passed');
}

// TEST 5 & 6: Monaco Editor visual anchor (.selected-text) + Alt+D keyboard shortcut
{
  const sb = createDomSandbox({ hostname: 'leetcode.com', winSelectionText: '' });
  const monaco = new sb.RichMockNode('DIV', 1);
  monaco.className = 'monaco-editor';
  const selHighlight = new sb.RichMockNode('DIV', 1, { left: 420, top: 180, right: 500, bottom: 200, width: 80, height: 20 });
  selHighlight.className = 'selected-text';
  const inputArea = new sb.RichMockNode('TEXTAREA', 1, { left: 0, top: 900, right: 1, bottom: 901, width: 1, height: 1 });
  inputArea.className = 'inputarea';
  inputArea.value = 'const resilience = true;';
  inputArea.selectionStart = 6;
  inputArea.selectionEnd = 16; // "resilience"

  monaco.appendChild(selHighlight);
  monaco.appendChild(inputArea);
  sb.sBody.appendChild(monaco);
  sb.sDoc.activeElement = inputArea;

  const runMonaco = new Function('window', 'document', 'chrome', contentJsCode);
  runMonaco(sb.sWin, sb.sDoc, sb.sChrome);

  sb.sDoc.dispatchEvent('mouseup', { clientX: 460, clientY: 190, target: monaco });
  await new Promise(r => setTimeout(r, 45));

  const triggers = sb.sDoc.querySelectorAll('.vm-float-trigger');
  assert.strictEqual(triggers.length, 1, 'Monaco Editor selection must spawn ✨ trigger');
  assert.strictEqual(triggers[0].style.top, '144px', 'Trigger must anchor to .selected-text (180-36=144px), not 1x1 textarea at y=900');

  // Test Alt+D keyboard shortcut
  let altPrevented = false;
  sb.sDoc.dispatchEvent('keydown', {
    altKey: true,
    key: 'd',
    code: 'KeyD',
    preventDefault() { altPrevented = true; },
    stopPropagation() {}
  });
  await new Promise(r => setTimeout(r, 20));
  assert(altPrevented, 'Alt+D must preventDefault');
  assert(sb.sentMessages.some(m => m.type === 'TRANSLATE' && m.text === 'resilience'), 'Alt+D must dispatch TRANSLATE for "resilience"');
  console.log('✓ Monaco Editor .selected-text visual anchor & Alt+D shortcut passed');
}

// TEST 7: Small Iframe Top-Frame Relay (RELAY_TRANSLATE_TO_TOP)
{
  const sb = createDomSandbox({ hostname: 'canvas.instructure.com', innerWidth: 320, innerHeight: 160, isIframe: true, winSelectionText: 'paradigm' });
  const runIframe = new Function('window', 'document', 'chrome', contentJsCode);
  runIframe(sb.sWin, sb.sDoc, sb.sChrome);

  sb.sDoc.dispatchEvent('keydown', {
    altKey: true,
    key: 'd',
    code: 'KeyD',
    preventDefault() {},
    stopPropagation() {}
  });
  await new Promise(r => setTimeout(r, 30));

  assert(sb.sentMessages.some(m => m.type === 'RELAY_TRANSLATE_TO_TOP' && m.text === 'paradigm'), 'Tiny iframe must relay tooltip to top frame');
  assert.strictEqual(sb.sDoc.querySelectorAll('.vm-tooltip').length, 0, 'Tiny iframe must NOT render local clipped tooltip');
  console.log('✓ Tiny iframe Top-Frame Relay (RELAY_TRANSLATE_TO_TOP) passed');
}

// TEST 8: Chrome Native PDF Wrapper Auto-Redirect (document.contentType === 'application/pdf')
{
  const sb = createDomSandbox({ hostname: 'arxiv.org', winSelectionText: '' });
  sb.sWin.location.href = 'https://arxiv.org/pdf/2104.08821';
  sb.sDoc.contentType = 'application/pdf';
  sb.sChrome.runtime.getURL = (p) => `chrome-extension://test-ext-id/${p}`;

  const runPdfDetect = new Function('window', 'document', 'chrome', contentJsCode);
  runPdfDetect(sb.sWin, sb.sDoc, sb.sChrome);
  await new Promise(r => setTimeout(r, 25));

  assert(
    sb.sentMessages.some(m => m.type === 'OPEN_IN_PDF_READER' && m.url === 'https://arxiv.org/pdf/2104.08821' && m.replaceCurrentTab === true),
    'Native Chrome PDF document must trigger OPEN_IN_PDF_READER replacement'
  );
  console.log('✓ Native Chrome PDF wrapper auto-redirect (OPEN_IN_PDF_READER) passed');
}

// TEST 9: PDF .textLayer LaTeX De-hyphenation & Multi-Rect getClientRects Anchoring
{
  const sb = createDomSandbox({ hostname: 'example.com', winSelectionText: '' });
  const textLayer = new sb.RichMockNode('DIV', 1);
  textLayer.className = 'textLayer';
  const spanNode = new sb.RichMockNode('SPAN', 1);
  const textLeaf = new sb.RichMockNode('#text', 3);
  spanNode.appendChild(textLeaf);
  textLayer.appendChild(spanNode);
  sb.sBody.appendChild(textLayer);

  sb.sWin.getSelection = () => ({
    rangeCount: 1,
    toString: () => 'premise-\nhypothesis dropout\nmasks',
    getRangeAt: () => ({
      commonAncestorContainer: textLeaf,
      startContainer: textLeaf,
      endContainer: textLeaf,
      getBoundingClientRect: () => ({ left: 80, top: 150, right: 300, bottom: 192, width: 220, height: 42 }),
      getClientRects: () => [
        { left: 80, top: 150, right: 140, bottom: 168, width: 60, height: 18 },
        { left: 80, top: 174, right: 210, bottom: 192, width: 130, height: 18 }
      ]
    })
  });

  const runPdfSelection = new Function('window', 'document', 'chrome', contentJsCode);
  runPdfSelection(sb.sWin, sb.sDoc, sb.sChrome);

  sb.sDoc.dispatchEvent('mouseup', { clientX: 205, clientY: 182 });
  await new Promise(r => setTimeout(r, 45));

  const triggers = sb.sDoc.querySelectorAll('.vm-float-trigger');
  assert.strictEqual(triggers.length, 1, 'PDF .textLayer multi-line selection must spawn ✨ trigger');
  assert.strictEqual(triggers[0].style.left, '214px', 'Trigger must anchor to last client rect right edge (210 + 4 = 214px)');
  assert.strictEqual(triggers[0].style.top, '138px', 'Trigger must anchor above last client rect (174 - 36 = 138px)');

  sb.sDoc.dispatchEvent('keydown', {
    altKey: true,
    key: 'd',
    code: 'KeyD',
    preventDefault() {},
    stopPropagation() {}
  });
  await new Promise(r => setTimeout(r, 20));
  assert(
    sb.sentMessages.some(m => m.type === 'TRANSLATE' && m.text === 'premisehypothesis dropout masks'),
    'PDF selection must merge line-break hyphenated words cleanly'
  );
  console.log('✓ PDF .textLayer LaTeX de-hyphenation & multi-rect anchoring passed');
}

console.log('======================================================');
console.log('🎉 ALL v1.1.3 UNIVERSAL & PDF ENGINE TESTS PASSED 100%!');
console.log('======================================================');
