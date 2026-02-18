// server/utils/logger.js
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLevel = LOG_LEVELS.INFO;

function log(level, tag, message, data = null) {
  if (LOG_LEVELS[level] >= currentLevel) {
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = `[${timestamp}] [${level}] [${tag}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = {
  debug: (tag, msg, data) => log('DEBUG', tag, msg, data),
  info: (tag, msg, data) => log('INFO', tag, msg, data),
  warn: (tag, msg, data) => log('WARN', tag, msg, data),
  error: (tag, msg, data) => log('ERROR', tag, msg, data),
};
