// d:/extension/settings/settings.js

let selectedProvider = 'gemini';

async function init() {
  // Restore saved settings
  const { aiProvider = 'gemini', apiKeys = {} } =
    await chrome.storage.sync.get(['aiProvider', 'apiKeys']);
  selectedProvider = aiProvider;
  selectProvider(selectedProvider);

  document.getElementById('key-gemini').value = apiKeys.gemini || '';
  document.getElementById('key-groq').value = apiKeys.groq || '';
  document.getElementById('key-openai').value = apiKeys.openai || '';
  document.getElementById('key-claude').value = apiKeys.claude || '';

  await loadStats();
  await restoreSheets();

  // Provider card selection
  document.querySelectorAll('.provider-card').forEach(card => {
    card.addEventListener('click', () => selectProvider(card.dataset.p));
  });

  // Toggle password visibility
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.t);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈 Ẩn' : '👁 Hiện';
    });
  });

  // Save AI settings
  document.getElementById('btn-save-ai').addEventListener('click', saveAI);
  document.getElementById('btn-test-ai')?.addEventListener('click', testAIConnection);

  // Export/Import
  document.getElementById('btn-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-excel').addEventListener('click', exportExcel);
  document.getElementById('btn-import').addEventListener('click', () =>
    document.getElementById('import-file').click()
  );
  document.getElementById('import-file').addEventListener('change', importCSV);

  // Display redirect URI and setup copy button
  const redirectUri = chrome.identity?.getRedirectURL ? chrome.identity.getRedirectURL() : '';
  const redirectEl = document.getElementById('redirect-uri-val');
  if (redirectEl && redirectUri) {
    redirectEl.textContent = redirectUri;
  }
  const copyBtn = document.getElementById('btn-copy-uri');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const uri = document.getElementById('redirect-uri-val')?.textContent;
      if (uri) {
        try {
          await navigator.clipboard.writeText(uri);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = uri;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        copyBtn.textContent = '✅ Đã copy!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
      }
    });
  }

  const sheetsClientIdInput = document.getElementById('sheets-client-id');
  if (sheetsClientIdInput) {
    sheetsClientIdInput.addEventListener('input', () => {
      chrome.storage.sync.set({ oauthClientId: sheetsClientIdInput.value.trim() });
    });
  }

  // Google Sheets
  document.getElementById('btn-connect-sheets').addEventListener('click', connectSheets);
  document.getElementById('btn-sync').addEventListener('click', syncSheets);

  // Clear all
  document.getElementById('btn-clear').addEventListener('click', async () => {
    if (!confirm('⚠️ Xóa TOÀN BỘ từ vựng? Thao tác này không thể hoàn tác!')) return;
    await chrome.storage.local.set({ vocabulary: [] });
    await loadStats();
    showMsg('msg-export', '✅ Đã xóa toàn bộ từ vựng', 'ok');
  });
}

function selectProvider(p) {
  selectedProvider = p;
  document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.api-grp').forEach(g => g.classList.remove('active'));
  document.getElementById('card-' + p)?.classList.add('selected');
  document.getElementById('api-' + p)?.classList.add('active');
}

async function saveAI() {
  const apiKeys = {
    gemini: document.getElementById('key-gemini')?.value.trim() || '',
    groq: document.getElementById('key-groq')?.value.trim() || '',
    openai: document.getElementById('key-openai')?.value.trim() || '',
    claude: document.getElementById('key-claude')?.value.trim() || '',
  };
  const apiKey = apiKeys[selectedProvider];
  if (!apiKey) {
    showMsg('msg-ai', `❌ Vui lòng nhập API key cho ${selectedProvider}`, 'err');
    return;
  }
  await chrome.storage.sync.set({ aiProvider: selectedProvider, apiKey, apiKeys });
  showMsg('msg-ai', '✅ Đã lưu! Bôi đen văn bản tiếng Anh để bắt đầu dịch.', 'ok');
}

async function testAIConnection() {
  const btn = document.getElementById('btn-test-ai');
  const apiKeys = {
    gemini: document.getElementById('key-gemini')?.value.trim() || '',
    groq: document.getElementById('key-groq')?.value.trim() || '',
    openai: document.getElementById('key-openai')?.value.trim() || '',
    claude: document.getElementById('key-claude')?.value.trim() || '',
  };
  const apiKey = apiKeys[selectedProvider];
  if (!apiKey) {
    showMsg('msg-ai', `❌ Vui lòng nhập API key cho ${selectedProvider} trước khi kiểm tra`, 'err');
    return;
  }

  btn.textContent = '⏳ Đang kiểm tra...';
  btn.disabled = true;

  // Save first
  await chrome.storage.sync.set({ aiProvider: selectedProvider, apiKey, apiKeys });

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text: 'welcome',
      isWord: true
    });

    if (response?.success && response.data) {
      const def = response.data.word?.definition_vi || 'thành công';
      showMsg('msg-ai', `✅ Kết nối AI (${selectedProvider}) thành công! Dịch thử từ "welcome": "${def}"`, 'ok');
    } else {
      showMsg('msg-ai', `❌ Lỗi kết nối: ${response?.error || 'Không nhận được phản hồi'}`, 'err');
    }
  } catch (err) {
    showMsg('msg-ai', `❌ Lỗi: ${err.message}`, 'err');
  } finally {
    btn.textContent = '🧪 Kiểm tra kết nối AI';
    btn.disabled = false;
  }
}

async function loadStats() {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');
  document.getElementById('s-total').textContent = vocabulary.length;
  document.getElementById('s-new').textContent = vocabulary.filter(w => w.status === 'new').length;
  document.getElementById('s-learning').textContent = vocabulary.filter(w => w.status === 'learning').length;
  document.getElementById('s-learned').textContent = vocabulary.filter(w => w.status === 'learned').length;
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg msg-' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

async function exportCSV() {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');
  if (!vocabulary.length) {
    showMsg('msg-export', '⚠️ Chưa có từ nào để xuất', 'err');
    return;
  }
  const headers = ['Từ','IPA','Từ loại','Định nghĩa VI','Định nghĩa EN','Ví dụ','Đồng nghĩa','Trái nghĩa','Level','Trạng thái','Nguồn gốc từ','Ngày thêm'];
  const rows = vocabulary.map(w => [
    w.word, w.ipa, w.partOfSpeech,
    w.definition_vi, w.definition_en,
    (w.examples || []).join(' | '),
    (w.synonyms || []).join(', '),
    (w.antonyms || []).join(', '),
    w.level, w.status, w.etymology || '',
    new Date(w.addedAt).toLocaleDateString('vi-VN')
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  // BOM for proper UTF-8 in Excel
  downloadBlob(new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' }), 'VocabMaster.csv');
  showMsg('msg-export', `✅ Đã xuất ${vocabulary.length} từ ra file CSV`, 'ok');
}

async function exportExcel() {
  const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');
  if (!vocabulary.length) {
    showMsg('msg-export', '⚠️ Chưa có từ nào để xuất', 'err');
    return;
  }
  showMsg('msg-export', '⏳ Đang tạo file Excel...', 'ok');

  // Load SheetJS dynamically
  if (!window.XLSX) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('lib/xlsx.min.js');
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch {
      showMsg('msg-export', '❌ Không tải được SheetJS. Thử xuất CSV thay thế.', 'err');
      return;
    }
  }

  const wsData = [
    ['Từ','IPA','Từ loại','Định nghĩa VI','Định nghĩa EN','Ví dụ','Đồng nghĩa','Level','Trạng thái','Lần ôn','Độ chính xác','Ngày thêm'],
    ...vocabulary.map(w => [
      w.word, w.ipa, w.partOfSpeech,
      w.definition_vi, w.definition_en,
      (w.examples || []).join('\n'),
      (w.synonyms || []).join(', '),
      w.level, w.status,
      w.reviewCount || 0,
      w.reviewCount > 0 ? Math.round((w.correctCount / w.reviewCount) * 100) + '%' : '0%',
      new Date(w.addedAt).toLocaleDateString('vi-VN')
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [14, 12, 10, 40, 40, 50, 20, 6, 10, 6, 8, 12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Từ vựng');

  // Stats sheet
  const stats = [
    ['Thống kê', ''],
    ['Tổng từ', vocabulary.length],
    ['Từ mới', vocabulary.filter(w => w.status === 'new').length],
    ['Đang học', vocabulary.filter(w => w.status === 'learning').length],
    ['Đã thuộc', vocabulary.filter(w => w.status === 'learned').length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stats), 'Thống kê');

  XLSX.writeFile(wb, 'VocabMaster.xlsx');
  showMsg('msg-export', `✅ Đã xuất ${vocabulary.length} từ ra file Excel`, 'ok');
}

async function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const lines = text.replace(/\r/g, '').split('\n').slice(1); // Skip header

    const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');
    let added = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      // Parse CSV properly (handle quoted fields)
      const cols = parseCSVLine(line);
      if (!cols[0]) continue;
      // Skip duplicates
      if (vocabulary.find(w => w.word.toLowerCase() === cols[0].toLowerCase())) continue;

      vocabulary.push({
        id: Date.now() + added,
        word: cols[0] || '',
        ipa: cols[1] || '',
        partOfSpeech: cols[2] || '',
        definition_vi: cols[3] || '',
        definition_en: cols[4] || '',
        examples: (cols[5] || '').split(' | ').filter(Boolean),
        synonyms: (cols[6] || '').split(', ').filter(Boolean),
        antonyms: (cols[7] || '').split(', ').filter(Boolean),
        level: cols[8] || '',
        status: cols[9] || 'new',
        etymology: cols[10] || '',
        addedAt: Date.now(),
        lastReviewed: 0,
        reviewCount: 0,
        correctCount: 0,
        sourceUrl: '',
      });
      added++;
    }

    await chrome.storage.local.set({ vocabulary });
    await loadStats();
    showMsg('msg-export', `✅ Đã nhập ${added} từ mới (bỏ qua ${lines.length - added - 1} trùng lặp)`, 'ok');
  } catch (err) {
    showMsg('msg-export', `❌ Lỗi đọc file: ${err.message}`, 'err');
  }
  e.target.value = ''; // Reset file input
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function restoreSheets() {
  const { sheetsId, sheetsConnected, oauthClientId = '' } =
    await chrome.storage.sync.get(['sheetsId', 'sheetsConnected', 'oauthClientId']);

  // Populate client ID field
  const cid = document.getElementById('sheets-client-id');
  if (cid) cid.value = oauthClientId;

  if (sheetsConnected && sheetsId) {
    document.getElementById('sheets-info').innerHTML =
      `✅ Đã kết nối Sheet: <a href="https://docs.google.com/spreadsheets/d/${sheetsId}" target="_blank" style="color:#89b4fa">Mở Sheet →</a>`;
    document.getElementById('btn-sync').style.display = 'inline-flex';
    document.getElementById('btn-connect-sheets').textContent = '🔄 Kết nối lại';
  }
}

async function getClientId() {
  const inputEl = document.getElementById('sheets-client-id');
  const inputVal = inputEl ? inputEl.value.trim() : '';
  if (inputVal) {
    await chrome.storage.sync.set({ oauthClientId: inputVal });
    return inputVal;
  }
  const { oauthClientId = '' } = await chrome.storage.sync.get('oauthClientId');
  return oauthClientId;
}

async function getAccessToken() {
  const clientId = await getClientId();
  if (!clientId) {
    throw new Error('Chưa nhập OAuth Client ID. Xem hướng dẫn bên dưới.');
  }

  const redirectUri = chrome.identity.getRedirectURL();

  // Show redirect URI in UI so user can verify it's registered
  const redirectEl = document.getElementById('redirect-uri-val');
  if (redirectEl) redirectEl.textContent = redirectUri;
  document.getElementById('redirect-uri-row')?.style.setProperty('display', 'block');

  const scope = 'https://www.googleapis.com/auth/spreadsheets';
  const authUrl =
    `https://accounts.google.com/o/oauth2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message || '';
          // Provide clear guidance for common errors
          if (msg.includes('redirect_uri_mismatch') || msg.includes('invalid_request')) {
            return reject(new Error(
              `Lỗi redirect_uri_mismatch!\n\n` +
              `Bạn cần thêm URI này vào Google Cloud Console:\n` +
              redirectUri + `\n\n` +
              `Hướng dẫn:\n` +
              `1. Vào console.cloud.google.com → APIs & Services → Credentials\n` +
              `2. Click vào OAuth Client ID của bạn\n` +
              `3. Phần "Authorized redirect URIs" → Add URI:\n` +
              `   ${redirectUri}\n` +
              `4. Lưu lại và thử kết nối lại`
            ));
          }
          return reject(new Error(msg || 'Lỗi xác thực OAuth'));
        }
        try {
          const urlObj = new URL(responseUrl);
          const hash = urlObj.hash.substring(1);
          const params = new URLSearchParams(hash || urlObj.search);
          const errCode = params.get('error');
          if (errCode === 'access_denied') {
            return reject(new Error(
              'Lỗi Access Blocked (Error 403: access_denied)!\n\n' +
              'Tài khoản Google của bạn chưa được thêm vào danh sách Test Users.\n\n' +
              'Cách khắc phục:\n' +
              '1. Mở console.cloud.google.com/apis/credentials/consent\n' +
              '2. Kéo xuống mục "Test users" (Người dùng thử nghiệm)\n' +
              '3. Bấm "+ ADD USERS" và nhập email Google của bạn\n' +
              '4. Bấm "Save" và bấm "Kết nối Google Sheets" lại.'
            ));
          }
          const token = params.get('access_token');
          if (!token) reject(new Error('Không lấy được access token từ Google: ' + (errCode || 'Unknown error')));
          else resolve(token);
        } catch (e) {
          reject(new Error('Lỗi parse OAuth response: ' + e.message));
        }
      }
    );
  });
}

async function connectSheets() {
  const btn = document.getElementById('btn-connect-sheets');
  const info = document.getElementById('sheets-info');
  btn.textContent = '⏳ Đang xác thực...';
  btn.disabled = true;

  try {
    const token = await getAccessToken();
    // Create a new Google Sheet
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: 'VocabMaster — Từ vựng tiếng Anh' },
        sheets: [
          { properties: { title: 'Từ vựng', sheetId: 0 } },
          { properties: { title: 'Thống kê', sheetId: 1 } }
        ]
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Sheets API lỗi ${res.status}: ${errData.error?.message || ''}`);
    }
    const sheet = await res.json();
    const id = sheet.spreadsheetId;

    // Cache token for sync (expires ~1hr but we'll re-auth on next connect)
    await chrome.storage.sync.set({ sheetsId: id, sheetsConnected: true, sheetsToken: token });
    info.innerHTML = `✅ Đã tạo Sheet: <a href="https://docs.google.com/spreadsheets/d/${id}" target="_blank" style="color:#89b4fa">Mở Sheet →</a>`;
    document.getElementById('btn-sync').style.display = 'inline-flex';
    btn.textContent = '✅ Đã kết nối';
    btn.disabled = false;

    showMsg('msg-sheets', '✅ Kết nối thành công! Nhấn "Đồng bộ ngay" để upload dữ liệu.', 'ok');
  } catch (err) {
    info.textContent = '';
    btn.textContent = '🔗 Kết nối Google Sheets';
    btn.disabled = false;
    showMsg('msg-sheets', '❌ ' + err.message, 'err');
  }
}

async function syncSheets() {
  const btn = document.getElementById('btn-sync');
  const info = document.getElementById('sheets-info');
  btn.textContent = '⏳ Đang đồng bộ...';
  btn.disabled = true;

  try {
    const { sheetsId, sheetsToken } = await chrome.storage.sync.get(['sheetsId', 'sheetsToken']);
    if (!sheetsId) throw new Error('Chưa kết nối Sheet. Nhấn "Kết nối Google Sheets" trước.');

    const { vocabulary = [] } = await chrome.storage.local.get('vocabulary');

    // Try cached token first; if expired re-auth
    let token = sheetsToken;
    if (!token) token = await getAccessToken();

    const values = [
      ['Từ','IPA','Từ loại','Định nghĩa VI','Level','Trạng thái','Lần ôn','Độ chính xác','Ngày thêm','URL nguồn'],
      ...vocabulary.map(w => [
        w.word, w.ipa, w.partOfSpeech, w.definition_vi, w.level, w.status,
        w.reviewCount || 0,
        w.reviewCount > 0 ? Math.round(w.correctCount / w.reviewCount * 100) + '%' : '0%',
        new Date(w.addedAt).toLocaleDateString('vi-VN'),
        w.sourceUrl || ''
      ])
    ];

    const putRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/Từ vựng!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: 'Từ vựng!A1', majorDimension: 'ROWS', values })
      }
    );

    // If 401, token expired — re-auth
    if (putRes.status === 401) {
      token = await getAccessToken();
      await chrome.storage.sync.set({ sheetsToken: token });
      // Retry
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/Từ vựng!A1?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ range: 'Từ vựng!A1', majorDimension: 'ROWS', values })
        }
      );
    } else if (!putRes.ok) {
      throw new Error(`Sync lỗi: ${putRes.status}`);
    }

    const now = new Date().toLocaleTimeString('vi-VN');
    const baseInfo = info.innerHTML.split('·')[0].trim();
    info.innerHTML = baseInfo + ` · Đồng bộ lúc ${now} (${vocabulary.length} từ)`;
    btn.textContent = '✅ Đã đồng bộ';
    setTimeout(() => { btn.textContent = '🔄 Đồng bộ ngay'; btn.disabled = false; }, 2000);
  } catch (err) {
    showMsg('msg-sheets', '❌ ' + err.message, 'err');
    btn.textContent = '🔄 Đồng bộ ngay';
    btn.disabled = false;
  }
}

init();

