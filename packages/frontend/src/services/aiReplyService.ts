/**
 * AI Reply Service
 * 
 * Handles generation of smart replies using OpenAI (or mock fallback).
 * Supports different styles: Friendly, Professional, Casual.
 */

import { Thread, ReplyStyle } from '../models/newPage.types';

// Environment variable for API key
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export class AiReplyService {
    /**
     * Generate a reply based on the thread context and selected style
     */
    async generateReply(thread: Thread, style: ReplyStyle): Promise<string> {
        // If no API key is present, use mock generation
        if (!API_KEY) {
            return this.generateMockReply(thread, style);
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: `You are an expert email assistant named Zena. Generate a reply to the email thread provided.
              
              Style: ${style}
              context: property real estate transaction.
              
              Keep the reply concise, natural, and helpful. Do not include subject lines or placeholders unless absolutely necessary.`
                        },
                        {
                            role: "user",
                            content: `
              Subject: ${thread.subject}
              Sender: ${thread.participants[0]?.name || 'Unknown'}
              Summary: ${thread.aiSummary || thread.summary || 'No content provided'}
              
              Generate a ${style} reply.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || this.generateMockReply(thread, style);

        } catch (error) {
            console.error('Failed to generate AI reply:', error);
            // Fallback to mock if API fails
            return this.generateMockReply(thread, style);
        }
    }

    /**
     * Mock reply generation for development/demo purposes
     * Added variance to support regeneration feature verification
     */
    private async generateMockReply(thread: Thread, style: ReplyStyle): Promise<string> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const senderName = thread.participants[0]?.name?.split(' ')[0] || 'there';
        const propertyRef = thread.propertyAddress ? ` regarding ${thread.propertyAddress}` : '';

        // Add some random variation to verify regeneration works
        const variations = [
            "I've received your email",
            "Thanks for the email",
            "Regarding your message",
            "I wanted to acknowledge your email"
        ];
        const randomVariation = variations[Math.floor(Math.random() * variations.length)];

        switch (style) {
            case 'Professional':
                return `Dear ${senderName},\n\nThank you for your correspondence${propertyRef}. ${randomVariation}. I will review the requisite details and respond formally by end of day.\n\nSincerely,`;

            case 'Casual':
                return `Hey ${senderName},\n\nThanks for reaching out${propertyRef}! ${randomVariation}. I haven't had a chance to look yet but I'll get back to you soon.\n\nCheers,`;

            case 'Friendly':
            default:
                return `Hi ${senderName},\n\nThanks for getting in touch${propertyRef}. ${randomVariation}. I'd be happy to help you with this! Let me check the details and I'll get back to you somewhat shortly.\n\nBest,`;
        }
    }
}

export const aiReplyService = new AiReplyService();
