/**
 * 有名人・著名人検出モジュール
 * 実在の人物への言及を検出
 */

// パターンベースの検出（「〜風」「〜のような」など）
const STYLE_PATTERNS = [
  /(.+?)風/g,
  /(.+?)のような/g,
  /(.+?)っぽい/g,
  /(.+?)調/g,
  /(.+?)スタイル/g,
  /(.+?)みたいな/g
];

// 著名人カテゴリとリスクレベル
const PERSON_CATEGORIES = {
  comedian: { risk: 'medium', description: '芸人・コメディアン' },
  actor: { risk: 'medium', description: '俳優・女優' },
  musician: { risk: 'high', description: 'ミュージシャン・歌手' },
  politician: { risk: 'low', description: '政治家（公人として風刺対象になりやすい）' },
  business: { risk: 'medium', description: '経営者・実業家' },
  influencer: { risk: 'medium', description: 'インフルエンサー・YouTuber' },
  writer: { risk: 'low', description: '作家・評論家' }
};

// 知名度の高い日本の著名人（例）
const KNOWN_PERSONS = {
  comedian: ['バカリズム', 'サンドウィッチマン', '千鳥', 'かまいたち', 'ダウンタウン', '爆笑問題'],
  business: ['孫正義', '三木谷浩史', '前澤友作', '堀江貴文'],
  // 注：実際の実装ではより包括的なデータベースが必要
};

/**
 * テキスト内の人物参照を検出
 * @param {string} text - 検査対象のテキスト
 * @returns {Array} 検出された人物参照のリスト
 */
function detectPersonReferences(text) {
  const results = [];
  const lines = text.split('\n');

  // スタイルパターンの検出（「〜風」など）
  lines.forEach((line, index) => {
    STYLE_PATTERNS.forEach(pattern => {
      const matches = [...line.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && match[1].length > 1 && match[1].length < 20) {
          results.push({
            type: 'style_reference',
            content: match[0],
            referencedName: match[1],
            line: index + 1,
            context: line.trim().substring(0, 100),
            risk: 'medium',
            suggestion: `「${match[1]}風」という表現は、実在の人物を指す場合、その人物の許諾なく商用利用することはリスクがあります。創作であることを明示するか、架空の名称への変更を検討してください。`
          });
        }
      });
    });
  });

  // 既知の著名人名の直接検出
  for (const [category, persons] of Object.entries(KNOWN_PERSONS)) {
    for (const person of persons) {
      const regex = new RegExp(person, 'g');
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          results.push({
            type: 'person_mention',
            category: category,
            content: person,
            line: index + 1,
            context: line.trim().substring(0, 100),
            risk: PERSON_CATEGORIES[category]?.risk || 'medium',
            suggestion: getPersonSuggestion(category, person)
          });
        }
      });
    }
  }

  return results;
}

/**
 * 人物参照に対する提案を生成
 */
function getPersonSuggestion(category, person) {
  const categoryInfo = PERSON_CATEGORIES[category];
  
  if (category === 'politician') {
    return `政治家「${person}」への言及は、公人として風刺・批評の対象になることが法的に認められやすいですが、事実に基づかない誹謗中傷は避けてください。`;
  }
  
  if (category === 'comedian') {
    return `芸人「${person}」の芸風を参考にした創作は、「〜風」と明示することで許容される場合がありますが、本人の発言として誤解される表現は避けてください。`;
  }
  
  return `「${person}」（${categoryInfo?.description || '著名人'}）への言及は、文脈によってはパブリシティ権の侵害となる可能性があります。風刺目的であることを明確にしてください。`;
}

module.exports = { detectPersonReferences, STYLE_PATTERNS, KNOWN_PERSONS };
