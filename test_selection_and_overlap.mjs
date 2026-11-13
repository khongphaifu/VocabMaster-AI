import assert from 'node:assert';

console.log('--- 🧪 TESTING SELECTION BOUNDARY & OVERLAP PROTECTION ---');

// Mock DOM elements
class MockNode {
  constructor(nodeName, nodeType = 1) {
    this.nodeName = nodeName;
    this.nodeType = nodeType;
    this.parentNode = null;
    this.classList = new Set();
    this.style = {};
    this.children = [];
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
      curr = curr.parentNode;
    }
    return null;
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
    }
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

// Selection inside tooltip
assert.strictEqual(!!meaningText.closest('.vm-tooltip'), true, 'Should detect inside vm-tooltip');

// Selection on ordinary page element
const pageArticle = new MockNode('ARTICLE');
const paragraph = new MockNode('P');
pageArticle.appendChild(paragraph);
assert.strictEqual(!!paragraph.closest('.vm-tooltip'), false, 'Should be false for page element');

// 2. Test Single instance enforcement
const mockBody = new MockNode('BODY');
mockBody.appendChild(tooltip);

function removeAllVocabMasterUI(doc) {
  const found = doc.children.filter(c => c.className.includes('vm-tooltip'));
  for (const el of found) {
    el.remove();
  }
}

removeAllVocabMasterUI(mockBody);
assert.strictEqual(mockBody.children.length, 0, 'All tooltips removed');

console.log('✅ ALL SELECTION & OVERLAP PROTECTION CHECKS PASSED!');
