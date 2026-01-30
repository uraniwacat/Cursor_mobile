#!/usr/bin/env node

/**
 * プロジェクトステータス確認スクリプト
 * 
 * Usage:
 *   node scripts/status.js              # 全プロジェクト一覧
 *   node scripts/status.js -p "名前"    # 特定プロジェクトの詳細
 */

const { ProjectManager } = require('../orchestrator/lib/projectManager');
const { logger, colors } = require('../shared/lib/logger');

/**
 * コマンドライン引数をパース
 */
function parseArgs(args) {
  const result = {
    project: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--project':
      case '-p':
        result.project = args[++i];
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
プロジェクトステータス確認

Usage:
  node scripts/status.js [options]

Options:
  -p, --project <name>   特定プロジェクトの詳細を表示
  -h, --help             このヘルプを表示

Examples:
  node scripts/status.js
  node scripts/status.js -p "現代生活風刺"
`);
}

/**
 * ステータスバッジを取得
 */
function getStatusBadge(status) {
  const badges = {
    'draft': `${colors.yellow}[下書き]${colors.reset}`,
    'review': `${colors.cyan}[レビュー中]${colors.reset}`,
    'finalized': `${colors.green}[完成]${colors.reset}`,
    'archived': `${colors.gray}[アーカイブ]${colors.reset}`
  };
  return badges[status] || `[${status}]`;
}

/**
 * 全プロジェクト一覧を表示
 */
function listProjects(pm) {
  const projects = pm.list();
  
  if (projects.length === 0) {
    logger.info('プロジェクトがありません');
    logger.nextActions([
      '新規作成: node scripts/new-project.js -n "プロジェクト名"'
    ]);
    return;
  }
  
  logger.header('プロジェクト一覧');
  
  console.log('');
  
  projects.forEach((project, i) => {
    const status = pm.status(project._path);
    const badge = getStatusBadge(project.status);
    
    console.log(`${colors.bright}${i + 1}. ${project.name}${colors.reset} ${badge}`);
    console.log(`   📁 ${project._dirName}`);
    console.log(`   📝 下書き: ${status.counts.drafts}件 | 📊 レポート: ${status.counts.reports}件 | ✅ 最終版: ${status.counts.finals}件`);
    console.log(`   🏷️  ${project.metadata.tags.join(', ') || '(タグなし)'}`);
    console.log(`   📅 作成: ${project.created.substring(0, 10)} | 更新: ${project.updated.substring(0, 10)}`);
    console.log('');
  });
  
  logger.divider('─');
  console.log(`合計: ${projects.length}件のプロジェクト`);
}

/**
 * 特定プロジェクトの詳細を表示
 */
function showProjectDetail(pm, query) {
  const projects = pm.find(query);
  
  if (projects.length === 0) {
    logger.error(`プロジェクト '${query}' が見つかりません`);
    return;
  }
  
  const project = projects[0];
  const status = pm.status(project._path);
  
  logger.header(`プロジェクト詳細: ${project.name}`);
  
  console.log(`
📋 基本情報
   名前:     ${project.name}
   ステータス: ${getStatusBadge(project.status)}
   文体:     ${project.style}
   バージョン: v${project.version}
   作成日:   ${project.created}
   更新日:   ${project.updated}

📁 パス
   ${project._path}

🏷️  タグ
   ${project.metadata.tags.join(', ') || '(なし)'}

📊 ファイル数
   下書き:   ${status.counts.drafts}件
   レポート: ${status.counts.reports}件
   最終版:   ${status.counts.finals}件
`);
  
  logger.nextActions([
    `執筆続行: node orchestrator/cli/run.js -p "${project.name}"`,
    `修正: node orchestrator/cli/run.js -p "${project.name}" --revise "修正指示"`,
    `最終版出力: node orchestrator/cli/run.js -p "${project.name}" --finalize`
  ]);
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
  
  const pm = new ProjectManager();
  
  if (args.project) {
    showProjectDetail(pm, args.project);
  } else {
    listProjects(pm);
  }
}

// 実行
main();
