import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/apiClient';
import { realTimeDataService } from '../services/realTimeDataService';

export interface SuggestedAction {
    action: string;
    reasoning: string;
    impact: 'Low' | 'Medium' | 'High';
}

export interface PropertyPrediction {
    id: string;
    propertyId: string;
    momentumScore: number;
    buyerInterestLevel: 'Low' | 'Medium' | 'High' | 'Hot';
    reasoning?: string;
    predictedSaleDate: string | null;
    marketValueEstimate: number | null;
    confidenceScore: number | null;
    suggestedActions: SuggestedAction[];
    milestoneForecasts?: Array<{ type: string; date: string; confidence: number }>;
    lastAnalyzedAt: string;
}

export const usePropertyIntelligence = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastPropertyUpdate, setLastPropertyUpdate] = useState<{ propertyId: string, prediction: PropertyPrediction } | null>(null);

    // WebSocket Connection handling via centralized RealTimeDataService
    useEffect(() => {
        // Subscribe to connection status
        const unsubscribeStatus = realTimeDataService.onConnectionStatus((status) => {
            setIsConnected(status);
        });

        // Initialize connection if needed
        if (!realTimeDataService.getConnectionStatus()) {
            realTimeDataService.ensureConnection();
        } else {
            setIsConnected(true);
        }

        // Subscribe to property intelligence updates
        const unsubscribeIntelligence = realTimeDataService.onPropertyIntelligence((payload) => {
            console.log('[ZenaBrain] Received property intelligence update:', payload);
            setLastPropertyUpdate(payload);
        });

        return () => {
            unsubscribeStatus();
            unsubscribeIntelligence();
        };
    }, []);

    // Manual Refresh Function
    const refreshIntelligence = async (propertyId: string, force: boolean = false) => {
        try {
            console.log(`[ZenaBrain] Requesting neural analysis for property ${propertyId} (force=${force})...`);
            const response = await api.post<{ success: boolean, prediction: PropertyPrediction }>(`/api/properties/${propertyId}/intelligence/refresh`, { force });

            // If we get an immediate response, we can also return it, 
            // but the Websocket will also likely broadcast it.
            return response.data.prediction;
        } catch (error) {
            console.error('Failed to refresh intelligence:', error);
            throw error;
        }
    };

    // Get Initial Intelligence (if not loaded)
    const getIntelligence = async (propertyId: string) => {
        try {
            const response = await api.get<{ prediction: PropertyPrediction }>(`/api/properties/${propertyId}/intelligence`);
            return response.data.prediction;
        } catch (error) {
            console.error('Failed to get intelligence:', error);
            return null;
        }
    };

    return {
        isConnected,
        lastPropertyUpdate,
        refreshIntelligence,
        getIntelligence
    };
};
