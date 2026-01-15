import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { api } from '../utils/apiClient';

export type GodmodeMode = 'off' | 'demi_god' | 'full_god';

export interface GodmodeSettings {
    mode: GodmodeMode;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    enabledActionTypes: string[];
}

export interface AutonomousAction {
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
    contextSummary?: string;
    reasoning?: string;
    payload?: any;
    script?: string;
    contact?: {
        id: string;
        name: string;
        emails?: string[];
    };
    property?: {
        id: string;
        address: string;
    };
}

export interface GodmodeContextType {
    settings: GodmodeSettings;
    pendingActions: AutonomousAction[];
    pendingCount: number;
    isLoading: boolean;
    isInTimeWindow: boolean;
    fetchSettings: () => Promise<void>;
    updateMode: (mode: GodmodeMode) => Promise<void>;
    fetchPendingActions: () => Promise<void>;
    approveAction: (actionId: string, overrides?: { finalBody?: string; finalSubject?: string }) => Promise<boolean>;
    dismissAction: (actionId: string) => Promise<boolean>;
}

export const GodmodeContext = createContext<GodmodeContextType | undefined>(undefined);

export const useGodmode = (): GodmodeContextType => {
    const context = useContext(GodmodeContext);
    if (!context) {
        throw new Error('useGodmode must be used within a GodmodeProvider');
    }
    return context;
};

export const useGodmodeLogic = (): GodmodeContextType => {
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
            // Notify other instances if any (though Provider should handle it)
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

    const approveAction = useCallback(async (actionId: string, overrides?: { finalBody?: string; finalSubject?: string }): Promise<boolean> => {
        try {
            await api.post(`/api/godmode/actions/${actionId}/approve`, overrides);
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

    // Initial fetch in useGodmodeLogic and listen for updates
    useEffect(() => {
        fetchSettings();
        fetchPendingActions();

        // Listen for godmode updates from GodmodeToggle
        const handleUpdate = () => {
            fetchSettings();
        };
        window.addEventListener('zena-godmode-updated', handleUpdate);
        return () => {
            window.removeEventListener('zena-godmode-updated', handleUpdate);
        };
    }, [fetchSettings, fetchPendingActions]);

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
