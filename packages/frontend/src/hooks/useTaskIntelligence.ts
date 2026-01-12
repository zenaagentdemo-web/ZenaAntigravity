import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/apiClient';
import {
    analyseDeal,
    fetchContactIntelligence,
    DealIntelligence,
    ContactIntelligence,
    PowerMove,
    personalisePowerMove
} from '../components/DealFlow/ZenaIntelligence/ZenaIntelligenceEngine';
import { Deal, Contact } from '../types';

export interface TaskSuggestion {
    id: string;
    title: string;
    description: string;
    priority: 'urgent' | 'important' | 'normal';
    source: 'ask_zena'; // Using existing source type
    isSuggestion: boolean;
    dealId?: string;
    contactId?: string;
    actionType: string; // e.g., 'call', 'email'
}

export function useTaskIntelligence() {
    const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [dealIntelMap, setDealIntelMap] = useState<Record<string, DealIntelligence>>({});
    const [contactIntelMap, setContactIntelMap] = useState<Record<string, ContactIntelligence>>({});
    const [dealsMap, setDealsMap] = useState<Record<string, Deal>>({});

    const fetchIntelligence = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Active Deals & Contacts
            // In a real app, we might need pagination or specific "active" filters
            const [dealsRes, contactsRes] = await Promise.all([
                api.get('/api/deals'),
                api.get('/contacts') // Note: frontend usually uses /contacts for list
            ]);

            const deals: Deal[] = dealsRes.data.deals || [];
            const contacts: any[] = contactsRes.data || []; // Adjust based on actual API shape

            // Store deals map
            const newDealsMap: Record<string, Deal> = {};
            deals.forEach(d => newDealsMap[d.id] = d);
            setDealsMap(newDealsMap);

            // 2. Analyze Deals
            const newDealIntelMap: Record<string, DealIntelligence> = {};
            const dealSuggestions: TaskSuggestion[] = [];

            deals.forEach(deal => {
                const intel = analyseDeal(deal);
                newDealIntelMap[deal.id] = intel;

                // Check for Power Moves
                if (intel.suggestedPowerMove) {
                    const personalised = personalisePowerMove(intel.suggestedPowerMove, deal);

                    // Only surface High/Critical moves as suggestions
                    if (personalised.priority === 'high' || personalised.priority === 'critical') {
                        dealSuggestions.push({
                            id: `pm-${deal.id}-${personalised.id}`,
                            title: personalised.headline,
                            description: personalised.draftContent, // Or rationale
                            priority: personalised.priority === 'critical' ? 'urgent' : 'important',
                            source: 'ask_zena',
                            isSuggestion: true,
                            dealId: deal.id,
                            actionType: personalised.action
                        });
                    }
                }
            });

            // 3. Analyze Contacts (Simplified for performance - maybe just High Value ones?)
            // For now, we won't bulk fetch deep intel for ALL contacts as it might be slow.
            // But we can store the map for when a task is expanded.

            setDealIntelMap(newDealIntelMap);
            setSuggestions(dealSuggestions);

        } catch (err) {
            console.error('[useTaskIntelligence] Failed to fetch intelligence', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchIntelligence();
    }, [fetchIntelligence]);

    // Helper to get intel for a specific deal (from cache or fresh)
    const getDealIntel = (dealId: string) => dealIntelMap[dealId];

    // Helper to fetch contact intel on demand
    const getContactIntel = async (contactId: string) => {
        if (contactIntelMap[contactId]) return contactIntelMap[contactId];
        try {
            const intel = await fetchContactIntelligence(contactId);
            setContactIntelMap(prev => ({ ...prev, [contactId]: intel }));
            return intel;
        } catch (err) {
            console.error('Failed to fetch contact intel', err);
            return null;
        }
    };

    const getDeal = (dealId: string) => {
        // This assumes we have fetched deals in step 1 and stored them.
        // We need to store them in a state or ref.
        // Let's add a state for dealsMap.
        return dealsMap[dealId];
    };

    return {
        loading,
        suggestions,
        getDealIntel,
        getContactIntel,
        getDeal,
        refresh: fetchIntelligence
    };
}
