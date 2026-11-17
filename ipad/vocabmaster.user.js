// ==UserScript==
// @name         VocabMaster AI — Dịch Thuần Việt & Lưu Sổ Chung (Safari iPad)
// @namespace    https://github.com/khongphaifu/VocabMaster-AI
// @version      1.1.0
// @description  Bôi đen từ/câu bất kỳ trên mọi website ở Safari iPad -> hiện nút ✨ dịch AI Thuần Việt + đồng bộ 2 chiều thẳng về Sổ Chrome PC & iPad PWA!
// @author       VocabMaster AI
// @match        *://*/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM.xmlHttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @connect      *
// @downloadURL  https://khongphaifu.github.io/VocabMaster-AI/ipad/vocabmaster.user.js
// @updateURL    https://khongphaifu.github.io/VocabMaster-AI/ipad/vocabmaster.user.js
// ==/UserScript==

(function () {
  'use strict';
  if (window.__VM_SAFARI_USERSCRIPT_LOADED__) return;
  // Avoid double UI if Chrome/Orion extension content script is already running on the page
  if (typeof window.__VOCAB_MASTER_CLEANUP__ === 'function') return;
  window.__VM_SAFARI_USERSCRIPT_LOADED__ = true;

  // =========================================================================
  // 1. GM STORAGE & CORS-BYPASS HTTP ADAPTER (Safari Userscripts App Store)
  // =========================================================================
  async function gmGet(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue(key, fallback);
      if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') return await GM.getValue(key, fallback);
    } catch (_) {}
    try {
      const v = localStorage.getItem('vm_us_' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch (_) { return fallback; }
  }

  async function gmSet(key, val) {
    try {
      if (typeof GM_setValue === 'function') { GM_setValue(key, val); return; }
      if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') { await GM.setValue(key, val); return; }
    } catch (_) {}
    try { localStorage.setItem('vm_us_' + key, JSON.stringify(val)); } catch (_) {}
  }

  function gmRequest(url, options = {}) {
    const reqFn = typeof GM_xmlhttpRequest === 'function'
      ? GM_xmlhttpRequest
      : (typeof GM !== 'undefined' && typeof GM.xmlHttpRequest === 'function' ? GM.xmlHttpRequest : null);

    if (!reqFn) {
      return fetch(url, options).then(async (r) => ({
        ok: r.ok,
        status: r.status,
        text: await r.text()
      }));
    }

    return new Promise((resolve, reject) => {
      reqFn({
        method: options.method || 'GET',
        url,
        headers: options.headers || {},
        data: options.body || undefined,
        timeout: options.timeout || 12000,
        onload: (res) => resolve({
          ok: res.status >= 200 && res.status < 300,
          status: res.status,
          text: res.responseText || ''
        }),
        onerror: (err) => reject(new Error(err?.error || 'Network error')),
        ontimeout: () => reject(new Error('Request timeout'))
      });
    });
  }

  // =========================================================================
  // 2. SHARED PURE VIETNAMESE LEXICON & CLOUD MERGE ENGINE (Auto-generated)
  // =========================================================================
// d:/extension/utils/modern-lexicon.js
// Bộ Từ điển Chuẩn Thuần Việt Hiện Đại cho VocabMaster AI
// Giải quyết triệt để vấn đề dịch sượng trân, cổ xưa (lời rao, cáo thị, giám đốc trường...)
const ARCHAIC_BLACKLIST = [
  'lời rao', 'lời loan báo', 'cáo thị', 'giám đốc trường', 'người chánh phạm', 'chánh phạm',
  'máy xe', 'quang trọng', 'bổn phận sự', 'bữa ăn lớn', 'thời kỳ khô hạn',
  'sự thiếu thức ăn', 'người đàn ông chưa kết hôn', 'tựa ứng', 'nơn',
  'quan tòa tối cao', 'bãi buông', 'chánh chủ', 'tiền tài sản', 'người có chung cha mẹ',
  'người đi trên đường', 'sự nuôi dưỡng ngược', 'đường chết', 'bảng giờ giấc'
];
function isArchaicOrAwkward(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.trim().toLowerCase();
  return ARCHAIC_BLACKLIST.some(bad => lower.includes(bad));
}
function sanitizeVietnamese(text) {
  if (!text || typeof text !== 'string') return '';
  let res = text.trim().normalize('NFC');
  // Clean archaic phrases
  res = res.replace(/\blời rao\b/gi, 'thông báo');
  res = res.replace(/\bcáo thị\b/gi, 'thông báo');
  res = res.replace(/\bgiám đốc trường\b/gi, 'hiệu trưởng');
  res = res.replace(/\bngười chánh phạm\b/gi, 'chủ mưu');
  res = res.replace(/\bmáy xe\b/gi, 'xe hơi');
  res = res.replace(/\bđược\s+quan sát\s+được\b/gi, 'quan sát được');
  return res.trim();
}
const MODERN_LEXICON = {
  announcement: {
    word_root: 'announcement',
    ipa_uk: '/əˈnaʊns.mənt/',
    ipa_us: '/əˈnaʊns.mənt/',
    partOfSpeech: 'noun [C/U]',
    level: 'B1',
    meaning_vi: 'thông báo',
    definition_vi: 'thông tin chính thức được công bố công khai cho mọi người biết',
    definition_en: 'something that someone says officially, giving information about something',
    examples: [
      'The company made an important announcement about the merger.',
      'There was an official announcement on the school bulletin board.'
    ],
    word_family: [
      { pos: 'verb', word: 'announce', meaning_vi: 'thông báo, tuyên bố' },
      { pos: 'noun', word: 'announcer', meaning_vi: 'người phát thanh, người thông báo' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'sự tuyên bố', definition_en: 'the act of announcing something' }
    ],
    collocations: [
      { phrase: 'make an announcement', meaning_vi: 'đưa ra một thông báo' },
      { phrase: 'official announcement', meaning_vi: 'thông báo chính thức' },
      { phrase: 'public announcement', meaning_vi: 'thông báo công khai' }
    ],
    synonyms: ['statement', 'declaration', 'notice', 'bulletin', 'broadcast'],
    antonyms: ['secret', 'suppression']
  },

  principal: {
    word_root: 'principal',
    ipa_uk: '/ˈprɪn.sə.pəl/',
    ipa_us: '/ˈprɪn.sə.pəl/',
    partOfSpeech: 'noun [C] / adjective',
    level: 'B2',
    meaning_vi: 'hiệu trưởng; chính, chủ yếu',
    definition_vi: 'người đứng đầu trường học; hoặc có vị trí quan trọng hàng đầu',
    definition_en: 'the person in charge of a school; or first in order of importance',
    examples: [
      'The principal spoke to the students during the morning assembly.',
      'Her principal reason for moving was to be closer to her family.'
    ],
    word_family: [
      { pos: 'adv', word: 'principally', meaning_vi: 'chủ yếu, phần lớn' }
    ],
    other_meanings: [
      { pos: 'adjective', meaning_vi: 'chính, chủ yếu', definition_en: 'first in order of importance; main' },
      { pos: 'noun', meaning_vi: 'tiền gốc (tài chính)', definition_en: 'an amount of money that is lent or borrowed, on which interest is paid' }
    ],
    collocations: [
      { phrase: 'school principal', meaning_vi: 'hiệu trưởng trường học' },
      { phrase: 'principal reason', meaning_vi: 'lý do chính' },
      { phrase: 'principal role', meaning_vi: 'vai trò chủ chốt' }
    ],
    synonyms: ['headteacher', 'headmaster', 'main', 'chief', 'primary', 'foremost'],
    antonyms: ['subordinate', 'minor', 'secondary']
  },

  schedule: {
    word_root: 'schedule',
    ipa_uk: '/ˈʃedʒ.uːl/',
    ipa_us: '/ˈskedʒ.uːl/',
    partOfSpeech: 'noun [C] / verb [T]',
    level: 'A2',
    meaning_vi: 'lịch trình, thời khóa biểu',
    definition_vi: 'danh sách các công việc hoặc sự kiện dự kiến diễn ra theo thời gian',
    definition_en: 'a list of planned activities or things to be done showing the times or dates when they are intended to happen',
    examples: [
      'Everything is going according to schedule.',
      'I have a very busy schedule this week.'
    ],
    word_family: [
      { pos: 'verb', word: 'schedule', meaning_vi: 'lên lịch, sắp xếp thời gian' },
      { pos: 'adj', word: 'scheduled', meaning_vi: 'đã được lên lịch' }
    ],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'lên lịch, sắp xếp thời gian', definition_en: 'to arrange that an event or activity will happen at a particular time' }
    ],
    collocations: [
      { phrase: 'tight schedule', meaning_vi: 'lịch trình dày đặc' },
      { phrase: 'ahead of schedule', meaning_vi: 'trước thời hạn / trước tiến độ' },
      { phrase: 'on schedule', meaning_vi: 'đúng tiến độ' }
    ],
    synonyms: ['timetable', 'agenda', 'calendar', 'itinerary', 'program'],
    antonyms: []
  },

  deadline: {
    word_root: 'deadline',
    ipa_uk: '/ˈded.laɪn/',
    ipa_us: '/ˈded.laɪn/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'hạn chót, thời hạn hoàn thành',
    definition_vi: 'thời điểm muộn nhất mà một công việc phải được hoàn thành',
    definition_en: 'a time or day by which something must be done',
    examples: [
      'We are working hard to meet the project deadline.',
      'The deadline for applications is Friday afternoon.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'meet a deadline', meaning_vi: 'kịp hạn chót' },
      { phrase: 'miss a deadline', meaning_vi: 'trễ hạn chót' },
      { phrase: 'tight deadline', meaning_vi: 'thời hạn gấp gáp' }
    ],
    synonyms: ['due date', 'time limit', 'cutoff date', 'target date'],
    antonyms: []
  },

  resume: {
    word_root: 'resume',
    ipa_uk: '/ˈrez.juː.meɪ/',
    ipa_us: '/ˈrez.ə.meɪ/',
    partOfSpeech: 'noun [C] / verb',
    level: 'B1',
    meaning_vi: 'hồ sơ xin việc, sơ yếu lý lịch',
    definition_vi: 'bản tóm tắt kinh nghiệm làm việc và kỹ năng dùng khi ứng tuyển; hoặc tiếp tục sau khi gián đoạn',
    definition_en: 'a written description of your education and previous jobs, which you send to an employer; or to start again after a pause',
    examples: [
      'Please send your resume and cover letter to our HR department.',
      'Normal services will resume as soon as possible.'
    ],
    word_family: [
      { pos: 'noun', word: 'resumption', meaning_vi: 'sự tiếp tục lại' }
    ],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'tiếp tục, bắt đầu lại', definition_en: 'if an activity resumes, or if you resume it, it starts again' }
    ],
    collocations: [
      { phrase: 'submit a resume', meaning_vi: 'nộp hồ sơ xin việc' },
      { phrase: 'update a resume', meaning_vi: 'cập nhật sơ yếu lý lịch' },
      { phrase: 'resume work', meaning_vi: 'bắt đầu làm việc lại' }
    ],
    synonyms: ['CV', 'curriculum vitae', 'restart', 'continue', 'reopen'],
    antonyms: ['halt', 'suspend']
  },

  feedback: {
    word_root: 'feedback',
    ipa_uk: '/ˈfiːd.bæk/',
    ipa_us: '/ˈfiːd.bæk/',
    partOfSpeech: 'noun [U]',
    level: 'B1',
    meaning_vi: 'phản hồi, ý kiến đóng góp',
    definition_vi: 'thông tin hoặc ý kiến nhận xét về một sản phẩm, dịch vụ hoặc hiệu suất làm việc',
    definition_en: 'information or opinions about something, that can tell you how successful or good it is',
    examples: [
      'We welcome constructive feedback from our customers.',
      'Her manager gave her positive feedback on the presentation.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'give feedback', meaning_vi: 'đưa ra ý kiến phản hồi' },
      { phrase: 'constructive feedback', meaning_vi: 'phản hồi mang tính xây dựng' },
      { phrase: 'customer feedback', meaning_vi: 'phản hồi từ khách hàng' }
    ],
    synonyms: ['comment', 'review', 'evaluation', 'input', 'response'],
    antonyms: []
  },

  beverage: {
    word_root: 'beverage',
    ipa_uk: '/ˈbev.ər.ɪdʒ/',
    ipa_us: '/ˈbev.ɚ.ɪdʒ/',
    partOfSpeech: 'noun [C]',
    level: 'B2',
    meaning_vi: 'đồ uống, thức uống',
    definition_vi: 'bất kỳ loại nước uống nào, ngoại trừ nước lọc thông thường',
    definition_en: 'a drink of any type, often excluding water',
    examples: [
      'Hot beverages are available in the cafeteria.',
      'Alcoholic beverages will not be served to minors.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'alcoholic beverage', meaning_vi: 'đồ uống có cồn' },
      { phrase: 'hot beverage', meaning_vi: 'thức uống nóng' },
      { phrase: 'food and beverages', meaning_vi: 'ẩm thực và thức uống' }
    ],
    synonyms: ['drink', 'refreshment', 'liquid'],
    antonyms: ['food']
  },

  feast: {
    word_root: 'feast',
    ipa_uk: '/fiːst/',
    ipa_us: '/fiːst/',
    partOfSpeech: 'noun [C] / verb',
    level: 'B2',
    meaning_vi: 'bữa tiệc, yến tiệc',
    definition_vi: 'bữa ăn lớn, thịnh soạn dành cho nhiều người trong dịp lễ',
    definition_en: 'a special meal with very good food or a large meal for many people',
    examples: [
      'The king prepared a sumptuous feast for the guests.',
      'They feasted on roast turkey and wine all evening.'
    ],
    word_family: [],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'thết tiệc, ăn uống no say', definition_en: 'to eat a lot of good food and enjoy it very much' }
    ],
    collocations: [
      { phrase: 'wedding feast', meaning_vi: 'tiệc cưới' },
      { phrase: 'feast for the eyes', meaning_vi: 'mãn nhãn, bữa tiệc thị giác' },
      { phrase: 'sumptuous feast', meaning_vi: 'bữa tiệc thịnh soạn' }
    ],
    synonyms: ['banquet', 'dinner', 'celebration', 'spread'],
    antonyms: ['famine', 'starvation']
  },

  pedestrian: {
    word_root: 'pedestrian',
    ipa_uk: '/pəˈdes.tri.ən/',
    ipa_us: '/pəˈdes.tri.ən/',
    partOfSpeech: 'noun [C] / adjective',
    level: 'B1',
    meaning_vi: 'người đi bộ',
    definition_vi: 'người di chuyển bằng cách đi bộ trên đường phố',
    definition_en: 'a person who is walking, especially in an area also used by vehicles',
    examples: [
      'Drivers must always yield to pedestrians at crosswalks.',
      'The city created a pedestrian-only shopping zone.'
    ],
    word_family: [],
    other_meanings: [
      { pos: 'adjective', meaning_vi: 'dành cho người đi bộ; tẻ nhạt, bình thường', definition_en: 'for people walking; or not interesting and ordinary' }
    ],
    collocations: [
      { phrase: 'pedestrian crossing', meaning_vi: 'vạch sang đường cho người đi bộ' },
      { phrase: 'pedestrian street', meaning_vi: 'phố đi bộ' },
      { phrase: 'pedestrian precinct', meaning_vi: 'khu vực dành riêng cho người đi bộ' }
    ],
    synonyms: ['walker', 'foot traveler'],
    antonyms: ['driver', 'motorist']
  },

  sibling: {
    word_root: 'sibling',
    ipa_uk: '/ˈsɪb.lɪŋ/',
    ipa_us: '/ˈsɪb.lɪŋ/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'anh chị em ruột',
    definition_vi: 'người có chung cha mẹ (anh trai, em trai, chị gái hoặc em gái)',
    definition_en: 'a brother or sister',
    examples: [
      'Do you have any siblings?',
      'Sibling rivalry is quite common among young children.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'sibling rivalry', meaning_vi: 'sự ganh đua giữa anh chị em' },
      { phrase: 'older sibling', meaning_vi: 'anh/chị lớn' },
      { phrase: 'younger sibling', meaning_vi: 'em nhỏ' }
    ],
    synonyms: ['brother or sister', 'kinsman'],
    antonyms: []
  },

  bachelor: {
    word_root: 'bachelor',
    ipa_uk: '/ˈbætʃ.əl.ər/',
    ipa_us: '/ˈbætʃ.əl.ɚ/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'cử nhân, người độc thân',
    definition_vi: 'người có bằng đại học; hoặc người đàn ông chưa từng kết hôn',
    definition_en: 'a person who holds a bachelor degree; or a man who has never been married',
    examples: [
      'He earned a Bachelor of Science degree in Computer Science.',
      'He remained a confirmed bachelor all his life.'
    ],
    word_family: [],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'người độc thân (nam)', definition_en: 'a man who has never been married' }
    ],
    collocations: [
      { phrase: 'bachelor\'s degree', meaning_vi: 'bằng cử nhân' },
      { phrase: 'bachelor party', meaning_vi: 'tiệc độc thân (dành cho chú rể)' },
      { phrase: 'eligible bachelor', meaning_vi: 'người độc thân sáng giá' }
    ],
    synonyms: ['graduate', 'unmarried man', 'single man'],
    antonyms: ['married man']
  },

  drought: {
    word_root: 'drought',
    ipa_uk: '/draʊt/',
    ipa_us: '/draʊt/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'hạn hán, đợt khô hạn',
    definition_vi: 'khoảng thời gian kéo dài không có mưa khiến cây cối và nguồn nước cạn kiệt',
    definition_en: 'a long period when there is little or no rain',
    examples: [
      'The severe drought destroyed crops across the country.',
      'Farmers are struggling due to the prolonged drought.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'severe drought', meaning_vi: 'đợt hạn hán nghiêm trọng' },
      { phrase: 'prolonged drought', meaning_vi: 'hạn hán kéo dài' },
      { phrase: 'drought conditions', meaning_vi: 'tình trạng hạn hán' }
    ],
    synonyms: ['dry spell', 'water shortage', 'aridity'],
    antonyms: ['flood', 'deluge']
  },

  famine: {
    word_root: 'famine',
    ipa_uk: '/ˈfæm.ɪn/',
    ipa_us: '/ˈfæm.ɪn/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'nạn đói',
    definition_vi: 'tình trạng thiếu thốn lương thực trầm trọng ở một khu vực rộng lớn',
    definition_en: 'a situation in which there is not enough food for a great number of people, causing illness and death',
    examples: [
      'Thousands of people died of hunger during the famine.',
      'International aid was sent to relieve the famine in the region.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'widespread famine', meaning_vi: 'nạn đói diện rộng' },
      { phrase: 'famine relief', meaning_vi: 'cứu trợ nạn đói' },
      { phrase: 'threat of famine', meaning_vi: 'nguy cơ xảy ra nạn đói' }
    ],
    synonyms: ['starvation', 'food shortage', 'scarcity'],
    antonyms: ['plenty', 'abundance', 'feast']
  },

  candidate: {
    word_root: 'candidate',
    ipa_uk: '/ˈkæn.dɪ.dət/',
    ipa_us: '/ˈkæn.dɪ.dət/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'ứng viên, thí sinh',
    definition_vi: 'người nộp đơn xin việc, tham gia bầu cử hoặc thi tuyển',
    definition_en: 'a person who is competing to get a job or elected position, or taking an exam',
    examples: [
      'There are three candidates for the presidential election.',
      'She is the strongest candidate for the marketing position.'
    ],
    word_family: [
      { pos: 'noun', word: 'candidacy', meaning_vi: 'tư cách ứng viên' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'job candidate', meaning_vi: 'ứng viên xin việc' },
      { phrase: 'successful candidate', meaning_vi: 'ứng viên trúng tuyển' },
      { phrase: 'presidential candidate', meaning_vi: 'ứng viên tổng thống' }
    ],
    synonyms: ['applicant', 'aspirant', 'contender', 'examinee'],
    antonyms: []
  },

  colleague: {
    word_root: 'colleague',
    ipa_uk: '/ˈkɒl.iːɡ/',
    ipa_us: '/ˈkɑː.liːɡ/',
    partOfSpeech: 'noun [C]',
    level: 'A2',
    meaning_vi: 'đồng nghiệp',
    definition_vi: 'người làm việc cùng cơ quan, công ty hoặc cùng ngành nghề',
    definition_en: 'one of a group of people who work together',
    examples: [
      'I discussed the proposal with my colleagues at work.',
      'He gets along very well with all his colleagues.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'work colleague', meaning_vi: 'đồng nghiệp cơ quan' },
      { phrase: 'former colleague', meaning_vi: 'đồng nghiệp cũ' },
      { phrase: 'close colleague', meaning_vi: 'đồng nghiệp thân thiết' }
    ],
    synonyms: ['coworker', 'associate', 'teammate', 'partner'],
    antonyms: []
  },

  supervisor: {
    word_root: 'supervisor',
    ipa_uk: '/ˈsuː.pə.vaɪ.zər/',
    ipa_us: '/ˈsuː.pɚ.vaɪ.zɚ/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'người giám sát, cấp trên',
    definition_vi: 'người có trách nhiệm theo dõi, chỉ đạo công việc của nhân viên',
    definition_en: 'a person whose job is to supervise someone or something',
    examples: [
      'You should report any workplace incidents to your supervisor immediately.',
      'Her supervisor praised her dedication to the project.'
    ],
    word_family: [
      { pos: 'verb', word: 'supervise', meaning_vi: 'giám sát, quản lý' },
      { pos: 'noun', word: 'supervision', meaning_vi: 'sự giám sát' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'direct supervisor', meaning_vi: 'cấp trên trực tiếp' },
      { phrase: 'site supervisor', meaning_vi: 'giám sát viên công trình' },
      { phrase: 'academic supervisor', meaning_vi: 'người hướng dẫn học thuật' }
    ],
    synonyms: ['manager', 'boss', 'overseer', 'team leader', 'director'],
    antonyms: ['subordinate']
  },

  maintenance: {
    word_root: 'maintenance',
    ipa_uk: '/ˈmeɪn.tən.əns/',
    ipa_us: '/ˈmeɪn.tən.əns/',
    partOfSpeech: 'noun [U]',
    level: 'B2',
    meaning_vi: 'bảo trì, bảo dưỡng',
    definition_vi: 'công việc kiểm tra, sửa chữa định kỳ để giữ cho máy móc hoạt động tốt',
    definition_en: 'the work needed to keep a road, building, machine, etc. in good condition',
    examples: [
      'Regular maintenance is essential for extending the life of the machine.',
      'The website is temporarily down for routine maintenance.'
    ],
    word_family: [
      { pos: 'verb', word: 'maintain', meaning_vi: 'duy trì, bảo dưỡng' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'sự duy trì', definition_en: 'the situation in which something continues without changing' }
    ],
    collocations: [
      { phrase: 'routine maintenance', meaning_vi: 'bảo trì định kỳ' },
      { phrase: 'maintenance cost', meaning_vi: 'chi phí bảo dưỡng' },
      { phrase: 'under maintenance', meaning_vi: 'đang trong quá trình bảo trì' }
    ],
    synonyms: ['servicing', 'upkeep', 'repair', 'preservation'],
    antonyms: ['neglect']
  },

  negotiation: {
    word_root: 'negotiation',
    ipa_uk: '/nəˌɡəʊ.ʃiˈeɪ.ʃən/',
    ipa_us: '/nəˌɡoʊ.ʃiˈeɪ.ʃən/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'đàm phán, thương lượng',
    definition_vi: 'quá trình trao đổi, thảo luận nhằm đạt được sự nhất trí hoặc thỏa thuận',
    definition_en: 'the process of discussing something with someone in order to reach an agreement with them',
    examples: [
      'The peace negotiations are scheduled to begin next week.',
      'After hours of tough negotiation, they finally reached a deal.'
    ],
    word_family: [
      { pos: 'verb', word: 'negotiate', meaning_vi: 'đàm phán, thương lượng' },
      { pos: 'noun', word: 'negotiator', meaning_vi: 'nhà đàm phán' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'peace negotiations', meaning_vi: 'đàm phán hòa bình' },
      { phrase: 'enter into negotiations', meaning_vi: 'bắt đầu đàm phán' },
      { phrase: 'tough negotiations', meaning_vi: 'các cuộc thương lượng căng thẳng' }
    ],
    synonyms: ['bargaining', 'discussion', 'deliberation', 'talks'],
    antonyms: []
  },

  resident: {
    word_root: 'resident',
    ipa_uk: '/ˈrez.ɪ.dənt/',
    ipa_us: '/ˈrez.ə.dənt/',
    partOfSpeech: 'noun [C] / adjective',
    level: 'B1',
    meaning_vi: 'cư dân, người dân',
    definition_vi: 'người sinh sống lâu dài tại một địa điểm hoặc khu vực cụ thể',
    definition_en: 'a person who lives or has their home in a place',
    examples: [
      'Local residents protested against the new highway construction.',
      'She is a resident of Hanoi.'
    ],
    word_family: [
      { pos: 'noun', word: 'residence', meaning_vi: 'nơi cư trú, dinh thự' },
      { pos: 'verb', word: 'reside', meaning_vi: 'cư trú, sinh sống' }
    ],
    other_meanings: [
      { pos: 'adjective', meaning_vi: 'cư trú, thường trú', definition_en: 'living in a particular place' }
    ],
    collocations: [
      { phrase: 'local resident', meaning_vi: 'người dân địa phương' },
      { phrase: 'permanent resident', meaning_vi: 'thường trú nhân' },
      { phrase: 'resident alien', meaning_vi: 'người nước ngoài thường trú' }
    ],
    synonyms: ['inhabitant', 'citizen', 'dweller', 'occupant'],
    antonyms: ['visitor', 'tourist', 'transient']
  },

  facility: {
    word_root: 'facility',
    ipa_uk: '/fəˈsɪl.ə.ti/',
    ipa_us: '/fəˈsɪl.ə.t̬i/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'cơ sở vật chất, tiện ích',
    definition_vi: 'tòa nhà, trang thiết bị hoặc dịch vụ được cung cấp cho một mục đích nhất định',
    definition_en: 'a place, especially including buildings, where a particular activity happens',
    examples: [
      'The university offers excellent sports facilities for students.',
      'They opened a new medical research facility in the city.'
    ],
    word_family: [
      { pos: 'verb', word: 'facilitate', meaning_vi: 'tạo điều kiện thuận lợi' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'khả năng học hỏi nhanh, năng khiếu', definition_en: 'an ability to do something easily or well' }
    ],
    collocations: [
      { phrase: 'sports facilities', meaning_vi: 'cơ sở vật chất thể thao' },
      { phrase: 'medical facility', meaning_vi: 'cơ sở y tế' },
      { phrase: 'modern facility', meaning_vi: 'tiện ích hiện đại' }
    ],
    synonyms: ['amenity', 'equipment', 'installation', 'premises'],
    antonyms: []
  },

  initiative: {
    word_root: 'initiative',
    ipa_uk: '/ɪˈnɪʃ.ə.tɪv/',
    ipa_us: '/ɪˈnɪʃ.ə.t̬ɪv/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'sáng kiến, bước khởi xướng',
    definition_vi: 'kế hoạch mới hoặc hành động để giải quyết vấn đề hoặc cải thiện tình hình',
    definition_en: 'a new plan or process to achieve something or solve a problem',
    examples: [
      'The government launched a green energy initiative.',
      'Employees are encouraged to take the initiative in solving problems.'
    ],
    word_family: [
      { pos: 'verb', word: 'initiate', meaning_vi: 'khởi xướng, bắt đầu' },
      { pos: 'noun', word: 'initiation', meaning_vi: 'sự khởi đầu' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'sự chủ động', definition_en: 'the ability to use your judgement to make decisions and take action' }
    ],
    collocations: [
      { phrase: 'take the initiative', meaning_vi: 'chủ động hành động' },
      { phrase: 'peace initiative', meaning_vi: 'sáng kiến hòa bình' },
      { phrase: 'new initiative', meaning_vi: 'sáng kiến mới' }
    ],
    synonyms: ['proposal', 'scheme', 'venture', 'enterprise'],
    antonyms: []
  },

  revenue: {
    word_root: 'revenue',
    ipa_uk: '/ˈrev.ən.juː/',
    ipa_us: '/ˈrev.ə.nuː/',
    partOfSpeech: 'noun [U]',
    level: 'B2',
    meaning_vi: 'doanh thu, lợi tức',
    definition_vi: 'khoản tiền mà công ty hoặc chính phủ thu được từ hoạt động kinh doanh hoặc thuế',
    definition_en: 'the income that a government or company receives regularly',
    examples: [
      'The company reported a 20% increase in quarterly revenue.',
      'Tax revenue funds public healthcare and education.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'annual revenue', meaning_vi: 'doanh thu hàng năm' },
      { phrase: 'tax revenue', meaning_vi: 'nguồn thu từ thuế' },
      { phrase: 'generate revenue', meaning_vi: 'tạo ra doanh thu' }
    ],
    synonyms: ['income', 'earnings', 'turnover', 'proceeds'],
    antonyms: ['expenditure', 'expense']
  },

  compromise: {
    word_root: 'compromise',
    ipa_uk: '/ˈkɒm.prə.maɪz/',
    ipa_us: '/ˈkɑːm.prə.maɪz/',
    partOfSpeech: 'noun [C/U] / verb',
    level: 'B2',
    meaning_vi: 'thỏa hiệp, dàn xếp; làm tổn hại',
    definition_vi: 'sự đồng thuận mà các bên đều nhượng bộ một phần; hoặc hành động làm suy yếu, tổn hại',
    definition_en: 'an agreement in an argument in which each side gives up part of what they had wanted',
    examples: [
      'Both sides were willing to compromise to reach an agreement.',
      'We must not compromise our safety standards for speed.'
    ],
    word_family: [],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'làm tổn hại, làm suy yếu', definition_en: 'to risk having a harmful effect on something' }
    ],
    collocations: [
      { phrase: 'reach a compromise', meaning_vi: 'đạt được thỏa hiệp' },
      { phrase: 'compromise on quality', meaning_vi: 'nhượng bộ về chất lượng' }
    ],
    synonyms: ['agreement', 'settlement', 'middle ground', 'give-and-take'],
    antonyms: ['intransigence', 'dispute']
  },

  resilience: {
    word_root: 'resilience',
    ipa_uk: '/rɪˈzɪl.jəns/',
    ipa_us: '/rɪˈzɪl.jəns/',
    partOfSpeech: 'noun [U]',
    level: 'C1',
    meaning_vi: 'khả năng phục hồi, tính kiên cường',
    definition_vi: 'khả năng nhanh chóng vượt qua khó khăn, nghịch cảnh hoặc chấn thương',
    definition_en: 'the ability to be happy, successful, etc. again after something difficult or bad has happened',
    examples: [
      'The community showed great resilience after the natural disaster.',
      'Building mental resilience helps people handle stress effectively.'
    ],
    word_family: [
      { pos: 'adj', word: 'resilient', meaning_vi: 'kiên cường, có khả năng phục hồi' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'show resilience', meaning_vi: 'thể hiện sự kiên cường' },
      { phrase: 'economic resilience', meaning_vi: 'khả năng phục hồi kinh tế' }
    ],
    synonyms: ['toughness', 'endurance', 'adaptability', 'flexibility'],
    antonyms: ['fragility', 'vulnerability']
  },

  sustainable: {
    word_root: 'sustainable',
    ipa_uk: '/səˈsteɪ.nə.bəl/',
    ipa_us: '/səˈsteɪ.nə.bəl/',
    partOfSpeech: 'adjective',
    level: 'B2',
    meaning_vi: 'bền vững',
    definition_vi: 'có thể duy trì lâu dài mà không làm cạn kiệt tài nguyên hoặc gây hại môi trường',
    definition_en: 'able to continue over a period of time without causing damage to the environment',
    examples: [
      'We need to develop sustainable solutions for energy production.',
      'The company promotes sustainable business practices.'
    ],
    word_family: [
      { pos: 'noun', word: 'sustainability', meaning_vi: 'sự bền vững' },
      { pos: 'adv', word: 'sustainably', meaning_vi: 'một cách bền vững' },
      { pos: 'verb', word: 'sustain', meaning_vi: 'duy trì, chống đỡ' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'sustainable development', meaning_vi: 'phát triển bền vững' },
      { phrase: 'sustainable energy', meaning_vi: 'năng lượng bền vững' },
      { phrase: 'sustainable agriculture', meaning_vi: 'nông nghiệp bền vững' }
    ],
    synonyms: ['renewable', 'eco-friendly', 'viable', 'maintainable'],
    antonyms: ['unsustainable', 'depleting']
  },

  abandon: {
    word_root: 'abandon',
    ipa_uk: '/əˈbæn.dən/',
    ipa_us: '/əˈbæn.dən/',
    partOfSpeech: 'verb [T]',
    level: 'B2',
    meaning_vi: 'từ bỏ, bỏ rơi',
    definition_vi: 'rời bỏ một ai đó hoặc nơi nào đó vĩnh viễn; hoặc ngừng thực hiện một kế hoạch',
    definition_en: 'to leave a place, thing, or person, usually for ever',
    examples: [
      'The bank robbers abandoned the stolen car near the woods.',
      'They had to abandon their travel plans due to the stormy weather.'
    ],
    word_family: [
      { pos: 'noun', word: 'abandonment', meaning_vi: 'sự từ bỏ, sự bỏ rơi' },
      { pos: 'adj', word: 'abandoned', meaning_vi: 'bị bỏ hoang' }
    ],
    other_meanings: [
      { pos: 'verb', meaning_vi: 'hủy bỏ, đình chỉ', definition_en: 'to stop an activity before it is finished' }
    ],
    collocations: [
      { phrase: 'abandon hope', meaning_vi: 'từ bỏ hy vọng' },
      { phrase: 'abandon ship', meaning_vi: 'rời tàu khi gặp nạn' }
    ],
    synonyms: ['desert', 'leave', 'forsake', 'give up'],
    antonyms: ['keep', 'retain', 'claim']
  },

  certificate: {
    word_root: 'certificate',
    ipa_uk: '/səˈtɪf.ɪ.kət/',
    ipa_us: '/sɚˈtɪf.ə.kət/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'chứng chỉ, giấy chứng nhận',
    definition_vi: 'tài liệu chính thức chứng nhận trình độ, khóa học hoặc sự kiện pháp lý',
    definition_en: 'an official document that states that the information on it is true',
    examples: [
      'She received a certificate of completion after finishing the training.',
      'A birth certificate is required when applying for a passport.'
    ],
    word_family: [
      { pos: 'verb', word: 'certify', meaning_vi: 'chứng nhận, xác thực' },
      { pos: 'adj', word: 'certified', meaning_vi: 'đã được chứng nhận' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'birth certificate', meaning_vi: 'giấy khai sinh' },
      { phrase: 'graduation certificate', meaning_vi: 'bằng tốt nghiệp / chứng chỉ tốt nghiệp' }
    ],
    synonyms: ['diploma', 'credential', 'qualification', 'document'],
    antonyms: []
  },

  presentation: {
    word_root: 'presentation',
    ipa_uk: '/ˌprez.ənˈteɪ.ʃən/',
    ipa_us: '/ˌprez.ənˈteɪ.ʃən/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'bài thuyết trình, buổi trình bày',
    definition_vi: 'buổi nói chuyện trước công chúng hoặc bài trình bày để giải thích một chủ đề',
    definition_en: 'a talk giving information about something',
    examples: [
      'He gave an insightful presentation on artificial intelligence.',
      'Her slide presentation impressed the entire board of directors.'
    ],
    word_family: [
      { pos: 'verb', word: 'present', meaning_vi: 'trình bày, thuyết trình' },
      { pos: 'noun', word: 'presenter', meaning_vi: 'người thuyết trình, MC' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'give a presentation', meaning_vi: 'thuyết trình, trình bày' },
      { phrase: 'sales presentation', meaning_vi: 'bài thuyết trình bán hàng' }
    ],
    synonyms: ['talk', 'speech', 'lecture', 'demonstration'],
    antonyms: []
  },
  accommodation: {
    word_root: 'accommodation',
    ipa_uk: '/əˌkɒm.əˈdeɪ.ʃən/',
    ipa_us: '/əˌkɑː.məˈdeɪ.ʃən/',
    partOfSpeech: 'noun [U]',
    level: 'B1',
    meaning_vi: 'chỗ ở, nơi lưu trú',
    definition_vi: 'nơi để ở hoặc nghỉ ngơi tạm thời như khách sạn, phòng trọ, nhà ở',
    definition_en: 'a place to live, work, or stay in',
    examples: [
      'The university provides student accommodation on campus.',
      'Hotel accommodation is included in the tour package.'
    ],
    word_family: [
      { pos: 'verb', word: 'accommodate', meaning_vi: 'cung cấp chỗ ở, đáp ứng' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'temporary accommodation', meaning_vi: 'chỗ ở tạm thời' },
      { phrase: 'book accommodation', meaning_vi: 'đặt phòng, đặt chỗ ở' }
    ],
    synonyms: ['housing', 'lodging', 'living quarters'],
    antonyms: []
  },
  admission: {
    word_root: 'admission',
    ipa_uk: '/ədˈmɪʃ.ən/',
    ipa_us: '/ædˈmɪʃ.ən/',
    partOfSpeech: 'noun [C/U]',
    level: 'B1',
    meaning_vi: 'sự nhận vào (học/viện); vé vào cửa; sự thừa nhận',
    definition_vi: 'sự cho phép một người vào trường học, bệnh viện hoặc sự kiện',
    definition_en: 'permission to enter a place, or the fee paid to enter; or accepting that something is true',
    examples: [
      'Admission to the museum is free on Sundays.',
      'She applied for university admission last month.'
    ],
    word_family: [
      { pos: 'verb', word: 'admit', meaning_vi: 'thừa nhận; cho phép vào' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'lời thú nhận, sự thừa nhận', definition_en: 'an admission of guilt' }
    ],
    collocations: [
      { phrase: 'admission fee', meaning_vi: 'giá vé vào cửa' },
      { phrase: 'gain admission', meaning_vi: 'được trúng tuyển, được nhận vào' }
    ],
    synonyms: ['entry', 'admittance', 'access'],
    antonyms: []
  },
  appliance: {
    word_root: 'appliance',
    ipa_uk: '/əˈplaɪ.əns/',
    ipa_us: '/əˈplaɪ.əns/',
    partOfSpeech: 'noun [C]',
    level: 'B2',
    meaning_vi: 'thiết bị, đồ gia dụng',
    definition_vi: 'thiết bị điện máy được dùng trong gia đình (như tủ lạnh, máy giặt, lò vi sóng)',
    definition_en: 'a device, machine, or piece of equipment, especially an electrical one used in the home',
    examples: [
      'Modern household appliances make daily chores much easier.',
      'Always unplug the appliance before cleaning it.'
    ],
    word_family: [
      { pos: 'verb', word: 'apply', meaning_vi: 'áp dụng; nộp đơn' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'household appliance', meaning_vi: 'đồ gia dụng trong nhà' },
      { phrase: 'kitchen appliance', meaning_vi: 'thiết bị nhà bếp' }
    ],
    synonyms: ['device', 'machine', 'gadget', 'equipment'],
    antonyms: []
  },
  commute: {
    word_root: 'commute',
    ipa_uk: '/kəˈmjuːt/',
    ipa_us: '/kəˈmjuːt/',
    partOfSpeech: 'verb / noun [C]',
    level: 'B1',
    meaning_vi: 'đi lại làm việc; quãng đường đi làm',
    definition_vi: 'quá trình di chuyển thường xuyên giữa nhà và nơi làm việc',
    definition_en: 'to make the same trip regularly between work and home',
    examples: [
      'She commutes from the suburbs to the city center by train every day.',
      'My daily commute takes about forty-five minutes.'
    ],
    word_family: [
      { pos: 'noun', word: 'commuter', meaning_vi: 'người đi làm bằng phương tiện công cộng' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'daily commute', meaning_vi: 'quãng đường đi làm hằng ngày' },
      { phrase: 'morning commute', meaning_vi: 'chuyến đi làm buổi sáng' }
    ],
    synonyms: ['travel', 'journey', 'trip'],
    antonyms: []
  },
  complimentary: {
    word_root: 'complimentary',
    ipa_uk: '/ˌkɒm.plɪˈmen.tər.i/',
    ipa_us: '/ˌkɑːm.pləˈmen.t̬ɚ.i/',
    partOfSpeech: 'adjective',
    level: 'B2',
    meaning_vi: 'miễn phí, tặng kèm; khen ngợi',
    definition_vi: 'được cung cấp miễn phí nhằm mục đích tri ân khách hàng hoặc mang tính khen ngợi',
    definition_en: 'given free of charge, or expressing praise',
    examples: [
      'Guests enjoy complimentary breakfast and high-speed Wi-Fi.',
      'The hotel offered a complimentary bottle of wine upon arrival.'
    ],
    word_family: [
      { pos: 'noun', word: 'compliment', meaning_vi: 'lời khen ngợi' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'complimentary breakfast', meaning_vi: 'bữa sáng miễn phí' },
      { phrase: 'complimentary ticket', meaning_vi: 'vé mời, vé miễn phí' }
    ],
    synonyms: ['free', 'courtesy', 'gratis'],
    antonyms: ['paid', 'chargeable']
  },
  itinerary: {
    word_root: 'itinerary',
    ipa_uk: '/aɪˈtɪn.ər.ər.i/',
    ipa_us: '/aɪˈtɪn.ə.rer.i/',
    partOfSpeech: 'noun [C]',
    level: 'B2',
    meaning_vi: 'lịch trình chuyến đi, hành trình',
    definition_vi: 'bản kế hoạch chi tiết về tuyến đường và các điểm dừng trong chuyến đi',
    definition_en: 'a detailed plan or route of a journey',
    examples: [
      'We must finalize our travel itinerary before booking the flights.',
      'The tour itinerary includes visits to ancient temples and museums.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'travel itinerary', meaning_vi: 'lịch trình du lịch' },
      { phrase: 'flight itinerary', meaning_vi: 'hành trình chuyến bay' }
    ],
    synonyms: ['schedule', 'route', 'tour plan'],
    antonyms: []
  },
  inventory: {
    word_root: 'inventory',
    ipa_uk: '/ˈɪn.vən.tər.i/',
    ipa_us: '/ˈɪn.vən.tɔːr.i/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'hàng tồn kho; danh mục kiểm kê',
    definition_vi: 'toàn bộ số hàng hóa hiện có trong kho hoặc bảng kiểm kê chi tiết',
    definition_en: 'a detailed list of all the things in a place, or the amount of goods in stock',
    examples: [
      'The warehouse conducts an inventory check at the end of each month.',
      'We need to reduce our inventory to cut storage costs.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'inventory control', meaning_vi: 'kiểm soát hàng tồn kho' },
      { phrase: 'take inventory', meaning_vi: 'kiểm kê hàng hóa' }
    ],
    synonyms: ['stock', 'goods', 'supplies', 'catalogue'],
    antonyms: []
  },
  perspective: {
    word_root: 'perspective',
    ipa_uk: '/pəˈspek.tɪv/',
    ipa_us: '/pɚˈspek.tɪv/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'góc nhìn, quan điểm; tầm nhìn',
    definition_vi: 'cách suy nghĩ hoặc nhận định về một sự việc dựa trên trải nghiệm cá nhân',
    definition_en: 'a particular way of considering something; an attitude or point of view',
    examples: [
      'Traveling abroad gives you a completely fresh perspective on life.',
      'From a financial perspective, the merger makes complete sense.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'from my perspective', meaning_vi: 'theo góc nhìn của tôi' },
      { phrase: 'gain perspective', meaning_vi: 'có cái nhìn khách quan, thấu đáo hơn' }
    ],
    synonyms: ['viewpoint', 'outlook', 'point of view', 'standpoint'],
    antonyms: []
  },
  phenomenon: {
    word_root: 'phenomenon',
    ipa_uk: '/fəˈnɒm.ɪ.nən/',
    ipa_us: '/fəˈnɑː.mə.nɑːn/',
    partOfSpeech: 'noun [C]',
    level: 'B2',
    meaning_vi: 'hiện tượng',
    definition_vi: 'sự việc hoặc hiện tượng tự nhiên/xã hội xảy ra và quan sát được',
    definition_en: 'something that exists and can be seen, felt, or experienced, especially something unusual',
    examples: [
      'Global warming is a complex phenomenon with worldwide consequences.',
      'Social media influencers have become a global phenomenon.'
    ],
    word_family: [
      { pos: 'adj', word: 'phenomenal', meaning_vi: 'phi thường, kỳ diệu' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'natural phenomenon', meaning_vi: 'hiện tượng tự nhiên' },
      { phrase: 'cultural phenomenon', meaning_vi: 'hiện tượng văn hóa' }
    ],
    synonyms: ['occurrence', 'event', 'marvel', 'wonder'],
    antonyms: []
  },
  preliminary: {
    word_root: 'preliminary',
    ipa_uk: '/prɪˈlɪm.ɪ.nər.i/',
    ipa_us: '/prɪˈlɪm.ə.ner.i/',
    partOfSpeech: 'adjective',
    level: 'B2',
    meaning_vi: 'sơ bộ, ban đầu',
    definition_vi: 'được tiến hành trước để chuẩn bị cho giai đoạn chính thức',
    definition_en: 'coming before a more important action or event, especially introducing or preparing for it',
    examples: [
      'Preliminary results show significant improvement in air quality.',
      'The company held preliminary discussions regarding the acquisition.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'preliminary findings', meaning_vi: 'những phát hiện sơ bộ' },
      { phrase: 'preliminary round', meaning_vi: 'vòng sơ loại' }
    ],
    synonyms: ['initial', 'preparatory', 'introductory'],
    antonyms: ['final', 'conclusive']
  },
  remedy: {
    word_root: 'remedy',
    ipa_uk: '/ˈrem.ə.di/',
    ipa_us: '/ˈrem.ə.di/',
    partOfSpeech: 'noun [C] / verb',
    level: 'B2',
    meaning_vi: 'biện pháp khắc phục; phương thuốc',
    definition_vi: 'cách giải quyết một vấn đề khó khăn hoặc phương pháp chữa bệnh',
    definition_en: 'a successful way of curing an illness or dealing with a problem or difficulty',
    examples: [
      'A warm cup of herbal tea is an effective home remedy for colds.',
      'Management is taking swift steps to remedy the situation.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'home remedy', meaning_vi: 'bài thuốc dân gian' },
      { phrase: 'legal remedy', meaning_vi: 'biện pháp khắc phục theo luật' }
    ],
    synonyms: ['solution', 'cure', 'treatment', 'fix'],
    antonyms: []
  },
  tenant: {
    word_root: 'tenant',
    ipa_uk: '/ˈten.ənt/',
    ipa_us: '/ˈten.ənt/',
    partOfSpeech: 'noun [C]',
    level: 'B2',
    meaning_vi: 'người thuê nhà, người thuê mặt bằng',
    definition_vi: 'người trả tiền định kỳ để thuê căn hộ, phòng trọ hoặc mặt bằng kinh doanh',
    definition_en: 'a person who pays rent for the use of land, a building, or an apartment',
    examples: [
      'The landlord signed a one-year lease contract with the new tenant.',
      'Commercial tenants were granted a rent discount during renovations.'
    ],
    word_family: [
      { pos: 'noun', word: 'tenancy', meaning_vi: 'thời hạn thuê, sự thuê nhà' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'prospective tenant', meaning_vi: 'khách thuê tiềm năng' },
      { phrase: 'evict a tenant', meaning_vi: 'buộc người thuê nhà dọn đi' }
    ],
    synonyms: ['renter', 'occupant', 'leaseholder'],
    antonyms: ['landlord', 'owner']
  },
  tariff: {
    word_root: 'tariff',
    ipa_uk: '/ˈtær.ɪf/',
    ipa_us: '/ˈter.ɪf/',
    partOfSpeech: 'noun [C]',
    level: 'B2',
    meaning_vi: 'thuế quan, biểu thuế; giá cước',
    definition_vi: 'khoản thuế mà chính phủ đánh vào hàng hóa xuất nhập khẩu hoặc bảng giá cước',
    definition_en: 'a tax on goods entering or leaving a country, or a charge for service',
    examples: [
      'The government imposed higher tariffs on imported electronics.',
      'Check the mobile phone tariff plans before signing a contract.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'impose tariffs', meaning_vi: 'áp thuế quan' },
      { phrase: 'protective tariff', meaning_vi: 'thuế quan bảo hộ' }
    ],
    synonyms: ['customs duty', 'tax', 'levy', 'rate'],
    antonyms: []
  },
  venue: {
    word_root: 'venue',
    ipa_uk: '/ˈven.juː/',
    ipa_us: '/ˈven.juː/',
    partOfSpeech: 'noun [C]',
    level: 'B1',
    meaning_vi: 'địa điểm tổ chức',
    definition_vi: 'nơi diễn ra một sự kiện cụ thể như hòa nhạc, hội thảo, đám cưới hoặc trận đấu',
    definition_en: 'the place where a public event or meeting happens',
    examples: [
      'The convention center is an ideal venue for international tech summits.',
      'They are still searching for a suitable wedding venue.'
    ],
    word_family: [],
    other_meanings: [],
    collocations: [
      { phrase: 'event venue', meaning_vi: 'địa điểm tổ chức sự kiện' },
      { phrase: 'concert venue', meaning_vi: 'địa điểm hòa nhạc' }
    ],
    synonyms: ['location', 'place', 'site', 'setting'],
    antonyms: []
  },
  warranty: {
    word_root: 'warranty',
    ipa_uk: '/ˈwɒr.ən.ti/',
    ipa_us: '/ˈwɔːr.ən.t̬i/',
    partOfSpeech: 'noun [C/U]',
    level: 'B1',
    meaning_vi: 'bảo hành, phiếu bảo hành',
    definition_vi: 'văn bản cam kết sửa chữa hoặc đổi mới sản phẩm nếu bị lỗi trong khoảng thời gian nhất định',
    definition_en: 'a written promise by a company to repair or replace a product if it breaks within a certain time',
    examples: [
      'The laptop comes with a two-year manufacturer warranty.',
      'Repairs are fully covered under the terms of the warranty.'
    ],
    word_family: [
      { pos: 'verb', word: 'warrant', meaning_vi: 'đảm bảo, chứng nhận' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'under warranty', meaning_vi: 'còn trong thời hạn bảo hành' },
      { phrase: 'extended warranty', meaning_vi: 'gói bảo hành mở rộng' }
    ],
    synonyms: ['guarantee', 'assurance', 'pledge'],
    antonyms: []
  },
  infrastructure: {
    word_root: 'infrastructure',
    ipa_uk: '/ˈɪn.frəˌstrʌk.tʃər/',
    ipa_us: '/ˈɪn.frəˌstrʌk.tʃɚ/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'cơ sở hạ tầng',
    definition_vi: 'hệ thống giao thông, điện nước, liên lạc thiết yếu phục vụ cho một quốc gia hoặc tổ chức',
    definition_en: 'the basic systems and services, such as transport and power supplies, that a country or organization uses in order to work effectively',
    examples: [
      'The city urgently requires investments to modernize its transport infrastructure.',
      'Telecommunication infrastructure is vital for digital economic growth.'
    ],
    word_family: [
      { pos: 'noun', word: 'structure', meaning_vi: 'cấu trúc' }
    ],
    other_meanings: [],
    collocations: [
      { phrase: 'transport infrastructure', meaning_vi: 'hạ tầng giao thông' },
      { phrase: 'digital infrastructure', meaning_vi: 'hạ tầng kỹ thuật số' }
    ],
    synonyms: ['framework', 'foundation', 'substructure'],
    antonyms: []
  },
  liability: {
    word_root: 'liability',
    ipa_uk: '/ˌlaɪ.əˈbɪl.ə.ti/',
    ipa_us: '/ˌlaɪ.əˈbɪl.ə.t̬i/',
    partOfSpeech: 'noun [C/U]',
    level: 'B2',
    meaning_vi: 'trách nhiệm pháp lý; nghĩa vụ nợ, gánh nặng',
    definition_vi: 'trách nhiệm chịu phạt hoặc bồi thường theo pháp luật; hoặc khoản tiền nợ của doanh nghiệp',
    definition_en: 'the state of being legally responsible, or an amount of money that a person or company owes',
    examples: [
      'The airline accepted full liability for the damaged passenger baggage.',
      'The company balance sheet lists both assets and liabilities.'
    ],
    word_family: [
      { pos: 'adj', word: 'liable', meaning_vi: 'chịu trách nhiệm pháp lý' }
    ],
    other_meanings: [
      { pos: 'noun', meaning_vi: 'gánh nặng, mối bất lợi', definition_en: 'a person or thing whose presence causes embarrassment or disadvantage' }
    ],
    collocations: [
      { phrase: 'legal liability', meaning_vi: 'trách nhiệm pháp lý' },
      { phrase: 'limited liability', meaning_vi: 'trách nhiệm hữu hạn' }
    ],
    synonyms: ['accountability', 'responsibility', 'obligation', 'debt'],
    antonyms: ['asset', 'immunity']
  }
};
function lookupModernLexicon(word) {
  if (!word || typeof word !== 'string') return null;
  const clean = word.trim().toLowerCase();
  return MODERN_LEXICON[clean] || null;
}
const IDIOM_LEXICON = {
  'piece of cake': {
    phrase: 'piece of cake',
    meaning_vi: 'dễ như ăn cháo, dễ ợt',
    explanation_vi: 'Dùng để chỉ một việc gì đó vô cùng dễ dàng thực hiện',
    example: 'The final exam was a piece of cake for her.'
  },
  'once in a blue moon': {
    phrase: 'once in a blue moon',
    meaning_vi: 'năm thì mười họa, rất hiếm khi',
    explanation_vi: 'Chỉ sự việc xảy ra với tần suất cực kỳ hiếm hoi',
    example: 'He only visits his hometown once in a blue moon.'
  },
  'under the weather': {
    phrase: 'under the weather',
    meaning_vi: 'không khỏe, hơi mệt trong người',
    explanation_vi: 'Cảm thấy người uể oải, ốm nhẹ hoặc khó chịu',
    example: 'I am feeling a bit under the weather today, so I will stay home.'
  },
  'break a leg': {
    phrase: 'break a leg',
    meaning_vi: 'chúc may mắn! (thường trước buổi diễn/thi)',
    explanation_vi: 'Lời chúc may mắn quen thuộc của người bản xứ trước giờ biểu diễn hoặc thi cử',
    example: 'Break a leg on your interview tomorrow!'
  },
  'spill the beans': {
    phrase: 'spill the beans',
    meaning_vi: 'tiết lộ bí mật, buôn chuyện',
    explanation_vi: 'Vô tình hoặc cố ý để lộ thông tin bí mật cho người khác',
    example: 'Trust him not to spill the beans about the surprise party.'
  },
  'burn the midnight oil': {
    phrase: 'burn the midnight oil',
    meaning_vi: 'thức khuya học tập / làm việc',
    explanation_vi: 'Làm việc hoặc ôn thi miệt mài đến tận đêm khuya',
    example: 'Students usually burn the midnight oil before final exams.'
  },
  'bite the bullet': {
    phrase: 'bite the bullet',
    meaning_vi: 'cắn răng chịu đựng, ngậm đắng nuốt cay',
    explanation_vi: 'Quyết định đối mặt với việc khó khăn hoặc đau đớn mà không thể tránh khỏi',
    example: 'I decided to bite the bullet and talk to my boss about a raise.'
  },
  'cost an arm and a leg': {
    phrase: 'cost an arm and a leg',
    meaning_vi: 'đắt cắt cổ, giá trên trời',
    explanation_vi: 'Chỉ món đồ hoặc dịch vụ có giá cực kỳ đắt đỏ',
    example: 'Buying a house in this area costs an arm and a leg.'
  },
  'call it a day': {
    phrase: 'call it a day',
    meaning_vi: 'nghỉ tay, kết thúc công việc hôm nay',
    explanation_vi: 'Quyết định ngừng làm việc sau một ngày dài',
    example: 'We have made good progress, let us call it a day.'
  },
  'hit the sack': {
    phrase: 'hit the sack',
    meaning_vi: 'đi ngủ',
    explanation_vi: 'Cách nói thân mật chỉ việc đi lên giường ngủ',
    example: 'I am exhausted after the trip, time to hit the sack.'
  },
  'see eye to eye': {
    phrase: 'see eye to eye',
    meaning_vi: 'đồng quan điểm, nhất trí với nhau',
    explanation_vi: 'Có cùng suy nghĩ hoặc tán thành ý kiến của người khác',
    example: 'My colleague and I see eye to eye on the marketing strategy.'
  },
  'take with a grain of salt': {
    phrase: 'take with a grain of salt',
    meaning_vi: 'bán tín bán nghi, nghe có chọn lọc',
    explanation_vi: 'Không tin hoàn toàn 100% vào điều ai đó nói',
    example: 'You should take rumors on social media with a grain of salt.'
  },
  'so far so good': {
    phrase: 'so far so good',
    meaning_vi: 'mọi chuyện đến giờ vẫn ổn',
    explanation_vi: 'Chỉ tình hình đang tiến triển thuận lợi tính đến thời điểm hiện tại',
    example: 'We started the project last week, so far so good.'
  },
  'through thick and thin': {
    phrase: 'through thick and thin',
    meaning_vi: 'đồng cam cộng khổ, vượt qua mọi thăng trầm',
    explanation_vi: 'Luôn bên nhau ủng hộ dù trong hoàn cảnh thuận lợi hay khó khăn',
    example: 'True friends stick together through thick and thin.'
  }
};
function lookupIdiom(text) {
  if (!text || typeof text !== 'string') return null;
  let clean = text.trim().toLowerCase().replace(/[.,!?;:]/g, '');
  if (clean.startsWith('a ')) clean = clean.slice(2).trim();
  if (clean.startsWith('an ')) clean = clean.slice(3).trim();
  if (clean.startsWith('the ')) clean = clean.slice(4).trim();
  return IDIOM_LEXICON[clean] || IDIOM_LEXICON[text.trim().toLowerCase()] || null;
}
const CONTEXT_DISAMBIGUATION_DICT = {
  plant: {
    contexts: [
      { keywords: ['chemical', 'power', 'nuclear', 'manufacturing', 'industrial', 'factory', 'machinery', 'build', 'worker', 'production'], pos: 'noun [C]', meaning_vi: 'nhà máy, xí nghiệp' },
      { keywords: ['water', 'tree', 'flower', 'leaf', 'soil', 'garden', 'grow', 'biology', 'botany', 'pot'], pos: 'noun [C] / verb', meaning_vi: 'cây cối, thực vật; trồng cây' }
    ]
  },
  bank: {
    contexts: [
      { keywords: ['river', 'stream', 'grassy', 'water', 'lake', 'muddy', 'slope', 'canal', 'fishing'], pos: 'noun [C]', meaning_vi: 'bờ sông, bờ suối' },
      { keywords: ['money', 'account', 'interest', 'deposit', 'loan', 'central', 'finance', 'financial', 'branch', 'teller'], pos: 'noun [C]', meaning_vi: 'ngân hàng' }
    ]
  },
  novel: {
    contexts: [
      { keywords: ['idea', 'approach', 'solution', 'concept', 'method', 'technology', 'design', 'feature', 'virus'], pos: 'adjective', meaning_vi: 'mới lạ, độc đáo' },
      { keywords: ['read', 'author', 'book', 'writer', 'story', 'publish', 'chapter', 'fiction', 'literature'], pos: 'noun [C]', meaning_vi: 'tiểu thuyết' }
    ]
  },
  date: {
    contexts: [
      { keywords: ['fruit', 'sweet', 'palm', 'desert', 'eat', 'food', 'dried'], pos: 'noun [C]', meaning_vi: 'quả chà là' },
      { keywords: ['romantic', 'dinner', 'girlfriend', 'boyfriend', 'movie', 'love', 'meet', 'couple'], pos: 'noun [C]', meaning_vi: 'cuộc hẹn hò' },
      { keywords: ['calendar', 'year', 'month', 'day', 'birth', 'history', 'time', 'schedule'], pos: 'noun [C]', meaning_vi: 'ngày tháng, niên đại' }
    ]
  },
  spring: {
    contexts: [
      { keywords: ['season', 'summer', 'winter', 'autumn', 'march', 'april', 'flower', 'warm', 'festival'], pos: 'noun [C/U]', meaning_vi: 'mùa xuân' },
      { keywords: ['water', 'hot', 'mineral', 'source', 'mountain', 'drink'], pos: 'noun [C]', meaning_vi: 'suối nước, nguồn nước' },
      { keywords: ['metal', 'coil', 'mattress', 'bounce', 'jump', 'elastic'], pos: 'noun [C] / verb', meaning_vi: 'lò xo; bật nhảy' }
    ]
  },
  current: {
    contexts: [
      { keywords: ['water', 'ocean', 'sea', 'river', 'swim', 'flow', 'wave', 'stream', 'tide', 'air', 'wind'], pos: 'noun [C]', meaning_vi: 'dòng nước, hải lưu, luồng gió' },
      { keywords: ['electric', 'electricity', 'wire', 'circuit', 'voltage', 'ampere', 'battery', 'charge'], pos: 'noun [C/U]', meaning_vi: 'dòng điện' },
      { keywords: ['time', 'now', 'present', 'situation', 'affair', 'trend', 'event', 'status', 'issue', 'market'], pos: 'adjective', meaning_vi: 'hiện tại, hiện hành, đương thời' }
    ]
  },
  charge: {
    contexts: [
      { keywords: ['battery', 'phone', 'laptop', 'cable', 'plug', 'charger', 'electric', 'percent', 'recharge'], pos: 'verb / noun', meaning_vi: 'sạc pin, nạp điện' },
      { keywords: ['money', 'fee', 'price', 'bill', 'pay', 'cost', 'service', 'card', 'account', 'dollar'], pos: 'noun [C] / verb', meaning_vi: 'tiền phí, giá tiền; tính phí' },
      { keywords: ['police', 'court', 'arrest', 'crime', 'murder', 'judge', 'law', 'guilty', 'illegal', 'theft'], pos: 'noun [C] / verb', meaning_vi: 'cáo buộc, lời buộc tội' },
      { keywords: ['responsible', 'duty', 'lead', 'manager', 'department', 'team', 'control'], pos: 'noun (in charge of)', meaning_vi: 'phụ trách, chịu trách nhiệm' }
    ]
  },
  match: {
    contexts: [
      { keywords: ['football', 'game', 'play', 'player', 'team', 'tournament', 'cup', 'score', 'win', 'lose', 'stadium'], pos: 'noun [C]', meaning_vi: 'trận đấu, cuộc thi đấu' },
      { keywords: ['fire', 'flame', 'light', 'candle', 'box', 'burn', 'smoke', 'strike'], pos: 'noun [C]', meaning_vi: 'que diêm' },
      { keywords: ['suit', 'pair', 'color', 'shirt', 'fit', 'compatible', 'equal', 'look'], pos: 'verb / noun [C]', meaning_vi: 'hợp, vừa vặn, tương xứng' }
    ]
  },
  party: {
    contexts: [
      { keywords: ['birthday', 'celebrate', 'music', 'dance', 'drink', 'beer', 'invitation', 'guest', 'weekend', 'fun'], pos: 'noun [C]', meaning_vi: 'bữa tiệc, buổi liên hoan' },
      { keywords: ['politics', 'election', 'vote', 'democrat', 'republican', 'communist', 'government', 'member', 'leader'], pos: 'noun [C]', meaning_vi: 'đảng phái chính trị' },
      { keywords: ['contract', 'agreement', 'legal', 'lawyer', 'third', 'sign', 'both', 'dispute', 'clause'], pos: 'noun [C]', meaning_vi: 'bên tham gia (hợp đồng, pháp lý)' }
    ]
  },
  scale: {
    contexts: [
      { keywords: ['weight', 'weigh', 'kg', 'gram', 'pound', 'heavy', 'balance', 'fat', 'diet'], pos: 'noun [C]', meaning_vi: 'cái cân' },
      { keywords: ['fish', 'reptile', 'snake', 'skin', 'tail'], pos: 'noun [C]', meaning_vi: 'vảy (cá, bò sát)' },
      { keywords: ['large', 'global', 'economy', 'project', 'map', 'measure', 'grade', 'level', 'rate'], pos: 'noun [C/U]', meaning_vi: 'quy mô, tỷ lệ, thang đo' }
    ]
  },
  bark: {
    contexts: [
      { keywords: ['dog', 'puppy', 'hound', 'loud', 'bite', 'growl', 'tail'], pos: 'verb / noun [C]', meaning_vi: 'sủa; tiếng sủa' },
      { keywords: ['tree', 'wood', 'trunk', 'branch', 'forest', 'oak', 'pine'], pos: 'noun [U]', meaning_vi: 'vỏ cây' }
    ]
  },
  crane: {
    contexts: [
      { keywords: ['construction', 'building', 'lift', 'heavy', 'site', 'machine', 'engine', 'port'], pos: 'noun [C]', meaning_vi: 'cần cẩu, máy trục' },
      { keywords: ['bird', 'feather', 'wetland', 'fly', 'lake', 'wildlife', 'species'], pos: 'noun [C]', meaning_vi: 'chim sếu' },
      { keywords: ['neck', 'look', 'see', 'stretch', 'head', 'crowd'], pos: 'verb', meaning_vi: 'ngước cổ, nghển cổ nhìn' }
    ]
  },
  fair: {
    contexts: [
      { keywords: ['judge', 'referee', 'law', 'equal', 'rule', 'honest', 'unfair', 'right', 'decision', 'treatment'], pos: 'adjective', meaning_vi: 'công bằng, hợp lý' },
      { keywords: ['book', 'trade', 'job', 'festival', 'fun', 'exhibition', 'market', 'annual', 'show'], pos: 'noun [C]', meaning_vi: 'hội chợ' },
      { keywords: ['weather', 'sky', 'sunny', 'day', 'wind', 'forecast'], pos: 'adjective', meaning_vi: 'quang đãng, đẹp trời' }
    ]
  },
  train: {
    contexts: [
      { keywords: ['railway', 'rail', 'station', 'track', 'ticket', 'passenger', 'arrive', 'depart', 'platform', 'subway'], pos: 'noun [C]', meaning_vi: 'tàu hỏa, xe lửa' },
      { keywords: ['gym', 'coach', 'athlete', 'skill', 'practice', 'course', 'program', 'learn', 'teach', 'dog'], pos: 'verb', meaning_vi: 'đào tạo, huấn luyện, rèn luyện' }
    ]
  },
  address: {
    contexts: [
      { keywords: ['home', 'street', 'house', 'city', 'post', 'mail', 'email', 'live', 'deliver', 'number'], pos: 'noun [C]', meaning_vi: 'địa chỉ' },
      { keywords: ['speech', 'audience', 'president', 'public', 'conference', 'meeting', 'speak'], pos: 'noun [C] / verb', meaning_vi: 'bài diễn văn; phát biểu trước' },
      { keywords: ['problem', 'issue', 'concern', 'challenge', 'solve', 'handle', 'deal', 'tackle'], pos: 'verb', meaning_vi: 'giải quyết, xử lý (vấn đề)' }
    ]
  }
};
function disambiguateByContext(word, contextSentence) {
  if (!word || !contextSentence || typeof contextSentence !== 'string') return null;
  const cleanWord = word.trim().toLowerCase();
  const entry = CONTEXT_DISAMBIGUATION_DICT[cleanWord];
  if (!entry) return null;
  const lowerSentence = contextSentence.toLowerCase();
  for (const sense of entry.contexts) {
    if (sense.keywords.some(k => lowerSentence.includes(k))) {
      return sense;
    }
  }
  return null;
}


// d:/extension/utils/cloud-sync.js
// Unified 2-Way Cloud Sync Engine (GitHub Secret Gist) + Pairing Encoder
// Connects Chrome Extension (PC), iPad PWA, Safari Userscript, and Windows Desktop
const SYNC_GIST_FILENAME = 'vocabmaster-sync-v1.json';
const SYNC_GIST_DESCRIPTION = 'VocabMaster AI — Cloud Sync Database (PC & iPad)';
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const STATUS_RANK = { new: 0, learning: 1, learned: 2 };

/**
 * Normalize either Chrome Extension entry or legacy iPad/CSV entry into canonical schema.
 */
function normalizeVocabEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const word = String(raw.word || raw.word_root || raw.original || '').trim();
  if (!word) return null;

  const addedAt = Number(raw.addedAt) ||
    (raw.created_at ? Date.parse(raw.created_at) : 0) ||
    (Number(raw.id) > 1000000000000 ? Number(raw.id) : Date.now());

  const updatedAt = Number(raw.updatedAt) || Number(raw.lastReviewed) || addedAt || Date.now();

  let examples = [];
  if (Array.isArray(raw.examples)) {
    examples = raw.examples
      .map(ex => (typeof ex === 'string' ? ex : (ex?.en || '')))
      .map(s => s.trim())
      .filter(Boolean);
  } else if (raw.example) {
    const s = typeof raw.example === 'string' ? raw.example : (raw.example?.en || '');
    if (s.trim()) examples = [s.trim()];
  }

  let collocations = [];
  if (Array.isArray(raw.collocations)) {
    collocations = raw.collocations
      .map(c => {
        if (typeof c === 'string') return { phrase: c, meaning_vi: '' };
        const phrase = String(c?.phrase || c?.collocation || '').trim();
        if (!phrase) return null;
        return { phrase, meaning_vi: String(c?.meaning_vi || '').trim() };
      })
      .filter(Boolean);
  }

  const ipaUk = String(raw.ipa_uk || raw.ipa || '').trim();
  const ipaUs = String(raw.ipa_us || raw.ipa || '').trim();
  const ipa = String(raw.ipa || ipaUk || ipaUs || '').trim();
  const meaningVi = String(raw.meaning_vi || raw.definition_vi || '').trim();
  const definitionVi = String(raw.definition_vi || meaningVi || '').trim();

  const status = STATUS_RANK[raw.status] !== undefined ? raw.status : 'new';

  return {
    id: raw.id || `${addedAt}_${word.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    word,
    ipa,
    ipa_uk: ipaUk,
    ipa_us: ipaUs,
    partOfSpeech: String(raw.partOfSpeech || raw.pos || '').trim(),
    level: String(raw.level || raw.cefr || raw.cefr_level || '').trim(),
    meaning_vi: meaningVi,
    definition_vi: definitionVi,
    definition_en: String(raw.definition_en || '').trim(),
    examples,
    synonyms: Array.isArray(raw.synonyms) ? raw.synonyms.filter(Boolean) : [],
    antonyms: Array.isArray(raw.antonyms) ? raw.antonyms.filter(Boolean) : [],
    collocations,
    word_family: Array.isArray(raw.word_family) ? raw.word_family : [],
    etymology: String(raw.etymology || '').trim(),
    sourceUrl: String(raw.sourceUrl || '').trim(),
    addedAt,
    updatedAt,
    lastReviewed: Number(raw.lastReviewed) || 0,
    reviewCount: Number(raw.reviewCount) || 0,
    correctCount: Number(raw.correctCount) || 0,
    status
  };
}

function getWordKey(word) {
  return String(word || '').trim().toLowerCase();
}

/**
 * Bi-directional timestamp + tombstone merge across 2 devices.
 * Guarantees deletions stay deleted and newest edits/reviews win cleanly.
 */
function mergeSyncState(localState = {}, remoteState = {}) {
  const now = Date.now();
  const mergedTombstones = {};

  const addTombstones = (src) => {
    if (!src || typeof src !== 'object') return;
    for (const [k, ts] of Object.entries(src)) {
      const key = getWordKey(k);
      const t = Number(ts) || 0;
      if (!key || !t) continue;
      if (now - t > TOMBSTONE_TTL_MS) continue;
      mergedTombstones[key] = Math.max(mergedTombstones[key] || 0, t);
    }
  };
  addTombstones(localState.tombstones);
  addTombstones(remoteState.tombstones);

  const byKey = new Map();
  const ingestList = (list) => {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      const item = normalizeVocabEntry(raw);
      if (!item) continue;
      const key = getWordKey(item.word);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, item);
        continue;
      }

      // Merge metadata from newer updatedAt, preserve highest study metrics
      const newer = item.updatedAt >= existing.updatedAt ? item : existing;
      const older = newer === item ? existing : item;

      const reviewCount = Math.max(existing.reviewCount || 0, item.reviewCount || 0);
      const correctCount = Math.min(reviewCount, Math.max(existing.correctCount || 0, item.correctCount || 0));
      const lastReviewed = Math.max(existing.lastReviewed || 0, item.lastReviewed || 0);
      const bestStatus = STATUS_RANK[existing.status] >= STATUS_RANK[item.status]
        ? existing.status
        : item.status;

      byKey.set(key, {
        ...older,
        ...newer,
        id: existing.id || newer.id,
        ipa: newer.ipa || older.ipa,
        ipa_uk: newer.ipa_uk || older.ipa_uk,
        ipa_us: newer.ipa_us || older.ipa_us,
        partOfSpeech: newer.partOfSpeech || older.partOfSpeech,
        level: newer.level || older.level,
        meaning_vi: newer.meaning_vi || older.meaning_vi,
        definition_vi: newer.definition_vi || older.definition_vi,
        definition_en: newer.definition_en || older.definition_en,
        examples: (newer.examples?.length ? newer.examples : older.examples) || [],
        collocations: (newer.collocations?.length ? newer.collocations : older.collocations) || [],
        word_family: (newer.word_family?.length ? newer.word_family : older.word_family) || [],
        synonyms: (newer.synonyms?.length ? newer.synonyms : older.synonyms) || [],
        addedAt: Math.min(existing.addedAt || now, item.addedAt || now),
        updatedAt: Math.max(existing.updatedAt || 0, item.updatedAt || 0),
        lastReviewed,
        reviewCount,
        correctCount,
        status: bestStatus
      });
    }
  };

  ingestList(localState.vocabulary);
  ingestList(remoteState.vocabulary);

  // Resolve tombstones against active entries
  const mergedVocabulary = [];
  for (const [key, item] of byKey.entries()) {
    const delAt = mergedTombstones[key] || 0;
    if (delAt > (item.updatedAt || 0)) {
      // Deletion happened AFTER the latest word update -> stay deleted
      continue;
    }
    if (delAt > 0 && (item.updatedAt || 0) >= delAt) {
      // Word was re-added/edited AFTER deletion -> clear stale tombstone
      delete mergedTombstones[key];
    }
    mergedVocabulary.push(item);
  }

  // Sort newest added first
  mergedVocabulary.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

  // Merge custom lexicon (remote + local, local wins if key collision? Use newer or combine cleanly)
  const mergedLexicon = {
    ...(remoteState.customLexicon || {}),
    ...(localState.customLexicon || {})
  };

  return {
    vocabulary: mergedVocabulary,
    tombstones: mergedTombstones,
    customLexicon: mergedLexicon
  };
}



  // =========================================================================
  // 3. AUTO-HANDSHAKE SETTINGS FROM IPAD PWA WHEN VISITED IN SAFARI
  // =========================================================================
  async function tryAutoSyncSettingsFromPWA() {
    try {
      if (location.pathname.includes('/ipad') || location.hostname.includes('khongphaifu.github.io')) {
        const raw = localStorage.getItem('vm_settings');
        if (raw) {
          const pwaSet = JSON.parse(raw);
          if (pwaSet && typeof pwaSet === 'object') {
            const cur = await getConfig();
            const merged = {
              ...cur,
              aiProvider: pwaSet.aiProvider || cur.aiProvider,
              apiKeys: { ...(cur.apiKeys || {}), ...(pwaSet.apiKeys || {}) },
              cloudSyncToken: pwaSet.cloudSyncToken || cur.cloudSyncToken,
              cloudSyncGistId: pwaSet.cloudSyncGistId || cur.cloudSyncGistId
            };
            await gmSet('vm_config', merged);
          }
        }
      }
    } catch (_) {}
  }

  async function getConfig() {
    const def = {
      aiProvider: 'gemini',
      apiKeys: { gemini: '', groq: '', openai: '', claude: '' },
      cloudSyncToken: '',
      cloudSyncGistId: ''
    };
    const stored = await gmGet('vm_config', null);
    if (stored && typeof stored === 'object') return { ...def, ...stored };
    if (typeof stored === 'string') {
      try { return { ...def, ...JSON.parse(stored) }; } catch (_) {}
    }
    return def;
  }

  // =========================================================================
  // 4. MULTI-TIER DICTIONARY, AI CALLER & 2-WAY GIST SYNC (VIA GM CORS)
  // =========================================================================
  const VIETNAMESE_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

  async function fetchGoogleDict(text, isWord) {
    const clean = (text || '').trim();
    const isVi = VIETNAMESE_REGEX.test(clean);
    const sl = isVi ? 'vi' : 'en';
    const tl = isVi ? 'en' : 'vi';
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' + sl + '&tl=' + tl + '&dt=t&dt=bd&dt=md&dt=ss&dt=ex&q=' + encodeURIComponent(clean);
    const res = await gmRequest(url, { timeout: 3500 });
    if (!res.ok) return null;
    const data = JSON.parse(res.text);
    const trans = Array.isArray(data[0]) ? data[0].map(s => s[0] || '').join('').trim() : '';
    if (!isWord) {
      return trans ? { type: 'phrase', original: clean, translation: trans, alternative_translation: '', explanation: '', vocabulary: [] } : null;
    }
    const altMeanings = [];
    let pos = data[12]?.[0]?.[0] || data[1]?.[0]?.[0] || 'word';
    if (Array.isArray(data[1]?.[0]?.[1])) {
      for (const m of data[1][0][1]) {
        if (m && !isArchaicOrAwkward(m)) altMeanings.push(sanitizeVietnamese(m));
      }
    }
    const primary = sanitizeVietnamese(altMeanings[0] || trans);
    if (!primary) return null;
    return {
      type: 'word',
      source: 'dictionary',
      original: clean,
      word: {
        word_root: clean,
        ipa_uk: '',
        ipa_us: '',
        partOfSpeech: pos,
        level: 'B1',
        meaning_vi: primary,
        definition_vi: data[12]?.[0]?.[1]?.[0]?.[0] || primary,
        definition_en: '',
        examples: [],
        collocations: [],
        word_family: [],
        synonyms: []
      }
    };
  }

  async function fetchEnrichPhonetics(word) {
    try {
      const r = await gmRequest('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.toLowerCase()), { timeout: 2200 });
      if (!r.ok) return null;
      const arr = JSON.parse(r.text);
      const entry = arr?.[0];
      if (!entry) return null;
      let ipa = entry.phonetic || '';
      let audio = '';
      for (const p of (entry.phonetics || [])) {
        if (!ipa && p.text) ipa = p.text;
        if (!audio && p.audio) audio = p.audio;
      }
      const ex = [];
      for (const m of (entry.meanings || [])) {
        for (const d of (m.definitions || [])) {
          if (d.example && ex.length < 2) ex.push(d.example);
        }
      }
      return { ipa, audio, examples: ex };
    } catch (_) { return null; }
  }

  async function callAISafari(cfg, text, isWord, contextSentence) {
    const pref = cfg.aiProvider || 'gemini';
    let provider = pref;
    let apiKey = (cfg.apiKeys?.[pref] || '').trim();
    if (!apiKey) {
      for (const p of ['groq', 'gemini', 'openai', 'claude']) {
        if ((cfg.apiKeys?.[p] || '').trim()) { provider = p; apiKey = cfg.apiKeys[p].trim(); break; }
      }
    }
    if (!apiKey) return null;

    const prompt = isWord
      ? `Phân tích từ tiếng Anh "${text}"${contextSentence ? ` trong ngữ cảnh: "${contextSentence}"` : ''} theo chuẩn Cambridge English-Vietnamese, nghĩa Thuần Việt ngắn gọn tự nhiên. Trả về ONLY JSON: {"type":"word","original":"${text}","word":{"word_root":"","ipa_uk":"","ipa_us":"","partOfSpeech":"","level":"","meaning_vi":"","definition_vi":"","definition_en":"","examples":[""],"collocations":[{"phrase":"","meaning_vi":""}],"synonyms":[""]}}`
      : `Dịch câu/đoạn sau sang tiếng Việt (nếu là tiếng Việt thì dịch sang tiếng Anh) thật tự nhiên, thuần Việt, không máy móc: "${text}". Trả về ONLY JSON: {"type":"phrase","original":"${text}","translation":"...","alternative_translation":"...","explanation":"Giải thích ngắn gọn bằng tiếng Việt","vocabulary":[{"word":"","ipa":"","pos":"","meaning":""}]}`;

    let raw = '';
    if (provider === 'gemini') {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
      const res = await gmRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) throw new Error('Gemini ' + res.status);
      const j = JSON.parse(res.text);
      raw = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'groq' || provider === 'openai') {
      const url = provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
      const res = await gmRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });
      if (!res.ok) throw new Error(provider + ' ' + res.status);
      const j = JSON.parse(res.text);
      raw = j?.choices?.[0]?.message?.content || '';
    } else if (provider === 'claude') {
      const res = await gmRequest('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 900,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!res.ok) throw new Error('Claude ' + res.status);
      const j = JSON.parse(res.text);
      raw = j?.content?.[0]?.text || '';
    }

    const cleaned = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  }

  async function translateTextSafari(text, contextSentence) {
    const clean = (text || '').trim();
    const isVi = VIETNAMESE_REGEX.test(clean);
    const isWord = !clean.includes(' ') && clean.length < 35;

    if (isWord && !isVi) {
      const lexHit = lookupModernLexicon(clean);
      if (lexHit) {
        const sense = disambiguateByContext(clean, contextSentence);
        const phon = await fetchEnrichPhonetics(lexHit.root || clean);
        return {
          type: 'word',
          source: 'dictionary',
          original: clean,
          audioUs: phon?.audio || '',
          word: {
            word_root: lexHit.root || clean,
            ipa_uk: phon?.ipa || '',
            ipa_us: phon?.ipa || '',
            partOfSpeech: sense?.pos || lexHit.pos || 'word',
            level: 'B1',
            meaning_vi: sense?.meaning_vi || lexHit.meaning_vi,
            definition_vi: sense?.meaning_vi || lexHit.meaning_vi,
            definition_en: '',
            examples: phon?.examples || [],
            collocations: [],
            synonyms: []
          }
        };
      }
    }

    const cfg = await getConfig();
    if (isWord && !isVi) {
      const [gRes, phon] = await Promise.all([
        fetchGoogleDict(clean, true).catch(() => null),
        fetchEnrichPhonetics(clean).catch(() => null)
      ]);
      if (gRes && gRes.word) {
        if (phon?.ipa) { gRes.word.ipa_uk = phon.ipa; gRes.word.ipa_us = phon.ipa; }
        if (phon?.audio) gRes.audioUs = phon.audio;
        if (phon?.examples?.length) gRes.word.examples = phon.examples;
        return gRes;
      }
    }

    try {
      const aiRes = await callAISafari(cfg, clean, isWord, contextSentence);
      if (aiRes) return aiRes;
    } catch (_) {}

    const gFallback = await fetchGoogleDict(clean, isWord).catch(() => null);
    if (gFallback) return gFallback;

    throw new Error('Không thể dịch lúc này. Kiểm tra mạng hoặc bấm ⚙️ trong thẻ để cấu hình API/Sync.');
  }

  async function saveAndSyncWordSafari(wordPayload) {
    const cfg = await getConfig();
    const entry = normalizeVocabEntry({ ...wordPayload, sourceUrl: location.href, addedAt: Date.now(), updatedAt: Date.now() });
    if (!entry) return { saved: false };

    let localList = await gmGet('vm_local_vocab', []);
    if (!Array.isArray(localList)) localList = [];
    if (!localList.some(w => w.word.toLowerCase() === entry.word.toLowerCase())) {
      localList.unshift(entry);
      await gmSet('vm_local_vocab', localList);
    }

    if (!cfg.cloudSyncToken) {
      return { saved: true, synced: false };
    }

    // Sync directly to shared GitHub Secret Gist via GM_xmlhttpRequest
    const headers = {
      'Authorization': 'Bearer ' + cfg.cloudSyncToken.trim(),
      'Accept': 'application/vnd.github+json'
    };

    let gistId = (cfg.cloudSyncGistId || '').trim();
    if (!gistId) {
      const listRes = await gmRequest('https://api.github.com/gists?per_page=30&_t=' + Date.now(), { headers });
      if (listRes.ok) {
        const gists = JSON.parse(listRes.text);
        const found = gists.find(g => g.files && g.files['vocabmaster-sync-v1.json']);
        if (found) gistId = found.id;
      }
    }
    if (!gistId) return { saved: true, synced: false };

    const getRes = await gmRequest('https://api.github.com/gists/' + encodeURIComponent(gistId) + '?_t=' + Date.now(), { headers });
    if (!getRes.ok) throw new Error('GitHub Sync lỗi ' + getRes.status);
    const gistData = JSON.parse(getRes.text);
    const rawContent = gistData.files?.['vocabmaster-sync-v1.json']?.content || '{}';
    let remote = {};
    try { remote = JSON.parse(rawContent); } catch (_) {}

    const merged = mergeSyncState(
      { vocabulary: [entry], tombstones: {}, customLexicon: {} },
      { vocabulary: remote.vocabulary || [], tombstones: remote.tombstones || {}, customLexicon: remote.customLexicon || {} }
    );

    const patchBody = JSON.stringify({
      files: {
        'vocabmaster-sync-v1.json': {
          content: JSON.stringify({
            schemaVersion: 1,
            lastSyncedAt: new Date().toISOString(),
            vocabulary: merged.vocabulary,
            tombstones: merged.tombstones,
            customLexicon: merged.customLexicon
          }, null, 2)
        }
      }
    });

    const patchRes = await gmRequest('https://api.github.com/gists/' + encodeURIComponent(gistId), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: patchBody
    });
    if (!patchRes.ok) throw new Error('Không thể ghi Gist (' + patchRes.status + ')');

    if (gistId !== cfg.cloudSyncGistId) {
      cfg.cloudSyncGistId = gistId;
      await gmSet('vm_config', cfg);
    }
    return { saved: true, synced: true, total: merged.vocabulary.length };
  }

  // =========================================================================
  // 5. INJECT ISOLATED STYLES & TOUCH SELECTION UI (SAFARI IPADOS)
  // =========================================================================
  const styleEl = document.createElement('style');
  styleEl.id = 'vm-safari-userscript-css';
  styleEl.textContent = "/* d:/extension/content/content.css */\n/* Catppuccin Mocha dark theme for VocabMaster tooltip */\n\n.vm-tooltip {\n  all: initial;\n  position: absolute !important;\n  z-index: 2147483647 !important;\n  background: #1e1e2e !important;\n  color: #cdd6f4 !important;\n  border-radius: 16px !important;\n  box-shadow: 0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(203,166,247,0.22) !important;\n  padding: 15px 17px !important;\n  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;\n  font-size: 13.5px !important;\n  line-height: 1.5 !important;\n  max-width: 440px !important;\n  min-width: 280px !important;\n  width: max-content !important;\n  max-height: min(520px, calc(100vh - 28px)) !important;\n  overflow-y: auto !important;\n  overflow-x: hidden !important;\n  pointer-events: all !important;\n  box-sizing: border-box !important;\n  transform-origin: center top !important;\n  animation: vm-popup-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;\n  scrollbar-width: thin !important;\n  scrollbar-color: #585b70 transparent !important;\n}\n\n.vm-tooltip::-webkit-scrollbar {\n  width: 6px !important;\n}\n\n.vm-tooltip::-webkit-scrollbar-track {\n  background: transparent !important;\n  margin: 8px 0 !important;\n}\n\n.vm-tooltip::-webkit-scrollbar-thumb {\n  background: #45475a !important;\n  border-radius: 99px !important;\n  border: 2px solid transparent !important;\n  background-clip: padding-box !important;\n}\n\n.vm-tooltip::-webkit-scrollbar-thumb:hover {\n  background: #7c7f93 !important;\n  background-clip: padding-box !important;\n}\n\n.vm-tooltip::-webkit-scrollbar-corner {\n  background: transparent !important;\n}\n\n/* Entrance Animation: Smooth popover with subtle scale & blur */\n@keyframes vm-popup-enter {\n  0% {\n    opacity: 0;\n    transform: translateY(-8px) scale(0.95);\n    filter: blur(4px);\n  }\n  100% {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n    filter: blur(0);\n  }\n}\n\n/* Exit Animation: Exact symmetrical reverse of entrance */\n.vm-tooltip.vm-tooltip-exit {\n  animation: vm-popup-exit 0.19s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;\n  pointer-events: none !important;\n}\n\n@keyframes vm-popup-exit {\n  0% {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n    filter: blur(0);\n  }\n  100% {\n    opacity: 0;\n    transform: translateY(-8px) scale(0.95);\n    filter: blur(4px);\n  }\n}\n\n.vm-float-trigger.vm-float-trigger-exit {\n  animation: vm-trigger-fadeout 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;\n  pointer-events: none !important;\n}\n\n@keyframes vm-trigger-fadeout {\n  0% {\n    opacity: 1;\n    transform: scale(1);\n  }\n  100% {\n    opacity: 0;\n    transform: scale(0.5);\n  }\n}\n\n/* AI Progressive Streaming & Cascading Animations */\n@keyframes vm-stream-in {\n  0% {\n    opacity: 0;\n    transform: translateY(-8px);\n    filter: blur(3px);\n  }\n  100% {\n    opacity: 1;\n    transform: translateY(0);\n    filter: blur(0);\n  }\n}\n\n.vm-cascade-item {\n  animation: vm-stream-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both !important;\n}\n\n.vm-cascade-delay-1 { animation-delay: 0.03s !important; }\n.vm-cascade-delay-2 { animation-delay: 0.08s !important; }\n.vm-cascade-delay-3 { animation-delay: 0.14s !important; }\n.vm-cascade-delay-4 { animation-delay: 0.20s !important; }\n.vm-cascade-delay-5 { animation-delay: 0.26s !important; }\n.vm-cascade-delay-6 { animation-delay: 0.32s !important; }\n.vm-cascade-delay-7 { animation-delay: 0.38s !important; }\n\n.vm-tooltip * {\n  box-sizing: border-box !important;\n  font-family: inherit !important;\n  margin: 0 !important;\n  padding: 0 !important;\n}\n\n/* Card Root */\n.vm-card {\n  display: flex !important;\n  flex-direction: column !important;\n  width: 100% !important;\n  gap: 8px !important;\n}\n\n/* Header Row: Word & Actions */\n.vm-header {\n  display: flex !important;\n  align-items: flex-start !important;\n  justify-content: space-between !important;\n  gap: 8px !important;\n  margin-bottom: 2px !important;\n}\n\n.vm-word-wrap {\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 6px !important;\n  flex-wrap: wrap !important;\n}\n\n.vm-word {\n  font-size: 21px !important;\n  font-weight: 700 !important;\n  color: #cba6f7 !important;\n  line-height: 1.15 !important;\n}\n\n.vm-root-tag {\n  font-size: 11px !important;\n  font-weight: 600 !important;\n  color: #89b4fa !important;\n  background: rgba(137, 180, 250, 0.12) !important;\n  padding: 1px 6px !important;\n  border-radius: 6px !important;\n}\n\n.vm-source-tag {\n  font-size: 10.5px !important;\n  font-weight: 700 !important;\n  color: #fab387 !important;\n  background: rgba(250, 179, 135, 0.15) !important;\n  border: 1px solid rgba(250, 179, 135, 0.3) !important;\n  padding: 1px 6px !important;\n  border-radius: 6px !important;\n  display: inline-flex !important;\n  align-items: center !important;\n  gap: 3px !important;\n}\n\n.vm-phrase-tag {\n  font-size: 14px !important;\n  font-weight: 700 !important;\n  color: #89b4fa !important;\n  display: flex !important;\n  align-items: center !important;\n  gap: 6px !important;\n}\n\n.vm-header-tools {\n  display: flex !important;\n  align-items: center !important;\n  gap: 4px !important;\n  flex-shrink: 0 !important;\n}\n\n.vm-tool-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  border: none !important;\n  outline: none !important;\n  background: #313244 !important;\n  background-color: #313244 !important;\n  color: #a6adc8 !important;\n  width: 26px !important;\n  height: 26px !important;\n  border-radius: 8px !important;\n  cursor: pointer !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  transition: all 0.15s !important;\n  padding: 0 !important;\n}\n\n.vm-tool-btn:hover {\n  background: #45475a !important;\n  background-color: #45475a !important;\n  color: #cdd6f4 !important;\n}\n\n.vm-tool-btn.vm-close-btn:hover {\n  background: rgba(243, 139, 168, 0.25) !important;\n  background-color: rgba(243, 139, 168, 0.25) !important;\n  color: #f38ba8 !important;\n}\n\n.vm-tool-btn.vm-copied {\n  color: #a6e3a1 !important;\n}\n\n/* Meta Row: Pronunciation pills, POS, Level */\n.vm-meta-row {\n  display: flex !important;\n  align-items: center !important;\n  gap: 6px !important;\n  flex-wrap: wrap !important;\n  margin-bottom: 2px !important;\n}\n\n.vm-pron-pill {\n  display: flex !important;\n  align-items: center !important;\n  gap: 5px !important;\n  background: #181825 !important;\n  border: 1px solid #313244 !important;\n  border-radius: 6px !important;\n  padding: 2px 7px !important;\n  cursor: pointer !important;\n  transition: all 0.15s !important;\n  user-select: none !important;\n}\n\n.vm-pron-pill:hover {\n  border-color: #89b4fa !important;\n  background: #28293d !important;\n}\n\n.vm-region-tag {\n  font-size: 10px !important;\n  font-weight: 800 !important;\n  padding: 1px 4px !important;\n  border-radius: 3px !important;\n  letter-spacing: 0.5px !important;\n  line-height: 1.2 !important;\n}\n\n.vm-region-tag.uk {\n  background: #1e3a5f !important;\n  color: #89b4fa !important;\n  border: 1px solid rgba(137, 180, 250, 0.3) !important;\n}\n\n.vm-region-tag.us {\n  background: #4b2234 !important;\n  color: #f38ba8 !important;\n  border: 1px solid rgba(243, 139, 168, 0.3) !important;\n}\n\n.vm-audio-icon {\n  display: flex !important;\n  align-items: center !important;\n  color: #cdd6f4 !important;\n  opacity: 0.85 !important;\n}\n.vm-pron-pill:hover .vm-audio-icon {\n  opacity: 1 !important;\n  color: #ffffff !important;\n}\n\n.vm-ipa {\n  font-size: 12.5px !important;\n  font-style: italic !important;\n  color: #bac2de !important;\n  font-family: 'Lucida Console', Monaco, 'Courier New', monospace !important;\n}\n\n.vm-pos {\n  font-size: 11px !important;\n  font-style: italic !important;\n  font-weight: 600 !important;\n  color: #89dceb !important;\n  background: #313244 !important;\n  padding: 2px 8px !important;\n  border-radius: 12px !important;\n}\n\n.vm-level {\n  font-size: 10.5px !important;\n  font-weight: 800 !important;\n  padding: 2px 7px !important;\n  border-radius: 6px !important;\n  text-transform: uppercase !important;\n  letter-spacing: 0.3px !important;\n}\n\n/* Language Badges */\n.vm-flag-tag {\n  font-size: 10px !important;\n  font-weight: 800 !important;\n  letter-spacing: 0.5px !important;\n  padding: 2px 5px !important;\n  border-radius: 6px !important;\n  line-height: 1 !important;\n  display: inline-block !important;\n  flex-shrink: 0 !important;\n}\n.vm-flag-tag.vi {\n  background: rgba(166, 227, 161, 0.18) !important;\n  color: #a6e3a1 !important;\n  border: 1px solid rgba(166, 227, 161, 0.4) !important;\n}\n.vm-flag-tag.en {\n  background: rgba(137, 180, 250, 0.18) !important;\n  color: #89b4fa !important;\n  border: 1px solid rgba(137, 180, 250, 0.4) !important;\n}\n\n/* Core Meanings & Definitions */\n.vm-meaning-vi {\n  font-size: 15.5px !important;\n  font-weight: 700 !important;\n  color: #a6e3a1 !important;\n  line-height: 1.4 !important;\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 8px !important;\n  background: rgba(166, 227, 161, 0.08) !important;\n  border: 1px solid rgba(166, 227, 161, 0.22) !important;\n  border-left: 4px solid #a6e3a1 !important;\n  border-radius: 12px !important;\n  padding: 8px 12px !important;\n}\n\n.vm-meaning-text {\n  color: #a6e3a1 !important;\n}\n\n.vm-edit-meaning-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  border: none !important;\n  background: transparent !important;\n  cursor: pointer !important;\n  padding: 2px 4px !important;\n  font-size: 12px !important;\n  opacity: 0.55 !important;\n  transition: opacity 0.15s, transform 0.15s !important;\n  color: #cdd6f4 !important;\n  display: inline-flex !important;\n  align-items: center !important;\n  margin-left: auto !important;\n}\n\n.vm-edit-meaning-btn:hover {\n  opacity: 1 !important;\n  transform: scale(1.15) !important;\n}\n\n.vm-user-custom-tag {\n  font-size: 10px !important;\n  padding: 2px 6px !important;\n  border-radius: 4px !important;\n  background: rgba(166, 227, 161, 0.2) !important;\n  color: #a6e3a1 !important;\n  border: 1px solid rgba(166, 227, 161, 0.4) !important;\n  font-weight: 600 !important;\n  margin-left: 4px !important;\n  letter-spacing: 0.3px !important;\n  flex-shrink: 0 !important;\n}\n\n.vm-def-vi {\n  font-size: 12.5px !important;\n  color: #f9e2af !important;\n  line-height: 1.4 !important;\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 6px !important;\n  padding-left: 4px !important;\n}\n\n.vm-bullet-icon {\n  font-size: 12px !important;\n  color: #fab387 !important;\n  flex-shrink: 0 !important;\n}\n\n.vm-def-en {\n  font-size: 12.5px !important;\n  color: #cdd6f4 !important;\n  font-style: italic !important;\n  line-height: 1.45 !important;\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 8px !important;\n  padding-left: 4px !important;\n}\n\n/* Sections: Examples, Word Family, Collocations, Other Meanings */\n.vm-section {\n  background: rgba(24, 24, 37, 0.75) !important;\n  border: 1px solid rgba(69, 71, 90, 0.5) !important;\n  border-radius: 14px !important;\n  padding: 10px 12px !important;\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 4px !important;\n}\n\n.vm-section-title {\n  font-size: 10.5px !important;\n  font-weight: 700 !important;\n  color: #89b4fa !important;\n  letter-spacing: 0.5px !important;\n  text-transform: uppercase !important;\n  margin-bottom: 3px !important;\n}\n\n.vm-examples-list {\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 4px !important;\n}\n\n.vm-example-item {\n  display: flex !important;\n  gap: 6px !important;\n  font-size: 12.5px !important;\n  color: #bac2de !important;\n  line-height: 1.4 !important;\n}\n\n.vm-example-bullet {\n  color: #89b4fa !important;\n  font-weight: 700 !important;\n  flex-shrink: 0 !important;\n}\n\n.vm-highlight {\n  color: #89dceb !important;\n  font-weight: 600 !important;\n}\n\n.vm-family-list {\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 3px !important;\n}\n\n.vm-family-item {\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 6px !important;\n  font-size: 12px !important;\n  line-height: 1.4 !important;\n}\n\n.vm-family-pos {\n  font-size: 10px !important;\n  font-weight: 700 !important;\n  color: #89b4fa !important;\n  background: rgba(137, 180, 250, 0.12) !important;\n  border: 1px solid rgba(137, 180, 250, 0.25) !important;\n  padding: 1px 5px !important;\n  border-radius: 4px !important;\n  flex-shrink: 0 !important;\n}\n\n.vm-family-word {\n  color: #cba6f7 !important;\n  font-weight: 600 !important;\n}\n\n.vm-family-meaning {\n  color: #a6e3a1 !important;\n}\n\n.vm-other-list {\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 3px !important;\n}\n\n.vm-other-item {\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 6px !important;\n  font-size: 12px !important;\n  line-height: 1.4 !important;\n}\n\n.vm-colloc-list {\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 3px !important;\n}\n\n.vm-colloc-item {\n  font-size: 12px !important;\n  line-height: 1.4 !important;\n  color: #cdd6f4 !important;\n}\n\n.vm-colloc-phrase {\n  color: #fab387 !important;\n  font-weight: 600 !important;\n}\n\n.vm-colloc-meaning {\n  color: #a6adc8 !important;\n}\n\n.vm-synonyms-row {\n  display: flex !important;\n  flex-wrap: wrap !important;\n  align-items: center !important;\n  gap: 4px !important;\n  margin-top: 2px !important;\n}\n\n.vm-syn-label {\n  font-size: 11px !important;\n  color: #6c7086 !important;\n  font-weight: 600 !important;\n}\n\n.vm-syn-tag {\n  font-size: 11px !important;\n  color: #cba6f7 !important;\n  background: #313244 !important;\n  padding: 1px 6px !important;\n  border-radius: 4px !important;\n}\n\n/* Actions Row & Solid Styled Buttons */\n.vm-actions {\n  display: flex !important;\n  gap: 8px !important;\n  margin-top: 8px !important;\n  border-top: 1px solid #313244 !important;\n  padding-top: 10px !important;\n  width: 100% !important;\n  box-sizing: border-box !important;\n}\n\n.vm-tooltip button.vm-add-btn,\n.vm-tooltip .vm-add-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  flex: 1 !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  gap: 6px !important;\n  padding: 8px 14px !important;\n  border-radius: 8px !important;\n  cursor: pointer !important;\n  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;\n  font-size: 12.5px !important;\n  font-weight: 700 !important;\n  line-height: 1 !important;\n  text-align: center !important;\n  box-sizing: border-box !important;\n  transition: all 0.15s !important;\n  user-select: none !important;\n  outline: none !important;\n  background: #89b4fa !important;\n  background-color: #89b4fa !important;\n  color: #11111b !important;\n  border: 1px solid #89b4fa !important;\n  box-shadow: 0 2px 8px rgba(137, 180, 250, 0.25) !important;\n}\n\n.vm-tooltip button.vm-add-btn:hover:not(:disabled),\n.vm-tooltip .vm-add-btn:hover:not(:disabled) {\n  background: #b4befe !important;\n  background-color: #b4befe !important;\n  border-color: #b4befe !important;\n  transform: translateY(-1px) !important;\n}\n\n.vm-tooltip button.vm-add-btn:active:not(:disabled),\n.vm-tooltip .vm-add-btn:active:not(:disabled) {\n  transform: translateY(0) !important;\n}\n\n.vm-tooltip button.vm-add-btn:disabled:not(.vm-btn-saved),\n.vm-tooltip .vm-add-btn:disabled:not(.vm-btn-saved) {\n  opacity: 0.7 !important;\n  cursor: default !important;\n}\n\n.vm-tooltip button.vm-add-btn.vm-btn-saved,\n.vm-tooltip .vm-add-btn.vm-btn-saved {\n  background: #a6e3a1 !important;\n  background-color: #a6e3a1 !important;\n  border: 1px solid #a6e3a1 !important;\n  border-color: #a6e3a1 !important;\n  color: #11111b !important;\n  font-weight: 700 !important;\n  opacity: 1 !important;\n  box-shadow: 0 2px 8px rgba(166, 227, 161, 0.35) !important;\n  cursor: pointer !important;\n}\n\n.vm-tooltip button.vm-add-btn.vm-btn-saved:hover,\n.vm-tooltip .vm-add-btn.vm-btn-saved:hover {\n  background: #94e2d5 !important;\n  background-color: #94e2d5 !important;\n  border-color: #94e2d5 !important;\n  color: #11111b !important;\n  transform: translateY(-1px) !important;\n}\n\n.vm-tooltip button.vm-panel-btn,\n.vm-tooltip .vm-panel-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  flex: 1 !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  gap: 6px !important;\n  padding: 8px 14px !important;\n  border-radius: 8px !important;\n  cursor: pointer !important;\n  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;\n  font-size: 12.5px !important;\n  font-weight: 600 !important;\n  line-height: 1 !important;\n  text-align: center !important;\n  box-sizing: border-box !important;\n  transition: all 0.15s !important;\n  user-select: none !important;\n  outline: none !important;\n  background: #313244 !important;\n  background-color: #313244 !important;\n  color: #cdd6f4 !important;\n  border: 1px solid #45475a !important;\n}\n\n.vm-tooltip button.vm-panel-btn:hover,\n.vm-tooltip .vm-panel-btn:hover {\n  background: #45475a !important;\n  background-color: #45475a !important;\n  border-color: #585b70 !important;\n  color: #ffffff !important;\n  transform: translateY(-1px) !important;\n}\n\n.vm-tooltip button.vm-panel-btn:active,\n.vm-tooltip .vm-panel-btn:active {\n  transform: translateY(0) !important;\n}\n\n/* Phrase Translation Styles */\n.vm-phrase-original {\n  color: #bac2de !important;\n  font-style: italic !important;\n  font-size: 13px !important;\n  margin-bottom: 6px !important;\n  background: rgba(30, 30, 46, 0.7) !important;\n  border-left: 3px solid #6c7086 !important;\n  border-radius: 10px !important;\n  padding: 7px 12px !important;\n  line-height: 1.45 !important;\n  max-height: 120px !important;\n  overflow-y: auto !important;\n  white-space: pre-wrap !important;\n  word-break: break-word !important;\n}\n\n.vm-phrase-translation {\n  color: #a6e3a1 !important;\n  font-weight: 600 !important;\n  margin-bottom: 6px !important;\n  font-size: 15px !important;\n  line-height: 1.55 !important;\n  background: rgba(166, 227, 161, 0.08) !important;\n  padding: 10px 14px !important;\n  border-radius: 12px !important;\n  border: 1px solid rgba(166, 227, 161, 0.25) !important;\n  border-left: 4px solid #a6e3a1 !important;\n  white-space: pre-wrap !important;\n  word-break: break-word !important;\n}\n\n.vm-phrase-explain {\n  color: #f9e2af !important;\n  font-size: 12.5px !important;\n  background: rgba(249, 226, 175, 0.07) !important;\n  border: 1px solid rgba(249, 226, 175, 0.2) !important;\n  border-left: 4px solid #f9e2af !important;\n  padding: 10px 14px !important;\n  border-radius: 12px !important;\n  margin-top: 4px !important;\n  line-height: 1.5 !important;\n  white-space: pre-wrap !important;\n  word-break: break-word !important;\n}\n\n/* Alternative Phrasing */\n.vm-phrase-alt {\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 8px !important;\n  background: rgba(137, 220, 235, 0.08) !important;\n  border: 1px solid rgba(137, 220, 235, 0.2) !important;\n  border-left: 4px solid #89dceb !important;\n  border-radius: 12px !important;\n  padding: 8px 12px !important;\n  margin-bottom: 6px !important;\n  font-size: 13px !important;\n  line-height: 1.45 !important;\n}\n\n.vm-phrase-alt-tag {\n  color: #89dceb !important;\n  font-weight: 700 !important;\n  font-size: 11px !important;\n  letter-spacing: 0.3px !important;\n  flex-shrink: 0 !important;\n}\n\n.vm-phrase-alt-text {\n  color: #cdd6f4 !important;\n  font-style: italic !important;\n}\n\n/* Key Vocabulary in Sentence */\n.vm-phrase-vocab-list {\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 6px !important;\n}\n\n.vm-phrase-vocab-item {\n  display: flex !important;\n  align-items: center !important;\n  flex-wrap: wrap !important;\n  gap: 6px !important;\n  background: rgba(49, 50, 68, 0.5) !important;\n  border: 1px solid rgba(69, 71, 90, 0.5) !important;\n  border-radius: 10px !important;\n  padding: 6px 10px !important;\n  font-size: 12.5px !important;\n  line-height: 1.4 !important;\n  transition: all 0.15s !important;\n}\n\n.vm-phrase-vocab-item:hover {\n  background: rgba(49, 50, 68, 0.95) !important;\n  border-color: #cba6f7 !important;\n}\n\n.vm-vocab-speak-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  background: transparent !important;\n  border: none !important;\n  color: #89b4fa !important;\n  cursor: pointer !important;\n  padding: 2px !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  opacity: 0.75 !important;\n  transition: opacity 0.15s, transform 0.1s !important;\n}\n\n.vm-vocab-speak-btn:hover {\n  opacity: 1 !important;\n  transform: scale(1.18) !important;\n  color: #ffffff !important;\n}\n\n.vm-phrase-vocab-word {\n  color: #cba6f7 !important;\n  font-weight: 700 !important;\n}\n\n.vm-phrase-vocab-ipa {\n  font-size: 11px !important;\n  font-style: italic !important;\n  color: #bac2de !important;\n  font-family: 'Lucida Console', Monaco, 'Courier New', monospace !important;\n}\n\n.vm-phrase-vocab-meaning {\n  color: #a6e3a1 !important;\n  font-weight: 500 !important;\n}\n\n\n/* AI Stream Skeleton & Shimmer */\n.vm-stream-skeleton {\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 10px !important;\n  padding: 6px 0 !important;\n  width: 100% !important;\n  animation: vm-stream-in 0.2s ease !important;\n}\n\n.vm-skeleton-pills {\n  display: flex !important;\n  gap: 8px !important;\n  align-items: center !important;\n}\n\n.vm-skeleton-pill {\n  height: 22px !important;\n  border-radius: 6px !important;\n  background: linear-gradient(90deg, #313244 0%, #45475a 50%, #313244 100%) !important;\n  background-size: 200% 100% !important;\n  animation: vm-skeleton-shimmer 1.5s infinite linear !important;\n}\n\n.vm-skeleton-meaning {\n  height: 42px !important;\n  border-radius: 8px !important;\n  background: linear-gradient(90deg, rgba(203, 166, 247, 0.08) 0%, rgba(203, 166, 247, 0.22) 50%, rgba(203, 166, 247, 0.08) 100%) !important;\n  background-size: 200% 100% !important;\n  animation: vm-skeleton-shimmer 1.5s infinite linear !important;\n  border: 1px solid rgba(203, 166, 247, 0.15) !important;\n}\n\n.vm-skeleton-line {\n  height: 14px !important;\n  border-radius: 5px !important;\n  background: linear-gradient(90deg, #313244 0%, #45475a 50%, #313244 100%) !important;\n  background-size: 200% 100% !important;\n  animation: vm-skeleton-shimmer 1.5s infinite linear !important;\n}\n\n.vm-stream-status {\n  display: inline-flex !important;\n  align-items: center !important;\n  gap: 6px !important;\n  font-size: 11.5px !important;\n  color: #a6adc8 !important;\n  font-weight: 500 !important;\n  margin-top: 4px !important;\n}\n\n.vm-stream-sparkle {\n  color: #cba6f7 !important;\n  animation: vm-spin-pulse 1.8s infinite ease-in-out !important;\n  display: inline-block !important;\n}\n\n.vm-stream-cursor {\n  display: inline-block !important;\n  width: 2px !important;\n  height: 1em !important;\n  background: #cba6f7 !important;\n  vertical-align: -1px !important;\n  margin-left: 2px !important;\n  border-radius: 1px !important;\n  animation: vm-cursor-blink 0.6s infinite !important;\n}\n\n@keyframes vm-skeleton-shimmer {\n  0% { background-position: 200% 0; }\n  100% { background-position: -200% 0; }\n}\n\n@keyframes vm-spin-pulse {\n  0% { transform: scale(1) rotate(0deg); opacity: 0.8; }\n  50% { transform: scale(1.25) rotate(180deg); opacity: 1; }\n  100% { transform: scale(1) rotate(360deg); opacity: 0.8; }\n}\n\n@keyframes vm-cursor-blink {\n  0%, 100% { opacity: 1; }\n  50% { opacity: 0; }\n}\n\n/* Loading & Spinner */\n.vm-loading {\n  padding: 12px !important;\n  text-align: center !important;\n  color: #6c7086 !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  gap: 8px !important;\n}\n\n.vm-spinner {\n  display: inline-block !important;\n  width: 14px !important;\n  height: 14px !important;\n  border: 2px solid #45475a !important;\n  border-top-color: #89b4fa !important;\n  border-radius: 50% !important;\n  animation: vm-spin 0.7s linear infinite !important;\n}\n@keyframes vm-spin { to { transform: rotate(360deg); } }\n\n.vm-error {\n  padding: 10px !important;\n  color: #f38ba8 !important;\n  font-size: 13px !important;\n}\n\n/* Floating Trigger Button */\n.vm-float-trigger {\n  all: initial;\n  margin: 0 !important;\n  padding: 0 !important;\n  outline: none !important;\n  position: absolute !important;\n  z-index: 2147483647 !important;\n  width: 32px !important;\n  height: 32px !important;\n  border-radius: 50% !important;\n  background: linear-gradient(135deg, #cba6f7 0%, #89b4fa 100%) !important;\n  color: #1e1e2e !important;\n  border: 2px solid #ffffff !important;\n  box-shadow: 0 4px 14px rgba(0,0,0,0.5), 0 0 10px rgba(203,166,247,0.5) !important;\n  cursor: pointer !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  font-size: 16px !important;\n  line-height: 1 !important;\n  user-select: none !important;\n  box-sizing: border-box !important;\n  font-family: system-ui, -apple-system, sans-serif !important;\n  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease !important;\n  animation: vm-pop 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n  pointer-events: auto !important;\n  visibility: visible !important;\n  opacity: 1 !important;\n}\n\n.vm-float-trigger:hover {\n  transform: scale(1.22) !important;\n  box-shadow: 0 6px 20px rgba(203,166,247,0.7) !important;\n}\n\n.vm-float-trigger:active {\n  transform: scale(0.92) !important;\n}\n\n@keyframes vm-pop {\n  from { opacity: 0; transform: scale(0.5); }\n  to   { opacity: 1; transform: scale(1); }\n}\n\n/* In-Page Vocabulary Library Modal */\n.vm-modal-overlay {\n  all: initial !important;\n  position: fixed !important;\n  inset: 0 !important;\n  z-index: 2147483647 !important;\n  background: rgba(0, 0, 0, 0.65) !important;\n  backdrop-filter: blur(4px) !important;\n  -webkit-backdrop-filter: blur(4px) !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  box-sizing: border-box !important;\n  animation: vm-fadein 0.15s ease !important;\n  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;\n}\n\n.vm-modal {\n  all: initial !important;\n  background: #1e1e2e !important;\n  color: #cdd6f4 !important;\n  border-radius: 14px !important;\n  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(203, 166, 247, 0.25) !important;\n  width: 90% !important;\n  max-width: 520px !important;\n  max-height: 85vh !important;\n  display: flex !important;\n  flex-direction: column !important;\n  box-sizing: border-box !important;\n  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif !important;\n  overflow: hidden !important;\n  animation: vm-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n}\n\n.vm-modal * {\n  box-sizing: border-box !important;\n  font-family: inherit !important;\n  margin: 0 !important;\n  padding: 0 !important;\n}\n\n.vm-modal-header {\n  display: flex !important;\n  align-items: center !important;\n  justify-content: space-between !important;\n  padding: 14px 18px !important;\n  border-bottom: 1px solid #313244 !important;\n  background: #181825 !important;\n}\n\n.vm-modal-title-wrap {\n  display: flex !important;\n  align-items: center !important;\n  gap: 8px !important;\n}\n\n.vm-modal-title {\n  font-size: 16px !important;\n  font-weight: 700 !important;\n  color: #cba6f7 !important;\n}\n\n.vm-modal-count {\n  font-size: 11px !important;\n  background: #313244 !important;\n  color: #89b4fa !important;\n  padding: 2px 8px !important;\n  border-radius: 10px !important;\n  font-weight: 700 !important;\n}\n\n.vm-modal-close-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  border: none !important;\n  outline: none !important;\n  width: 28px !important;\n  height: 28px !important;\n  border-radius: 6px !important;\n  background: transparent !important;\n  color: #a6adc8 !important;\n  cursor: pointer !important;\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  transition: all 0.15s !important;\n}\n\n.vm-modal-close-btn:hover {\n  background: rgba(243, 139, 168, 0.2) !important;\n  color: #f38ba8 !important;\n}\n\n.vm-modal-toolbar {\n  display: flex !important;\n  gap: 8px !important;\n  padding: 12px 18px 8px !important;\n  background: #1e1e2e !important;\n}\n\n.vm-modal-search {\n  flex: 1 !important;\n  background: #181825 !important;\n  border: 1px solid #313244 !important;\n  border-radius: 8px !important;\n  padding: 8px 12px !important;\n  color: #cdd6f4 !important;\n  font-size: 13px !important;\n  outline: none !important;\n  transition: border-color 0.15s !important;\n}\n\n.vm-modal-search:focus {\n  border-color: #89b4fa !important;\n}\n\n.vm-modal-filter {\n  background: #181825 !important;\n  border: 1px solid #313244 !important;\n  border-radius: 8px !important;\n  padding: 8px 10px !important;\n  color: #89b4fa !important;\n  font-size: 12.5px !important;\n  font-weight: 600 !important;\n  outline: none !important;\n  cursor: pointer !important;\n}\n\n.vm-modal-body {\n  flex: 1 !important;\n  overflow-y: auto !important;\n  padding: 8px 18px 14px !important;\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 8px !important;\n  scrollbar-width: thin !important;\n  scrollbar-color: #45475a #1e1e2e !important;\n}\n\n.vm-modal-body::-webkit-scrollbar { width: 4px !important; }\n.vm-modal-body::-webkit-scrollbar-track { background: #1e1e2e !important; }\n.vm-modal-body::-webkit-scrollbar-thumb { background: #45475a !important; border-radius: 2px !important; }\n\n.vm-lib-card {\n  background: #181825 !important;\n  border: 1px solid #313244 !important;\n  border-radius: 8px !important;\n  padding: 10px 12px !important;\n  display: flex !important;\n  flex-direction: column !important;\n  gap: 5px !important;\n  transition: all 0.15s !important;\n}\n\n.vm-lib-card:hover {\n  border-color: #45475a !important;\n  background: #202133 !important;\n}\n\n.vm-lib-head {\n  display: flex !important;\n  align-items: center !important;\n  justify-content: space-between !important;\n  gap: 8px !important;\n}\n\n.vm-lib-word-wrap {\n  display: flex !important;\n  align-items: baseline !important;\n  gap: 6px !important;\n  flex-wrap: wrap !important;\n}\n\n.vm-lib-word {\n  font-size: 16px !important;\n  font-weight: 700 !important;\n  color: #cba6f7 !important;\n}\n\n.vm-lib-ipa {\n  font-size: 12px !important;\n  font-style: italic !important;\n  color: #bac2de !important;\n  font-family: 'Lucida Console', Monaco, monospace !important;\n}\n\n.vm-lib-pos {\n  font-size: 10.5px !important;\n  font-style: italic !important;\n  font-weight: 600 !important;\n  color: #89dceb !important;\n  background: #313244 !important;\n  padding: 1px 6px !important;\n  border-radius: 8px !important;\n}\n\n.vm-lib-level {\n  font-size: 10px !important;\n  font-weight: 800 !important;\n  padding: 1px 5px !important;\n  border-radius: 3px !important;\n  background: #fab387 !important;\n  color: #11111b !important;\n}\n\n.vm-lib-actions {\n  display: flex !important;\n  align-items: center !important;\n  gap: 4px !important;\n  flex-shrink: 0 !important;\n}\n\n.vm-lib-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  border: 1px solid #313244 !important;\n  outline: none !important;\n  background: #25263a !important;\n  color: #a6adc8 !important;\n  border-radius: 6px !important;\n  padding: 4px 8px !important;\n  font-size: 12px !important;\n  cursor: pointer !important;\n  display: flex !important;\n  align-items: center !important;\n  gap: 4px !important;\n  transition: all 0.15s !important;\n}\n\n.vm-lib-btn:hover {\n  background: #313244 !important;\n  color: #cdd6f4 !important;\n}\n\n.vm-lib-btn.del:hover {\n  background: rgba(243, 139, 168, 0.2) !important;\n  color: #f38ba8 !important;\n  border-color: rgba(243, 139, 168, 0.4) !important;\n}\n\n.vm-lib-meaning {\n  font-size: 13.5px !important;\n  font-weight: 600 !important;\n  color: #a6e3a1 !important;\n  line-height: 1.4 !important;\n}\n\n.vm-lib-def {\n  font-size: 12px !important;\n  color: #bac2de !important;\n  line-height: 1.35 !important;\n}\n\n.vm-lib-example {\n  font-size: 11.5px !important;\n  color: #89b4fa !important;\n  font-style: italic !important;\n  background: rgba(137, 180, 250, 0.08) !important;\n  border-left: 2px solid #89b4fa !important;\n  padding: 3px 6px !important;\n  border-radius: 3px !important;\n  margin-top: 2px !important;\n}\n\n.vm-lib-empty {\n  padding: 36px 16px !important;\n  text-align: center !important;\n  color: #6c7086 !important;\n  font-size: 13.5px !important;\n  line-height: 1.6 !important;\n}\n\n.vm-lib-empty-icon {\n  font-size: 32px !important;\n  margin-bottom: 8px !important;\n  display: block !important;\n}\n\n.vm-modal-footer {\n  display: flex !important;\n  align-items: center !important;\n  justify-content: space-between !important;\n  padding: 10px 18px !important;\n  border-top: 1px solid #313244 !important;\n  background: #181825 !important;\n}\n\n.vm-modal-panel-btn {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  background: rgba(137, 180, 250, 0.15) !important;\n  color: #89b4fa !important;\n  border: 1px solid rgba(137, 180, 250, 0.3) !important;\n  border-radius: 6px !important;\n  padding: 6px 12px !important;\n  font-size: 12px !important;\n  font-weight: 600 !important;\n  cursor: pointer !important;\n  display: flex !important;\n  align-items: center !important;\n  gap: 6px !important;\n  transition: all 0.15s !important;\n}\n\n.vm-modal-panel-btn:hover {\n  background: rgba(137, 180, 250, 0.25) !important;\n}\n\n.vm-modal-foot-close {\n  appearance: none !important;\n  -webkit-appearance: none !important;\n  background: #313244 !important;\n  color: #cdd6f4 !important;\n  border: 1px solid #45475a !important;\n  border-radius: 6px !important;\n  padding: 6px 12px !important;\n  font-size: 12px !important;\n  cursor: pointer !important;\n  transition: all 0.15s !important;\n}\n\n.vm-modal-foot-close:hover {\n  background: #45475a !important;\n}";
  (document.head || document.documentElement).appendChild(styleEl);

  let triggerEl = null;
  let tooltipEl = null;
  let selTimer = null;
  let lastText = '';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isInsideUI(node) {
    if (!node) return false;
    const el = node.nodeType === 3 ? (node.parentElement || node.parentNode) : node;
    if (!el || typeof el.closest !== 'function') return false;
    return !!(el.closest('.vm-tooltip') || el.closest('.vm-float-trigger'));
  }

  function hideTrigger() {
    if (triggerEl) { triggerEl.remove(); triggerEl = null; }
  }

  function hideTooltip() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  }

  function speakWord(w, audioUrl) {
    if (audioUrl) {
      try { new Audio(audioUrl).play().catch(() => {}); return; } catch (_) {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(w);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
      } catch (_) {}
    }
  }

  async function openConfigPrompt() {
    const cur = await getConfig();
    const val = window.prompt(
      'Dán Mã Cấu Hình (hoặc link #pair=...) lấy từ Cài đặt PC/iPad PWA để liên kết AI & Sổ từ chung:',
      ''
    );
    if (!val || !val.trim()) return;
    const decoded = decodePairingPayload(val.trim());
    if (!decoded) {
      alert('❌ Mã ghép nối không hợp lệ!');
      return;
    }
    const next = {
      ...cur,
      aiProvider: decoded.aiProvider || cur.aiProvider,
      apiKeys: { ...(cur.apiKeys || {}), ...(decoded.apiKeys || {}) },
      cloudSyncToken: decoded.ghToken || cur.cloudSyncToken,
      cloudSyncGistId: decoded.gistId || cur.cloudSyncGistId
    };
    await gmSet('vm_config', next);
    alert('✅ Đã liên kết Safari iPad với Sổ Từ & AI của bạn thành công!');
  }

  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('⚙️ Nhập Mã Ghép Nối VocabMaster (PC/iPad)', openConfigPrompt);
    }
  } catch (_) {}

  function positionCard(rect) {
    if (!tooltipEl) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    const r = tooltipEl.getBoundingClientRect();
    const w = r.width || 320;
    const h = r.height || 220;

    let top = rect ? rect.bottom + 10 : 60;
    if (top + h > vh - 12 && rect && rect.top - h - 10 > 12) {
      top = rect.top - h - 10;
    }
    top = Math.max(12, Math.min(top, Math.max(12, vh - h - 12)));
    let left = rect ? rect.left : (vw - w) / 2;
    left = Math.max(10, Math.min(left, Math.max(10, vw - w - 10)));

    tooltipEl.style.left = Math.round(sx + left) + 'px';
    tooltipEl.style.top = Math.round(sy + top) + 'px';
    tooltipEl.style.visibility = 'visible';
  }

  async function runTranslatePopup(text, rect, contextSentence) {
    hideTrigger();
    hideTooltip();

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'vm-tooltip';
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.innerHTML = '<div class="vm-card"><div class="vm-header"><span class="vm-word">' + esc(text.slice(0, 48)) + '</span><button type="button" class="vm-tool-btn vm-close-btn">✕</button></div><div class="vm-stream-status">✨ Đang dịch Thuần Việt...</div></div>';
    (document.body || document.documentElement).appendChild(tooltipEl);
    tooltipEl.querySelector('.vm-close-btn')?.addEventListener('click', hideTooltip);
    positionCard(rect);

    try {
      const res = await translateTextSafari(text, contextSentence);
      if (!tooltipEl) return;

      if (res.type === 'word' && res.word) {
        const w = res.word;
        tooltipEl.innerHTML = `
          <div class="vm-card">
            <div class="vm-header">
              <div class="vm-word-wrap">
                <span class="vm-word">${esc(res.original || w.word_root)}</span>
                <span class="vm-pos">${esc(w.partOfSpeech || 'word')}</span>
              </div>
              <div class="vm-header-tools">
                <button type="button" class="vm-tool-btn vm-cfg-btn" title="Liên kết Sổ/AI">⚙️</button>
                <button type="button" class="vm-tool-btn vm-close-btn">✕</button>
              </div>
            </div>
            <div class="vm-meta-row">
              ${w.ipa_us ? '<span class="vm-ipa">' + esc(w.ipa_us) + '</span>' : ''}
              <button type="button" class="vm-tool-btn vm-speak-btn" style="width:auto;padding:0 8px;">🔊 Nghe</button>
            </div>
            <div class="vm-meaning-vi"><span class="vm-meaning-text">${esc(w.meaning_vi)}</span></div>
            ${w.definition_vi && w.definition_vi !== w.meaning_vi ? '<div class="vm-def-vi">' + esc(w.definition_vi) + '</div>' : ''}
            ${w.examples?.[0] ? '<div class="vm-def-en">"' + esc(w.examples[0]) + '"</div>' : ''}
            <div class="vm-footer" style="margin-top:10px;">
              <button type="button" class="vm-add-btn">+ Lưu vào Sổ chung (PC & iPad)</button>
            </div>
          </div>`;

        tooltipEl.querySelector('.vm-speak-btn')?.addEventListener('click', () => speakWord(res.original, res.audioUs));
        tooltipEl.querySelector('.vm-add-btn')?.addEventListener('click', async (ev) => {
          const btn = ev.currentTarget;
          btn.disabled = true;
          btn.textContent = '⏳ Đang lưu & đồng bộ...';
          try {
            const st = await saveAndSyncWordSafari({ word: res.original || w.word_root, ...w });
            btn.textContent = st.synced ? '✓ Đã đồng bộ lên Sổ chung!' : '✓ Đã lưu (Bấm ⚙️ để Sync Cloud)';
            btn.classList.add('vm-btn-saved');
          } catch (err) {
            btn.disabled = false;
            btn.textContent = '❌ ' + err.message;
          }
        });
      } else {
        tooltipEl.innerHTML = `
          <div class="vm-card">
            <div class="vm-header">
              <span class="vm-word" style="font-size:15px;">✨ Dịch Câu & Đoạn</span>
              <div class="vm-header-tools">
                <button type="button" class="vm-tool-btn vm-cfg-btn" title="Liên kết Sổ/AI">⚙️</button>
                <button type="button" class="vm-tool-btn vm-close-btn">✕</button>
              </div>
            </div>
            <div class="vm-meaning-vi"><span class="vm-meaning-text">${esc(res.translation)}</span></div>
            ${res.explanation ? '<div class="vm-def-vi" style="margin-top:6px;">' + esc(res.explanation) + '</div>' : ''}
          </div>`;
      }

      tooltipEl.querySelector('.vm-close-btn')?.addEventListener('click', hideTooltip);
      tooltipEl.querySelector('.vm-cfg-btn')?.addEventListener('click', openConfigPrompt);
      positionCard(rect);
    } catch (err) {
      if (!tooltipEl) return;
      tooltipEl.innerHTML = '<div class="vm-card"><div class="vm-header"><span style="color:#f38ba8;font-weight:700;">⚠️ Lỗi dịch</span><button type="button" class="vm-tool-btn vm-close-btn">✕</button></div><div class="vm-error">' + esc(err.message) + '</div><div class="vm-footer" style="margin-top:8px;"><button type="button" class="vm-add-btn vm-cfg-btn">⚙️ Nhập Mã Ghép Nối</button></div></div>';
      tooltipEl.querySelector('.vm-close-btn')?.addEventListener('click', hideTooltip);
      tooltipEl.querySelector('.vm-cfg-btn')?.addEventListener('click', openConfigPrompt);
      positionCard(rect);
    }
  }

  function evaluateSafariSelection() {
    if (tooltipEl && document.body.contains(tooltipEl)) {
      hideTrigger();
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { hideTrigger(); return; }
    const text = sel.toString().replace(/[\s\u00A0]+/g, ' ').trim();
    if (!text || text.length < 1 || text.length > 2500) { hideTrigger(); return; }

    const range = sel.getRangeAt(0);
    if (isInsideUI(range.commonAncestorContainer) || isInsideUI(range.startContainer)) return;

    let rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      const rects = range.getClientRects();
      if (rects?.length) rect = rects[0];
    }
    if (!rect) return;

    lastText = text;
    const context = (range.startContainer?.textContent || '').slice(0, 220);

    hideTrigger();
    triggerEl = document.createElement('div');
    triggerEl.className = 'vm-float-trigger';
    triggerEl.innerHTML = '✨';
    triggerEl.title = 'Dịch với VocabMaster AI';

    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    // Place slightly below selection on touch Safari so native Apple black bar above doesn't block tap
    let top = sy + rect.bottom + 12;
    if (rect.bottom + 54 > window.innerHeight) {
      top = Math.max(sy + 6, sy + rect.top - 44);
    }
    const left = Math.max(sx + 8, Math.min(sx + rect.right - 10, sx + window.innerWidth - 46));

    triggerEl.style.setProperty('left', Math.round(left) + 'px', 'important');
    triggerEl.style.setProperty('top', Math.round(top) + 'px', 'important');
    triggerEl.style.setProperty('z-index', '2147483647', 'important');

    triggerEl.addEventListener('touchstart', (e) => e.stopPropagation(), true);
    triggerEl.addEventListener('mousedown', (e) => e.stopPropagation(), true);
    triggerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      runTranslatePopup(lastText, rect, context);
    }, true);

    (document.body || document.documentElement).appendChild(triggerEl);
  }

  document.addEventListener('mouseup', () => setTimeout(evaluateSafariSelection, 25), true);
  document.addEventListener('touchend', () => setTimeout(evaluateSafariSelection, 120), true);
  document.addEventListener('selectionchange', () => {
    clearTimeout(selTimer);
    selTimer = setTimeout(evaluateSafariSelection, 260);
  });

  function onOutsideTap(e) {
    if (isInsideUI(e.target)) return;
    hideTrigger();
    hideTooltip();
  }
  document.addEventListener('mousedown', onOutsideTap, true);
  document.addEventListener('touchstart', onOutsideTap, true);

  tryAutoSyncSettingsFromPWA();
})();
