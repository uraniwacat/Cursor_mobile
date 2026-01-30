# Research Agent（トレンド分析エージェント）

入力キーワードから関連するトレンドを分析・抽出するエージェントです。

## 機能

1. **キーワード解析**: 入力されたキーワードからカテゴリを特定
2. **トレンド抽出**: 関連するトレンドを関連度スコア付きで抽出
3. **推奨組み合わせ**: 風刺作品に適したトレンドの組み合わせを提案

## 使用方法

### オーケストレーター経由（推奨）

```bash
node orchestrator/cli/run.js -p "プロジェクト名" -t "AI疲れ,サブスク"
```

### 直接実行

```javascript
const { execute } = require('./index');

const result = await execute({
  trends: ['AI疲れ', 'サブスク地獄']
}, {
  projectPath: '/path/to/project'
});

console.log(result.output.trends);
```

## 対応カテゴリ

- AI関連（AI通知疲れ、プロンプト職人化など）
- サブスク関連（サブスク地獄、解約UXの闇など）
- SNS関連（SNS断捨離、いいね経済など）
- リモートワーク関連
- 環境・サステナビリティ関連
- 消費社会関連

## 出力例

```json
{
  "trends": [
    {
      "name": "AI通知疲れ",
      "relevance": 94,
      "description": "AIアシスタントからの過剰な通知や提案による疲労"
    }
  ],
  "recommendations": ["AI通知疲れ", "プロンプト職人化", "サブスク地獄"]
}
```
