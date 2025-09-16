// Global type declarations

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'set' | 'event' | 'consent' | 'get',
      targetId: string | Date,
      config?: {
        [key: string]: any;
        description?: string;
        fatal?: boolean;
        custom_map?: Record<string, string>;
      }
    ) => void;
  }
}

export {};