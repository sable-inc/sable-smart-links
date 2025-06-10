import { debugLog } from '../../../../config';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

// Define Zod schema for the response
const CopilotResponseSchema = z.object({
  response: z.string().describe('The assistant response to the user query')
});

type CopilotResponse = z.infer<typeof CopilotResponseSchema>;

export const generalizedCopilot = async ({ 
  query,
  apiKey,
}: { 
  query: string;
  apiKey: string;
}): Promise<CopilotResponse> => {
  try {
    debugLog('info', `Generating Tavily copilot response for: ${query}`);

    if (!apiKey) throw new Error('AWS credentials are required');
    const [accessKeyId, secretAccessKey] = apiKey.split(':');
    if (!accessKeyId || !secretAccessKey) throw new Error('API key must be in ACCESS_KEY:SECRET_KEY format');

    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({ 
      region: 'us-east-1', 
      credentials: { accessKeyId, secretAccessKey } 
    });

    // Comprehensive system prompt about Tavily
    const systemPrompt = `
You are an AI assistant for Tavily, a specialized search engine built specifically for AI agents and LLMs. Here's what you know about Tavily:

Core Features:
- Purpose-built search engine optimized for LLMs and AI agents
- Aggregates up to 20 sites per API call with proprietary AI scoring and filtering
- Provides accurate, unbiased, and factual information
- Offers both Search and Extract APIs

Key Differentiators:
- Unlike traditional search APIs (Google, Serp, Bing), Tavily handles:
  * Content scraping
  * Filtering irrelevant information
  * Optimizing content for LLM context limits
  * Cross-agent communication with short answers
- Specifically designed for RAG (Retrieval Augmented Generation) applications
- Customizable parameters for search depth, topic focus, and content format

Technical Details:
- Search API features:
  * Advanced content filtering and ranking
  * Custom field support (context, token limits)
  * Short answer generation for cross-agent communication
- Extract API capabilities:
  * Targeted content extraction from specific URLs
  * Multiple format options (markdown/text)
  * Configurable extraction depth
- New Crawl feature (BETA) for traversing sites like a graph

Getting Started:
- Free tier: 1,000 API credits monthly
- No credit card required
- Available through API Playground
- Comprehensive documentation and quickstart guides available

Your role is to help users understand Tavily's capabilities, features, and technical implementation. Provide accurate, helpful responses based on this information.

When responding:
1. Be concise but thorough
2. Focus on technical accuracy
3. Use examples where helpful
4. Compare with alternatives when relevant
5. Highlight unique Tavily features that address the specific query`;

    // Create the command for Bedrock
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-v2:1',
      contentType: 'application/json',
      accept: '*/*',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        prompt: `${systemPrompt}\n\nHuman: ${query}\n\nAssistant:`,
        max_tokens_to_sample: 500, // Increased token limit for detailed responses
        temperature: 0.7,
        top_k: 250,
        top_p: 1,
        stop_sequences: ['\n\nHuman:'],
      })
    });

    // Send request to Bedrock
    const response = await client.send(command);
    const raw = await new Response(response.body!).text();
    debugLog('info', `Raw model output: ${raw}`);

    // Clean and parse the response
    const cleanResponse = (text: string) => {
      return text
        .replace(/","stop_reason.*$/, '')  // Remove trailing metadata
        .replace(/\\n/g, '\n')            // Preserve newlines but clean them
        .trim();
    };

    // Extract the actual response content
    const responseContent = cleanResponse(raw);

    // Validate and return the response
    return CopilotResponseSchema.parse({
      response: responseContent
    });

  } catch (error) {
    debugLog('error', `Error in generalizedCopilot: ${error}`);
    throw error;
  }
};