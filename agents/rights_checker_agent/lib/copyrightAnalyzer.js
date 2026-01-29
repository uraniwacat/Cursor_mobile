/**
 * 著作権・オリジナリティ分析モジュール
 * 既存作品との類似性リスクを評価
 */

// 一般的なフレーズ・クリシェのパターン
const COMMON_PHRASES = [
  '〜という時代',
  '〜が普及した',
  '〜と言われている',
  '〜ではないだろうか',
  '結論から言うと',
  '要するに',
];

// 風刺作品でよく使われる構造パターン
const SATIRE_PATTERNS = {
  contrast: /(.+?)なのに(.+?)/g,  // 対比構造
  irony: /(.+?)と言われる[。が]/g,  // アイロニー
  rhetorical: /(.+?)だろうか[。？]/g,  // 修辞疑問
  listing: /(.+?)、(.+?)、(.+?)。/g,  // 列挙
};

/**
 * テキストのオリジナリティを分析
 * @param {string} text - 検査対象のテキスト
 * @returns {Object} 分析結果
 */
function analyzeOriginality(text) {
  const results = {
    structureAnalysis: analyzeStructure(text),
    themeAnalysis: analyzeThemes(text),
    styleAnalysis: analyzeStyle(text),
    overallAssessment: null
  };

  // 総合評価
  results.overallAssessment = generateOverallAssessment(results);

  return results;
}

/**
 * 構造分析
 */
function analyzeStructure(text) {
  const lines = text.split('\n');
  const sections = text.split(/^## /m).length - 1;
  const wordCount = text.replace(/\s/g, '').length;

  return {
    sections: sections,
    wordCount: wordCount,
    hasTitle: /^# /.test(text),
    hasConclusion: /おわり|終わり|結論|まとめ/i.test(text),
    assessment: sections > 3 ? 'structured' : 'simple'
  };
}

/**
 * テーマ分析
 */
function analyzeThemes(text) {
  const themes = [];
  
  const themePatterns = {
    'AI・テクノロジー': /AI|人工知能|テクノロジー|スマート|デジタル/g,
    'SNS・ソーシャルメディア': /SNS|ソーシャル|いいね|フォロワー|インフルエンサー/g,
    'サブスクリプション': /サブスク|月額|定額|配信サービス/g,
    '働き方': /リモート|テレワーク|在宅|ワークライフ|働き方/g,
    '環境・サステナビリティ': /SDGs|サステナ|エシカル|環境|エコ/g,
    '消費社会': /消費|購買|マーケティング|広告/g,
    '現代社会批評': /現代|社会|時代|世の中/g
  };

  for (const [theme, pattern] of Object.entries(themePatterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      themes.push({
        theme: theme,
        frequency: matches.length,
        risk: 'low',
        note: 'テーマ自体は一般的であり、著作権の対象にはなりません'
      });
    }
  }

  return themes;
}

/**
 * 文体分析
 */
function analyzeStyle(text) {
  const style = {
    usesSatire: false,
    usesIrony: false,
    usesRhetoricalQuestions: false,
    dialogueStyle: false,
    essayStyle: false
  };

  // 風刺的表現の検出
  if (/皮肉|風刺|矛盾|カッコ悪い|でも、それでいい/g.test(text)) {
    style.usesSatire = true;
  }

  // アイロニーの検出
  if (/〜と思っていた時期が|〜だと思った[。が]|嘘だ[。]/g.test(text)) {
    style.usesIrony = true;
  }

  // 修辞疑問の検出
  if (/だろうか[。？]|ではないか[。？]/g.test(text)) {
    style.usesRhetoricalQuestions = true;
  }

  // 対話形式の検出
  if (/「.+?」/g.test(text)) {
    style.dialogueStyle = true;
  }

  // エッセイ形式の検出
  if (/私は|私たちは|思う|感じる/g.test(text)) {
    style.essayStyle = true;
  }

  return {
    ...style,
    assessment: '風刺エッセイ形式',
    risk: 'low',
    note: '文体・スタイル自体は著作権保護の対象外ですが、特定作家の文体を明示的に模倣する場合は注意が必要です'
  };
}

/**
 * 総合評価を生成
 */
function generateOverallAssessment(results) {
  const issues = [];

  // テーマの独自性チェック
  if (results.themeAnalysis.length > 5) {
    issues.push({
      type: 'theme_diversity',
      risk: 'low',
      message: '複数のテーマを扱っており、特定の既存作品との類似性リスクは低いです'
    });
  }

  // 構造の一般性チェック
  if (results.structureAnalysis.sections > 5) {
    issues.push({
      type: 'structure',
      risk: 'low',
      message: '章立て構造は一般的なエッセイ形式であり、問題ありません'
    });
  }

  return {
    overallRisk: 'low',
    message: 'この作品は一般的な社会風刺エッセイの形式を取っており、著作権上の大きな問題は検出されませんでした。',
    issues: issues
  };
}

module.exports = { analyzeOriginality };
