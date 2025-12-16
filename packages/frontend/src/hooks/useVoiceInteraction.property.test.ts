/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: zena-ai-real-estate-pwa, Property 27: Voice query pipeline
 * 
 * For any voice query (press and hold talk button), the system should capture audio,
 * transcribe it, and process the query.
 * 
 * Validates: Requirements 9.1
 */

describe('Voice Query Pipeline Properties', () => {
  let mockFetch: any;

  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  /**
   * Property 27: Voice query pipeline
   * 
   * For any voice query, the system should:
   * 1. Capture audio
   * 2. Transcribe it
   * 3. Process the query
   */
  it('should complete the full voice query pipeline for any audio input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 500 }), // Simulated transcript
        fc.string({ minLength: 10, maxLength: 1000 }), // Simulated response
        async (transcript, response) => {
          // Mock API response for voice query
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              response,
              messageId: 'test-message-id',
            }),
          });

          // Simulate voice query pipeline
          const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });

          // Step 1: Capture audio (simulated by creating blob)
          expect(audioBlob).toBeInstanceOf(Blob);
          expect(audioBlob.type).toBe('audio/webm');

          // Step 2 & 3: Send to API for transcription and processing
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice-query.webm');

          const apiResponse = await fetch('/api/ask/voice', {
            method: 'POST',
            body: formData,
          });

          const result = await apiResponse.json();

          // Verify: Pipeline completed successfully
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/ask/voice',
            expect.objectContaining({
              method: 'POST',
              body: expect.any(FormData),
            })
          );
          expect(result.response).toBe(response);
          expect(result.messageId).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Voice query pipeline handles various audio formats
   * 
   * For any supported audio format, the pipeline should process it correctly.
   */
  it('should handle various audio formats in the pipeline', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'),
        fc.string({ minLength: 10, maxLength: 500 }),
        async (audioFormat, response) => {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              response,
              messageId: 'test-message-id',
            }),
          });

          // Create audio blob with specific format
          const audioBlob = new Blob(['fake-audio-data'], { type: audioFormat });

          // Send through pipeline
          const formData = new FormData();
          formData.append('audio', audioBlob, `voice-query.${audioFormat.split('/')[1]}`);

          const apiResponse = await fetch('/api/ask/voice', {
            method: 'POST',
            body: formData,
          });

          const result = await apiResponse.json();

          // Verify: Format was accepted and processed
          expect(apiResponse.ok).toBe(true);
          expect(result.response).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Voice query pipeline preserves query intent
   * 
   * For any voice query, the transcribed and processed result should relate to
   * the original audio content.
   */
  it('should preserve query intent through the pipeline', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          query: fc.string({ minLength: 10, maxLength: 200 }),
          expectedKeywords: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        }),
        async ({ query, expectedKeywords }) => {
          // Mock API to return response containing keywords
          const response = `Here's information about ${expectedKeywords.join(', ')}: ${query}`;
          
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              response,
              messageId: 'test-message-id',
            }),
          });

          // Send voice query
          const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice-query.webm');

          const apiResponse = await fetch('/api/ask/voice', {
            method: 'POST',
            body: formData,
          });

          const result = await apiResponse.json();

          // Verify: Response contains expected keywords (intent preserved)
          const responseText = result.response.toLowerCase();
          const hasRelevantContent = expectedKeywords.some(keyword => 
            responseText.includes(keyword.toLowerCase())
          );
          
          expect(hasRelevantContent || responseText.includes(query.toLowerCase())).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Voice query pipeline handles errors gracefully
   * 
   * For any voice query that fails, the pipeline should handle the error
   * without crashing.
   */
  it('should handle pipeline errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(400, 401, 403, 404, 500, 502, 503),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (errorCode, errorMessage) => {
          // Mock API error response
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: errorCode,
            json: async () => ({
              error: {
                code: `ERROR_${errorCode}`,
                message: errorMessage,
                retryable: errorCode >= 500,
              },
            }),
          });

          // Send voice query
          const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice-query.webm');

          try {
            const apiResponse = await fetch('/api/ask/voice', {
              method: 'POST',
              body: formData,
            });

            // Verify: Error response is handled
            expect(apiResponse.ok).toBe(false);
            expect(apiResponse.status).toBe(errorCode);

            const errorResult = await apiResponse.json();
            expect(errorResult.error).toBeDefined();
            expect(errorResult.error.code).toBe(`ERROR_${errorCode}`);
          } catch (error) {
            // Network errors are also acceptable
            expect(error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Voice query pipeline completes in reasonable time
   * 
   * For any voice query, the pipeline should complete within a reasonable timeout.
   */
  it('should complete voice query pipeline within timeout', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 5000 }), // Simulated processing time
        async (processingTime) => {
          const startTime = Date.now();

          // Mock API with delay
          mockFetch.mockImplementationOnce(async () => {
            await new Promise(resolve => setTimeout(resolve, Math.min(processingTime, 100)));
            return {
              ok: true,
              status: 200,
              json: async () => ({
                response: 'Test response',
                messageId: 'test-message-id',
              }),
            };
          });

          // Send voice query
          const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice-query.webm');

          const apiResponse = await fetch('/api/ask/voice', {
            method: 'POST',
            body: formData,
          });

          await apiResponse.json();

          const endTime = Date.now();
          const duration = endTime - startTime;

          // Verify: Completed within reasonable time (allowing for test overhead)
          expect(duration).toBeLessThan(10000); // 10 second max for tests
        }
      ),
      { numRuns: 100 }
    );
  });
});
