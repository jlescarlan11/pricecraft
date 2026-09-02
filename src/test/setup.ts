import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Node 24 exposes an opt-in global localStorage that is unusable without a
// backing file. Install a deterministic Storage implementation for tests.
const localStore = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return localStore.size;
  },
  clear: () => localStore.clear(),
  getItem: (key) => localStore.get(key) ?? null,
  key: (index) => Array.from(localStore.keys())[index] ?? null,
  removeItem: (key) => {
    localStore.delete(key);
  },
  setItem: (key, value) => {
    localStore.set(key, String(value));
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(() => {
  cleanup();
  localStorageMock.clear();
});
