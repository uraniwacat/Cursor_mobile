function parse(input) {
  if (!input) return [];
  return input.split(',').map(s => s.trim()).filter(Boolean);
}

function sampleFrom(trends) {
  if (!trends || trends.length === 0) {
    return ['サブスク疲れ', 'リモート礼賛', 'AIアイドル'];
  }
  return trends;
}

module.exports = { parse, sampleFrom };