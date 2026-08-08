import type { HeicConverterApi } from '../shared/api';

declare global {
  interface Window {
    heicConverter?: HeicConverterApi;
  }
}

export {};
