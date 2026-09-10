// d:/extension/utils/ai-client.js
// Supports Google Gemini, Groq, OpenAI GPT-4o Mini, Claude 3.5 Haiku
// Configured to follow Cambridge Dictionary standards (CALD & Cambridge English-Vietnamese)

import { getCandidateLemmas } from './cambridge-client.js';
import {
  isDescriptiveSentence,
  generateFallbackExamples,
  generateFallbackCollocations,
  generateFallbackFamily
} from './dict-resolver.js';

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

const WORD_PROMPT_EN_VI = (word, dictContext = null) => {
  let groundTruthBlock = '';
  if (dictContext && dictContext.meaning_vi) {
    let otherMeaningsStr = '';
    if (Array.isArray(dictContext.other_meanings) && dictContext.other_meanings.length > 0) {
      otherMeaningsStr = '\n- CÁC NGHĨA KHÁC ĐÃ ĐƯỢC CHỨNG THỰC:\n' +
        dictContext.other_meanings.slice(0, 5).map(m => `  * [${m.pos || 'nghĩa'}] ${m.meaning_vi}${m.definition_en ? ` (${m.definition_en})` : ''}`).join('\n');
    }

    groundTruthBlock = `
DỮ LIỆU TỪ ĐIỂN MẪU ĐÃ ĐƯỢC XÁC THỰC (TỪ ĐIỂN CAMBRIDGE & WIKTIONARY - BẮT BUỘC TUÂN THỦ 100%):
- "meaning_vi" CHÍNH: "${dictContext.meaning_vi}"
${dictContext.ipa_uk || dictContext.ipa ? `- Phiên âm IPA UK: "${dictContext.ipa_uk || dictContext.ipa}"` : ''}
${dictContext.ipa_us ? `- Phiên âm IPA US: "${dictContext.ipa_us}"` : ''}
${dictContext.partOfSpeech ? `- Từ loại: "${dictContext.partOfSpeech}"` : ''}
${dictContext.definition_en ? `- Định nghĩa Cambridge: "${dictContext.definition_en}"` : ''}
${otherMeaningsStr}
BẮT BUỘC: Sử dụng "meaning_vi": "${dictContext.meaning_vi}" làm nghĩa chính. Dùng dữ liệu này để hoàn thiện đầy đủ các trường của mục từ điển theo chuẩn Cambridge.
`;
  }

  return `Bạn là hệ thống từ điển Anh - Việt cao cấp theo chuẩn Cambridge English-Vietnamese Dictionary (dictionary.cambridge.org).
Hãy tra cứu từ tiếng Anh "${word}" và trả về mục từ điển CHÍNH XÁC, THUẦN VIỆT, TỰ NHIÊN NHẤT như cách Cambridge Dictionary trình bày.
${groundTruthBlock}
TIÊU CHUẨN DỊCH NGHĨA THUẦN VIỆT (BẮT BUỘC - CHUẨN TỪ ĐIỂN CAMBRIDGE & OXFORD):
1. "meaning_vi" LÀ TỪ TƯƠNG ĐƯƠNG CHÍNH DANH (LEXICAL EQUIVALENT):
   - Phải là từ hoặc ngữ tiếng Việt chuẩn mực, ngắn gọn (1-3 từ), tự nhiên và chính xác nhất mà người Việt dùng làm tên gọi cho sự vật/hành động.
   - TUYỆT ĐỐI KHÔNG DỊCH CỤM ĐỊNH NGHĨA TIẾNG ANH (Definition Glossing) THÀNH "meaning_vi":
     * "feast" (định nghĩa: "a large meal...") → "meaning_vi" BẮT BUỘC LÀ: "bữa tiệc, yến tiệc" (TUYỆT ĐỐI CẤM dịch: "bữa ăn lớn")!
     * "drought" (định nghĩa: "a long period of dry weather...") → "meaning_vi" BẮT BUỘC LÀ: "hạn hán" (TUYỆT ĐỐI CẤM dịch: "thời kỳ khô hạn")!
     * "famine" (định nghĩa: "extreme scarcity of food...") → "meaning_vi" BẮT BUỘC LÀ: "nạn đói" (TUYỆT ĐỐI CẤM dịch: "sự thiếu thức ăn")!
     * "pedestrian" (định nghĩa: "a person walking along a road...") → "meaning_vi" BẮT BUỘC LÀ: "người đi bộ" (CẤM: "người đi trên đường")!
     * "sibling" (định nghĩa: "a brother or sister...") → "meaning_vi" BẮT BUỘC LÀ: "anh chị em ruột" (CẤM: "người có chung cha mẹ")!
     * "beverage" (định nghĩa: "a drink...") → "meaning_vi" BẮT BUỘC LÀ: "thức uống, đồ uống" (CẤM dịch dài dòng)!
     * "bachelor" (định nghĩa: "an unmarried man...") → "meaning_vi" BẮT BUỘC LÀ: "người độc thân, cử nhân" (CẤM: "người đàn ông chưa kết hôn")!
     * "car" → "xe hơi, ô tô" (TUYỆT ĐỐI CẤM: "máy xe")!
     * "petrol" → "xăng, dầu xăng" (TUYỆT ĐỐI CẤM: "nơn" hay bịa từ)!
     * "software" → "phần mềm" (TUYỆT ĐỐI CẤM: "tựa ứng")!
     * "hardware" → "phần cứng"!
     * "abandon" → "từ bỏ, bỏ rơi"!
     * "table" → "cái bàn"!
     * "become" → "trở thành, trở nên"!
     * "significant" → "đáng kể, quan trọng"!
     * "compromise" → "thỏa hiệp, dàn xếp; làm tổn hại"!
     * "deadline" → "hạn chót, thời hạn"!
     * "resilience" → "sự kiên cường, khả năng phục hồi"!
     * "sustainable" → "bền vững"!
2. NGUYÊN TẮC THUẦN VIỆT:
   - Dùng từ ngữ tự nhiên, phổ biến trong tiếng Việt hiện đại. Tuyệt đối không dịch máy móc thô ráp (word-by-word), không bịa từ, không dùng từ Hán-Việt tối nghĩa nếu đã có từ thuần Việt tương đương.
3. "definition_vi": Giải thích câu định nghĩa chi tiết bằng tiếng Việt (1 câu ngắn gọn, chuẩn xác ngữ nghĩa).
4. "definition_en": Định nghĩa tiếng Anh chuẩn Cambridge Learner's Dictionary.

TIÊU CHUẨN MỤC TỪ ĐIỂN (GIỮ NGUYÊN ĐẦY ĐỦ CẤU TRÚC):
1. "word_root": Dạng nguyên thể (lemma) của "${word}".
2. "ipa_uk": Phiên âm UK chuẩn Cambridge, ví dụ "/teɪ.bəl/".
3. "ipa_us": Phiên âm US chuẩn Cambridge, ví dụ "/teɪ.bəl/".
4. "partOfSpeech": Từ loại chuẩn Cambridge ("noun [C]", "verb [T]", "adjective"...).
5. "level": Cấp độ CEFR (A1, A2, B1, B2, C1, C2).
6. "meaning_vi": Bản dịch tiếng Việt NGẮN GỌN, SÁT NGHĨA, THUẦN VIỆT theo chuẩn Cambridge (xem ví dụ ở trên). TUYỆT ĐỐI KHÔNG trả về "nghĩa tiếng Việt" hay khuôn mẫu!
7. "definition_vi": Giải thích nghĩa bằng tiếng Việt (1-2 câu ngắn).
8. "definition_en": Định nghĩa tiếng Anh ngắn gọn theo Cambridge.
9. "examples": 2 câu ví dụ tiếng Anh tự nhiên.
10. "word_family": Từ cùng gốc [{"pos": "...", "word": "...", "meaning_vi": "..."}]. Mảng rỗng [] nếu không có. KHÔNG lặp "${word}", KHÔNG tự chế từ.
11. "other_meanings": Các nghĩa khác [{"pos": "...", "meaning_vi": "bản dịch ngắn gọn", "definition_en": "English definition"}].
12. "collocations": 2-3 cụm từ thông dụng [{"phrase": "...", "meaning_vi": "..."}].
13. "synonyms": 2-4 từ đồng nghĩa TIẾNG ANH. KHÔNG dùng tiếng Việt.
14. "antonyms": 1-3 từ trái nghĩa TIẾNG ANH (nếu có, hoặc [] nếu không có).

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
    return `Bạn là chuyên gia dịch thuật ngôn ngữ Anh - Việt theo tiêu chuẩn Cambridge English.
Hãy dịch đoạn văn tiếng Việt sau sang tiếng Anh tự nhiên, mượt mà và chuẩn bản ngữ:
"""
${text}
"""

YÊU CẦU:
1. "translation": Bản dịch tiếng Anh chuẩn xác, mượt mà, đúng ngữ pháp và cách diễn đạt tự nhiên theo chuẩn Cambridge (native English).
2. "natural_alternative": Cách diễn đạt tiếng Anh tự nhiên khác (nếu có sắc thái trang trọng hơn hoặc đời thường hơn).
3. "key_vocabulary": Mảng 2-5 từ vựng/cụm từ tiếng Anh hay nhất trong câu, cấu trúc:
   [{"word": "từ/cụm từ tiếng Anh", "ipa": "/phiên âm IPA/", "pos": "noun/verb/adj/idiom", "meaning_vi": "nghĩa tiếng Việt"}]
4. "explanation": Phân tích ngắn gọn về cấu trúc câu, ngữ pháp và collocations đã dùng. BẮT BUỘC VIẾT 100% BẰNG TIẾNG VIỆT.
5. Giữ nguyên cấu trúc xuống dòng (\\n) nếu văn bản gốc có nhiều dòng.
6. Tuyệt đối KHÔNG điền dấu ba chấm (...).

Trả về DUY NHẤT một JSON hợp lệ theo đúng cấu trúc:
{
  "type": "phrase",
  "translation": "<Bản dịch tiếng Anh mượt mà, chuẩn ngữ pháp>",
  "natural_alternative": "<Cách diễn đạt tự nhiên khác nếu có>",
  "key_vocabulary": [
    {"word": "word", "ipa": "/ipa/", "pos": "pos", "meaning_vi": "nghĩa"}
  ],
  "explanation": "<Phân tích ngữ pháp và collocations viết 100% bằng tiếng Việt>"
}`;
  }

  return `Bạn là chuyên gia dịch thuật và ngôn ngữ học Anh - Việt cao cấp theo tiêu chuẩn Từ điển Cambridge.
Hãy dịch câu/đoạn văn tiếng Anh sau sang tiếng Việt một cách THUẦN VIỆT, TỰ NHIÊN, CHUẨN XÁC:
"""
${text}
"""

TIÊU CHÍ BẢN DỊCH:
1. "translation": Bản dịch tiếng Việt mượt mà, thoát ý, thuần Việt, đúng văn phong người Việt nói và viết. Tuyệt đối KHÔNG dịch máy móc thô cứng từng từ một (word-by-word).
2. "natural_alternative": Cách diễn đạt tiếng Việt tự nhiên khác (hoặc văn phong mềm mại hơn/chuyên ngành hơn nếu có).
3. "key_vocabulary": Bóc tách 2-5 từ vựng, phrasal verbs, idioms hoặc collocations trọng tâm trong câu để người học tra cứu, cấu trúc:
   [
     {
       "word": "từ hoặc cụm từ tiếng Anh nguyên mẫu",
       "ipa": "/phiên âm IPA chuẩn/",
       "pos": "từ loại (noun, verb, phrasal verb, idiom...)",
       "meaning_vi": "nghĩa tiếng Việt chính xác trong ngữ cảnh câu này"
     }
   ]
4. "explanation": Phân tích cấu trúc câu, ngữ pháp nổi bật, sắc thái từ ngữ hoặc lưu ý lỗi chính tả/dễ nhầm lẫn (nếu có).
   QUY TẮC CỐT LÕI: Phần "explanation" BẮT BUỘC PHẢI VIẾT 100% HOÀN TOÀN BẰNG TIẾNG VIỆT. TUYỆT ĐỐI KHÔNG giải thích bằng tiếng Anh!
5. Giữ nguyên cấu trúc xuống dòng (\\n) nếu văn bản gốc có nhiều dòng.
6. Tuyệt đối KHÔNG điền dấu ba chấm (...).

Trả về DUY NHẤT một JSON hợp lệ theo đúng cấu trúc:
{
  "type": "phrase",
  "translation": "<Bản dịch tiếng Việt thuần Việt, tự nhiên, chuẩn mực>",
  "natural_alternative": "<Cách diễn đạt tự nhiên khác>",
  "key_vocabulary": [
    {"word": "từ tiếng Anh", "ipa": "/phiên âm/", "pos": "từ loại", "meaning_vi": "nghĩa tiếng Việt ngữ cảnh"}
  ],
  "explanation": "<Phân tích ngữ pháp và sắc thái viết 100% bằng tiếng Việt>"
}`;
};

export async function callAI(provider, apiKey, text, isWord, direction = 'auto', dictContext = null) {
  const isVi = direction === 'vi-en' || (direction === 'auto' && VIETNAMESE_REGEX.test(text));
  let prompt;
  if (isWord) {
    prompt = isVi ? WORD_PROMPT_VI_EN(text) : WORD_PROMPT_EN_VI(text, dictContext);
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

  return safeParseJSON(rawText, isWord, text, dictContext);
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

  // Strip dangling unclosed keys or values at the end of truncated JSON
  cleaned = cleaned.replace(/,\s*"?[a-zA-Z0-9_]*"?\s*(?::\s*"?[^"]*)?$/, '').trim();

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

  // Deep cutback: find last valid comma before truncation and close braces
  const lastComma = cleaned.lastIndexOf(',');
  if (lastComma > 0) {
    const sub = cleaned.slice(0, lastComma);
    let subBraces = 0, subBrackets = 0;
    for (const c of sub) {
      if (c === '{') subBraces++;
      else if (c === '}') subBraces--;
      else if (c === '[') subBrackets++;
      else if (c === ']') subBrackets--;
    }
    let subCleaned = sub;
    while (subBrackets > 0) { subCleaned += ']'; subBrackets--; }
    while (subBraces > 0) { subCleaned += '}'; subBraces--; }
    try {
      return JSON.parse(subCleaned);
    } catch (_) {}
  }

  return null;
}

export function safeParseJSON(rawText, isWord, originalText, dictContext = null) {
  const initialFallback = findFallbackData(originalText);

  if (!rawText || !rawText.trim()) {
    if (isWord && dictContext && dictContext.meaning_vi) {
      return {
        type: 'word',
        source: 'dictionary',
        original: originalText,
        word: { ...dictContext }
      };
    }
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
    let naturalAlternative = '';
    let explanation = '';
    let keyVocabulary = [];

    if (parsed && typeof parsed.translation === 'string' && parsed.translation.trim()) {
      translation = parsed.translation.trim();
      explanation = parsed.explanation || '';
      if (typeof parsed.natural_alternative === 'string') {
        naturalAlternative = parsed.natural_alternative.trim();
      }

      if (Array.isArray(parsed.key_vocabulary)) {
        keyVocabulary = parsed.key_vocabulary
          .filter(item => item && typeof item === 'object')
          .map(item => ({
            word: String(item.word || '').trim(),
            ipa: String(item.ipa || '').trim(),
            pos: String(item.pos || '').trim(),
            meaning_vi: String(item.meaning_vi || '').trim()
          }))
          .filter(item => item.word.length > 0 && item.meaning_vi.length > 0 && !isPlaceholderText(item.word) && !isPlaceholderText(item.meaning_vi));
      }
    } else {
      const transMatch = cleanRaw.match(/"translation"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"natural_alternative"|,\s*"key_vocabulary"|,\s*"explanation"|\})/i) ||
                         cleanRaw.match(/"translation"\s*:\s*"([\s\S]*?)"/i) ||
                         cleanRaw.match(/(?:bản dịch|translation|dịch)\s*:\s*([\s\S]+?)(?:\n\s*(?:giải thích|phân tích|explanation)|$)/i);

      if (transMatch && transMatch[1].trim()) {
        translation = transMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .trim();
      }

      const altMatch = cleanRaw.match(/"natural_alternative"\s*:\s*"([\s\S]*?)"/i);
      if (altMatch && altMatch[1].trim()) {
        naturalAlternative = altMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
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
      natural_alternative: naturalAlternative,
      key_vocabulary: keyVocabulary,
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

    // STRICT GROUND-TRUTH ENFORCEMENT & DESCRIPTIVE SENTENCE PROTECTION:
    if (dictContext) {
      const isBadSentence = isPlaceholderText(dictContext.meaning_vi) || isDescriptiveSentence(dictContext.meaning_vi);

      const mViStr = typeof w.meaning_vi === 'string' ? w.meaning_vi.trim().toLowerCase() : '';
      const origStr = typeof originalText === 'string' ? originalText.trim().toLowerCase() : '';
      const aiMeaningBad = !mViStr || isPlaceholderText(w.meaning_vi) ||
        (origStr && mViStr === origStr) ||
        (cleanRoot && mViStr === cleanRoot) ||
        isDescriptiveSentence(w.meaning_vi);

      // If AI generated a bad meaning or placeholder, adopt dictContext
      if (aiMeaningBad) {
        if (!isBadSentence && dictContext.meaning_vi) {
          w.meaning_vi = dictContext.meaning_vi;
        } else if (isBadSentence && (!w.definition_vi || isPlaceholderText(w.definition_vi))) {
          w.definition_vi = dictContext.meaning_vi;
        }
      } else if (!isBadSentence && dictContext.meaning_vi && (!w.meaning_vi || isPlaceholderText(w.meaning_vi))) {
        w.meaning_vi = dictContext.meaning_vi;
      }

      if (dictContext.ipa_uk && (!w.ipa_uk || isPlaceholderText(w.ipa_uk))) {
        w.ipa_uk = dictContext.ipa_uk;
      }
      if (dictContext.ipa_us && (!w.ipa_us || isPlaceholderText(w.ipa_us))) {
        w.ipa_us = dictContext.ipa_us;
      }
      if (dictContext.ipa && (!w.ipa || isPlaceholderText(w.ipa))) {
        w.ipa = dictContext.ipa;
        if (!w.ipa_uk) w.ipa_uk = dictContext.ipa;
        if (!w.ipa_us) w.ipa_us = dictContext.ipa;
      }
      if (dictContext.partOfSpeech && (!w.partOfSpeech || isPlaceholderText(w.partOfSpeech))) {
        w.partOfSpeech = dictContext.partOfSpeech;
      }
      if (dictContext.definition_en && (!w.definition_en || isPlaceholderText(w.definition_en))) {
        w.definition_en = dictContext.definition_en;
      }
      if (dictContext.definition_vi && (!w.definition_vi || isPlaceholderText(w.definition_vi))) {
        w.definition_vi = dictContext.definition_vi;
      }
      if ((!w.other_meanings || w.other_meanings.length === 0) && Array.isArray(dictContext.other_meanings) && dictContext.other_meanings.length > 0) {
        w.other_meanings = [...dictContext.other_meanings];
      }
      if ((!w.examples || w.examples.length === 0) && Array.isArray(dictContext.examples) && dictContext.examples.length > 0) {
        w.examples = [...dictContext.examples];
      }
      if ((!w.collocations || w.collocations.length === 0) && Array.isArray(dictContext.collocations) && dictContext.collocations.length > 0) {
        w.collocations = [...dictContext.collocations];
      }
      if ((!w.synonyms || w.synonyms.length === 0) && Array.isArray(dictContext.synonyms) && dictContext.synonyms.length > 0) {
        w.synonyms = [...dictContext.synonyms];
      }
      if ((!w.word_family || w.word_family.length === 0) && Array.isArray(dictContext.word_family) && dictContext.word_family.length > 0) {
        w.word_family = [...dictContext.word_family];
      }
    }

    // 1. Sanitize meaning_vi
    const mViStr = typeof w.meaning_vi === 'string' ? w.meaning_vi.trim().toLowerCase() : '';
    const origStr = typeof originalText === 'string' ? originalText.trim().toLowerCase() : '';
    let isMeaningBad = !mViStr || isPlaceholderText(w.meaning_vi) ||
      (origStr && mViStr === origStr) ||
      (cleanRoot && mViStr === cleanRoot);

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

    // GUARANTEE NO EMPTY SECTIONS:
    if (!w.examples || w.examples.length === 0) {
      w.examples = generateFallbackExamples(cleanRoot, w.partOfSpeech);
    }
    if (!w.collocations || w.collocations.length === 0) {
      w.collocations = generateFallbackCollocations(cleanRoot, w.partOfSpeech, w.synonyms, w.meaning_vi);
    }
    if (!w.word_family || w.word_family.length === 0) {
      w.word_family = generateFallbackFamily(cleanRoot, w.partOfSpeech, w.meaning_vi);
    }
    if ((!w.synonyms || w.synonyms.length === 0) && dictContext?.synonyms?.length) {
      w.synonyms = dictContext.synonyms.slice(0, 4);
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

  if (isWord) {
    if (dictContext && dictContext.meaning_vi) {
      return {
        type: 'word',
        source: 'dictionary',
        original: originalText,
        word: { ...dictContext }
      };
    }
    if (fbData) {
      return buildFallbackWordResponse(originalText, fbData);
    }
    return {
      type: 'word',
      source: 'dictionary',
      original: originalText,
      word: {
        word_root: cleanWordRoot || originalText,
        meaning_vi: meaningViMatch ? meaningViMatch[1] : (defViMatch ? defViMatch[1] : originalText),
        partOfSpeech: posMatch ? posMatch[1] : 'word',
        ipa_uk: ipaUkMatch ? ipaUkMatch[1] : '',
        ipa_us: ipaUsMatch ? ipaUsMatch[1] : '',
        definition_vi: defViMatch ? defViMatch[1] : (meaningViMatch ? meaningViMatch[1] : originalText),
        definition_en: defEnMatch ? defEnMatch[1] : '',
        examples: [],
        collocations: [],
        word_family: [],
        synonyms: []
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
      const res = await executeGeminiGeneration(apiKey, cachedGeminiModel, prompt, isWord);
      if (res && res.trim()) return res;
    } catch (err) {
      cachedGeminiModel = null;
    }
  }

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
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
      if (
        err.status === 401 ||
        err.status === 400 ||
        err.reason === 'API_KEY_SERVICE_BLOCKED' ||
        err.reason === 'SERVICE_DISABLED' ||
        err.message?.includes('Google Cloud Project') ||
        err.message?.includes('API Key')
      ) {
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
        systemInstruction: {
          parts: [{
            text: isWord
              ? "Bạn là chuyên gia biên soạn từ điển Anh - Việt cao cấp theo chuẩn Từ điển Cambridge & Oxford. Nhiệm vụ của bạn là cung cấp mục từ điển chuẩn xác, tự nhiên, thuần Việt nhất: 'meaning_vi' BẮT BUỘC là từ/ngữ tiếng Việt tương đương chính danh (Lexical Equivalent), ngắn gọn (1-3 từ). TUYỆT ĐỐI KHÔNG dịch nguyên văn câu định nghĩa tiếng Anh thành 'meaning_vi' (Ví dụ: 'feast' PHẢI dịch là 'bữa tiệc, yến tiệc', TUYỆT ĐỐI KHÔNG dịch là 'bữa ăn lớn'; 'drought' PHẢI dịch là 'hạn hán', KHÔNG dịch là 'thời kỳ khô hạn'). Luôn trả về DUY NHẤT một JSON hợp lệ theo đúng schema được yêu cầu."
              : "Bạn là chuyên gia dịch thuật và ngôn ngữ học Anh - Việt cao cấp. Khi dịch câu hoặc đoạn văn sang tiếng Việt, phải dịch thật tự nhiên, thuần Việt, mượt mà và đúng ngữ cảnh nhất (không dịch thô word-by-word). Bóc tách 2-5 từ vựng hoặc cụm từ trọng tâm trong câu. Toàn bộ phần giải thích, phân tích ngữ pháp và nghĩa từ vựng BẮT BUỘC viết 100% HOÀN TOÀN BẰNG TIẾNG VIỆT, tuyệt đối không giải thích bằng tiếng Anh. Trả về DUY NHẤT một JSON hợp lệ theo đúng schema."
          }]
        },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: isWord ? 3500 : 4096
        }
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const rawMsg = errData.error?.message || '';

      // Deeply search details array for reason, help links, and project info
      let reason = '';
      let projectId = '';
      let helpUrl = '';

      if (Array.isArray(errData.error?.details)) {
        for (const item of errData.error.details) {
          if (item.reason && !reason) reason = item.reason;
          if (item.metadata?.consumer && !projectId) {
            const m = item.metadata.consumer.match(/projects\/(.+)/);
            if (m) projectId = m[1];
          }
          if (Array.isArray(item.links)) {
            for (const link of item.links) {
              if (link.url && !helpUrl) helpUrl = link.url;
            }
          }
        }
      }

      if (!projectId) {
        const pMatch = rawMsg.match(/project[=\s/]+([0-9a-zA-Z\-_]+)/i);
        if (pMatch) projectId = pMatch[1];
      }

      if (!helpUrl) {
        const urlMatch = rawMsg.match(/https:\/\/[^\s\)]+/i);
        if (urlMatch) helpUrl = urlMatch[0];
      }

      const directActivationUrl = helpUrl || (projectId
        ? `https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=${projectId}`
        : 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');

      const credentialsUrl = projectId
        ? `https://console.cloud.google.com/apis/credentials?project=${projectId}`
        : 'https://console.cloud.google.com/apis/credentials';

      // 1. API Disabled in Google Cloud Project
      if (reason === 'SERVICE_DISABLED' || rawMsg.includes('has not been used in project') || rawMsg.includes('disabled')) {
        const projectDesc = projectId ? `Project ID #${projectId}` : 'Google Cloud Project';
        const err = new Error(
          `Google Cloud Project (${projectDesc}) chưa BẬT Generative Language API.\n\n` +
          `👉 Bước 1: Mở link sau để BẬT ngay cho đúng project:\n${directActivationUrl}\n\n` +
          `👉 Bước 2: Bấm nút "ENABLE" (BẬT).\n\n` +
          `👉 Bước 3: Đợi 2-3 phút để Google đồng bộ hệ thống trước khi thử lại.\n` +
          `(Lưu ý: Nếu đăng nhập nhiều tài khoản Google, hãy kiểm tra góc trên bên phải Google Cloud xem đúng Gmail tạo key chưa).`
        );
        err.status = res.status;
        err.reason = 'SERVICE_DISABLED';
        err.projectId = projectId;
        err.activationUrl = directActivationUrl;
        err.credentialsUrl = credentialsUrl;
        err.rawMsg = rawMsg;
        err.rawJson = errData;
        throw err;
      }

      // 2. API Key is restricted in Credentials
      if (reason === 'API_KEY_SERVICE_BLOCKED' || rawMsg.includes('blocked')) {
        const err = new Error(
          `API Key này đang bị Google Cloud CHẶN do thiết lập hạn chế (API restrictions).\n\n` +
          `👉 Cách sửa triệt để (1 phút):\n` +
          `1. Vào trang Quản lý Key: ${credentialsUrl}\n` +
          `2. Bấm vào tên API Key của bạn để mở cài đặt.\n` +
          `3. Tại mục "API restrictions" (Hạn chế API) -> Chọn "Don't restrict key" (Không hạn chế khóa), hoặc tích chọn thêm "Generative Language API".\n` +
          `4. Bấm "Save" (Lưu) ở dưới cùng rồi thử lại sau 1-2 phút.`
        );
        err.status = res.status;
        err.reason = 'API_KEY_SERVICE_BLOCKED';
        err.projectId = projectId;
        err.activationUrl = directActivationUrl;
        err.credentialsUrl = credentialsUrl;
        err.rawMsg = rawMsg;
        err.rawJson = errData;
        throw err;
      }

      // 3. API Key Invalid
      if (res.status === 400 || reason === 'API_KEY_INVALID' || rawMsg.includes('API key not valid')) {
        const err = new Error('API Key không hợp lệ. Vui lòng kiểm tra lại key đã sao chép từ Google AI Studio (không thừa khoảng trắng hoặc thiếu ký tự).');
        err.status = 400;
        err.reason = 'API_KEY_INVALID';
        err.rawMsg = rawMsg;
        err.rawJson = errData;
        throw err;
      }

      // 4. Unauthorized / Invalid auth method
      if (res.status === 401 || reason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED') {
        const err = new Error('API Key sai hoặc không được cấp quyền (401). Vui lòng kiểm tra lại key.');
        err.status = 401;
        err.reason = 'UNAUTHORIZED';
        err.rawMsg = rawMsg;
        err.rawJson = errData;
        throw err;
      }

      // 5. Rate limit / Quota exceeded
      if (res.status === 429 || reason === 'RESOURCE_EXHAUSTED') {
        const err = new Error('Đã vượt quá hạn ngạch gọi miễn phí của Gemini (Rate limit 429). Vui lòng đợi 1 phút hoặc chuyển sang Groq.');
        err.status = 429;
        err.reason = 'RESOURCE_EXHAUSTED';
        err.rawMsg = rawMsg;
        err.rawJson = errData;
        throw err;
      }

      // 6. Model Not Found
      if (res.status === 404) {
        const err = new Error(`Model ${cleanModel} không tìm thấy (404)`);
        err.status = 404;
        err.reason = 'NOT_FOUND';
        err.rawMsg = rawMsg;
        err.rawJson = errData;
        throw err;
      }

      // 7. General Permission Denied (e.g. Workspace Org Policy)
      if (res.status === 403) {
        const err = new Error(
          `Google từ chối quyền truy cập (403 Forbidden). ` +
          `Nếu bạn dùng email trường học (@edu) hoặc công ty, quản trị viên có thể đã chặn dịch vụ AI. ` +
          `Vui lòng thử dùng tài khoản Gmail cá nhân (@gmail.com) để lấy API key.`
        );
        err.status = 403;
        err.reason = 'PERMISSION_DENIED';
        err.rawMsg = rawMsg;
        err.rawJson = errData;
        throw err;
      }

      const err = new Error(`Gemini API lỗi ${res.status}: ${rawMsg || 'Lỗi HTTP'}`);
      err.status = res.status;
      err.rawMsg = rawMsg;
      err.rawJson = errData;
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

const GROQ_FALLBACK_CANDIDATES = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.6-27b',
  'llama-3.2-3b-preview',
  'llama-3.2-1b-preview',
  'llama-3.3-70b-versatile'
];

let dynamicGroqModels = null;
let lastGroqModelFetch = 0;

export async function getAvailableGroqModels(apiKey) {
  const now = Date.now();
  if (dynamicGroqModels && (now - lastGroqModelFetch < 3600000)) {
    return dynamicGroqModels;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        const chatModels = data.data
          .map(m => m.id)
          .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('embed') && !id.includes('tts') && !id.includes('vision'));

        const preferredOrder = [
          'openai/gpt-oss-20b',
          'openai/gpt-oss-120b',
          'qwen/qwen3.6-27b',
          'llama-3.2-3b-preview',
          'llama-3.2-1b-preview',
          'llama-3.3-70b-versatile'
        ];
        chatModels.sort((a, b) => {
          const idxA = preferredOrder.indexOf(a);
          const idxB = preferredOrder.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });

        if (chatModels.length > 0) {
          dynamicGroqModels = chatModels;
          lastGroqModelFetch = now;
          return dynamicGroqModels;
        }
      }
    }
  } catch (_) {}
  return GROQ_FALLBACK_CANDIDATES;
}

let cachedGroqModel = null;

async function callGroq(apiKey, prompt, isWord) {
  const cleanKey = apiKey.trim();

  // 1. Try cached working model first (0ms discovery overhead)
  if (cachedGroqModel) {
    try {
      const res = await executeGroqGeneration(cleanKey, cachedGroqModel, prompt, isWord);
      if (res && res.trim()) return res;
    } catch (err) {
      cachedGroqModel = null;
    }
  }

  const modelsToTry = await getAvailableGroqModels(cleanKey);

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
      // On 404, 429 (rate limit), 413, or 400 (decommissioned/unsupported model), try next model
      if (
        err.status === 404 ||
        err.status === 429 ||
        err.status === 413 ||
        err.message?.includes('rỗng') ||
        (err.status === 400 && (
          err.message?.toLowerCase().includes('model') ||
          err.message?.toLowerCase().includes('decommissioned') ||
          err.message?.toLowerCase().includes('rate limit') ||
          err.message?.toLowerCase().includes('not supported')
        ))
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
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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
          {
            role: 'system',
            content: isWord
              ? "You are an elite bilingual lexicographer for Cambridge English-Vietnamese Dictionary. Provide authentic, natural, culturally idiomatic Vietnamese translations ('thuần Việt') matching Cambridge and Oxford published dictionaries. Crucial rule: In 'meaning_vi', ALWAYS provide the concise lexical headword equivalent (e.g. 'feast' -> 'bữa tiệc, yến tiệc', never 'bữa ăn lớn'; 'drought' -> 'hạn hán', never 'thời kỳ khô hạn'; 'sibling' -> 'anh chị em ruột'). Never translate the English definition phrase literally into 'meaning_vi'. Output ONLY a valid JSON object matching the requested schema."
              : 'You are an elite English-Vietnamese translator and linguist. Produce the most natural, idiomatic, culturally authentic Vietnamese translations possible (thuần Việt, mượt mà, thoát ý). Extract key vocabulary in the sentence. All explanations, linguistic analysis, and vocabulary meanings MUST be written 100% in VIETNAMESE, never in English. Output ONLY a valid JSON object matching the requested schema.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: isWord ? 2500 : 3500
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
          {
            role: 'system',
            content: isWord
              ? "You are an elite bilingual lexicographer for Cambridge English-Vietnamese Dictionary. In 'meaning_vi', ALWAYS provide the concise lexical headword equivalent in natural Vietnamese (e.g. 'feast' -> 'bữa tiệc, yến tiệc', never 'bữa ăn lớn'). Never translate the English definition phrase literally into 'meaning_vi'. Output ONLY a valid JSON object."
              : 'You are an elite English-Vietnamese translator and linguist. Produce the most natural, idiomatic, culturally authentic Vietnamese translations (thuần Việt, mượt mà). Extract key vocabulary. All explanations and vocabulary meanings MUST be 100% in VIETNAMESE. Output ONLY a valid JSON object.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: isWord ? 1000 : 1800
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
        system: isWord
          ? "You are an elite bilingual lexicographer for Cambridge English-Vietnamese Dictionary. In 'meaning_vi', ALWAYS provide the concise lexical headword equivalent in natural Vietnamese (e.g. 'feast' -> 'bữa tiệc, yến tiệc', never 'bữa ăn lớn'). Never translate the English definition phrase literally into 'meaning_vi'. Output ONLY valid JSON matching the schema."
          : 'You are an elite English-Vietnamese translator and linguist. Translate into authentic, natural Vietnamese (thuần Việt). Extract key vocabulary. All explanations and vocabulary meanings MUST be 100% in VIETNAMESE. Output ONLY valid JSON matching the schema.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: isWord ? 1000 : 1800
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

/**
 * Diagnostic helper: directly tests an AI provider connection and returns
 * structured status, error reason, project info, and actionable resolution links.
 */
export async function testDirectAI(provider, apiKey) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    return {
      success: false,
      provider,
      status: 400,
      message: `Chưa nhập API Key cho ${provider}. Vui lòng nhập key trước khi kiểm tra.`
    };
  }

  const startTime = Date.now();

  if (provider === 'gemini') {
    try {
      const result = await callGemini(cleanKey, 'Ping test. Output JSON: {"status": "ok"}', false);
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        provider: 'gemini',
        model: cachedGeminiModel || 'gemini-2.0-flash',
        latencyMs,
        message: `Kết nối thành công! Google Gemini (${cachedGeminiModel || 'gemini-2.0-flash'}) phản hồi sau ${latencyMs}ms.`
      };
    } catch (err) {
      return {
        success: false,
        provider: 'gemini',
        status: err.status || 500,
        reason: err.reason || 'UNKNOWN_ERROR',
        projectId: err.projectId || '',
        activationUrl: err.activationUrl || '',
        credentialsUrl: err.credentialsUrl || '',
        message: err.message || 'Lỗi không xác định khi gọi Gemini API',
        rawMsg: err.rawMsg || '',
        rawJson: err.rawJson || null
      };
    }
  }

  if (provider === 'groq') {
    try {
      await callGroq(cleanKey, 'Ping test. Output JSON: {"status": "ok"}', false);
      const latencyMs = Date.now() - startTime;
      const displayModel = cachedGroqModel || 'openai/gpt-oss-20b';
      return {
        success: true,
        provider: 'groq',
        model: displayModel,
        latencyMs,
        message: `Kết nối thành công! Groq AI (${displayModel}) phản hồi sau ${latencyMs}ms.`
      };
    } catch (err) {
      return {
        success: false,
        provider: 'groq',
        status: err.status || 500,
        message: err.message || 'Lỗi kết nối Groq API'
      };
    }
  }

  if (provider === 'openai') {
    try {
      await callOpenAI(cleanKey, 'Ping test. Output JSON: {"status": "ok"}', false);
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        provider: 'openai',
        model: 'gpt-4o-mini',
        latencyMs,
        message: `Kết nối thành công! OpenAI GPT-4o Mini phản hồi sau ${latencyMs}ms.`
      };
    } catch (err) {
      return {
        success: false,
        provider: 'openai',
        status: err.status || 500,
        message: err.message || 'Lỗi kết nối OpenAI API'
      };
    }
  }

  if (provider === 'claude') {
    try {
      await callClaude(cleanKey, 'Ping test. Output JSON: {"status": "ok"}', false);
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        provider: 'claude',
        model: 'claude-3-5-haiku',
        latencyMs,
        message: `Kết nối thành công! Anthropic Claude phản hồi sau ${latencyMs}ms.`
      };
    } catch (err) {
      return {
        success: false,
        provider: 'claude',
        status: err.status || 500,
        message: err.message || 'Lỗi kết nối Claude API'
      };
    }
  }

  return {
    success: false,
    provider,
    status: 400,
    message: `Provider không được hỗ trợ: ${provider}`
  };
}

