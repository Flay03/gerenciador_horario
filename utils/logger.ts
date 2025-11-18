type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${ctx} ${message}`;
  }

  static debug(message: string, data?: any, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context), data || '');
    }
  }

  static info(message: string, data?: any, context?: string) {
    console.info(this.formatMessage('info', message, context), data || '');
  }

  static warn(message: string, data?: any, context?: string) {
    console.warn(this.formatMessage('warn', message, context), data || '');
  }

  static error(message: string, error?: any, context?: string) {
    console.error(this.formatMessage('error', message, context), error || '');
  }
}

export default Logger;