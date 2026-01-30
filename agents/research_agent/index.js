/**
 * Research Agent
 * トレンド分析・調査を行うエージェント
 */

const path = require('path');
const { writeJson, dateString } = require('../../shared/lib/fileManager');
const { logger } = require('../../shared/lib/logger');

// トレンドデータベース（サンプル）
const TREND_DATABASE = {
  // AI関連
  'AI': [
    { name: 'AI通知疲れ', relevance: 94, description: 'AIアシスタントからの過剰な通知や提案による疲労' },
    { name: 'プロンプト職人化', relevance: 89, description: 'AI操作スキルが新たな専門職として確立' },
    { name: '創作者のアイデンティティ危機', relevance: 82, description: 'AIと人間の創造性の境界が曖昧に' },
    { name: 'AIコンテンツ飽和', relevance: 76, description: 'AI生成コンテンツの氾濫による情報過多' }
  ],
  'サブスク': [
    { name: 'サブスク地獄', relevance: 91, description: '複数サービスの契約による経済的・精神的負担' },
    { name: '解約UXの闇', relevance: 85, description: '意図的に複雑化された解約プロセス' },
    { name: 'デジタル小作人', relevance: 78, description: '所有せず借りるだけの消費者の状態' }
  ],
  'SNS': [
    { name: 'SNS断捨離', relevance: 88, description: 'ソーシャルメディアからの意図的な離脱' },
    { name: 'いいね経済', relevance: 84, description: '承認欲求を通貨とした新しい経済圏' },
    { name: '比較疲れ', relevance: 81, description: '他者との比較による慢性的な疲労感' }
  ],
  'リモート': [
    { name: 'リモートワーク孤独', relevance: 86, description: '在宅勤務による社会的孤立' },
    { name: '境界線崩壊', relevance: 83, description: '仕事とプライベートの区別の消失' },
    { name: '会議地獄', relevance: 79, description: 'オンライン会議の過剰な増加' }
  ],
  '環境': [
    { name: 'グリーンウォッシュ疲れ', relevance: 87, description: '環境配慮を装ったマーケティングへの不信' },
    { name: 'エコ罪悪感', relevance: 80, description: '環境に悪い行動への慢性的な罪悪感' },
    { name: '個人責任転嫁', relevance: 77, description: '企業から個人への環境責任の押し付け' }
  ],
  '消費': [
    { name: 'ファストファッション葛藤', relevance: 84, description: '安価な服と環境負荷の間での葛藤' },
    { name: '所有しない生活', relevance: 79, description: 'ミニマリズムとサブスクの融合' },
    { name: '衝動買いAI', relevance: 75, description: 'AIによるパーソナライズ広告の巧妙化' }
  ]
};

// キーワードマッピング
const KEYWORD_MAP = {
  'AI疲れ': ['AI'],
  '人工知能': ['AI'],
  'ChatGPT': ['AI'],
  'サブスク疲れ': ['サブスク'],
  'サブスクリプション': ['サブスク'],
  'SNS疲れ': ['SNS'],
  'ソーシャル': ['SNS'],
  'Twitter': ['SNS'],
  'Instagram': ['SNS'],
  'リモートワーク': ['リモート'],
  'テレワーク': ['リモート'],
  '在宅勤務': ['リモート'],
  'SDGs': ['環境'],
  'サステナブル': ['環境'],
  'エシカル': ['環境'],
  '消費社会': ['消費'],
  'ショッピング': ['消費']
};

/**
 * キーワードからカテゴリを特定
 */
function detectCategories(keywords) {
  const categories = new Set();
  
  keywords.forEach(keyword => {
    // 直接マッチ
    if (KEYWORD_MAP[keyword]) {
      KEYWORD_MAP[keyword].forEach(cat => categories.add(cat));
      return;
    }
    
    // 部分マッチ
    Object.entries(KEYWORD_MAP).forEach(([key, cats]) => {
      if (keyword.includes(key) || key.includes(keyword)) {
        cats.forEach(cat => categories.add(cat));
      }
    });
    
    // カテゴリ名との直接マッチ
    Object.keys(TREND_DATABASE).forEach(cat => {
      if (keyword.includes(cat) || cat.includes(keyword)) {
        categories.add(cat);
      }
    });
  });
  
  // デフォルトカテゴリ
  if (categories.size === 0) {
    categories.add('AI');
    categories.add('消費');
  }
  
  return Array.from(categories);
}

/**
 * トレンドを分析
 */
function analyzeTrends(keywords) {
  const categories = detectCategories(keywords);
  const trends = [];
  
  categories.forEach(category => {
    const categoryTrends = TREND_DATABASE[category] || [];
    trends.push(...categoryTrends);
  });
  
  // 重複を除去し、関連度でソート
  const uniqueTrends = Array.from(
    new Map(trends.map(t => [t.name, t])).values()
  ).sort((a, b) => b.relevance - a.relevance);
  
  return uniqueTrends.slice(0, 6); // 上位6件
}

/**
 * 推奨される組み合わせを生成
 */
function generateRecommendations(trends) {
  if (trends.length < 3) return trends.map(t => t.name);
  
  // 関連度の高いトップ3を推奨
  return trends.slice(0, 3).map(t => t.name);
}

/**
 * エージェント実行
 */
async function execute(input, options = {}) {
  const { trends: inputTrends = [], projectName = '' } = input;
  const { projectPath } = options;
  
  logger.agent('research', 'トレンド分析を開始...');
  
  // キーワードからトレンドを分析
  const keywords = inputTrends.length > 0 ? inputTrends : ['AI', '現代社会'];
  const analyzedTrends = analyzeTrends(keywords);
  const recommendations = generateRecommendations(analyzedTrends);
  
  logger.info(`入力キーワード: ${keywords.join(', ')}`);
  logger.info(`検出トレンド: ${analyzedTrends.length}件`);
  
  // 結果を構築
  const result = {
    inputKeywords: keywords,
    trends: analyzedTrends,
    recommendations,
    analyzedAt: new Date().toISOString()
  };
  
  // ファイルに保存
  if (projectPath) {
    const outputPath = path.join(projectPath, 'research', `trends_${dateString()}.json`);
    writeJson(outputPath, result);
    logger.success(`保存: ${outputPath}`);
  }
  
  return {
    success: true,
    message: `${analyzedTrends.length}件のトレンドを分析しました`,
    output: {
      trends: analyzedTrends,
      recommendations,
      inputKeywords: keywords
    }
  };
}

module.exports = {
  name: 'research_agent',
  execute,
  analyzeTrends,
  detectCategories
};
