/**
 * Shared Library - 共通ライブラリのエントリーポイント
 */

const logger = require('./lib/logger');
const fileManager = require('./lib/fileManager');
const prompter = require('./lib/prompter');

module.exports = {
  ...logger,
  ...fileManager,
  ...prompter
};
