/**
 * Creative Writer Agent - オーケストレーター統合用エントリーポイント
 * 風刺的な台本・エッセイを生成するエージェント
 */

const path = require('path');
const fs = require('fs');
const { writeText, dateString, getNextVersion } = require('../../shared/lib/fileManager');
const { logger } = require('../../shared/lib/logger');

// 文体テンプレート
const STYLE_TEMPLATES = {
  satire: {
    name: '風刺エッセイ',
    tone: '皮肉と自虐を交えた鋭い社会観察',
    structure: ['導入（問題提起）', '展開（具体例と皮肉）', '転換（視点の変化）', '結論（諦観と希望）']
  },
  essay: {
    name: '一般エッセイ',
    tone: '穏やかで思慮深い語り口',
    structure: ['導入', '本論', '結論']
  },
  script: {
    name: '台本',
    tone: 'テンポの良い会話劇',
    structure: ['設定', '展開', 'クライマックス', 'オチ']
  }
};

// セクションテンプレート（風刺エッセイ用）
const SATIRE_SECTIONS = [
  {
    title: 'AIと暮らす日常',
    themes: ['AI通知疲れ', 'スマートデバイス', '機械に管理される生活'],
    template: `朝{time}。{device}が私を起こす。

「おはようございます。今日の予定は{schedule}」

{ironic_observation}

これが{year}年だ。`
  },
  {
    title: 'サブスクリプションの墓場',
    themes: ['サブスク地獄', '所有しない生活', 'デジタル小作人'],
    template: `私の{device}には{number}個のサブスクリプションが入っている。

{list_of_services}

毎月の合計支払額は、{comparison}。

なのに私は何も持っていない。`
  },
  {
    title: 'SNSという名の自意識過剰発表会',
    themes: ['SNS疲れ', 'いいね経済', '比較疲れ'],
    template: `SNSを開く。

{sample_posts}

閉じる。

私は今、{current_situation}。`
  }
];

/**
 * トレンドに基づいてセクションを選択
 */
function selectSections(trends, count = 5) {
  const trendNames = trends.map(t => typeof t === 'string' ? t : t.name);
  
  // トレンドに関連するセクションをスコアリング
  const scored = SATIRE_SECTIONS.map(section => {
    const score = section.themes.reduce((sum, theme) => {
      const match = trendNames.some(t => 
        t.includes(theme) || theme.includes(t) ||
        t.toLowerCase().includes(theme.toLowerCase())
      );
      return sum + (match ? 10 : 0);
    }, Math.random() * 5); // ランダム性を追加
    
    return { section, score };
  });
  
  // スコア順にソートして上位を選択
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.section);
}

/**
 * ドラフトコンテンツを生成（サンプル実装）
 */
function generateDraftContent(input, selectedSections) {
  const { projectName, trends = [], style = 'satire' } = input;
  const trendNames = trends.map(t => typeof t === 'string' ? t : t.name);
  
  const year = new Date().getFullYear();
  
  // ヘッダー
  let content = `# 「${projectName || '無題'}」

*〜${year}年、私たちはこんなにも便利で、こんなにも疲れている〜*

---

`;

  // セクションを生成
  selectedSections.forEach((section, index) => {
    content += `## 第${numberToKanji(index + 1)}幕：${section.title}

`;
    
    // テンプレートを元にコンテンツを生成（実際にはLLM APIを使用）
    content += generateSectionContent(section, trendNames, year);
    content += `

---

`;
  });

  // エンディング
  content += `## 終章：そして私たちは、それでも明日を生きる

${generateEnding(trendNames, year)}

---

*おわり*

---

## 作者メモ

この作品は${year}年の社会トレンドを風刺的に描いたものです。
使用したトレンド: ${trendNames.join(', ')}
`;

  return content;
}

/**
 * 数字を漢数字に変換
 */
function numberToKanji(num) {
  const kanji = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (num <= 10) return kanji[num];
  if (num < 20) return '十' + (num === 10 ? '' : kanji[num - 10]);
  return String(num);
}

/**
 * セクションコンテンツを生成（サンプル）
 */
function generateSectionContent(section, trends, year) {
  // 実際のプロダクションではLLM APIを使用
  const templates = {
    'AIと暮らす日常': `朝7時。スマートスピーカーが私を起こす。

「おはようございます。今日の予定は会議が3件、締め切りが2件です」

知ってる。知ってるよ。AIに言われなくても、自分でわかってる。

私たちは確かに便利になった。でも誰も教えてくれなかった——便利になればなるほど、「お前、全然ダメだな」と機械に指摘され続ける未来が来ることを。`,
    
    'サブスクリプションの墓場': `私のスマホには23個のサブスクリプションが入っている。

動画配信サービスが4つ。音楽配信が2つ。ニュースアプリが3つ。その他諸々。

毎月の合計支払額は、私が子供の頃に「大人になったら何でも買える」と夢見ていた金額を軽く超えている。

なのに私は何も持っていない。動画は「いつでも見られる」から永遠に見ない。これが現代の年貢だ。`,
    
    'SNSという名の自意識過剰発表会': `SNSを開く。

「朝5時起床。ジョギング10km。今日も最高の1日が始まる✨」
「週末はワーケーションで沖縄へ。自由な働き方を手に入れました🌴」

閉じる。

私は今、ベッドの中でポテトチップスを食べながらこれを見ている。時刻は午後2時。休日。予定なし。`
  };
  
  return templates[section.title] || `（${section.title}のコンテンツ）

このセクションでは「${trends.slice(0, 2).join('」と「')}」について風刺的に描きます。`;
}

/**
 * エンディングを生成
 */
function generateEnding(trends, year) {
  return `便利なのに疲れている。
繋がっているのに孤独だ。
情報は溢れているのに、何も知らない気がする。

${year}年の私たちは、こんな矛盾を抱えて生きている。

でも、たぶん、いつの時代もそうだった。

私たちは適応する。文句を言いながら、愚痴をこぼしながら、それでも適応する。

カッコ悪い。でも、それでいい。`;
}

/**
 * エージェント実行
 */
async function execute(input, options = {}) {
  const { trends = [], style = 'satire', projectName = '無題' } = input;
  const { projectPath } = options;
  
  logger.agent('write', '原稿を生成中...');
  
  const trendList = trends.map(t => typeof t === 'string' ? { name: t } : t);
  
  // セクションを選択
  const selectedSections = selectSections(trendList, 3);
  logger.info(`選択セクション: ${selectedSections.map(s => s.title).join(', ')}`);
  
  // ドラフトを生成
  const content = generateDraftContent({
    projectName,
    trends: trendList,
    style
  }, selectedSections);
  
  // ファイルに保存
  let savedPath = null;
  if (projectPath) {
    const draftsDir = path.join(projectPath, 'drafts');
    const version = getNextVersion(draftsDir, 'v');
    const filename = `v${version}_${dateString()}.md`;
    savedPath = path.join(draftsDir, filename);
    
    writeText(savedPath, content);
    logger.success(`保存: ${savedPath}`);
  }
  
  return {
    success: true,
    message: '原稿を生成しました',
    output: {
      content,
      path: savedPath,
      wordCount: content.length,
      sections: selectedSections.map(s => s.title)
    }
  };
}

module.exports = {
  name: 'creative_writer_agent',
  execute,
  STYLE_TEMPLATES
};
