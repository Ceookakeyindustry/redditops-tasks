/**
 * Logging utility for consistent log formatting
 */

const LOG_LEVELS = {
  INFO: '📘',
  SUCCESS: '✅',
  WARN: '⚠️',
  ERROR: '❌',
  COMMAND: '🎮',
};

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(level, message, data = null) {
  const icon = LOG_LEVELS[level] || '📝';
  const timestamp = getTimestamp();
  let logMessage = `${icon} [${timestamp}] ${message}`;
  if (data) {
    logMessage += ` | ${JSON.stringify(data)}`;
  }
  console.log(logMessage);
}

module.exports = {
  info: (msg, data) => log('INFO', msg, data),
  success: (msg, data) => log('SUCCESS', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  command: (msg, data) => log('COMMAND', msg, data),
};
