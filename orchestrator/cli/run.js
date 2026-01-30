#!/usr/bin/env node

/**
 * オーケストレーター CLI
 * 執筆パイプラインを実行する統合コマンド
 * 
 * Usage:
 *   node orchestrator/cli/run.js --project "プロジェクト名" [options]
 *   node orchestrator/cli/run.js -p "プロジェクト名" --trends "トレンド1,トレンド2"
 *   node orchestrator/cli/run.js -p "プロジェクト名" --auto
 *   node orchestrator/cli/run.js -p "プロジェクト名" --revise "修正指示"
 *   node orchestrator/cli/run.js -p "プロジェクト名" --finalize
 */

const path = require('path');
const { Pipeline } = require('../lib/pipeline');
const { ProjectManager } = require('../lib/projectManager');
const { logger } = require('../../shared/lib/logger');
const { ask, confirm, select } = require('../../shared/lib/prompter');

/**
 * コマンドライン引数をパース
 */
function parseArgs(args) {
  const result = {
    project: null,
    workflow: 'default',
    trends: [],
    style: 'satire',
    auto: false,
    revise: null,
    finalize: false,
    continue: false,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--project':
      case '-p':
        result.project = args[++i];
        break;
      case '--workflow':
      case '-w':
        result.workflow = args[++i];
        break;
      case '--trends':
      case '-t':
        result.trends = args[++i].split(',').map(s => s.trim());
        break;
      case '--style':
      case '-s':
        result.style = args[++i];
        break;
      case '--auto':
      case '-a':
        result.auto = true;
        break;
      case '--revise':
      case '-r':
        result.revise = args[++i];
        break;
      case '--finalize':
      case '-f':
        result.finalize = true;
        break;
      case '--continue':
      case '-c':
        result.continue = true;
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
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
執筆オーケストレーター CLI

Usage:
  node orchestrator/cli/run.js [options]

Options:
  -p, --project <name>    プロジェクト名（必須）
  -w, --workflow <name>   ワークフロー名 (default, quick_draft, full_production)
  -t, --trends <list>     トレンド（カンマ区切り）
  -s, --style <style>     文体 (satire, essay, etc.)
  -a, --auto              自動モード（確認なし）
  -r, --revise <text>     修正指示を指定して再生成
  -f, --finalize          最終版として出力
  -c, --continue          中断したパイプラインを再開
  -v, --verbose           詳細ログを表示
  -h, --help              このヘルプを表示

Examples:
  # 新規執筆を開始
  node orchestrator/cli/run.js -p "現代生活風刺" -t "AI疲れ,サブスク地獄"

  # 自動モードで実行
  node orchestrator/cli/run.js -p "現代生活風刺" -t "AI疲れ" --auto

  # 修正指示を指定
  node orchestrator/cli/run.js -p "現代生活風刺" --revise "第二幕をもっと皮肉っぽく"

  # 最終版を出力
  node orchestrator/cli/run.js -p "現代生活風刺" --finalize

Workflows:
  default          標準ワークフロー（トレンド確認 + 編集提案確認）
  quick_draft      簡易ワークフロー（確認なし、高速）
  full_production  完全ワークフロー（全ステップで確認）
`);
}

/**
 * プロジェクトを検索または選択
 */
async function resolveProject(pm, projectQuery) {
  // 完全一致で検索
  const projects = pm.list();
  
  // クエリに一致するプロジェクトを検索
  const matches = projects.filter(p => 
    p.name === projectQuery ||
    p._dirName.includes(projectQuery) ||
    p.name.includes(projectQuery)
  );
  
  if (matches.length === 0) {
    // 新規作成を提案
    logger.warn(`プロジェクト '${projectQuery}' が見つかりません`);
    const shouldCreate = await confirm('新規プロジェクトを作成しますか？', true);
    
    if (shouldCreate) {
      return pm.create(projectQuery);
    }
    return null;
  }
  
  if (matches.length === 1) {
    return { path: matches[0]._path, name: matches[0].name };
  }
  
  // 複数マッチした場合は選択
  logger.info('複数のプロジェクトが見つかりました:');
  const choice = await select('使用するプロジェクトを選択', 
    matches.map(p => ({
      label: `${p.name} (${p._dirName})`,
      value: p._path
    }))
  );
  
  const selected = matches.find(p => p._path === choice.value);
  return { path: selected._path, name: selected.name };
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
  
  // プロジェクト名が必須
  if (!args.project) {
    logger.error('プロジェクト名を指定してください (-p オプション)');
    showHelp();
    process.exit(1);
  }
  
  const pm = new ProjectManager();
  
  // プロジェクトを解決
  const project = await resolveProject(pm, args.project);
  if (!project) {
    logger.error('プロジェクトが指定されていません');
    process.exit(1);
  }
  
  logger.header('執筆ワークスペース');
  logger.info(`プロジェクト: ${project.name}`);
  logger.info(`パス: ${project.path}`);
  
  // finalize モード
  if (args.finalize) {
    logger.progress('最終版を出力中...');
    try {
      const result = pm.finalize(project.path);
      logger.success(`最終版を出力しました: ${result.markdown}`);
      
      logger.nextActions([
        `確認: cat ${result.markdown}`,
      ]);
    } catch (err) {
      logger.error(`最終版の出力に失敗: ${err.message}`);
      process.exit(1);
    }
    return;
  }
  
  // revise モード
  if (args.revise) {
    logger.progress(`修正モード: "${args.revise}"`);
    // TODO: 修正パイプラインを実装
    logger.warn('修正モードは準備中です');
    return;
  }
  
  // 通常のパイプライン実行
  const pipeline = new Pipeline({
    projectPath: project.path,
    workflow: args.workflow,
    auto: args.auto,
    verbose: args.verbose
  });
  
  const input = {
    trends: args.trends,
    style: args.style,
    projectName: project.name
  };
  
  try {
    const result = await pipeline.run(input);
    
    if (result.success) {
      console.log('');
      logger.success('執筆パイプライン完了!');
      
      logger.nextActions([
        `下書き確認: cat ${project.path}/drafts/`,
        `レポート確認: cat ${project.path}/reports/`,
        `修正: node orchestrator/cli/run.js -p "${project.name}" --revise "修正指示"`,
        `最終版出力: node orchestrator/cli/run.js -p "${project.name}" --finalize`
      ]);
    } else if (result.paused) {
      logger.info('パイプラインは一時停止中です');
      logger.nextActions([
        `再開: node orchestrator/cli/run.js -p "${project.name}" --continue`
      ]);
    }
  } catch (err) {
    logger.error(`パイプライン実行エラー: ${err.message}`);
    if (args.verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// 実行
main().catch(err => {
  logger.error(`予期せぬエラー: ${err.message}`);
  process.exit(1);
});
