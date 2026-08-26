const PoliteScraper = require('./scraper');

async function main() {
  console.log('====================================================');
  console.log('       BE-05: The Polite Scraper Starting           ');
  console.log('====================================================');

  const scraper = new PoliteScraper();

  try {
    const report = await scraper.run();

    console.log('\n----------------------------------------------------');
    console.log('               Scraping Summary Report              ');
    console.log('----------------------------------------------------');
    console.log(`Execution Time   : ${(report.durationMs / 1000).toFixed(2)}s`);
    console.log(`Pages Processed  : ${report.pagesSuccessful}/${report.pagesAttempted}`);
    console.log(`Raw Extracted    : ${report.totalExtracted} books`);
    console.log(`Schema Validated : ${report.validCount} books`);
    console.log(`Schema Invalid   : ${report.invalidCount} books`);
    console.log(`Parsing Errors   : ${report.errors.length}`);
    console.log(`Output Location  : ${report.outputFilePath}`);
    console.log('----------------------------------------------------');

    if (report.invalidCount > 0) {
      console.warn('\nValidation Warning Details:');
      report.invalidDetails.forEach((inv, i) => {
        console.warn(`  [${i + 1}] ID: ${inv.record.id || 'N/A'} - ${inv.errors.join('; ')}`);
      });
    }

    console.log('\n[SUCCESS] Polite Scraper completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n[FATAL ERROR] Polite Scraper failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
