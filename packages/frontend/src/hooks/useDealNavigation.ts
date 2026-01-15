import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { DealNavigationState } from '../models/dealNavigation.types';

export const useDealNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as DealNavigationState | null;

    const navigateToFromDeal = useCallback((path: string, dealId: string, propertyName?: string, additionalState?: any) => {
        navigate(path, {
            state: {
                ...additionalState,
                from: 'deal-detail',
                dealId,
                propertyName,
                label: 'Deal Flow'
            }
        });
    }, [navigate]);

    const goBackToDeal = useCallback(() => {
        if (state?.from === 'deal-detail' && state.dealId) {
            navigate('/deal-flow', {
                state: {
                    openDealId: state.dealId,
                    openPipelineType: state.pipelineType
                }
            });
        } else {
            // Fallback if state is missing or corrupted
            navigate(-1);
        }
    }, [navigate, state]);

    const isFromDeal = state?.from === 'deal-detail';
    const dealId = state?.dealId;
    const propertyName = state?.propertyName;

    return {
        isFromDeal,
        dealId,
        propertyName,
        navigateToFromDeal,
        goBackToDeal,
        state
    };
};
