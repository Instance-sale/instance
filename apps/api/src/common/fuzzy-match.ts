/**
 * Levenshtein distance calculation between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; ++i) matrix[i] = [i];
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

export interface FuzzyMatchResult {
  isMatch: boolean;
  matchedKeyword?: string;
  distance?: number;
  confidence?: number;
}

/**
 * Checks if input text matches any keyword using typo-tolerant fuzzy logic.
 */
export function isFuzzyKeywordMatch(
  inputText: string,
  keywords: string[],
  options?: {
    sensitivity?: 'strict' | 'normal' | 'loose';
    exactOnly?: boolean;
  },
): FuzzyMatchResult {
  if (!inputText || !keywords || keywords.length === 0) {
    return { isMatch: false };
  }

  const cleanInput = inputText.toLowerCase().trim();
  const sensitivity = options?.sensitivity || 'normal';

  // 1. Direct contains or exact check first
  for (const rawKw of keywords) {
    const kw = rawKw.toLowerCase().trim();
    if (!kw) continue;
    if (cleanInput === kw || cleanInput.includes(kw)) {
      return {
        isMatch: true,
        matchedKeyword: rawKw,
        distance: 0,
        confidence: 100,
      };
    }
  }

  // If exact only is requested, stop here
  if (options?.exactOnly) {
    return { isMatch: false };
  }

  // 2. Tokenize input into clean words
  const words = cleanInput
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let bestMatch: FuzzyMatchResult = { isMatch: false };
  let highestConfidence = 0;

  for (const rawKw of keywords) {
    const kw = rawKw.toLowerCase().trim();
    if (!kw) continue;
    const kwLen = kw.length;

    // Thresholds:
    // <= 4 chars: 0 distance (or 1 for loose)
    // 5-7 chars: 1 distance (or 2 for loose)
    // >= 8 chars: 2 distance (or 3 for loose)
    let maxAllowedDistance = 0;
    if (kwLen <= 4) {
      maxAllowedDistance = sensitivity === 'loose' ? 1 : 0;
    } else if (kwLen <= 7) {
      maxAllowedDistance = sensitivity === 'strict' ? 1 : (sensitivity === 'loose' ? 2 : 1);
    } else {
      maxAllowedDistance = sensitivity === 'strict' ? 1 : (sensitivity === 'loose' ? 3 : 2);
    }

    if (maxAllowedDistance === 0 && kwLen <= 4) {
      continue;
    }

    // Check single word match
    for (const word of words) {
      if (Math.abs(word.length - kwLen) <= maxAllowedDistance) {
        const dist = levenshteinDistance(word, kw);
        if (dist <= maxAllowedDistance) {
          const confidence = Math.round(((kwLen - dist) / kwLen) * 100);
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              isMatch: true,
              matchedKeyword: rawKw,
              distance: dist,
              confidence,
            };
          }
        }
      }
    }

    // Check multi-word phrase sliding window
    const kwWords = kw.split(/\s+/).filter(Boolean);
    if (kwWords.length > 1 && words.length >= kwWords.length) {
      for (let i = 0; i <= words.length - kwWords.length; i++) {
        const windowStr = words.slice(i, i + kwWords.length).join(' ');
        if (Math.abs(windowStr.length - kw.length) <= maxAllowedDistance) {
          const dist = levenshteinDistance(windowStr, kw);
          if (dist <= maxAllowedDistance) {
            const confidence = Math.round(((kw.length - dist) / kw.length) * 100);
            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              bestMatch = {
                isMatch: true,
                matchedKeyword: rawKw,
                distance: dist,
                confidence,
              };
            }
          }
        }
      }
    }
  }

  return bestMatch;
}
