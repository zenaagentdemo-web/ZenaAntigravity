import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IndexedDB
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  readyState: 'done',
  transaction: null,
  source: null,
};

// Create mocks without circular references first
const mockIDBTransaction = {
  db: null, // Will be set later
  durability: 'default',
  mode: 'readonly',
  objectStoreNames: [],
  abort: vi.fn(),
  commit: vi.fn(),
  objectStore: vi.fn(),
  onabort: null,
  oncomplete: null,
  onerror: null,
};

const mockIDBObjectStore = {
  name: 'test-store',
  keyPath: null,
  indexNames: [],
  transaction: mockIDBTransaction,
  add: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  clear: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  count: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  createIndex: vi.fn(),
  delete: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  deleteIndex: vi.fn(),
  get: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  getAll: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  getAllKeys: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  getKey: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  index: vi.fn(),
  openCursor: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  openKeyCursor: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  put: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
};

const mockIDBDatabase = {
  name: 'test-db',
  version: 1,
  objectStoreNames: [],
  transaction: vi.fn(() => mockIDBTransaction),
  createObjectStore: vi.fn(() => mockIDBObjectStore),
  deleteObjectStore: vi.fn(),
  close: vi.fn(),
  onabort: null,
  onclose: null,
  onerror: null,
  onversionchange: null,
};

// Set up circular references after all objects are created
mockIDBTransaction.db = mockIDBDatabase;
mockIDBTransaction.objectStore = vi.fn(() => mockIDBObjectStore);

const mockIndexedDB = {
  open: vi.fn(() => {
    const request = { ...mockIDBRequest };
    // Simulate successful database opening
    setTimeout(() => {
      request.result = mockIDBDatabase;
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }),
  deleteDatabase: vi.fn(() => ({ ...mockIDBRequest, onsuccess: null, onerror: null })),
  databases: vi.fn(() => Promise.resolve([])),
  cmp: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Also define it globally for Node.js environment
global.indexedDB = mockIndexedDB;
