import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// MongoDB connection
let db;
let mongoClient;

const connectToMongoDB = async () => {
  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
      await mongoClient.connect();
      db = mongoClient.db('sable-smart-links');

      // Set up collections and indexes
      await setupCollections();
    }
    return db;
  } catch (error) {
    throw error;
  }
};

// Setup collections and indexes
const setupCollections = async () => {
  try {
    // Text Agent Analytics Collection
    const textAgentAnalytics = db.collection('textAgentAnalytics');

    // Create indexes for text agent analytics
    await textAgentAnalytics.createIndex({ sessionId: 1 });
    await textAgentAnalytics.createIndex({ agentId: 1 });
    await textAgentAnalytics.createIndex({ instanceId: 1 });
    await textAgentAnalytics.createIndex({ event: 1 });
    await textAgentAnalytics.createIndex({ timestamp: -1 });
    await textAgentAnalytics.createIndex({ agentDuration: 1 });
    await textAgentAnalytics.createIndex({ sessionId: 1, agentId: 1 });
    await textAgentAnalytics.createIndex({ sessionId: 1, instanceId: 1 });
    await textAgentAnalytics.createIndex({ sessionId: 1, timestamp: -1 });

    // Walkthrough Analytics Collection
    const walkthroughAnalytics = db.collection('walkthroughAnalytics');

    // Create indexes for walkthrough analytics
    await walkthroughAnalytics.createIndex({ sessionId: 1 });
    await walkthroughAnalytics.createIndex({ walkthroughId: 1 });
    await walkthroughAnalytics.createIndex({ stepId: 1 });
    await walkthroughAnalytics.createIndex({ instanceId: 1 });
    await walkthroughAnalytics.createIndex({ event: 1 });
    await walkthroughAnalytics.createIndex({ timestamp: -1 });
    await walkthroughAnalytics.createIndex({ agentDuration: 1 });
    await walkthroughAnalytics.createIndex({ sessionId: 1, walkthroughId: 1 });
    await walkthroughAnalytics.createIndex({ sessionId: 1, instanceId: 1 });
    await walkthroughAnalytics.createIndex({ sessionId: 1, timestamp: -1 });

    // Crawl Bedrock Queries Collection
    const crawlBedrockQueries = db.collection('crawlBedrockQueries');

    // Create indexes for crawl Bedrock queries
    await crawlBedrockQueries.createIndex({ sessionId: 1 });
    await crawlBedrockQueries.createIndex({ userId: 1 });
    await crawlBedrockQueries.createIndex({ 'input.url': 1 });
    await crawlBedrockQueries.createIndex({ timestamp: -1 });
    await crawlBedrockQueries.createIndex({ error: 1 });
    await crawlBedrockQueries.createIndex({ sessionId: 1, timestamp: -1 });

    // Search Bedrock Queries Collection
    const searchBedrockQueries = db.collection('searchBedrockQueries');

    // Create indexes for search Bedrock queries
    await searchBedrockQueries.createIndex({ sessionId: 1 });
    await searchBedrockQueries.createIndex({ userId: 1 });
    await searchBedrockQueries.createIndex({ 'input.query': 'text' });
    await searchBedrockQueries.createIndex({ timestamp: -1 });
    await searchBedrockQueries.createIndex({ error: 1 });
    await searchBedrockQueries.createIndex({ 'output.searchTopic': 1 });
    await searchBedrockQueries.createIndex({ sessionId: 1, timestamp: -1 });

  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Bedrock API key from the API endpoint using sableApiKey
 * @param sableApiKey - The Sable API key to use for authentication
 * @returns Promise with the Bedrock API key
 */
const fetchBedrockApiKey = async (sableApiKey) => {
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

    const data = await response.json();

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
const getOptimalCrawlParameters = async (url, instructions, sableApiKey) => {
  const startTime = Date.now();
  let duration;
  let outputs = null;
  let error = null;

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
    const raw = await new Response(response.body).text();

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

    const result = JSON.parse(jsonMatch[0]);
    outputs = result;
    duration = Date.now() - startTime;

    return result;

  } catch (error) {
    duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    throw error;
  }
};

/**
 * Get optimal search parameters for a given query using AWS Bedrock
 * @param query - The search query
 * @param sableApiKey - Sable API key to fetch Bedrock credentials
 * @returns Promise with search parameters and explanation
 */
const getOptimalSearchParameters = async (query, sableApiKey) => {
  const startTime = Date.now();
  let duration;
  let outputs = null;
  let error = null;

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
    const raw = await new Response(response.body).text();

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

    const result = JSON.parse(jsonMatch[0]);
    outputs = result;
    duration = Date.now() - startTime;

    return result;

  } catch (error) {
    duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    throw error;
  }
};

// Generate anonymous session ID
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

// Validate text agent analytics data
const validateTextAgentAnalytics = (data) => {
  const required = ['event', 'agentId', 'stepId'];
  const validEvents = ['start', 'next', 'previous', 'end', 'restart', 'step_rendered', 'step_triggered'];

  for (const field of required) {
    if (!data[field] && data[field] !== 0) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!validEvents.includes(data.event)) {
    throw new Error(`Invalid event type: ${data.event}. Must be one of: ${validEvents.join(', ')}`);
  }

  return true;
};

// Validate walkthrough analytics data
const validateWalkthroughAnalytics = (data) => {
  const required = ['event', 'walkthroughId', 'stepIndex', 'stepId'];
  const validEvents = ['start', 'next', 'end', 'step_executed', 'step_error'];

  for (const field of required) {
    if (!data[field] && data[field] !== 0) { // Allow 0 for stepIndex
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!validEvents.includes(data.event)) {
    throw new Error(`Invalid event type: ${data.event}. Must be one of: ${validEvents.join(', ')}`);
  }

  // Validate stepIndex is a number
  if (typeof data.stepIndex !== 'number' || data.stepIndex < 0) {
    throw new Error('stepIndex must be a non-negative number');
  }

  return true;
};

// Validate crawl Bedrock query data
const validateCrawlBedrockQuery = (data) => {
  const required = ['url', 'instructions', 'duration'];

  for (const field of required) {
    if (!data[field] && data[field] !== 0) { // Allow 0 for duration
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate duration is a number
  if (typeof data.duration !== 'number' || data.duration < 0) {
    throw new Error('duration must be a non-negative number');
  }

  return true;
};

// Validate search Bedrock query data
const validateSearchBedrockQuery = (data) => {
  const required = ['query', 'duration'];

  for (const field of required) {
    if (!data[field] && data[field] !== 0) { // Allow 0 for duration
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate duration is a number
  if (typeof data.duration !== 'number' || data.duration < 0) {
    throw new Error('duration must be a non-negative number');
  }

  return true;
};

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get internal keys from client-facing API key
app.get('/api/keys/:clientKey', async (req, res) => {
  try {
    const { clientKey } = req.params;

    if (!clientKey) {
      return res.status(400).json({ error: 'Client API key is required' });
    }

    // Ensure database connection is established
    const database = await connectToMongoDB();

    const keyMapping = await database.collection('keys').findOne({
      clientKey: clientKey,
    });

    if (!keyMapping) {
      return res.status(404).json({ error: 'Invalid or inactive API key' });
    }

    // Return the internal keys (excluding sensitive fields)
    res.json({
      success: true,
      data: {
        clientKey: keyMapping.clientKey,
        internalKeys: keyMapping.internalKeys, // internalKeys is now an object
        createdAt: keyMapping.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch key mapping' });
  }
});

// Text Agent Analytics Logging
app.post('/api/analytics/text-agent', async (req, res) => {
  try {
    const {
      event,
      agentId,
      stepId,
      instanceId,
      stepDuration,
      agentDuration,
      sessionId,
      userId,
      metadata,
      timestamp
    } = req.body;

    // Validate required fields
    try {
      validateTextAgentAnalytics({ event, agentId, stepId });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId();

    const analyticsEntry = {
      event,
      agentId,
      stepId: stepId || null,
      instanceId: instanceId || null,
      stepDuration: stepDuration !== undefined ? stepDuration : null,
      agentDuration: agentDuration !== undefined ? agentDuration : null,
      sessionId: finalSessionId,
      userId: userId || null,
      metadata: metadata || {},
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdAt: new Date()
    };

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const result = await database.collection('textAgentAnalytics').insertOne(analyticsEntry);

    res.status(201).json({
      success: true,
      id: result.insertedId,
      sessionId: finalSessionId,
      message: 'Text agent analytics logged successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log text agent analytics' });
  }
});

// Update Text Agent Analytics Event Duration
app.patch('/api/analytics/text-agent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stepDuration } = req.body;

    if (stepDuration === null || stepDuration === undefined) {
      return res.status(400).json({ error: 'stepDuration is required' });
    }

    if (typeof stepDuration !== 'number' || stepDuration < 0) {
      return res.status(400).json({ error: 'stepDuration must be a non-negative number' });
    }

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const { ObjectId } = await import('mongodb');

    const result = await database.collection('textAgentAnalytics').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          stepDuration,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Analytics record not found' });
    }

    res.json({
      success: true,
      message: 'Analytics event duration updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update text agent analytics duration' });
  }
});

// Update Walkthrough Analytics Event Duration
app.patch('/api/analytics/walkthrough/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stepDuration } = req.body;

    if (stepDuration === null || stepDuration === undefined) {
      return res.status(400).json({ error: 'stepDuration is required' });
    }

    if (typeof stepDuration !== 'number' || stepDuration < 0) {
      return res.status(400).json({ error: 'stepDuration must be a non-negative number' });
    }

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const { ObjectId } = await import('mongodb');

    const result = await database.collection('walkthroughAnalytics').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          stepDuration,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Analytics record not found' });
    }

    res.json({
      success: true,
      message: 'Walkthrough analytics event duration updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update walkthrough analytics duration' });
  }
});

// Walkthrough Analytics Logging
app.post('/api/analytics/walkthrough', async (req, res) => {
  try {
    const {
      event,
      walkthroughId,
      stepIndex,
      stepId,
      stepSelector,
      instanceId,
      stepDuration,
      agentDuration,
      sessionId,
      userId,
      metadata,
      timestamp
    } = req.body;

    // Validate required fields
    try {
      validateWalkthroughAnalytics({ event, walkthroughId, stepIndex, stepId });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId();

    const analyticsEntry = {
      event,
      walkthroughId,
      stepIndex: stepIndex !== undefined ? stepIndex : null,
      stepId: stepId || null,
      stepSelector: stepSelector || null,
      instanceId: instanceId || null,
      stepDuration: stepDuration !== undefined ? stepDuration : null,
      agentDuration: agentDuration !== undefined ? agentDuration : null,
      sessionId: finalSessionId,
      userId: userId || null,
      metadata: metadata || {},
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdAt: new Date()
    };

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const result = await database.collection('walkthroughAnalytics').insertOne(analyticsEntry);

    res.status(201).json({
      success: true,
      id: result.insertedId,
      sessionId: finalSessionId,
      message: 'Walkthrough analytics logged successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log walkthrough analytics' });
  }
});

// Crawl Bedrock Queries Analytics Logging
app.post('/api/analytics/crawl-bedrock', async (req, res) => {
  try {
    const {
      input,
      output,
      duration,
      error,
      sessionId,
      userId,
      timestamp
    } = req.body;

    // Validate required fields
    try {
      validateCrawlBedrockQuery({
        url: input?.url,
        instructions: input?.instructions,
        duration
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId();

    const analyticsEntry = {
      input,
      output: output || null,
      duration,
      error: error || null,
      sessionId: finalSessionId || null,
      userId: userId || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdAt: new Date()
    };

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const result = await database.collection('crawlBedrockQueries').insertOne(analyticsEntry);

    res.status(201).json({
      success: true,
      id: result.insertedId,
      sessionId: finalSessionId,
      message: 'Crawl Bedrock query analytics logged successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log crawl Bedrock query analytics' });
  }
});

// Search Bedrock Queries Analytics Logging
app.post('/api/analytics/search-bedrock', async (req, res) => {
  try {
    const {
      input,
      output,
      duration,
      error,
      sessionId,
      userId,
      timestamp
    } = req.body;

    // Validate required fields
    try {
      validateSearchBedrockQuery({
        query: input?.query,
        duration
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId();

    const analyticsEntry = {
      input,
      output: output || null,
      duration,
      error: error || null,
      sessionId: finalSessionId || null,
      userId: userId || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdAt: new Date()
    };

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const result = await database.collection('searchBedrockQueries').insertOne(analyticsEntry);

    res.status(201).json({
      success: true,
      id: result.insertedId,
      sessionId: finalSessionId,
      message: 'Search Bedrock query analytics logged successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log search Bedrock query analytics' });
  }
});

// Tavily Integration Endpoints
app.post('/api/tavily/crawl', async (req, res) => {
  try {
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

    const params = await getOptimalCrawlParameters(url, instructions, process.env.SABLE_API_KEY);

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
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to process crawl request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/tavily/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    if (query.trim() === '') {
      return res.status(400).json({ error: 'Query cannot be empty' });
    }

    const params = await getOptimalSearchParameters(query, process.env.SABLE_API_KEY);

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
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to process search request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  await connectToMongoDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

// For Vercel serverless deployment
if (process.env.NODE_ENV !== 'production') {
  startServer().catch(console.error);
}

// Export for Vercel
export default app; 