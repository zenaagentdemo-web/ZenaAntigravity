import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { toolRegistry } from '../../tools/registry.js';
import { toolAliasGenerator } from '../../tools/tool-alias-generator.js';

// 🧠 ZENA GLOBAL WIRING: Trigger registration for tests
import '../../tools/index.js';

describe('Zena Tool System Invariants', () => {

    describe('Registry Heartbeat', () => {
        it('should have at least 100 tools registered (Global Parity)', () => {
            const stats = toolRegistry.getStats();
            console.log(`[Test] Registry Heartbeat: ${stats.totalTools} tools found.`);
            expect(stats.totalTools).toBeGreaterThanOrEqual(100);
        });

        it('should have tools across at least 6 major domains', () => {
            const stats = toolRegistry.getStats();
            const domains = Object.keys(stats.toolsByDomain);
            expect(domains.length).toBeGreaterThanOrEqual(6);
            expect(domains).toContain('property');
            expect(domains).toContain('contact');
            expect(domains).toContain('deal');
            expect(domains).toContain('task');
            expect(domains).toContain('calendar');
        });
    });

    describe('Alias Coverage & Synonym Resolution', () => {

        it('should resolve basic aliases ("add contact" -> "contact.create")', () => {
            const resolved = toolAliasGenerator.resolve('add_contact');
            expect(resolved).toBe('contact.create');
        });

        it('should resolve camelCase aliases ("createProperty" -> "property.create")', () => {
            const resolved = toolAliasGenerator.resolve('createProperty');
            expect(resolved).toBe('property.create');
        });

        it('should resolve Triple-Synonym coverage (Property-Based)', async () => {
            // This test ensures that different natural language variations always hit the target
            await fc.assert(
                fc.property(
                    fc.constantFrom('create', 'add', 'make', 'new', 'insert'),
                    fc.constantFrom('property', 'listing', 'house', 'home'),
                    (action, entity) => {
                        // Variations like 'add_property', 'create_listing', 'make_house'
                        const variation1 = `${action}_${entity}`;
                        const variation2 = `${action}${entity.charAt(0).toUpperCase() + entity.slice(1)}`;

                        const resolved1 = toolAliasGenerator.resolve(variation1);
                        const resolved2 = toolAliasGenerator.resolve(variation2);

                        // If it's a "create" synonym and "property" synonym, it must resolve to property.create
                        expect(resolved1).toBe('property.create');
                        expect(resolved2).toBe('property.create');
                    }
                )
            );
        });

        it('should resolve Contact synonyms ("person", "client", "user")', async () => {
            await fc.assert(
                fc.property(
                    fc.constantFrom('create', 'add', 'new'),
                    fc.constantFrom('contact', 'person', 'client', 'customer'),
                    (action, entity) => {
                        const variation = `${action}_${entity}`;
                        const resolved = toolAliasGenerator.resolve(variation);
                        expect(resolved).toBe('contact.create');
                    }
                )
            );
        });
    });

    describe('Domain-Specific Invariants', () => {
        it('property.create should have the correct input schema', () => {
            const tool = toolRegistry.getTool('property.create');
            expect(tool).toBeDefined();
            expect(tool?.inputSchema.required).toContain('address');
            expect(tool?.inputSchema.required).toContain('listingPrice');
        });
    });
});
