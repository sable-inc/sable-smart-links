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
  if (!sableApiKey) throw new Error('Sable API key is required');
  
  const apiUrl = `https://sable-smart-links.vercel.app/api/keys/${sableApiKey}`;
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (textError) {
        // Could not read error response body
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
  const bedrockApiKey = await fetchBedrockApiKey(sableApiKey);
  
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
}; 