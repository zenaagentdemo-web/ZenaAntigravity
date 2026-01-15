import { WebSocket } from 'ws';

export interface UserSession {
    session: any; // The Gemini Live session
    userWs: WebSocket;
    userTranscriptBuffer: string[];
    currentInterimTranscript: string;
    isStopping: boolean;
    groundingSources: string[]; // Store verified source links to append to transcript
    lastTurnSourcesCount: number; // Track sources sent in current turn
    hasLoggedMessageStructure?: boolean; // Diagnostic flag for logging
    cleanup?: () => void;
}

// Shared map to prevent instance fragmentation
export const sessions = new Map<string, UserSession>();
