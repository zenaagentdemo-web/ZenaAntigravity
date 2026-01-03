/**
 * useGodmode Hook
 * 
 * React hook for managing Godmode settings and pending actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/apiClient';

type GodmodeMode = 'off' | 'demi_god' | 'full_god';

interface GodmodeSettings {
    mode: GodmodeMode;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    enabledActionTypes: string[];
}

interface AutonomousAction {
    id: string;
    actionType: string;
    priority: number;
    title: string;
    description?: string;
    draftSubject?: string;
    draftBody?: string;
    status: string;
    mode: string;
    createdAt: string;
    contact?: {
        id: string;
        name: string;
    };
}

interface UseGodmodeReturn {
    settings: GodmodeSettings;
    pendingActions: AutonomousAction[];
    pendingCount: number;
    isLoading: boolean;
    isInTimeWindow: boolean;
    fetchSettings: () => Promise<void>;
    updateMode: (mode: GodmodeMode) => Promise<void>;
    fetchPendingActions: () => Promise<void>;
    approveAction: (actionId: string) => Promise<boolean>;
    dismissAction: (actionId: string) => Promise<boolean>;
}

export const useGodmode = (): UseGodmodeReturn => {
    const [settings, setSettings] = useState<GodmodeSettings>({
        mode: 'demi_god',
        enabledActionTypes: []
    });
    const [pendingActions, setPendingActions] = useState<AutonomousAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInTimeWindow, setIsInTimeWindow] = useState(false);

    const fetchSettings = useCallback(async (): Promise<void> => {
        try {
            const response = await api.get('/api/godmode/settings');
            if (response.data) {
                setSettings(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch Godmode settings:', error);
        }
    }, []);

    const updateMode = useCallback(async (mode: GodmodeMode): Promise<void> => {
        try {
            await api.put('/api/godmode/settings', { mode });
            setSettings(prev => ({ ...prev, mode }));
            // Notify other instances of the hook
            window.dispatchEvent(new CustomEvent('zena-godmode-updated'));
        } catch (error) {
            console.error('Failed to update Godmode mode:', error);
        }
    }, []);

    const fetchPendingActions = useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/godmode/actions');
            if (response.data) {
                setPendingActions(response.data.actions || []);
                setIsInTimeWindow(response.data.isInTimeWindow || false);
            }
        } catch (error) {
            console.error('Failed to fetch pending actions:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch settings on mount and listen for updates
    useEffect(() => {
        fetchSettings();
        fetchPendingActions();

        const handleUpdate = () => {
            fetchSettings();
        };

        window.addEventListener('zena-godmode-updated', handleUpdate);
        return () => window.removeEventListener('zena-godmode-updated', handleUpdate);
    }, [fetchSettings, fetchPendingActions]);

    const approveAction = useCallback(async (actionId: string): Promise<boolean> => {
        try {
            await api.post(`/api/godmode/actions/${actionId}/approve`);
            setPendingActions(prev => prev.filter(a => a.id !== actionId));
            return true;
        } catch (error) {
            console.error('Failed to approve action:', error);
            return false;
        }
    }, []);

    const dismissAction = useCallback(async (actionId: string): Promise<boolean> => {
        try {
            await api.post(`/api/godmode/actions/${actionId}/dismiss`);
            setPendingActions(prev => prev.filter(a => a.id !== actionId));
            return true;
        } catch (error) {
            console.error('Failed to dismiss action:', error);
            return false;
        }
    }, []);

    return {
        settings,
        pendingActions,
        pendingCount: pendingActions.length,
        isLoading,
        isInTimeWindow,
        fetchSettings,
        updateMode,
        fetchPendingActions,
        approveAction,
        dismissAction
    };
};

export default useGodmode;
