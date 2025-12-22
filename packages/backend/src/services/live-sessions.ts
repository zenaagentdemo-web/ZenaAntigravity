import { WebSocket } from 'ws';

export interface UserSession {
    session: any; // The Gemini Live session
    userWs: WebSocket;
    userTranscriptBuffer: string[];
    currentInterimTranscript: string;
}

// Shared map to prevent instance fragmentation
export const sessions = new Map<string, UserSession>();
