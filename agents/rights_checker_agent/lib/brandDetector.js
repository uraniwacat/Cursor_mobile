/**
 * ブランド・商標検出モジュール
 * 実在する企業名、製品名、サービス名を検出
 */

// よく使用される企業・サービス名のデータベース
const KNOWN_BRANDS = {
  // 動画配信サービス
  streaming: [
    'Netflix', 'Amazon Prime', 'Disney+', 'Hulu', 'U-NEXT', 'dTV', 'Paravi', 'ABEMA',
    'YouTube Premium', 'Apple TV+', 'HBO Max', 'Peacock'
  ],
  // 音楽配信
  music: [
    'Spotify', 'Apple Music', 'Amazon Music', 'LINE MUSIC', 'AWA', 'YouTube Music'
  ],
  // SNS・コミュニケーション
  social: [
    'Twitter', 'X', 'Facebook', 'Instagram', 'TikTok', 'LINE', 'Discord', 'Slack',
    'Teams', 'Zoom', 'WeChat', 'WhatsApp', 'Threads'
  ],
  // テック企業
  tech: [
    'Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'OpenAI', 'ChatGPT', 'NVIDIA',
    'Tesla', 'Sony', 'Samsung', 'Huawei', 'ByteDance'
  ],
  // フードデリバリー
  food: [
    'Uber Eats', 'ウーバーイーツ', '出前館', 'Wolt', 'menu', 'foodpanda'
  ],
  // ファッション
  fashion: [
    'UNIQLO', 'ユニクロ', 'ZARA', 'H&M', 'GU', 'しまむら', 'SHEIN'
  ],
  // コンビニ・小売
  retail: [
    'セブンイレブン', 'ローソン', 'ファミリーマート', 'Amazon', '楽天', 'メルカリ'
  ],
  // AIサービス
  ai: [
    'ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Midjourney', 'Stable Diffusion',
    'DALL-E', 'Sora', 'Perplexity'
  ]
};

// カテゴリごとのリスクレベル
const CATEGORY_RISK = {
  streaming: 'low',
  music: 'low',
  social: 'low',
  tech: 'medium',
  food: 'low',
  fashion: 'medium',
  retail: 'low',
  ai: 'low'
};

/**
 * テキスト内のブランド名を検出
 * @param {string} text - 検査対象のテキスト
 * @returns {Array} 検出されたブランドのリスト
 */
function detectBrands(text) {
  const results = [];
  const lines = text.split('\n');

  for (const [category, brands] of Object.entries(KNOWN_BRANDS)) {
    for (const brand of brands) {
      // 大文字小文字を区別しない検索
      const regex = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      lines.forEach((line, index) => {
        const matches = line.match(regex);
        if (matches) {
          matches.forEach(match => {
            results.push({
              type: 'brand_mention',
              category: category,
              content: match,
              line: index + 1,
              context: line.trim().substring(0, 100),
              risk: CATEGORY_RISK[category],
              suggestion: getBrandSuggestion(category, match)
            });
          });
        }
      });
    }
  }

  return results;
}

/**
 * ブランド使用に対する提案を生成
 */
function getBrandSuggestion(category, brand) {
  const suggestions = {
    streaming: `「${brand}」は商標です。風刺目的での使用は一般に許容されますが、商用利用時は「動画配信サービス」などの一般名詞への置換を検討してください。`,
    music: `「${brand}」への言及は風刺として許容される可能性が高いですが、否定的な文脈での使用には注意が必要です。`,
    social: `SNSサービス名の言及は一般に問題ありませんが、特定の批判を行う場合は事実確認を。`,
    tech: `大手テック企業への言及は注目を集めやすいため、事実に基づかない批判は避けてください。`,
    food: `フードデリバリーサービス名の使用は風刺目的であれば問題ありません。`,
    fashion: `ファッションブランドへの言及は、品質や労働環境への批判時には根拠が必要です。`,
    retail: `小売ブランドの使用は一般に問題ありませんが、虚偽の情報は避けてください。`,
    ai: `AIサービス名の使用は現在活発に議論されている分野のため、最新の動向に注意してください。`
  };

  return suggestions[category] || '商標使用には注意が必要です。';
}

module.exports = { detectBrands, KNOWN_BRANDS };
