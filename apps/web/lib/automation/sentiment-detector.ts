/**
 * Client-Side Sentiment & Spam Detection Engine for Flow Builder
 * Provides live testing and visual risk scoring in the creator dashboard.
 */

export interface SentimentAnalysisResult {
  isHarmful: boolean;
  score: number; // 0 to 100
  category: 'CLEAN' | 'BLOCKLIST' | 'SPAM' | 'TOXIC' | 'REFUND_DISPUTE';
  flaggedKeywords: string[];
  reason: string;
}

export interface SentimentOptions {
  customBlocklist?: string[];
  sensitivity?: 'strict' | 'moderate' | 'loose';
}

const SPAM_PATTERNS = [
  /t\.me\/[a-zA-Z0-9_]+/i,
  /telegram/i,
  /whatsapp/i,
  /\b(dm|inbox)\s+(me|him|her|them)\s+(to|for)\b/i,
  /\b(crypto|bitcoin|forex|invest|binary|profits?)\b/i,
  /\b(whatsapp|wa\.me|call\s+me)\b/i,
  /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /\b(hack|recover|banned\s+account|unban)\b/i,
];

const TOXIC_KEYWORDS = [
  'scam', 'scammer', 'scammers', 'scammed',
  'fake', 'fraud', 'fraudulent', 'rip off', 'ripoff',
  'liar', 'liars', 'lying', 'cheat', 'cheater', 'cheaters',
  'stole', 'stolen', 'theft', 'thief',
  'worst', 'terrible', 'horrible', 'trash', 'garbage', 'useless',
  'shit', 'bullshit', 'fuck', 'fucking', 'bitch', 'asshole', 'idiot', 'stupid',
  'loser', 'disgusting', 'pathetic', 'clown',
];

const REFUND_DISPUTE_KEYWORDS = [
  'refund', 'refund me', 'give my money back', 'money back',
  'chargeback', 'dispute', 'unauthorized', 'cancel my order',
  'never delivered', 'never arrived', 'didnt receive', "didn't receive",
  'where is my order', 'lost my money',
];

export function analyzeCommentSentiment(
  text: string,
  options: SentimentOptions = {},
): SentimentAnalysisResult {
  if (!text || typeof text !== 'string') {
    return {
      isHarmful: false,
      score: 0,
      category: 'CLEAN',
      flaggedKeywords: [],
      reason: 'Empty comment',
    };
  }

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();
  const flaggedKeywords: string[] = [];
  let score = 0;
  let category: SentimentAnalysisResult['category'] = 'CLEAN';

  const customBlocklist = options.customBlocklist || [];
  for (const blockWord of customBlocklist) {
    const trimmed = blockWord.trim().toLowerCase();
    if (trimmed && lowerText.includes(trimmed)) {
      flaggedKeywords.push(blockWord.trim());
      score = Math.max(score, 95);
      category = 'BLOCKLIST';
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(lowerText)) {
      score = Math.max(score, 85);
      if (category === 'CLEAN') category = 'SPAM';
      flaggedKeywords.push(pattern.source);
    }
  }

  for (const refundWord of REFUND_DISPUTE_KEYWORDS) {
    if (lowerText.includes(refundWord)) {
      score = Math.max(score, 75);
      if (category === 'CLEAN') category = 'REFUND_DISPUTE';
      flaggedKeywords.push(refundWord);
    }
  }

  for (const toxicWord of TOXIC_KEYWORDS) {
    const regex = new RegExp(`\\b${toxicWord}\\b`, 'i');
    if (regex.test(lowerText)) {
      score = Math.max(score, 80);
      if (category === 'CLEAN') category = 'TOXIC';
      flaggedKeywords.push(toxicWord);
    }
  }

  const lettersOnly = cleanText.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length > 15 && lettersOnly === lettersOnly.toUpperCase()) {
    score += 15;
  }

  score = Math.min(100, score);

  const sensitivity = options.sensitivity || 'moderate';
  const threshold = sensitivity === 'strict' ? 35 : sensitivity === 'loose' ? 75 : 55;

  const isHarmful = score >= threshold;

  let reason = 'Clean comment';
  if (category === 'BLOCKLIST') {
    reason = `Matches your custom blocklist keyword: "${flaggedKeywords.join(', ')}"`;
  } else if (category === 'SPAM') {
    reason = 'Spam pattern or promotion detected';
  } else if (category === 'REFUND_DISPUTE') {
    reason = `Refund dispute detected: "${flaggedKeywords.join(', ')}"`;
  } else if (category === 'TOXIC') {
    reason = `Negative/toxic tone detected: "${flaggedKeywords.join(', ')}"`;
  }

  return {
    isHarmful,
    score,
    category,
    flaggedKeywords: Array.from(new Set(flaggedKeywords)),
    reason,
  };
}
