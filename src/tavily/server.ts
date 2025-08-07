import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { logCrawlBedrockQuery, logSearchBedrockQuery } from '../utils/analytics';
import type { CrawlParameters, SearchParameters, CrawlBedrockEventData, SearchBedrockEventData } from './types';
import type { NextApiRequest, NextApiResponse } from 'next';

interface ApiKeysResponse {
  data: {
    internalKeys: {
      bedrock: string;
    };
  };
}

/**
 * Fetch Bedrock API key from the API endpoint using sableApiKey
 * @param sableApiKey - The Sable API key to use for authentication
 * @returns Promise with the Bedrock API key
 */
const fetchBedrockApiKey = async (sableApiKey: string): Promise<string> => {
  if (!sableApiKey) {
    throw new Error('Sable API key is required');
  }

  // Use localhost in development, Vercel deployment in production
  const apiUrl = `https://sable-smart-links.vercel.app/api/keys/${sableApiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (textError) {
        throw new Error(`Failed to fetch API keys: ${response.status} ${response.statusText}\nResponse body unreadable: ${textError}`);
      }
      throw new Error(`Failed to fetch API keys: ${response.status} ${response.statusText}\nResponse body: ${errorBody}`);
    }

    const data: ApiKeysResponse = await response.json();

    if (!data.data?.internalKeys?.bedrock) {
      throw new Error('Bedrock API key not found in response');
    }

    return data.data.internalKeys.bedrock;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Bedrock API key: ${error.message}`);
    }
    throw new Error('Failed to fetch Bedrock API key: Unknown error');
  }
};

/**
 * Get optimal crawl parameters for a given URL and instructions using AWS Bedrock
 * @param url - The URL to crawl
 * @param instructions - Instructions for the crawl
 * @param sableApiKey - Sable API key to fetch Bedrock credentials
 * @returns Promise with crawl parameters and explanation
 */
export const getOptimalCrawlParameters = async (
  url: string,
  instructions: string,
  sableApiKey: string
): Promise<CrawlParameters> => {
  const startTime = Date.now();
  let duration: number;
  let outputs: CrawlParameters | null = null;
  let error: string | null = null;

  try {
    const bedrockApiKey = await fetchBedrockApiKey(sableApiKey);

    const [accessKeyId, secretAccessKey] = bedrockApiKey.split(':');
    if (!accessKeyId || !secretAccessKey) throw new Error('API key must be in ACCESS_KEY:SECRET_KEY format');

    const client = new BedrockRuntimeClient({
      region: "us-east-1",
      credentials: { accessKeyId, secretAccessKey }
    });

    const systemPrompt = `You are an expert at optimizing Tavily crawl parameters based on best practices from Tavily's documentation. 
    Given a crawl query, suggest the best parameters and provide an explanation of your choices. 

    You MUST ONLY respond with a JSON object in this exact format, with no extra text or explanation. For categories and extractDepth, ONLY use the enumerated options:
    {
      "extractDepth": "basic"|"advanced",
      "categories": ("Documentation"|"Blogs"|"Community"|"About"|"Contact"|"Pricing"|"Enterprise"|"Careers"|"E-Commerce"|"Media"|"People")[];
      "explanation": string,
      "otherCrawls": string[]
    }

    The "explanation" PARAMETER should only discuss the parameters (NOT the URL/instructions themselves or suggested crawls) in the following format: 
    - The explanation will have some markdown.
    - Start with 'I've set the following parameters:<br>', then enumerate each choice made with an EXTREMELY CONCISE THREE WORD rationale in a conversational style (ex. '**Extract Depth is advanced** — Deep content analysis needed.<br> **Categories include Documentation** — Technical content focus.<br>'). 

    The "otherCrawls" PARAMETER should provide up to 3 simple instructions for other crawls from the SAME URL. Each instruction should be a clear, concise statement of what the user plans to do (e.g. "Get all pages on developer documentation", "Extract all product pricing information", "Crawl all blog posts and articles"). Focus on different content types, sections, or use cases that would be valuable to crawl from the same source URL.

    BEST PRACTICES TO FOLLOW:
    - Start with limited depth (1-2 levels) and increase only if necessary
    - Use "basic" extractDepth for simple content, "advanced" for complex analysis
    - Choose appropriate categories based on content type
    - Consider performance vs. coverage trade-offs
    - Focus on specific paths when possible rather than broad crawling
    - Use "advanced" extractDepth for RAG systems, semantic search, or comprehensive analysis
    - Use "basic" extractDepth for simple content extraction or when performance is critical
    `;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-v2:1',
      contentType: 'application/json',
      accept: '*/*',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        prompt: `${systemPrompt}\n\nHuman: Suggest optimal Tavily crawl parameters for this URL: "${url}" and instructions: "${instructions}"\n\nAssistant:`,
        max_tokens_to_sample: 300,
        temperature: 0.5,
        top_k: 250,
        top_p: 1,
        stop_sequences: ['\n\nHuman:'],
      })
    });

    const response = await client.send(command);
    const raw = await new Response(response.body!).text();

    // Extract the completion part from the response
    const completionMatch = /"completion":"(.*?)","stop_reason"/.exec(raw);
    if (!completionMatch) throw new Error('Failed to extract completion from response');

    // Get the completion content and parse it as JSON
    const completionContent = completionMatch[1]
      .replace(/\\n/g, '')  // Remove newlines
      .replace(/\\\"/g, '"') // Replace escaped quotes
      .replace(/\\\\/g, '\\'); // Replace escaped backslashes

    // Improved: Find the JSON object within the completion (robust to multiline/extra text)
    const jsonMatch = completionContent.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON from completion');

    const result = JSON.parse(jsonMatch[0]) as CrawlParameters;
    outputs = result;
    duration = Date.now() - startTime;

    // Log successful analytics
    await logCrawlBedrockQuery({
      url,
      instructions,
      output: outputs,
      duration,
      error: null
    });

    return result;

  } catch (error) {
    duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error analytics
    await logCrawlBedrockQuery({
      url,
      instructions,
      output: null,
      duration,
      error: errorMessage
    });

    throw error;
  }
};

/**
 * Get optimal search parameters for a given query using AWS Bedrock
 * @param query - The search query
 * @param sableApiKey - Sable API key to fetch Bedrock credentials
 * @returns Promise with search parameters and explanation
 */
export const getOptimalSearchParameters = async (
  query: string,
  sableApiKey: string
): Promise<SearchParameters> => {
  const startTime = Date.now();
  let duration: number;
  let outputs: SearchParameters | null = null;
  let error: string | null = null;

  try {
    const bedrockApiKey = await fetchBedrockApiKey(sableApiKey);

    const [accessKeyId, secretAccessKey] = bedrockApiKey.split(':');
    if (!accessKeyId || !secretAccessKey) throw new Error('API key must be in ACCESS_KEY:SECRET_KEY format');

    const client = new BedrockRuntimeClient({
      region: "us-east-1",
      credentials: { accessKeyId, secretAccessKey }
    });

    const systemPrompt = `You are an expert at optimizing Tavily search parameters. 
  Given a search query, suggest the best parameters and provide an explanation of your choices. 

  You MUST ONLY respond with a JSON object in this exact format, with no extra text or explanation:
  {
    "searchTopic": "general"|"news"|"finance",
    "searchDepth": "basic"|"advanced",
    "timeRange": "none"|"day"|"week"|"month"|"year",
    "includeAnswer": "none"|"basic"|"advanced",
    "explanation": string,
    "otherQueries": string[]
  }

  The "explanation" PARAMETER should only discuss the parameters (NOT the search query itself or suggested queries) in the following format: 
  - The explanation will have some markdown.
  - Start with 'I've set the following parameters:<br>', then enumerate each choice made with an EXTREMELY CONCISE THREE WORD rationale in a conversational style (ex. '**Search Topic is finance** — X is a financial news site.<br> **Search Depth is basic** — ...<br>'). 

  The "otherQueries" PARAMETER should provide up to 3 other queries related to the original query (exploring different aspects or variations of it).
  `;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-v2:1',
      contentType: 'application/json',
      accept: '*/*',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        prompt: `${systemPrompt}\n\nHuman: Suggest optimal Tavily search parameters for this query: "${query}"\n\nAssistant:`,
        max_tokens_to_sample: 300,
        temperature: 0.5,
        top_k: 250,
        top_p: 1,
        stop_sequences: ['\n\nHuman:'],
      })
    });

    const response = await client.send(command);
    const raw = await new Response(response.body!).text();

    // Extract the completion part from the response
    const completionMatch = /"completion":"(.*?)","stop_reason"/.exec(raw);
    if (!completionMatch) throw new Error('Failed to extract completion from response');

    // Get the completion content and parse it as JSON
    const completionContent = completionMatch[1]
      .replace(/\\n/g, '')  // Remove newlines
      .replace(/\\\"/g, '"') // Replace escaped quotes
      .replace(/\\\\/g, '\\'); // Replace escaped backslashes

    // Improved: Find the JSON object within the completion (robust to multiline/extra text)
    const jsonMatch = completionContent.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON from completion');

    const result = JSON.parse(jsonMatch[0]) as SearchParameters;
    outputs = result;
    duration = Date.now() - startTime;

    // Log successful analytics
    await logSearchBedrockQuery({
      query,
      output: outputs,
      duration,
      error: null
    });

    return result;

  } catch (error) {
    duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error analytics
    await logSearchBedrockQuery({
      query,
      output: null,
      duration,
      error: errorMessage
    });

    throw error;
  }
};

/**
 * Next.js API handler for Sable Tavily endpoints
 * This function should be used in pages/api/sable/[...path].ts
 */
export const createSableTavilyHandler = (sableApiKey: string) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { path } = req.query;
    const pathArray = Array.isArray(path) ? path : [path];
    const endpoint = pathArray[0];

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      switch (endpoint) {
        case 'crawl': {
          const { url, instructions } = req.body;

          if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL is required and must be a string' });
          }

          if (!instructions || typeof instructions !== 'string') {
            return res.status(400).json({ error: 'Instructions are required and must be a string' });
          }

          if (url.trim() === '') {
            return res.status(400).json({ error: 'URL cannot be empty' });
          }

          if (instructions.trim() === '') {
            return res.status(400).json({ error: 'Instructions cannot be empty' });
          }

          const params = await getOptimalCrawlParameters(url, instructions, sableApiKey);

          return res.status(200).json({
            success: true,
            data: {
              explanation: params.explanation,
              otherCrawls: params.otherCrawls,
              crawlParams: {
                extractDepth: params.extractDepth,
                categories: params.categories
              }
            }
          });
        }

        case 'search': {
          const { query } = req.body;

          if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required and must be a string' });
          }

          if (query.trim() === '') {
            return res.status(400).json({ error: 'Query cannot be empty' });
          }

          const params = await getOptimalSearchParameters(query, sableApiKey);

          return res.status(200).json({
            success: true,
            data: {
              explanation: params.explanation,
              otherQueries: params.otherQueries,
              searchParams: {
                searchTopic: params.searchTopic,
                searchDepth: params.searchDepth,
                timeRange: params.timeRange,
                includeAnswer: params.includeAnswer
              }
            }
          });
        }

        default:
          return res.status(404).json({ error: 'Endpoint not found' });
      }
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}; 