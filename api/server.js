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
      console.log('Connected to MongoDB');
      
      // Set up collections and indexes
      await setupCollections();
    }
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Set up collections and indexes for analytics
const setupCollections = async () => {
  try {
    // Text Agent Analytics Collection
    const textAgentAnalytics = db.collection('textAgentAnalytics');
    
    // Create indexes for text agent analytics
    await textAgentAnalytics.createIndex({ sessionId: 1 });
    await textAgentAnalytics.createIndex({ agentId: 1 });
    await textAgentAnalytics.createIndex({ event: 1 });
    await textAgentAnalytics.createIndex({ timestamp: -1 });
    await textAgentAnalytics.createIndex({ sessionId: 1, agentId: 1 });
    await textAgentAnalytics.createIndex({ sessionId: 1, timestamp: -1 });
    
    // Walkthrough Analytics Collection
    const walkthroughAnalytics = db.collection('walkthroughAnalytics');
    
    // Create indexes for walkthrough analytics
    await walkthroughAnalytics.createIndex({ sessionId: 1 });
    await walkthroughAnalytics.createIndex({ walkthroughId: 1 });
    await walkthroughAnalytics.createIndex({ event: 1 });
    await walkthroughAnalytics.createIndex({ timestamp: -1 });
    await walkthroughAnalytics.createIndex({ sessionId: 1, walkthroughId: 1 });
    await walkthroughAnalytics.createIndex({ sessionId: 1, timestamp: -1 });
    
    console.log('Analytics collections and indexes set up successfully');
  } catch (error) {
    console.error('Error setting up collections:', error);
  }
};

// Generate anonymous session ID
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

// Validate text agent analytics data
const validateTextAgentAnalytics = (data) => {
  const required = ['event', 'agentId', 'stepId', 'stepIndex'];
  const validEvents = ['start', 'next', 'previous', 'end', 'restart', 'step_rendered', 'step_triggered'];
  
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

// Validate walkthrough analytics data
const validateWalkthroughAnalytics = (data) => {
  const required = ['event', 'walkthroughId', 'stepIndex'];
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
    console.error('Error fetching key mapping:', error);
    res.status(500).json({ error: 'Failed to fetch key mapping' });
  }
});

// Text Agent Analytics Logging
app.post('/api/analytics/text-agent', async (req, res) => {
  try {``
    const { 
      event, 
      agentId, 
      stepId, 
      stepIndex, 
      sessionId, 
      userId, 
      metadata,
      timestamp 
    } = req.body;
    
    // Validate required fields
    try {
      validateTextAgentAnalytics({ event, agentId, stepId, stepIndex });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId();
    
    const analyticsEntry = {
      event,
      agentId,
      stepId: stepId || null,
      stepIndex: stepIndex !== undefined ? stepIndex : null,
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
    console.error('Error logging text agent analytics:', error);
    res.status(500).json({ error: 'Failed to log text agent analytics' });
  }
});

// Walkthrough Analytics Logging
app.post('/api/analytics/walkthrough', async (req, res) => {
  try {
    const { 
      event, 
      walkthroughId, 
      stepIndex, 
      stepSelector,
      sessionId, 
      userId, 
      metadata,
      timestamp 
    } = req.body;
    
    // Validate required fields
    try {
      validateWalkthroughAnalytics({ event, walkthroughId, stepIndex });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Generate session ID if not provided
    const finalSessionId = sessionId || generateSessionId();
    
    const analyticsEntry = {
      event,
      walkthroughId,
      stepIndex: stepIndex !== undefined ? stepIndex : null,
      stepSelector: stepSelector || null,
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
    console.error('Error logging walkthrough analytics:', error);
    res.status(500).json({ error: 'Failed to log walkthrough analytics' });
  }
});

// Get Text Agent Analytics
app.get('/api/analytics/text-agent', async (req, res) => {
  try {
    const { 
      sessionId, 
      agentId, 
      event, 
      userId,
      startDate, 
      endDate,
      limit = 100, 
      skip = 0 
    } = req.query;
    
    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (agentId) filter.agentId = agentId;
    if (event) filter.event = event;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const analytics = await database.collection('textAgentAnalytics')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      data: analytics,
      count: analytics.length
    });
  } catch (error) {
    console.error('Error fetching text agent analytics:', error);
    res.status(500).json({ error: 'Failed to fetch text agent analytics' });
  }
});

// Get Walkthrough Analytics
app.get('/api/analytics/walkthrough', async (req, res) => {
  try {
    const { 
      sessionId, 
      walkthroughId, 
      event, 
      userId,
      startDate, 
      endDate,
      limit = 100, 
      skip = 0 
    } = req.query;
    
    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (walkthroughId) filter.walkthroughId = walkthroughId;
    if (event) filter.event = event;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const analytics = await database.collection('walkthroughAnalytics')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      data: analytics,
      count: analytics.length
    });
  } catch (error) {
    console.error('Error fetching walkthrough analytics:', error);
    res.status(500).json({ error: 'Failed to fetch walkthrough analytics' });
  }
});

// Get Text Agent Analytics Summary
app.get('/api/analytics/text-agent/summary', async (req, res) => {
  try {
    const { 
      sessionId, 
      agentId, 
      startDate, 
      endDate 
    } = req.query;
    
    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (agentId) filter.agentId = agentId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
          uniqueAgents: { $addToSet: '$agentId' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' },
          uniqueAgents: { $size: '$uniqueAgents' },
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ];

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const summary = await database.collection('textAgentAnalytics').aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching text agent analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch text agent analytics summary' });
  }
});

// Get Walkthrough Analytics Summary
app.get('/api/analytics/walkthrough/summary', async (req, res) => {
  try {
    const { 
      sessionId, 
      walkthroughId, 
      startDate, 
      endDate 
    } = req.query;
    
    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (walkthroughId) filter.walkthroughId = walkthroughId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' },
          uniqueWalkthroughs: { $addToSet: '$walkthroughId' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueSessions: { $size: '$uniqueSessions' },
          uniqueWalkthroughs: { $size: '$uniqueWalkthroughs' },
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ];

    // Ensure database connection is established
    const database = await connectToMongoDB();
    const summary = await database.collection('walkthroughAnalytics').aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching walkthrough analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch walkthrough analytics summary' });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
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