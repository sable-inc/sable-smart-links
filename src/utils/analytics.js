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
      instanceId,
      stepDuration = null,
      agentDuration = null,
      metadata = {}
    } = eventData;
    
    // Validate required fields
    if (!event || !agentId || stepId === undefined) {
      console.error('[SableAnalytics] Missing required fields for analytics event:', eventData);
      return;
    }
    
    const analyticsPayload = {
      event,
      agentId,
      stepId,
      instanceId,
      stepDuration,
      agentDuration,
      sessionId: getOrCreateSessionId(),
      userId: getOrCreateUserId(),
      metadata: {
        ...metadata,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    const apiUrl = `${getApiBaseUrl()}/api/analytics/text-agent`;
    console.log('[SableAnalytics] Attempting to log event:', event, 'to:', apiUrl);
    console.log('[SableAnalytics] DEBUG: Full analytics payload:', analyticsPayload);
    
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
      return result.id; // Return the MongoDB ID for potential updates
    } else {
      console.error('[SableAnalytics] Failed to log event:', result);
      return null;
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
    return null;
  }
};

// Update text agent analytics event with step duration
export const updateTextAgentEventDuration = async (analyticsId, stepDuration) => {
  if (!isBrowser) {
    console.warn('[SableAnalytics] Cannot update analytics in non-browser environment');
    return;
  }
  
  if (!analyticsId || stepDuration === null || stepDuration === undefined) {
    console.warn('[SableAnalytics] Missing analytics ID or step duration for update');
    return;
  }
  
  try {
    const apiUrl = `${getApiBaseUrl()}/api/analytics/text-agent/${analyticsId}`;
    console.log('[SableAnalytics] Attempting to update event duration:', analyticsId, 'duration:', stepDuration);
    
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({ stepDuration })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analytics API update error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('[SableAnalytics] Event duration updated successfully:', analyticsId);
    } else {
      console.error('[SableAnalytics] Failed to update event duration:', result);
    }
  } catch (error) {
    console.error('[SableAnalytics] Error updating analytics event duration:', error);
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
export const logTextAgentStart = (agentId, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logTextAgentEvent({
    event: 'start',
    agentId,
    stepId,
    instanceId,
    agentDuration,
    metadata: {
      ...metadata,
      triggerType: 'manual' // Auto-start events are not logged
    }
  });
};

export const logTextAgentNext = (agentId, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logTextAgentEvent({
    event: 'next',
    agentId,
    stepId,
    instanceId,
    agentDuration,
    metadata
  });
};

export const logTextAgentPrevious = (agentId, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logTextAgentEvent({
    event: 'previous',
    agentId,
    stepId,
    instanceId,
    agentDuration,
    metadata
  });
};

export const logTextAgentEnd = (agentId, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  console.log(`[SableAnalytics] DEBUG: logTextAgentEnd called with:`, {
    agentId,
    stepId,
    instanceId,
    metadata,
    agentDuration
  });
  return logTextAgentEvent({
    event: 'end',
    agentId,
    stepId,
    instanceId,
    agentDuration,
    metadata
  });
};

export const logTextAgentRestart = (agentId, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logTextAgentEvent({
    event: 'restart',
    agentId,
    stepId,
    instanceId,
    agentDuration,
    metadata
  });
};

export const logTextAgentStepRendered = (agentId, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logTextAgentEvent({
    event: 'step_rendered',
    agentId,
    stepId,
    instanceId,
    agentDuration,
    metadata
  });
};

// Log walkthrough analytics event
export const logWalkthroughEvent = async (eventData) => {
  if (!isBrowser) {
    console.warn('[SableAnalytics] Cannot log analytics in non-browser environment');
    return;
  }
  
  try {
    const {
      event,
      walkthroughId,
      stepIndex,
      stepId,
      stepSelector,
      instanceId,
      stepDuration = null,
      agentDuration = null,
      metadata = {}
    } = eventData;
    
    // Validate required fields
    if (!event || !walkthroughId || stepIndex === undefined || !stepId) {
      console.error('[SableAnalytics] Missing required fields for walkthrough analytics event:', eventData);
      return;
    }
    
    const analyticsPayload = {
      event,
      walkthroughId,
      stepIndex,
      stepId,
      stepSelector: stepSelector || null,
      instanceId: instanceId || null,
      stepDuration: stepDuration !== undefined ? stepDuration : null,
      agentDuration: agentDuration !== undefined ? agentDuration : null,
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
    
    const apiUrl = `${getApiBaseUrl()}/api/analytics/walkthrough`;
    console.log('[SableAnalytics] Attempting to log walkthrough event:', event, 'to:', apiUrl);
    console.log('[SableAnalytics] DEBUG: Full walkthrough analytics payload:', analyticsPayload);
    
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
      throw new Error(`Walkthrough Analytics API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('[SableAnalytics] Walkthrough event logged successfully:', event);
      return result.id; // Return the MongoDB ID for potential updates
    } else {
      console.error('[SableAnalytics] Failed to log walkthrough event:', result);
      return null;
    }
  } catch (error) {
    console.error('[SableAnalytics] Error logging walkthrough analytics event:', error);
    console.error('[SableAnalytics] Error details:', {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      apiUrl: getApiBaseUrl()
    });
    // Don't throw - analytics failures shouldn't break the app
    return null;
  }
};

// Update walkthrough analytics event with step duration
export const updateWalkthroughEventDuration = async (analyticsId, stepDuration) => {
  if (!isBrowser) {
    console.warn('[SableAnalytics] Cannot update analytics in non-browser environment');
    return;
  }
  
  if (!analyticsId || stepDuration === null || stepDuration === undefined) {
    console.warn('[SableAnalytics] Missing analytics ID or step duration for update');
    return;
  }
  
  try {
    const apiUrl = `${getApiBaseUrl()}/api/analytics/walkthrough/${analyticsId}`;
    console.log('[SableAnalytics] Attempting to update walkthrough event duration:', analyticsId, 'duration:', stepDuration);
    
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({ stepDuration })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walkthrough Analytics API update error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('[SableAnalytics] Walkthrough event duration updated successfully:', analyticsId);
    } else {
      console.error('[SableAnalytics] Failed to update walkthrough event duration:', result);
    }
  } catch (error) {
    console.error('[SableAnalytics] Error updating walkthrough analytics event duration:', error);
    console.error('[SableAnalytics] Error details:', {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      apiUrl: getApiBaseUrl()
    });
    // Don't throw - analytics failures shouldn't break the app
  }
};

// Log specific walkthrough events
export const logWalkthroughStart = (walkthroughId, stepIndex, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logWalkthroughEvent({
    event: 'start',
    walkthroughId,
    stepIndex,
    stepId,
    instanceId,
    agentDuration,
    metadata: {
      ...metadata,
      walkthroughType: metadata.walkthroughType || 'tutorial'
    }
  });
};

export const logWalkthroughNext = (walkthroughId, stepIndex, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logWalkthroughEvent({
    event: 'next',
    walkthroughId,
    stepIndex,
    stepId,
    instanceId,
    agentDuration,
    metadata
  });
};

export const logWalkthroughEnd = (walkthroughId, stepIndex, stepId, instanceId = null, metadata = {}, agentDuration = null) => {
  return logWalkthroughEvent({
    event: 'end',
    walkthroughId,
    stepIndex,
    stepId,
    instanceId,
    agentDuration,
    metadata
  });
};

export const logWalkthroughStepExecuted = (walkthroughId, stepIndex, stepId, stepSelector, instanceId = null, metadata = {}, agentDuration = null) => {
  return logWalkthroughEvent({
    event: 'step_executed',
    walkthroughId,
    stepIndex,
    stepId,
    stepSelector,
    instanceId,
    agentDuration,
    metadata
  });
};

export const logWalkthroughStepError = (walkthroughId, stepIndex, stepId, stepSelector, instanceId = null, metadata = {}, agentDuration = null) => {
  return logWalkthroughEvent({
    event: 'step_error',
    walkthroughId,
    stepIndex,
    stepId,
    stepSelector,
    instanceId,
    agentDuration,
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

// Log crawl Bedrock query analytics event
export const logCrawlBedrockQuery = async (eventData) => {
  if (!isBrowser) {
    console.log('[SableAnalytics] Logging crawl Bedrock query in non-browser environment');
  }
  
  try {
    const {
      url,
      instructions,
      output = null,
      duration,
      error = null
    } = eventData;
    
    // Validate required fields
    if (!url || !instructions || duration === undefined || duration === null) {
      console.error('[SableAnalytics] Missing required fields for crawl Bedrock analytics event:', eventData);
      return;
    }
    
    const analyticsPayload = {
      input: {
        url,
        instructions
      },
      output,
      duration,
      error,
      sessionId: isBrowser ? getOrCreateSessionId() : null,
      userId: isBrowser ? getOrCreateUserId() : null,
      timestamp: new Date().toISOString()
    };
    
    const apiUrl = `${getApiBaseUrl()}/api/analytics/crawl-bedrock`;
    console.log('[SableAnalytics] Attempting to log crawl Bedrock query to:', apiUrl);
    console.log('[SableAnalytics] DEBUG: Full crawl Bedrock analytics payload:', analyticsPayload);
    
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
      throw new Error(`Crawl Bedrock Analytics API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('[SableAnalytics] Crawl Bedrock query logged successfully');
      return result.id; // Return the MongoDB ID for potential updates
    } else {
      console.error('[SableAnalytics] Failed to log crawl Bedrock query:', result);
      return null;
    }
  } catch (error) {
    console.error('[SableAnalytics] Error logging crawl Bedrock analytics event:', error);
    console.error('[SableAnalytics] Error details:', {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      apiUrl: getApiBaseUrl()
    });
    // Don't throw - analytics failures shouldn't break the app
    return null;
  }
};

// Log search Bedrock query analytics event
export const logSearchBedrockQuery = async (eventData) => {
  if (!isBrowser) {
    console.log('[SableAnalytics] Logging search Bedrock query in non-browser environment');
  }
  
  try {
    const {
      query,
      output = null,
      duration,
      error = null
    } = eventData;
    
    // Validate required fields
    if (!query || duration === undefined || duration === null) {
      console.error('[SableAnalytics] Missing required fields for search Bedrock analytics event:', eventData);
      return;
    }
    
    const analyticsPayload = {
      input: {
        query
      },
      output,
      duration,
      error,
      sessionId: isBrowser ? getOrCreateSessionId() : null,
      userId: isBrowser ? getOrCreateUserId() : null,
      timestamp: new Date().toISOString()
    };
    
    const apiUrl = `${getApiBaseUrl()}/api/analytics/search-bedrock`;
    console.log('[SableAnalytics] Attempting to log search Bedrock query to:', apiUrl);
    console.log('[SableAnalytics] DEBUG: Full search Bedrock analytics payload:', analyticsPayload);
    
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
      throw new Error(`Search Bedrock Analytics API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('[SableAnalytics] Search Bedrock query logged successfully');
      return result.id; // Return the MongoDB ID for potential updates
    } else {
      console.error('[SableAnalytics] Failed to log search Bedrock query:', result);
      return null;
    }
  } catch (error) {
    console.error('[SableAnalytics] Error logging search Bedrock analytics event:', error);
    console.error('[SableAnalytics] Error details:', {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      apiUrl: getApiBaseUrl()
    });
    // Don't throw - analytics failures shouldn't break the app
    return null;
  }
}; 