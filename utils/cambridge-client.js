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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
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

  // Comparative/superlative: bigger -> big, happier -> happy
  if (w.endsWith('er') && w.length > 4) {
    candidates.push(w.slice(0, -2)); // bigger -> bigg? no, but helps
    candidates.push(w.slice(0, -1)); // wider -> wide
    if (w.length > 5 && w[w.length - 3] === w[w.length - 4]) {
      candidates.push(w.slice(0, -3)); // bigger -> big
    }
    if (w.endsWith('ier') && w.length > 5) {
      candidates.push(w.slice(0, -3) + 'y'); // happier -> happy
    }
  }
  if (w.endsWith('est') && w.length > 5) {
    candidates.push(w.slice(0, -3)); // biggest -> bigg? helps
    candidates.push(w.slice(0, -2)); // nicest -> nice? nices? not perfect but..
    if (w.length > 6 && w[w.length - 4] === w[w.length - 5]) {
      candidates.push(w.slice(0, -4)); // biggest -> big
    }
    if (w.endsWith('iest') && w.length > 6) {
      candidates.push(w.slice(0, -4) + 'y'); // happiest -> happy
    }
  }

  return [...new Set(candidates)];
}

/**
 * Parse a single def-block (ddef_block) to extract paired definition + translation + examples
 */
function parseDefBlock(blockHtml) {
  // English definition
  const defMatch = blockHtml.match(/<div[^>]*class="[^"]*ddef_d[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const defEn = defMatch ? cleanText(defMatch[1]) : '';

  // Vietnamese translation (trans dtrans with lang="vi")
  const transMatch = blockHtml.match(/<span[^>]*class="[^"]*trans\s+dtrans[^"]*"[^>]*lang="vi"[^>]*>([\s\S]*?)<\/span>/i) ||
                     blockHtml.match(/<span[^>]*class="[^"]*dtrans[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const transVi = transMatch ? cleanText(transMatch[1]) : '';

  // Examples within this block
  const examples = [];
  const exRegex = /<span[^>]*class="[^"]*\bdeg\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let em;
  while ((em = exRegex.exec(blockHtml)) !== null) {
    const ex = cleanText(em[1]);
    if (ex && ex.length > 5 && !examples.includes(ex)) {
      examples.push(ex);
    }
  }

  // CEFR Level badge within this block
  const lvlMatch = blockHtml.match(/<span[^>]*class="[^"]*(?:epp-xref|dxref)[^"]*"[^>]*>([A-C][1-2])<\/span>/i);
  const level = lvlMatch ? lvlMatch[1].toUpperCase() : '';

  // Usage label (e.g. "literary", "formal", "informal")
  const usageMatch = blockHtml.match(/<span[^>]*class="[^"]*dusage[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const usage = usageMatch ? cleanText(usageMatch[1]) : '';

  return { defEn, transVi, examples, level, usage };
}

/**
 * Parses raw HTML from Cambridge English-Vietnamese dictionary page
 * Uses sense-by-sense parsing: each def-block links its English definition
 * with its Vietnamese translation and examples.
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
  let pos = '';
  const posMatch = html.match(/<span[^>]*class="[^"]*\bdpos\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (posMatch) {
    pos = cleanText(posMatch[1]);
  }

  // Countability / grammar info (e.g. [C], [U], [T], [I])
  const gramMatch = html.match(/<span[^>]*class="[^"]*dgram[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (gramMatch) {
    const gram = cleanText(gramMatch[1]);
    if (gram && pos && !pos.includes('[')) {
      pos = `${pos} ${gram}`;
    }
  }

  if (!pos) pos = 'noun';

  // 3. Pronunciation & Audio (UK & US)
  // Bilingual dictionaries (english-vietnamese) typically have a SINGLE pronunciation
  // in the entry header using class "ipa dipa" inside "pron dpron".
  // Monolingual pages may have separate UK/US sections with dpron-i.
  let ipaUk = '';
  let ipaUs = '';
  let audioUk = '';
  let audioUs = '';

  // First: try to get the general IPA from the entry header (most bilingual entries)
  const entryHeader = html.match(/<div[^>]*class="[^"]*dpos-h[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*di-body/i);
  if (entryHeader) {
    const headerIpa = entryHeader[1].match(/<span[^>]*class="[^"]*\bipa\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (headerIpa) {
      const ipa = cleanText(headerIpa[1]);
      if (ipa) {
        ipaUk = ipa;
        ipaUs = ipa;
      }
    }
  }

  // Then: try UK/US specific sections (monolingual pages / some entries)
  const ukSection = html.match(/<span[^>]*class="[^"]*uk[^"]*dpron-i[^"]*"[\s\S]*?<\/span>\s*<\/span>/i);
  if (ukSection) {
    const ipaM = ukSection[0].match(/<span[^>]*class="[^"]*\bipa\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (ipaM) ipaUk = cleanText(ipaM[1]);
    const srcM = ukSection[0].match(/<source[^>]*type="audio\/mpeg"[^>]*src="([^"]+)"/i);
    if (srcM) audioUk = srcM[1].startsWith('http') ? srcM[1] : `${CAMBRIDGE_BASE}${srcM[1]}`;
  }

  const usSection = html.match(/<span[^>]*class="[^"]*us[^"]*dpron-i[^"]*"[\s\S]*?<\/span>\s*<\/span>/i);
  if (usSection) {
    const ipaM = usSection[0].match(/<span[^>]*class="[^"]*\bipa\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (ipaM) ipaUs = cleanText(ipaM[1]);
    const srcM = usSection[0].match(/<source[^>]*type="audio\/mpeg"[^>]*src="([^"]+)"/i);
    if (srcM) audioUs = srcM[1].startsWith('http') ? srcM[1] : `${CAMBRIDGE_BASE}${srcM[1]}`;
  }

  // Final fallback: any IPA on the page
  if (!ipaUk && !ipaUs) {
    const generalIpa = html.match(/<span[^>]*class="[^"]*\bipa\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (generalIpa) {
      ipaUk = cleanText(generalIpa[1]);
      ipaUs = ipaUk;
    }
  }

  // 4. Global CEFR Level (bilingual uses "cefr dcefr", monolingual uses "epp-xref/dxref")
  let globalLevel = '';
  const globalLevelMatch = html.match(/<span[^>]*class="[^"]*(?:cefr|epp-xref|dxref)[^"]*"[^>]*>([A-C][1-2])<\/span>/i) ||
                           html.match(/<span[^>]*class="[^"]*(?:cefr|epp-xref|dxref)[^"]*"[^>]*>\s*([A-C][1-2](?:\s*,\s*[A-C][1-2])?)\s*<\/span>/i);
  if (globalLevelMatch) {
    // Take the first level if multiple (e.g. "B2,C1" → "B2")
    globalLevel = globalLevelMatch[1].split(',')[0].trim().toUpperCase();
  }

  // 5. SENSE-BY-SENSE PARSING — the core improvement
  // Extract each def-block and parse definition + translation + examples together
  const senses = [];
  const defBlockRegex = /<div[^>]*class="[^"]*ddef_block[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*ddef_block|<div[^>]*class="[^"]*(?:sense-block|dsense)\s|<\/div>\s*<\/div>\s*<\/div>)/gi;
  let blockMatch;
  while ((blockMatch = defBlockRegex.exec(html)) !== null) {
    const parsed = parseDefBlock(blockMatch[0] + blockMatch[1]);
    if (parsed.transVi || parsed.defEn) {
      senses.push(parsed);
    }
  }

  // Fallback: if regex above didn't capture blocks, try a simpler approach
  if (senses.length === 0) {
    // Try splitting by ddef_block markers
    const blockParts = html.split(/(?=<div[^>]*class="[^"]*ddef_block)/i);
    for (const part of blockParts) {
      if (!part.includes('ddef_block')) continue;
      const parsed = parseDefBlock(part);
      if (parsed.transVi || parsed.defEn) {
        senses.push(parsed);
      }
    }
  }

  // 6. Also grab any dtrans that the block parser might have missed (flat extraction as backup)
  if (senses.length === 0) {
    const viTranslations = [];
    const transRegex = /<span[^>]*class="[^"]*dtrans[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    let tMatch;
    while ((tMatch = transRegex.exec(html)) !== null) {
      const t = cleanText(tMatch[1]);
      if (t && !viTranslations.includes(t)) {
        viTranslations.push(t);
      }
    }

    const enDefinitions = [];
    const defRegex = /<div[^>]*class="[^"]*ddef_d[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let dMatch;
    while ((dMatch = defRegex.exec(html)) !== null) {
      const d = cleanText(dMatch[1]);
      if (d && !enDefinitions.includes(d)) {
        enDefinitions.push(d);
      }
    }

    const examples = [];
    const exampRegex = /<span[^>]*class="[^"]*\bdeg\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    let eMatch;
    while ((eMatch = exampRegex.exec(html)) !== null) {
      const ex = cleanText(eMatch[1]);
      if (ex && !examples.includes(ex)) {
        examples.push(ex);
      }
    }

    // Pair them by index
    const maxSenses = Math.max(viTranslations.length, enDefinitions.length);
    for (let i = 0; i < maxSenses && i < 5; i++) {
      senses.push({
        transVi: viTranslations[i] || '',
        defEn: enDefinitions[i] || '',
        examples: i === 0 ? examples.slice(0, 2) : [],
        level: '',
        usage: ''
      });
    }
  }

  // 7. Collocations / Idioms (phrase-title / dphrase-title)
  const collocations = [];
  // Try to get collocations with their translations
  const phraseBlockRegex = /<div[^>]*class="[^"]*dphrase-block[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*dphrase-block|<\/div>\s*<\/div>\s*<\/div>)/gi;
  let pbMatch;
  while ((pbMatch = phraseBlockRegex.exec(html)) !== null) {
    const phraseContent = pbMatch[0] + pbMatch[1];
    const titleMatch = phraseContent.match(/<[^>]*class="[^"]*(?:phrase-title|dphrase-title)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|b)>/i);
    const transMatch = phraseContent.match(/<span[^>]*class="[^"]*dtrans[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    if (titleMatch) {
      const phr = cleanText(titleMatch[1]);
      const meaning = transMatch ? cleanText(transMatch[1]) : '';
      if (phr && phr.length > 2 && !collocations.some(c => c.phrase === phr)) {
        collocations.push({ phrase: phr, meaning_vi: meaning });
      }
    }
    if (collocations.length >= 4) break;
  }

  // Fallback: simple phrase extraction if the block approach found nothing
  if (collocations.length === 0) {
    const phraseRegex = /<(?:span|div|b)[^>]*class="[^"]*(?:phrase-title|dphrase-title)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|b)>/gi;
    let pMatch;
    while ((pMatch = phraseRegex.exec(html)) !== null) {
      const phr = cleanText(pMatch[1]);
      if (phr && phr.length > 2 && !collocations.some(c => c.phrase === phr)) {
        collocations.push({ phrase: phr, meaning_vi: '' });
      }
      if (collocations.length >= 4) break;
    }
  }

  // 8. Build structured result from senses
  if (senses.length === 0) {
    return null;
  }

  const primarySense = senses[0];
  const primaryMeaningVi = primarySense.transVi || '';
  const primaryDefEn = primarySense.defEn || '';

  if (!primaryMeaningVi && !primaryDefEn) {
    return null;
  }

  // Combine all Vietnamese translations for definition_vi (semicolon-separated)
  const allViTranslations = senses
    .map(s => s.transVi)
    .filter(t => t && t.length > 0);
  const definitionVi = allViTranslations.slice(0, 4).join('; ');

  // Build other_meanings from secondary senses (paired definition + translation)
  const otherMeanings = [];
  for (let i = 1; i < senses.length && i < 5; i++) {
    const s = senses[i];
    if (s.transVi) {
      otherMeanings.push({
        pos: s.usage ? `${pos} (${s.usage})` : pos,
        meaning_vi: s.transVi,
        definition_en: s.defEn || ''
      });
    }
  }

  // Collect all examples from all senses
  const allExamples = [];
  for (const s of senses) {
    for (const ex of s.examples) {
      if (!allExamples.includes(ex)) {
        allExamples.push(ex);
      }
    }
  }

  // Best CEFR level: prefer sense-level, then global
  const bestLevel = primarySense.level || globalLevel || '';

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
      level: bestLevel || 'B1',
      meaning_vi: primaryMeaningVi || headword,
      definition_vi: definitionVi || primaryMeaningVi || headword,
      definition_en: primaryDefEn,
      examples: allExamples.slice(0, 4),
      word_family: [],
      other_meanings: otherMeanings,
      collocations: collocations,
      synonyms: []
    }
  };
}

/**
 * Fetch word from Cambridge Dictionary Online with reliable timeout (3.5s)
 * Tests candidate lemmas if the exact form is not found (e.g. "becomes" -> "become")
 */
export async function fetchFromCambridge(word) {
  const cleanWord = (word || '').trim().toLowerCase();
  if (!cleanWord || cleanWord.length > 45 || cleanWord.includes(' ')) {
    return null; // Only query single words / compounds
  }

  const lemmas = getCandidateLemmas(cleanWord);

  // Strategy: try english-vietnamese first for all lemmas, then english-only as final fallback
  // This avoids wasting time on english-only when english-vietnamese usually works
  const primaryUrls = lemmas.map(l => ({
    lemma: l,
    url: `${CAMBRIDGE_BASE}/dictionary/english-vietnamese/${encodeURIComponent(l)}`
  }));

  // English-only as last resort (only for the first lemma)
  const fallbackUrls = [{
    lemma: lemmas[0],
    url: `${CAMBRIDGE_BASE}/dictionary/english/${encodeURIComponent(lemmas[0])}`
  }];

  const allAttempts = [...primaryUrls, ...fallbackUrls];

  for (const { lemma, url } of allAttempts) {
    // Retry up to 2 times per URL
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutMs = attempt === 0 ? 5000 : 4000; // 5s first, 4s retry
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const resp = await fetch(url, {
          signal: controller.signal,
          credentials: 'include',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Cache-Control': 'no-cache'
          }
        });
        clearTimeout(timeoutId);

        if (resp.status === 403) {
          // Cloudflare Bot Management Challenge detected - bail out immediately
          return null;
        }

        if (!resp.ok) break; // Don't retry 404s etc, move to next URL

        const html = await resp.text();
        const parsed = parseCambridgeHTML(html, cleanWord);
        if (parsed && (parsed.word?.meaning_vi || parsed.word?.definition_en)) {
          if (lemma !== cleanWord) {
            parsed.word.word_root = lemma;
          }
          return parsed;
        }
        break; // Page loaded but no valid entry, don't retry, move to next
      } catch (e) {
        // On timeout (AbortError), retry once; on other errors, move to next
        if (e.name !== 'AbortError' || attempt >= 1) break;
        // Will retry on next loop iteration
      }
    }
  }

  return null;
}

