// d:/extension/utils/cambridge-client.js
// Fetches and parses word entries directly from Cambridge Dictionary Online
// (dictionary.cambridge.org/dictionary/english-vietnamese/<word>)

const CAMBRIDGE_BASE = 'https://dictionary.cambridge.org';

/**
 * Strip HTML tags and decode common HTML entities
 */
function cleanText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate candidate base words (lemmas) for inflected forms
 * e.g. "becomes" -> ["becomes", "become"]
 *      "running" -> ["running", "run"]
 */
export function getCandidateLemmas(word) {
  const w = (word || '').trim().toLowerCase();
  const candidates = [w];

  if (w.endsWith('ies') && w.length > 4) {
    candidates.push(w.slice(0, -3) + 'y'); // flies -> fly
  } else if (w.endsWith('es') && w.length > 3) {
    const root2 = w.slice(0, -2);
    candidates.push(w.slice(0, -1)); // houses -> house, becomes -> become
    candidates.push(root2); // watches -> watch, boxes -> box, buses -> bus
  } else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    candidates.push(w.slice(0, -1)); // dogs -> dog, gardens -> garden
  }

  if (w.endsWith('ied') && w.length > 4) {
    candidates.push(w.slice(0, -3) + 'y'); // studied -> study
  } else if (w.endsWith('ed') && w.length > 3) {
    candidates.push(w.slice(0, -2)); // played -> play
    candidates.push(w.slice(0, -1)); // baked -> bake
  }

  if (w.endsWith('ing') && w.length > 4) {
    candidates.push(w.slice(0, -3)); // watching -> watch
    candidates.push(w.slice(0, -3) + 'e'); // making -> make
    if (w.length > 5 && w[w.length - 4] === w[w.length - 5]) {
      candidates.push(w.slice(0, -4)); // running -> run
    }
  }

  return [...new Set(candidates)];
}

/**
 * Parses raw HTML from Cambridge English-Vietnamese dictionary page
 */
export function parseCambridgeHTML(html, originalWord) {
  if (!html) return null;

  // Check if blocked by Cloudflare or not an entry page
  if (
    html.includes('challenge-error-text') ||
    html.includes('_cf_chl_opt') ||
    html.includes('<title>Just a moment...</title>') ||
    html.includes('Performing security verification')
  ) {
    return null;
  }

  // Check if word entry exists
  const hasEntry = html.includes('entry-body') || html.includes('di-body') || html.includes('pos-header') || html.includes('dhw');
  if (!hasEntry) return null;

  // 1. Headword
  let headword = originalWord;
  const hwMatch = html.match(/<(?:h2|span)[^>]*class="[^"]*dhw[^"]*"[^>]*>([\s\S]*?)<\/(?:h2|span)>/i);
  if (hwMatch) {
    headword = cleanText(hwMatch[1]) || originalWord;
  }

  // 2. Part of Speech
  let pos = 'noun';
  const posMatch = html.match(/<span[^>]*class="[^"]*dpos[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (posMatch) {
    pos = cleanText(posMatch[1]);
  }

  // 3. Pronunciation & Audio (UK & US)
  let ipaUk = '';
  let ipaUs = '';
  let audioUk = '';
  let audioUs = '';

  const ukSection = html.match(/<span[^>]*class="[^"]*uk[^"]*dpron-i[^"]*"[\s\S]*?<\/span>\s*<\/span>/i) ||
                    html.match(/<span[^>]*class="[^"]*uk[^"]*"[\s\S]*?<\/span>/i);
  if (ukSection) {
    const ipaM = ukSection[0].match(/<span[^>]*class="[^"]*ipa[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (ipaM) ipaUk = cleanText(ipaM[1]);
    const srcM = ukSection[0].match(/<source[^>]*type="audio\/mpeg"[^>]*src="([^"]+)"/i);
    if (srcM) audioUk = srcM[1].startsWith('http') ? srcM[1] : `${CAMBRIDGE_BASE}${srcM[1]}`;
  }

  const usSection = html.match(/<span[^>]*class="[^"]*us[^"]*dpron-i[^"]*"[\s\S]*?<\/span>\s*<\/span>/i) ||
                    html.match(/<span[^>]*class="[^"]*us[^"]*"[\s\S]*?<\/span>/i);
  if (usSection) {
    const ipaM = usSection[0].match(/<span[^>]*class="[^"]*ipa[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (ipaM) ipaUs = cleanText(ipaM[1]);
    const srcM = usSection[0].match(/<source[^>]*type="audio\/mpeg"[^>]*src="([^"]+)"/i);
    if (srcM) audioUs = srcM[1].startsWith('http') ? srcM[1] : `${CAMBRIDGE_BASE}${srcM[1]}`;
  }

  // Fallback IPA if not in uk/us blocks
  if (!ipaUk && !ipaUs) {
    const generalIpa = html.match(/<span[^>]*class="[^"]*ipa[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (generalIpa) {
      ipaUk = cleanText(generalIpa[1]);
      ipaUs = ipaUk;
    }
  }

  // 4. CEFR Level
  let level = '';
  const levelMatch = html.match(/<span[^>]*class="[^"]*(?:epp-xref|dxref)[^"]*"[^>]*>([A-C][1-2])<\/span>/i);
  if (levelMatch) {
    level = levelMatch[1].toUpperCase();
  }

  // 5. Vietnamese Translations (dtrans)
  const viTranslations = [];
  const transRegex = /<span[^>]*class="[^"]*dtrans[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let tMatch;
  while ((tMatch = transRegex.exec(html)) !== null) {
    const t = cleanText(tMatch[1]);
    if (t && !viTranslations.includes(t)) {
      viTranslations.push(t);
    }
  }

  // 6. English Definitions (ddef_d)
  const enDefinitions = [];
  const defRegex = /<div[^>]*class="[^"]*ddef_d[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let dMatch;
  while ((dMatch = defRegex.exec(html)) !== null) {
    const d = cleanText(dMatch[1]);
    if (d && !enDefinitions.includes(d)) {
      enDefinitions.push(d);
    }
  }

  // 7. Examples (dexamp / deg)
  const examples = [];
  const exampRegex = /<span[^>]*class="[^"]*deg[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let eMatch;
  while ((eMatch = exampRegex.exec(html)) !== null) {
    const ex = cleanText(eMatch[1]);
    if (ex && !examples.includes(ex)) {
      examples.push(ex);
    }
  }

  // 8. Collocations / Idioms (phrase-title / dphrase-title)
  const collocations = [];
  const phraseRegex = /<(?:span|div|b)[^>]*class="[^"]*(?:phrase-title|dphrase-title)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|b)>/gi;
  let pMatch;
  while ((pMatch = phraseRegex.exec(html)) !== null) {
    const phr = cleanText(pMatch[1]);
    if (phr && phr.length > 2 && !collocations.some(c => c.phrase === phr)) {
      collocations.push({ phrase: phr, meaning_vi: '' });
    }
    if (collocations.length >= 4) break;
  }

  // 9. Other Meanings (if multiple translations exist)
  const otherMeanings = [];
  if (viTranslations.length > 1) {
    for (let i = 1; i < Math.min(viTranslations.length, 5); i++) {
      otherMeanings.push({
        pos: pos,
        meaning_vi: viTranslations[i]
      });
    }
  }

  const primaryMeaningVi = viTranslations[0] || '';
  const primaryDefEn = enDefinitions[0] || '';

  // If no translations or definitions were found, parser didn't find valid entry
  if (!primaryMeaningVi && !primaryDefEn) {
    return null;
  }

  return {
    type: 'word',
    source: 'cambridge',
    original: originalWord,
    cambridgeUrl: `${CAMBRIDGE_BASE}/dictionary/english-vietnamese/${encodeURIComponent(headword.toLowerCase())}`,
    audioUk,
    audioUs,
    word: {
      word_root: headword,
      ipa_uk: ipaUk ? `/${ipaUk.replace(/^\/|\/$/g, '')}/` : '',
      ipa_us: ipaUs ? `/${ipaUs.replace(/^\/|\/$/g, '')}/` : (ipaUk ? `/${ipaUk.replace(/^\/|\/$/g, '')}/` : ''),
      partOfSpeech: pos,
      level: level || 'B1',
      meaning_vi: primaryMeaningVi || headword,
      definition_vi: viTranslations.slice(0, 3).join('; '),
      definition_en: primaryDefEn,
      examples: examples.slice(0, 3),
      word_family: [],
      other_meanings: otherMeanings,
      collocations: collocations,
      synonyms: []
    }
  };
}

/**
 * Fetch word from Cambridge Dictionary Online with fast timeout (1800ms)
 * Tests candidate lemmas if the exact form is not found (e.g. "becomes" -> "become")
 */
export async function fetchFromCambridge(word) {
  const cleanWord = (word || '').trim().toLowerCase();
  if (!cleanWord || cleanWord.length > 45 || cleanWord.includes(' ')) {
    return null; // Only query single words / compounds
  }

  const lemmas = getCandidateLemmas(cleanWord);

  for (const lemma of lemmas) {
    const urls = [
      `${CAMBRIDGE_BASE}/dictionary/english-vietnamese/${encodeURIComponent(lemma)}`,
      `${CAMBRIDGE_BASE}/dictionary/english/${encodeURIComponent(lemma)}`
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800); // 1.8s timeout for maximum speed

        const resp = await fetch(url, {
          signal: controller.signal,
          credentials: 'include',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache'
          }
        });
        clearTimeout(timeoutId);

        if (!resp.ok) continue;

        const html = await resp.text();
        const parsed = parseCambridgeHTML(html, cleanWord);
        if (parsed && (parsed.word?.meaning_vi || parsed.word?.definition_en)) {
          if (lemma !== cleanWord && !parsed.word.word_root) {
            parsed.word.word_root = lemma;
          }
          return parsed;
        }
      } catch (_) {
        // Fast timeout, proceed to next or fallback to AI
      }
    }
  }

  return null;
}
