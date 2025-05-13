/**
 * Redis Cache Utility
 * Provides caching functionality for improved performance
 */

import Redis from 'ioredis';
import { logger } from './logger';

// Create Redis client
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
});

// Handle Redis connection events
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

// Default cache expiration time (in seconds)
const DEFAULT_EXPIRATION = 3600; // 1 hour

/**
 * Set a value in the cache
 * @param key Cache key
 * @param value Value to cache
 * @param expiration Expiration time in seconds
 * @returns Promise resolving to success status
 */
export const setCache = async (key: string, value: any, expiration: number = DEFAULT_EXPIRATION): Promise<boolean> => {
  try {
    const stringValue = JSON.stringify(value);
    await redisClient.set(key, stringValue, 'EX', expiration);
    return true;
  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Get a value from the cache
 * @param key Cache key
 * @returns Promise resolving to cached value or null if not found
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Delete a value from the cache
 * @param key Cache key
 * @returns Promise resolving to success status
 */
export const deleteCache = async (key: string): Promise<boolean> => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Clear the entire cache
 * @returns Promise resolving to success status
 */
export const clearCache = async (): Promise<boolean> => {
  try {
    await redisClient.flushall();
    return true;
  } catch (error) {
    logger.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Get cache stats
 * @returns Promise resolving to cache statistics
 */
export const getCacheStats = async (): Promise<Record<string, any>> => {
  try {
    const info = await redisClient.info();
    return { info };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return {};
  }
};

/**
 * Cache middleware for Express routes
 * @param duration Cache duration in seconds
 * @returns Express middleware function
 */
export const cacheMiddleware = (duration: number = DEFAULT_EXPIRATION) => {
  return async (req: any, res: any, next: any) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create a cache key from the request URL and any query parameters
    const key = `cache:${req.originalUrl || req.url}`;
    
    try {
      // Check if the response is in the cache
      const cachedResponse = await getCache(key);
      
      if (cachedResponse) {
        // Return the cached response
        return res.json(cachedResponse);
      }
      
      // If not in cache, capture the response
      const originalSend = res.send;
      
      res.send = function(body: any) {
        // Store the response in the cache
        if (res.statusCode === 200) {
          try {
            const responseBody = JSON.parse(body);
            setCache(key, responseBody, duration);
          } catch (error) {
            logger.error(`Error parsing response for caching:`, error);
          }
        }
        
        // Send the original response
        originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      logger.error(`Cache middleware error:`, error);
      next();
    }
  };
};

/**
 * Close Redis connection
 */
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

export default {
  setCache,
  getCache,
  deleteCache,
  clearCache,
  getCacheStats,
  cacheMiddleware,
  closeRedisConnection,
};
