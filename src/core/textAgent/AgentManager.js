/**
 * Agent Manager
 * Handles agent registration, state management, and lifecycle
 */

export class AgentManager {
  constructor(config = {}) {
    this.config = config;
    this.agents = new Map(); // agentId -> { steps, config, state }
    this.agentInstances = new Map(); // agentId -> { instanceId, startTime, currentStepAnalyticsId, currentStepStartTime }
  }

  /**
   * Register an agent
   */
  register(agentId, steps, config = {}) {

    // Create immutable steps with IDs
    const stepsWithIds = steps.map((step, index) => ({
      ...step,
      id: step.id || `${agentId}-step-${index}`
    }));

    this.agents.set(agentId, {
      steps: stepsWithIds,
      config: {
        autoStart: config.autoStart !== undefined ? config.autoStart : true,
        autoStartOnce: config.autoStartOnce !== undefined ? config.autoStartOnce : true,
        beforeStart: config.beforeStart,
        requiredSelector: config.requiredSelector
      },
      state: {
        isRunning: false,
        currentStepIndex: -1,
        hasRenderedOnce: false,
        activePopupManager: null
      }
    });
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Check if agent exists
   */
  hasAgent(agentId) {
    return this.agents.has(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return this.agents;
  }

  /**
   * Generate a unique instance ID
   */
  generateInstanceId() {
    return `instance_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  /**
   * Create agent instance
   */
  createInstance(agentId) {
    const instanceId = this.generateInstanceId();
    const startTime = Date.now();

    this.agentInstances.set(agentId, {
      instanceId,
      startTime,
      currentStepAnalyticsId: null,
      currentStepStartTime: null
    });

    return { instanceId, startTime };
  }

  /**
   * Get agent instance
   */
  getInstance(agentId) {
    return this.agentInstances.get(agentId);
  }

  /**
   * Calculate agent duration
   */
  calculateAgentDuration(agentId) {
    const instance = this.agentInstances.get(agentId);
    if (!instance || !instance.startTime) {
      return null;
    }
    return Date.now() - instance.startTime;
  }

  /**
   * Update step tracking info
   */
  updateStepTracking(agentId, analyticsId) {
    const instance = this.agentInstances.get(agentId);
    if (instance) {
      instance.currentStepAnalyticsId = analyticsId;
      instance.currentStepStartTime = Date.now();
    }
  }

  /**
   * Get step tracking info
   */
  getStepTracking(agentId) {
    const instance = this.agentInstances.get(agentId);
    if (!instance) return null;

    return {
      analyticsId: instance.currentStepAnalyticsId,
      startTime: instance.currentStepStartTime
    };
  }

  /**
   * Clear step tracking
   */
  clearStepTracking(agentId) {
    const instance = this.agentInstances.get(agentId);
    if (instance) {
      instance.currentStepAnalyticsId = null;
      instance.currentStepStartTime = null;
    }
  }

  /**
   * Remove agent instance
   */
  removeInstance(agentId) {
    this.agentInstances.delete(agentId);
  }

  /**
   * Clear all agents
   */
  clear() {
    this.agents.clear();
    this.agentInstances.clear();
  }
}
