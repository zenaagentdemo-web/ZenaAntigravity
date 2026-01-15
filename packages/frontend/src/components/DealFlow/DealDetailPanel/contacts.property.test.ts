import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import type { Deal } from '../../types';

// Logic Helpers (to be implemented/used in component)
const unlinkContact = (deal: Deal, contactId: string): Deal => ({
    ...deal,
    contacts: deal.contacts?.filter(c => c.id !== contactId) || []
});

const updateContact = (deal: Deal, contactId: string, updates: any): Deal => ({
    ...deal,
    contacts: deal.contacts?.map(c =>
        c.id === contactId ? { ...c, ...updates } : c
    ) || []
});

describe('Contact Logic Invariants', () => {
    it('should reduce contact count by 1 when unlinking existing contact', () => {
        fc.assert(
            fc.property(
                fc.record({
                    id: fc.uuid(),
                    contacts: fc.array(fc.record({ id: fc.uuid(), name: fc.string() }), { minLength: 1 })
                }),
                (partialDeal) => {
                    const deal = partialDeal as any as Deal;
                    const targetContact = deal.contacts![0];

                    const updatedDeal = unlinkContact(deal, targetContact.id);

                    if (deal.contacts!.length > 0) {
                        if (deal.contacts!.filter(c => c.id === targetContact.id).length === 1) {
                            // If ID was unique
                            if (updatedDeal.contacts!.length !== deal.contacts!.length - 1) {
                                throw new Error('Count did not decrease by 1');
                            }
                        }
                    }
                    // Invariant: Target should not exist in updated list
                    if (updatedDeal.contacts!.some(c => c.id === targetContact.id)) {
                        throw new Error('Contact still exists');
                    }
                }
            )
        );
    });

    it('should preserve ID and update fields when editing contact', () => {
        fc.assert(
            fc.property(
                fc.record({
                    id: fc.uuid(),
                    contacts: fc.array(fc.record({ id: fc.uuid(), name: fc.string(), role: fc.string() }), { minLength: 1 })
                }),
                fc.record({ name: fc.string(), role: fc.string() }),
                (partialDeal, updates) => {
                    const deal = partialDeal as any as Deal;
                    const targetContact = deal.contacts![0];

                    const updatedDeal = updateContact(deal, targetContact.id, updates);

                    const updatedContact = updatedDeal.contacts!.find(c => c.id === targetContact.id);

                    // Invariant: Contact must still exist
                    if (!updatedContact) throw new Error('Contact lost');

                    // Invariant: Name and Role must match updates
                    if (updatedContact.name !== updates.name) throw new Error('Name mismatch');
                    if (updatedContact.role !== updates.role) throw new Error('Role mismatch');

                    // Invariant: ID must be preserved
                    if (updatedContact.id !== targetContact.id) throw new Error('ID changed');
                }
            )
        );
    });
});
