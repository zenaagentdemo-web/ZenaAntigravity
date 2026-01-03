/**
 * useOracle Hook
 * 
 * React hook for fetching and managing Oracle predictions for contacts.
 */

import { useState, useCallback } from 'react';
import { api } from '../utils/apiClient';

interface OraclePrediction {
    maturityLevel: number;
    maturityLabel: string;
    personalityType: string | null;
    personalityConfidence: number | null;
    communicationTips: string[];
    sellProbability: number | null;
    buyProbability: number | null;
    churnRisk: number | null;
    signalsDetected: any[];
    dataPoints: {
        emailsAnalyzed: number;
        eventsCount: number;
        monthsActive: number;
    };
}

interface UseOracleReturn {
    predictions: Record<string, OraclePrediction>;
    isLoading: boolean;
    fetchPrediction: (contactId: string) => Promise<OraclePrediction | null>;
    analyzContact: (contactId: string) => Promise<OraclePrediction | null>;
    batchAnalyze: (contactIds: string[]) => Promise<void>;
}

export const useOracle = (): UseOracleReturn => {
    const [predictions, setPredictions] = useState<Record<string, OraclePrediction>>({});
    const [isLoading, setIsLoading] = useState(false);

    const fetchPrediction = useCallback(async (contactId: string): Promise<OraclePrediction | null> => {
        try {
            const response = await api.get(`/api/oracle/contact/${contactId}`);
            if (response.data) {
                setPredictions(prev => ({ ...prev, [contactId]: response.data }));
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch Oracle prediction:', error);
            return null;
        }
    }, []);

    const analyzContact = useCallback(async (contactId: string): Promise<OraclePrediction | null> => {
        try {
            const response = await api.post(`/api/oracle/analyze/${contactId}`);
            if (response.data?.prediction) {
                setPredictions(prev => ({ ...prev, [contactId]: response.data.prediction }));
                return response.data.prediction;
            }
            return null;
        } catch (error) {
            console.error('Failed to analyze contact:', error);
            return null;
        }
    }, []);

    const batchAnalyze = useCallback(async (contactIds: string[]): Promise<void> => {
        setIsLoading(true);
        try {
            const response = await api.post('/api/oracle/batch-analyze', { contactIds });
            if (response.data?.predictions) {
                setPredictions(prev => ({ ...prev, ...response.data.predictions }));
            }
        } catch (error) {
            console.error('Failed to batch analyze:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        predictions,
        isLoading,
        fetchPrediction,
        analyzContact,
        batchAnalyze
    };
};

export default useOracle;
