/**
 * Test script for CMA Distance Validation
 * 
 * Verifies that the CMA fix works correctly by testing:
 * 1. Taupo address → Should return ONLY Taupo comparables
 * 2. Auckland address → Should return ONLY Auckland comparables
 * 3. Post-processing validation filters cross-city results
 * 
 * Run with: npx tsx scripts/test-cma-distance-validation.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// Simulated CMA request interface (matches the service)
interface CMARequest {
    targetAddress: string;
    suburb: string;
    city: string;
    bedrooms: number;
}

interface ComparableSale {
    address: string;
    soldPrice: string;
    soldDate: string;
    agency?: string;
    bedrooms?: number;
    bathrooms?: number;
    distance?: string;
    link?: string;
}

// Known NZ major cities for validation
const NZ_MAJOR_CITIES = [
    'auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga',
    'dunedin', 'napier', 'hastings', 'nelson', 'rotorua', 'taupo',
    'palmerston north', 'new plymouth', 'whangarei', 'invercargill'
];

/**
 * Validate that all comparables are in the correct city
 */
function validateComparables(comparables: ComparableSale[], targetCity: string): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    const cityLower = targetCity.toLowerCase();

    for (const comp of comparables) {
        const addressLower = comp.address.toLowerCase();

        // Check if address contains a WRONG city
        for (const otherCity of NZ_MAJOR_CITIES) {
            if (otherCity !== cityLower && addressLower.includes(otherCity)) {
                violations.push(`❌ "${comp.address}" contains wrong city "${otherCity}" (expected: ${targetCity})`);
            }
        }
    }

    return {
        valid: violations.length === 0,
        violations
    };
}

/**
 * Extract city from address parts (matching the tool's logic)
 */
function extractCity(addressParts: string[]): string {
    const nzCities = [
        'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga',
        'Dunedin', 'Palmerston North', 'Napier', 'Hastings', 'Nelson',
        'Rotorua', 'New Plymouth', 'Whangarei', 'Invercargill', 'Whanganui',
        'Gisborne', 'Taupo', 'Blenheim', 'Timaru', 'Pukekohe', 'Kapiti',
        'Queenstown', 'Masterton', 'Levin', 'Ashburton', 'Cambridge',
        'Feilding', 'Tokoroa', 'Hawera', 'Greymouth', 'Oamaru',
        'Mangere', 'Otahuhu', 'Manukau', 'North Shore', 'Waitakere'
    ];

    for (const part of addressParts) {
        const cleanPart = part.replace(/\d{4}/g, '').replace(/New Zealand/gi, '').trim();
        for (const city of nzCities) {
            if (cleanPart.toLowerCase().includes(city.toLowerCase())) {
                return city;
            }
        }
    }

    if (addressParts.length >= 3) {
        return addressParts[2].replace(/\d{4}/g, '').replace(/New Zealand/gi, '').trim();
    }

    return '';
}

async function testCMARequest(testName: string, request: CMARequest): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${testName}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`   Target: ${request.targetAddress}`);
    console.log(`   Suburb: ${request.suburb}`);
    console.log(`   City:   ${request.city}`);
    console.log(`   Beds:   ${request.bedrooms}`);
    console.log('');

    try {
        // Import the service dynamically to get the latest version
        const { marketScraperService } = await import('../src/services/market-scraper.service.js');

        console.log('📡 Calling CMA service...');
        const startTime = Date.now();
        const result = await marketScraperService.findComparableSales(request);
        const duration = Date.now() - startTime;

        console.log(`⏱️  Completed in ${(duration / 1000).toFixed(1)}s`);
        console.log(`📊 Found ${result.comparables.length} comparables`);

        if (result.targetSaleHistory?.lastSoldPrice) {
            console.log(`🏠 Target last sold: ${result.targetSaleHistory.lastSoldPrice} on ${result.targetSaleHistory.lastSoldDate}`);
        }

        // Validate results
        const validation = validateComparables(result.comparables, request.city);

        if (validation.valid) {
            console.log(`✅ PASS: All ${result.comparables.length} comparables are in ${request.city}`);
        } else {
            console.log(`❌ FAIL: Found ${validation.violations.length} cross-city violations:`);
            for (const v of validation.violations) {
                console.log(`   ${v}`);
            }
        }

        // Print comparables summary
        console.log('\n📋 Comparables:');
        for (const comp of result.comparables) {
            console.log(`   • ${comp.address} - ${comp.soldPrice} (${comp.soldDate}) ${comp.distance || ''}`);
        }

        return;
    } catch (error) {
        console.error(`❌ ERROR: ${error}`);
    }
}

async function main() {
    console.log('🔬 CMA Distance Validation Test Suite');
    console.log('=====================================');
    console.log('Testing that CMA returns comparables from the CORRECT city only.\n');

    // Test 1: Taupo property (the original bug)
    await testCMARequest('Taupo Property - Should NOT return Auckland addresses', {
        targetAddress: '48 Woodward Street, Nukuhau, Taupo',
        suburb: 'Nukuhau',
        city: 'Taupo',
        bedrooms: 5
    });

    // Test 2: Auckland property
    await testCMARequest('Auckland Property - Should NOT return Taupo addresses', {
        targetAddress: '3/186 Point Chevalier Road, Point Chevalier, Auckland',
        suburb: 'Point Chevalier',
        city: 'Auckland',
        bedrooms: 3
    });

    // Test 3: Wellington property
    await testCMARequest('Wellington Property - Should NOT return Auckland addresses', {
        targetAddress: '12 Cuba Street, Te Aro, Wellington',
        suburb: 'Te Aro',
        city: 'Wellington',
        bedrooms: 2
    });

    console.log('\n' + '='.repeat(60));
    console.log('🏁 Test suite complete');
    console.log('='.repeat(60));
}

main().catch(console.error);
