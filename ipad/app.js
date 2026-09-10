// app.js - Logic điều khiển Cảm ứng & Cử chỉ Vuốt cho iPad Edition
import { resolveDictionaryWord } from '../utils/dict-resolver.js';
import { StorageAdapter } from './storage-adapter.js';

const state = {
  currentWord: null,
  vocabList: [],
  settings: {
    aiProvider: 'gemini',
    geminiApiKey: '',
    groqApiKey: '',
    autoSpeech: true
  },
  fcIndex: 0,
  quizScore: 0,
  currentQuizWord: null,
  typingStreak: 0,
  currentTypingWord: null
};

// ==========================================
// 1. ĐIỀU HƯỚNG TABS
// ==========================================
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabKey = tab.dataset.tab;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${tabKey}`));

      if (tabKey === 'library') renderLibrary();
      if (tabKey === 'flashcard') renderFlashcard();
      if (tabKey === 'quiz') startQuizRound();
      if (tabKey === 'typing') startTypingRound();
    });
  });

  const btnTheme = document.getElementById('btn-theme');
  btnTheme?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');
    btnTheme.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
  });
}

// ==========================================
// 2. TRA TỪ TRÊN IPAD
// ==========================================
function initLookup() {
  const input = document.getElementById('lookup-input');
  const btnSearch = document.getElementById('btn-search');
  const btnClear = document.getElementById('btn-clear');

  const doSearch = async () => {
    const text = input.value.trim();
    if (!text) return;

    showLoading(true);
    try {
      const res = await resolveDictionaryWord(text);
      if (res?.word) {
        state.currentWord = res.word;
        renderResult(res.word, res.source);
      } else {
        alert(`Không tìm thấy dữ liệu từ điển cho: "${text}"`);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi tra từ điển: ' + err.message);
    } finally {
      showLoading(false);
    }
  };

  btnSearch?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  btnClear?.addEventListener('click', () => {
    input.value = '';
    input.focus();
  });

  document.getElementById('btn-add-vocab')?.addEventListener('click', () => {
    if (state.currentWord) saveWord(state.currentWord);
  });

  document.getElementById('btn-audio-uk')?.addEventListener('click', () => playAudio(state.currentWord?.word, 'uk'));
  document.getElementById('btn-audio-us')?.addEventListener('click', () => playAudio(state.currentWord?.word, 'us'));
}

function showLoading(show) {
  document.getElementById('lookup-loading')?.classList.toggle('hidden', !show);
  if (show) {
    document.getElementById('lookup-result')?.classList.add('hidden');
    document.getElementById('lookup-empty')?.classList.add('hidden');
  }
}

function renderResult(item, source) {
  document.getElementById('lookup-empty')?.classList.add('hidden');
  const card = document.getElementById('lookup-result');
  card?.classList.remove('hidden');

  document.getElementById('res-word').textContent = item.word || '';
  document.getElementById('res-pos').textContent = item.pos || 'noun';
  document.getElementById('res-cefr').textContent = item.cefr_level || 'B2';

  document.getElementById('res-ipa-uk').textContent = item.ipa_uk || item.ipa_us || '';
  document.getElementById('res-ipa-us').textContent = item.ipa_us || item.ipa_uk || '';

  document.getElementById('res-meaning-vi').textContent = item.meaning_vi || '';
  document.getElementById('res-def-vi').textContent = item.definition_vi || item.meaning_vi || '';
  document.getElementById('res-def-en').textContent = item.definition_en || '';

  // Synonyms
  const synBox = document.getElementById('res-synonyms');
  synBox.innerHTML = '';
  if (item.synonyms?.length) {
    document.getElementById('block-synonyms').classList.remove('hidden');
    item.synonyms.slice(0, 5).forEach(s => {
      const chip = document.createElement('span');
      chip.className = 'chip-item';
      chip.textContent = s;
      chip.addEventListener('click', () => {
        document.getElementById('lookup-input').value = s;
        document.getElementById('btn-search').click();
      });
      synBox.appendChild(chip);
    });
  } else {
    document.getElementById('block-synonyms').classList.add('hidden');
  }

  // Collocations
  const colBox = document.getElementById('res-collocations');
  colBox.innerHTML = '';
  if (item.collocations?.length) {
    document.getElementById('block-collocations').classList.remove('hidden');
    item.collocations.slice(0, 3).forEach(c => {
      const div = document.createElement('div');
      div.className = 'touch-list-item';
      div.innerHTML = `<strong>${c.collocation}</strong>: <span style="color: var(--text-sub);">${c.meaning_vi}</span>`;
      colBox.appendChild(div);
    });
  } else {
    document.getElementById('block-collocations').classList.add('hidden');
  }

  // Family
  const famBox = document.getElementById('res-family');
  famBox.innerHTML = '';
  if (item.word_family?.length) {
    document.getElementById('block-family').classList.remove('hidden');
    item.word_family.slice(0, 3).forEach(f => {
      const div = document.createElement('div');
      div.className = 'touch-list-item';
      div.innerHTML = `<em>${f.pos}</em> <strong>${f.word}</strong>: <span>${f.meaning_vi}</span>`;
      famBox.appendChild(div);
    });
  } else {
    document.getElementById('block-family').classList.add('hidden');
  }

  // Examples
  const exBox = document.getElementById('res-examples');
  exBox.innerHTML = '';
  if (item.examples?.length) {
    document.getElementById('block-examples').classList.remove('hidden');
    item.examples.slice(0, 3).forEach(ex => {
      const div = document.createElement('div');
      div.className = 'touch-list-item';
      const text = typeof ex === 'string' ? ex : ex.en;
      div.innerHTML = `"${text}"`;
      exBox.appendChild(div);
    });
  } else {
    document.getElementById('block-examples').classList.add('hidden');
  }

  if (state.settings.autoSpeech) playAudio(item.word, 'us');
}

// ==========================================
// 3. SỔ TỪ VỰNG TRÊN IPAD
// ==========================================
async function loadVocab() {
  const data = await StorageAdapter.get(['vocab_list', 'settings']);
  state.vocabList = data.vocab_list || [];
  if (data.settings) state.settings = { ...state.settings, ...data.settings };
  updateNavBadge();
}

function updateNavBadge() {
  const b = document.getElementById('nav-count');
  if (b) b.textContent = state.vocabList.length;
}

async function saveWord(item) {
  const exists = state.vocabList.some(w => w.word.toLowerCase() === item.word.toLowerCase());
  if (exists) return alert(`Từ "${item.word}" đã có trong sổ từ của bạn!`);

  const entry = {
    id: Date.now().toString(),
    word: item.word,
    pos: item.pos || 'noun',
    meaning_vi: item.meaning_vi || '',
    ipa: item.ipa_uk || item.ipa_us || '',
    cefr: item.cefr_level || 'B2',
    example: item.examples?.[0] || '',
    status: 'new',
    created_at: new Date().toISOString()
  };

  state.vocabList.unshift(entry);
  await StorageAdapter.set({ vocab_list: state.vocabList });
  updateNavBadge();
  alert(`✓ Đã lưu "${item.word}" vào sổ từ vựng iPad!`);
}

function renderLibrary() {
  const grid = document.getElementById('lib-grid');
  const empty = document.getElementById('lib-empty');
  const query = (document.getElementById('lib-search')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('lib-status-filter')?.value || 'all';

  const filtered = state.vocabList.filter(w => {
    const matchQ = !query || w.word.toLowerCase().includes(query) || w.meaning_vi.toLowerCase().includes(query);
    const matchS = filter === 'all' || w.status === filter;
    return matchQ && matchS;
  });

  if (!filtered.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  grid.innerHTML = '';

  filtered.forEach(w => {
    const card = document.createElement('div');
    card.className = 'touch-list-item';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.innerHTML = `
      <div>
        <div style="font-size: 16px; font-weight: 700;">${w.word} <span style="font-size: 12px; color: var(--apple-blue); font-weight: 500;">(${w.pos})</span></div>
        <div style="font-size: 13.5px; color: var(--text-sub); margin-top: 2px;">${w.meaning_vi}</div>
        <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${w.ipa}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-touch-audio" data-w="${w.word}">🔊</button>
        <button class="btn-touch-clear" data-del="${w.id}" style="color: var(--danger);">🗑️</button>
      </div>
    `;

    card.querySelector('[data-w]')?.addEventListener('click', () => playAudio(w.word, 'us'));
    card.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (confirm(`Xóa từ "${w.word}"?`)) {
        state.vocabList = state.vocabList.filter(item => item.id !== w.id);
        await StorageAdapter.set({ vocab_list: state.vocabList });
        updateNavBadge();
        renderLibrary();
      }
    });

    grid.appendChild(card);
  });
}

function initLibEvents() {
  document.getElementById('lib-search')?.addEventListener('input', renderLibrary);
  document.getElementById('lib-status-filter')?.addEventListener('change', renderLibrary);

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    if (!state.vocabList.length) return alert('Chưa có từ để xuất!');
    let csv = 'Word,POS,IPA,Meaning,Date\n';
    state.vocabList.forEach(w => {
      csv += `"${w.word}","${w.pos}","${w.ipa}","${w.meaning_vi}","${w.created_at}"\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VocabMaster_iPad_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (confirm('Cảnh báo: Thao tác này sẽ xóa toàn bộ từ vựng đã lưu trên iPad!')) {
      state.vocabList = [];
      await StorageAdapter.set({ vocab_list: [] });
      updateNavBadge();
      renderLibrary();
    }
  });
}

// ==========================================
// 4. FLASHCARDS VUỐT CHẠM CẢM ỨNG (TOUCH GESTURES)
// ==========================================
function renderFlashcard() {
  const card = document.getElementById('fc-touch-card');
  card?.classList.remove('flipped');

  if (!state.vocabList.length) {
    document.getElementById('fc-word').textContent = 'Chưa có từ vựng';
    document.getElementById('fc-ipa').textContent = 'Hãy lưu từ để bắt đầu';
    document.getElementById('fc-meaning').textContent = 'Chạm tab "Tra từ"';
    document.getElementById('fc-counter').textContent = '0 / 0';
    return;
  }

  if (state.fcIndex >= state.vocabList.length) state.fcIndex = 0;
  if (state.fcIndex < 0) state.fcIndex = state.vocabList.length - 1;

  const w = state.vocabList[state.fcIndex];
  document.getElementById('fc-word').textContent = w.word;
  document.getElementById('fc-ipa').textContent = w.ipa || '';
  document.getElementById('fc-pos').textContent = w.pos || 'noun';
  document.getElementById('fc-meaning').textContent = w.meaning_vi || '';
  document.getElementById('fc-ex').textContent = typeof w.example === 'string' ? w.example : w.example?.en || '';
  document.getElementById('fc-counter').textContent = `${state.fcIndex + 1} / ${state.vocabList.length}`;
}

function initFlashcardGestures() {
  const card = document.getElementById('fc-touch-card');

  // Lật thẻ khi chạm (Tap)
  card?.addEventListener('click', () => card.classList.toggle('flipped'));

  // Cử chỉ vuốt chạm (Touch Swipe)
  let touchStartX = 0;
  let touchStartY = 0;

  card?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  card?.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // Nếu vuốt ngang nhiều hơn vuốt dọc và độ dài vuốt > 50px
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        // Vuốt sang trái -> Thẻ tiếp theo
        state.fcIndex++;
        renderFlashcard();
      } else {
        // Vuốt sang phải -> Thẻ trước
        state.fcIndex--;
        renderFlashcard();
      }
    }
  }, { passive: true });

  document.getElementById('fc-btn-next')?.addEventListener('click', () => {
    state.fcIndex++;
    renderFlashcard();
  });
  document.getElementById('fc-btn-prev')?.addEventListener('click', () => {
    state.fcIndex--;
    renderFlashcard();
  });
  document.getElementById('fc-audio')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.vocabList[state.fcIndex]) playAudio(state.vocabList[state.fcIndex].word, 'us');
  });
  document.getElementById('fc-btn-learned')?.addEventListener('click', async () => {
    if (state.vocabList[state.fcIndex]) {
      state.vocabList[state.fcIndex].status = 'learned';
      await StorageAdapter.set({ vocab_list: state.vocabList });
      state.fcIndex++;
      renderFlashcard();
    }
  });
}

// ==========================================
// 5. QUIZ
// ==========================================
function startQuizRound() {
  const grid = document.getElementById('quiz-opts');
  const msg = document.getElementById('quiz-msg');
  const btnNext = document.getElementById('quiz-next-btn');

  msg?.classList.add('hidden');
  btnNext?.classList.add('hidden');
  grid.innerHTML = '';

  if (state.vocabList.length < 4) {
    grid.innerHTML = '<p style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 20px;">Lưu ít nhất 4 từ vựng để kích hoạt bài trắc nghiệm!</p>';
    document.getElementById('quiz-word').textContent = '...';
    return;
  }

  const target = state.vocabList[Math.floor(Math.random() * state.vocabList.length)];
  state.currentQuizWord = target;
  document.getElementById('quiz-word').textContent = target.word;

  const others = state.vocabList.filter(w => w.id !== target.id).map(w => w.meaning_vi);
  const choices = [target.meaning_vi, ...others.sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());

  choices.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'quiz-touch-btn';
    btn.textContent = ch;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.quiz-touch-btn').forEach(b => b.disabled = true);
      if (ch === target.meaning_vi) {
        btn.classList.add('correct');
        msg.textContent = '✓ Chuẩn xác!';
        msg.style.color = 'var(--success)';
        state.quizScore += 10;
      } else {
        btn.classList.add('wrong');
        msg.textContent = `✕ Nghĩa đúng là: ${target.meaning_vi}`;
        msg.style.color = 'var(--danger)';
        grid.querySelectorAll('.quiz-touch-btn').forEach(b => {
          if (b.textContent === target.meaning_vi) b.classList.add('correct');
        });
      }
      document.getElementById('quiz-points').textContent = `Điểm: ${state.quizScore}`;
      msg.classList.remove('hidden');
      btnNext.classList.remove('hidden');
    });
    grid.appendChild(btn);
  });
}

function initQuizEvents() {
  document.getElementById('quiz-next-btn')?.addEventListener('click', startQuizRound);
  document.getElementById('quiz-audio')?.addEventListener('click', () => {
    if (state.currentQuizWord) playAudio(state.currentQuizWord.word, 'us');
  });
}

// ==========================================
// 6. TYPING
// ==========================================
function startTypingRound() {
  const input = document.getElementById('typing-input');
  const msg = document.getElementById('typing-msg');
  msg?.classList.add('hidden');
  input.value = '';

  if (!state.vocabList.length) {
    document.getElementById('typing-hint').textContent = 'Chưa có từ vựng trong máy';
    return;
  }

  const target = state.vocabList[Math.floor(Math.random() * state.vocabList.length)];
  state.currentTypingWord = target;
  document.getElementById('typing-hint').textContent = target.meaning_vi;

  if (state.settings.autoSpeech) playAudio(target.word, 'us');
}

function initTypingEvents() {
  const input = document.getElementById('typing-input');
  const btn = document.getElementById('typing-submit');
  const msg = document.getElementById('typing-msg');

  const check = () => {
    if (!state.currentTypingWord) return;
    const val = input.value.trim().toLowerCase();
    const target = state.currentTypingWord.word.trim().toLowerCase();

    if (val === target) {
      msg.textContent = `✓ Chính xác! "${target}"`;
      msg.style.color = 'var(--success)';
      state.typingStreak++;
      setTimeout(startTypingRound, 1200);
    } else {
      msg.textContent = `✕ Chưa đúng! Từ cần gõ là: "${target}"`;
      msg.style.color = 'var(--danger)';
      state.typingStreak = 0;
    }
    document.getElementById('typing-counter').textContent = `Chuỗi đúng: ${state.typingStreak}`;
    msg.classList.remove('hidden');
  };

  btn?.addEventListener('click', check);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
  });
  document.getElementById('typing-audio')?.addEventListener('click', () => {
    if (state.currentTypingWord) playAudio(state.currentTypingWord.word, 'us');
  });
}

// ==========================================
// 7. CÀI ĐẶT
// ==========================================
function initSettings() {
  const prov = document.getElementById('set-provider');
  const gemini = document.getElementById('set-gemini-key');
  const groq = document.getElementById('set-groq-key');
  const speech = document.getElementById('set-auto-speech');
  const btn = document.getElementById('btn-save-settings');
  const ok = document.getElementById('save-success-msg');

  if (state.settings.aiProvider) prov.value = state.settings.aiProvider;
  if (state.settings.geminiApiKey) gemini.value = state.settings.geminiApiKey;
  if (state.settings.groqApiKey) groq.value = state.settings.groqApiKey;
  speech.checked = !!state.settings.autoSpeech;

  btn?.addEventListener('click', async () => {
    state.settings = {
      aiProvider: prov.value,
      geminiApiKey: gemini.value.trim(),
      groqApiKey: groq.value.trim(),
      autoSpeech: speech.checked
    };
    await StorageAdapter.set({ settings: state.settings });
    ok?.classList.remove('hidden');
    setTimeout(() => ok?.classList.add('hidden'), 2500);
  });
}

// ==========================================
// 8. AUDIO SPEECH
// ==========================================
function playAudio(word, accent = 'us') {
  if (!word) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
}

// KHỞI CHẠY
window.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initLookup();
  initLibEvents();
  initFlashcardGestures();
  initQuizEvents();
  initTypingEvents();
  initSettings();

  await loadVocab();
});
