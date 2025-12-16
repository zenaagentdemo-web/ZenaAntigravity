import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { OAuthService } from './oauth.service.js';

describe('OAuth Service', () => {
  let oauthService: OAuthService;

  beforeEach(() => {
    oauthService = new OAuthService();
  });

  describe('Unit Tests', () => {
    it('should generate authorization URL for Gmail', () => {
      const url = oauthService.getAuthorizationUrl('gmail', 'test-state');
      expect(url).toContain('accounts.google.com');
      expect(url).toContain('state=test-state');
      expect(url).toContain('client_id=');
    });

    it('should generate authorization URL for Microsoft', () => {
      const url = oauthService.getAuthorizationUrl('microsoft', 'test-state');
      expect(url).toContain('login.microsoftonline.com');
      expect(url).toContain('state=test-state');
      expect(url).toContain('client_id=');
    });

    it('should throw error for unsupported provider', () => {
      expect(() => {
        oauthService.getAuthorizationUrl('unsupported', 'test-state');
      }).toThrow('Unsupported provider');
    });

    it('should validate supported providers', () => {
      expect(oauthService.isProviderSupported('gmail')).toBe(true);
      expect(oauthService.isProviderSupported('microsoft')).toBe(true);
      expect(oauthService.isProviderSupported('invalid')).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: zena-ai-real-estate-pwa, Property 82: OAuth token scope validation
     * 
     * For any email or calendar data access, the system should use OAuth tokens 
     * with appropriate scopes and expiration.
     * 
     * This property validates that:
     * 1. OAuth authorization URLs always include required scopes
     * 2. Scopes are appropriate for the provider (email read/write/send)
     * 3. Authorization URLs include necessary parameters for token expiration
     */
    it('Property 82: OAuth authorization URLs should always include appropriate scopes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('gmail', 'microsoft'),
          fc.string({ minLength: 1, maxLength: 100 }),
          (provider, state) => {
            // Generate authorization URL
            const authUrl = oauthService.getAuthorizationUrl(provider, state);

            // Parse URL to check parameters
            const url = new URL(authUrl);
            const scope = url.searchParams.get('scope');

            // Verify scope parameter exists
            expect(scope).toBeTruthy();

            if (provider === 'gmail') {
              // Gmail should have email read, send, and modify scopes
              expect(scope).toContain('gmail.readonly');
              expect(scope).toContain('gmail.send');
              expect(scope).toContain('gmail.modify');
              expect(scope).toContain('userinfo.email');
            } else if (provider === 'microsoft') {
              // Microsoft should have Mail read/write and send scopes
              expect(scope).toContain('Mail.ReadWrite');
              expect(scope).toContain('Mail.Send');
              expect(scope).toContain('User.Read');
              expect(scope).toContain('offline_access'); // For refresh tokens
            }

            // Verify access_type for refresh tokens (Gmail)
            if (provider === 'gmail') {
              expect(url.searchParams.get('access_type')).toBe('offline');
              expect(url.searchParams.get('prompt')).toBe('consent');
            }

            // Verify required OAuth parameters
            expect(url.searchParams.get('client_id')).toBeTruthy();
            expect(url.searchParams.get('redirect_uri')).toBeTruthy();
            expect(url.searchParams.get('response_type')).toBe('code');
            expect(url.searchParams.get('state')).toBe(state);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: zena-ai-real-estate-pwa, Property 82: OAuth token scope validation
     * 
     * Validates that state parameters are properly generated and included
     * for CSRF protection.
     */
    it('Property 82: OAuth URLs should include state parameter for CSRF protection', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('gmail', 'microsoft'),
          (provider) => {
            // Generate URL without explicit state
            const authUrl = oauthService.getAuthorizationUrl(provider);

            // Parse URL
            const url = new URL(authUrl);
            const state = url.searchParams.get('state');

            // State should be generated automatically
            expect(state).toBeTruthy();
            expect(state!.length).toBeGreaterThan(0);

            // State should be a hex string (from crypto.randomBytes)
            expect(state).toMatch(/^[0-9a-f]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: zena-ai-real-estate-pwa, Property 82: OAuth token scope validation
     * 
     * Validates that provider validation works correctly for all inputs.
     */
    it('Property 82: Provider validation should correctly identify supported providers', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (provider) => {
            const isSupported = oauthService.isProviderSupported(provider);

            if (provider === 'gmail' || provider === 'microsoft') {
              expect(isSupported).toBe(true);
            } else {
              expect(isSupported).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: zena-ai-real-estate-pwa, Property 82: OAuth token scope validation
     * 
     * Validates that unsupported providers always throw errors consistently.
     */
    it('Property 82: Unsupported providers should always throw errors', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s !== 'gmail' && s !== 'microsoft'),
          fc.string(),
          (provider, state) => {
            expect(() => {
              oauthService.getAuthorizationUrl(provider, state);
            }).toThrow('Unsupported provider');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
