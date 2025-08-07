// Re-export types from the types module
export type { CrawlParameters, SearchParameters, CrawlBedrockEventData, SearchBedrockEventData } from './types';

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