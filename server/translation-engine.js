// ========================================
// AI Translator — Translation Engine
// MyMemory API Integration
// ========================================

// In-memory cache for translations
const cache = new Map();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Splits text into chunks of roughly 500 characters, respecting sentence boundaries.
 * @param {string} text - The input text
 * @param {number} limit - The character limit per chunk (default 500)
 * @returns {string[]} - Array of text chunks
 */
function chunkText(text, limit = 500) {
  if (text.length <= limit) return [text];

  const chunks = [];
  let index = 0;

  while (index < text.length) {
    let chunkSize = limit;
    
    // If we're not at the end, try to find a good breaking point (sentence or paragraph)
    if (index + chunkSize < text.length) {
      const slice = text.substring(index, index + chunkSize + 50); // look ahead a bit
      const lastSentence = slice.substring(0, chunkSize).lastIndexOf('.');
      const lastNewline = slice.substring(0, chunkSize).lastIndexOf('\n');
      
      if (lastNewline > chunkSize * 0.7) {
        chunkSize = lastNewline + 1;
      } else if (lastSentence > chunkSize * 0.7) {
        chunkSize = lastSentence + 1;
      } else {
        // Fallback: find last space
        const lastSpace = slice.substring(0, chunkSize).lastIndexOf(' ');
        if (lastSpace > chunkSize * 0.5) {
          chunkSize = lastSpace + 1;
        }
      }
    }

    chunks.push(text.substring(index, index + chunkSize).trim());
    index += chunkSize;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Translate text using MyMemory API (with auto-chunking for large queries)
 * @param {string} text - Text to translate
 * @param {string} from - Source language code
 * @param {string} to - Target language code
 * @returns {Promise<{translatedText: string, match: number}>}
 */
async function translate(text, from, to) {
  if (from === to) return { translatedText: text, match: 1.0 };

  const chunks = chunkText(text, 450); // use 450 to stay safely under 500 limit
  const translatedChunks = [];
  let totalMatch = 0;

  for (const chunk of chunks) {
    // Check cache for this specific chunk
    const cacheKey = `${from}|${to}|${chunk}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      translatedChunks.push(cached.translatedText);
      totalMatch += cached.match;
      continue;
    }

    // Build URL
    const params = new URLSearchParams({ q: chunk, langpair: `${from}|${to}` });
    const url = `https://api.mymemory.translated.net/get?${params.toString()}`;

    let lastError;
    let chunkResult = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'application/json', 'User-Agent': 'AI-Translator/1.0' },
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();

        if (data.responseStatus === 403 || data.responseStatus === 429) {
          throw new Error('Translation limit reached. Sequential processing delayed.');
        }

        const transText = data.responseData.translatedText;
        const matchValue = data.responseData.match || 0;

        chunkResult = { transText, matchValue };
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    if (!chunkResult) throw lastError || new Error('Failed to translate chunk');

    // Cache it
    if (cache.size >= CACHE_MAX_SIZE) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { 
      translatedText: chunkResult.transText, 
      match: chunkResult.matchValue, 
      timestamp: Date.now() 
    });

    translatedChunks.push(chunkResult.transText);
    totalMatch += chunkResult.matchValue;

    // Small delay between chunks to avoid rate limiting
    if (chunks.length > 1) await new Promise(r => setTimeout(r, 200));
  }

  return {
    translatedText: translatedChunks.join(' '),
    match: totalMatch / chunks.length
  };
}

/**
 * Detect language of text (basic implementation using MyMemory)
 * @param {string} text - Text to detect language for
 * @returns {Promise<string>} - Detected language code
 */
async function detectLanguage(text) {
  try {
    const params = new URLSearchParams({
      q: text,
      langpair: 'autodetect|en',
    });

    const url = `https://api.mymemory.translated.net/get?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.responseData && data.responseData.detectedLanguage) {
      return data.responseData.detectedLanguage;
    }

    return 'en'; // Default fallback
  } catch {
    return 'en';
  }
}

module.exports = { translate, detectLanguage };
