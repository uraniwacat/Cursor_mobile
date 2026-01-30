/**
 * Editor Agent
 * 編集提案・推敲を行うエージェント
 */

const path = require('path');
const { writeText, dateString, readFileSafe } = require('../../shared/lib/fileManager');
const { logger } = require('../../shared/lib/logger');

// 編集チェック項目
const EDIT_CHECKS = [
  {
    id: 'repetition',
    name: '繰り返し表現',
    check: (text) => {
      const words = text.match(/[ぁ-んァ-ン一-龥]+/g) || [];
      const counts = {};
      words.forEach(w => {
        if (w.length >= 3) counts[w] = (counts[w] || 0) + 1;
      });
      const repeated = Object.entries(counts)
        .filter(([_, count]) => count >= 4)
        .map(([word, count]) => ({ word, count }));
      return repeated;
    },
    suggest: (issues) => issues.length > 0 
      ? `「${issues.slice(0, 3).map(i => i.word).join('」「')}」などの表現が繰り返されています。類義語への置換を検討してください。`
      : null
  },
  {
    id: 'sentence_length',
    name: '文の長さ',
    check: (text) => {
      const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
      const longSentences = sentences.filter(s => s.length > 100);
      return longSentences;
    },
    suggest: (issues) => issues.length > 0
      ? `${issues.length}個の長い文（100文字以上）があります。読みやすさのため分割を検討してください。`
      : null
  },
  {
    id: 'paragraph_balance',
    name: '段落バランス',
    check: (text) => {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
      const lengths = paragraphs.map(p => p.length);
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const unbalanced = lengths.filter(l => l > avg * 2 || l < avg * 0.3);
      return { total: paragraphs.length, unbalanced: unbalanced.length, avg: Math.round(avg) };
    },
    suggest: (issues) => issues.unbalanced > 2
      ? `段落の長さにばらつきがあります（平均${issues.avg}文字）。リズム感の改善を検討してください。`
      : null
  },
  {
    id: 'ending_variety',
    name: '文末表現',
    check: (text) => {
      const endings = text.match(/[だです。ます。た。][。]/g) || [];
      const counts = {};
      endings.forEach(e => counts[e] = (counts[e] || 0) + 1);
      return counts;
    },
    suggest: (issues) => {
      const total = Object.values(issues).reduce((a, b) => a + b, 0);
      const maxRatio = Math.max(...Object.values(issues)) / total;
      return maxRatio > 0.5 
        ? '文末表現が単調です。「〜だ」「〜である」「〜のだ」など、バリエーションを増やすことを検討してください。'
        : null;
    }
  },
  {
    id: 'section_flow',
    name: 'セクション構成',
    check: (text) => {
      const sections = text.match(/^## .+$/gm) || [];
      return { count: sections.length, titles: sections };
    },
    suggest: (issues) => {
      if (issues.count < 3) return 'セクション数が少ないです。内容を分割して構成を明確にすることを検討してください。';
      if (issues.count > 8) return 'セクションが多すぎる可能性があります。統合を検討してください。';
      return null;
    }
  },
  {
    id: 'hook_strength',
    name: '導入の強さ',
    check: (text) => {
      const firstParagraph = text.split(/\n\n/)[0] || '';
      const hasQuestion = /？/.test(firstParagraph);
      const hasStatement = /[だである]。/.test(firstParagraph);
      const length = firstParagraph.length;
      return { hasQuestion, hasStatement, length };
    },
    suggest: (issues) => {
      if (issues.length < 50) return '導入部分が短いです。読者を引き込む冒頭を追加することを検討してください。';
      if (!issues.hasQuestion && !issues.hasStatement) return '導入に問いかけや断定的な主張を加えると、インパクトが増します。';
      return null;
    }
  }
];

// 全体的な改善提案
const GLOBAL_SUGGESTIONS = [
  {
    condition: (text, results) => {
      const wordCount = text.replace(/\s/g, '').length;
      return wordCount < 2000;
    },
    title: 'ボリューム不足',
    description: '全体の文字数が少なめです。各セクションの具体例や描写を追加することで、より説得力のある内容になります。'
  },
  {
    condition: (text, results) => {
      const dialogues = (text.match(/「[^」]+」/g) || []).length;
      return dialogues < 5;
    },
    title: '対話・引用の追加',
    description: '会話や引用が少なめです。具体的なセリフや内なる声を追加すると、臨場感が増します。'
  },
  {
    condition: (text, results) => {
      return !/[笑wｗ]/.test(text) && !/ふふ|あはは|くすり/.test(text);
    },
    title: 'ユーモアの強化',
    description: '風刺作品として、より笑いを誘う表現やオチを追加することを検討してください。'
  }
];

/**
 * 編集分析を実行
 */
function analyzeForEditing(text) {
  const results = [];
  
  EDIT_CHECKS.forEach(check => {
    const issues = check.check(text);
    const suggestion = check.suggest(issues);
    
    if (suggestion) {
      results.push({
        id: check.id,
        name: check.name,
        suggestion,
        issues
      });
    }
  });
  
  // グローバル提案をチェック
  GLOBAL_SUGGESTIONS.forEach(gs => {
    if (gs.condition(text, results)) {
      results.push({
        id: 'global',
        name: gs.title,
        suggestion: gs.description
      });
    }
  });
  
  return results;
}

/**
 * Markdownレポートを生成
 */
function generateEditReport(suggestions, metadata = {}) {
  let report = `# 編集提案レポート

## 概要

- **分析日時**: ${new Date().toISOString()}
- **ファイル**: ${metadata.fileName || '(不明)'}
- **文字数**: ${metadata.wordCount || 0}文字
- **提案数**: ${suggestions.length}件

---

## 編集提案

`;

  if (suggestions.length === 0) {
    report += '特に大きな問題は見つかりませんでした。\n';
  } else {
    suggestions.forEach((s, i) => {
      report += `### ${i + 1}. ${s.name}

${s.suggestion}

`;
    });
  }

  report += `---

*このレポートは自動生成されたものです。最終的な判断は著者にお任せします。*
`;

  return report;
}

/**
 * エージェント実行
 */
async function execute(input, options = {}) {
  const { content, path: draftPath } = input;
  const { projectPath } = options;
  
  logger.agent('edit', '編集分析を開始...');
  
  // コンテンツを取得
  let text = content;
  let fileName = 'draft';
  
  if (!text && draftPath) {
    text = readFileSafe(draftPath);
    fileName = path.basename(draftPath);
  }
  
  if (!text) {
    return {
      success: false,
      message: '分析対象のコンテンツがありません'
    };
  }
  
  // 分析実行
  const suggestions = analyzeForEditing(text);
  logger.info(`${suggestions.length}件の編集提案を生成しました`);
  
  // レポート生成
  const markdownReport = generateEditReport(suggestions, {
    fileName,
    wordCount: text.replace(/\s/g, '').length
  });
  
  // ファイルに保存
  let savedPath = null;
  if (projectPath) {
    const reviewsDir = path.join(projectPath, 'reviews');
    const version = input.version || 1;
    const filename = `v${version}_suggestions.md`;
    savedPath = path.join(reviewsDir, filename);
    
    writeText(savedPath, markdownReport);
    logger.success(`保存: ${savedPath}`);
  }
  
  return {
    success: true,
    message: `${suggestions.length}件の編集提案を生成しました`,
    output: {
      suggestions: suggestions.map(s => ({
        title: s.name,
        description: s.suggestion
      })),
      markdownReport,
      path: savedPath
    }
  };
}

module.exports = {
  name: 'editor_agent',
  execute,
  analyzeForEditing
};
