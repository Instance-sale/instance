import { describe, it, expect } from 'vitest';
import { analyzeCommentSentiment } from './sentiment-detector';

describe('sentiment-detector', () => {
  it('returns clean for positive or neutral comments', () => {
    const res = analyzeCommentSentiment('Love this product! Amazing quality and fast delivery.');
    expect(res.isHarmful).toBe(false);
    expect(res.category).toBe('CLEAN');
    expect(res.score).toBe(0);
  });

  it('detects custom creator blocklist keywords', () => {
    const res = analyzeCommentSentiment('Check out our competitors', {
      customBlocklist: ['competitors'],
    });
    expect(res.isHarmful).toBe(true);
    expect(res.category).toBe('BLOCKLIST');
    expect(res.flaggedKeywords).toContain('competitors');
  });

  it('flags scam or toxic comments', () => {
    const res = analyzeCommentSentiment('Total scammer, this site is a fraud!');
    expect(res.isHarmful).toBe(true);
    expect(res.category).toBe('TOXIC');
    expect(res.flaggedKeywords.length).toBeGreaterThan(0);
  });

  it('flags refund and chargeback disputes', () => {
    const res = analyzeCommentSentiment('Where is my order? Give my money back!');
    expect(res.isHarmful).toBe(true);
    expect(res.category).toBe('REFUND_DISPUTE');
  });

  it('flags telegram/whatsapp bot spam', () => {
    const res = analyzeCommentSentiment('Dm me for crypto profits on whatsapp +12345678901');
    expect(res.isHarmful).toBe(true);
    expect(res.category).toBe('SPAM');
  });
});
