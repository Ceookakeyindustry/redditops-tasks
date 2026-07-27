const LOG_LEVELS = { INFO: '📘', SUCCESS: '✅', WARN: '⚠️', ERROR: '❌', COMMAND: '🎮' };

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(level, message, data = null) {
  const icon = LOG_LEVELS[level] || '📝';
  let logMessage = `${icon} [${getTimestamp()}] ${message}`;
  if (data) logMessage += ` | ${JSON.stringify(data)}`;
  console.log(logMessage);
}

module.exports = {
  info: (msg, d) => log('INFO', msg, d),
  success: (msg, d) => log('SUCCESS', msg, d),
  warn: (msg, d) => log('WARN', msg, d),
  error: (msg, d) => log('ERROR', msg, d),
  command: (msg, d) => log('COMMAND', msg, d),
};
