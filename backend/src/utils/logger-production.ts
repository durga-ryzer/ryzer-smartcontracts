/**
 * Enhanced Production Logger
 * Provides comprehensive logging with Sentry integration and structured log format
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';
import { Request, Response } from 'express';

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    integrations: [new Integrations.Express()],
    tracesSampleRate: 0.2, // Sample 20% of transactions for performance monitoring
    maxBreadcrumbs: 50,
    debug: process.env.NODE_ENV === 'development',
  });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message} ${
      info.metadata && Object.keys(info.metadata).length ? 
      JSON.stringify(info.metadata, null, 2) : ''
    }`
  )
);

// Create file transports for rotating logs
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
});

const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
});

// Create Sentry transport
class SentryTransport extends winston.Transport {
  constructor(opts: any) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    const { level, message, metadata } = info;
    
    if (level === 'error') {
      if (metadata.error instanceof Error) {
        Sentry.captureException(metadata.error);
      } else {
        Sentry.captureMessage(message, {
          level: Sentry.Severity.Error,
          extra: metadata,
        });
      }
    } else if (level === 'warn') {
      Sentry.captureMessage(message, {
        level: Sentry.Severity.Warning,
        extra: metadata,
      });
    }
    
    callback();
  }
}

// Create logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  defaultMeta: { service: 'ryzer-wallet-backend' },
  transports: [
    // Always log to console
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // In production, log to rotating files
    ...(process.env.NODE_ENV === 'production' ? 
      [fileRotateTransport, errorFileRotateTransport] : []),
    
    // In production, log errors to Sentry if DSN is provided
    ...(process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN ? 
      [new SentryTransport({ level: 'warn' })] : []),
  ],
  exitOnError: false,
});

// Create a stream for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: Function) => {
  if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
    const start = Date.now();
    
    // Log when the request completes
    res.on('finish', () => {
      const duration = Date.now() - start;
      const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
      
      // Add request details to log
      const meta = {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        userAgent: req.get('user-agent'),
        referer: req.get('referer'),
      };
      
      // Log at appropriate level based on status code
      if (res.statusCode >= 500) {
        logger.error(message, meta);
      } else if (res.statusCode >= 400) {
        logger.warn(message, meta);
      } else {
        logger.http(message, meta);
      }
    });
  }
  
  next();
};

// Export Sentry for use in error handling
export const getSentry = () => Sentry;
