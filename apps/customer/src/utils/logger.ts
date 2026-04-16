/**
 * Simple logger utility for NearBy Customer App
 * Logs to console in development, can be extended for production analytics
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatLog(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

const logger = {
  info: (message: string, data?: unknown) => {
    console.log(formatLog('info', message, data));
  },
  warn: (message: string, data?: unknown) => {
    console.warn(formatLog('warn', message, data));
  },
  error: (message: string, data?: unknown) => {
    console.error(formatLog('error', message, data));
  },
  debug: (message: string, data?: unknown) => {
    if (__DEV__) {
      console.log(formatLog('debug', message, data));
    }
  },
};

export default logger;
