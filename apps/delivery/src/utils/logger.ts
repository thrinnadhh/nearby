/**
 * Logger utility
 */

import * as LogRocket from 'expo-notifications';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (this.isDev) {
      console.log(logMessage, context || '');
    }

    // Send to log service in production
    if (!this.isDev && level === 'error') {
      this.sendToLogService({ level, message, context, timestamp });
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    if (this.isDev) {
      this.log('debug', message, context);
    }
  }

  private sendToLogService(log: Record<string, any>) {
    // TODO: Implement log service integration (e.g., Sentry, LogRocket)
  }
}

export default new Logger();
