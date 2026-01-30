#!/usr/bin/env node

/**
 * 新規プロジェクト作成スクリプト
 * 
 * Usage:
 *   node scripts/new-project.js --name "プロジェクト名"
 *   node scripts/new-project.js -n "プロジェクト名" --style satire --tags "風刺,現代社会"
 */

const { ProjectManager } = require('../orchestrator/lib/projectManager');
const { logger } = require('../shared/lib/logger');
const { ask, select } = require('../shared/lib/prompter');

/**
 * コマンドライン引数をパース
 */
function parseArgs(args) {
  const result = {
    name: null,
    style: 'satire',
    tags: [],
    author: null,
    interactive: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--name':
      case '-n':
        result.name = args[++i];
        break;
      case '--style':
      case '-s':
        result.style = args[++i];
        break;
      case '--tags':
      case '-t':
        result.tags = args[++i].split(',').map(s => s.trim());
        break;
      case '--author':
      case '-a':
        result.author = args[++i];
        break;
      case '--interactive':
      case '-i':
        result.interactive = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

/**
 * ヘルプを表示
 */
function showHelp() {
  console.log(`
新規プロジェクト作成

Usage:
  node scripts/new-project.js [options]

Options:
  -n, --name <name>      プロジェクト名（必須）
  -s, --style <style>    文体 (satire, essay, script, etc.)
  -t, --tags <tags>      タグ（カンマ区切り）
  -a, --author <author>  著者名
  -i, --interactive      対話モード
  -h, --help             このヘルプを表示

Examples:
  node scripts/new-project.js -n "現代生活風刺"
  node scripts/new-project.js -n "AIと人間" -s essay -t "AI,テクノロジー"
  node scripts/new-project.js -i

Styles:
  satire    風刺エッセイ
  essay     一般エッセイ
  script    台本・脚本
  column    コラム
  story     短編小説
`);
}

/**
 * 対話モードでプロジェクト情報を収集
 */
async function interactiveMode() {
  logger.header('新規プロジェクト作成');
  
  const name = await ask('プロジェクト名');
  if (!name) {
    logger.error('プロジェクト名は必須です');
    process.exit(1);
  }
  
  const styleChoice = await select('文体を選択', [
    { label: '風刺エッセイ', value: 'satire' },
    { label: '一般エッセイ', value: 'essay' },
    { label: '台本・脚本', value: 'script' },
    { label: 'コラム', value: 'column' },
    { label: '短編小説', value: 'story' }
  ], 0);
  
  const tagsInput = await ask('タグ（カンマ区切り、省略可）');
  const tags = tagsInput ? tagsInput.split(',').map(s => s.trim()) : [];
  
  const author = await ask('著者名（省略可）');
  
  return {
    name,
    style: styleChoice.value,
    tags,
    author: author || 'anonymous'
  };
}

/**
 * メイン処理
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  
  let options;
  
  if (args.interactive || !args.name) {
    options = await interactiveMode();
  } else {
    options = {
      name: args.name,
      style: args.style,
      tags: args.tags,
      author: args.author || 'anonymous'
    };
  }
  
  const pm = new ProjectManager();
  
  try {
    const project = pm.create(options.name, {
      style: options.style,
      tags: options.tags,
      author: options.author
    });
    
    console.log('');
    logger.success(`プロジェクトを作成しました!`);
    logger.divider('─');
    
    console.log(`
📁 ${project.path}
   ├── drafts/      下書き
   ├── research/    調査資料
   ├── reports/     権利チェックレポート
   ├── reviews/     編集提案
   ├── final/       最終成果物
   └── project.json 設定ファイル
`);
    
    logger.nextActions([
      `執筆開始: node orchestrator/cli/run.js -p "${options.name}" -t "トレンド1,トレンド2"`,
      `プロジェクト一覧: node scripts/status.js`
    ]);
    
  } catch (err) {
    logger.error(`プロジェクト作成に失敗: ${err.message}`);
    process.exit(1);
  }
}

// 実行
main().catch(err => {
  logger.error(`予期せぬエラー: ${err.message}`);
  process.exit(1);
});
