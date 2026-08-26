const axios = require('axios');
const RobotsChecker = require('../src/robots');

describe('RobotsChecker Module Unit Tests', () => {
  test('allows URLs by default if no robots.txt rules exist', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({ status: 404, data: '' });

    const checker = new RobotsChecker();
    await checker.init();

    expect(checker.isAllowed('http://books.toscrape.com/catalogue/page-1.html')).toBe(true);
    axios.get.mockRestore();
  });

  test('correctly parses disallowed rules when present', () => {
    const checker = new RobotsChecker();
    const mockRobotsTxt = `
User-agent: *
Disallow: /admin/
Disallow: /private.html
    `;
    const robotsParser = require('robots-parser');
    checker.robots = robotsParser('http://books.toscrape.com/robots.txt', mockRobotsTxt);

    expect(checker.isAllowed('http://books.toscrape.com/catalogue/page-1.html')).toBe(true);
    expect(checker.isAllowed('http://books.toscrape.com/admin/dashboard')).toBe(false);
    expect(checker.isAllowed('http://books.toscrape.com/private.html')).toBe(false);
  });
});
