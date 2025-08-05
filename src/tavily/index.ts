import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

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
  console.log('[SableTavilySearch] Starting fetchBedrockApiKey process...');
  console.log('[SableTavilySearch] Sable API Key length:', sableApiKey?.length || 0);
  console.log('[SableTavilySearch] Sable API Key (first 10 chars):', sableApiKey?.substring(0, 10) + '...');
  
  if (!sableApiKey) {
    console.error('[SableTavilySearch] Error: Sable API key is required');
    throw new Error('Sable API key is required');
  }
  
  // Use localhost in development, Vercel deployment in production
  const apiUrl = `https://sable-smart-links.vercel.app/api/keys/${sableApiKey}`;
  console.log('[SableTavilySearch] Attempting to fetch from URL:', apiUrl);
  
  try {
    console.log('[SableTavilySearch] Initiating fetch request...');
    const startTime = Date.now();
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const endTime = Date.now();
    console.log('[SableTavilySearch] Fetch completed in', endTime - startTime, 'ms');
    console.log('[SableTavilySearch] Response status:', response.status);
    console.log('[SableTavilySearch] Response status text:', response.statusText);
    console.log('[SableTavilySearch] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('[SableTavilySearch] Response not OK. Status:', response.status);
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('[SableTavilySearch] Error response body:', errorBody);
      } catch (textError) {
        console.error('[SableTavilySearch] Could not read error response body:', textError);
      }
      throw new Error(`Failed to fetch API keys: ${response.status} ${response.statusText}\nResponse body: ${errorBody}`);
    }
    
    console.log('[SableTavilySearch] Parsing response as JSON...');
    const data: ApiKeysResponse = await response.json();
    console.log('[SableTavilySearch] Response data structure:', {
      hasData: !!data.data,
      hasInternalKeys: !!data.data?.internalKeys,
      hasBedrock: !!data.data?.internalKeys?.bedrock,
      bedrockKeyLength: data.data?.internalKeys?.bedrock?.length || 0
    });
    
    if (!data.data?.internalKeys?.bedrock) {
      console.error('[SableTavilySearch] Bedrock API key not found in response. Full response:', JSON.stringify(data, null, 2));
      throw new Error('Bedrock API key not found in response');
    }
    
    console.log('[SableTavilySearch] Successfully retrieved Bedrock API key. Length:', data.data.internalKeys.bedrock.length);
    return data.data.internalKeys.bedrock;
  } catch (error) {
    console.error('[SableTavilySearch] fetchBedrockApiKey error details:', {
      errorType: error?.constructor?.name,
      errorMessage: (error as Error)?.message,
      errorStack: (error as Error)?.stack,
      isNetworkError: (error as Error)?.name === 'TypeError' && (error as Error)?.message?.includes('fetch'),
      isJsonError: (error as Error)?.name === 'SyntaxError' && (error as Error)?.message?.includes('JSON'),
    });
    
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
  console.log('[SableTavilySearch] getOptimalCrawlParameters called with URL:', url);
  console.log('[SableTavilySearch] Instructions length:', instructions?.length || 0);
  
  try {
    console.log('[SableTavilySearch] Fetching Bedrock API key...');
    const bedrockApiKey = await fetchBedrockApiKey(sableApiKey);
    console.log('[SableTavilySearch] Successfully fetched Bedrock API key, proceeding with Bedrock client setup...');
  
    const [accessKeyId, secretAccessKey] = bedrockApiKey.split(':');
    if (!accessKeyId || !secretAccessKey) throw new Error('API key must be in ACCESS_KEY:SECRET_KEY format');

    const client = new BedrockRuntimeClient({
      region: "us-east-1",
      credentials: { accessKeyId, secretAccessKey }
    });

    const systemPrompt = `You are an expert at optimizing Tavily crawl parameters. 
    Given a crawl query, suggest the best parameters and provide an explanation of your choices. 

    You MUST ONLY respond with a JSON object in this exact format, with no extra text or explanation:
    {
      "extractDepth": "basic"|"advanced",
      "categories": ("Documentation"|"Blogs"|"Community"|"About"|"Contact"|"Pricing"|"Enterprise"|"Careers"|"E-Commerce"|"Media"|"People")[];
      "explanation": string,
      "otherCrawls": {url: string, instructions: string}[]
    }

    The "explanation" PARAMETER should only discuss the parameters (NOT the URL/instructions themselves or suggested crawls) in the following format: 
    - The explanation will have some markdown.
    - Start with 'I've set the following parameters:<br>', then enumerate each choice made with an EXTREMELY CONCISE THREE WORD rationale in a conversational style (ex. '**Search Topic is finance** — X is a financial news site.<br> **Search Depth is basic** — ...<br>'). 

    The "otherCrawls" PARAMETER should provide up to 3 other crawls related to the original crawl (exploring different aspects or variations of it). The URL should be a valid domain for an applicable website, and the instructions should be a concise description of how Tavily's crawler should crawl the site.
    `;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-v2:1',
      contentType: 'application/json',
      accept: '*/*',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        prompt: `${systemPrompt}\n\nHuman: Suggest optimal Tavily crawl parameters for this URL: "${url}" and instructions: "${instructions}"\n\nAssistant:`,
        max_tokens_to_sample: 300,
        temperature: 0.7,
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

    return JSON.parse(jsonMatch[0]);
    
  } catch (error) {
    console.error('[SableTavilySearch] Error in getOptimalCrawlParameters:', error);
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
  console.log('[SableTavilySearch] getOptimalSearchParameters called with query:', query);
  console.log('[SableTavilySearch] Query length:', query?.length || 0);
  
  try {
    console.log('[SableTavilySearch] Fetching Bedrock API key...');
    const bedrockApiKey = await fetchBedrockApiKey(sableApiKey);
    console.log('[SableTavilySearch] Successfully fetched Bedrock API key, proceeding with Bedrock client setup...');
  
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
      temperature: 0.7,
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

  return JSON.parse(jsonMatch[0]);
  
  } catch (error) {
    console.error('[SableTavilySearch] Error in getOptimalSearchParameters:', error);
    throw error;
  }
}; 