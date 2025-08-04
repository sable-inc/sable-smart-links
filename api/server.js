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

const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await client.connect();
    db = client.db('sable-smart-links');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
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

    const keyMapping = await db.collection('keys').findOne({ 
      clientKey: clientKey,
      active: true 
    });

    if (!keyMapping) {
      return res.status(404).json({ error: 'Invalid or inactive API key' });
    }

    // Update last used timestamp and usage count
    await db.collection('keys').updateOne(
      { clientKey: clientKey },
      { 
        $set: { 
          lastUsed: new Date(),
          usageCount: (keyMapping.usageCount || 0) + 1
        }
      }
    );

    // Return the internal keys (excluding sensitive fields)
    res.json({
      success: true,
      data: {
        clientKey: keyMapping.clientKey,
        internalKeys: keyMapping.internalKeys.map(key => ({
          keyType: key.keyType,
          internalKey: key.internalKey, // Include the actual internal key
          permissions: key.permissions,
          active: key.active,
          createdAt: key.createdAt,
          lastUsed: key.lastUsed,
          usageCount: key.usageCount
        })),
        createdAt: keyMapping.createdAt,
        lastUsed: keyMapping.lastUsed,
        usageCount: keyMapping.usageCount
      }
    });
  } catch (error) {
    console.error('Error fetching key mapping:', error);
    res.status(500).json({ error: 'Failed to fetch key mapping' });
  }
});

// Data logging route
app.post('/api/log', async (req, res) => {
  try {
    const { event, data, userId, sessionId, timestamp } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event is required' });
    }

    const logEntry = {
      event,
      data: data || {},
      userId: userId || null,
      sessionId: sessionId || null,
      timestamp: timestamp || new Date(),
      createdAt: new Date()
    };

    const result = await db.collection('logs').insertOne(logEntry);
    
    res.status(201).json({
      success: true,
      id: result.insertedId,
      message: 'Data logged successfully'
    });
  } catch (error) {
    console.error('Error logging data:', error);
    res.status(500).json({ error: 'Failed to log data' });
  }
});

// Fetch logs route
app.get('/api/logs', async (req, res) => {
  try {
    const { userId, sessionId, event, limit = 100, skip = 0 } = req.query;
    
    const filter = {};
    if (userId) filter.userId = userId;
    if (sessionId) filter.sessionId = sessionId;
    if (event) filter.event = event;

    const logs = await db.collection('logs')
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Analytics route
app.get('/api/analytics', async (req, res) => {
  try {
    const { userId, sessionId, startDate, endDate } = req.query;
    
    const filter = {};
    if (userId) filter.userId = userId;
    if (sessionId) filter.sessionId = sessionId;
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
          uniqueUsers: { $addToSet: '$userId' },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueSessions: { $size: '$uniqueSessions' }
        }
      }
    ];

    const analytics = await db.collection('logs').aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
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