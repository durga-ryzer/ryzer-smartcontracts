import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Define different rate limiters for various API endpoints

/**
 * Standard rate limiter for general API endpoints
 * Limits to 100 requests per IP per 15 minutes
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { status: 'error', message: 'Too many requests, please try again later' },
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later',
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits to 10 requests per IP per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many authentication attempts, please try again later' },
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many authentication attempts, please try again later',
    });
  },
});

/**
 * Relaxed rate limiter for public endpoints
 * Limits to 300 requests per IP per 15 minutes
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Rate limit exceeded' },
  handler: (req: Request, res: Response) => {
    logger.warn(`Public rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Rate limit exceeded',
    });
  },
});

/**
 * Admin endpoints rate limiter
 * Limits to 50 requests per IP per 15 minutes
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many admin requests, please try again later' },
  handler: (req: Request, res: Response) => {
    logger.warn(`Admin rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many admin requests, please try again later',
    });
  },
});

/**
 * Very strict rate limiter for sensitive operations
 * Limits to 5 requests per IP per hour
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many sensitive operations, please try again later' },
  handler: (req: Request, res: Response) => {
    logger.warn(`Sensitive operation rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many sensitive operations, please try again later',
    });
  },
});
