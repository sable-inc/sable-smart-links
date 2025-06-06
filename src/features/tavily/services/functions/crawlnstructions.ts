import { debugLog } from '../../../../config';
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

// Define Zod schema for structured output
const CrawlInstructionsSchema = z.object({
  url: z.string()
    .describe('The most relevant URL to crawl based on the query'),
  instruction: z.string()
    .describe('Natural language instruction for how to crawl the URL')
});

type CrawlInstructions = z.infer<typeof CrawlInstructionsSchema>;

export const generateCrawlInstructions = async ({ 
  query 
}: { 
  query: string 
}): Promise<CrawlInstructions> => {
  try {
    debugLog('info', `Generating crawl instructions for query: ${query}`);

    // Get API key from environment
    const apiKey = process.env.VITE_OPENAI_API_KEY || (window as any).VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is missing');
    }

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    
    const response = await openai.responses.parse({
      model: "gpt-4.1-2025-04-14",
      input: [
        { 
          role: "system", 
          content: `You are a web crawling expert. Given a query, suggest:
1. The most relevant URL to start crawling from
2. Natural language instructions for how to crawl that URL effectively.
Focus on authoritative sources and provide concise crawling instructions.`
        },
        { 
          role: "user", 
          content: `Generate crawl instructions for this query: "${query}"`
        }
      ],
      text: { format: zodTextFormat(CrawlInstructionsSchema, "crawl_instructions") }
    });

    debugLog('info', 'OpenAI API Response:', response);
    
    const result = response.output_parsed as CrawlInstructions;
    debugLog('info', 'Parsed Instructions:', result);
    
    return result;

  } catch (error) {
    debugLog('error', `Error generating crawl instructions: ${error}`);
    throw error;
  }
};