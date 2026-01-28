# Rights Checker Agent（オリジナリティ・権利チェックエージェント）

創作物に含まれる可能性のある権利問題やオリジナリティリスクを分析・レポートするNode.js CLIツールです。

## 機能

1. **商標・ブランド名検出**: 実在する企業名、製品名、サービス名の使用を検出
2. **有名人・著名人参照検出**: 実在の人物への言及をチェック
3. **著作権リスク評価**: 既存作品との類似性リスクを評価
4. **パロディ・風刺判定**: 法的に保護される可能性のある風刺表現を識別
5. **引用・参照チェック**: 適切な引用形式になっているかを確認

## 使い方

```bash
# ファイルを指定してチェック
node agents/rights_checker_agent/cli/check.js --file path/to/content.md

# テキストを直接チェック
node agents/rights_checker_agent/cli/check.js --text "チェックしたいテキスト"

# レポート出力先を指定
node agents/rights_checker_agent/cli/check.js --file path/to/content.md --output report.json
```

## 出力形式

JSON形式のレポートを生成します：

```json
{
  "summary": {
    "riskLevel": "medium",
    "totalIssues": 5
  },
  "issues": [
    {
      "type": "brand_mention",
      "content": "Netflix",
      "line": 42,
      "risk": "low",
      "suggestion": "一般名詞化または架空名への置換を推奨"
    }
  ]
}
```

## リスクレベル

- **low**: 一般的な使用で問題になる可能性は低い
- **medium**: 商用利用時は注意が必要
- **high**: 法的リスクあり、修正を強く推奨
- **critical**: 公開前に必ず対処が必要

## 注意事項

- このツールは参考情報を提供するものであり、法的アドバイスではありません
- 実際の公開前には専門家への相談を推奨します
- 風刺・パロディの法的保護は国・地域によって異なります
