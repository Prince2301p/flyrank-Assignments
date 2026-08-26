const robotsParser = require('robots-parser');
const axios = require('axios');
const config = require('./config');

class RobotsChecker {
  constructor(options = {}) {
    this.userAgent = options.userAgent || config.userAgent;
    this.robotsUrl = options.robotsUrl || `${config.baseUrl}/robots.txt`;
    this.robots = null;
    this.isFetched = false;
  }

  /**
   * Fetches and parses robots.txt rules from target site
   */
  async init() {
    try {
      const response = await axios.get(this.robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: config.timeoutMs,
        validateStatus: () => true // Handle 404/500 gracefully
      });

      if (response.status === 200 && typeof response.data === 'string') {
        this.robots = robotsParser(this.robotsUrl, response.data);
      } else {
        // If robots.txt returns 404 or non-200, assume default permissiveness
        this.robots = robotsParser(this.robotsUrl, '');
      }
    } catch (error) {
      // In case of network error reaching robots.txt, fallback to default parser
      this.robots = robotsParser(this.robotsUrl, '');
    } finally {
      this.isFetched = true;
    }
  }

  /**
   * Checks if scraping a target URL is allowed for our User-Agent
   * @param {string} url - Target URL to check
   * @returns {boolean}
   */
  isAllowed(url) {
    if (!this.robots) {
      return true; // Allow by default if not initialized or unavailable
    }
    const allowed = this.robots.isAllowed(url, this.userAgent);
    return allowed !== false;
  }

  /**
   * Gets delay specified in robots.txt (if any)
   * @returns {number|null} delay in milliseconds or null
   */
  getCrawlDelay() {
    if (!this.robots) return null;
    const delaySec = this.robots.getCrawlDelay(this.userAgent);
    return delaySec ? delaySec * 1000 : null;
  }
}

module.exports = RobotsChecker;
