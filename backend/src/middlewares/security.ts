/**
 * Security Middleware
 * Implements various security measures for the backend
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { logger } from '../utils/logger';
import { UserRole } from '../services/rbac';

// Rate limiting configuration
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes by default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Content Security Policy configuration
const cspOptions = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'self'"],
    upgradeInsecureRequests: [],
  },
};

// Apply security middleware
export const applySecurityMiddleware = (app: any) => {
  // Enable helmet for security headers
  if (process.env.ENABLE_HELMET !== 'false') {
    app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? cspOptions : false,
      crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
      crossOriginOpenerPolicy: process.env.NODE_ENV === 'production',
      crossOriginResourcePolicy: process.env.NODE_ENV === 'production',
      dnsPrefetchControl: true,
      expectCt: process.env.NODE_ENV === 'production',
      frameguard: true,
      hidePoweredBy: true,
      hsts: process.env.NODE_ENV === 'production',
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true,
    }));
    logger.info('Helmet security middleware enabled');
  }

  // Enable CORS
  if (process.env.ENABLE_CORS !== 'false') {
    app.use(cors(corsOptions));
    logger.info('CORS middleware enabled');
  }

  // Apply rate limiting
  if (process.env.NODE_ENV === 'production') {
    app.use(rateLimiter);
    logger.info('Rate limiting middleware enabled');
  }

  // Add security headers check middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Set additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Prevent caching of sensitive data
    if (req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    
    next();
  });

  // Log security setup
  logger.info('Security middleware configured successfully');
};

// JWT token verification middleware
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token logic will be implemented here
    // This is a placeholder for the actual JWT verification
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    
    // For now, we'll just pass through
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Role-based access control middleware
export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized - Authentication required' });
    }
    
    if (!req.user.roles || !req.user.roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }
    
    next();
  };
};

// API key verification middleware
export const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized - No API key provided' });
  }
  
  // API key verification logic will be implemented here
  // This is a placeholder for the actual API key verification
  
  next();
};
