/**
 * MongoDB Connector for Sable Smart Links Analytics
 * Connects directly to MongoDB Atlas to store analytics data
 */

import { MongoClient } from 'mongodb';
import { isBrowser } from './browserAPI.js';

export class MongoDBConnector {
  constructor(mongoUri) {
    this.mongoUri = mongoUri;
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB Atlas
   */
  async connect() {
    if (this.isConnected) return;

    try {
      this.client = new MongoClient(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      await this.client.connect();
      this.db = this.client.db('Analytics');
      this.isConnected = true;

      // Create indexes for optimal performance
      await this.createIndexes();

      console.log('[SableAnalytics] Connected to MongoDB Atlas');
    } catch (error) {
      console.error('[SableAnalytics] Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Create MongoDB indexes for analytics collections
   */
  async createIndexes() {
    try {
      const eventsCollection = this.db.collection('analytics_events');
      
      await eventsCollection.createIndex({ type: 1, timestamp: -1 });
      await eventsCollection.createIndex({ category: 1, timestamp: -1 });
      await eventsCollection.createIndex({ userId: 1, timestamp: -1 });
      await eventsCollection.createIndex({ sessionId: 1, timestamp: -1 });
      await eventsCollection.createIndex({ 'data.agentId': 1, timestamp: -1 });
      await eventsCollection.createIndex({ 'data.walkthroughId': 1, timestamp: -1 });
      await eventsCollection.createIndex({ createdAt: -1 });

      console.log('[SableAnalytics] MongoDB indexes created');
    } catch (error) {
      console.error('[SableAnalytics] Failed to create indexes:', error);
    }
  }

  /**
   * Store analytics events directly in MongoDB
   */
  async storeEvents(events) {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!events || events.length === 0) return;

    try {
      const eventsCollection = this.db.collection('analytics_events');
      
      // Process events for MongoDB storage
      const processedEvents = events.map(event => ({
        ...event,
        timestamp: new Date(event.timestamp),
        createdAt: new Date(),
        data: {
          ...event.data,
          timestamp: new Date(event.data.timestamp)
        }
      }));

      await eventsCollection.insertMany(processedEvents);
      console.log(`[SableAnalytics] Stored ${events.length} events in MongoDB`);
    } catch (error) {
      console.error('[SableAnalytics] Failed to store events in MongoDB:', error);
      throw error;
    }
  }

  /**
   * Sync analytics events from localStorage to MongoDB
   */
  async syncAnalyticsEvents() {
    if (!isBrowser) {
      console.warn('[SableAnalytics] Cannot sync events in non-browser environment');
      return;
    }

    try {
      const events = JSON.parse(localStorage.getItem('sable_analytics_events') || '[]');
      
      if (events.length === 0) {
        console.log('[SableAnalytics] No events to sync');
        return;
      }

      console.log(`[SableAnalytics] Syncing ${events.length} events to MongoDB`);
      
      // Store events in MongoDB
      await this.storeEvents(events);
      
      // Clear events from localStorage after successful sync
      localStorage.removeItem('sable_analytics_events');
      
      console.log('[SableAnalytics] Events synced successfully');
    } catch (error) {
      console.error('[SableAnalytics] Failed to sync events:', error);
    }
  }

  /**
   * Get analytics events from localStorage
   */
  getAnalyticsEvents() {
    if (!isBrowser) return [];
    
    try {
      return JSON.parse(localStorage.getItem('sable_analytics_events') || '[]');
    } catch (error) {
      console.error('[SableAnalytics] Failed to get events:', error);
      return [];
    }
  }

  /**
   * Clear analytics events from localStorage
   */
  clearAnalyticsEvents() {
    if (!isBrowser) return;
    
    try {
      localStorage.removeItem('sable_analytics_events');
      console.log('[SableAnalytics] Events cleared from localStorage');
    } catch (error) {
      console.error('[SableAnalytics] Failed to clear events:', error);
    }
  }

  /**
   * Get analytics summary from MongoDB
   */
  async getAnalyticsSummary(startDate = null, endDate = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const eventsCollection = this.db.collection('analytics_events');
      
      // Build date filter
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Get text agent analytics
      const textAgentStats = await eventsCollection.aggregate([
        { $match: { category: 'text_agent', ...dateFilter } },
        {
          $group: {
            _id: '$data.agentId',
            started: { $sum: { $cond: [{ $eq: ['$type', 'text_agent_started'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$type', 'text_agent_completed'] }, 1, 0] } },
            abandoned: { $sum: { $cond: [{ $eq: ['$type', 'text_agent_abandoned'] }, 1, 0] } },
            totalSteps: { $sum: { $cond: [{ $eq: ['$type', 'text_agent_step_completed'] }, 1, 0] } }
          }
        },
        { $sort: { started: -1 } }
      ]).toArray();

      // Get walkthrough analytics
      const walkthroughStats = await eventsCollection.aggregate([
        { $match: { category: 'walkthrough', ...dateFilter } },
        {
          $group: {
            _id: '$data.walkthroughId',
            started: { $sum: { $cond: [{ $eq: ['$type', 'walkthrough_started'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$type', 'walkthrough_completed'] }, 1, 0] } },
            abandoned: { $sum: { $cond: [{ $eq: ['$type', 'walkthrough_abandoned'] }, 1, 0] } },
            totalSteps: { $sum: { $cond: [{ $eq: ['$type', 'walkthrough_step_completed'] }, 1, 0] } }
          }
        },
        { $sort: { started: -1 } }
      ]).toArray();

      return {
        textAgents: {
          totalStarted: textAgentStats.reduce((sum, stat) => sum + stat.started, 0),
          totalCompleted: textAgentStats.reduce((sum, stat) => sum + stat.completed, 0),
          totalAbandoned: textAgentStats.reduce((sum, stat) => sum + stat.abandoned, 0),
          topAgents: textAgentStats.slice(0, 10)
        },
        walkthroughs: {
          totalStarted: walkthroughStats.reduce((sum, stat) => sum + stat.started, 0),
          totalCompleted: walkthroughStats.reduce((sum, stat) => sum + stat.completed, 0),
          totalAbandoned: walkthroughStats.reduce((sum, stat) => sum + stat.abandoned, 0),
          topWalkthroughs: walkthroughStats.slice(0, 10)
        }
      };
    } catch (error) {
      console.error('[SableAnalytics] Failed to get analytics summary:', error);
      throw error;
    }
  }

  /**
   * Close MongoDB connection
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('[SableAnalytics] MongoDB connection closed');
    }
  }
}

// Export a function to create the connector
export function createMongoDBConnector(mongoUri) {
  return new MongoDBConnector(mongoUri);
} 