import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/apiClient';

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

    // WebSocket Connection specific to Properties (reusing same socket or logic)
    // For now, we reuse the pattern from useContactIntelligence, listening for 'property.intelligence'
    useEffect(() => {
        const token = localStorage.getItem('zena_auth_token') || 'demo-token';
        if (!token) return;

        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${host}/ws?token=${token}`;

        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('[ZenaBrain] Properties connected to neural network');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'property.intelligence') {
                    console.log('[ZenaBrain] Received property intelligence update:', message.payload);
                    setLastPropertyUpdate(message.payload);
                }
            } catch (err) {
                console.error('Error parsing WS message', err);
            }
        };

        ws.onclose = () => setIsConnected(false);

        return () => ws.close();
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
