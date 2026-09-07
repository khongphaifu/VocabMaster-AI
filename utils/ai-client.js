// d:/extension/utils/ai-client.js
// Supports Google Gemini, Groq, OpenAI GPT-4o Mini, Claude 3.5 Haiku
// Configured to follow Cambridge Dictionary standards (CALD & Cambridge English-Vietnamese)

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const WORD_PROMPT_EN_VI = (word) => {
  return `Bạn là hệ thống từ điển Anh - Việt theo chuẩn Từ điển Cambridge (Cambridge Advanced Learner's Dictionary & Cambridge English-Vietnamese Dictionary).
Hãy tra cứu và trả về mục từ điển đầy đủ, chi tiết cho từ tiếng Anh sau:
"${word}"

TIÊU CHUẨN MỤC TỪ ĐIỂN (BẮT BUỘC ĐẦY ĐỦ CÁC TRƯỜNG):
1. "word_root": Dạng từ nguyên thể/lemma (ví dụ: "sauces" ➔ "sauce", "running" ➔ "run").
2. "ipa_uk": Phiên âm chuẩn Anh-Anh (UK), ví dụ: "/sɔːs/".
3. "ipa_us": Phiên âm chuẩn Anh-Mỹ (US), ví dụ: "/sɑːs/".
4. "partOfSpeech": Từ loại chuẩn (ví dụ: "noun [C or U]", "verb [T]", "adjective", "adverb").
5. "level": Cấp độ CEFR theo chuẩn Cambridge (A1, A2, B1, B2, C1, C2).
6. "meaning_vi": BẮT BUỘC là NGHĨA THUẦN VIỆT cốt lõi, chính xác và thông dụng nhất của từ (Ví dụ: "sauce" ➔ "nước xốt, nước chấm"; "umbrella" ➔ "cây dù, cái ô"; "abandon" ➔ "từ bỏ, ruồng bỏ"). TUYỆT ĐỐI KHÔNG lặp lại từ tiếng Anh "${word}".
7. "definition_vi": Giải thích chi tiết ý nghĩa và ngữ cảnh bằng tiếng Việt.
8. "definition_en": Định nghĩa tiếng Anh chuẩn mực, ngắn gọn theo Cambridge Dictionary.
9. "examples": BẮT BUỘC ít nhất 2 câu ví dụ tiếng Anh tự nhiên có chứa từ "${word}".
10. "word_family": BẮT BUỘC các dạng từ liên quan cùng gốc (noun, verb, adjective, adverb...). Cấu trúc: [{"pos": "verb", "word": "...", "meaning_vi": "..."}, {"pos": "adj", "word": "...", "meaning_vi": "..."}].
11. "other_meanings": Các nghĩa hoặc cách dùng khác nếu có (ví dụ khi từ là động từ hoặc danh từ nghĩa bóng). Cấu trúc: [{"pos": "...", "meaning_vi": "..."}].
12. "collocations": BẮT BUỘC 2-3 cụm từ thông dụng nhất. Cấu trúc: [{"phrase": "...", "meaning_vi": "..."}].
13. "synonyms": 2-4 từ đồng nghĩa tiếng Anh phổ biến.

QUY TẮC:
- Trả về DUY NHẤT một JSON hợp lệ (không kèm văn bản nào ngoài JSON).
- Tuyệt đối KHÔNG để trống mảng "examples", "word_family", "collocations".
- Tuyệt đối KHÔNG điền dấu ba chấm (...).

Trả về theo đúng cấu trúc:
{
  "type": "word",
  "word": {
    "word_root": "từ nguyên thể",
    "ipa_uk": "/phiên âm UK/",
    "ipa_us": "/phiên âm US/",
    "partOfSpeech": "noun [C or U]",
    "level": "B1",
    "meaning_vi": "nghĩa thuần Việt chuẩn xác",
    "definition_vi": "giải thích chi tiết bằng tiếng Việt",
    "definition_en": "concise English definition following Cambridge Dictionary",
    "examples": [
      "Example sentence 1 with ${word}",
      "Example sentence 2 with ${word}"
    ],
    "word_family": [
      {"pos": "từ loại", "word": "từ liên quan", "meaning_vi": "nghĩa tiếng Việt"}
    ],
    "other_meanings": [
      {"pos": "từ loại", "meaning_vi": "nghĩa khác"}
    ],
    "collocations": [
      {"phrase": "cụm từ 1", "meaning_vi": "nghĩa tiếng Việt 1"},
      {"phrase": "cụm từ 2", "meaning_vi": "nghĩa tiếng Việt 2"}
    ],
    "synonyms": ["đồng nghĩa 1", "đồng nghĩa 2"],
    "antonyms": []
  }
}`;
};

const WORD_PROMPT_VI_EN = (word) => {
  return `Bạn là hệ thống từ điển Anh - Việt theo chuẩn Từ điển Cambridge.
Hãy tra từ vựng tiếng Việt "${word}" và tạo mục từ điển tiếng Anh chuẩn Cambridge tương ứng.
Trả về DUY NHẤT một JSON hợp lệ theo đúng cấu trúc sau (tuyệt đối không điền dấu ba chấm ...):
{
  "type": "word",
  "word": {
    "word_root": "từ tiếng Anh tương ứng (lemma)",
    "ipa_uk": "/phiên âm UK chuẩn Cambridge/",
    "ipa_us": "/phiên âm US chuẩn Cambridge/",
    "partOfSpeech": "noun [C or U] hoặc verb [T] hoặc adjective...",
    "level": "B1",
    "meaning_vi": "${word}",
    "definition_en": "Clear concise English definition following Cambridge Dictionary",
    "definition_vi": "giải thích chi tiết ý nghĩa bằng tiếng Việt",
    "examples": [
      "Example sentence 1 in English",
      "Example sentence 2 in English"
    ],
    "collocations": [
      {"phrase": "cụm từ tiếng Anh phổ biến", "meaning_vi": "nghĩa tiếng Việt"}
    ],
    "word_family": [
      {"pos": "noun/verb/adj", "word": "từ liên quan", "meaning_vi": "nghĩa"}
    ],
    "other_meanings": [],
    "synonyms": ["synonym 1", "synonym 2"],
    "antonyms": []
  }
}

Bây giờ, hãy tra từ "${word}" và trả về JSON tương tự:`;
};

const PHRASE_PROMPT = (text, direction = 'auto') => {
  const isVi = direction === 'vi-en' || (direction === 'auto' && VIETNAMESE_REGEX.test(text));

  if (isVi) {
    return `Bạn là chuyên gia dịch thuật theo tiêu chuẩn Cambridge English. Hãy dịch đoạn văn tiếng Việt sau sang tiếng Anh tự nhiên, mượt mà và chuẩn bản ngữ:
"""
${text}
"""

YÊU CẦU:
- Dịch mượt mà, đúng ngữ pháp và cách diễn đạt tự nhiên theo chuẩn Cambridge.
- Giữ nguyên cấu trúc xuống dòng (\\n) nếu văn bản gốc có nhiều dòng.
- Tuyệt đối KHÔNG điền dấu ba chấm (...).

Trả về DUY NHẤT một JSON hợp lệ theo đúng cấu trúc:
{
  "type": "phrase",
  "translation": "<Bản dịch tiếng Anh mượt mà, chuẩn ngữ pháp>",
  "explanation": "<Phân tích cấu trúc ngữ pháp và collocations theo chuẩn Cambridge>"
}`;
  }

  return `Bạn là chuyên gia dịch thuật theo tiêu chuẩn Từ điển Cambridge. Hãy dịch đoạn văn tiếng Anh sau sang tiếng Việt một cách THUẦN VIỆT, tự nhiên, chuẩn xác:
"""
${text}
"""

YÊU CẦU:
- Dịch mượt mà, thoát ý, thuần Việt theo phong cách dịch thuật của Cambridge English-Vietnamese Dictionary.
- Giữ nguyên cấu trúc xuống dòng (\\n) nếu văn bản gốc có nhiều dòng.
- Tuyệt đối KHÔNG điền dấu ba chấm (...).

Trả về DUY NHẤT một JSON hợp lệ theo đúng cấu trúc:
{
  "type": "phrase",
  "translation": "<Bản dịch tiếng Việt thuần Việt, tự nhiên, chuẩn mực>",
  "explanation": "<Phân tích ngữ pháp, cụm từ trọng tâm và collocations theo chuẩn Cambridge>"
}`;
};

export async function callAI(provider, apiKey, text, isWord, direction = 'auto') {
  const isVi = direction === 'vi-en' || (direction === 'auto' && VIETNAMESE_REGEX.test(text));
  let prompt;
  if (isWord) {
    prompt = isVi ? WORD_PROMPT_VI_EN(text) : WORD_PROMPT_EN_VI(text);
  } else {
    prompt = PHRASE_PROMPT(text, direction);
  }

  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    throw new Error(`Chưa nhập API Key cho ${provider}. Vui lòng mở Cài đặt để nhập.`);
  }

  let rawText;
  if (provider === 'gemini') {
    rawText = await callGemini(cleanKey, prompt, isWord);
  } else if (provider === 'groq') {
    rawText = await callGroq(cleanKey, prompt, isWord);
  } else if (provider === 'openai') {
    rawText = await callOpenAI(cleanKey, prompt, isWord);
  } else if (provider === 'claude') {
    rawText = await callClaude(cleanKey, prompt, isWord);
  } else {
    throw new Error('Unknown AI provider: ' + provider);
  }

  return safeParseJSON(rawText, isWord, text);
}

function repairAndParseJSON(rawStr) {
  if (!rawStr) return null;
  const str = rawStr.trim();
  try {
    return JSON.parse(str);
  } catch (_) {}

  // Remove control characters and trailing commas
  let cleaned = str
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F]+/g, ' ')
    .replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Balance unclosed quotes, brackets, and braces
  let inString = false, escape = false;
  let openBraces = 0, openBrackets = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (!inString) {
      if (c === '{') openBraces++;
      else if (c === '}') openBraces--;
      else if (c === '[') openBrackets++;
      else if (c === ']') openBrackets--;
    }
  }

  if (inString) cleaned += '"';
  while (openBrackets > 0) { cleaned += ']'; openBrackets--; }
  while (openBraces > 0) { cleaned += '}'; openBraces--; }

  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  return null;
}

function safeParseJSON(rawText, isWord, originalText) {
  if (!rawText || !rawText.trim()) {
    throw new Error('AI không phản hồi dữ liệu. Vui lòng thử lại.');
  }

  const cleanRaw = rawText.trim();
  let parsed = null;

  // 1. Try finding JSON block
  const firstBrace = cleanRaw.indexOf('{');
  const lastBrace = cleanRaw.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = cleanRaw.slice(firstBrace, lastBrace + 1);
    parsed = repairAndParseJSON(jsonStr);
  }

  if (!parsed && firstBrace !== -1) {
    parsed = repairAndParseJSON(cleanRaw.slice(firstBrace));
  }

  // 2. Validate and handle phrase translation
  if (!isWord) {
    let translation = '';
    let explanation = '';

    if (parsed && typeof parsed.translation === 'string' && parsed.translation.trim()) {
      translation = parsed.translation.trim();
      explanation = parsed.explanation || '';
    } else {
      const transMatch = cleanRaw.match(/"translation"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"explanation"|\})/i) ||
                         cleanRaw.match(/"translation"\s*:\s*"([\s\S]*?)"/i) ||
                         cleanRaw.match(/(?:bản dịch|translation|dịch)\s*:\s*([\s\S]+?)(?:\n\s*(?:giải thích|phân tích|explanation)|$)/i);

      if (transMatch && transMatch[1].trim()) {
        translation = transMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .trim();
      }

      const expMatch = cleanRaw.match(/"explanation"\s*:\s*"([\s\S]*?)"\s*\}/i) ||
                       cleanRaw.match(/"explanation"\s*:\s*"([\s\S]*?)"/i) ||
                       cleanRaw.match(/(?:giải thích|phân tích|explanation)\s*:\s*([\s\S]+)$/i);

      if (expMatch && expMatch[1].trim()) {
        explanation = expMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();
      }

      if (!translation && !cleanRaw.startsWith('{')) {
        translation = cleanRaw.replace(/```[a-z]*\n?/gi, '').trim();
      }
    }

    if (translation.startsWith('<') && translation.endsWith('>')) {
      translation = explanation || originalText;
    }

    if (!translation || translation === '...' || translation.includes('<nghĩa')) {
      translation = cleanRaw.replace(/[{}"[\]]/g, '').trim() || originalText;
    }

    return {
      type: 'phrase',
      original: originalText,
      translation,
      explanation
    };
  }

  // 3. Validate and handle word translation
  if (parsed && parsed.type === 'word' && parsed.word) {
    parsed.original = originalText;
    const w = parsed.word;

    const isMeaningBad = !w.meaning_vi ||
      w.meaning_vi.includes('...') ||
      w.meaning_vi.includes('<nghĩa') ||
      w.meaning_vi.trim().toLowerCase() === originalText.trim().toLowerCase() ||
      w.meaning_vi.trim().toLowerCase() === (w.word_root || '').trim().toLowerCase();

    if (isMeaningBad) {
      if (w.definition_vi && !w.definition_vi.includes('...') && !w.definition_vi.includes('<') && w.definition_vi.trim().toLowerCase() !== originalText.trim().toLowerCase()) {
        w.meaning_vi = w.definition_vi.split(/[:;]/)[0].trim();
      } else {
        w.meaning_vi = originalText;
      }
    }

    if (!w.definition_vi || w.definition_vi.includes('...') || w.definition_vi.includes('<')) {
      w.definition_vi = (w.meaning_vi && w.meaning_vi !== originalText)
        ? w.meaning_vi
        : (w.definition_en || originalText);
    }

    if (!w.ipa_uk || w.ipa_uk.includes('...') || w.ipa_uk.includes('<')) {
      w.ipa_uk = (w.ipa && !w.ipa.includes('...')) ? w.ipa : '';
    }
    if (!w.ipa_us || w.ipa_us.includes('...') || w.ipa_us.includes('<')) {
      w.ipa_us = (w.ipa && !w.ipa.includes('...')) ? w.ipa : (w.ipa_uk || '');
    }
    if (!w.ipa) {
      w.ipa = w.ipa_uk || w.ipa_us || '';
    }

    if (!w.word_root || w.word_root.includes('...') || w.word_root.includes('<')) {
      w.word_root = originalText;
    }

    if (!w.partOfSpeech || w.partOfSpeech.includes('...') || w.partOfSpeech.includes('<')) {
      w.partOfSpeech = 'noun';
    }

    if (!w.definition_en || w.definition_en.includes('...') || w.definition_en.includes('<')) {
      w.definition_en = '';
    }

    if (Array.isArray(w.collocations)) {
      w.collocations = w.collocations.filter(c => c && c.phrase && !c.phrase.includes('...') && !c.phrase.includes('<'));
    } else {
      w.collocations = [];
    }

    if (Array.isArray(w.word_family)) {
      w.word_family = w.word_family.filter(f => f && f.word && !f.word.includes('...') && !f.word.includes('<'));
    } else {
      w.word_family = [];
    }

    if (Array.isArray(w.other_meanings)) {
      w.other_meanings = w.other_meanings.filter(m => m && m.meaning_vi && !m.meaning_vi.includes('...') && !m.meaning_vi.includes('<'));
    } else {
      w.other_meanings = [];
    }

    if (Array.isArray(w.examples)) {
      w.examples = w.examples.filter(ex => ex && !ex.includes('...') && !ex.includes('<'));
    } else {
      w.examples = [];
    }

    if (!w.level || w.level.includes('...')) {
      w.level = 'B1';
    }

    return parsed;
  }

  // Fallback regex extraction for word
  const meaningViMatch = cleanRaw.match(/"meaning_vi"\s*:\s*"([^"]+)"/);
  const defViMatch = cleanRaw.match(/"definition_vi"\s*:\s*"([^"]+)"/) || cleanRaw.match(/định nghĩa.*?:\s*([^\n\r"]+)/i);
  const defEnMatch = cleanRaw.match(/"definition_en"\s*:\s*"([^"]+)"/);
  const ipaUkMatch = cleanRaw.match(/"ipa_uk"\s*:\s*"([^"]+)"/);
  const ipaUsMatch = cleanRaw.match(/"ipa_us"\s*:\s*"([^"]+)"/);
  const ipaMatch = cleanRaw.match(/"ipa"\s*:\s*"([^"]+)"/);
  const posMatch = cleanRaw.match(/"partOfSpeech"\s*:\s*"([^"]+)"/);
  const rootMatch = cleanRaw.match(/"word_root"\s*:\s*"([^"]+)"/);

  if (defViMatch || meaningViMatch) {
    let meaning = meaningViMatch ? meaningViMatch[1] : (defViMatch ? defViMatch[1] : originalText);
    let defVi = defViMatch ? defViMatch[1] : meaning;

    if (meaning.includes('...') || meaning.includes('<') || meaning.toLowerCase() === originalText.toLowerCase()) {
      meaning = (defVi && defVi.toLowerCase() !== originalText.toLowerCase()) ? defVi.split(/[:;]/)[0].trim() : originalText;
    }
    if (defVi.includes('...') || defVi.includes('<')) defVi = meaning;

    const ipaUk = ipaUkMatch && !ipaUkMatch[1].includes('...') ? ipaUkMatch[1] : (ipaMatch && !ipaMatch[1].includes('...') ? ipaMatch[1] : '');
    const ipaUs = ipaUsMatch && !ipaUsMatch[1].includes('...') ? ipaUsMatch[1] : ipaUk;

    // Extract examples via regex if any
    const examples = [];
    const exRegex = /"(?:Example sentence[^"]*|[^"]*${originalText}[^"]*)"/gi;
    const rawExMatches = cleanRaw.match(/"examples"\s*:\s*\[([\s\S]*?)\]/);
    if (rawExMatches) {
      const exItems = rawExMatches[1].match(/"([^"]+)"/g);
      if (exItems) {
        exItems.forEach(item => {
          const val = item.replace(/^"|"$/g, '').trim();
          if (val && !val.includes('...') && !val.includes('Example sentence')) examples.push(val);
        });
      }
    }

    // Extract collocations via regex if any
    const collocations = [];
    const collocRegex = /\{\s*"phrase"\s*:\s*"([^"]+)"\s*,\s*"meaning_vi"\s*:\s*"([^"]+)"\s*\}/g;
    let cMatch;
    while ((cMatch = collocRegex.exec(cleanRaw)) !== null) {
      if (!cMatch[1].includes('...') && !cMatch[1].includes('cụm từ')) {
        collocations.push({ phrase: cMatch[1], meaning_vi: cMatch[2] });
      }
    }

    // Extract word family via regex if any
    const word_family = [];
    const famRegex = /\{\s*"pos"\s*:\s*"([^"]+)"\s*,\s*"word"\s*:\s*"([^"]+)"\s*,\s*"meaning_vi"\s*:\s*"([^"]+)"\s*\}/g;
    let fMatch;
    while ((fMatch = famRegex.exec(cleanRaw)) !== null) {
      if (!fMatch[2].includes('...') && !fMatch[2].includes('từ liên quan')) {
        word_family.push({ pos: fMatch[1], word: fMatch[2], meaning_vi: fMatch[3] });
      }
    }

    return {
      type: 'word',
      original: originalText,
      word: {
        word_root: rootMatch && !rootMatch[1].includes('...') ? rootMatch[1] : originalText,
        ipa_uk: ipaUk,
        ipa_us: ipaUs,
        ipa: ipaUk || ipaUs,
        partOfSpeech: posMatch && !posMatch[1].includes('...') && !posMatch[1].includes('<') ? posMatch[1] : 'noun',
        meaning_vi: meaning,
        definition_vi: defVi,
        definition_en: defEnMatch && !defEnMatch[1].includes('...') && !defEnMatch[1].includes('<') ? defEnMatch[1] : '',
        collocations,
        word_family,
        other_meanings: [],
        examples,
        synonyms: [],
        antonyms: [],
        level: 'B1'
      }
    };
  }

  return {
    type: 'phrase',
    original: originalText,
    translation: cleanRaw.replace(/[{}"[\]]/g, '').trim() || originalText,
    explanation: ''
  };
}

let cachedGeminiModel = null;

async function callGemini(apiKey, prompt, isWord) {
  if (cachedGeminiModel) {
    try {
      return await executeGeminiGeneration(apiKey, cachedGeminiModel, prompt, isWord);
    } catch (err) {
      if (err.status !== 404) throw err;
      cachedGeminiModel = null;
    }
  }

  const candidateModels = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash-lite'
  ];

  let lastErr = null;
  for (const model of candidateModels) {
    try {
      const result = await executeGeminiGeneration(apiKey, model, prompt, isWord);
      cachedGeminiModel = model;
      return result;
    } catch (err) {
      if (err.status === 404) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Không thể kết nối Gemini API. Vui lòng kiểm tra lại API Key hoặc đổi sang Groq.');
}

async function executeGeminiGeneration(apiKey, modelName, prompt, isWord) {
  const cleanModel = modelName.replace(/^models\//, '').trim();
  const isBearer = apiKey.startsWith('AQ.');
  const headers = { 'Content-Type': 'application/json' };

  let url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`;
  if (isBearer) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    url += `?key=${apiKey}`;
    headers['x-goog-api-key'] = apiKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: isWord ? 1800 : 2048 }
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawMsg = errData.error?.message || '';
      const reason = errData.error?.details?.[0]?.reason || '';

      if (reason === 'API_KEY_SERVICE_BLOCKED' || rawMsg.includes('has not been used in project') || rawMsg.includes('disabled')) {
        const err = new Error('Generative Language API đang bị chặn/chưa bật trong Google Cloud Project.');
        err.status = res.status;
        throw err;
      }

      if (res.status === 401 || reason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED') {
        const err = new Error('API Key không hợp lệ hoặc sai loại xác thực. Vui lòng kiểm tra lại key.');
        err.status = 401;
        throw err;
      }

      if (res.status === 404) {
        const err = new Error(`Model ${cleanModel} không tìm thấy (404)`);
        err.status = 404;
        throw err;
      }

      const err = new Error(`Gemini API lỗi ${res.status}: ${rawMsg || 'Lỗi HTTP'}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Yêu cầu Gemini API bị quá thời gian chờ (Timeout 12s).');
    }
    throw e;
  }
}

let cachedActiveGroqModels = null;
let cachedActiveGroqModelsTimestamp = 0;

async function getActiveGroqModels(apiKey) {
  if (cachedActiveGroqModels && (Date.now() - cachedActiveGroqModelsTimestamp < 3600000)) {
    return cachedActiveGroqModels;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      const active = (data.data || [])
        .map(m => m.id)
        .filter(id =>
          !id.includes('whisper') &&
          !id.includes('guard') &&
          !id.includes('audio') &&
          !id.includes('vision') &&
          !id.includes('safeguard') &&
          !id.includes('mixtral') &&
          !id.includes('llama3-8b') &&
          !id.includes('llama3-70b') &&
          !id.includes('llama-4') &&
          !id.includes('preview')
        );

      active.sort((a, b) => {
        if (a.includes('3.1-8b-instant')) return -1;
        if (b.includes('3.1-8b-instant')) return 1;
        if (a.includes('3.3-70b')) return -1;
        if (b.includes('3.3-70b')) return 1;
        if (a.includes('gemma2')) return -1;
        if (b.includes('gemma2')) return 1;
        return 0;
      });

      if (active.length > 0) {
        cachedActiveGroqModels = active;
        cachedActiveGroqModelsTimestamp = Date.now();
        return active;
      }
    }
  } catch (_) {}

  return [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'gemma2-9b-it'
  ];
}

let cachedGroqModel = null;

async function callGroq(apiKey, prompt, isWord) {
  const cleanKey = apiKey.trim();

  if (cachedGroqModel) {
    try {
      return await executeGroqGeneration(cleanKey, cachedGroqModel, prompt, isWord);
    } catch (err) {
      cachedGroqModel = null;
    }
  }

  const modelsToTry = await getActiveGroqModels(cleanKey);

  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const result = await executeGroqGeneration(cleanKey, model, prompt, isWord);
      cachedGroqModel = model;
      return result;
    } catch (err) {
      lastErr = err;
      if (
        err.status === 404 ||
        err.status === 429 ||
        err.status === 413 ||
        (err.status === 400 && (err.message?.toLowerCase().includes('model') || err.message?.toLowerCase().includes('decommissioned') || err.message?.toLowerCase().includes('rate limit') || err.message?.toLowerCase().includes('too large')))
      ) {
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Không thể kết nối Groq API. Vui lòng kiểm tra lại API key.');
}

async function executeGroqGeneration(apiKey, model, prompt, isWord) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a professional English-Vietnamese dictionary and translator adhering strictly to Cambridge Dictionary standards (Cambridge Advanced Learner\'s Dictionary & Cambridge English-Vietnamese Dictionary). Output ONLY a valid JSON object matching the requested schema.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: isWord ? 1800 : 2048
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorObj = new Error(`Groq API lỗi ${res.status}: ${err.error?.message || 'Unknown error'}`);
      errorObj.status = res.status;
      throw errorObj;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Yêu cầu Groq API bị quá thời gian chờ (Timeout). Vui lòng thử lại.');
    }
    throw e;
  }
}

async function callOpenAI(apiKey, prompt, isWord) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an English-Vietnamese dictionary and translator adhering to Cambridge Dictionary standards. Output ONLY a valid JSON object.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: isWord ? 1800 : 2048
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenAI API lỗi ${res.status}: ${err.error?.message || 'Unknown error'}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Yêu cầu OpenAI API bị quá thời gian chờ (Timeout 12s).');
    }
    throw e;
  }
}

async function callClaude(apiKey, prompt, isWord) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: isWord ? 800 : 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Claude API lỗi ${res.status}: ${err.error?.message || 'Unknown error'}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Yêu cầu Claude API bị quá thời gian chờ (Timeout 12s).');
    }
    throw e;
  }
}
