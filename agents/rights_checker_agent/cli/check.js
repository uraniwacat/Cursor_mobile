#!/usr/bin/env node

/**
 * Rights Checker Agent - CLI Entry Point
 * オリジナリティ・権利チェックエージェント
 * 
 * Usage:
 *   node cli/check.js --file path/to/content.md
 *   node cli/check.js --text "チェックしたいテキスト"
 */

const fs = require('fs');
const path = require('path');
const { detectBrands } = require('../lib/brandDetector');
const { detectPersonReferences } = require('../lib/personDetector');
const { analyzeOriginality } = require('../lib/copyrightAnalyzer');
const { generateReport, generateMarkdownReport } = require('../lib/reportGenerator');

/**
 * コマンドライン引数をパース
 */
function parseArgs(args) {
  const result = {
    file: null,
    text: null,
    output: null,
    format: 'markdown', // 'json' or 'markdown'
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--file' || arg === '-f') {
      result.file = args[++i];
    } else if (arg === '--text' || arg === '-t') {
      result.text = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.output = args[++i];
    } else if (arg === '--format') {
      result.format = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }

  return result;
}

/**
 * ヘルプメッセージを表示
 */
function showHelp() {
  console.log(`
Rights Checker Agent - オリジナリティ・権利チェックエージェント

Usage:
  node cli/check.js [options]

Options:
  --file, -f <path>     チェック対象のファイルパス
  --text, -t <text>     チェック対象のテキスト（直接入力）
  --output, -o <path>   レポート出力先（省略時は標準出力）
  --format <type>       出力形式: 'markdown' (default) or 'json'
  --help, -h            このヘルプを表示

Examples:
  node cli/check.js --file ./outputs/content.md
  node cli/check.js --file ./outputs/content.md --output report.md
  node cli/check.js --text "チェックしたいテキスト" --format json
`);
}

/**
 * ファイルを読み込む
 */
function readFile(filePath) {
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`ファイルが見つかりません: ${absolutePath}`);
  }
  
  return fs.readFileSync(absolutePath, 'utf-8');
}

/**
 * レポートを保存
 */
function saveReport(content, outputPath) {
  const absolutePath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(process.cwd(), outputPath);
  
  fs.writeFileSync(absolutePath, content, 'utf-8');
  console.log(`レポートを保存しました: ${absolutePath}`);
}

/**
 * メイン処理
 */
function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // 入力の取得
  let text = '';
  let fileName = 'direct_input';

  if (args.file) {
    text = readFile(args.file);
    fileName = path.basename(args.file);
    console.log(`ファイルを読み込みました: ${args.file}`);
  } else if (args.text) {
    text = args.text;
  } else {
    console.error('Error: --file または --text オプションでチェック対象を指定してください');
    showHelp();
    process.exit(1);
  }

  console.log('\n分析を開始します...\n');

  // 分析実行
  console.log('📋 ブランド・商標を検出中...');
  const brandIssues = detectBrands(text);
  console.log(`   ${brandIssues.length}件検出`);

  console.log('👤 人物・著名人参照を検出中...');
  const personIssues = detectPersonReferences(text);
  console.log(`   ${personIssues.length}件検出`);

  console.log('📝 オリジナリティを分析中...');
  const originalityAnalysis = analyzeOriginality(text);
  console.log('   完了');

  // レポート生成
  console.log('\n📊 レポートを生成中...\n');
  
  const report = generateReport({
    brandIssues,
    personIssues,
    originalityAnalysis,
    metadata: {
      fileName,
      wordCount: text.replace(/\s/g, '').length
    }
  });

  // 出力
  let output;
  if (args.format === 'json') {
    output = JSON.stringify(report, null, 2);
  } else {
    output = generateMarkdownReport(report);
  }

  if (args.output) {
    saveReport(output, args.output);
  } else {
    console.log('='.repeat(60));
    console.log(output);
    console.log('='.repeat(60));
  }

  // サマリーを表示
  console.log('\n✅ 分析完了');
  console.log(`   総合リスクレベル: ${report.summary.overallRisk.toUpperCase()}`);
  console.log(`   検出された問題: ${report.summary.totalIssues}件`);
  console.log(`   推奨事項: ${report.summary.recommendation}\n`);

  // 終了コード（リスクレベルに応じて）
  const exitCodes = { low: 0, medium: 0, high: 1, critical: 2 };
  process.exit(exitCodes[report.summary.overallRisk] || 0);
}

// 実行
main();
