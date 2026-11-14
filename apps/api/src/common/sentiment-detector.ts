/**
 * Sentiment & Spam Detection Engine for Instagram Comments
 * Evaluates comments for toxicity, aggressive negativity, refund/scam claims, and bot/promo spam.
 */

export interface SentimentAnalysisResult {
  isHarmful: boolean;
  score: number; // 0 to 100 (0 = clean/positive, 100 = severely toxic/spam)
  category: 'CLEAN' | 'BLOCKLIST' | 'SPAM' | 'TOXIC' | 'REFUND_DISPUTE';
  flaggedKeywords: string[];
  reason: string;
}

export interface SentimentOptions {
  customBlocklist?: string[];
  sensitivity?: 'strict' | 'moderate' | 'loose'; // strict (threshold 35), moderate (55), loose (75)
}

// Built-in spam & crypto/bot patterns
const SPAM_PATTERNS = [
  /t\.me\/[a-zA-Z0-9_]+/i,
  /telegram/i,
  /whatsapp/i,
  /\b(dm|inbox)\s+(me|him|her|them)\s+(to|for)\b/i,
  /\b(crypto|bitcoin|forex|invest|binary|profits?)\b/i,
  /\b(whatsapp|wa\.me|call\s+me)\b/i,
  /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone number pattern
  /\b(hack|recover|banned\s+account|unban)\b/i,
];

// Toxic, aggressive & brand-damaging vocabulary
const TOXIC_KEYWORDS = [
  'scam', 'scammer', 'scammers', 'scammed',
  'fake', 'fraud', 'fraudulent', 'rip off', 'ripoff',
  'liar', 'liars', 'lying', 'cheat', 'cheater', 'cheaters',
  'stole', 'stolen', 'theft', 'thief',
  'worst', 'terrible', 'horrible', 'trash', 'garbage', 'useless',
  'shit', 'bullshit', 'fuck', 'fucking', 'bitch', 'asshole', 'idiot', 'stupid',
  'loser', 'disgusting', 'pathetic', 'clown',
];

// Refund / financial dispute claims that damage public conversion
const REFUND_DISPUTE_KEYWORDS = [
  'refund', 'refund me', 'give my money back', 'money back',
  'chargeback', 'dispute', 'unauthorized', 'cancel my order',
  'never delivered', 'never arrived', 'didnt receive', "didn't receive",
  'where is my order', 'lost my money',
];

/**
 * Analyzes comment text against spam patterns, toxic sentiment, refund disputes, and custom blocklists.
 */
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

  // 1. Check Creator Custom Blocklist
  const customBlocklist = options.customBlocklist || [];
  for (const blockWord of customBlocklist) {
    const trimmed = blockWord.trim().toLowerCase();
    if (trimmed && lowerText.includes(trimmed)) {
      flaggedKeywords.push(blockWord.trim());
      score = Math.max(score, 95);
      category = 'BLOCKLIST';
    }
  }

  // 2. Check Spam / Bot / Telegram / Crypto patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(lowerText)) {
      score = Math.max(score, 85);
      if (category === 'CLEAN') category = 'SPAM';
      flaggedKeywords.push(pattern.source);
    }
  }

  // 3. Check Refund / Dispute claims
  for (const refundWord of REFUND_DISPUTE_KEYWORDS) {
    if (lowerText.includes(refundWord)) {
      score = Math.max(score, 75);
      if (category === 'CLEAN') category = 'REFUND_DISPUTE';
      flaggedKeywords.push(refundWord);
    }
  }

  // 4. Check Toxic / Profane / Offensive keywords
  for (const toxicWord of TOXIC_KEYWORDS) {
    // Word boundary check
    const regex = new RegExp(`\\b${toxicWord}\\b`, 'i');
    if (regex.test(lowerText)) {
      score = Math.max(score, 80);
      if (category === 'CLEAN') category = 'TOXIC';
      flaggedKeywords.push(toxicWord);
    }
  }

  // 5. Capslock Aggression Check (if comment is all uppercase and longer than 15 chars)
  const lettersOnly = cleanText.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length > 15 && lettersOnly === lettersOnly.toUpperCase()) {
    score += 15;
  }

  score = Math.min(100, score);

  // Threshold based on sensitivity
  const sensitivity = options.sensitivity || 'moderate';
  const threshold = sensitivity === 'strict' ? 35 : sensitivity === 'loose' ? 75 : 55;

  const isHarmful = score >= threshold;

  let reason = 'Clean comment';
  if (category === 'BLOCKLIST') {
    reason = `Matched custom blocklist: "${flaggedKeywords.join(', ')}"`;
  } else if (category === 'SPAM') {
    reason = 'Spam or unsolicited promotional link detected';
  } else if (category === 'REFUND_DISPUTE') {
    reason = `Order dispute or refund keyword detected: "${flaggedKeywords.join(', ')}"`;
  } else if (category === 'TOXIC') {
    reason = `Offensive or toxic language detected: "${flaggedKeywords.join(', ')}"`;
  }

  return {
    isHarmful,
    score,
    category,
    flaggedKeywords: Array.from(new Set(flaggedKeywords)),
    reason,
  };
}
