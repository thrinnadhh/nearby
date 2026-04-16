/**
 * Logger utility for NearBy Shop Owner App
 * All logging goes through this — never use console.log directly
 * Can be extended for production analytics/crash reporting
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatLog(
  level: LogLevel,
  message: string,
  data?: unknown
): string {
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
    // Only log debug in development
    if (__DEV__) {
      console.log(formatLog('debug', message, data));
    }
  },
};

export default logger;
