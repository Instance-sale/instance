import { describe, it, expect } from 'vitest';
import { levenshteinDistance, isFuzzyKeywordMatch } from './fuzzy-match';

describe('fuzzy-match', () => {
  describe('levenshteinDistance', () => {
    it('calculates distance between exact and modified strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('pricing', 'pricing')).toBe(0);
      expect(levenshteinDistance('prcing', 'pricing')).toBe(1);
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });

  describe('isFuzzyKeywordMatch', () => {
    it('returns isMatch false when input or keywords are empty', () => {
      expect(isFuzzyKeywordMatch('', ['price']).isMatch).toBe(false);
      expect(isFuzzyKeywordMatch('hello', []).isMatch).toBe(false);
    });

    it('matches exact keywords', () => {
      const res = isFuzzyKeywordMatch('I want the discount code please', ['discount']);
      expect(res.isMatch).toBe(true);
      expect(res.matchedKeyword).toBe('discount');
    });

    it('tolerates small typos in keywords', () => {
      const res = isFuzzyKeywordMatch('Can I get the discuont?', ['discount']);
      expect(res.isMatch).toBe(true);
      expect(res.matchedKeyword).toBe('discount');
    });

    it('respects exactOnly flag', () => {
      const res = isFuzzyKeywordMatch('Can I get the discuont?', ['discount'], { exactOnly: true });
      expect(res.isMatch).toBe(false);
    });
  });
});
