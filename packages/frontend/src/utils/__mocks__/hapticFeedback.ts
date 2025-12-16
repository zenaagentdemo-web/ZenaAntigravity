import { vi } from 'vitest';

export const hapticFeedback = {
  light: vi.fn(),
  medium: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
};