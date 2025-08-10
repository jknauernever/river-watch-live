export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  priority: number;
  timestamp: number;
}

export class RateLimiter {
  private requestQueue: QueuedRequest[] = [];
  private requestCount = 0;
  private lastResetTime = Date.now();
  private isProcessing = false;
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequestsPerMinute: 30, // Conservative default for USGS API
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      ...config
    };
  }

  /**
   * Add a request to the queue with exponential backoff retry logic
   */
  async executeWithRetry<T>(
    executeFn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    const requestId = Math.random().toString(36).substr(2, 9);
    
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: requestId,
        execute: async () => {
          let lastError: Error | null = null;
          
          for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
              // Check if we need to wait due to rate limiting
              await this.waitForRateLimit();
              
              const result = await executeFn();
              this.recordRequest();
              resolve(result);
              return;
            } catch (error: any) {
              lastError = error;
              
              // If it's a 429 error, we need to wait longer
              if (error.status === 429 || error.message?.includes('429')) {
                const delay = this.calculateBackoffDelay(attempt);
                console.log(`Rate limited (429), waiting ${delay}ms before retry ${attempt + 1}/${this.config.maxRetries + 1}`);
                await this.sleep(delay);
                continue;
              }
              
              // For other errors, don't retry immediately
              if (attempt < this.config.maxRetries) {
                const delay = this.calculateBackoffDelay(attempt);
                console.log(`Request failed, waiting ${delay}ms before retry ${attempt + 1}/${this.config.maxRetries + 1}`);
                await this.sleep(delay);
                continue;
              }
            }
          }
          
          // All retries exhausted
          reject(lastError || new Error('Max retries exceeded'));
        },
        priority,
        timestamp: Date.now()
      };

      this.addToQueue(queuedRequest);
    });
  }

  /**
   * Add request to queue and start processing if not already running
   */
  private addToQueue(request: QueuedRequest) {
    this.requestQueue.push(request);
    this.requestQueue.sort((a, b) => b.priority - a.priority);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        await request.execute();
      } catch (error) {
        console.error(`Request ${request.id} failed:`, error);
      }

      // Add delay between requests to respect rate limits
      if (this.requestQueue.length > 0) {
        const delay = 60000 / this.config.maxRequestsPerMinute; // Spread requests evenly
        await this.sleep(delay);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Wait if we've hit the rate limit
   */
  private async waitForRateLimit() {
    const now = Date.now();
    
    // Reset counter if a minute has passed
    if (now - this.lastResetTime >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // If we've hit the limit, wait until the next minute
    if (this.requestCount >= this.config.maxRequestsPerMinute) {
      const timeUntilReset = 60000 - (now - this.lastResetTime);
      console.log(`Rate limit reached, waiting ${timeUntilReset}ms until reset`);
      await this.sleep(timeUntilReset);
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }
  }

  /**
   * Record a successful request
   */
  private recordRequest() {
    this.requestCount++;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.requestQueue.length,
      requestCount: this.requestCount,
      maxRequestsPerMinute: this.config.maxRequestsPerMinute,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear the queue (useful for cleanup)
   */
  clearQueue() {
    this.requestQueue = [];
    this.isProcessing = false;
  }
}

// Create a default instance for the USGS API
export const usgsRateLimiter = new RateLimiter({
  maxRequestsPerMinute: 20, // Conservative for USGS API
  maxRetries: 3,
  baseDelayMs: 2000, // Start with 2 second delay
  maxDelayMs: 60000 // Max 1 minute delay
});
