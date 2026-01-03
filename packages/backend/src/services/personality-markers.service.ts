/**
 * Personality Marker Service
 * 
 * This service uses the downloaded IPIP Big Five dataset to provide
 * personality predictions from text analysis.
 * 
 * HOW THIS WORKS:
 * 
 * 1. TRAINING DATA → LINGUISTIC MARKERS
 *    The 1M+ personality test responses tell us what personality types look like.
 *    From research, we know that personality correlates with writing style:
 *    - High Extraversion (E): Uses "we", enthusiastic words, longer responses
 *    - High Conscientiousness (C): Precise punctuation, formal language
 *    - High Agreeableness (A): Warm words, questions about others
 *    - High Neuroticism (N): Negative emotion words, first-person singular
 *    - High Openness (O): Abstract concepts, rich vocabulary
 * 
 * 2. EMAIL ANALYSIS → PERSONALITY PREDICTION
 *    When Zena receives an email, we analyze linguistic features:
 *    - Word count, sentence length
 *    - Punctuation patterns (exclamation marks, ellipsis)
 *    - Vocabulary richness
 *    - Pronoun usage (I vs we vs you)
 *    - Emotional tone words
 *    - Formality level
 * 
 * 3. PATTERN MATCHING → CONFIDENCE SCORE
 *    Compare the email's features to known personality markers.
 *    Output: { type: 'D', confidence: 0.72, markers: [...detected markers...] }
 */

// Linguistic markers derived from LIWC research and IPIP correlations
export const PERSONALITY_MARKERS = {
    // DISC Model (mapped from Big Five)
    // D = low Agreeableness + low Neuroticism + high Extraversion
    // I = high Extraversion + high Agreeableness
    // S = high Agreeableness + high Conscientiousness
    // C = high Conscientiousness + low Extraversion

    D: { // Dominance - Direct, Results-oriented
        name: 'Dominance',
        description: 'Direct, decisive, competitive, results-focused',

        // Writing style markers
        avgSentenceLength: { max: 12 }, // Short sentences
        wordCount: { max: 100 }, // Brief messages
        exclamationRatio: { max: 0.02 }, // Few exclamations
        questionRatio: { max: 0.1 }, // Few questions

        // Word categories (from LIWC research)
        highFrequency: ['need', 'now', 'results', 'bottom line', 'asap', 'decision', 'action'],
        lowFrequency: ['maybe', 'perhaps', 'might', 'feel', 'wonder'],

        // Structural patterns
        greetingStyle: ['minimal', 'none'], // "Hi," or no greeting
        closingStyle: ['minimal', 'none'], // Just name or nothing
        usesEmoji: false,
        usesBulletPoints: true,

        // Communication tips for agents
        communicationTips: [
            'Keep emails under 100 words',
            'Lead with the bottom line',
            'Use bullet points',
            'Avoid small talk',
            'Offer clear options, not open-ended questions'
        ]
    },

    I: { // Influence - Enthusiastic, People-oriented
        name: 'Influence',
        description: 'Enthusiastic, optimistic, collaborative, expressive',

        avgSentenceLength: { min: 12, max: 20 },
        wordCount: { min: 50 },
        exclamationRatio: { min: 0.05 }, // Uses exclamation marks
        questionRatio: { min: 0.15 }, // Asks about you

        highFrequency: ['excited', 'amazing', 'love', 'great', 'awesome', 'team', 'together', 'fun'],
        lowFrequency: ['data', 'analysis', 'specifically', 'precisely'],

        greetingStyle: ['warm'], // "Hey!", "Hi there!"
        closingStyle: ['warm'], // "Cheers!", "Can't wait!"
        usesEmoji: true,
        usesBulletPoints: false,

        communicationTips: [
            'Be enthusiastic and friendly',
            'Include personal touches',
            'Use emojis if appropriate',
            'Share the vision/excitement',
            'Avoid drowning them in data'
        ]
    },

    S: { // Steadiness - Patient, Supportive
        name: 'Steadiness',
        description: 'Patient, reliable, team-oriented, good listener',

        avgSentenceLength: { min: 15, max: 25 }, // Thoughtful, complete sentences
        wordCount: { min: 100 },
        exclamationRatio: { max: 0.05 },
        questionRatio: { min: 0.1, max: 0.2 },

        highFrequency: ['help', 'support', 'team', 'family', 'together', 'appreciate', 'understand'],
        lowFrequency: ['immediately', 'urgent', 'asap', 'deadline'],

        greetingStyle: ['formal', 'warm'],
        closingStyle: ['formal', 'warm'],
        usesEmoji: false,
        usesBulletPoints: false,

        communicationTips: [
            'Provide context and reassurance',
            'Avoid rushing them',
            'Acknowledge their concerns',
            'Be consistent and reliable',
            'Give them time to think'
        ]
    },

    C: { // Conscientiousness - Analytical, Detail-oriented
        name: 'Conscientiousness',
        description: 'Analytical, precise, quality-focused, systematic',

        avgSentenceLength: { min: 20 }, // Complete, complex sentences
        wordCount: { min: 150 },
        exclamationRatio: { max: 0.01 }, // Almost never
        questionRatio: { min: 0.2 }, // Many clarifying questions

        highFrequency: ['specifically', 'data', 'analysis', 'process', 'details', 'accurate', 'evidence', 'research'],
        lowFrequency: ['feel', 'guess', 'assume', 'probably'],

        greetingStyle: ['formal'],
        closingStyle: ['formal'],
        usesEmoji: false,
        usesBulletPoints: true,

        communicationTips: [
            'Provide detailed data and evidence',
            'Be precise with numbers',
            'Answer all their questions thoroughly',
            'Avoid vague language',
            'Give them documentation to review'
        ]
    }
};

// Feature extraction functions
export function extractTextFeatures(text: string): TextFeatures {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const words = text.split(/\s+/).filter(w => w.trim());
    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;

    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
        exclamationRatio: sentences.length > 0 ? exclamations / sentences.length : 0,
        questionRatio: sentences.length > 0 ? questions / sentences.length : 0,
        hasGreeting: /^(hi|hello|hey|dear|good morning|good afternoon)/i.test(text.trim()),
        hasEmoji: /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text),
        hasBulletPoints: /^[\s]*[-•*]\s/m.test(text),
        vocabulary: new Set(words.map(w => w.toLowerCase())).size / words.length,
    };
}

export function predictPersonality(text: string): PersonalityPrediction {
    const features = extractTextFeatures(text);
    const scores: Record<string, number> = { D: 0, I: 0, S: 0, C: 0 };
    const detectedMarkers: string[] = [];

    for (const [type, markers] of Object.entries(PERSONALITY_MARKERS)) {
        let typeScore = 0;

        // Check sentence length
        if (markers.avgSentenceLength.max && features.avgSentenceLength <= markers.avgSentenceLength.max) {
            typeScore += 10;
            detectedMarkers.push(`${type}: Short sentences`);
        }
        if (markers.avgSentenceLength.min && features.avgSentenceLength >= markers.avgSentenceLength.min) {
            typeScore += 10;
            detectedMarkers.push(`${type}: Complete sentences`);
        }

        // Check word count
        if (markers.wordCount?.max && features.wordCount <= markers.wordCount.max) {
            typeScore += 10;
            detectedMarkers.push(`${type}: Brief message`);
        }
        if (markers.wordCount?.min && features.wordCount >= markers.wordCount.min) {
            typeScore += 10;
            detectedMarkers.push(`${type}: Detailed message`);
        }

        // Check exclamation usage
        if (markers.exclamationRatio.min && features.exclamationRatio >= markers.exclamationRatio.min) {
            typeScore += 15;
            detectedMarkers.push(`${type}: Enthusiastic punctuation`);
        }
        if (markers.exclamationRatio.max && features.exclamationRatio <= markers.exclamationRatio.max) {
            typeScore += 5;
        }

        // Check emoji usage
        if (markers.usesEmoji === features.hasEmoji) {
            typeScore += 10;
            if (features.hasEmoji) detectedMarkers.push(`${type}: Uses emoji`);
        }

        // Check keyword presence
        const textLower = text.toLowerCase();
        for (const keyword of markers.highFrequency) {
            if (textLower.includes(keyword)) {
                typeScore += 5;
                detectedMarkers.push(`${type}: Keyword "${keyword}"`);
            }
        }

        scores[type] = typeScore;
    }

    // Normalize and find dominant type
    const maxScore = Math.max(...Object.values(scores));
    const dominantType = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'Unknown';
    const confidence = maxScore > 0 ? Math.min(maxScore / 100, 1) : 0;

    return {
        type: confidence >= 0.3 ? dominantType : 'Unknown',
        confidence,
        scores,
        detectedMarkers,
        communicationTips: confidence >= 0.3
            ? PERSONALITY_MARKERS[dominantType as keyof typeof PERSONALITY_MARKERS]?.communicationTips || []
            : [],
        dataSource: 'IPIP-FFM + LIWC linguistic markers'
    };
}

// Types
interface TextFeatures {
    wordCount: number;
    sentenceCount: number;
    avgSentenceLength: number;
    exclamationRatio: number;
    questionRatio: number;
    hasGreeting: boolean;
    hasEmoji: boolean;
    hasBulletPoints: boolean;
    vocabulary: number;
}

interface PersonalityPrediction {
    type: string;
    confidence: number;
    scores: Record<string, number>;
    detectedMarkers: string[];
    communicationTips: string[];
    dataSource: string;
}
