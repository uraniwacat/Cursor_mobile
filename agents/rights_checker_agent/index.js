/**
 * Rights Checker Agent - オーケストレーター統合用エントリーポイント
 * 権利チェックを行うエージェント
 */

const path = require('path');
const fs = require('fs');
const { detectBrands } = require('./lib/brandDetector');
const { detectPersonReferences } = require('./lib/personDetector');
const { analyzeOriginality } = require('./lib/copyrightAnalyzer');
const { generateReport, generateMarkdownReport } = require('./lib/reportGenerator');
const { writeText, dateString, readFileSafe } = require('../../shared/lib/fileManager');
const { logger } = require('../../shared/lib/logger');

/**
 * エージェント実行
 */
async function execute(input, options = {}) {
  const { content, path: draftPath } = input;
  const { projectPath } = options;
  
  logger.agent('check', '権利チェックを開始...');
  
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
      message: 'チェック対象のコンテンツがありません'
    };
  }
  
  // 分析実行
  logger.info('ブランド・商標を検出中...');
  const brandIssues = detectBrands(text);
  logger.info(`  ${brandIssues.length}件検出`);
  
  logger.info('人物・著名人参照を検出中...');
  const personIssues = detectPersonReferences(text);
  logger.info(`  ${personIssues.length}件検出`);
  
  logger.info('オリジナリティを分析中...');
  const originalityAnalysis = analyzeOriginality(text);
  
  // レポート生成
  const report = generateReport({
    brandIssues,
    personIssues,
    originalityAnalysis,
    metadata: {
      fileName,
      wordCount: text.replace(/\s/g, '').length
    }
  });
  
  const markdownReport = generateMarkdownReport(report);
  
  // ファイルに保存
  let savedPath = null;
  if (projectPath) {
    const reportsDir = path.join(projectPath, 'reports');
    const version = input.version || 1;
    const filename = `v${version}_rights_report.md`;
    savedPath = path.join(reportsDir, filename);
    
    writeText(savedPath, markdownReport);
    logger.success(`保存: ${savedPath}`);
  }
  
  // リスクサマリーをログ出力
  const riskColors = {
    low: '\x1b[32m',    // 緑
    medium: '\x1b[33m', // 黄
    high: '\x1b[31m',   // 赤
    critical: '\x1b[35m' // マゼンタ
  };
  const resetColor = '\x1b[0m';
  const riskColor = riskColors[report.summary.overallRisk] || '';
  
  logger.info(`総合リスクレベル: ${riskColor}${report.summary.overallRisk.toUpperCase()}${resetColor}`);
  logger.info(`検出された問題: ${report.summary.totalIssues}件`);
  
  return {
    success: true,
    message: `権利チェック完了（${report.summary.overallRisk}リスク、${report.summary.totalIssues}件の指摘）`,
    output: {
      report,
      markdownReport,
      path: savedPath,
      summary: report.summary
    }
  };
}

module.exports = {
  name: 'rights_checker_agent',
  execute
};
