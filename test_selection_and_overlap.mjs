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
