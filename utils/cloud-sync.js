// d:/extension/utils/cloud-sync.js
// Unified 2-Way Cloud Sync Engine (GitHub Secret Gist) + Pairing Encoder
// Connects Chrome Extension (PC), iPad PWA, Safari Userscript, and Windows Desktop

export const SYNC_GIST_FILENAME = 'vocabmaster-sync-v1.json';
export const SYNC_GIST_DESCRIPTION = 'VocabMaster AI — Cloud Sync Database (PC & iPad)';
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const STATUS_RANK = { new: 0, learning: 1, learned: 2 };

/**
 * Normalize either Chrome Extension entry or legacy iPad/CSV entry into canonical schema.
 */
export function normalizeVocabEntry(raw) {
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
export function mergeSyncState(localState = {}, remoteState = {}) {
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

/**
 * Computes canonical stable digest to check if remote Gist actually needs PATCH.
 */
function buildPayloadDigest(vocab, tombstones, lexicon) {
  return JSON.stringify({
    v: vocab.map(w => [w.word.toLowerCase(), w.updatedAt, w.status, w.reviewCount, w.meaning_vi]),
    t: Object.entries(tombstones).sort(),
    l: Object.entries(lexicon).sort()
  });
}

async function githubFetch(url, token, options = {}) {
  const headers = {
    'Authorization': `Bearer ${token.trim()}`,
    'Accept': 'application/vnd.github+json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers
  });

  if (res.status === 401) {
    throw new Error('GitHub Token không hợp lệ hoặc đã hết hạn (401). Hãy kiểm tra lại Token quyền "gist".');
  }
  if (res.status === 403) {
    throw new Error('GitHub từ chối truy cập (403). Đảm bảo Token đã bật quyền đọc/ghi "Gists".');
  }
  if (res.status === 404) {
    const err = new Error('Không tìm thấy Gist đồng bộ (404).');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Lỗi GitHub API (${res.status}): ${txt.slice(0, 120)}`);
  }
  return res.json();
}

/**
 * Find existing VocabMaster Sync Gist or create a new Secret Gist.
 */
export async function findOrCreateSyncGist(token, preferredGistId = '') {
  const cleanToken = (token || '').trim();
  if (!cleanToken) throw new Error('Vui lòng nhập GitHub Personal Access Token.');

  if (preferredGistId) {
    try {
      const existing = await githubFetch(
        `https://api.github.com/gists/${encodeURIComponent(preferredGistId.trim())}?_t=${Date.now()}`,
        cleanToken
      );
      if (existing?.id) return existing;
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }

  // Search user's gists for existing VocabMaster Sync Gist
  const gists = await githubFetch(
    `https://api.github.com/gists?per_page=30&_t=${Date.now()}`,
    cleanToken
  );
  if (Array.isArray(gists)) {
    const matched = gists.find(g => g.files && g.files[SYNC_GIST_FILENAME]);
    if (matched) {
      return githubFetch(`https://api.github.com/gists/${matched.id}?_t=${Date.now()}`, cleanToken);
    }
  }

  // Create new Secret Gist
  const initialData = {
    schemaVersion: 1,
    lastSyncedAt: new Date().toISOString(),
    vocabulary: [],
    tombstones: {},
    customLexicon: {}
  };

  return githubFetch('https://api.github.com/gists', cleanToken, {
    method: 'POST',
    body: JSON.stringify({
      description: SYNC_GIST_DESCRIPTION,
      public: false,
      files: {
        [SYNC_GIST_FILENAME]: {
          content: JSON.stringify(initialData, null, 2)
        }
      }
    })
  });
}

/**
 * Execute full 2-way synchronization with GitHub Secret Gist.
 */
export async function syncWithGitHubGist({
  token,
  gistId = '',
  localVocab = [],
  localTombstones = {},
  localLexicon = {}
}) {
  const gist = await findOrCreateSyncGist(token, gistId);
  const fileObj = gist.files?.[SYNC_GIST_FILENAME];

  let remoteText = fileObj?.content || '';
  if (fileObj?.truncated && fileObj?.raw_url) {
    const rawRes = await fetch(`${fileObj.raw_url}?_t=${Date.now()}`, { cache: 'no-store' });
    if (rawRes.ok) remoteText = await rawRes.text();
  }

  let remoteData = { vocabulary: [], tombstones: {}, customLexicon: {} };
  if (remoteText) {
    try {
      const parsed = JSON.parse(remoteText);
      if (parsed && typeof parsed === 'object') {
        remoteData = {
          vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
          tombstones: parsed.tombstones && typeof parsed.tombstones === 'object' ? parsed.tombstones : {},
          customLexicon: parsed.customLexicon && typeof parsed.customLexicon === 'object' ? parsed.customLexicon : {}
        };
      }
    } catch (_) {}
  }

  const normalizedLocal = (localVocab || []).map(normalizeVocabEntry).filter(Boolean);
  const normalizedRemote = (remoteData.vocabulary || []).map(normalizeVocabEntry).filter(Boolean);

  const merged = mergeSyncState(
    { vocabulary: normalizedLocal, tombstones: localTombstones, customLexicon: localLexicon },
    { vocabulary: normalizedRemote, tombstones: remoteData.tombstones, customLexicon: remoteData.customLexicon }
  );

  const remoteDigest = buildPayloadDigest(normalizedRemote, remoteData.tombstones, remoteData.customLexicon);
  const mergedDigest = buildPayloadDigest(merged.vocabulary, merged.tombstones, merged.customLexicon);

  let pushed = false;
  if (remoteDigest !== mergedDigest || !fileObj) {
    const payload = {
      schemaVersion: 1,
      lastSyncedAt: new Date().toISOString(),
      vocabulary: merged.vocabulary,
      tombstones: merged.tombstones,
      customLexicon: merged.customLexicon
    };
    await githubFetch(`https://api.github.com/gists/${gist.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({
        files: {
          [SYNC_GIST_FILENAME]: {
            content: JSON.stringify(payload, null, 2)
          }
        }
      })
    });
    pushed = true;
  }

  return {
    gistId: gist.id,
    gistUrl: gist.html_url || `https://gist.github.com/${gist.id}`,
    vocabulary: merged.vocabulary,
    tombstones: merged.tombstones,
    customLexicon: merged.customLexicon,
    pushed,
    syncedAt: new Date().toISOString()
  };
}

/**
 * UTF-8 safe URL-safe Base64 encoding/decoding for Magic Pairing URLs (#pair=...)
 * Keys live strictly in the URL hash fragment (never sent in HTTP requests).
 */
export function encodePairingPayload(configObj) {
  const json = JSON.stringify({ v: 1, ...configObj });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePairingPayload(encodedStr) {
  if (!encodedStr || typeof encodedStr !== 'string') return null;
  let clean = encodedStr.trim();
  if (clean.includes('#pair=')) {
    clean = clean.split('#pair=')[1].split('&')[0];
  } else if (clean.startsWith('pair=')) {
    clean = clean.slice(5);
  }
  try {
    let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (_) {
    return null;
  }
}
