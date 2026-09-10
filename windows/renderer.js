// renderer.js - Logic điều khiển cho Ứng dụng Windows Desktop
import { resolveDictionaryWord } from '../utils/dict-resolver.js';
import { StorageAdapter } from './storage-adapter.js';

// Khởi tạo state toàn cục
const state = {
  currentWordData: null,
  vocabList: [],
  settings: {
    aiProvider: 'gemini',
    geminiApiKey: '',
    groqApiKey: '',
    deepseekApiKey: '',
    autoSpeech: true
  },
  fcIndex: 0,
  quizScore: 0,
  currentQuizWord: null,
  typingStreak: 0,
  currentTypingWord: null
};

// ==========================================
// 1. CHUYỂN TAB & GIAO DIỆN
// ==========================================
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.tab;
      switchTab(tabName);
    });
  });

  // Dark/Light theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');
    themeToggle.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.tab === tabName));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${tabName}`));

  if (tabName === 'library') renderLibrary();
  if (tabName === 'flashcard') renderFlashcard();
  if (tabName === 'quiz') startQuizRound();
  if (tabName === 'typing') startTypingRound();
  if (tabName === 'stats') renderStats();
}

// ==========================================
// 2. TÍNH NĂNG TRA TỪ NHANH (LOOKUP)
// ==========================================
function initLookup() {
  const input = document.getElementById('lookup-input');
  const btnSearch = document.getElementById('btn-do-search');
  const btnClear = document.getElementById('btn-clear-search');

  const executeSearch = async () => {
    const text = input.value.trim();
    if (!text) return;

    showLookupLoading(true);

    try {
      const res = await resolveDictionaryWord(text);
      if (res?.word) {
        state.currentWordData = res.word;
        renderLookupResult(res.word, res.source);
      } else {
        alert(`Không tìm thấy dữ liệu từ điển cho: "${text}"`);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tra cứu từ điển: ' + err.message);
    } finally {
      showLookupLoading(false);
    }
  };

  btnSearch?.addEventListener('click', executeSearch);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeSearch();
  });

  btnClear?.addEventListener('click', () => {
    input.value = '';
    input.focus();
  });

  // Nút Lưu từ
  document.getElementById('btn-save-vocab')?.addEventListener('click', () => {
    if (state.currentWordData) saveWordToLibrary(state.currentWordData);
  });

  // Audio Buttons
  document.getElementById('btn-audio-uk')?.addEventListener('click', () => playAudio(state.currentWordData?.word, 'uk'));
  document.getElementById('btn-audio-us')?.addEventListener('click', () => playAudio(state.currentWordData?.word, 'us'));
}

function showLookupLoading(loading) {
  document.getElementById('lookup-loading')?.classList.toggle('hidden', !loading);
  if (loading) {
    document.getElementById('lookup-result')?.classList.add('hidden');
    document.getElementById('lookup-empty')?.classList.add('hidden');
  }
}

function renderLookupResult(item, source) {
  document.getElementById('lookup-empty')?.classList.add('hidden');
  const card = document.getElementById('lookup-result');
  card?.classList.remove('hidden');

  // Thông tin tiêu đề
  document.getElementById('res-word').textContent = item.word || '';
  document.getElementById('res-pos').textContent = item.pos || 'noun';
  document.getElementById('res-cefr').textContent = item.cefr_level || 'B2';
  document.getElementById('res-source').textContent = source === 'cambridge' ? '📖 Cambridge' : '📖 Từ điển chuẩn';

  // Phiên âm IPA
  document.getElementById('res-ipa-uk').textContent = item.ipa_uk || item.ipa_us || '';
  document.getElementById('res-ipa-us').textContent = item.ipa_us || item.ipa_uk || '';

  // Nghĩa tiếng Việt & Định nghĩa
  document.getElementById('res-meaning-vi').textContent = item.meaning_vi || '';
  document.getElementById('res-def-vi').textContent = item.definition_vi || item.meaning_vi || '';
  document.getElementById('res-def-en').textContent = item.definition_en || '';

  // Đồng nghĩa (Synonyms)
  const synContainer = document.getElementById('res-synonyms');
  synContainer.innerHTML = '';
  if (item.synonyms?.length) {
    document.getElementById('section-synonyms').classList.remove('hidden');
    item.synonyms.slice(0, 6).forEach(s => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = s;
      chip.addEventListener('click', () => {
        document.getElementById('lookup-input').value = s;
        document.getElementById('btn-do-search').click();
      });
      synContainer.appendChild(chip);
    });
  } else {
    document.getElementById('section-synonyms').classList.add('hidden');
  }

  // Collocations
  const colContainer = document.getElementById('res-collocations');
  colContainer.innerHTML = '';
  if (item.collocations?.length) {
    document.getElementById('section-collocations').classList.remove('hidden');
    item.collocations.slice(0, 4).forEach(c => {
      const el = document.createElement('div');
      el.className = 'collocation-item';
      el.innerHTML = `<div class="collocation-en">${c.collocation}</div><div class="collocation-vi">${c.meaning_vi}</div>`;
      colContainer.appendChild(el);
    });
  } else {
    document.getElementById('section-collocations').classList.add('hidden');
  }

  // Word Family
  const famContainer = document.getElementById('res-family');
  famContainer.innerHTML = '';
  if (item.word_family?.length) {
    document.getElementById('section-family').classList.remove('hidden');
    item.word_family.slice(0, 4).forEach(f => {
      const el = document.createElement('div');
      el.className = 'family-item';
      el.innerHTML = `<strong>${f.pos}</strong> <code>${f.word}</code>: <span>${f.meaning_vi}</span>`;
      famContainer.appendChild(el);
    });
  } else {
    document.getElementById('section-family').classList.add('hidden');
  }

  // Ví dụ minh họa (Examples)
  const exContainer = document.getElementById('res-examples');
  exContainer.innerHTML = '';
  if (item.examples?.length) {
    document.getElementById('section-examples').classList.remove('hidden');
    item.examples.slice(0, 3).forEach(ex => {
      const el = document.createElement('div');
      el.className = 'example-item';
      if (typeof ex === 'string') {
        el.innerHTML = `<div class="example-en">"${ex}"</div>`;
      } else {
        el.innerHTML = `<div class="example-en">"${ex.en}"</div><div class="example-vi">${ex.vi}</div>`;
      }
      exContainer.appendChild(el);
    });
  } else {
    document.getElementById('section-examples').classList.add('hidden');
  }

  // Tự động phát âm nếu bật trong cài đặt
  if (state.settings.autoSpeech) {
    playAudio(item.word, 'us');
  }
}

// ==========================================
// 3. SỔ TỪ VỰNG (VOCABULARY LIBRARY)
// ==========================================
async function loadVocabList() {
  const data = await StorageAdapter.get(['vocab_list', 'settings']);
  state.vocabList = data.vocab_list || [];
  if (data.settings) state.settings = { ...state.settings, ...data.settings };
  updateSidebarCount();
}

function updateSidebarCount() {
  const countEl = document.getElementById('sidebar-word-count');
  if (countEl) countEl.textContent = state.vocabList.length;
}

async function saveWordToLibrary(wordData) {
  const existing = state.vocabList.find(w => w.word.toLowerCase() === wordData.word.toLowerCase());
  if (existing) {
    alert(`Từ "${wordData.word}" đã có sẵn trong sổ từ vựng của bạn!`);
    return;
  }

  const newEntry = {
    id: Date.now().toString(),
    word: wordData.word,
    pos: wordData.pos || 'noun',
    meaning_vi: wordData.meaning_vi || '',
    ipa: wordData.ipa_uk || wordData.ipa_us || '',
    cefr: wordData.cefr_level || 'B2',
    example: wordData.examples?.[0] || '',
    status: 'new', // 'new' | 'learning' | 'learned'
    created_at: new Date().toISOString()
  };

  state.vocabList.unshift(newEntry);
  await StorageAdapter.set({ vocab_list: state.vocabList });
  updateSidebarCount();
  alert(`✓ Đã thêm "${wordData.word}" vào sổ từ vựng!`);
}

function renderLibrary() {
  const container = document.getElementById('library-container');
  const emptyEl = document.getElementById('library-empty');
  const query = (document.getElementById('lib-search')?.value || '').toLowerCase().trim();
  const filterStatus = document.getElementById('lib-filter-status')?.value || 'all';

  const filtered = state.vocabList.filter(w => {
    const matchQuery = !query || w.word.toLowerCase().includes(query) || w.meaning_vi.toLowerCase().includes(query);
    const matchStatus = filterStatus === 'all' || w.status === filterStatus;
    return matchQuery && matchStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');
  container.innerHTML = '';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.innerHTML = `
      <div class="vocab-card-header">
        <span class="vocab-card-word">${item.word}</span>
        <span class="badge badge-pos">${item.pos}</span>
      </div>
      <div class="phonetic-ipa">${item.ipa}</div>
      <div class="vocab-card-meaning">${item.meaning_vi}</div>
      <div style="display: flex; gap: 8px; margin-top: 10px; align-items: center;">
        <button class="btn-audio" data-word="${item.word}">🔊 Nghe</button>
        <select class="form-control status-selector" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px; width: auto;">
          <option value="new" ${item.status === 'new' ? 'selected' : ''}>Mới thêm</option>
          <option value="learning" ${item.status === 'learning' ? 'selected' : ''}>Đang học</option>
          <option value="learned" ${item.status === 'learned' ? 'selected' : ''}>Đã thuộc</option>
        </select>
        <button class="btn-clear btn-del-word" data-id="${item.id}" style="margin-left: auto; color: var(--danger);" title="Xóa từ">🗑️</button>
      </div>
    `;

    card.querySelector('.btn-audio')?.addEventListener('click', () => playAudio(item.word, 'us'));
    card.querySelector('.status-selector')?.addEventListener('change', async (e) => {
      item.status = e.target.value;
      await StorageAdapter.set({ vocab_list: state.vocabList });
      renderStats();
    });
    card.querySelector('.btn-del-word')?.addEventListener('click', async () => {
      if (confirm(`Bạn có chắc muốn xóa từ "${item.word}" khỏi sổ từ?`)) {
        state.vocabList = state.vocabList.filter(w => w.id !== item.id);
        await StorageAdapter.set({ vocab_list: state.vocabList });
        updateSidebarCount();
        renderLibrary();
      }
    });

    container.appendChild(card);
  });
}

function initLibraryControls() {
  document.getElementById('lib-search')?.addEventListener('input', renderLibrary);
  document.getElementById('lib-filter-status')?.addEventListener('change', renderLibrary);

  document.getElementById('btn-export-excel')?.addEventListener('click', () => {
    if (!state.vocabList.length) return alert('Chưa có từ vựng nào để xuất!');
    let csv = 'Word,POS,IPA,Meaning,Example,Status,Date\n';
    state.vocabList.forEach(w => {
      const ex = (typeof w.example === 'string' ? w.example : w.example?.en || '').replace(/"/g, '""');
      csv += `"${w.word}","${w.pos}","${w.ipa}","${w.meaning_vi}","${ex}","${w.status}","${w.created_at}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VocabMaster_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });

  document.getElementById('btn-clear-all-words')?.addEventListener('click', async () => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ từ vựng đã lưu trong máy. Bạn có chắc không?')) {
      state.vocabList = [];
      await StorageAdapter.set({ vocab_list: [] });
      updateSidebarCount();
      renderLibrary();
    }
  });
}

// ==========================================
// 4. FLASHCARDS
// ==========================================
function renderFlashcard() {
  const card = document.getElementById('fc-card');
  card?.classList.remove('flipped');

  if (!state.vocabList.length) {
    document.getElementById('fc-word').textContent = 'Chưa có từ vựng';
    document.getElementById('fc-ipa').textContent = 'Hãy lưu từ để luyện tập';
    document.getElementById('fc-meaning').textContent = 'Nhấn tab "Tra từ nhanh" để bắt đầu';
    document.getElementById('fc-progress-text').textContent = 'Thẻ 0 / 0';
    return;
  }

  if (state.fcIndex >= state.vocabList.length) state.fcIndex = 0;
  if (state.fcIndex < 0) state.fcIndex = state.vocabList.length - 1;

  const current = state.vocabList[state.fcIndex];
  document.getElementById('fc-word').textContent = current.word;
  document.getElementById('fc-ipa').textContent = current.ipa || '';
  document.getElementById('fc-pos').textContent = current.pos || 'noun';
  document.getElementById('fc-meaning').textContent = current.meaning_vi || '';
  document.getElementById('fc-example').textContent = typeof current.example === 'string' ? current.example : current.example?.en || '';
  document.getElementById('fc-progress-text').textContent = `Thẻ ${state.fcIndex + 1} / ${state.vocabList.length}`;
}

function initFlashcardControls() {
  const card = document.getElementById('fc-card');
  card?.addEventListener('click', () => card.classList.toggle('flipped'));

  document.getElementById('fc-next')?.addEventListener('click', () => {
    state.fcIndex++;
    renderFlashcard();
  });

  document.getElementById('fc-prev')?.addEventListener('click', () => {
    state.fcIndex--;
    renderFlashcard();
  });

  document.getElementById('fc-audio-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.vocabList[state.fcIndex]) {
      playAudio(state.vocabList[state.fcIndex].word, 'us');
    }
  });

  document.getElementById('fc-mark-learned')?.addEventListener('click', async () => {
    if (state.vocabList[state.fcIndex]) {
      state.vocabList[state.fcIndex].status = 'learned';
      await StorageAdapter.set({ vocab_list: state.vocabList });
      state.fcIndex++;
      renderFlashcard();
      renderStats();
    }
  });

  window.addEventListener('keydown', (e) => {
    const isFcTab = document.getElementById('pane-flashcard')?.classList.contains('active');
    if (!isFcTab) return;
    if (e.code === 'Space') {
      e.preventDefault();
      card?.classList.toggle('flipped');
    } else if (e.key === 'ArrowRight') {
      state.fcIndex++;
      renderFlashcard();
    } else if (e.key === 'ArrowLeft') {
      state.fcIndex--;
      renderFlashcard();
    }
  });
}

// ==========================================
// 5. TRẮC NGHIỆM QUIZ
// ==========================================
function startQuizRound() {
  const optsBox = document.getElementById('quiz-options');
  const feedback = document.getElementById('quiz-feedback');
  const btnNext = document.getElementById('quiz-btn-next');

  feedback?.classList.add('hidden');
  btnNext?.classList.add('hidden');
  optsBox.innerHTML = '';

  if (state.vocabList.length < 4) {
    optsBox.innerHTML = '<p style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 30px;">Bạn cần lưu ít nhất 4 từ vựng vào sổ từ để có thể tạo bài trắc nghiệm!</p>';
    document.getElementById('quiz-word').textContent = '...';
    return;
  }

  // Chọn 1 từ ngẫu nhiên
  const targetIdx = Math.floor(Math.random() * state.vocabList.length);
  const target = state.vocabList[targetIdx];
  state.currentQuizWord = target;

  document.getElementById('quiz-word').textContent = target.word;

  // Chọn 3 phương án sai
  const otherMeanings = state.vocabList.filter(w => w.id !== target.id).map(w => w.meaning_vi);
  const shuffledOthers = otherMeanings.sort(() => 0.5 - Math.random()).slice(0, 3);
  const allChoices = [target.meaning_vi, ...shuffledOthers].sort(() => 0.5 - Math.random());

  allChoices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt-btn';
    btn.textContent = choice;
    btn.addEventListener('click', () => {
      optsBox.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
      if (choice === target.meaning_vi) {
        btn.classList.add('correct');
        feedback.textContent = '✓ Chính xác tuyệt đối!';
        feedback.className = 'quiz-feedback color-learned';
        state.quizScore += 10;
      } else {
        btn.classList.add('wrong');
        feedback.textContent = `✕ Sai rồi! Nghĩa đúng là: ${target.meaning_vi}`;
        feedback.className = 'quiz-feedback color-danger';
        // highlight đáp án đúng
        optsBox.querySelectorAll('.quiz-opt-btn').forEach(b => {
          if (b.textContent === target.meaning_vi) b.classList.add('correct');
        });
      }
      document.getElementById('quiz-score').textContent = `Điểm: ${state.quizScore}`;
      feedback.classList.remove('hidden');
      btnNext.classList.remove('hidden');
    });
    optsBox.appendChild(btn);
  });
}

function initQuizControls() {
  document.getElementById('quiz-btn-next')?.addEventListener('click', startQuizRound);
  document.getElementById('quiz-audio')?.addEventListener('click', () => {
    if (state.currentQuizWord) playAudio(state.currentQuizWord.word, 'us');
  });
}

// ==========================================
// 6. LUYỆN GÕ TYPING
// ==========================================
function startTypingRound() {
  const input = document.getElementById('typing-input');
  const feedback = document.getElementById('typing-feedback');
  feedback?.classList.add('hidden');
  input.value = '';
  input.focus();

  if (!state.vocabList.length) {
    document.getElementById('typing-meaning-hint').textContent = 'Chưa có từ vựng nào trong máy';
    return;
  }

  const target = state.vocabList[Math.floor(Math.random() * state.vocabList.length)];
  state.currentTypingWord = target;
  document.getElementById('typing-meaning-hint').textContent = target.meaning_vi;

  if (state.settings.autoSpeech) playAudio(target.word, 'us');
}

function initTypingControls() {
  const input = document.getElementById('typing-input');
  const btnCheck = document.getElementById('typing-check-btn');
  const feedback = document.getElementById('typing-feedback');
  const audioBtn = document.getElementById('typing-audio-btn');

  const checkAnswer = () => {
    if (!state.currentTypingWord) return;
    const typed = input.value.trim().toLowerCase();
    const correct = state.currentTypingWord.word.trim().toLowerCase();

    if (typed === correct) {
      feedback.textContent = `✓ Tuyệt vời! "${correct}" chính xác!`;
      feedback.className = 'typing-feedback color-learned';
      state.typingStreak++;
      setTimeout(startTypingRound, 1200);
    } else {
      feedback.textContent = `✕ Chưa đúng! Đáp án đúng: "${correct}"`;
      feedback.className = 'typing-feedback color-danger';
      state.typingStreak = 0;
    }
    document.getElementById('typing-streak').textContent = `Chuỗi đúng: ${state.typingStreak}`;
    feedback.classList.remove('hidden');
  };

  btnCheck?.addEventListener('click', checkAnswer);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAnswer();
  });
  audioBtn?.addEventListener('click', () => {
    if (state.currentTypingWord) playAudio(state.currentTypingWord.word, 'us');
  });
}

// ==========================================
// 7. THỐNG KÊ TIẾN ĐỘ
// ==========================================
function renderStats() {
  const total = state.vocabList.length;
  const countNew = state.vocabList.filter(w => w.status === 'new').length;
  const countLearning = state.vocabList.filter(w => w.status === 'learning').length;
  const countLearned = state.vocabList.filter(w => w.status === 'learned').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-new').textContent = countNew;
  document.getElementById('stat-learning').textContent = countLearning;
  document.getElementById('stat-learned').textContent = countLearned;

  const pct = total === 0 ? 0 : Math.round((countLearned / total) * 100);
  document.getElementById('stat-mastery-bar').style.width = `${pct}%`;
  document.getElementById('stat-mastery-text').textContent = `${pct}% từ vựng đã ghi nhớ vững (${countLearned}/${total} từ)`;
}

// ==========================================
// 8. CÀI ĐẶT MÔ HÌNH AI
// ==========================================
function initSettings() {
  const provider = document.getElementById('setting-ai-provider');
  const geminiKey = document.getElementById('setting-gemini-key');
  const groqKey = document.getElementById('setting-groq-key');
  const deepseekKey = document.getElementById('setting-deepseek-key');
  const autoSpeech = document.getElementById('setting-auto-speech');
  const btnSave = document.getElementById('btn-save-settings');
  const statusSaved = document.getElementById('settings-status');

  // Load ban đầu
  if (state.settings.aiProvider) provider.value = state.settings.aiProvider;
  if (state.settings.geminiApiKey) geminiKey.value = state.settings.geminiApiKey;
  if (state.settings.groqApiKey) groqKey.value = state.settings.groqApiKey;
  if (state.settings.deepseekApiKey) deepseekKey.value = state.settings.deepseekApiKey;
  autoSpeech.checked = !!state.settings.autoSpeech;

  btnSave?.addEventListener('click', async () => {
    state.settings = {
      aiProvider: provider.value,
      geminiApiKey: geminiKey.value.trim(),
      groqApiKey: groqKey.value.trim(),
      deepseekApiKey: deepseekKey.value.trim(),
      autoSpeech: autoSpeech.checked
    };
    await StorageAdapter.set({ settings: state.settings });
    statusSaved?.classList.remove('hidden');
    setTimeout(() => statusSaved?.classList.add('hidden'), 2500);
  });
}

// ==========================================
// 9. ÂM THANH PHÁT ÂM (AUDIO)
// ==========================================
function playAudio(word, accent = 'us') {
  if (!word) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

// ==========================================
// KHỞI ĐỘNG ỨNG DỤNG
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initLookup();
  initLibraryControls();
  initFlashcardControls();
  initQuizControls();
  initTypingControls();
  initSettings();

  await loadVocabList();
});
