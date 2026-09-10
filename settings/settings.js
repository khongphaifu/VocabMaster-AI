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

function escHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function testAIConnection() {
  const btn = document.getElementById('btn-test-ai');
  const diagEl = document.getElementById('diagnostic-panel');
  const apiKeys = {
    gemini: document.getElementById('key-gemini')?.value.trim() || '',
    groq: document.getElementById('key-groq')?.value.trim() || '',
    openai: document.getElementById('key-openai')?.value.trim() || '',
    claude: document.getElementById('key-claude')?.value.trim() || '',
  };
  const apiKey = apiKeys[selectedProvider];
  if (!apiKey) {
    showMsg('msg-ai', `❌ Vui lòng nhập API key cho ${selectedProvider} trước khi kiểm tra`, 'err');
    if (diagEl) diagEl.style.display = 'none';
    return;
  }

  btn.textContent = '⏳ Đang kiểm tra & chẩn đoán...';
  btn.disabled = true;

  if (diagEl) {
    diagEl.style.display = 'block';
    diagEl.innerHTML = `
      <div style="background:#1e1e2e;border:1px solid #45475a;border-radius:8px;padding:12px;font-size:12px;color:#cdd6f4;">
        ⏳ Đang kết nối trực tiếp đến <b>${selectedProvider.toUpperCase()}</b> để kiểm tra...
      </div>
    `;
  }

  // Save first
  await chrome.storage.sync.set({ aiProvider: selectedProvider, apiKey, apiKeys });

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_AI_CONNECTION',
      provider: selectedProvider,
      apiKey
    });

    if (response?.success) {
      showMsg('msg-ai', `✅ ${response.message}`, 'ok');
      if (diagEl) {
        diagEl.innerHTML = `
          <div style="background:#a6e3a118;border:1px solid #a6e3a160;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#a6e3a1;line-height:1.5;">
            <div style="font-weight:700;margin-bottom:4px;font-size:13px;">✅ Kết nối ${selectedProvider.toUpperCase()} thành công 100%!</div>
            <div style="color:#cdd6f4;font-size:12px;">Model: <b>${escHtml(response.model)}</b> · Độ trễ: <b>${response.latencyMs}ms</b></div>
            <div style="color:#bac2de;font-size:11.5px;margin-top:4px;">VocabMaster AI đã sẵn sàng hoạt động. Bạn có thể bôi đen văn bản trên web để tra cứu.</div>
          </div>
        `;
      }
    } else {
      const isBlocked = response?.reason === 'API_KEY_SERVICE_BLOCKED';
      const isDisabled = response?.reason === 'SERVICE_DISABLED';

      showMsg('msg-ai', `❌ Kết nối thất bại: ${response?.reason || response?.message || 'Lỗi không xác định'}`, 'err');

      if (diagEl) {
        let actionHtml = '';
        if (isDisabled && response?.activationUrl) {
          actionHtml = `
            <div style="margin: 10px 0;">
              <a href="${response.activationUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#89b4fa;color:#11111b;font-weight:700;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:12.5px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                👉 Bấm vào đây để BẬT API cho đúng Project này (1-Click)
              </a>
            </div>
            <div style="font-size:11.5px;color:#bac2de;line-height:1.5;margin-top:6px;background:#313244;padding:8px 10px;border-radius:6px;">
              <b>📌 Các lưu ý sống còn để kích hoạt thành công:</b><br>
              1. <b>Kiểm tra tài khoản Gmail:</b> Nếu bạn đăng nhập nhiều Gmail trên trình duyệt, khi trang Google Cloud mở ra, hãy nhìn vào <i>góc trên cùng bên phải</i> xem đã chọn đúng tài khoản đã tạo API key chưa.<br>
              2. <b>Bấm ENABLE:</b> Bấm nút "ENABLE" màu xanh trên trang đó.<br>
              3. <b>Đợi 2-3 phút:</b> Google cần 2-3 phút để phân phối quyền đến edge cache toàn cầu. Đừng vội nản lòng, đợi 2 phút rồi bấm lại nút "Kiểm tra kết nối AI"!
            </div>
          `;
        } else if (isBlocked) {
          const credUrl = response?.credentialsUrl || 'https://console.cloud.google.com/apis/credentials';
          actionHtml = `
            <div style="margin: 10px 0;">
              <a href="${credUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#f9e2af;color:#11111b;font-weight:700;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:12.5px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                👉 Mở trang Quản lý Key để Gỡ hạn chế (Don't restrict key)
              </a>
            </div>
            <div style="font-size:11.5px;color:#bac2de;line-height:1.5;margin-top:6px;background:#313244;padding:8px 10px;border-radius:6px;">
              <b>📌 Cách sửa nhanh trong 1 phút:</b><br>
              1. Bấm nút phía trên để mở danh sách Credentials trên Google Cloud.<br>
              2. Bấm vào tên API Key mà bạn đang sử dụng.<br>
              3. Cuộn xuống mục <b>API restrictions</b> (Hạn chế API) -> Chọn <b>"Don't restrict key"</b> (Không hạn chế khóa), hoặc tích chọn thêm <b>"Generative Language API"</b>.<br>
              4. Bấm <b>Save</b> (Lưu) ở cuối trang rồi thử lại sau 1 phút.
            </div>
          `;
        }

        diagEl.innerHTML = `
          <div style="background:#f38ba812;border:1px solid #f38ba850;border-radius:8px;padding:14px;font-size:12px;color:#cdd6f4;line-height:1.5;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#f38ba8;font-weight:700;font-size:13px;">❌ Chẩn đoán lỗi: ${escHtml(response?.reason || ('Mã lỗi ' + (response?.status || '500')))}</span>
              <span style="background:#f38ba830;color:#f38ba8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">HTTP ${response?.status || 500}</span>
            </div>

            ${response?.projectId ? `
              <div style="background:#313244;padding:7px 10px;border-radius:6px;font-size:12px;margin-bottom:8px;border-left:3px solid #89b4fa;">
                🏷️ <b>Mã Google Cloud Project của key:</b> <code style="color:#a6e3a1;background:#181825;padding:2px 6px;border-radius:4px;font-weight:600;">${escHtml(response.projectId)}</code>
              </div>
            ` : ''}

            <div style="color:#f2cdcd;font-size:12px;margin-bottom:8px;white-space:pre-line;">
              ${escHtml(response?.message || '')}
            </div>

            ${actionHtml}

            ${(response?.rawJson || response?.rawMsg) ? `
              <details style="margin-top:10px;border-top:1px solid #45475a;padding-top:8px;">
                <summary style="cursor:pointer;color:#89b4fa;font-size:11px;font-weight:600;">📋 Xem chi tiết phản hồi gốc từ Google (Raw JSON)</summary>
                <pre style="background:#181825;color:#cdd6f4;padding:8px;border-radius:4px;font-size:10.5px;max-height:160px;overflow:auto;margin-top:6px;white-space:pre-wrap;word-break:break-all;">${escHtml(JSON.stringify(response.rawJson || response.rawMsg, null, 2))}</pre>
              </details>
            ` : ''}

            <div style="margin-top:12px;background:#31324480;border-left:3px solid #a6e3a1;padding:8px 10px;border-radius:4px;font-size:11.5px;color:#cdd6f4;">
              💡 <b>Khuyên dùng:</b> Nếu không muốn mất thời gian cấu hình Google Cloud, bạn chỉ cần chuyển sang <b>Groq AI</b> (Lựa chọn thứ 2 phía trên). Groq miễn phí 100%, không cần Google Cloud, lấy key trong 5 giây tại <a href="https://console.groq.com/keys" target="_blank" style="color:#a6e3a1;font-weight:600;text-decoration:underline;">console.groq.com/keys</a> là dùng được ngay lập tức!
            </div>
          </div>
        `;
      }
    }
  } catch (err) {
    showMsg('msg-ai', `❌ Lỗi: ${err.message}`, 'err');
    if (diagEl) {
      diagEl.innerHTML = `<div style="background:#f38ba820;border:1px solid #f38ba8;padding:10px;border-radius:6px;font-size:12px;color:#f38ba8;">❌ Lỗi thực thi kiểm tra: ${escHtml(err.message)}</div>`;
    }
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
  if (!el) return;
  if (text.includes('<a') || text.includes('http')) {
    const formatted = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#89b4fa;font-weight:600;text-decoration:underline;word-break:break-all;">$1</a>').replace(/\n/g, '<br>');
    el.innerHTML = formatted;
  } else {
    el.innerHTML = text.replace(/\n/g, '<br>');
  }
  el.className = 'msg msg-' + type;
  el.style.display = 'block';
  const duration = type === 'err' ? 15000 : 5000;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, duration);
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

