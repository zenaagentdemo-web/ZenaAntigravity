/**
 * Site Navigation Maps Service
 * 
 * Defines navigation patterns for connected 3rd party sites.
 * Supports both predefined portals (Trade Me, CoreLogic) and 
 * custom connections learned via AI page analysis.
 */

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export interface NavAction {
    type: 'navigate' | 'click' | 'type' | 'select' | 'wait' | 'extract' | 'scroll' | 'submit' | 'capture';
    selector?: string;
    value?: string;
    url?: string;
    waitFor?: string;
    timeout?: number;
    extractType?: 'text' | 'list' | 'count' | 'table' | 'links';
    maxPages?: number; // For pagination
    drillDown?: ActionSequence; // For detail drilling
    fieldName?: string; // For form mapping in Phase 7
}

export interface ActionSequence {
    name: string;
    description: string;
    steps: NavAction[];
    expectedResult?: string;
}

export interface SearchConfig {
    url: string;
    searchField: string;
    submitButton?: string;
    resultsContainer: string;
    resultCountSelector?: string;
    resultItemSelector: string;
    paginationNext?: string;
}

export interface PropertyDetailConfig {
    urlPattern: string;
    fields: Record<string, string>;
}

export interface SiteNavigationMap {
    domain: string;
    name: string;
    category: 'portal' | 'crm' | 'custom';
    baseUrl: string;
    isCustom: boolean;
    pages: {
        search: SearchConfig;
        propertyDetail: PropertyDetailConfig;
        dashboard?: { url: string; dataSelectors: Record<string, string> };
        crmWrite?: Record<string, ActionSequence>; // Phase 7: CRM Write Actions
    };
    actions: {
        getListingDetails?: ActionSequence; // Added as optional, as not all maps will have it
        searchProperties: ActionSequence;
        extractCurrentPage?: ActionSequence;
        [key: string]: ActionSequence | undefined;
    };
    antiBot: {
        minDelay: number;
        maxDelay: number;
        userAgent?: string;
    };
}

// ===========================================
// PREDEFINED PORTAL MAPS
// ===========================================

const TRADE_ME_PROPERTY: SiteNavigationMap = {
    domain: 'trademe.co.nz',
    name: 'Trade Me Property',
    category: 'portal',
    baseUrl: 'https://www.trademe.co.nz',
    isCustom: false,
    pages: {
        search: {
            url: '/a/property/residential/sale',
            searchField: 'input[data-testid="searchbar-input"], input[name="search_string"], input.search-input',
            submitButton: 'button[data-testid="searchbar-submit"], button[type="submit"]',
            resultsContainer: '.tm-property-search-results, .search-results',
            resultCountSelector: '.tm-property-search-results-header__title, .search-results-header h1',
            resultItemSelector: '.tm-property-search-card, .listing-card',
            resultLinkSelector: '.tm-property-search-card__link, a.listing-card__link',
            paginationNext: 'a[aria-label="Next page"], .pagination-next'
        },
        propertyDetail: {
            urlPattern: '/a/property/residential/sale/listing/\\d+',
            fields: {
                address: 'h1.tm-property-listing-body__title, p.listing-address',
                price: '.tm-property-listing-body__price, .price-display',
                description: '.tm-property-listing-body__description, .listing-description',
                cv: 'li:contains("CV") .tm-property-listing-stats__tag-value, .cv-value',
                bedrooms: 'li:contains("bed") .tm-property-listing-stats__tag-value, .bed-count',
                bathrooms: 'li:contains("bath") .tm-property-listing-stats__tag-value, .bath-count',
                landArea: '.land-area, [data-testid="land-area"]',
                agent: '.tm-property-listing-body__agent-name, .agent-name'
            }
        },
        crmWrite: {
            logNote: {
                steps: [
                    { type: 'wait', waitFor: 'button[aria-label="Add note"], .add-note-btn', timeout: 5000 },
                    { type: 'click', selector: 'button[aria-label="Add note"], .add-note-btn' },
                    { type: 'wait', waitFor: 'textarea[name="note"], .note-textarea', timeout: 5000 },
                    { type: 'type', selector: 'textarea[name="note"], .note-textarea', value: '{{noteContent}}' },
                    { type: 'submit', selector: 'button[type="submit"], .submit-note-btn' }
                ]
            },
            updatePrice: {
                steps: [
                    { type: 'navigate', url: 'https://www.trademe.co.nz/My-Trade-Me/Sell/Current.aspx' },
                    { type: 'wait', waitFor: '.my-trade-me-listing-title, .listing-title', timeout: 10000 },
                    { type: 'type', selector: 'input[name="search"]', value: '{{address}}' },
                    { type: 'click', selector: 'button:has-text("Search")' },
                    { type: 'wait', waitFor: 'a:has-text("Edit"), .edit-listing-btn', timeout: 5000 },
                    { type: 'click', selector: 'a:has-text("Edit"), .edit-listing-btn' },
                    { type: 'wait', waitFor: 'input[name="price"], #price-input', timeout: 10000 },
                    { type: 'type', selector: 'input[name="price"], #price-input', value: '{{newPrice}}' },
                    { type: 'click', selector: 'button:has-text("Save"), [data-testid="save-btn"]' }
                ]
            }
        }
    },
    actions: {
        searchProperties: {
            name: 'Search Properties',
            description: 'Search for properties by location',
            steps: [
                { type: 'navigate', url: '/a/property/residential/sale' },
                { type: 'wait', waitFor: 'input[data-testid="searchbar-input"]', timeout: 5000 },
                { type: 'type', selector: 'input[data-testid="searchbar-input"]', value: '{{location}}' },
                { type: 'click', selector: 'button[data-testid="searchbar-submit"]' },
                { type: 'wait', waitFor: '.tm-property-search-results', timeout: 10000 },
                { type: 'extract', selector: '.tm-property-search-results-header__title', extractType: 'count' }
            ],
            expectedResult: 'Property count for location'
        },
        getPropertyDetails: {
            name: 'Get Property Details',
            description: 'Extract details from a property listing',
            steps: [
                { type: 'navigate', url: '{{propertyUrl}}' },
                { type: 'wait', waitFor: '.tm-property-listing-body', timeout: 10000 },
                { type: 'extract', selector: '.tm-property-listing-body', extractType: 'text' }
            ],
            expectedResult: 'Property details object'
        },
        search_properties_filtered: {
            name: 'Search with Filters',
            description: 'Search with bedroom/price filters',
            steps: [
                { type: 'navigate', url: '/a/property/residential/sale' },
                { type: 'wait', waitFor: 'input[data-testid="searchbar-input"]', timeout: 5000 },
                { type: 'type', selector: 'input[data-testid="searchbar-input"]', value: '{{location}}' },
                { type: 'click', selector: 'button[data-testid="searchbar-submit"]' },
                { type: 'wait', waitFor: '.tm-property-search-results', timeout: 10000 },
                // Bedroom filter steps
                { type: 'click', selector: '[data-testid="filter-bedrooms"], button:has-text("Bedrooms")' },
                { type: 'wait', waitFor: 'select, .dropdown-content', timeout: 5000 },
                { type: 'select', selector: 'select:first-of-type', value: '{{bedrooms}}' },
                { type: 'select', selector: 'select:nth-of-type(2)', value: '{{bedrooms}}' },
                { type: 'click', selector: 'button:has-text("View"), [data-testid="filter-apply"]' },
                { type: 'wait', waitFor: '.tm-property-search-results', timeout: 5000 },
                { type: 'extract', selector: '.tm-property-search-results-header__title', extractType: 'count' }
            ]
        },
        get_report: {
            name: 'Generate Property Report',
            description: 'Extract CMA data from Trade Me Insights',
            steps: [
                { type: 'navigate', url: 'https://www.trademe.co.nz/a/property/insights' },
                { type: 'wait', waitFor: 'input[placeholder*="address"]', timeout: 5000 },
                { type: 'type', selector: 'input[placeholder*="address"]', value: '{{address}}' },
                { type: 'wait', waitFor: '.autocomplete-suggestion, .suggestion', timeout: 5000 },
                { type: 'click', selector: '.autocomplete-suggestion:first-child, .suggestion:first-child' },
                { type: 'wait', waitFor: '.tm-property-insights, .tm-property-insights__profile-section', timeout: 15000 },
                { type: 'extract', selector: '.tm-property-insights__profile-section', extractType: 'text' },
                { type: 'extract', selector: '.tm-property-insights__estimate-section', extractType: 'text' },
                { type: 'extract', selector: '.tm-property-insights__comparables-section', extractType: 'list' }
            ]
        }
    },
    antiBot: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        minDelay: 1000,
        maxDelay: 3000
    }
};

const ONEROOF: SiteNavigationMap = {
    domain: 'oneroof.co.nz',
    name: 'OneRoof',
    category: 'portal',
    baseUrl: 'https://www.oneroof.co.nz',
    isCustom: false,
    pages: {
        search: {
            url: '/search',
            searchField: 'input[name="location"], input.search-input',
            submitButton: 'button[type="submit"], .search-button',
            resultsContainer: '.search-results, .property-list',
            resultCountSelector: '.results-count, .search-header h2',
            resultItemSelector: '.property-card, .listing-item',
            resultLinkSelector: 'a.property-card-link, .listing-item a',
            paginationNext: '.pagination-next, a[rel="next"]'
        },
        propertyDetail: {
            urlPattern: '/estimate/.*',
            fields: {
                address: '.property-address h1, .address-line',
                estimate: '.home-estimate, .property-value',
                cvValue: '.cv-value, .capital-value',
                lastSoldPrice: '.last-sold-price',
                lastSoldDate: '.last-sold-date',
                landValue: '.land-value',
                bedrooms: '.bedrooms, .bed-count',
                bathrooms: '.bathrooms, .bath-count'
            }
        }
    },
    actions: {
        searchProperties: {
            name: 'Search Properties',
            description: 'Search OneRoof for properties',
            steps: [
                { type: 'navigate', url: '/search' },
                { type: 'wait', waitFor: 'input[name="location"]', timeout: 5000 },
                { type: 'type', selector: 'input[name="location"]', value: '{{location}}' },
                { type: 'click', selector: 'button[type="submit"]' },
                { type: 'wait', waitFor: '.search-results', timeout: 10000 },
                { type: 'extract', selector: '.results-count', extractType: 'count' }
            ]
        },
        getEstimate: {
            name: 'Get Property Estimate',
            description: 'Get OneRoof estimate for an address',
            steps: [
                { type: 'navigate', url: '/search' },
                { type: 'type', selector: 'input[name="location"]', value: '{{address}}' },
                { type: 'wait', waitFor: '.autocomplete-suggestion', timeout: 3000 },
                { type: 'click', selector: '.autocomplete-suggestion:first-child' },
                { type: 'wait', waitFor: '.home-estimate', timeout: 10000 },
                { type: 'extract', selector: '.property-details', extractType: 'text' }
            ]
        }
    },
    antiBot: {
        minDelay: 1500,
        maxDelay: 4000
    }
};

const CORELOGIC: SiteNavigationMap = {
    domain: 'corelogic.co.nz',
    name: 'CoreLogic',
    category: 'portal',
    baseUrl: 'https://www.corelogic.co.nz',
    isCustom: false,
    pages: {
        search: {
            url: '/search',
            searchField: 'input#address-search, input.search-field',
            submitButton: 'button.search-submit',
            resultsContainer: '.search-results',
            resultCountSelector: '.result-count',
            resultItemSelector: '.property-result',
            resultLinkSelector: 'a.property-link, .property-result a',
            paginationNext: '.next-page'
        },
        propertyDetail: {
            urlPattern: '/property/.*',
            fields: {
                address: '.property-header h1',
                cv: '.capital-value .value',
                landValue: '.land-value .value',
                improvementValue: '.improvement-value .value',
                lastSalePrice: '.last-sale-price',
                lastSaleDate: '.last-sale-date',
                yearBuilt: '.year-built',
                floorArea: '.floor-area',
                landArea: '.land-area',
                zoning: '.zoning'
            }
        }
    },
    actions: {
        searchProperty: {
            name: 'Search Property',
            description: 'Search CoreLogic for a property',
            steps: [
                { type: 'navigate', url: '/search' },
                { type: 'wait', waitFor: 'input#address-search', timeout: 5000 },
                { type: 'type', selector: 'input#address-search', value: '{{address}}' },
                { type: 'wait', waitFor: '.autocomplete-results', timeout: 3000 },
                { type: 'click', selector: '.autocomplete-result:first-child' },
                { type: 'wait', waitFor: '.property-detail', timeout: 10000 },
                { type: 'extract', selector: '.property-detail', extractType: 'text' }
            ]
        },
        getCV: {
            name: 'Get Capital Value',
            description: 'Get CV for an address',
            steps: [
                { type: 'navigate', url: '/search' },
                { type: 'type', selector: 'input#address-search', value: '{{address}}' },
                { type: 'click', selector: '.autocomplete-result:first-child' },
                { type: 'wait', waitFor: '.capital-value', timeout: 10000 },
                { type: 'extract', selector: '.capital-value .value', extractType: 'text' }
            ]
        }
    },
    antiBot: {
        minDelay: 2000,
        maxDelay: 5000
    }
};

const HOMES_CO_NZ: SiteNavigationMap = {
    domain: 'homes.co.nz',
    name: 'Homes.co.nz',
    category: 'portal',
    baseUrl: 'https://homes.co.nz',
    isCustom: false,
    pages: {
        search: {
            url: '/address',
            searchField: 'input[type="search"], input[placeholder*="address"], input.search-input',
            submitButton: 'button[type="submit"], .search-button',
            resultsContainer: '.search-results, .property-list',
            resultCountSelector: '.results-count, .search-header',
            resultItemSelector: '.property-card, .listing-item',
            paginationNext: '.pagination-next, a[rel="next"]'
        },
        propertyDetail: {
            urlPattern: '/address/.*',
            fields: {
                address: 'h1, .property-address',
                estimate: '.home-estimate, .estimated-value',
                cvValue: '.cv-value, .capital-value',
                lastSoldPrice: '.last-sold-price, .sale-price',
                lastSoldDate: '.last-sold-date, .sale-date',
                bedrooms: '.bedrooms, .bed-count',
                bathrooms: '.bathrooms, .bath-count',
                landArea: '.land-area',
                floorArea: '.floor-area'
            }
        }
    },
    actions: {
        searchProperties: {
            name: 'Search Properties',
            description: 'Search Homes.co.nz for property estimates',
            steps: [
                { type: 'navigate', url: '/address' },
                { type: 'wait', waitFor: 'input[type="search"], input.search-input', timeout: 5000 },
                { type: 'type', selector: 'input[type="search"], input.search-input', value: '{{location}}' },
                { type: 'wait', waitFor: '.autocomplete-suggestion, .suggestion', timeout: 3000 },
                { type: 'click', selector: '.autocomplete-suggestion:first-child, .suggestion:first-child' },
                { type: 'wait', waitFor: '.home-estimate, .property-details', timeout: 10000 },
                { type: 'extract', selector: '.home-estimate, .estimated-value', extractType: 'text' }
            ]
        },
        getEstimate: {
            name: 'Get Property Estimate',
            description: 'Get Homes.co.nz estimate for an address',
            steps: [
                { type: 'navigate', url: '/address' },
                { type: 'type', selector: 'input[type="search"], input.search-input', value: '{{address}}' },
                { type: 'wait', waitFor: '.autocomplete-suggestion', timeout: 3000 },
                { type: 'click', selector: '.autocomplete-suggestion:first-child' },
                { type: 'wait', waitFor: '.home-estimate', timeout: 10000 },
                { type: 'extract', selector: '.property-details, .home-estimate', extractType: 'text' }
            ]
        }
    },
    antiBot: {
        minDelay: 1500,
        maxDelay: 4000
    }
};

const REALESTATE_CO_NZ: SiteNavigationMap = {
    domain: 'realestate.co.nz',
    name: 'realestate.co.nz',
    category: 'portal',
    baseUrl: 'https://www.realestate.co.nz',
    isCustom: false,
    pages: {
        search: {
            url: '/residential/sale',
            searchField: 'input[name="search"], input.search-field, input[placeholder*="suburb"]',
            submitButton: 'button[type="submit"], .search-submit',
            resultsContainer: '.search-results, .listings-grid',
            resultCountSelector: '.results-count, .total-count, h1',
            resultItemSelector: '.listing-tile, .property-card',
            paginationNext: '.pagination-next, a[aria-label="Next"]'
        },
        propertyDetail: {
            urlPattern: '/residential/sale/.*',
            fields: {
                address: 'h1.listing-title, .property-address',
                price: '.price-display, .listing-price',
                description: '.listing-description, .property-description',
                bedrooms: '.bedrooms, [data-testid="bedrooms"]',
                bathrooms: '.bathrooms, [data-testid="bathrooms"]',
                agent: '.agent-name, .listing-agent',
                agency: '.agency-name'
            }
        }
    },
    actions: {
        searchProperties: {
            name: 'Search Properties',
            description: 'Search realestate.co.nz for listings',
            steps: [
                { type: 'navigate', url: '/residential/sale' },
                { type: 'wait', waitFor: 'input[name="search"], input.search-field', timeout: 5000 },
                { type: 'type', selector: 'input[name="search"], input.search-field', value: '{{location}}' },
                { type: 'click', selector: 'button[type="submit"], .search-submit' },
                { type: 'wait', waitFor: '.search-results, .listings-grid', timeout: 10000 },
                { type: 'extract', selector: '.results-count, .total-count, h1', extractType: 'count' }
            ],
            expectedResult: 'Property count for location'
        },
        getListingDetails: {
            name: 'Get Listing Details',
            description: 'Extract details from a listing',
            steps: [
                { type: 'navigate', url: '{{listingUrl}}' },
                { type: 'wait', waitFor: '.listing-title, h1', timeout: 10000 },
                { type: 'extract', selector: '.listing-details, .property-info', extractType: 'text' }
            ]
        }
    },
    antiBot: {
        minDelay: 1500,
        maxDelay: 4000
    }
};

const PROPERTY_VALUE: SiteNavigationMap = {
    domain: 'propertyvalue.co.nz',
    name: 'PropertyValue (QV)',
    category: 'portal',
    baseUrl: 'https://www.propertyvalue.co.nz',
    isCustom: false,
    pages: {
        search: {
            url: '/',
            searchField: 'input[name="address"], input.search-input, input[placeholder*="address"]',
            submitButton: 'button[type="submit"], .search-button',
            resultsContainer: '.search-results, .property-results',
            resultCountSelector: '.results-count',
            resultItemSelector: '.property-result, .address-result'
        },
        propertyDetail: {
            urlPattern: '/property/.*',
            fields: {
                address: 'h1, .property-address',
                valuation: '.property-value, .estimated-value',
                cvValue: '.cv-value, .rating-value',
                landValue: '.land-value',
                improvementValue: '.improvement-value',
                lastSalePrice: '.last-sale-price',
                lastSaleDate: '.last-sale-date',
                propertyType: '.property-type',
                landArea: '.land-area',
                floorArea: '.floor-area'
            }
        }
    },
    actions: {
        searchProperties: {
            name: 'Search Property',
            description: 'Search PropertyValue for an address',
            steps: [
                { type: 'navigate', url: '/' },
                { type: 'wait', waitFor: 'input[name="address"], input.search-input', timeout: 5000 },
                { type: 'type', selector: 'input[name="address"], input.search-input', value: '{{address}}' },
                { type: 'wait', waitFor: '.autocomplete-results, .suggestions', timeout: 3000 },
                { type: 'click', selector: '.autocomplete-result:first-child, .suggestion:first-child' },
                { type: 'wait', waitFor: '.property-value, .property-details', timeout: 10000 },
                { type: 'extract', selector: '.property-details, .valuation-section', extractType: 'text' }
            ]
        },
        getValuation: {
            name: 'Get Property Valuation',
            description: 'Get CV and estimated value for an address',
            steps: [
                { type: 'navigate', url: '/' },
                { type: 'type', selector: 'input[name="address"], input.search-input', value: '{{address}}' },
                { type: 'click', selector: '.autocomplete-result:first-child' },
                { type: 'wait', waitFor: '.cv-value, .property-value', timeout: 10000 },
                { type: 'extract', selector: '.valuation-section, .property-value', extractType: 'text' }
            ]
        }
    },
    antiBot: {
        minDelay: 2000,
        maxDelay: 5000
    }
};

const OPES_PARTNERS: SiteNavigationMap = {
    domain: 'opespartners.co.nz',
    name: 'Opes Partners',
    category: 'portal',
    baseUrl: 'https://www.opespartners.co.nz',
    isCustom: false,
    pages: {
        search: {
            url: '/tools/area-analyser',
            searchField: 'input[name="location"], input.search-input, input[placeholder*="suburb"]',
            submitButton: 'button[type="submit"], .search-button',
            resultsContainer: '.results, .area-data',
            resultCountSelector: '.result-count',
            resultItemSelector: '.area-result, .suburb-card'
        },
        propertyDetail: {
            urlPattern: '/tools/.*',
            fields: {
                location: 'h1, .area-name',
                medianPrice: '.median-price, .price-median',
                priceGrowth: '.price-growth, .capital-growth',
                rentalYield: '.rental-yield, .yield',
                daysToSell: '.days-to-sell, .time-on-market',
                listingsCount: '.listings-count, .for-sale-count'
            }
        }
    },
    actions: {
        searchProperties: {
            name: 'Analyze Area',
            description: 'Get market analytics for a suburb/region',
            steps: [
                { type: 'navigate', url: '/tools/area-analyser' },
                { type: 'wait', waitFor: 'input[name="location"], input.search-input', timeout: 5000 },
                { type: 'type', selector: 'input[name="location"], input.search-input', value: '{{location}}' },
                { type: 'wait', waitFor: '.autocomplete-results, .suggestions', timeout: 3000 },
                { type: 'click', selector: '.autocomplete-result:first-child, .suggestion:first-child' },
                { type: 'wait', waitFor: '.area-data, .market-stats', timeout: 10000 },
                { type: 'extract', selector: '.market-stats, .area-data', extractType: 'text' }
            ]
        },
        getMarketReport: {
            name: 'Get Market Report',
            description: 'Extract market analytics for investment analysis',
            steps: [
                { type: 'navigate', url: '/tools/area-analyser' },
                { type: 'type', selector: 'input[name="location"], input.search-input', value: '{{location}}' },
                { type: 'click', selector: '.autocomplete-result:first-child' },
                { type: 'wait', waitFor: '.median-price, .market-stats', timeout: 10000 },
                { type: 'extract', selector: '.area-data, .investment-metrics', extractType: 'text' }
            ]
        }
    },
    antiBot: {
        minDelay: 2000,
        maxDelay: 5000
    }
};

// ===========================================
// NAVIGATION MAP REGISTRY
// ===========================================

// Predefined maps
const PREDEFINED_MAPS: Map<string, SiteNavigationMap> = new Map([
    ['trademe.co.nz', TRADE_ME_PROPERTY],
    ['oneroof.co.nz', ONEROOF],
    ['corelogic.co.nz', CORELOGIC],
    ['homes.co.nz', HOMES_CO_NZ],
    ['realestate.co.nz', REALESTATE_CO_NZ],
    ['propertyvalue.co.nz', PROPERTY_VALUE],
    ['opespartners.co.nz', OPES_PARTNERS]
]);

// Custom maps learned from AI page analysis
const customMaps: Map<string, SiteNavigationMap> = new Map();

export class SiteNavigationMapService {

    /**
     * Get navigation map for a domain (predefined or custom)
     */
    getMap(domain: string): SiteNavigationMap | undefined {
        // Check predefined first
        const cleanDomain = domain.replace('www.', '');

        for (const [key, map] of PREDEFINED_MAPS) {
            if (cleanDomain.includes(key)) {
                return map;
            }
        }

        // Check custom maps
        return customMaps.get(cleanDomain);
    }

    /**
     * Check if a domain has a navigation map
     */
    hasMap(domain: string): boolean {
        return this.getMap(domain) !== undefined;
    }

    /**
     * Register a custom navigation map (learned from AI analysis)
     */
    registerCustomMap(map: SiteNavigationMap): void {
        console.log(`[NavigationMaps] Registering custom map for: ${map.domain}`);
        map.isCustom = true;
        customMaps.set(map.domain, map);
    }

    /**
     * Create a navigation map from AI-analyzed SiteProfile
     * This allows custom connections to work with the navigation engine
     */
    createFromSiteProfile(domain: string, siteProfile: any): SiteNavigationMap {
        console.log(`[NavigationMaps] Creating map from SiteProfile for: ${domain}`);

        const map: SiteNavigationMap = {
            domain: domain,
            name: siteProfile.pageTitle || domain,
            category: 'custom',
            baseUrl: `https://${domain}`,
            isCustom: true,
            pages: {
                propertyDetail: {
                    urlPattern: '.*',
                    fields: {}
                }
            },
            actions: {
                extractCurrentPage: {
                    name: 'Extract Current Page',
                    description: 'Extract data from the current page using learned selectors',
                    steps: [
                        { type: 'wait', waitFor: 'body', timeout: 5000 }
                    ]
                }
            }
        };

        // Convert SiteProfile data fields to navigation map fields
        if (siteProfile.dataFields) {
            const fields: Record<string, string> = {};

            for (const field of siteProfile.dataFields) {
                fields[field.name] = field.selector;

                // Add extraction step for each field
                map.actions.extractCurrentPage.steps.push({
                    type: 'extract',
                    selector: field.selector,
                    extractType: field.type === 'list' ? 'list' : 'text'
                });
            }

            map.pages.propertyDetail!.fields = fields;
        }

        // Add search action if navigation patterns suggest search capability
        if (siteProfile.navigationPatterns) {
            const searchPattern = siteProfile.navigationPatterns.find((p: any) =>
                p.name.toLowerCase().includes('search') ||
                p.description?.toLowerCase().includes('search')
            );

            if (searchPattern) {
                map.pages.search = {
                    url: '/',
                    searchField: searchPattern.selector,
                    resultsContainer: 'body',
                    resultItemSelector: '.result, .item, .card'
                };

                map.actions.search = {
                    name: 'Search',
                    description: 'Search this site',
                    steps: [
                        { type: 'type', selector: searchPattern.selector, value: '{{query}}' },
                        { type: 'click', selector: 'button[type="submit"], .search-button, button' },
                        { type: 'wait', waitFor: '.results, .search-results, body', timeout: 10000 }
                    ]
                };
            }
        }

        // Register the custom map
        this.registerCustomMap(map);

        return map;
    }

    /**
     * Get all available navigation maps
     */
    getAllMaps(): SiteNavigationMap[] {
        return [
            ...Array.from(PREDEFINED_MAPS.values()),
            ...Array.from(customMaps.values())
        ];
    }

    /**
     * Get supported action names for a domain
     */
    getAvailableActions(domain: string): string[] {
        const map = this.getMap(domain);
        if (!map) return [];
        return Object.keys(map.actions);
    }

    /**
     * Get action sequence by name
     */
    getAction(domain: string, actionName: string): ActionSequence | undefined {
        const map = this.getMap(domain);
        return map?.actions[actionName];
    }
}

export const siteNavigationMapService = new SiteNavigationMapService();
