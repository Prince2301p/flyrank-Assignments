const axios = require('axios');
const config = require('./config');

class PoliteFetcher {
  constructor(options = {}) {
    this.userAgent = options.userAgent || config.userAgent;
    this.requestDelayMs = options.requestDelayMs !== undefined ? options.requestDelayMs : config.requestDelayMs;
    this.maxRetries = options.maxRetries || config.maxRetries;
    this.retryDelayMs = options.retryDelayMs || config.retryDelayMs;
    this.timeoutMs = options.timeoutMs || config.timeoutMs;
    this.lastRequestTime = 0;
  }

  /**
   * Helper utility to pause execution for a given duration
   * @param {number} ms 
   */
  async sleep(ms) {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enforces politeness rate limiting delay between consecutive requests
   */
  async enforceDelay() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (this.lastRequestTime > 0 && elapsed < this.requestDelayMs) {
      const waitTime = this.requestDelayMs - elapsed;
      await this.sleep(waitTime);
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Performs a polite HTTP GET request with retries and backoff
   * @param {string} url 
   * @returns {Promise<{ html: string, status: number, url: string }>}
   */
  async fetch(url) {
    await this.enforceDelay();

    let attempt = 0;
    let lastError = null;

    while (attempt <= this.maxRetries) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          },
          timeout: this.timeoutMs,
          validateStatus: (status) => status < 500 && status !== 429 // Retry on 5xx and 429
        });

        if (response.status === 404) {
          throw new Error(`HTTP 404 Not Found for URL: ${url}`);
        }

        return {
          html: response.data,
          status: response.status,
          url
        };
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt > this.maxRetries) {
          break;
        }

        // Calculate backoff: retryDelayMs * 2^(attempt - 1)
        const backoffMs = this.retryDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[PoliteFetcher] Request failed for ${url} (Attempt ${attempt}/${this.maxRetries}): ${error.message}. Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    throw new Error(`Failed to fetch ${url} after ${this.maxRetries + 1} attempts. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
  }
}

module.exports = PoliteFetcher;
