// Global type fixes for TypeScript errors

// Fix for relayer service indexing errors
declare global {
  interface Window {
    smartAccountClients: {
      [key: string]: any;
    };
    pimlicoClients: {
      [key: number]: any;
    };
    providers: {
      [key: number]: any;
    };
  }

  var smartAccountClients: {
    [key: string]: any;
  };
  var pimlicoClients: {
    [key: number]: any;
  };
  var providers: {
    [key: number]: any;
  };
}

// Fix for error handling in catch blocks
declare global {
  interface Error {
    status?: number;
    code?: string;
  }
}

export {};
