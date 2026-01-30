/**
 * パイプライン管理モジュール
 * ワークフローの実行を制御する
 */

const path = require('path');
const { logger } = require('../../shared/lib/logger');
const { readJson, writeJson, ensureDir } = require('../../shared/lib/fileManager');
const { confirmTrends, confirmSuggestions, confirm } = require('../../shared/lib/prompter');

class Pipeline {
  constructor(options = {}) {
    this.projectPath = options.projectPath;
    this.workflow = options.workflow || 'default';
    this.autoMode = options.auto || false;
    this.verbose = options.verbose || false;
    
    // エージェントの参照（遅延ロード）
    this.agents = {};
    
    // 実行状態
    this.state = {
      currentStep: 0,
      status: 'idle', // idle, running, paused, completed, error
      results: {}
    };
  }

  /**
   * ワークフロー定義を読み込む
   */
  loadWorkflow(workflowName) {
    const workflowPath = path.join(__dirname, '../workflows', `${workflowName}.json`);
    const workflow = readJson(workflowPath);
    
    if (!workflow || !workflow.steps) {
      throw new Error(`ワークフロー '${workflowName}' が見つかりません: ${workflowPath}`);
    }
    
    return workflow;
  }

  /**
   * エージェントを取得（遅延ロード）
   */
  getAgent(agentName) {
    if (!this.agents[agentName]) {
      try {
        // エージェントのパスを解決
        const agentPaths = {
          'research_agent': '../../agents/research_agent',
          'creative_writer_agent': '../../agents/creative_writer_agent',
          'rights_checker_agent': '../../agents/rights_checker_agent',
          'editor_agent': '../../agents/editor_agent'
        };
        
        const agentPath = agentPaths[agentName];
        if (!agentPath) {
          throw new Error(`未知のエージェント: ${agentName}`);
        }
        
        this.agents[agentName] = require(agentPath);
      } catch (err) {
        logger.warn(`エージェント '${agentName}' のロードに失敗: ${err.message}`);
        // モックエージェントを返す
        this.agents[agentName] = this.createMockAgent(agentName);
      }
    }
    
    return this.agents[agentName];
  }

  /**
   * モックエージェント（未実装エージェント用）
   */
  createMockAgent(agentName) {
    return {
      name: agentName,
      execute: async (input, options) => {
        logger.warn(`[Mock] ${agentName} は未実装です`);
        return { success: true, mock: true, input, options };
      }
    };
  }

  /**
   * パイプラインを実行
   */
  async run(input) {
    logger.header(`パイプライン実行: ${this.workflow}`);
    
    const workflow = this.loadWorkflow(this.workflow);
    this.state.status = 'running';
    
    logger.info(`プロジェクト: ${this.projectPath}`);
    logger.info(`ワークフロー: ${workflow.name}`);
    logger.info(`モード: ${this.autoMode ? '自動' : 'インタラクティブ'}`);
    console.log('');

    let currentInput = { ...input };
    
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      this.state.currentStep = i;
      
      logger.divider('─');
      logger.progress(`ステップ ${i + 1}/${workflow.steps.length}: ${step.name || step.agent}`);
      
      try {
        // ステップを実行
        const result = await this.executeStep(step, currentInput);
        
        if (result.cancelled) {
          logger.warn('パイプラインがキャンセルされました');
          this.state.status = 'cancelled';
          return { success: false, cancelled: true };
        }
        
        // 結果を保存
        this.state.results[step.id || step.agent] = result;
        
        // 次のステップへの入力を更新
        currentInput = { ...currentInput, ...result.output };
        
        // 確認ポイントの処理
        if (step.confirm && !this.autoMode) {
          const shouldContinue = await this.handleConfirmPoint(step, result);
          if (!shouldContinue) {
            logger.warn('ユーザーによって中断されました');
            this.state.status = 'paused';
            return { success: false, paused: true, step: i };
          }
        }
        
      } catch (err) {
        logger.error(`ステップ ${i + 1} でエラー: ${err.message}`);
        this.state.status = 'error';
        return { success: false, error: err.message, step: i };
      }
    }
    
    this.state.status = 'completed';
    logger.divider('━');
    logger.success('パイプライン完了!');
    
    return {
      success: true,
      results: this.state.results
    };
  }

  /**
   * 個別ステップを実行
   */
  async executeStep(step, input) {
    const agent = this.getAgent(step.agent);
    
    logger.agent(this.getAgentIcon(step.agent), `${step.name || step.agent} を実行中...`);
    
    const options = {
      projectPath: this.projectPath,
      outputPath: step.output,
      ...step.options
    };
    
    const result = await agent.execute(input, options);
    
    if (result.success) {
      logger.success(`完了: ${result.message || ''}`);
    } else {
      logger.warn(`警告: ${result.message || '問題が発生しました'}`);
    }
    
    return result;
  }

  /**
   * エージェントタイプからアイコンを取得
   */
  getAgentIcon(agentName) {
    const icons = {
      'research_agent': 'research',
      'creative_writer_agent': 'write',
      'rights_checker_agent': 'check',
      'editor_agent': 'edit',
      'publisher_agent': 'publish'
    };
    return icons[agentName] || 'info';
  }

  /**
   * 確認ポイントを処理
   */
  async handleConfirmPoint(step, result) {
    const confirmType = step.confirmType || 'default';
    
    switch (confirmType) {
      case 'trends':
        const trendsAction = await confirmTrends(result.output.trends || []);
        return trendsAction === 'continue';
      
      case 'suggestions':
        const suggestionsResult = await confirmSuggestions(result.output.suggestions || []);
        return suggestionsResult.action !== 'cancel';
      
      default:
        return await confirm(step.confirmMessage || '続行しますか？', true);
    }
  }

  /**
   * 状態を保存
   */
  saveState() {
    const statePath = path.join(this.projectPath, '.pipeline_state.json');
    writeJson(statePath, this.state);
  }

  /**
   * 状態を復元
   */
  loadState() {
    const statePath = path.join(this.projectPath, '.pipeline_state.json');
    const savedState = readJson(statePath, null);
    if (savedState) {
      this.state = savedState;
    }
  }
}

module.exports = { Pipeline };
