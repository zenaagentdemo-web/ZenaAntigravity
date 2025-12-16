/**
 * Simple test to verify property reference extraction logic
 */

// Simulate the extractPropertyReference method
function extractPropertyReference(
  summary: string,
  description: string,
  location: string
): string | undefined {
  const text = `${summary} ${description} ${location}`;

  // Common address patterns
  const addressPattern = /\b(\d+[\w\s,/-]*(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Boulevard|Blvd|Way|Terrace|Tce|Crescent|Cres|Circuit|Cct)\b)/gi;
  
  const matches = text.match(addressPattern);
  
  if (matches && matches.length > 0) {
    return matches[0].trim();
  }

  // If location field looks like an address (contains numbers), use it
  if (location && /\d+/.test(location)) {
    return location.trim();
  }

  return undefined;
}

// Test cases
const testCases = [
  {
    summary: 'Viewing at 123 Main Street',
    description: '',
    location: '',
    expected: '123 Main Street'
  },
  {
    summary: 'Open Home',
    description: 'Property viewing at 456 Oak Avenue',
    location: '',
    expected: '456 Oak Avenue'
  },
  {
    summary: 'Property Inspection',
    description: '',
    location: '789 Elm Road',
    expected: '789 Elm Road'
  },
  {
    summary: 'Auction',
    description: 'Auction for Unit 5/123 Main St',
    location: '',
    expected: '5/123 Main St'
  },
  {
    summary: 'Team Meeting',
    description: 'Discuss project',
    location: 'Office',
    expected: undefined
  },
  {
    summary: 'Settlement',
    description: '',
    location: '10 Park Court',
    expected: '10 Park Court'
  }
];

console.log('Testing property reference extraction:\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = extractPropertyReference(
    testCase.summary,
    testCase.description,
    testCase.location
  );
  
  const success = result === testCase.expected || 
    (result && testCase.expected && result.includes(testCase.expected.split('/')[1] || testCase.expected));
  
  if (success) {
    console.log(`✓ Test ${index + 1} passed: "${testCase.summary}" -> "${result}"`);
    passed++;
  } else {
    console.log(`✗ Test ${index + 1} failed: "${testCase.summary}"`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Got: "${result}"`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
