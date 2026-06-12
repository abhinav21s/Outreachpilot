const chalk = {
  blue: (msg) => `\x1b[34m${msg}\x1b[0m`,
  green: (msg) => `\x1b[32m${msg}\x1b[0m`,
  yellow: (msg) => `\x1b[33m${msg}\x1b[0m`,
  red: (msg) => `\x1b[31m${msg}\x1b[0m`,
  cyan: (msg) => `\x1b[36m${msg}\x1b[0m`,
  magenta: (msg) => `\x1b[35m${msg}\x1b[0m`,
};

const logger = {
  info: (msg) => console.log(`${chalk.blue('[INFO]')} ${msg}`),
  success: (msg) => console.log(`${chalk.green('[SUCCESS]')} ${msg}`),
  warn: (msg) => console.log(`${chalk.yellow('[WARN]')} ${msg}`),
  error: (msg) => console.error(`${chalk.red('[ERROR]')} ${msg}`),
  stage: (msg) => console.log(`\n${chalk.magenta('=== ' + msg + ' ===')}\n`),
};

module.exports = logger;
