/**
 * List available Gemini models
 */

import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function listModels() {
    console.log('[List] Fetching available models...');
    console.log('[List] API Key:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');

    try {
        // Try to list models using the models.list endpoint
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        );
        const data = await response.json();

        console.log('\n[List] Available models:');
        if (data.models) {
            for (const model of data.models) {
                if (model.name.includes('live') || model.name.includes('gemini-2') || model.supportedGenerationMethods?.includes('bidiGenerateContent')) {
                    console.log(`  - ${model.name}`);
                    console.log(`    Display: ${model.displayName}`);
                    console.log(`    Methods: ${model.supportedGenerationMethods?.join(', ')}`);
                    console.log('');
                }
            }
        } else {
            console.log('No models found or error:', data);
        }
    } catch (error: any) {
        console.error('[List] Error:', error?.message || error);
    }
}

listModels();
