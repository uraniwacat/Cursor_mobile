/**
 * ファイル操作共通モジュール
 * プロジェクトやドラフトのファイル管理を行う
 */

const fs = require('fs');
const path = require('path');

/**
 * ディレクトリを再帰的に作成
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * ファイルを安全に読み込む
 */
function readFileSafe(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`ファイル読み込みエラー: ${filePath}`, err.message);
    return defaultValue;
  }
}

/**
 * JSONファイルを読み込む
 */
function readJson(filePath, defaultValue = {}) {
  const content = readFileSafe(filePath);
  if (!content) return defaultValue;
  
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error(`JSON解析エラー: ${filePath}`, err.message);
    return defaultValue;
  }
}

/**
 * JSONファイルを書き込む
 */
function writeJson(filePath, data, pretty = true) {
  ensureDir(path.dirname(filePath));
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * テキストファイルを書き込む
 */
function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 日付文字列を生成 (YYYYMMDD形式)
 */
function dateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * タイムスタンプ文字列を生成 (YYYYMMDD_HHMMSS形式)
 */
function timestampString(date = new Date()) {
  const d = dateString(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${d}_${hours}${minutes}${seconds}`;
}

/**
 * ファイル名を安全な形式に変換
 */
function sanitizeFileName(name) {
  return name
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * ディレクトリ内のファイル一覧を取得
 */
function listFiles(dirPath, pattern = null) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  
  let files = fs.readdirSync(dirPath);
  
  if (pattern) {
    const regex = new RegExp(pattern);
    files = files.filter(f => regex.test(f));
  }
  
  return files.map(f => path.join(dirPath, f));
}

/**
 * 最新のバージョン番号を取得
 */
function getLatestVersion(dirPath, prefix = 'v') {
  const files = listFiles(dirPath, `^${prefix}\\d+`);
  if (files.length === 0) return 0;
  
  const versions = files.map(f => {
    const match = path.basename(f).match(new RegExp(`^${prefix}(\\d+)`));
    return match ? parseInt(match[1], 10) : 0;
  });
  
  return Math.max(...versions);
}

/**
 * 次のバージョン番号を取得
 */
function getNextVersion(dirPath, prefix = 'v') {
  return getLatestVersion(dirPath, prefix) + 1;
}

/**
 * プロジェクトパスを生成
 */
function getProjectPath(projectsDir, projectName) {
  const safeName = sanitizeFileName(projectName);
  const date = dateString();
  return path.join(projectsDir, `${date}_${safeName}`);
}

/**
 * ファイルをコピー
 */
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/**
 * ディレクトリをコピー（再帰的）
 */
function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

module.exports = {
  ensureDir,
  readFileSafe,
  readJson,
  writeJson,
  writeText,
  dateString,
  timestampString,
  sanitizeFileName,
  listFiles,
  getLatestVersion,
  getNextVersion,
  getProjectPath,
  copyFile,
  copyDir
};
