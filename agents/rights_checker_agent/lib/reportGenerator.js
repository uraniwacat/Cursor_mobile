/**
 * レポート生成モジュール
 * 分析結果を整形してレポートを出力
 */

/**
 * 全ての分析結果を統合してレポートを生成
 * @param {Object} params - 分析結果
 * @returns {Object} 統合レポート
 */
function generateReport({ brandIssues, personIssues, originalityAnalysis, metadata }) {
  const allIssues = [...brandIssues, ...personIssues];
  
  // リスクレベルの集計
  const riskCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  allIssues.forEach(issue => {
    if (riskCounts[issue.risk] !== undefined) {
      riskCounts[issue.risk]++;
    }
  });

  // 総合リスクレベルの判定
  let overallRisk = 'low';
  if (riskCounts.critical > 0) overallRisk = 'critical';
  else if (riskCounts.high > 0) overallRisk = 'high';
  else if (riskCounts.medium > 2) overallRisk = 'medium';

  return {
    metadata: {
      analyzedAt: new Date().toISOString(),
      fileName: metadata?.fileName || 'unknown',
      wordCount: metadata?.wordCount || 0,
      ...metadata
    },
    summary: {
      overallRisk: overallRisk,
      totalIssues: allIssues.length,
      riskBreakdown: riskCounts,
      recommendation: getOverallRecommendation(overallRisk, allIssues)
    },
    brandIssues: {
      count: brandIssues.length,
      items: brandIssues
    },
    personIssues: {
      count: personIssues.length,
      items: personIssues
    },
    originalityAnalysis: originalityAnalysis,
    actionItems: generateActionItems(allIssues)
  };
}

/**
 * 総合的な推奨事項を生成
 */
function getOverallRecommendation(overallRisk, issues) {
  const recommendations = {
    critical: '公開前に必ず専門家（弁護士等）に相談してください。重大な権利侵害リスクが検出されました。',
    high: '商用利用前に法的レビューを推奨します。いくつかの高リスク項目が検出されました。',
    medium: '風刺・パロディとしての使用は概ね問題ありませんが、商用利用時は各項目を確認してください。',
    low: '大きな問題は検出されませんでした。風刺作品として公開可能と考えられます。'
  };

  return recommendations[overallRisk] || recommendations.low;
}

/**
 * 具体的なアクションアイテムを生成
 */
function generateActionItems(issues) {
  const actions = [];
  const seenTypes = new Set();

  issues.forEach(issue => {
    const actionKey = `${issue.type}_${issue.risk}`;
    if (!seenTypes.has(actionKey)) {
      seenTypes.add(actionKey);
      
      if (issue.risk === 'high' || issue.risk === 'critical') {
        actions.push({
          priority: 'high',
          type: issue.type,
          action: `「${issue.content}」の使用を再検討してください`,
          detail: issue.suggestion
        });
      } else if (issue.risk === 'medium') {
        actions.push({
          priority: 'medium',
          type: issue.type,
          action: `「${issue.content}」の使用文脈を確認してください`,
          detail: issue.suggestion
        });
      }
    }
  });

  // 優先度でソート
  actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return actions;
}

/**
 * マークダウン形式のレポートを生成
 */
function generateMarkdownReport(report) {
  let md = `# 権利チェックレポート

## 概要

- **分析日時**: ${report.metadata.analyzedAt}
- **ファイル**: ${report.metadata.fileName}
- **文字数**: ${report.metadata.wordCount}文字
- **総合リスクレベル**: ${getRiskBadge(report.summary.overallRisk)}
- **検出された問題数**: ${report.summary.totalIssues}件

### 推奨事項

${report.summary.recommendation}

---

## リスク内訳

| レベル | 件数 |
|--------|------|
| 🔴 Critical | ${report.summary.riskBreakdown.critical} |
| 🟠 High | ${report.summary.riskBreakdown.high} |
| 🟡 Medium | ${report.summary.riskBreakdown.medium} |
| 🟢 Low | ${report.summary.riskBreakdown.low} |

---

## ブランド・商標に関する指摘 (${report.brandIssues.count}件)

`;

  if (report.brandIssues.items.length === 0) {
    md += '特に問題は検出されませんでした。\n\n';
  } else {
    report.brandIssues.items.forEach((issue, index) => {
      md += `### ${index + 1}. ${issue.content}

- **種別**: ${issue.type} (${issue.category || 'general'})
- **行番号**: ${issue.line}
- **リスク**: ${getRiskBadge(issue.risk)}
- **文脈**: "${issue.context}..."
- **提案**: ${issue.suggestion}

`;
    });
  }

  md += `---

## 人物・著名人に関する指摘 (${report.personIssues.count}件)

`;

  if (report.personIssues.items.length === 0) {
    md += '特に問題は検出されませんでした。\n\n';
  } else {
    report.personIssues.items.forEach((issue, index) => {
      md += `### ${index + 1}. ${issue.content}

- **種別**: ${issue.type}
- **行番号**: ${issue.line}
- **リスク**: ${getRiskBadge(issue.risk)}
- **文脈**: "${issue.context}..."
- **提案**: ${issue.suggestion}

`;
    });
  }

  md += `---

## オリジナリティ分析

### テーマ分析

`;

  if (report.originalityAnalysis?.themeAnalysis) {
    report.originalityAnalysis.themeAnalysis.forEach(theme => {
      md += `- **${theme.theme}**: ${theme.frequency}回言及 (${theme.note})\n`;
    });
  }

  md += `
### 文体分析

${report.originalityAnalysis?.styleAnalysis ? 
  `- 形式: ${report.originalityAnalysis.styleAnalysis.assessment}
- 風刺表現: ${report.originalityAnalysis.styleAnalysis.usesSatire ? 'あり' : 'なし'}
- アイロニー: ${report.originalityAnalysis.styleAnalysis.usesIrony ? 'あり' : 'なし'}
- 対話形式: ${report.originalityAnalysis.styleAnalysis.dialogueStyle ? 'あり' : 'なし'}
` : '分析データなし'}

### 総合評価

${report.originalityAnalysis?.overallAssessment?.message || '評価なし'}

---

## アクションアイテム

`;

  if (report.actionItems.length === 0) {
    md += '対応が必要な項目はありません。\n';
  } else {
    report.actionItems.forEach((action, index) => {
      md += `${index + 1}. **[${action.priority.toUpperCase()}]** ${action.action}
   - ${action.detail}

`;
    });
  }

  md += `
---

*このレポートは自動生成されたものです。法的アドバイスとしてではなく、参考情報としてご利用ください。*
`;

  return md;
}

/**
 * リスクレベルのバッジを返す
 */
function getRiskBadge(risk) {
  const badges = {
    critical: '🔴 CRITICAL',
    high: '🟠 HIGH',
    medium: '🟡 MEDIUM',
    low: '🟢 LOW'
  };
  return badges[risk] || badges.low;
}

module.exports = { generateReport, generateMarkdownReport };
