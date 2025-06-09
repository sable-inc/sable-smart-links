import { debugLog } from '../../../../config';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

// Define Zod schema for structured output
type CrawlInstructions = z.infer<typeof CrawlInstructionsSchema>;
const CrawlInstructionsSchema = z.object({
  url: z.string().describe('The most relevant URL to crawl based on the query'),
  instruction: z.string().describe('Natural language instruction for how to crawl the URL')
});

export const generateCrawlInstructions = async ({ 
  query,
  apiKey,
}: { 
  query: string;
  apiKey: string;
}): Promise<CrawlInstructions> => {
  try {
    debugLog('info', `Generating crawl instructions for query: ${query}`);

    if (!apiKey) throw new Error('AWS credentials are required');
    const [accessKeyId, secretAccessKey] = apiKey.split(':');
    if (!accessKeyId || !secretAccessKey) throw new Error('API key must be in ACCESS_KEY:SECRET_KEY format');

    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({ region: 'us-east-1', credentials: { accessKeyId, secretAccessKey } });

    // Build prompt with explicit formatting instructions
    const systemPrompt = 
      'You are a web-crawling expert. For the given query, provide two things:\n' +
      '1. URL: The most relevant URL to crawl (provide URL only, no additional text)\n' +
      '2. Instructions: Natural language instructions for how to crawl that URL effectively.\n\n' +
      'Format your response exactly like this:\n' +
      'URL: [url]\n' +
      'Instructions: [instructions]';

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-v2:1',
      contentType: 'application/json',
      accept: '*/*',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        prompt: `${systemPrompt}\n\nHuman: ${query}\n\nAssistant:`,
        max_tokens_to_sample: 300,
        temperature: 0.7,
        top_k: 250,
        top_p: 1,
        stop_sequences: ['\n\nHuman:'],
      })
    });

    const response = await client.send(command);
    const raw = await new Response(response.body!).text();
    debugLog('info', `Raw model output: ${raw}`);

    // Parse and clean the response
    const cleanResponse = (text: string) => {
      // Remove any JSON artifacts and metadata
      return text.replace(/","stop_reason.*$/, '')  // Remove trailing metadata
                .replace(/\\n/g, '')                // Remove escaped newlines
                .trim();
    };

    // Parse the unstructured response
    const urlMatch = raw.match(/URL:\s*(.+?)(?:\n|Instructions:)/i);
    const instructionsMatch = raw.match(/Instructions:\s*(.+?)(?:\n|$)/i);

    if (!urlMatch || !instructionsMatch) {
      throw new Error('Could not parse URL and instructions from response');
    }

    const result = {
      url: cleanResponse(urlMatch[1]),
      instruction: cleanResponse(instructionsMatch[1])
    };

    // Validate the result
    return CrawlInstructionsSchema.parse(result);

  } catch (error) {
    debugLog('error', `Error generating crawl instructions: ${error}`);
    throw error;
  }
};
