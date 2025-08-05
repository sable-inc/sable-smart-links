/**
 * Analytics utility for Sable Smart Links
 * Handles text agent analytics logging with session and user ID management
 */

import { isBrowser } from './browserAPI.js';

// Analytics API configuration
const ANALYTICS_CONFIG = {
  dev: {
    baseUrl: 'http://localhost:3001'
  },
  prod: {
    baseUrl: 'https://sable-smart-links.vercel.app'
  }
};

// Get the appropriate API base URL based on environment
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return ANALYTICS_CONFIG.dev.baseUrl;
  }
  
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return ANALYTICS_CONFIG.dev.baseUrl;
  }
  
  return ANALYTICS_CONFIG.prod.baseUrl;
};

// Generate or retrieve session ID from sessionStorage
const getOrCreateSessionId = () => {
  if (!isBrowser) {
    return `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }
  
  let sessionId = sessionStorage.getItem('sable_analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    sessionStorage.setItem('sable_analytics_session_id', sessionId);
  }
  return sessionId;
};

// Generate or retrieve user ID from localStorage
const getOrCreateUserId = () => {
  if (!isBrowser) {
    return `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }
  
  let userId = localStorage.getItem('sable_analytics_user_id');
  if (!userId) {
    userId = `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    localStorage.setItem('sable_analytics_user_id', userId);
  }
  return userId;
};

// Log text agent analytics event
export const logTextAgentEvent = async (eventData) => {
  if (!isBrowser) {
    console.warn('[SableAnalytics] Cannot log analytics in non-browser environment');
    return;
  }
  
  try {
    const {
      event,
      agentId,
      stepId,
      stepIndex,
      metadata = {}
    } = eventData;
    
    // Validate required fields
    if (!event || !agentId || stepId === undefined || stepIndex === undefined) {
      console.error('[SableAnalytics] Missing required fields for analytics event:', eventData);
      return;
    }
    
    const analyticsPayload = {
      event,
      agentId,
      stepId,
      stepIndex,
      sessionId: getOrCreateSessionId(),
      userId: getOrCreateUserId(),
      metadata: {
        ...metadata,
        pageUrl: window.location.href,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    const apiUrl = `${getApiBaseUrl()}/api/analytics/text-agent`;
    console.log('[SableAnalytics] Attempting to log event:', event, 'to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(analyticsPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analytics API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('[SableAnalytics] Event logged successfully:', event);
    } else {
      console.error('[SableAnalytics] Failed to log event:', result);
    }
  } catch (error) {
    console.error('[SableAnalytics] Error logging analytics event:', error);
    console.error('[SableAnalytics] Error details:', {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      apiUrl: getApiBaseUrl()
    });
    // Don't throw - analytics failures shouldn't break the app
  }
};

// Log specific text agent events
export const logTextAgentStart = (agentId, stepId, stepIndex, metadata = {}) => {
  return logTextAgentEvent({
    event: 'start',
    agentId,
    stepId,
    stepIndex,
    metadata: {
      ...metadata,
      triggerType: metadata.autoStart ? 'auto' : 'manual'
    }
  });
};

export const logTextAgentNext = (agentId, stepId, stepIndex, metadata = {}) => {
  return logTextAgentEvent({
    event: 'next',
    agentId,
    stepId,
    stepIndex,
    metadata
  });
};

export const logTextAgentPrevious = (agentId, stepId, stepIndex, metadata = {}) => {
  return logTextAgentEvent({
    event: 'previous',
    agentId,
    stepId,
    stepIndex,
    metadata
  });
};

export const logTextAgentEnd = (agentId, stepId, stepIndex, metadata = {}) => {
  return logTextAgentEvent({
    event: 'end',
    agentId,
    stepId,
    stepIndex,
    metadata
  });
};

export const logTextAgentRestart = (agentId, stepId, stepIndex, metadata = {}) => {
  return logTextAgentEvent({
    event: 'restart',
    agentId,
    stepId,
    stepIndex,
    metadata
  });
};

export const logTextAgentStepRendered = (agentId, stepId, stepIndex, metadata = {}) => {
  return logTextAgentEvent({
    event: 'step_rendered',
    agentId,
    stepId,
    stepIndex,
    metadata
  });
};

export const logTextAgentStepTriggered = (agentId, stepId, stepIndex, metadata = {}) => {
  return logTextAgentEvent({
    event: 'step_triggered',
    agentId,
    stepId,
    stepIndex,
    metadata
  });
};

// Utility functions for session and user management
export const getCurrentSessionId = () => {
  return getOrCreateSessionId();
};

export const getCurrentUserId = () => {
  return getOrCreateUserId();
};

export const resetSessionId = () => {
  if (isBrowser) {
    sessionStorage.removeItem('sable_analytics_session_id');
  }
};

export const resetUserId = () => {
  if (isBrowser) {
    localStorage.removeItem('sable_analytics_user_id');
  }
}; 