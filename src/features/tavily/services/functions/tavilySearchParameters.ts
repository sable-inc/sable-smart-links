import { debugLog } from '../../../../config';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod"; 

// Helper function to highlight an element with prominent visual effects
const highlightElement = (element: Element) => {
    const originalStyle = element.getAttribute('style') || '';
    
    // Create a more subtle highlight with animation and rounded corners
    const highlightStyle = `
      ${originalStyle}; 
      outline: 2px solid #E2E8F0; 
      border-radius: 12px;
      box-shadow: 0 0 15px rgba(160, 174, 192, 0.4); 
      transition: all 0.5s ease-in-out; 
      animation: pulse-border 1.2s infinite alternate;
    `;
    
    // Add a CSS animation for a gentler pulsing effect
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes pulse-border {
        0% { box-shadow: 0 0 10px rgba(160, 174, 192, 0.3); outline-color: #E2E8F0; }
        100% { box-shadow: 0 0 20px rgba(160, 174, 192, 0.5); outline-color: #CBD5E0; }
      }
    `;
    document.head.appendChild(styleTag);
    
    // Apply the enhanced highlight style
    element.setAttribute('style', highlightStyle);
    
    // Store both the original style and the created style element for later removal
    return { originalStyle, styleTag };
};
  

// Helper function to restore original style and clean up
const restoreElementStyle = (element: Element, styleInfo: { originalStyle: string, styleTag: HTMLStyleElement }) => {
    // Restore the original style
    element.setAttribute('style', styleInfo.originalStyle);

    // Remove the animation style tag if it exists
    if (styleInfo.styleTag && document.head.contains(styleInfo.styleTag)) {
        document.head.removeChild(styleInfo.styleTag);
    }
};  


// Parameter definitions
const SEARCH_PARAMS = {
  topic: {
    name: 'Search topic',
    options: ['general', 'news', 'finance'],
    description: 'The category of your search to optimize results for your specific needs'
  },
  depth: {
    name: 'Search depth',
    options: ['basic', 'advanced'],
    description: 'Controls how extensively Tavily searches. "Basic" is faster and cheaper, "Advanced" is more thorough'
  },
  maxResults: {
    name: 'Max results',
    options: null, // Numeric input
    description: 'The maximum number of search results to return. Higher values provide more comprehensive results but cost more'
  },
  timeRange: {
    name: 'Time range',
    options: ['none', 'day', 'week', 'month', 'year'],
    description: 'Filter results by recency'
  },
  includeAnswer: {
    name: 'Include answer',
    options: ['none', 'basic', 'advanced'],
    description: 'Whether to include an AI-generated answer summarizing the search results'
  }
};

// Parameter schema
const ParameterSuggestionsSchema = z.object({
  topic: z.enum(['general', 'news', 'finance']),
  depth: z.enum(['basic', 'advanced']),
  maxResults: z.number(),
  timeRange: z.enum(['none', 'day', 'week', 'month', 'year']),
  includeAnswer: z.enum(['none', 'basic', 'advanced']),
  explanation: z.string()
});

type ParameterSuggestions = z.infer<typeof ParameterSuggestionsSchema>;

// Helper function to wait
const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper function to find and click dropdown
const selectDropdownOption = async (paramName: string, value: string): Promise<boolean> => {
    try {
        debugLog('info', `[SELECT] Setting ${paramName} to ${value}`);
      
        // Map parameter names to their expected options
        const paramOptionsMap: Record<string, string[]> = {
            'Search topic': ['general', 'news', 'finance'],
            'Search depth': ['basic', 'advanced'],
            'Time range': ['none', 'day', 'week', 'month', 'year'],
            'Include answer': ['none', 'basic', 'advanced']
        };

        // Get expected options for this parameter
        const expectedOptions = paramOptionsMap[paramName];
        if (!expectedOptions) {
            debugLog('error', `[SELECT] No options mapping for ${paramName}`);
            return false;
        }

        // Find all select elements
        const selects = document.querySelectorAll('.chakra-select') as NodeListOf<HTMLSelectElement>;
        
        // Find the select element that has the matching options
        let targetSelect: HTMLSelectElement | null = null;
        for (const select of selects) {
            const options = Array.from(select.options).map(opt => opt.value);
            const hasAllExpectedOptions = expectedOptions.every(expected => options.includes(expected));
            if (hasAllExpectedOptions) {
                targetSelect = select;
                break;
            }
        }

        if (!targetSelect) {
            debugLog('error', `[SELECT] Could not find select element with options for ${paramName}`);
            return false;
        }

        // Find the appropriate container based on parameter type
        let containerToHighlight: Element | null = null;
        if (['Search topic', 'Search depth', 'Time range'].includes(paramName)) {
            containerToHighlight = targetSelect.closest('.css-ub7pfz');
        } else if (paramName === 'Include answer') {
            containerToHighlight = targetSelect.closest('.css-722v25');
        }

        if (containerToHighlight) {
            // Highlight the container
            const styleInfo = highlightElement(containerToHighlight);
            
            // Wait for visual effect
            await wait(600);

            // Set the value and trigger change event
            targetSelect.value = value;
            targetSelect.dispatchEvent(new Event('change', { bubbles: true }));

            // Restore original style
            restoreElementStyle(containerToHighlight, styleInfo);
        } else {
            // Fallback: just set the value without highlighting if container not found
            targetSelect.value = value;
            targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return true;

    } catch (error) {
        debugLog('error', `[SELECT] Error setting ${paramName}: ${error}`);
        return false;
    }
};


// Helper function to set numeric input
const setNumericInput = async (value: number): Promise<boolean> => {
  try {
    const input = document.querySelector('#max-results') as HTMLInputElement;
    if (!input) {
      debugLog('error', '[NUMERIC] Max results input not found');
      return false;
    }

    // Validate the value is within acceptable range
    const normalizedValue = Math.min(Math.max(1, value), 20);
    input.value = normalizedValue.toString();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch (error) {
    debugLog('error', `[NUMERIC] Error setting max results: ${error}`);
    return false;
  }
};

// Main function simplified
export const suggestSearchParameters = async ({ 
  query,
  apiKey 
}: { 
  query: string;
  apiKey: string;
}): Promise<{
  success: boolean;
  message: string;
  suggestions?: ParameterSuggestions;
}> => {
  try {
    debugLog('info', `[SUGGEST] Starting parameter suggestion for query: "${query}"`);

    if (!apiKey) {
      return {
        success: false,
        message: 'AWS credentials are required'
      };
    }

    // Initialize Bedrock client
    const [accessKeyId, secretAccessKey] = apiKey.split(':');
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('API key must be in ACCESS_KEY:SECRET_KEY format');
    }

    const client = new BedrockRuntimeClient({
      region: "us-east-1",
      credentials: { accessKeyId, secretAccessKey }
    });

    // Build prompt
    const systemPrompt = `You are an expert at optimizing Tavily search parameters. Given a search query, suggest the best parameters and explain why. Max results should always be 5. 
You must respond with a JSON object in this exact format:
{
  "topic": "general"|"news"|"finance",
  "depth": "basic"|"advanced",
  "maxResults": 5,
  "timeRange": "none"|"day"|"week"|"month"|"year",
  "includeAnswer": "none"|"basic"|"advanced",
  "explanation": "Why these parameters were chosen"
}`;

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
    debugLog('info', `Raw model output: ${raw}`);

    // Extract the completion part from the response
    const completionMatch = /"completion":"(.*?)","stop_reason"/.exec(raw);
    if (!completionMatch) {
      throw new Error('Failed to extract completion from response');
    }

    // Get the completion content and parse it as JSON
    const completionContent = completionMatch[1]
      .replace(/\\n/g, '')  // Remove newlines
      .replace(/\\\"/g, '"') // Replace escaped quotes
      .replace(/\\\\/g, '\\'); // Replace escaped backslashes

    // Find the JSON object within the completion
    const jsonMatch = /{.*?}/.exec(completionContent);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from completion');
    }

    const parsedJson = JSON.parse(jsonMatch[0]);

    // Validate and construct the suggestions object
    const suggestions: ParameterSuggestions = {
      topic: parsedJson.topic,
      depth: parsedJson.depth,
      maxResults: 5, // Hardcoded to 5
      timeRange: parsedJson.timeRange,
      includeAnswer: parsedJson.includeAnswer,
      explanation: parsedJson.explanation
    };

    // Validate against schema
    ParameterSuggestionsSchema.parse(suggestions);

    // Set parameters in UI
    const results: boolean[] = [];
    const parameterSequence = [
      { name: 'Search topic', value: suggestions.topic },
      { name: 'Search depth', value: suggestions.depth },
      { name: 'Time range', value: suggestions.timeRange },
      { name: 'Include answer', value: suggestions.includeAnswer }
    ];

    for (const param of parameterSequence) {
      const result = await selectDropdownOption(param.name, param.value);
      results.push(result);
      await wait(600);
    }

    const numericResult = await setNumericInput(5);
    results.push(numericResult);

    const allSucceeded = results.every(result => result);

    return {
      success: allSucceeded,
      message: allSucceeded 
        ? `Parameters set successfully!\n\nWhy these parameters were chosen:\n${suggestions.explanation}`
        : 'Some parameters could not be set',
      suggestions: suggestions
    };

  } catch (error: any) {
    debugLog('error', `[SUGGEST] Error: ${error.message}`);
    return {
      success: false,
      message: `Error suggesting parameters: ${error.message || 'Unknown error'}`
    };
  }
}; 