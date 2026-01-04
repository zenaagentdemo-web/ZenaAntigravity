import { marketScraperService } from './src/services/market-scraper.service';

async function testScraper() {
    console.log('--- Testing Market Scraper ---');
    const suburb = 'Parnell';
    const bedrooms = 3;

    const start = Date.now();
    const results = await marketScraperService.findComparableSales(suburb, bedrooms);
    const duration = Date.now() - start;

    console.log(`\nScrape completed in ${duration}ms`);
    console.log(`Found ${results.length} comparable sales:`);
    console.log(JSON.stringify(results, null, 2));

    if (results.length > 0 && results[0].address) {
        console.log('\n✅ TEST PASSED: Successfully extracted data.');
    } else {
        console.log('\n❌ TEST FAILED: No data extracted.');
    }
}

testScraper();
