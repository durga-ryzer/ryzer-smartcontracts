import { logger } from './logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Utility class for retrying operations with exponential backoff
 */
export class RetryUtility {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseDelayMs: config.baseDelayMs ?? 100,
      maxDelayMs: config.maxDelayMs ?? 1000,
    };
  }

  /**
   * Retries a function with exponential backoff
   * @param fn Function to retry
   * @returns Result of the function
   * @throws Error if all retries fail
   */
  public async retry<T>(fn: () => Promise<T> | T): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.config.maxRetries) {
          logger.error(`Retry failed after ${attempt} attempts`, { error: lastError.message });
          throw lastError;
        }
        
        const delayMs = Math.min(
          this.config.baseDelayMs * Math.pow(2, attempt),
          this.config.maxDelayMs
        );
        
        logger.debug(`Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${delayMs}ms`, { 
          error: lastError.message 
        });
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw lastError || new Error('Unknown error in retry utility');
  }
}
