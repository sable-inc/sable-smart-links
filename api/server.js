import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

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