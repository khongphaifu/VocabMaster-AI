// d:/extension/utils/modern-lexicon.js
// Bộ Từ điển Chuẩn Thuần Việt Hiện Đại cho VocabMaster AI
// Giải quyết triệt để vấn đề dịch sượng trân, cổ xưa (lời rao, cáo thị, giám đốc trường...)

export const ARCHAIC_BLACKLIST = [
  'lời rao', 'lời loan báo', 'cáo thị', 'giám đốc trường', 'người chánh phạm', 'chánh phạm',
  'máy xe', 'quang trọng', 'bổn phận sự', 'bữa ăn lớn', 'thời kỳ khô hạn',
  'sự thiếu thức ăn', 'người đàn ông chưa kết hôn', 'tựa ứng', 'nơn',
  'quan tòa tối cao', 'bãi buông', 'chánh chủ', 'tiền tài sản', 'người có chung cha mẹ',
  'người đi trên đường', 'sự nuôi dưỡng ngược', 'đường chết', 'bảng giờ giấc'
];

export function isArchaicOrAwkward(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.trim().toLowerCase();
  return ARCHAIC_BLACKLIST.some(bad => lower.includes(bad));
}

export function sanitizeVietnamese(text) {
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

export const MODERN_LEXICON = {
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

export function lookupModernLexicon(word) {
  if (!word || typeof word !== 'string') return null;
  const clean = word.trim().toLowerCase();
  return MODERN_LEXICON[clean] || null;
}

export const IDIOM_LEXICON = {
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

export function lookupIdiom(text) {
  if (!text || typeof text !== 'string') return null;
  let clean = text.trim().toLowerCase().replace(/[.,!?;:]/g, '');
  if (clean.startsWith('a ')) clean = clean.slice(2).trim();
  if (clean.startsWith('an ')) clean = clean.slice(3).trim();
  if (clean.startsWith('the ')) clean = clean.slice(4).trim();
  return IDIOM_LEXICON[clean] || IDIOM_LEXICON[text.trim().toLowerCase()] || null;
}

export const CONTEXT_DISAMBIGUATION_DICT = {
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

export function disambiguateByContext(word, contextSentence) {
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

