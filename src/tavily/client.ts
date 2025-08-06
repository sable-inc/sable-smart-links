import { logCrawlBedrockQuery, logSearchBedrockQuery } from '../utils/analytics.js';

// Types for the function parameters and return values
export interface CrawlParameters {
  extractDepth: "basic" | "advanced";
  categories: ("Documentation" | "Blogs" | "Community" | "About" | "Contact" | "Pricing" | "Enterprise" | "Careers" | "E-Commerce" | "Media" | "People")[];
  explanation: string;
  otherCrawls: {url: string, instructions: string}[];
}

export interface SearchParameters {
  searchTopic: "general" | "news" | "finance";
  searchDepth: "basic" | "advanced";
  timeRange: "none" | "day" | "week" | "month" | "year";
  includeAnswer: "none" | "basic" | "advanced";
  explanation: string;
  otherQueries: string[];
}

/**
 * Get the base URL for API calls
 */
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side, use environment variable or default
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  }
  
  // Client-side, use current origin
  return window.location.origin;
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
  let error: string | null = null;
  
  try {
    const apiUrl = `${getApiBaseUrl()}/api/sable/crawl`;
    
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
        throw new Error('Sable API endpoints not configured. Please set up the API handler using createSableTavilyHandler in your pages/api/sable/[...path].ts file.');
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
    
    // Log successful analytics
    await logCrawlBedrockQuery({
      url,
      instructions,
      output,
      duration,
      error: null
    });
    
    return crawlParams;
    
  } catch (error) {
    duration = Date.now() - startTime;
    error = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[SableTavilyClient] Error in getOptimalCrawlParameters:', error);
    
    // Log error analytics
    await logCrawlBedrockQuery({
      url,
      instructions,
      output: null,
      duration,
      error
    });
    
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
  let error: string | null = null;
  
  try {
    const apiUrl = `${getApiBaseUrl()}/api/sable/search`;
    
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
        throw new Error('Sable API endpoints not configured. Please set up the API handler using createSableTavilyHandler in your pages/api/sable/[...path].ts file.');
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
    
    // Log successful analytics
    await logSearchBedrockQuery({
      query,
      output,
      duration,
      error: null
    });
    
    return searchParams;
    
  } catch (error) {
    duration = Date.now() - startTime;
    error = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[SableTavilyClient] Error in getOptimalSearchParameters:', error);
    
    // Log error analytics
    await logSearchBedrockQuery({
      query,
      output: null,
      duration,
      error
    });
    
    throw error;
  }
}; 