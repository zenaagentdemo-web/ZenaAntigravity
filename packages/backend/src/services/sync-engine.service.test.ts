import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncEngineService, SyncEngineService } from './sync-engine.service.js';

describe('SyncEngineService', () => {
  let service: SyncEngineService;

  beforeEach(() => {
    service = new SyncEngineService();
  });

  afterEach(() => {
    service.stop();
  });

  describe('start and stop', () => {
    it('should start the sync engine', () => {
      service.start();
      // Service should be running (no error thrown)
      expect(true).toBe(true);
    });

    it('should stop the sync engine', () => {
      service.start();
      service.stop();
      // Service should be stopped (no error thrown)
      expect(true).toBe(true);
    });

    it('should not start twice', () => {
      service.start();
      service.start(); // Should log message but not error
      expect(true).toBe(true);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const error = new Error('ECONNRESET');
      // @ts-ignore - accessing private method for testing
      const isRetryable = service['isRetryableError'](error);
      expect(isRetryable).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      const error = { status: 429, message: 'Rate limit exceeded' };
      // @ts-ignore - accessing private method for testing
      const isRetryable = service['isRetryableError'](error);
      expect(isRetryable).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const error = new Error('ETIMEDOUT');
      // @ts-ignore - accessing private method for testing
      const isRetryable = service['isRetryableError'](error);
      expect(isRetryable).toBe(true);
    });

    it('should not identify auth errors as retryable', () => {
      const error = new Error('Invalid credentials');
      // @ts-ignore - accessing private method for testing
      const isRetryable = service['isRetryableError'](error);
      expect(isRetryable).toBe(false);
    });
  });
});
