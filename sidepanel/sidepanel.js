// d:/extension/sidepanel/sidepanel.js
// Side panel: Library + Flashcard + Quiz + Typing + Stats

// ═══════════════════════════════════════════════
// TAB ROUTING
// ═══════════════════════════════════════════════
let activeTab = 'library';

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const id = t.dataset.tab;
    document.getElementById('pane-' + id).classList.add('active');
    activeTab = id;
    if (id === 'flashcard') initFlashcard();
    else if (id === 'quiz')  initQuiz();
    else if (id === 'typing') initTyping();
    else if (id === 'stats') renderStats();
  });
});

// Settings link
document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
async function getVocab() {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');
  return vocabulary;
}

async function saveVocab(vocabulary) {
  await chrome.storage.local.set({ vocabulary });
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

async function updateWordProgress(id, correct) {
  const vocab = await getVocab();
  const w = vocab.find(v => v.id === id);
  if (!w) return;
  w.reviewCount = (w.reviewCount || 0) + 1;
  w.lastReviewed = Date.now();
  if (correct) w.correctCount = (w.correctCount || 0) + 1;
  const acc = w.correctCount / w.reviewCount;
  if (w.reviewCount >= 5 && acc >= 0.8) w.status = 'learned';
  else if (w.reviewCount >= 2) w.status = 'learning';
  await saveVocab(vocab);
}

// ═══════════════════════════════════════════════
// LIBRARY
// ═══════════════════════════════════════════════
async function renderLibrary() {
  const vocab = await getVocab();
  const q = document.getElementById('search').value.trim().toLowerCase();
  const f = document.getElementById('filter').value;

  let list = vocab.filter(w => {
    const matchQ = !q || w.word.toLowerCase().includes(q) ||
      (w.definition_vi || '').toLowerCase().includes(q);
    const matchF = f === 'all' || w.status === f;
    return matchQ && matchF;
  }).sort((a, b) => b.addedAt - a.addedAt);

  const el = document.getElementById('vocab-list');
  if (!list.length) {
    const msg = vocab.length === 0
      ? '📭 Chưa có từ nào.<br><br>Bôi đen text tiếng Anh trên web<br>và nhấn <b>"+ Thêm từ"</b> để bắt đầu!'
      : '🔍 Không tìm thấy từ phù hợp';
    el.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }

  const labels = { new: 'Mới', learning: 'Học', learned: 'Thuộc' };
  el.innerHTML = list.map(w => `
    <div class="vcard">
      <div class="vh">
        <span class="vw">${esc(w.word)}</span>
        ${w.ipa ? `<span class="vipa">${esc(w.ipa)}</span>` : ''}
        ${w.partOfSpeech ? `<span class="vpos">${esc(w.partOfSpeech)}</span>` : ''}
      <div class="vdef">
        <div style="color:#a6e3a1;font-weight:700;font-size:13.5px;margin-bottom:2px">🇻🇳 ${esc(w.meaning_vi || w.definition_vi || '')}</div>
        ${w.meaning_vi && w.definition_vi && w.meaning_vi !== w.definition_vi ? `<div style="font-size:12px;color:#bac2de;line-height:1.4">${esc(w.definition_vi)}</div>` : ''}
      </div>
      <div class="vacts">
        <button class="sbtn sbtn-audio" data-word="${esc(w.word)}">🔊 Phát âm</button>
        <button class="sbtn sbtn-del" data-id="${w.id}" data-word="${esc(w.word)}">🗑️ Xóa</button>
      </div>
    </div>`).join('');

  el.querySelectorAll('.sbtn-audio').forEach(b =>
    b.addEventListener('click', () => speak(b.dataset.word))
  );
  el.querySelectorAll('.sbtn-del').forEach(b =>
    b.addEventListener('click', async () => {
      if (!confirm(`Xóa từ "${b.dataset.word}"?`)) return;
      const v = await getVocab();
      await saveVocab(v.filter(w => String(w.id) !== String(b.dataset.id)));
      renderLibrary();
    })
  );
}

document.getElementById('search').addEventListener('input', renderLibrary);
document.getElementById('filter').addEventListener('change', renderLibrary);
renderLibrary(); // Initial render

// Re-render library when vocabulary changes (new word added from content script)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.vocabulary && activeTab === 'library') {
    renderLibrary();
  }
});

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════
// FLASHCARD
// ═══════════════════════════════════════════════
let fcWords = [];
let fcIdx = 0;

async function initFlashcard() {
  const vocab = await getVocab();
  if (!vocab.length) {
    document.getElementById('fc-wrap').innerHTML =
      `<div class="gcard"><p style="color:#6c7086;font-size:13px">📭 Thêm ít nhất 1 từ để chơi Flashcard!</p></div>`;
    return;
  }
  // Prioritize unlearned words; shuffle
  const unlearned = vocab.filter(w => w.status !== 'learned').sort(() => Math.random() - 0.5);
  fcWords = unlearned.length ? unlearned : [...vocab].sort(() => Math.random() - 0.5);
  fcIdx = 0;
  renderFC();
}

function renderFC() {
  const wrap = document.getElementById('fc-wrap');
  if (fcIdx >= fcWords.length) {
    wrap.innerHTML = `
      <div class="gcard">
        <div style="font-size:44px;margin-bottom:14px">🎉</div>
        <h2 style="color:#a6e3a1;margin-bottom:8px">Hoàn thành!</h2>
        <p style="color:#6c7086;font-size:13px;margin-bottom:20px">Đã ôn ${fcWords.length} từ</p>
        <button class="gbtn gb-reveal" id="fc-restart">🔄 Học lại</button>
      </div>`;
    document.getElementById('fc-restart').addEventListener('click', initFlashcard);
    return;
  }

  const w = fcWords[fcIdx];
  const pct = Math.round((fcIdx / fcWords.length) * 100);

  wrap.innerHTML = `
    <div class="gcard">
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      <div class="gctr">
        <span>Từ ${fcIdx + 1} / ${fcWords.length}</span>
        <button class="sbtn sbtn-audio" id="fc-aud" style="background:#313244;color:#cdd6f4">🔊</button>
      </div>
      <div class="gword">${esc(w.word)}</div>
      <div class="gipa">${esc(w.ipa || '')}${w.partOfSpeech ? ' · ' + esc(w.partOfSpeech) : ''}</div>
      <div id="fc-reveal-area" style="min-height:80px;margin-bottom:14px;display:flex;align-items:center;justify-content:center">
        <button class="gbtn gb-reveal" id="fc-show">👁 Xem nghĩa</button>
      </div>
      <div class="fc-acts" id="fc-acts">
        <button class="gbtn gb-wrong" id="fc-wrong">❌ Chưa thuộc</button>
        <button class="gbtn gb-correct" id="fc-correct">✅ Đã thuộc</button>
      </div>
    </div>`;

  document.getElementById('fc-aud').addEventListener('click', () => speak(w.word));

  document.getElementById('fc-show').addEventListener('click', () => {
    document.getElementById('fc-reveal-area').innerHTML = `
        <div style="color:#a6e3a1;font-weight:700;margin-bottom:4px;font-size:15px">🇻🇳 ${esc(w.meaning_vi || w.definition_vi || '')}</div>
        ${w.meaning_vi && w.definition_vi && w.meaning_vi !== w.definition_vi ? `<div style="color:#f9e2af;font-size:12.5px;margin-bottom:6px">${esc(w.definition_vi)}</div>` : ''}
        <div style="color:#bac2de;font-size:12px;margin-bottom:6px">${esc(w.definition_en || '')}</div>
        ${w.examples?.[0] ? `
          <div style="color:#a6adc8;font-size:12px;border-left:2px solid #45475a;padding-left:8px;margin-top:6px">${esc(w.examples[0])}</div>
        ` : ''}
        ${(w.synonyms || []).length ? `
          <div style="margin-top:8px;font-size:12px">
            <span style="color:#6c7086">Đồng nghĩa: </span>
            ${w.synonyms.slice(0, 3).map(s => `<span style="background:#313244;padding:1px 6px;border-radius:4px;color:#cba6f7;font-size:11px">${esc(s)}</span>`).join(' ')}
          </div>
        ` : ''}
      </div>`;
    document.getElementById('fc-acts').style.display = 'flex';
  });

  document.getElementById('fc-correct').addEventListener('click', async () => {
    await updateWordProgress(w.id, true);
    fcIdx++;
    renderFC();
  });
  document.getElementById('fc-wrong').addEventListener('click', async () => {
    await updateWordProgress(w.id, false);
    fcIdx++;
    renderFC();
  });
}

// ═══════════════════════════════════════════════
// QUIZ (Multiple Choice)
// ═══════════════════════════════════════════════
let qzWords = [];
let qzAll = [];
let qzIdx = 0;
let qzScore = 0;

async function initQuiz() {
  const vocab = await getVocab();
  qzAll = vocab;
  if (vocab.length < 4) {
    document.getElementById('qz-wrap').innerHTML =
      `<div class="gcard"><p style="color:#6c7086;font-size:13px">🎯 Cần ít nhất 4 từ để chơi Quiz!</p></div>`;
    return;
  }
  qzWords = [...vocab].sort(() => Math.random() - 0.5).slice(0, Math.min(10, vocab.length));
  qzIdx = 0;
  qzScore = 0;
  renderQuiz();
}

function renderQuiz() {
  const wrap = document.getElementById('qz-wrap');
  if (qzIdx >= qzWords.length) {
    const pct = Math.round((qzScore / qzWords.length) * 100);
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚';
    const msg = pct >= 80 ? 'Xuất sắc!' : pct >= 60 ? 'Khá tốt!' : 'Cần luyện thêm!';
    const color = pct >= 80 ? '#a6e3a1' : pct >= 60 ? '#f9e2af' : '#f38ba8';
    wrap.innerHTML = `
      <div class="gcard">
        <div style="font-size:44px;margin-bottom:14px">${emoji}</div>
        <h2 style="color:${color};margin-bottom:6px">${qzScore}/${qzWords.length} câu đúng</h2>
        <p style="color:#89b4fa;font-size:20px;font-weight:700;margin-bottom:4px">${pct}%</p>
        <p style="color:#6c7086;font-size:13px;margin-bottom:20px">${msg}</p>
        <button class="gbtn gb-reveal" id="qz-restart">🔄 Chơi lại</button>
      </div>`;
    document.getElementById('qz-restart').addEventListener('click', initQuiz);
    return;
  }

  const w = qzWords[qzIdx];
  const pct = Math.round((qzIdx / qzWords.length) * 100);
  // Generate 3 wrong options + 1 correct, shuffle
  const others = qzAll
    .filter(v => v.id !== w.id && v.word !== w.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [...others, w].sort(() => Math.random() - 0.5);

  wrap.innerHTML = `
    <div class="gcard">
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      <div class="gctr">
        <span>Câu ${qzIdx + 1}/${qzWords.length}</span>
        <span>✅ ${qzScore} đúng</span>
      </div>
      <div style="background:#313244;border-radius:10px;padding:14px;margin-bottom:4px;text-align:left">
        <div style="font-size:11px;color:#6c7086;margin-bottom:6px">Từ nào có nghĩa:</div>
        <div style="font-size:14px;line-height:1.5">${esc(w.definition_vi || '')}</div>
        ${w.ipa ? `<div style="font-size:12px;color:#89b4fa;margin-top:4px;font-style:italic">${esc(w.ipa)}</div>` : ''}
      </div>
      <div class="quiz-opts" id="qz-opts">
        ${options.map(o => `
          <button class="qopt" data-id="${o.id}" data-correct="${o.id === w.id}">
            ${esc(o.word)}
          </button>`).join('')}
      </div>
      <div class="qfeedback" id="qz-fb"></div>
    </div>`;

  wrap.querySelectorAll('.qopt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isCorrect = btn.dataset.correct === 'true';
      if (isCorrect) qzScore++;

      // Visual feedback
      wrap.querySelectorAll('.qopt').forEach(b => {
        b.disabled = true;
        if (b.dataset.correct === 'true') b.style.borderColor = '#a6e3a1';
        else if (b === btn && !isCorrect) b.style.borderColor = '#f38ba8';
      });

      document.getElementById('qz-fb').innerHTML = isCorrect
        ? `<span style="color:#a6e3a1">✅ Chính xác!</span>`
        : `<span style="color:#f38ba8">❌ Sai! Đáp án: <b style="color:#89b4fa">${esc(w.word)}</b></span>`;

      await updateWordProgress(w.id, isCorrect);
      setTimeout(() => { qzIdx++; renderQuiz(); }, 1400);
    });
  });
}

// ═══════════════════════════════════════════════
// TYPING GAME
// ═══════════════════════════════════════════════
let tyWords = [];
let tyIdx = 0;
let tyScore = 0;

async function initTyping() {
  const vocab = await getVocab();
  if (!vocab.length) {
    document.getElementById('ty-wrap').innerHTML =
      `<div class="gcard"><p style="color:#6c7086;font-size:13px">⌨️ Thêm ít nhất 1 từ để chơi!</p></div>`;
    return;
  }
  tyWords = [...vocab].sort(() => Math.random() - 0.5).slice(0, Math.min(10, vocab.length));
  tyIdx = 0;
  tyScore = 0;
  renderTyping();
}

function renderTyping() {
  const wrap = document.getElementById('ty-wrap');
  if (tyIdx >= tyWords.length) {
    const pct = Math.round((tyScore / tyWords.length) * 100);
    wrap.innerHTML = `
      <div class="gcard">
        <div style="font-size:44px;margin-bottom:14px">⌨️</div>
        <h2 style="color:#89b4fa;margin-bottom:6px">${tyScore}/${tyWords.length} từ đúng</h2>
        <p style="color:#89b4fa;font-size:20px;font-weight:700;margin-bottom:4px">${pct}%</p>
        <p style="color:#6c7086;font-size:13px;margin-bottom:20px">${pct >= 80 ? 'Gõ siêu chuẩn!' : pct >= 50 ? 'Khá ổn!' : 'Luyện thêm nhé!'}</p>
        <button class="gbtn gb-reveal" id="ty-restart">🔄 Chơi lại</button>
      </div>`;
    document.getElementById('ty-restart').addEventListener('click', initTyping);
    return;
  }

  const w = tyWords[tyIdx];
  const pct = Math.round((tyIdx / tyWords.length) * 100);

  // Build hint: first + last char, rest are underscores
  let hint;
  if (w.word.length <= 2) {
    hint = w.word[0] + (w.word.length > 1 ? '_' : '');
  } else {
    hint = w.word[0] + '_'.repeat(w.word.length - 2) + w.word[w.word.length - 1];
  }

  wrap.innerHTML = `
    <div class="gcard">
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
      <div class="gctr">
        <span>Từ ${tyIdx + 1}/${tyWords.length}</span>
        <span>✅ ${tyScore} đúng</span>
      </div>
      <div style="background:#313244;border-radius:10px;padding:14px;margin-bottom:10px;text-align:left">
        <div style="font-size:13px;color:#bac2de;line-height:1.5;margin-bottom:4px">${esc(w.definition_vi || '')}</div>
        ${w.ipa ? `<div style="font-size:12px;color:#89b4fa;font-style:italic">${esc(w.ipa)} · ${esc(w.partOfSpeech || '')}</div>` : ''}
      </div>
      <div class="ty-hint">${esc(hint)}</div>
      <div class="ty-input-row">
        <input type="text" id="ty-in" placeholder="Gõ từ tiếng Anh..."
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        <button class="gbtn gb-reveal" id="ty-ok" style="padding:10px 14px">✓</button>
      </div>
      <div class="ty-btns">
        <button class="sbtn sbtn-audio" id="ty-aud" style="background:#313244;color:#cdd6f4;padding:6px 12px">🔊 Gợi ý âm</button>
        <button class="gbtn gb-skip" id="ty-skip">⏭ Bỏ qua</button>
      </div>
      <div class="tyfeedback" id="ty-fb"></div>
    </div>`;

  const inp = document.getElementById('ty-in');
  inp.focus();

  document.getElementById('ty-aud').addEventListener('click', () => speak(w.word));
  document.getElementById('ty-skip').addEventListener('click', () => { tyIdx++; renderTyping(); });

  const checkAnswer = async () => {
    const answer = inp.value.trim().toLowerCase();
    if (!answer) return;
    const correct = answer === w.word.toLowerCase();
    if (correct) tyScore++;

    const fb = document.getElementById('ty-fb');
    fb.innerHTML = correct
      ? `<span style="color:#a6e3a1">✅ Chính xác! "${esc(w.word)}"</span>`
      : `<span style="color:#f38ba8">❌ Sai! Đáp án: <b style="color:#89b4fa">${esc(w.word)}</b></span>`;

    inp.style.borderColor = correct ? '#a6e3a1' : '#f38ba8';
    document.getElementById('ty-ok').disabled = true;
    inp.disabled = true;

    await updateWordProgress(w.id, correct);
    setTimeout(() => { tyIdx++; renderTyping(); }, 1600);
  };

  document.getElementById('ty-ok').addEventListener('click', checkAnswer);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') checkAnswer(); });
}

// ═══════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════
async function renderStats() {
  const vocab = await getVocab();
  const wrap = document.getElementById('st-wrap');

  if (!vocab.length) {
    wrap.innerHTML = `<div class="empty">📭 Chưa có dữ liệu thống kê.<br>Hãy thêm từ vựng để bắt đầu!</div>`;
    return;
  }

  const total = vocab.length;
  const learned = vocab.filter(w => w.status === 'learned').length;
  const learning = vocab.filter(w => w.status === 'learning').length;
  const newW = vocab.filter(w => w.status === 'new').length;
  const totalReviews = vocab.reduce((s, w) => s + (w.reviewCount || 0), 0);

  const reviewed = vocab.filter(w => w.reviewCount > 0);
  const avgAcc = reviewed.length
    ? reviewed.reduce((s, w) => s + (w.correctCount / w.reviewCount), 0) / reviewed.length
    : 0;

  // Count unique days
  const days = new Set(vocab.map(w => new Date(w.addedAt).toDateString())).size;

  // Level breakdown
  const levels = {};
  vocab.forEach(w => { levels[w.level || '?'] = (levels[w.level || '?'] || 0) + 1; });
  const sortedLevels = Object.entries(levels).sort(([a], [b]) => a.localeCompare(b));

  const accPct = Math.round(avgAcc * 100);
  const accColor = accPct >= 80 ? '#a6e3a1' : accPct >= 50 ? '#f9e2af' : '#f38ba8';

  wrap.innerHTML = `
    <div class="st-streak">
      <div class="st-streak-label">📅 Ngày đã học từ vựng</div>
      <div class="st-streak-n">${days}</div>
      <div class="st-streak-sub">ngày</div>
    </div>

    <div class="st-grid">
      <div class="st-c">
        <div class="st-n" style="color:#89b4fa">${total}</div>
        <div class="st-l">Tổng từ</div>
      </div>
      <div class="st-c">
        <div class="st-n" style="color:#a6e3a1">${learned}</div>
        <div class="st-l">Đã thuộc</div>
      </div>
      <div class="st-c">
        <div class="st-n" style="color:#f9e2af">${learning}</div>
        <div class="st-l">Đang học</div>
      </div>
      <div class="st-c">
        <div class="st-n" style="color:#cba6f7">${totalReviews}</div>
        <div class="st-l">Lần ôn tập</div>
      </div>
    </div>

    <div class="st-c">
      <div style="font-size:11px;color:#6c7086;margin-bottom:8px;text-align:left">Độ chính xác trung bình</div>
      <div class="acc-bar">
        <div class="acc-fill" style="width:${accPct}%"></div>
      </div>
      <div style="font-size:22px;font-weight:700;color:${accColor}">${accPct}%</div>
      <div style="font-size:11px;color:#6c7086;margin-top:2px">
        ${accPct >= 80 ? 'Xuất sắc! 🌟' : accPct >= 50 ? 'Khá tốt 👍' : 'Cần luyện thêm 📚'}
      </div>
    </div>

    ${sortedLevels.length ? `
    <div class="st-c">
      <div style="font-size:11px;color:#6c7086;margin-bottom:10px;text-align:left">Phân bổ theo CEFR Level</div>
      ${sortedLevels.map(([lv, ct]) => `
        <div class="level-row">
          <span style="font-size:11px;width:26px;color:#bac2de;flex-shrink:0">${esc(lv)}</span>
          <div class="level-bar-bg">
            <div class="level-bar-fill" style="width:${Math.round(ct / total * 100)}%"></div>
          </div>
          <span style="font-size:11px;color:#6c7086;width:24px;text-align:right;flex-shrink:0">${ct}</span>
        </div>`).join('')}
    </div>
    ` : ''}

    <div class="st-c">
      <div style="font-size:11px;color:#6c7086;margin-bottom:8px;text-align:left">Tiến trình học</div>
      <div style="display:flex;height:14px;border-radius:7px;overflow:hidden">
        ${learned ? `<div style="flex:${learned};background:#a6e3a1" title="${learned} đã thuộc"></div>` : ''}
        ${learning ? `<div style="flex:${learning};background:#f9e2af" title="${learning} đang học"></div>` : ''}
        ${newW ? `<div style="flex:${newW};background:#89b4fa" title="${newW} từ mới"></div>` : ''}
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:8px;font-size:11px">
        <span style="color:#a6e3a1">■ Thuộc (${learned})</span>
        <span style="color:#f9e2af">■ Học (${learning})</span>
        <span style="color:#89b4fa">■ Mới (${newW})</span>
      </div>
    </div>`;
}
