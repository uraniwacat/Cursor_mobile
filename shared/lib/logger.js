/**
 * 共通ロガーモジュール
 * カラフルなコンソール出力とファイルログを提供
 */

const fs = require('fs');
const path = require('path');

// ANSIカラーコード
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// アイコン定義
const icons = {
  info: 'ℹ️ ',
  success: '✅',
  warning: '⚠️ ',
  error: '❌',
  progress: '🔄',
  research: '🔍',
  write: '✍️ ',
  check: '⚖️ ',
  edit: '📝',
  publish: '📄',
  confirm: '🛑',
  question: '❓',
  folder: '📁',
  file: '📄',
  done: '✨'
};

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.logFile = options.logFile || null;
    this.silent = options.silent || false;
  }

  /**
   * タイムスタンプを生成
   */
  timestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * ファイルにログを書き込む
   */
  writeToFile(level, message) {
    if (!this.logFile) return;
    
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logLine = `[${this.timestamp()}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(this.logFile, logLine);
  }

  /**
   * コンソールに出力
   */
  print(message, color = colors.white) {
    if (this.silent) return;
    console.log(`${color}${message}${colors.reset}`);
  }

  /**
   * 情報メッセージ
   */
  info(message) {
    this.print(`${icons.info}  ${message}`, colors.blue);
    this.writeToFile('info', message);
  }

  /**
   * 成功メッセージ
   */
  success(message) {
    this.print(`${icons.success} ${message}`, colors.green);
    this.writeToFile('success', message);
  }

  /**
   * 警告メッセージ
   */
  warn(message) {
    this.print(`${icons.warning}  ${message}`, colors.yellow);
    this.writeToFile('warn', message);
  }

  /**
   * エラーメッセージ
   */
  error(message) {
    this.print(`${icons.error} ${message}`, colors.red);
    this.writeToFile('error', message);
  }

  /**
   * 進捗メッセージ
   */
  progress(message) {
    this.print(`${icons.progress} ${message}`, colors.cyan);
    this.writeToFile('progress', message);
  }

  /**
   * エージェント別のメッセージ
   */
  agent(type, message) {
    const icon = icons[type] || icons.info;
    this.print(`${icon}  ${message}`, colors.magenta);
    this.writeToFile('agent', `[${type}] ${message}`);
  }

  /**
   * デバッグメッセージ（verboseモードのみ）
   */
  debug(message) {
    if (!this.verbose) return;
    this.print(`${colors.dim}[DEBUG] ${message}`, colors.gray);
    this.writeToFile('debug', message);
  }

  /**
   * セクション区切り線
   */
  divider(char = '━', length = 60) {
    if (this.silent) return;
    console.log(colors.gray + char.repeat(length) + colors.reset);
  }

  /**
   * ヘッダー表示
   */
  header(title) {
    if (this.silent) return;
    console.log('');
    this.divider();
    this.print(`${colors.bright}${title}`, colors.white);
    this.divider();
  }

  /**
   * テーブル表示
   */
  table(headers, rows) {
    if (this.silent) return;
    
    // 列幅を計算
    const colWidths = headers.map((h, i) => {
      const maxRowWidth = Math.max(...rows.map(r => String(r[i] || '').length));
      return Math.max(h.length, maxRowWidth) + 2;
    });

    // ヘッダー行
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join('│');
    const separator = colWidths.map(w => '─'.repeat(w)).join('┼');

    console.log(colors.gray + '┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐' + colors.reset);
    console.log(colors.gray + '│' + colors.bright + headerRow + colors.gray + '│' + colors.reset);
    console.log(colors.gray + '├' + separator + '┤' + colors.reset);

    // データ行
    rows.forEach(row => {
      const dataRow = row.map((cell, i) => String(cell || '').padEnd(colWidths[i])).join('│');
      console.log(colors.gray + '│' + colors.reset + dataRow + colors.gray + '│' + colors.reset);
    });

    console.log(colors.gray + '└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘' + colors.reset);
  }

  /**
   * 確認ポイントの表示
   */
  confirmPoint(title) {
    if (this.silent) return;
    console.log('');
    console.log(`${colors.yellow}${icons.confirm} 確認ポイント: ${title}${colors.reset}`);
    this.divider('─');
  }

  /**
   * 次のアクションを表示
   */
  nextActions(actions) {
    if (this.silent) return;
    console.log('');
    console.log(`${colors.cyan}次のアクション:${colors.reset}`);
    actions.forEach(action => {
      console.log(`  ${colors.gray}→${colors.reset} ${action}`);
    });
  }
}

// デフォルトインスタンスをエクスポート
const defaultLogger = new Logger();

module.exports = {
  Logger,
  logger: defaultLogger,
  colors,
  icons
};
