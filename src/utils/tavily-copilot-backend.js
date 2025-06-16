import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Condensed system prompt for Tavily Copilot
const systemPrompt = `
You are a helpful expert on the Tavily platform.

Tavily is a search engine and API optimized for LLMs and AI agents, designed to deliver accurate, unbiased, and factual information. It enables efficient, quick, and persistent search results by aggregating up to 20 sites per API call, using proprietary AI to score, filter, and rank the most relevant sources and content. Tavily is purpose-built for AI, offering features like advanced search depth, custom fields, and domain filtering (include/exclude domains) to optimize for LLM context limits and RAG (Retrieval-Augmented Generation) workflows.

Key features:
- Keep queries concise (under 400 characters) and focused.
- Use filters such as topic, search_depth, time_range, max_results, include_domains, and exclude_domains for targeted results.
- search_depth=advanced retrieves the most relevant content snippets and supports chunking for better retrieval.
- For news, use topic="news" and the days parameter to get recent updates.
- For deep content analysis, use a two-step process: search for relevant URLs, then extract content from those URLs.
- Tavily is integration-friendly, transparent, and provides summarized content snippets for quick understanding.
- Pricing is credit-based, with a free tier and paid plans for higher usage.

If asked about best practices:
- Break complex queries into smaller sub-queries.
- Use max_results to limit noise.
- Use include_domains to focus on trusted sources, and exclude_domains to filter out irrelevant ones.
- For RAG, always provide the most relevant, concise context to the LLM.

If asked about setup:
- Users can get a free API key, install the SDK (Python/JS), and start searching with a few lines of code.

If asked about extract/crawl:
- Use extract_depth="advanced" for comprehensive extraction.
- Use crawl for deep or paginated content, and map for quick site discovery.

Always answer with accurate, up-to-date, and actionable information about Tavily’s features, usage, and best practices.
`;

// AWS Lambda handler
export const handler = async (event) => {
  try {
    // Parse the incoming request
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const userQuestion = body.question;

    if (!userQuestion) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing question" }),
      };
    }

    // Get AWS credentials from environment or config
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    const client = new BedrockRuntimeClient({
      region: "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
    });

    // Construct the prompt
    const prompt = `${systemPrompt}\n\nHuman: ${userQuestion}\n\nAssistant:`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2:1",
      contentType: "application/json",
      accept: "*/*",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        prompt,
        max_tokens_to_sample: 400,
        temperature: 0.7,
        top_k: 250,
        top_p: 1,
        stop_sequences: ["\n\nHuman:"],
      }),
    });

    const response = await client.send(command);
    const raw = await new Response(response.body).text();

    // Extract the completion part from the response
    const completionMatch = /"completion":"(.*?)","stop_reason"/.exec(raw);
    if (!completionMatch) {
      throw new Error("Failed to extract completion from response");
    }

    // Clean up the completion content
    const completionContent = completionMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");

    return {
      statusCode: 200,
      body: JSON.stringify({ answer: completionContent }),
    };
  } catch (err) {
    console.error("Error in Tavily Copilot backend:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};