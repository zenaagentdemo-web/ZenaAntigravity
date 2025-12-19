/**
 * useThreadDetail Hook
 * 
 * Fetches and manages thread detail state including messages, loading, and error states.
 * Provides auto-refresh capability for real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/apiClient';
import {
    ThreadDetailedView,
    MessageWithAttachments,
    AttachmentMeta,
    RiskLevel,
    DealStage
} from '../models/newPage.types';

interface UseThreadDetailState {
    thread: ThreadDetailedView | null;
    messages: MessageWithAttachments[];
    isLoading: boolean;
    isLoadingMessages: boolean;
    error: Error | null;
}

interface UseThreadDetailResult extends UseThreadDetailState {
    refresh: () => Promise<void>;
    loadMessages: () => Promise<void>;
}

/**
 * Hook for fetching and managing thread detail data
 * @param threadId - The ID of the thread to fetch
 * @param autoLoadMessages - Whether to automatically load messages on mount (default: true)
 */
export function useThreadDetail(
    threadId: string | undefined,
    autoLoadMessages: boolean = true
): UseThreadDetailResult {
    const [state, setState] = useState<UseThreadDetailState>({
        thread: null,
        messages: [],
        isLoading: true,
        isLoadingMessages: false,
        error: null
    });

    // Fetch thread data
    const loadThread = useCallback(async () => {
        if (!threadId) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await api.get<{ thread: any }>(`/api/threads/${threadId}`);
            const threadData = response.data.thread;

            // Transform API response to ThreadDetailedView
            const thread: ThreadDetailedView = {
                id: threadData.id,
                subject: threadData.subject,
                participants: threadData.participants || [],
                classification: threadData.classification || 'noise',
                riskLevel: threadData.riskLevel || 'none',
                riskReason: threadData.riskReason,
                lastMessageAt: threadData.lastMessageAt,
                createdAt: threadData.createdAt,
                draftResponse: threadData.draftResponse,
                summary: threadData.summary || '',
                aiSummary: threadData.aiSummary,
                propertyId: threadData.property?.id,
                propertyAddress: threadData.property?.address,
                dealId: threadData.deal?.id,
                dealStage: threadData.deal?.stage as DealStage,
                messageCount: threadData.messageCount || 0,
                unreadCount: threadData.unreadCount || 0,
                messages: [],
                attachments: [],
                hasReplied: threadData.hasReplied || false,
                lastViewedAt: threadData.lastViewedAt,
                linkedProperty: threadData.property ? {
                    id: threadData.property.id,
                    address: threadData.property.address,
                    price: threadData.property.price,
                    imageUrl: threadData.property.imageUrl
                } : undefined,
                linkedDeal: threadData.deal ? {
                    id: threadData.deal.id,
                    stage: threadData.deal.stage as DealStage,
                    riskLevel: threadData.deal.riskLevel as RiskLevel,
                    nextAction: threadData.deal.nextAction,
                    nextActionOwner: threadData.deal.nextActionOwner
                } : undefined,
                aiInsights: threadData.aiInsights ? {
                    summary: threadData.aiInsights.summary || threadData.summary,
                    keyPoints: threadData.aiInsights.keyPoints || [],
                    suggestedNextActions: threadData.aiInsights.suggestedNextActions ||
                        (threadData.nextAction ? [threadData.nextAction] : []),
                    sentiment: threadData.aiInsights.sentiment || 'neutral',
                    riskAnalysis: threadData.riskLevel !== 'none' ? {
                        level: threadData.riskLevel as RiskLevel,
                        reasons: threadData.riskReason ? [threadData.riskReason] : []
                    } : undefined
                } : undefined
            };

            setState(prev => ({
                ...prev,
                thread,
                isLoading: false
            }));
        } catch (err) {
            console.error('Failed to load thread:', err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err : new Error('Failed to load thread')
            }));
        }
    }, [threadId]);

    // Fetch messages for the thread
    const loadMessages = useCallback(async () => {
        if (!threadId) return;

        setState(prev => ({ ...prev, isLoadingMessages: true }));

        try {
            const response = await api.get<{ messages: any[] }>(`/api/threads/${threadId}/messages`);
            const messagesData = response.data.messages || [];

            // Transform API response to MessageWithAttachments[]
            const messages: MessageWithAttachments[] = messagesData.map((msg: any) => ({
                id: msg.id,
                externalId: msg.externalId,
                threadId: threadId,
                from: {
                    name: msg.from?.name || 'Unknown',
                    email: msg.from?.email || ''
                },
                to: (msg.to || []).map((r: any) => ({
                    name: r.name || '',
                    email: r.email || ''
                })),
                cc: (msg.cc || []).map((r: any) => ({
                    name: r.name || '',
                    email: r.email || ''
                })),
                subject: msg.subject || '',
                body: msg.body || '',
                bodyHtml: msg.bodyHtml,
                sentAt: msg.sentAt,
                receivedAt: msg.receivedAt,
                isFromUser: msg.isFromUser || false,
                isRead: msg.isRead !== false,
                attachments: (msg.attachments || []).map((att: any) => ({
                    id: att.id,
                    filename: att.filename,
                    mimeType: att.mimeType,
                    size: att.size,
                    url: att.url,
                    thumbnailUrl: att.thumbnailUrl,
                    messageId: msg.id
                }))
            }));

            // Extract all attachments
            const allAttachments: AttachmentMeta[] = messages.flatMap(msg => msg.attachments);

            setState(prev => ({
                ...prev,
                messages,
                thread: prev.thread ? {
                    ...prev.thread,
                    messages,
                    attachments: allAttachments
                } : null,
                isLoadingMessages: false
            }));
        } catch (err) {
            console.error('Failed to load messages:', err);
            setState(prev => ({
                ...prev,
                isLoadingMessages: false,
                error: err instanceof Error ? err : new Error('Failed to load messages')
            }));
        }
    }, [threadId]);

    // Refresh all data
    const refresh = useCallback(async () => {
        await loadThread();
        if (autoLoadMessages) {
            await loadMessages();
        }
    }, [loadThread, loadMessages, autoLoadMessages]);

    // Load thread on mount and when threadId changes
    useEffect(() => {
        if (threadId) {
            loadThread();
            if (autoLoadMessages) {
                loadMessages();
            }
        }
    }, [threadId, loadThread, loadMessages, autoLoadMessages]);

    return {
        ...state,
        refresh,
        loadMessages
    };
}

export default useThreadDetail;
