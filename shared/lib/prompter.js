/**
 * インタラクティブプロンプトモジュール
 * ユーザーからの入力を受け付ける
 */

const readline = require('readline');
const { colors, icons } = require('./logger');

/**
 * readline インターフェースを作成
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 単純な質問（テキスト入力）
 */
async function ask(question, defaultValue = '') {
  const rl = createInterface();
  
  return new Promise((resolve) => {
    const prompt = defaultValue 
      ? `${question} (${defaultValue}): `
      : `${question}: `;
    
    rl.question(`${colors.cyan}? ${colors.reset}${prompt}`, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Yes/No 質問
 */
async function confirm(question, defaultYes = true) {
  const rl = createInterface();
  const hint = defaultYes ? '(Y/n)' : '(y/N)';
  
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}? ${colors.reset}${question} ${hint}: `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      
      if (normalized === '') {
        resolve(defaultYes);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}

/**
 * 選択肢から選ぶ（矢印キー対応版は複雑なので、数字選択版）
 */
async function select(question, options, defaultIndex = 0) {
  console.log(`\n${colors.cyan}? ${colors.reset}${question}\n`);
  
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? `${colors.cyan}❯${colors.reset}` : ' ';
    const label = typeof opt === 'object' ? opt.label : opt;
    console.log(`  ${marker} ${i + 1}. ${label}`);
  });
  
  const rl = createInterface();
  
  return new Promise((resolve) => {
    rl.question(`\n選択 (1-${options.length}) [${defaultIndex + 1}]: `, (answer) => {
      rl.close();
      
      const num = parseInt(answer.trim(), 10);
      const index = (num >= 1 && num <= options.length) ? num - 1 : defaultIndex;
      const selected = options[index];
      
      resolve({
        index,
        value: typeof selected === 'object' ? selected.value : selected,
        label: typeof selected === 'object' ? selected.label : selected
      });
    });
  });
}

/**
 * 複数選択（スペース区切りで番号を入力）
 */
async function multiSelect(question, options, defaultSelected = []) {
  console.log(`\n${colors.cyan}? ${colors.reset}${question}`);
  console.log(`${colors.gray}  (スペース区切りで番号を入力、例: 1 3 4)${colors.reset}\n`);
  
  options.forEach((opt, i) => {
    const isSelected = defaultSelected.includes(i);
    const marker = isSelected ? `${colors.green}◉${colors.reset}` : `${colors.gray}◯${colors.reset}`;
    const label = typeof opt === 'object' ? opt.label : opt;
    console.log(`  ${marker} ${i + 1}. ${label}`);
  });
  
  const defaultStr = defaultSelected.map(i => i + 1).join(' ') || 'なし';
  const rl = createInterface();
  
  return new Promise((resolve) => {
    rl.question(`\n選択 [${defaultStr}]: `, (answer) => {
      rl.close();
      
      let selectedIndices;
      if (answer.trim() === '') {
        selectedIndices = defaultSelected;
      } else {
        selectedIndices = answer.trim().split(/\s+/)
          .map(s => parseInt(s, 10) - 1)
          .filter(i => i >= 0 && i < options.length);
      }
      
      const selected = selectedIndices.map(i => ({
        index: i,
        value: typeof options[i] === 'object' ? options[i].value : options[i],
        label: typeof options[i] === 'object' ? options[i].label : options[i]
      }));
      
      resolve(selected);
    });
  });
}

/**
 * トレンド確認用の特殊プロンプト
 */
async function confirmTrends(trends) {
  console.log(`\n${colors.yellow}${icons.confirm} トレンド確認${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(50)}${colors.reset}\n`);
  
  console.log(`${colors.bright}分析されたトレンド:${colors.reset}\n`);
  
  trends.forEach((trend, i) => {
    const relevance = trend.relevance ? ` (関連度: ${trend.relevance}%)` : '';
    console.log(`  ${i + 1}. ${colors.cyan}${trend.name}${colors.reset}${relevance}`);
    if (trend.description) {
      console.log(`     ${colors.gray}${trend.description}${colors.reset}`);
    }
  });
  
  console.log('');
  
  const choice = await select('このトレンドで執筆を開始しますか？', [
    { label: '✅ このまま続行', value: 'continue' },
    { label: '✏️  トレンドを編集する', value: 'edit' },
    { label: '➕ トレンドを追加する', value: 'add' },
    { label: '🔄 再分析する', value: 'retry' },
    { label: '❌ キャンセル', value: 'cancel' }
  ], 0);
  
  return choice.value;
}

/**
 * 編集提案確認用プロンプト
 */
async function confirmSuggestions(suggestions) {
  console.log(`\n${colors.yellow}${icons.confirm} 編集提案の確認${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(50)}${colors.reset}\n`);
  
  suggestions.forEach((sug, i) => {
    console.log(`${colors.bright}${i + 1}. ${sug.title}${colors.reset}`);
    console.log(`   ${colors.gray}${sug.description}${colors.reset}`);
    console.log('');
  });
  
  const choice = await select('どうしますか？', [
    { label: '✅ 提案を適用して修正版を生成', value: 'apply' },
    { label: '📄 このまま続行（適用しない）', value: 'skip' },
    { label: '✏️  手動で修正指示を入力', value: 'manual' },
    { label: '❌ キャンセル', value: 'cancel' }
  ], 0);
  
  if (choice.value === 'manual') {
    const instruction = await ask('修正指示を入力してください');
    return { action: 'manual', instruction };
  }
  
  return { action: choice.value };
}

/**
 * Enterキーで続行を待つ
 */
async function pressEnterToContinue(message = 'Enterキーで続行...') {
  const rl = createInterface();
  
  return new Promise((resolve) => {
    rl.question(`${colors.gray}${message}${colors.reset}`, () => {
      rl.close();
      resolve();
    });
  });
}

module.exports = {
  ask,
  confirm,
  select,
  multiSelect,
  confirmTrends,
  confirmSuggestions,
  pressEnterToContinue
};
