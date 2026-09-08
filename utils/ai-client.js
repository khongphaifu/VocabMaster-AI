// d:/extension/utils/ai-client.js
// Supports Google Gemini, Groq, OpenAI GPT-4o Mini, Claude 3.5 Haiku
// Configured to follow Cambridge Dictionary standards (CALD & Cambridge English-Vietnamese)

import { getCandidateLemmas } from './cambridge-client.js';

const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

export const PLACEHOLDER_STRINGS = new Set([
  'nghĩa tiếng việt',
  'nghĩa tiếng việt chuẩn xác',
  'nghĩa thuần việt',
  'nghĩa thuần việt chuẩn xác',
  'nghĩa của từ',
  'nghĩa khác',
  'nghĩa',
  'bản dịch',
  'từ liên quan',
  'từ loại',
  'từ nguyên thể',
  'cụm từ 1',
  'cụm từ 2',
  'đồng nghĩa 1',
  'đồng nghĩa 2',
  'bàn điệt',
  'giải thích chi tiết bằng tiếng việt',
  'giải thích chi tiết',
  'example sentence 1',
  'example sentence 2'
]);

export function isPlaceholderText(str) {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim().toLowerCase();
  if (s.length === 0 || s === '...' || s === '-') return true;
  if (PLACEHOLDER_STRINGS.has(s)) return true;
  if (s.startsWith('<') && s.endsWith('>')) return true;
  if (s.includes('nghĩa thuần việt') || s.includes('nghĩa tiếng việt') || s.includes('từ liên quan') || s.includes('bàn điệt')) return true;
  return false;
}

export const COMMON_WORD_FALLBACKS = {
  garden: {
    word_root: 'garden',
    ipa_uk: '/ˈɡɑː.dən/',
    ipa_us: '/ˈɡɑːr.dən/',
    partOfSpeech: 'noun [C]',
    level: 'A1',
    meaning_vi: 'khu vườn, vườn',
    definition_vi: 'khu đất có cây cối, hoa hoặc rau củ trồng xung quanh nhà hoặc nơi công cộng',
    definition_en: 'a piece of land next to or around a house, where flowers and other plants are grown',
    examples: [
      'The children were playing in the garden.',
      'They sat in the back garden enjoying the afternoon sunshine.'
    ],
    word_family: [
      { pos: 'noun', word: 'gardener', meaning_vi: 'người làm vườn' },
      { pos: 'noun', word: 'gardening', meaning_vi: 'công việc làm vườn' }
    ],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'làm vườn, chăm sóc cây cối' }
    ],
    collocations: [
      { phrase: 'botanical garden', meaning_vi: 'vườn bách thảo' },
      { phrase: 'flower garden', meaning_vi: 'vườn hoa' },
      { phrase: 'front/back garden', meaning_vi: 'vườn trước / vườn sau' }
    ],
    synonyms: ['yard', 'park', 'plot', 'orchard'],
    antonyms: []
  },
  table: {
    word_root: 'table',
    ipa_uk: '/ˈteɪ.bəl/',
    ipa_us: '/ˈteɪ.bəl/',
    partOfSpeech: 'noun [C]',
    level: 'A1',
    meaning_vi: 'cái bàn, bảng biểu',
    definition_vi: 'đồ nội thất có mặt phẳng dùng để đặt đồ vật hoặc bảng danh sách dữ liệu/con số',
    definition_en: 'a flat surface usually supported by legs, or an arrangement of facts and figures',
    examples: [
      'They sat around the kitchen table eating breakfast.',
      'Table 1 shows the population growth over five years.'
    ],
    word_family: [],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'hoãn lại (dự luật, kế hoạch) để thảo luận sau' }
    ],
    collocations: [
      { phrase: 'at the table', meaning_vi: 'ở bàn ăn / trên bàn đàm phán' },
      { phrase: 'round table', meaning_vi: 'bàn tròn' },
      { phrase: 'times table', meaning_vi: 'bảng cửu chương' }
    ],
    synonyms: ['desk', 'counter', 'board', 'chart'],
    antonyms: []
  },
  become: {
    word_root: 'become',
    ipa_uk: '/bɪˈkʌm/',
    ipa_us: '/bɪˈkʌm/',
    partOfSpeech: 'verb',
    level: 'A1',
    meaning_vi: 'trở thành, trở nên',
    definition_vi: 'bắt đầu là hoặc biến đổi thành một trạng thái hay nghề nghiệp khác',
    definition_en: 'to start to be something or change into a particular state',
    examples: [
      'He became a doctor after graduating from university.',
      'It was becoming cold as the sun went down.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'become of', meaning_vi: 'xảy ra với ai / cái gì' },
      { phrase: 'become aware of', meaning_vi: 'nhận thức được điều gì' }
    ],
    synonyms: ['turn into', 'transform', 'grow', 'get'],
    antonyms: []
  },
  book: {
    word_root: 'book',
    ipa_uk: '/bʊk/',
    ipa_us: '/bʊk/',
    partOfSpeech: 'noun [C]',
    level: 'A1',
    meaning_vi: 'cuốn sách, quyển sách',
    definition_vi: 'tập hợp các trang giấy có chữ hoặc tranh ảnh được đóng lại với nhau',
    definition_en: 'a written text that can be published in printed or electronic form',
    examples: [
      'She is reading an interesting book.',
      'I need to book a flight to London.'
    ],
    word_family: [
      { pos: 'noun', word: 'booking', meaning_vi: 'việc đặt chỗ, sự đăng ký' }
    ],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'đặt trước (phòng, vé)' }
    ],
    collocations: [
      { phrase: 'book a ticket', meaning_vi: 'đặt vé' },
      { phrase: 'by the book', meaning_vi: 'theo đúng quy tắc, luật lệ' }
    ],
    synonyms: ['novel', 'volume', 'publication', 'reserve'],
    antonyms: []
  },
  apple: {
    word_root: 'apple',
    ipa_uk: '/ˈæp.əl/',
    ipa_us: '/ˈæp.əl/',
    partOfSpeech: 'noun [C]',
    level: 'A1',
    meaning_vi: 'quả táo',
    definition_vi: 'một loại trái cây tròn có vỏ đỏ, vàng hoặc xanh và thịt màu trắng',
    definition_en: 'a round fruit with firm, white flesh and a green, red, or yellow skin',
    examples: [
      'She took a bite of the juicy red apple.',
      'An apple a day keeps the doctor away.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'apple pie', meaning_vi: 'bánh táo' },
      { phrase: 'the apple of one\'s eye', meaning_vi: 'người được yêu quý nhất' }
    ],
    synonyms: [],
    antonyms: []
  },
  house: {
    word_root: 'house',
    ipa_uk: '/haʊs/',
    ipa_us: '/haʊs/',
    partOfSpeech: 'noun [C]',
    level: 'A1',
    meaning_vi: 'ngôi nhà, căn nhà',
    definition_vi: 'tòa nhà được xây dựng cho một gia đình hoặc một nhóm người sinh sống',
    definition_en: 'a building that people, usually one family, live in',
    examples: [
      'They bought a new house near the beach.',
      'Let us go inside the house.'
    ],
    word_family: [
      { pos: 'noun', word: 'housing', meaning_vi: 'nhà ở, việc cấp nhà' }
    ],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'chứa chấp, cung cấp chỗ ở' }
    ],
    collocations: [
      { phrase: 'at someone\'s house', meaning_vi: 'ở nhà ai' },
      { phrase: 'move house', meaning_vi: 'chuyển nhà' }
    ],
    synonyms: ['home', 'residence', 'dwelling'],
    antonyms: []
  },
  car: {
    word_root: 'car',
    ipa_uk: '/kɑːr/',
    ipa_us: '/kɑːr/',
    partOfSpeech: 'noun [C]',
    level: 'A1',
    meaning_vi: 'xe hơi, ô tô',
    definition_vi: 'phương tiện giao thông bốn bánh chạy bằng động cơ dùng để chở người',
    definition_en: 'a road vehicle with four wheels and an engine that can carry a small number of passengers',
    examples: [
      'He parked his car in the garage.',
      'She goes to work by car every morning.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'by car', meaning_vi: 'bằng ô tô' },
      { phrase: 'drive a car', meaning_vi: 'lái xe ô tô' }
    ],
    synonyms: ['automobile', 'vehicle'],
    antonyms: []
  },
  water: {
    word_root: 'water',
    ipa_uk: '/ˈwɔː.tər/',
    ipa_us: '/ˈwɑː.t̬ɚ/',
    partOfSpeech: 'noun [U]',
    level: 'A1',
    meaning_vi: 'nước',
    definition_vi: 'chất lỏng trong suốt không màu không mùi cần thiết cho sự sống',
    definition_en: 'a clear liquid, without colour or taste, that falls from the sky as rain',
    examples: [
      'Drink plenty of water every day.',
      'The water in the lake is crystal clear.'
    ],
    word_family: [],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'tưới nước' }
    ],
    collocations: [
      { phrase: 'mineral water', meaning_vi: 'nước khoáng' },
      { phrase: 'tap water', meaning_vi: 'nước máy' }
    ],
    synonyms: ['liquid', 'aqua'],
    antonyms: []
  },
  work: {
    word_root: 'work',
    ipa_uk: '/wɜːk/',
    ipa_us: '/wɝːk/',
    partOfSpeech: 'verb',
    level: 'A1',
    meaning_vi: 'làm việc, hoạt động, tác phẩm',
    definition_vi: 'thực hiện công việc để kiếm sống hoặc vận hành hiệu quả',
    definition_en: 'to do something that involves physical or mental effort, especially as part of a job',
    examples: [
      'She works as a software engineer.',
      'Does this machine work properly?'
    ],
    word_family: [
      { pos: 'noun', word: 'worker', meaning_vi: 'người lao động' },
      { pos: 'noun', word: 'workplace', meaning_vi: 'nơi làm việc' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'công việc, tác phẩm' }
    ],
    collocations: [
      { phrase: 'at work', meaning_vi: 'ở nơi làm việc' },
      { phrase: 'hard work', meaning_vi: 'công việc vất vả' }
    ],
    synonyms: ['labor', 'operate', 'function'],
    antonyms: []
  },
  friend: {
    word_root: 'friend',
    ipa_uk: '/frend/',
    ipa_us: '/frend/',
    partOfSpeech: 'noun [C]',
    level: 'A1',
    meaning_vi: 'người bạn, bạn bè',
    definition_vi: 'người mà bạn biết rõ, quý mến và tin tưởng',
    definition_en: 'a person who you know well and who you like a lot, but who is not a member of your family',
    examples: [
      'She is my best friend.',
      'We have been close friends for ten years.'
    ],
    word_family: [
      { pos: 'adj', word: 'friendly', meaning_vi: 'thân thiện' },
      { pos: 'noun', word: 'friendship', meaning_vi: 'tình bạn' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'make friends', meaning_vi: 'kết bạn' },
      { phrase: 'close friend', meaning_vi: 'bạn thân' }
    ],
    synonyms: ['companion', 'pal', 'buddy'],
    antonyms: ['enemy']
  },
  decision: {
    word_root: 'decision',
    ipa_uk: '/dɪˈsɪʒ.ən/',
    ipa_us: '/dɪˈsɪʒ.ən/',
    partOfSpeech: 'noun [C or U]',
    level: 'B1',
    meaning_vi: 'sự quyết định, phán quyết',
    definition_vi: 'sự lựa chọn hoặc phán xét sau khi đã suy nghĩ kỹ',
    definition_en: 'a choice that you make about something after thinking about several possibilities',
    examples: [
      'She made a decision to study abroad.',
      'It was a difficult decision to make.'
    ],
    word_family: [
      { pos: 'verb', word: 'decide', meaning_vi: 'quyết định' },
      { pos: 'adj', word: 'decisive', meaning_vi: 'kiên quyết, dứt khoát' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'sự dứt khoát, tính quyết đoán' }
    ],
    collocations: [
      { phrase: 'make a decision', meaning_vi: 'đưa ra quyết định' }
    ],
    synonyms: ['choice', 'judgment', 'resolution'],
    antonyms: ['indecision']
  }
};

/**
 * Resolve word against candidate lemmas in COMMON_WORD_FALLBACKS
 */
export function findFallbackData(word) {
  if (!word || typeof word !== 'string') return null;
  const clean = word.trim().toLowerCase();
  const candidates = getCandidateLemmas(clean);
  for (const cand of candidates) {
    if (COMMON_WORD_FALLBACKS[cand]) {
      return COMMON_WORD_FALLBACKS[cand];
    }
  }
  return null;
}

/**
 * Build a complete dictionary response from fallback data
 */
export function buildFallbackWordResponse(originalText, fbData) {
  return {
    type: 'word',
    source: 'fallback',
    original: originalText,
    word: {
      word_root: fbData.word_root || originalText,
      ipa_uk: fbData.ipa_uk || '',
      ipa_us: fbData.ipa_us || fbData.ipa_uk || '',
      ipa: fbData.ipa_uk || fbData.ipa_us || '',
      partOfSpeech: fbData.partOfSpeech || 'noun',
      level: fbData.level || 'A1',
      meaning_vi: fbData.meaning_vi,
      definition_vi: fbData.definition_vi || fbData.meaning_vi,
      definition_en: fbData.definition_en || '',
      collocations: fbData.collocations ? [...fbData.collocations] : [],
      word_family: fbData.word_family ? [...fbData.word_family] : [],
      other_meanings: fbData.other_meanings ? [...fbData.other_meanings] : [],
      examples: fbData.examples ? [...fbData.examples] : [],
      synonyms: fbData.synonyms ? [...fbData.synonyms] : [],
      antonyms: fbData.antonyms ? [...fbData.antonyms] : []
    }
  };
}

const WORD_PROMPT_EN_VI = (word) => {
  return `Bạn là hệ thống từ điển Anh - Việt theo chuẩn Cambridge English-Vietnamese Dictionary (dictionary.cambridge.org).
Hãy tra cứu từ tiếng Anh "${word}" và trả về mục từ điển CHÍNH XÁC như cách Cambridge Dictionary trình bày.

CÁCH DỊCH CHUẨN CAMBRIDGE:
- "meaning_vi" phải là bản dịch NGẮN GỌN, SÁT NGHĨA giống hệt cách Cambridge English-Vietnamese hiển thị.
  Ví dụ: "abandon" → "từ bỏ" (KHÔNG phải "sự bỏ rơi, sự từ bỏ hoàn toàn")
  Ví dụ: "table" → "cái bàn" (KHÔNG phải "một bề mặt phẳng có chân dùng để đặt đồ")
  Ví dụ: "become" → "trở thành, trở nên"
  Ví dụ: "significant" → "đáng kể, quan trọng"
- meaning_vi là TỪ/CỤM TỪ TIẾNG VIỆT tương đương, KHÔNG phải câu giải thích dài.
- "definition_vi" mới là phần giải thích chi tiết hơn bằng tiếng Việt.

TIÊU CHUẨN MỤC TỪ ĐIỂN:
1. "word_root": Dạng nguyên thể (lemma) của "${word}".
2. "ipa_uk": Phiên âm UK chuẩn Cambridge, ví dụ "/teɪ.bəl/".
3. "ipa_us": Phiên âm US chuẩn Cambridge, ví dụ "/teɪ.bəl/".
4. "partOfSpeech": Từ loại chuẩn Cambridge ("noun [C]", "verb [T]", "adjective"...).
5. "level": Cấp độ CEFR (A1, A2, B1, B2, C1, C2).
6. "meaning_vi": Bản dịch tiếng Việt NGẮN GỌN, SÁT NGHĨA theo chuẩn Cambridge (xem ví dụ ở trên). TUYỆT ĐỐI KHÔNG trả về "nghĩa tiếng Việt" hay khuôn mẫu!
7. "definition_vi": Giải thích nghĩa bằng tiếng Việt (1-2 câu ngắn).
8. "definition_en": Định nghĩa tiếng Anh ngắn gọn theo Cambridge.
9. "examples": 2 câu ví dụ tiếng Anh tự nhiên.
10. "word_family": Từ cùng gốc [{\"pos\": \"...\", \"word\": \"...\", \"meaning_vi\": \"...\"}]. Mảng rỗng [] nếu không có. KHÔNG lặp "${word}", KHÔNG tự chế từ.
11. "other_meanings": Các nghĩa khác [{\"pos\": \"...\", \"meaning_vi\": \"bản dịch ngắn gọn\", \"definition_en\": \"English definition\"}].
12. "collocations": 2-3 cụm từ thông dụng [{\"phrase\": \"...\", \"meaning_vi\": \"...\"}].
13. "synonyms": 2-4 từ đồng nghĩa TIẾNG ANH. KHÔNG dùng tiếng Việt.

MẪU THAM KHẢO (từ "abandon"):
{
  "type": "word",
  "word": {
    "word_root": "abandon",
    "ipa_uk": "/əˈbæn.dən/",
    "ipa_us": "/əˈbæn.dən/",
    "partOfSpeech": "verb",
    "level": "B2",
    "meaning_vi": "từ bỏ",
    "definition_vi": "rời đi không có ý định quay lại",
    "definition_en": "to leave, not intending to return to",
    "examples": [
      "The bank robbers abandoned the stolen car.",
      "By the time the rebel troops arrived, the village had already been abandoned."
    ],
    "word_family": [
      {"pos": "noun", "word": "abandonment", "meaning_vi": "sự bỏ rơi"},
      {"pos": "adj", "word": "abandoned", "meaning_vi": "bị bỏ hoang"}
    ],
    "other_meanings": [
      {"pos": "verb", "meaning_vi": "hủy", "definition_en": "to stop doing something because of a problem"},
      {"pos": "verb (literary)", "meaning_vi": "buông thả", "definition_en": "to give (oneself) completely to something"}
    ],
    "collocations": [
      {"phrase": "abandon hope", "meaning_vi": "từ bỏ hy vọng"},
      {"phrase": "abandon ship", "meaning_vi": "rời tàu (khi gặp nguy)"}
    ],
    "synonyms": ["desert", "forsake", "leave", "give up"],
    "antonyms": ["keep", "retain"]
  }
}

QUY TẮC BẮT BUỘC:
- Trả về DUY NHẤT một JSON hợp lệ, không kèm văn bản nào ngoài JSON.
- Không điền dấu ba chấm (...).
- meaning_vi PHẢI là từ/cụm từ tiếng Việt ngắn gọn tương đương, KHÔNG phải định nghĩa dài.

Bây giờ hãy tra từ "${word}" và trả về JSON:`;
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

export function safeParseJSON(rawText, isWord, originalText) {
  const initialFallback = findFallbackData(originalText);

  if (!rawText || !rawText.trim()) {
    if (isWord && initialFallback) {
      return buildFallbackWordResponse(originalText, initialFallback);
    }
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
  if (parsed && (parsed.type === 'word' || parsed.word || parsed.meaning_vi || isWord)) {
    parsed.type = 'word';
    parsed.original = originalText;

    // CRITICAL FIX: Ensure parsed.word is ALWAYS a valid object, never a string or null!
    let w = parsed.word;
    if (!w || typeof w !== 'object' || Array.isArray(w)) {
      const rootCandidate = typeof w === 'string' ? w : (parsed.word_root || originalText);
      w = {
        word_root: rootCandidate,
        meaning_vi: parsed.meaning_vi || parsed.definition_vi || '',
        definition_vi: parsed.definition_vi || '',
        definition_en: parsed.definition_en || '',
        ipa_uk: parsed.ipa_uk || parsed.ipa || '',
        ipa_us: parsed.ipa_us || parsed.ipa || '',
        ipa: parsed.ipa || parsed.ipa_uk || parsed.ipa_us || '',
        partOfSpeech: parsed.partOfSpeech || parsed.pos || 'noun',
        level: parsed.level || 'B1',
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        word_family: Array.isArray(parsed.word_family) ? parsed.word_family : [],
        other_meanings: Array.isArray(parsed.other_meanings) ? parsed.other_meanings : [],
        collocations: Array.isArray(parsed.collocations) ? parsed.collocations : [],
        synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
        antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : []
      };
      parsed.word = w;
    }

    const cleanRoot = (w.word_root || originalText).trim().toLowerCase();
    const fallbackData = findFallbackData(cleanRoot) || initialFallback;

    // 1. Sanitize meaning_vi
    let isMeaningBad = isPlaceholderText(w.meaning_vi) ||
      w.meaning_vi.trim().toLowerCase() === originalText.trim().toLowerCase() ||
      w.meaning_vi.trim().toLowerCase() === cleanRoot;

    if (isMeaningBad) {
      if (fallbackData?.meaning_vi) {
        w.meaning_vi = fallbackData.meaning_vi;
      } else if (w.definition_vi && !isPlaceholderText(w.definition_vi) && w.definition_vi.trim().toLowerCase() !== originalText.trim().toLowerCase()) {
        w.meaning_vi = w.definition_vi.split(/[:;]/)[0].trim();
      } else if (Array.isArray(w.other_meanings) && w.other_meanings.length > 0) {
        const validOther = w.other_meanings.find(m => m && !isPlaceholderText(m.meaning_vi));
        if (validOther) w.meaning_vi = validOther.meaning_vi;
      } else {
        w.meaning_vi = originalText;
      }
    }

    // 2. Sanitize definition_vi
    if (isPlaceholderText(w.definition_vi)) {
      w.definition_vi = fallbackData?.definition_vi ||
        (w.meaning_vi && w.meaning_vi !== originalText ? w.meaning_vi : (w.definition_en || originalText));
    }

    // 3. Fallback enrichment if available
    if (fallbackData) {
      if (!w.ipa_uk || isPlaceholderText(w.ipa_uk)) w.ipa_uk = fallbackData.ipa_uk;
      if (!w.ipa_us || isPlaceholderText(w.ipa_us)) w.ipa_us = fallbackData.ipa_us;
      if (!w.definition_en || isPlaceholderText(w.definition_en)) w.definition_en = fallbackData.definition_en;
      if (!w.partOfSpeech || isPlaceholderText(w.partOfSpeech)) w.partOfSpeech = fallbackData.partOfSpeech;
      if ((!w.examples || w.examples.length === 0) && fallbackData.examples) w.examples = [...fallbackData.examples];
      if ((!w.collocations || w.collocations.length === 0) && fallbackData.collocations) w.collocations = [...fallbackData.collocations];
      if ((!w.synonyms || w.synonyms.length === 0) && fallbackData.synonyms) w.synonyms = [...fallbackData.synonyms];
    }

    if (!w.ipa_uk || isPlaceholderText(w.ipa_uk)) {
      w.ipa_uk = (w.ipa && !isPlaceholderText(w.ipa)) ? w.ipa : '';
    }
    if (!w.ipa_us || isPlaceholderText(w.ipa_us)) {
      w.ipa_us = (w.ipa && !isPlaceholderText(w.ipa)) ? w.ipa : (w.ipa_uk || '');
    }
    if (!w.ipa) {
      w.ipa = w.ipa_uk || w.ipa_us || '';
    }

    if (!w.word_root || isPlaceholderText(w.word_root)) {
      w.word_root = originalText;
    }

    if (!w.partOfSpeech || isPlaceholderText(w.partOfSpeech)) {
      w.partOfSpeech = 'noun';
    }

    if (!w.definition_en || isPlaceholderText(w.definition_en)) {
      w.definition_en = '';
    }

    // 4. Sanitize collocations
    if (Array.isArray(w.collocations)) {
      const seenColloc = new Set();
      w.collocations = w.collocations.map(c => {
        if (typeof c === 'string') return { phrase: c, meaning_vi: '' };
        return c;
      }).filter(c => {
        if (!c || !c.phrase) return false;
        const phrase = String(c.phrase).trim();
        const meaning = String(c.meaning_vi || '').trim();
        if (isPlaceholderText(phrase) || isPlaceholderText(meaning)) return false;
        const key = phrase.toLowerCase();
        if (seenColloc.has(key)) return false;
        seenColloc.add(key);
        return true;
      });
    } else {
      w.collocations = [];
    }

    // 5. Sanitize word_family (NO placeholders, NO self-reference, NO nonsense words)
    if (Array.isArray(w.word_family)) {
      const seenFamily = new Set();
      w.word_family = w.word_family.map(f => {
        if (typeof f === 'string') return { pos: '', word: f, meaning_vi: '' };
        return f;
      }).filter(f => {
        if (!f || !f.word) return false;
        const fw = String(f.word).trim();
        const fMeaning = String(f.meaning_vi || '').trim();
        if (isPlaceholderText(fw) || isPlaceholderText(fMeaning)) return false;
        const fwLower = fw.toLowerCase();
        if (fwLower === originalText.trim().toLowerCase() || fwLower === cleanRoot) return false;
        if (seenFamily.has(fwLower)) return false;
        seenFamily.add(fwLower);
        return true;
      });
    } else {
      w.word_family = [];
    }

    // 6. Sanitize synonyms (English only, NO placeholders, NO duplicates)
    if (Array.isArray(w.synonyms)) {
      const seenSyn = new Set();
      w.synonyms = w.synonyms
        .map(s => String(s || '').trim())
        .filter(s => {
          if (!s || s.length < 2) return false;
          if (isPlaceholderText(s)) return false;
          if (VIETNAMESE_REGEX.test(s)) return false; // Must be English!
          const lower = s.toLowerCase();
          if (lower === originalText.trim().toLowerCase() || lower === cleanRoot) return false;
          if (seenSyn.has(lower)) return false;
          seenSyn.add(lower);
          return true;
        })
        .slice(0, 4);
    } else {
      w.synonyms = [];
    }

    // 7. Sanitize other_meanings
    if (Array.isArray(w.other_meanings)) {
      const seenOther = new Set();
      w.other_meanings = w.other_meanings.map(m => {
        if (typeof m === 'string') return { pos: '', meaning_vi: m };
        return m;
      }).filter(m => {
        if (!m || !m.meaning_vi) return false;
        const meaning = String(m.meaning_vi).trim();
        if (isPlaceholderText(meaning)) return false;
        const key = meaning.toLowerCase();
        if (seenOther.has(key)) return false;
        seenOther.add(key);
        return true;
      });
    } else {
      w.other_meanings = [];
    }

    // 8. Sanitize examples
    if (Array.isArray(w.examples)) {
      w.examples = w.examples.filter(ex => {
        if (typeof ex !== 'string') return false;
        if (isPlaceholderText(ex)) return false;
        if (ex.includes('Example sentence') || ex.includes('Ví dụ')) return false;
        return true;
      });
    } else {
      w.examples = [];
    }

    if (!w.level || typeof w.level !== 'string' || isPlaceholderText(w.level)) {
      w.level = fallbackData?.level || 'B1';
    }

    return parsed;
  }

  // Fallback regex extraction for word
  const rootMatch = cleanRaw.match(/"word_root"\s*:\s*"([^"]+)"/);
  const cleanWordRoot = (rootMatch ? rootMatch[1] : originalText).trim().toLowerCase();
  const fbData = findFallbackData(cleanWordRoot) || initialFallback;

  const meaningViMatch = cleanRaw.match(/"meaning_vi"\s*:\s*"([^"]+)"/);
  const defViMatch = cleanRaw.match(/"definition_vi"\s*:\s*"([^"]+)"/) || cleanRaw.match(/định nghĩa.*?:\s*([^\n\r"]+)/i);
  const defEnMatch = cleanRaw.match(/"definition_en"\s*:\s*"([^"]+)"/);
  const ipaUkMatch = cleanRaw.match(/"ipa_uk"\s*:\s*"([^"]+)"/);
  const ipaUsMatch = cleanRaw.match(/"ipa_us"\s*:\s*"([^"]+)"/);
  const ipaMatch = cleanRaw.match(/"ipa"\s*:\s*"([^"]+)"/);
  const posMatch = cleanRaw.match(/"partOfSpeech"\s*:\s*"([^"]+)"/);

  if (defViMatch || meaningViMatch || fbData) {
    let meaning = meaningViMatch ? meaningViMatch[1] : (defViMatch ? defViMatch[1] : '');
    let defVi = defViMatch ? defViMatch[1] : meaning;

    if (isPlaceholderText(meaning) || meaning.toLowerCase() === originalText.toLowerCase() || meaning.toLowerCase() === cleanWordRoot) {
      meaning = fbData?.meaning_vi || ((defVi && !isPlaceholderText(defVi) && defVi.toLowerCase() !== originalText.toLowerCase()) ? defVi.split(/[:;]/)[0].trim() : originalText);
    }
    if (isPlaceholderText(defVi)) {
      defVi = fbData?.definition_vi || meaning;
    }

    const ipaUk = ipaUkMatch && !isPlaceholderText(ipaUkMatch[1]) ? ipaUkMatch[1] : (ipaMatch && !isPlaceholderText(ipaMatch[1]) ? ipaMatch[1] : (fbData?.ipa_uk || ''));
    const ipaUs = ipaUsMatch && !isPlaceholderText(ipaUsMatch[1]) ? ipaUsMatch[1] : (fbData?.ipa_us || ipaUk);

    // Extract examples via regex if any
    const examples = [];
    const rawExMatches = cleanRaw.match(/"examples"\s*:\s*\[([\s\S]*?)\]/);
    if (rawExMatches) {
      const exItems = rawExMatches[1].match(/"([^"]+)"/g);
      if (exItems) {
        exItems.forEach(item => {
          const val = item.replace(/^"|"$/g, '').trim();
          if (val && !isPlaceholderText(val) && !val.includes('Example sentence')) examples.push(val);
        });
      }
    }
    if (examples.length === 0 && fbData?.examples) {
      examples.push(...fbData.examples);
    }

    // Extract collocations via regex if any
    const collocations = [];
    const collocRegex = /\{\s*"phrase"\s*:\s*"([^"]+)"\s*,\s*"meaning_vi"\s*:\s*"([^"]+)"\s*\}/g;
    let cMatch;
    while ((cMatch = collocRegex.exec(cleanRaw)) !== null) {
      if (!isPlaceholderText(cMatch[1]) && !isPlaceholderText(cMatch[2])) {
        collocations.push({ phrase: cMatch[1], meaning_vi: cMatch[2] });
      }
    }
    if (collocations.length === 0 && fbData?.collocations) {
      collocations.push(...fbData.collocations);
    }

    // Extract word family via regex if any
    const word_family = [];
    const famRegex = /\{\s*"pos"\s*:\s*"([^"]+)"\s*,\s*"word"\s*:\s*"([^"]+)"\s*,\s*"meaning_vi"\s*:\s*"([^"]+)"\s*\}/g;
    let fMatch;
    while ((fMatch = famRegex.exec(cleanRaw)) !== null) {
      const wFam = fMatch[2].trim().toLowerCase();
      if (!isPlaceholderText(fMatch[2]) && !isPlaceholderText(fMatch[3]) && wFam !== originalText.toLowerCase() && wFam !== cleanWordRoot) {
        word_family.push({ pos: fMatch[1], word: fMatch[2], meaning_vi: fMatch[3] });
      }
    }

    return {
      type: 'word',
      original: originalText,
      word: {
        word_root: rootMatch && !isPlaceholderText(rootMatch[1]) ? rootMatch[1] : (fbData?.word_root || originalText),
        ipa_uk: ipaUk,
        ipa_us: ipaUs,
        ipa: ipaUk || ipaUs,
        partOfSpeech: posMatch && !isPlaceholderText(posMatch[1]) ? posMatch[1] : (fbData?.partOfSpeech || 'noun'),
        meaning_vi: meaning,
        definition_vi: defVi,
        definition_en: defEnMatch && !isPlaceholderText(defEnMatch[1]) ? defEnMatch[1] : (fbData?.definition_en || ''),
        collocations,
        word_family,
        other_meanings: fbData?.other_meanings ? [...fbData.other_meanings] : [],
        examples,
        synonyms: fbData?.synonyms ? [...fbData.synonyms] : [],
        antonyms: [],
        level: fbData?.level || 'B1'
      }
    };
  }

  if (isWord && fbData) {
    return buildFallbackWordResponse(originalText, fbData);
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
      const res = await executeGeminiGeneration(apiKey, cachedGeminiModel, prompt, isWord);
      if (res && res.trim()) return res;
    } catch (err) {
      cachedGeminiModel = null;
    }
  }

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash'
  ];

  let lastErr = null;
  for (const model of candidateModels) {
    try {
      const result = await executeGeminiGeneration(apiKey, model, prompt, isWord);
      if (result && result.trim()) {
        cachedGeminiModel = model;
        return result;
      }
    } catch (err) {
      lastErr = err;
      if (err.status === 401 || err.message?.includes('API_KEY_SERVICE_BLOCKED') || err.message?.includes('API Key không hợp lệ')) {
        throw err;
      }
      // On 404, 429, 503, empty response, or timeouts, continue to next model
      continue;
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
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: isWord ? 2048 : 3000
        }
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
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Filter out internal thinking parts (e.g. Gemini 2.5 Flash thinking)
    const textParts = parts.filter(p => !p.thought && typeof p.text === 'string');
    let text = textParts.map(p => p.text).join('').trim();
    if (!text && parts.length > 0) {
      text = parts.map(p => p.text || '').join('').trim();
    }

    if (!text) {
      const reason = candidate?.finishReason || 'EMPTY';
      throw new Error(`Gemini không trả về nội dung (${reason})`);
    }

    return text;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Yêu cầu Gemini API bị quá thời gian chờ (Timeout 14s).');
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
      const res = await executeGroqGeneration(cleanKey, cachedGroqModel, prompt, isWord);
      if (res && res.trim()) return res;
    } catch (err) {
      cachedGroqModel = null;
    }
  }

  const modelsToTry = await getActiveGroqModels(cleanKey);

  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      const result = await executeGroqGeneration(cleanKey, model, prompt, isWord);
      if (result && result.trim()) {
        cachedGroqModel = model;
        return result;
      }
    } catch (err) {
      lastErr = err;
      if (
        err.status === 404 ||
        err.status === 429 ||
        err.status === 413 ||
        err.message?.includes('rỗng') ||
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
        temperature: 0.1,
        max_tokens: isWord ? 2048 : 3000
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
    const content = data.choices?.[0]?.message?.content || '';
    if (!content.trim()) {
      throw new Error('Groq trả về phản hồi rỗng.');
    }
    return content;
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
        temperature: 0.1,
        max_tokens: isWord ? 2048 : 3000
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenAI API lỗi ${res.status}: ${err.error?.message || 'Unknown error'}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content.trim()) throw new Error('OpenAI trả về phản hồi rỗng.');
    return content;
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
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        system: 'You are an English-Vietnamese dictionary adhering strictly to Cambridge Dictionary standards. Output ONLY valid JSON matching the schema.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: isWord ? 2048 : 3000
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Claude API lỗi ${res.status}: ${err.error?.message || 'Unknown error'}`);
    }

    const data = await res.json();
    const content = data.content?.[0]?.text || '';
    if (!content.trim()) throw new Error('Claude trả về phản hồi rỗng.');
    return content;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Yêu cầu Claude API bị quá thời gian chờ (Timeout 12s).');
    }
    throw e;
  }
}
