const PoliteFetcher = require('../src/fetcher');

describe('PoliteFetcher Module Unit Tests', () => {
  test('sleep() helper delays execution', async () => {
    const fetcher = new PoliteFetcher({ requestDelayMs: 10 });
    const start = Date.now();
    await fetcher.sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test('enforces politeness delay between consecutive requests', async () => {
    const fetcher = new PoliteFetcher({ requestDelayMs: 50 });
    const start = Date.now();
    await fetcher.enforceDelay();
    await fetcher.enforceDelay();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});
