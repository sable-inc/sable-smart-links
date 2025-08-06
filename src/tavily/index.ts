// Re-export types from both server and client modules
export type { CrawlParameters, SearchParameters } from './server.js';

// Re-export server-side functions and handler
export { 
  getOptimalCrawlParameters as getOptimalCrawlParametersServer,
  getOptimalSearchParameters as getOptimalSearchParametersServer,
  createSableTavilyHandler
} from './server.js';

// Re-export client-side functions (these are the main exports for client usage)
export { 
  getOptimalCrawlParameters,
  getOptimalSearchParameters
} from './client.js';

// For backward compatibility, export the client functions as the default exports
export { getOptimalCrawlParameters as default } from './client.js'; 