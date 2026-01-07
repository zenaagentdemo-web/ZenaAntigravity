import prisma from '../config/database.js';

export interface ChatMessageData {
    role: 'user' | 'assistant';
    content: string;
    attachments?: any[];
}

export class HistoryService {
    /**
     * Get all conversations for a user
     */
    async getConversations(userId: string) {
        return await prisma.chatConversation.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: {
                    select: { messages: true }
                }
            }
        });
    }

    /**
     * Get a specific conversation with its messages
     */
    async getConversation(conversationId: string, userId: string) {
        return await prisma.chatConversation.findFirst({
            where: {
                id: conversationId,
                userId
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
    }

    /**
     * Create a new conversation
     */
    async createConversation(userId: string, title?: string) {
        return await prisma.chatConversation.create({
            data: {
                userId,
                title: title || 'New Conversation'
            }
        });
    }

    /**
     * Add a message to a conversation
     */
    async addMessage(conversationId: string, message: ChatMessageData) {
        const newMessage = await prisma.chatMessage.create({
            data: {
                conversationId,
                role: message.role,
                content: message.content,
                attachments: message.attachments || []
            }
        });

        // Update conversation's updatedAt timestamp
        await prisma.chatConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        return newMessage;
    }

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId: string, userId: string) {
        return await prisma.chatConversation.deleteMany({
            where: {
                id: conversationId,
                userId
            }
        });
    }

    /**
     * Update conversation title
     */
    async updateTitle(conversationId: string, userId: string, title: string) {
        return await prisma.chatConversation.updateMany({
            where: {
                id: conversationId,
                userId
            },
            data: { title }
        });
    }
}

export const historyService = new HistoryService();
