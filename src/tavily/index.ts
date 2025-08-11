// Re-export types from the types module
export type { CrawlParameters, SearchParameters, CrawlBedrockEventData, SearchBedrockEventData } from './types';

// Re-export client-side functions (these are the main exports for client usage)
export {
  getOptimalCrawlParameters,
  getOptimalSearchParameters
} from './client.js';

// Export the sableConfig for easy integration
export { sableConfig } from './config';

// For backward compatibility, export the client functions as the default exports
export { getOptimalCrawlParameters as default } from './client.js'; 