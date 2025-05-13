// Define global types for the application

// Define Record types for collections
interface SmartAccountClientCollection {
  [key: string]: any;
}

interface PimlicoClientCollection {
  [key: number]: any;
}

interface ProviderCollection {
  [key: number]: any;
}

// Add to global namespace
declare global {
  var smartAccountClients: SmartAccountClientCollection;
  var pimlicoClients: PimlicoClientCollection;
  var providers: ProviderCollection;
}

export {};
