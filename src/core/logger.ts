/**
 * Logger utility for the Figma MCP server
 */
import { ConfigManager } from './config.js';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Logger class for consistent logging
 */
export class Logger {
  private configManager: ConfigManager;
  private context: string;
  
  /**
   * Create a new logger
   * @param context Logger context (e.g., class name)
   * @param configManager Configuration manager
   */
  constructor(context: string, configManager: ConfigManager) {
    this.context = context;
    this.configManager = configManager;
  }
  
  /**
   * Log a debug message
   * @param message Message to log
   * @param data Additional data to log
   */
  public debug(message: string, data?: any): void {
    if (this.configManager.isDebugEnabled()) {
      this.log(LogLevel.DEBUG, message, data);
    }
  }
  
  /**
   * Log an info message
   * @param message Message to log
   * @param data Additional data to log
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param data Additional data to log
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an error message
   * @param message Message to log
   * @param error Error object
   */
  public error(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, {
        message: error.message,
        stack: error.stack
      });
    } else {
      this.log(LogLevel.ERROR, message, error);
    }
  }
  
  /**
   * Log a message with the specified level
   * @param level Log level
   * @param message Message to log
   * @param data Additional data to log
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
    
    if (data !== undefined) {
      if (level === LogLevel.ERROR) {
        console.error(data);
      } else if (this.configManager.isDebugEnabled()) {
        console.debug(data);
      }
    }
  }
  
  /**
   * Create a child logger with a sub-context
   * @param subContext Sub-context to append to the current context
   * @returns A new logger with the combined context
   */
  public createChildLogger(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.configManager);
  }
}

/**
 * Create a new logger
 * @param context Logger context
 * @param configManager Configuration manager
 * @returns A new logger
 */
export function createLogger(context: string, configManager: ConfigManager): Logger {
  return new Logger(context, configManager);
}