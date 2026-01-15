import { useState, useEffect, useCallback } from 'react';
import { EngagementScore } from '../utils/ContactEngagementScorer';

interface EngagementUpdate {
    contactId: string;
    engagementScore: number;
    momentum: number;
    dealStage: string | null;
    nextBestAction?: string;
    engagementReasoning?: string;
}

interface CategoryUpdate {
    contactId: string;
    zenaCategory: string;
    confidence?: number;
    reason?: string;
    intelligenceSnippet?: string;
    role?: string;
}

interface DiscoveryUpdate {
    contactId: string;
    status: 'started' | 'completed' | 'failed';
    contactName?: string;
    message?: string;
    payload?: any;
}

export const useContactIntelligence = () => {
    const [lastEngagementUpdate, setLastEngagementUpdate] = useState<EngagementUpdate | null>(null);
    const [lastCategoryUpdate, setLastCategoryUpdate] = useState<CategoryUpdate | null>(null);
    const [lastBatchUpdate, setLastBatchUpdate] = useState<{ updates: CategoryUpdate[] } | null>(null);
    const [lastDiscoveryUpdate, setLastDiscoveryUpdate] = useState<DiscoveryUpdate | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    const connect = useCallback(() => {
        const token = localStorage.getItem('auth_token') || 'demo-token'; // Fallback for dev
        if (!token) {
            console.warn('[ZenaBrain] No auth token found, skipping WebSocket connection');
            return;
        }

        // In dev, we might be on port 5173 (frontend) but WS is on 3001 (backend)
        // Or proxy might handle it.
        // Backend websocket path is '/ws'

        // For development, we hardcode the backend port if running on localhost
        const host = window.location.host;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${host}/ws?token=${token}`;

        console.log('[ZenaBrain] Connecting to neural network...', url);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('[ZenaBrain] Connected to Zena Neural Network');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'contact.engagement') {
                    console.log('[ZenaBrain] Received engagement impulse:', message.payload);
                    setLastEngagementUpdate(message.payload);
                } else if (message.type === 'contact.categorized') {
                    console.log('[ZenaBrain] Received categorization signal:', message.payload);
                    setLastCategoryUpdate(message.payload);
                } else if (message.type === 'batch.contacts.updated') {
                    console.log('[ZenaBrain] Received bulk synchronization signal:', message.payload);
                    setLastBatchUpdate(message.payload);
                } else if (message.type.startsWith('discovery.')) {
                    console.log(`[ZenaBrain] Received discovery signal (${message.type}):`, message.payload);
                    setLastDiscoveryUpdate(message.payload);
                } else if (message.type === 'connection.established') {
                    console.log('[ZenaBrain] Neural link established');
                }
            } catch (err) {
                console.error('[ZenaBrain] Failed to parse neural signal:', err);
            }
        };

        ws.onclose = () => {
            console.log('[ZenaBrain] Disconnected from neural network');
            setIsConnected(false);
            // Reconnect logic could go here
        };

        ws.onerror = (err) => {
            console.error('[ZenaBrain] Neural network error:', err);
        };

        setSocket(ws);

        return ws;
    }, []);

    useEffect(() => {
        const ws = connect();
        return () => {
            if (ws) ws.close();
        };
    }, [connect]);

    return {
        isConnected,
        lastEngagementUpdate,
        lastCategoryUpdate,
        lastBatchUpdate,
        lastDiscoveryUpdate
    };
};
