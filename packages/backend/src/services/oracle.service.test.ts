import { describe, it, expect } from 'vitest';
import { oracleService, MaturityLevel } from './oracle.service.js';

describe('OracleService Maturity Logic', () => {
    // Accessing private method for unit testing logic
    const calculateMaturityLevel = (oracleService as any).calculateMaturityLevel.bind(oracleService);

    describe('calculateMaturityLevel', () => {
        it('should return LEARNING for new contacts with no data', () => {
            const level = calculateMaturityLevel(0, 0, 0, null, null);
            expect(level).toBe(MaturityLevel.LEARNING);
        });

        it('should return OBSERVING for contacts with 3 emails', () => {
            const level = calculateMaturityLevel(3, 0, 0, null, null);
            expect(level).toBe(MaturityLevel.OBSERVING);
        });

        it('should return PROFILING for contacts with 10 emails and 1 month active', () => {
            const level = calculateMaturityLevel(10, 0, 1, null, null);
            expect(level).toBe(MaturityLevel.PROFILING);
        });

        it('should BOOST to PROFILING if rich context is provided (length > 300)', () => {
            const richSnippet = 'A'.repeat(301);
            const level = calculateMaturityLevel(0, 0, 0, richSnippet, null);
            expect(level).toBe(MaturityLevel.PROFILING);
        });

        it('should BOOST to PROFILING if temperament keywords are present in moderately long snippet', () => {
            const keywordSnippet = 'This person is very direct and results-oriented. They prefer quick decisions and bold actions.';
            // Length is ~95 characters, but needs to be > 150 according to my implementation
            const longKeywordSnippet = keywordSnippet.padEnd(151, ' ');
            const level = calculateMaturityLevel(0, 0, 0, longKeywordSnippet, null);
            expect(level).toBe(MaturityLevel.PROFILING);
        });

        it('should NOT boost to PROFILING if snippet is short even with keywords', () => {
            const shortKeywordSnippet = 'Very direct person.';
            const level = calculateMaturityLevel(0, 0, 0, shortKeywordSnippet, null);
            expect(level).toBe(MaturityLevel.LEARNING);
        });

        it('should jump to PROFILING if personality already exists', () => {
            const level = calculateMaturityLevel(0, 0, 0, null, 'D');
            expect(level).toBe(MaturityLevel.PROFILING);
        });

        it('should reach PREDICTING stage with sufficient quantitative data', () => {
            const level = calculateMaturityLevel(20, 20, 3, null, null);
            expect(level).toBe(MaturityLevel.PREDICTING);
        });
    });
});
