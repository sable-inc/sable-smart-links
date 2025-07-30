/**
 * Analytics Service for Sable Smart Links
 * Handles MongoDB analytics tracking for text agents and walkthroughs
 */

import { isBrowser } from './browserAPI.js';
import { createMongoDBConnector } from './mongodb-connector.js';

// Analytics event types
export const ANALYTICS_EVENTS = {
  TEXT_AGENT_STARTED: 'text_agent_started',
  TEXT_AGENT_STEP_COMPLETED: 'text_agent_step_completed',
  TEXT_AGENT_COMPLETED: 'text_agent_completed',
  TEXT_AGENT_ABANDONED: 'text_agent_abandoned',
  WALKTHROUGH_STARTED: 'walkthrough_started',
  WALKTHROUGH_STEP_COMPLETED: 'walkthrough_step_completed',
  WALKTHROUGH_COMPLETED: 'walkthrough_completed',
  WALKTHROUGH_ABANDONED: 'walkthrough_abandoned'
};

/**
 * Analytics Service Class
 */
export class AnalyticsService {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      batchSize: config.batchSize || 10,
      flushInterval: config.flushInterval || 5000,
      debug: config.debug || false,
      ...config
    };
    
    this.eventQueue = [];
    this.sessionId = this._generateSessionId();
    this.userId = this._getUserId();
    this.flushTimer = null;
    
    // Initialize MongoDB connector if URI is available
    this.mongoConnector = null;
    const mongoUri = process.env.SABLE_MONGODB_URI || 'mongodb+srv://angad:<db_password>@analytics.clmiobi.mongodb.net/?retryWrites=true&w=majority&appName=Analytics';
    if (mongoUri && !mongoUri.includes('<db_password>')) {
      this.mongoConnector = createMongoDBConnector(mongoUri);
    }
    
    if (this.config.enabled) {
      this._startFlushTimer();
    }
  }
  
  /**
   * Generate a unique session ID
   * @private
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get or generate user ID from localStorage
   * @private
   */
  _getUserId() {
    if (!isBrowser) return null;
    
    try {
      let userId = localStorage.getItem('sable_analytics_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sable_analytics_user_id', userId);
      }
      return userId;
    } catch (e) {
      return null;
    }
  }
  
  /**
   * Track a text agent event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  trackTextAgentEvent(eventType, data) {
    if (!this.config.enabled) return;
    
    const event = {
      type: eventType,
      category: 'text_agent',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: isBrowser ? navigator.userAgent : null,
      url: isBrowser ? window.location.href : null,
      data: {
        ...data,
        timestamp: Date.now()
      }
    };
    
    this._queueEvent(event);
  }
  
  /**
   * Track a walkthrough event
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  trackWalkthroughEvent(eventType, data) {
    if (!this.config.enabled) return;
    
    const event = {
      type: eventType,
      category: 'walkthrough',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: isBrowser ? navigator.userAgent : null,
      url: isBrowser ? window.location.href : null,
      data: {
        ...data,
        timestamp: Date.now()
      }
    };
    
    this._queueEvent(event);
  }
  
  /**
   * Queue an event for batch processing
   * @private
   */
  _queueEvent(event) {
    this.eventQueue.push(event);
    
    if (this.config.debug) {
      console.log('[SableAnalytics] Event queued:', event);
    }
    
    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  /**
   * Start the flush timer
   * @private
   */
  _startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  /**
   * Flush events to MongoDB
   */
  async flush() {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    if (this.config.debug) {
      console.log(`[SableAnalytics] Flushing ${events.length} events`);
    }
    
    try {
      if (this.mongoConnector) {
        // Store directly in MongoDB if connector is available
        await this.mongoConnector.storeEvents(events);
      } else {
        // Fallback to localStorage if no MongoDB connection
        const existingEvents = JSON.parse(localStorage.getItem('sable_analytics_events') || '[]');
        const allEvents = [...existingEvents, ...events];
        
        // Keep only last 1000 events to prevent localStorage overflow
        if (allEvents.length > 1000) {
          allEvents.splice(0, allEvents.length - 1000);
        }
        
        localStorage.setItem('sable_analytics_events', JSON.stringify(allEvents));
        
        if (this.config.debug) {
          console.log('[SableAnalytics] Events stored in localStorage (MongoDB not configured)');
        }
      }
    } catch (error) {
      console.error('[SableAnalytics] Failed to store events:', error);
      
      // Re-queue events on failure (with limit to prevent infinite loops)
      if (events.length < 100) {
        this.eventQueue.unshift(...events);
      }
    }
  }
  
  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.flushTimer) {
      this._startFlushTimer();
    } else if (!this.config.enabled && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  /**
   * Get analytics summary from MongoDB
   */
  async getAnalyticsSummary(startDate = null, endDate = null) {
    if (this.mongoConnector) {
      return await this.mongoConnector.getAnalyticsSummary(startDate, endDate);
    } else {
      console.warn('[SableAnalytics] MongoDB connector not available. Cannot get analytics summary.');
      return null;
    }
  }

  /**
   * Sync events from localStorage to MongoDB
   */
  async syncFromLocalStorage() {
    if (this.mongoConnector) {
      return await this.mongoConnector.syncAnalyticsEvents();
    } else {
      console.warn('[SableAnalytics] MongoDB connector not available. Cannot sync events.');
    }
  }

  /**
   * Destroy the analytics service
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining events
    this.flush();
    
    // Close MongoDB connection
    if (this.mongoConnector) {
      this.mongoConnector.close();
    }
  }
}

// Singleton instance
let _analyticsInstance = null;

/**
 * Get the global analytics instance
 */
export function getAnalyticsInstance() {
  return _analyticsInstance;
}

/**
 * Initialize the global analytics instance
 */
export function initAnalytics(config = {}) {
  if (_analyticsInstance) {
    _analyticsInstance.updateConfig(config);
    return _analyticsInstance;
  }
  
  _analyticsInstance = new AnalyticsService(config);
  return _analyticsInstance;
}

/**
 * Reset the global analytics instance
 */
export function resetAnalytics() {
  if (_analyticsInstance) {
    _analyticsInstance.destroy();
    _analyticsInstance = null;
  }
} 