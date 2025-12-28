// Deterministic mock geocoder
// Generates a lat/lng near a center point based on the input string

const BASE_LAT = -36.8485; // Auckland
const BASE_LNG = 174.7633;
const SPREAD = 0.05; // ~5km spread

export const getMockCoordinates = (id: string, seed: string) => {
    // Simple hash function
    let hash = 0;
    const str = id + seed;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Normalize to -1 to 1
    const normalized = (hash % 10000) / 5000;
    const normalized2 = ((hash * 13) % 10000) / 5000;

    return {
        lat: BASE_LAT + (normalized * SPREAD),
        lng: BASE_LNG + (normalized2 * SPREAD)
    };
};
