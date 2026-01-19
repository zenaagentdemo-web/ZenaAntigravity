/**
 * Session Manager Service
 * 
 * Manages agent conversation sessions, tracking:
 * - Current focus (which entity we're working with)
 * - Conversation history
 * - Pending confirmations
 * - Recent entities for pronoun resolution
 */

import { randomUUID } from 'crypto';
import { logger } from './logger.service.js';

/**
 * Current focus state - what entity the agent is working with
 */
export interface CurrentFocus {
    type: 'thread' | 'deal' | 'contact' | 'property' | 'task' | 'calendar_event' | null;
    id: string | null;
    metadata: {
        subject?: string;      // For threads
        address?: string;      // For properties/deals
        name?: string;         // For contacts
        stage?: string;        // For deals
        from?: string;         // For threads
    };
}

/**
 * Inbox cursor for navigating through emails
 */
export interface InboxCursor {
    threadIds: string[];
    currentIndex: number;
    tab: 'new_mail' | 'awaiting';
}

/**
 * Pending confirmation state
 */
export interface PendingConfirmation {
    toolName: string;
    payload: any;
    confirmationPrompt: string;
    isDestructive: boolean;
    createdAt: Date;
    /**
     * Accumulated parameters from multiple conversation turns.
     * Each turn, new data is merged here to support multi-turn data gathering.
     */
    accumulatedParams: Record<string, any>;
    /**
     * The original user query that triggered this confirmation.
     * Used to re-select tools after confirmation for multi-action commands.
     */
    originalQuery?: string;
    /**
     * Whether the user has already been prompted for missing recommended fields.
     */
    wasPrompted?: boolean;
    /**
     * Whether proactive context scan has already been performed (and with what key).
     */
    contextScannedKey?: string;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolName?: string;
    toolResult?: any;
    suggestedActions?: any[];
    timestamp: Date;
}

/**
 * Recently mentioned entities for pronoun resolution
 */
export interface RecentEntities {
    contacts: Array<{ id: string; name: string; mentionedAt: Date }>;
    properties: Array<{ id: string; address: string; mentionedAt: Date }>;
    deals: Array<{ id: string; address: string; stage: string; mentionedAt: Date }>;
    threads: Array<{ id: string; subject: string; mentionedAt: Date }>;
    tasks: Array<{ id: string; label: string; mentionedAt: Date }>;
    calendar_events: Array<{ id: string; summary: string; mentionedAt: Date }>;
}

/**
 * Full agent session state
 */
export interface AgentSession {
    // Identity
    userId: string;
    sessionId: string;
    conversationId: string;

    // Timestamps
    createdAt: Date;
    lastActivityAt: Date;

    // Current working context
    currentFocus: CurrentFocus;
    inboxCursor: InboxCursor | null;

    // Pending approvals
    pendingConfirmation: PendingConfirmation | null;

    // Conversation memory
    conversationHistory: ConversationMessage[];

    // Entity tracking for pronoun resolution
    recentEntities: RecentEntities;

    // Mode
    isVoiceMode: boolean;

    /**
     * When true, all subsequent tool executions in this session are auto-approved.
     * Set after user confirms an action (e.g., says "yes" to create entity).
     */
    autoExecuteMode?: boolean;
}

/**
 * Session Manager Service
 */
class SessionManagerService {
    private sessions: Map<string, AgentSession> = new Map();

    // Session timeout (30 minutes)
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000;

    // Max conversation history entries
    private readonly MAX_HISTORY = 50;

    // Max recent entities per type
    private readonly MAX_RECENT_ENTITIES = 10;

    /**
     * Create or get existing session for a user
     */
    getOrCreateSession(userId: string, conversationId?: string): AgentSession {
        // Check for existing session
        const existingSession = this.findActiveSession(userId);
        if (existingSession) {
            existingSession.lastActivityAt = new Date();
            // 🧠 ZENA CONVERSATION SYNC: Update conversation ID if provided (frontend context switch)
            if (conversationId && existingSession.conversationId !== conversationId) {
                console.log(`[SessionManager] Switching session ${existingSession.sessionId} to conversation ${conversationId}`);
                existingSession.conversationId = conversationId;
            }
            logger.info(`[SessionManager] REUSING session ${existingSession.sessionId} for user ${userId}, PendingConfirmation: ${existingSession.pendingConfirmation?.toolName || 'NONE'}`);
            return existingSession;
        }

        // Create new session
        const session: AgentSession = {
            userId,
            sessionId: randomUUID(),
            conversationId: conversationId || randomUUID(),
            createdAt: new Date(),
            lastActivityAt: new Date(),
            currentFocus: {
                type: null,
                id: null,
                metadata: {}
            },
            inboxCursor: null,
            pendingConfirmation: null,
            conversationHistory: [],
            recentEntities: {
                contacts: [],
                properties: [],
                deals: [],
                threads: [],
                tasks: [],
                calendar_events: []
            },
            isVoiceMode: false
        };

        this.sessions.set(session.sessionId, session);
        logger.info(`[SessionManager] CREATED NEW session ${session.sessionId} for user ${userId} (Total sessions: ${this.sessions.size})`);

        return session;
    }

    /**
     * Find active session for a user
     */
    findActiveSession(userId: string): AgentSession | null {
        const sessions = Array.from(this.sessions.values());
        for (const session of sessions) {
            if (session.userId === userId) {
                const age = Date.now() - session.lastActivityAt.getTime();
                if (age < this.SESSION_TIMEOUT) {
                    return session;
                }
                // Session expired, remove it
                this.sessions.delete(session.sessionId);
            }
        }
        return null;
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): AgentSession | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Update current focus
     */
    setFocus(sessionId: string, focus: CurrentFocus): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.currentFocus = focus;
        session.lastActivityAt = new Date();

        console.log(`[SessionManager] Focus set to ${focus.type}:${focus.id}`);
    }

    /**
     * Set inbox cursor for email navigation
     */
    setInboxCursor(sessionId: string, cursor: InboxCursor): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.inboxCursor = cursor;
        session.lastActivityAt = new Date();
    }

    /**
     * Advance inbox cursor
     */
    advanceInboxCursor(sessionId: string): string | null {
        const session = this.sessions.get(sessionId);
        if (!session || !session.inboxCursor) return null;

        const cursor = session.inboxCursor;
        if (cursor.currentIndex < cursor.threadIds.length - 1) {
            cursor.currentIndex++;
            session.lastActivityAt = new Date();
            return cursor.threadIds[cursor.currentIndex];
        }

        return null; // No more emails
    }

    /**
     * Get current thread ID from cursor
     */
    getCurrentThreadId(sessionId: string): string | null {
        const session = this.sessions.get(sessionId);
        if (!session || !session.inboxCursor) return null;

        const cursor = session.inboxCursor;
        return cursor.threadIds[cursor.currentIndex] || null;
    }

    /**
     * Set pending confirmation
     */
    setPendingConfirmation(sessionId: string, confirmation: Omit<PendingConfirmation, 'createdAt'>): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            logger.info(`[SessionManager] setPendingConfirmation FAILED - Session ${sessionId} NOT FOUND in sessions map (size: ${this.sessions.size})`);
            return;
        }

        session.pendingConfirmation = {
            ...confirmation,
            createdAt: new Date()
        };
        session.lastActivityAt = new Date();
        logger.info(`[SessionManager] setPendingConfirmation SUCCESS - Session ${sessionId}, Tool: ${confirmation.toolName}`);
    }

    /**
     * Clear pending confirmation
     */
    clearPendingConfirmation(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.pendingConfirmation = null;
        session.lastActivityAt = new Date();
    }

    /**
     * Add message to conversation history
     */
    addMessage(sessionId: string, message: Omit<ConversationMessage, 'timestamp'>): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.conversationHistory.push({
            ...message,
            timestamp: new Date()
        });

        // Trim history if too long
        if (session.conversationHistory.length > this.MAX_HISTORY) {
            session.conversationHistory = session.conversationHistory.slice(-this.MAX_HISTORY);
        }

        session.lastActivityAt = new Date();
    }

    /**
     * Track a mentioned entity for pronoun resolution
     */
    trackEntity(
        sessionId: string,
        type: 'contact' | 'property' | 'deal' | 'thread' | 'task' | 'calendar_event',
        entity: { id: string;[key: string]: any }
    ): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        const now = new Date();
        const key = (type === 'property' ? 'properties' : type + 's') as keyof RecentEntities;
        const entities = session.recentEntities[key] as any[];

        // Guard against undefined entities array (invalid type)
        if (!entities) {
            console.warn(`[SessionManager] Invalid entity type: ${type}, key: ${key}`);
            return;
        }

        // Remove existing entry for this entity
        const existingIndex = entities.findIndex(e => e.id === entity.id);
        if (existingIndex >= 0) {
            entities.splice(existingIndex, 1);
        }

        // Add to front with timestamp
        entities.unshift({ ...entity, mentionedAt: now });

        // Trim if too many
        if (entities.length > this.MAX_RECENT_ENTITIES) {
            entities.pop();
        }

        session.lastActivityAt = new Date();
    }

    /**
     * Resolve a pronoun like "them", "it", "this" to an entity
     */
    resolveReference(sessionId: string, pronoun: string): { type: string; entity: any } | null {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        // First check current focus
        if (session.currentFocus.id) {
            return {
                type: session.currentFocus.type as string,
                entity: { id: session.currentFocus.id, ...session.currentFocus.metadata }
            };
        }

        // Check pronouns for hints
        const lowerPronoun = pronoun.toLowerCase();

        // Person pronouns -> contacts
        if (['they', 'them', 'their', 'he', 'him', 'his', 'she', 'her'].includes(lowerPronoun)) {
            const contact = session.recentEntities.contacts[0];
            if (contact) return { type: 'contact', entity: contact };
        }

        // "it" could be anything - return most recent
        if (['it', 'this', 'that'].includes(lowerPronoun)) {
            // Find most recent across all types
            let mostRecent: { type: string; entity: any } | null = null;
            let mostRecentTime = 0;

            for (const [type, entities] of Object.entries(session.recentEntities)) {
                const entity = (entities as any[])[0];
                if (entity && entity.mentionedAt) {
                    const time = new Date(entity.mentionedAt).getTime();
                    if (time > mostRecentTime) {
                        mostRecentTime = time;
                        mostRecent = { type: type.slice(0, -1), entity }; // Remove 's' from type
                    }
                }
            }

            return mostRecent;
        }

        return null;
    }

    /**
     * Set voice mode
     */
    setVoiceMode(sessionId: string, isVoice: boolean): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.isVoiceMode = isVoice;
        session.lastActivityAt = new Date();
    }

    /**
     * End a session
     */
    endSession(sessionId: string): void {
        this.sessions.delete(sessionId);
        console.log(`[SessionManager] Ended session ${sessionId}`);
    }

    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions(): number {
        const now = Date.now();
        let cleaned = 0;

        const entries = Array.from(this.sessions.entries());
        for (const [sessionId, session] of entries) {
            const age = now - session.lastActivityAt.getTime();
            if (age > this.SESSION_TIMEOUT) {
                this.sessions.delete(sessionId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[SessionManager] Cleaned up ${cleaned} expired sessions`);
        }

        return cleaned;
    }

    /**
     * Get session stats
     */
    getStats(): {
        activeSessions: number;
        oldestSession: Date | null;
    } {
        let oldest: Date | null = null;

        const sessions = Array.from(this.sessions.values());
        for (const session of sessions) {
            if (!oldest || session.createdAt < oldest) {
                oldest = session.createdAt;
            }
        }

        return {
            activeSessions: this.sessions.size,
            oldestSession: oldest
        };
    }
}

export const sessionManager = new SessionManagerService();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
    sessionManager.cleanupExpiredSessions();
}, 5 * 60 * 1000);
