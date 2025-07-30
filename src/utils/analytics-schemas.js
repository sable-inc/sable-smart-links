/**
 * MongoDB Schema Definitions for Sable Smart Links Analytics
 * These schemas define the structure of analytics data stored in MongoDB
 */

/**
 * Base Analytics Event Schema
 * Common fields for all analytics events
 */
export const BaseAnalyticsEventSchema = {
  // Event identification
  type: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true }, // 'text_agent' or 'walkthrough'
  
  // User and session tracking
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  
  // Timestamp and metadata
  timestamp: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  
  // Browser and environment info
  userAgent: { type: String },
  url: { type: String },
  referrer: { type: String },
  
  // Event-specific data
  data: { type: Object, required: true }
};

/**
 * Text Agent Analytics Event Schema
 */
export const TextAgentEventSchema = {
  ...BaseAnalyticsEventSchema,
  
  // Text agent specific fields
  data: {
    // Agent identification
    agentId: { type: String, required: true, index: true },
    stepId: { type: String, index: true },
    
    // Timing information
    stepStartTime: { type: Date },
    stepEndTime: { type: Date },
    stepDuration: { type: Number }, // in milliseconds
    
    // Step information
    stepIndex: { type: Number },
    totalSteps: { type: Number },
    stepType: { type: String }, // 'text', 'input', 'action', etc.
    
    // User interaction
    userInput: { type: String },
    buttonClicked: { type: String }, // 'next', 'previous', 'yes', 'no', etc.
    
    // Completion status
    isCompleted: { type: Boolean, default: false },
    completionReason: { type: String }, // 'completed', 'abandoned', 'error'
    
    // Error tracking
    error: { type: String },
    errorStack: { type: String },
    
    // Additional metadata
    metadata: { type: Object }
  }
};

/**
 * Walkthrough Analytics Event Schema
 */
export const WalkthroughEventSchema = {
  ...BaseAnalyticsEventSchema,
  
  // Walkthrough specific fields
  data: {
    // Walkthrough identification
    walkthroughId: { type: String, required: true, index: true },
    stepId: { type: String, index: true },
    
    // Timing information
    stepStartTime: { type: Date },
    stepEndTime: { type: Date },
    stepDuration: { type: Number }, // in milliseconds
    
    // Step information
    stepIndex: { type: Number },
    totalSteps: { type: Number },
    stepType: { type: String }, // 'highlight', 'tooltip', 'spotlight', 'action'
    
    // UI elements
    targetElement: { type: String }, // CSS selector
    elementType: { type: String }, // 'button', 'input', 'div', etc.
    
    // User interaction
    userAction: { type: String }, // 'click', 'input', 'hover', etc.
    actionValue: { type: String },
    
    // Completion status
    isCompleted: { type: Boolean, default: false },
    completionReason: { type: String }, // 'completed', 'abandoned', 'error'
    
    // Error tracking
    error: { type: String },
    errorStack: { type: String },
    
    // Additional metadata
    metadata: { type: Object }
  }
};

/**
 * Analytics Session Schema
 * Aggregated session-level analytics
 */
export const AnalyticsSessionSchema = {
  // Session identification
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  
  // Session timing
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date },
  duration: { type: Number }, // in milliseconds
  
  // Session metadata
  userAgent: { type: String },
  url: { type: String },
  referrer: { type: String },
  
  // Text agent analytics
  textAgents: {
    started: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    abandoned: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 0 },
    averageStepTime: { type: Number, default: 0 },
    agents: [{
      agentId: { type: String },
      started: { type: Date },
      completed: { type: Date },
      duration: { type: Number },
      stepsCompleted: { type: Number },
      totalSteps: { type: Number }
    }]
  },
  
  // Walkthrough analytics
  walkthroughs: {
    started: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    abandoned: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 0 },
    averageStepTime: { type: Number, default: 0 },
    walkthroughs: [{
      walkthroughId: { type: String },
      started: { type: Date },
      completed: { type: Date },
      duration: { type: Number },
      stepsCompleted: { type: Number },
      totalSteps: { type: Number }
    }]
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true }
};

/**
 * Analytics Summary Schema
 * Daily/weekly/monthly aggregated analytics
 */
export const AnalyticsSummarySchema = {
  // Time period
  period: { type: String, required: true, index: true }, // 'daily', 'weekly', 'monthly'
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  
  // User metrics
  uniqueUsers: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  averageSessionDuration: { type: Number, default: 0 },
  
  // Text agent metrics
  textAgents: {
    totalStarted: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    totalAbandoned: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }, // percentage
    averageCompletionTime: { type: Number, default: 0 }, // in milliseconds
    averageStepsPerAgent: { type: Number, default: 0 },
    topAgents: [{
      agentId: { type: String },
      started: { type: Number },
      completed: { type: Number },
      completionRate: { type: Number }
    }]
  },
  
  // Walkthrough metrics
  walkthroughs: {
    totalStarted: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    totalAbandoned: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }, // percentage
    averageCompletionTime: { type: Number, default: 0 }, // in milliseconds
    averageStepsPerWalkthrough: { type: Number, default: 0 },
    topWalkthroughs: [{
      walkthroughId: { type: String },
      started: { type: Number },
      completed: { type: Number },
      completionRate: { type: Number }
    }]
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true }
};

/**
 * Helper function to create MongoDB indexes for analytics collections
 */
export const createAnalyticsIndexes = (db) => {
  // Events collection indexes
  const eventsCollection = db.collection('analytics_events');
  
  eventsCollection.createIndex({ type: 1, timestamp: -1 });
  eventsCollection.createIndex({ category: 1, timestamp: -1 });
  eventsCollection.createIndex({ userId: 1, timestamp: -1 });
  eventsCollection.createIndex({ sessionId: 1, timestamp: -1 });
  eventsCollection.createIndex({ 'data.agentId': 1, timestamp: -1 });
  eventsCollection.createIndex({ 'data.walkthroughId': 1, timestamp: -1 });
  eventsCollection.createIndex({ createdAt: -1 });
  
  // Sessions collection indexes
  const sessionsCollection = db.collection('analytics_sessions');
  
  sessionsCollection.createIndex({ sessionId: 1 }, { unique: true });
  sessionsCollection.createIndex({ userId: 1, startTime: -1 });
  sessionsCollection.createIndex({ startTime: -1 });
  sessionsCollection.createIndex({ createdAt: -1 });
  
  // Summary collection indexes
  const summaryCollection = db.collection('analytics_summaries');
  
  summaryCollection.createIndex({ period: 1, startDate: -1 });
  summaryCollection.createIndex({ startDate: -1, endDate: -1 });
  summaryCollection.createIndex({ createdAt: -1 });
};

/**
 * Helper function to validate analytics event data
 */
export const validateAnalyticsEvent = (event, category) => {
  const requiredFields = ['type', 'category', 'userId', 'sessionId', 'timestamp', 'data'];
  
  for (const field of requiredFields) {
    if (!event[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (event.category !== category) {
    throw new Error(`Invalid category: expected ${category}, got ${event.category}`);
  }
  
  // Validate category-specific required fields
  if (category === 'text_agent' && !event.data.agentId) {
    throw new Error('Text agent events require agentId in data');
  }
  
  if (category === 'walkthrough' && !event.data.walkthroughId) {
    throw new Error('Walkthrough events require walkthroughId in data');
  }
  
  return true;
}; 