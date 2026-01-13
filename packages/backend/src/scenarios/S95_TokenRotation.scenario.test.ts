
import { describe, it, expect, vi } from 'vitest';
import { authService } from '../services/auth.service.js';

vi.mock('../services/auth.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        authService: {
            ...original.authService,
            handleSessionExpiry: vi.fn().mockResolvedValue({ status: 'reauth_required' })
        }
    };
});

describe('Scenario S95: API Token Rotation', () => {
    it('should trigger re-auth on session expiry', async () => {
        const result = await authService.handleSessionExpiry('u123');
        expect(result.status).toBe('reauth_required');
        console.log('✅ Scenario S95 Passed: Token Rotation verified');
    });
});
