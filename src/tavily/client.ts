import { logCrawlBedrockQuery, logSearchBedrockQuery } from '../utils/analytics';
import type { CrawlParameters, SearchParameters, CrawlBedrockEventData, SearchBedrockEventData } from './types';

/**
 * Get the base URL for API calls
 */
const getApiBaseUrl = () => {
  // Always use the Sable API
  return 'https://sable-smart-links.vercel.app';
};

/**
 * Get optimal crawl parameters for a given URL and instructions
 * @param url - The URL to crawl
 * @param instructions - Instructions for the crawl
 * @returns Promise with crawl parameters and explanation
 */
export const getOptimalCrawlParameters = async (
  url: string,
  instructions: string
): Promise<CrawlParameters> => {
  const startTime = Date.now();
  let duration: number;
  let output: CrawlParameters | null = null;

  try {
    const apiUrl = `${getApiBaseUrl()}/api/tavily/crawl`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url, instructions })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Sable API endpoint not found. Please check the API URL configuration.');
      }

      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }

    // Transform the response to match the expected format
    const crawlParams: CrawlParameters = {
      extractDepth: result.data.crawlParams.extractDepth,
      categories: result.data.crawlParams.categories,
      explanation: result.data.explanation,
      otherCrawls: result.data.otherCrawls
    };

    output = crawlParams;
    duration = Date.now() - startTime;

    return crawlParams;

  } catch (error) {
    duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    throw error;
  }
};

/**
 * Get optimal search parameters for a given query
 * @param query - The search query
 * @returns Promise with search parameters and explanation
 */
export const getOptimalSearchParameters = async (
  query: string
): Promise<SearchParameters> => {
  const startTime = Date.now();
  let duration: number;
  let output: SearchParameters | null = null;

  try {
    const apiUrl = `${getApiBaseUrl()}/api/tavily/search`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Sable API endpoint not found. Please check the API URL configuration.');
      }

      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }

    // Transform the response to match the expected format
    const searchParams: SearchParameters = {
      searchTopic: result.data.searchParams.searchTopic,
      searchDepth: result.data.searchParams.searchDepth,
      timeRange: result.data.searchParams.timeRange,
      includeAnswer: result.data.searchParams.includeAnswer,
      explanation: result.data.explanation,
      otherQueries: result.data.otherQueries
    };

    output = searchParams;
    duration = Date.now() - startTime;

    return searchParams;

  } catch (error) {
    duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    throw error;
  }
}; 