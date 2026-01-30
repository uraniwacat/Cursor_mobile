/**
 * プロジェクト管理モジュール
 * 執筆プロジェクトの作成・管理を行う
 */

const path = require('path');
const fs = require('fs');
const { 
  ensureDir, 
  readJson, 
  writeJson, 
  dateString, 
  sanitizeFileName,
  listFiles,
  getNextVersion
} = require('../../shared/lib/fileManager');
const { logger } = require('../../shared/lib/logger');

// デフォルトのプロジェクトルート
const DEFAULT_PROJECTS_DIR = path.join(__dirname, '../../projects');

/**
 * プロジェクト構造の定義
 */
const PROJECT_STRUCTURE = {
  directories: [
    'drafts',      // 下書き（バージョン管理）
    'research',    // 調査資料
    'reports',     // 権利チェックレポート
    'reviews',     // 編集提案
    'final'        // 最終成果物
  ],
  files: {
    'project.json': (name, options) => ({
      name: name,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'draft',
      style: options.style || 'satire',
      version: 1,
      metadata: {
        author: options.author || 'anonymous',
        tags: options.tags || [],
        trends: options.trends || []
      }
    })
  }
};

class ProjectManager {
  constructor(projectsDir = DEFAULT_PROJECTS_DIR) {
    this.projectsDir = projectsDir;
    ensureDir(this.projectsDir);
  }

  /**
   * 新規プロジェクトを作成
   */
  create(name, options = {}) {
    const safeName = sanitizeFileName(name);
    const date = dateString();
    const projectDir = path.join(this.projectsDir, `${date}_${safeName}`);
    
    // すでに存在するかチェック
    if (fs.existsSync(projectDir)) {
      throw new Error(`プロジェクトは既に存在します: ${projectDir}`);
    }
    
    logger.info(`プロジェクトを作成中: ${name}`);
    
    // ディレクトリ構造を作成
    ensureDir(projectDir);
    PROJECT_STRUCTURE.directories.forEach(dir => {
      ensureDir(path.join(projectDir, dir));
      logger.debug(`  📁 ${dir}/`);
    });
    
    // 初期ファイルを作成
    Object.entries(PROJECT_STRUCTURE.files).forEach(([filename, generator]) => {
      const content = generator(name, options);
      const filePath = path.join(projectDir, filename);
      writeJson(filePath, content);
      logger.debug(`  📄 ${filename}`);
    });
    
    logger.success(`プロジェクト作成完了: ${projectDir}`);
    
    return {
      path: projectDir,
      name: name,
      safeName: safeName
    };
  }

  /**
   * プロジェクトを検索（名前の部分一致）
   */
  find(query) {
    const entries = fs.readdirSync(this.projectsDir, { withFileTypes: true });
    const projects = entries
      .filter(e => e.isDirectory())
      .filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
      .map(e => this.load(path.join(this.projectsDir, e.name)))
      .filter(p => p !== null);
    
    return projects;
  }

  /**
   * プロジェクトを読み込む
   */
  load(projectPath) {
    const projectFile = path.join(projectPath, 'project.json');
    
    if (!fs.existsSync(projectFile)) {
      return null;
    }
    
    const project = readJson(projectFile);
    project._path = projectPath;
    project._dirName = path.basename(projectPath);
    
    return project;
  }

  /**
   * プロジェクト一覧を取得
   */
  list() {
    const entries = fs.readdirSync(this.projectsDir, { withFileTypes: true });
    
    return entries
      .filter(e => e.isDirectory())
      .map(e => {
        const projectPath = path.join(this.projectsDir, e.name);
        return this.load(projectPath);
      })
      .filter(p => p !== null)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  }

  /**
   * プロジェクト情報を更新
   */
  update(projectPath, updates) {
    const projectFile = path.join(projectPath, 'project.json');
    const project = readJson(projectFile);
    
    const updated = {
      ...project,
      ...updates,
      updated: new Date().toISOString()
    };
    
    writeJson(projectFile, updated);
    return updated;
  }

  /**
   * 下書きを保存
   */
  saveDraft(projectPath, content, metadata = {}) {
    const draftsDir = path.join(projectPath, 'drafts');
    const version = getNextVersion(draftsDir, 'v');
    const date = dateString();
    const filename = `v${version}_${date}.md`;
    const filePath = path.join(draftsDir, filename);
    
    // メタデータをヘッダーに追加
    const header = [
      '---',
      `version: ${version}`,
      `date: ${new Date().toISOString()}`,
      ...Object.entries(metadata).map(([k, v]) => `${k}: ${v}`),
      '---',
      ''
    ].join('\n');
    
    fs.writeFileSync(filePath, header + content, 'utf-8');
    
    // プロジェクト情報を更新
    this.update(projectPath, { version, status: 'draft' });
    
    logger.success(`下書きを保存: ${filename}`);
    
    return {
      path: filePath,
      version,
      filename
    };
  }

  /**
   * 最新の下書きを取得
   */
  getLatestDraft(projectPath) {
    const draftsDir = path.join(projectPath, 'drafts');
    const files = listFiles(draftsDir, '\\.md$');
    
    if (files.length === 0) return null;
    
    // 最新ファイルを取得（ファイル名でソート）
    files.sort().reverse();
    const latestFile = files[0];
    
    return {
      path: latestFile,
      content: fs.readFileSync(latestFile, 'utf-8'),
      filename: path.basename(latestFile)
    };
  }

  /**
   * レポートを保存
   */
  saveReport(projectPath, type, content, format = 'md') {
    const reportsDir = path.join(projectPath, 'reports');
    ensureDir(reportsDir);
    
    const version = this.load(projectPath)?.version || 1;
    const filename = `v${version}_${type}.${format}`;
    const filePath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    
    logger.success(`レポートを保存: ${filename}`);
    
    return { path: filePath, filename };
  }

  /**
   * 最終版を出力
   */
  finalize(projectPath) {
    const finalDir = path.join(projectPath, 'final');
    ensureDir(finalDir);
    
    const project = this.load(projectPath);
    const draft = this.getLatestDraft(projectPath);
    
    if (!draft) {
      throw new Error('下書きがありません');
    }
    
    const safeName = sanitizeFileName(project.name);
    
    // Markdown版をコピー
    const mdPath = path.join(finalDir, `${safeName}.md`);
    fs.copyFileSync(draft.path, mdPath);
    
    // プロジェクトステータスを更新
    this.update(projectPath, { status: 'finalized' });
    
    logger.success(`最終版を出力: ${safeName}.md`);
    
    return {
      markdown: mdPath,
      name: safeName
    };
  }

  /**
   * プロジェクトのステータスを表示
   */
  status(projectPath) {
    const project = this.load(projectPath);
    if (!project) {
      logger.error('プロジェクトが見つかりません');
      return null;
    }
    
    const draftsDir = path.join(projectPath, 'drafts');
    const reportsDir = path.join(projectPath, 'reports');
    const finalDir = path.join(projectPath, 'final');
    
    const drafts = listFiles(draftsDir, '\\.md$').length;
    const reports = listFiles(reportsDir).length;
    const finals = listFiles(finalDir).length;
    
    return {
      ...project,
      counts: {
        drafts,
        reports,
        finals
      }
    };
  }
}

module.exports = { ProjectManager, DEFAULT_PROJECTS_DIR };
