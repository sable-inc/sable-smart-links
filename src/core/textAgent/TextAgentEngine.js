/**
 * Text Agent Engine (Refactored)
 * Core functionality for managing and executing text agent guides
 * Uses modular components for better separation of concerns
 */

import { AgentManager } from './AgentManager.js';
import { TriggerManager } from './TriggerManager.js';
import { PopupRenderer } from './PopupRenderer.js';
import { AutoStartManager } from './AutoStartManager.js';
import globalPopupManager from '../../ui/GlobalPopupManager.js';
import {
  logTextAgentStart,
  logTextAgentNext,
  logTextAgentPrevious,
  logTextAgentEnd,
  logTextAgentRestart,
  logTextAgentStepRendered,
  updateTextAgentEventDuration
} from '../../utils/analytics.js';

// Singleton instance
let _instance = null;

export class TextAgentEngine {
  constructor(config = {}) {
    // Singleton check
    if (_instance) {
      if (config.debug) {
        console.warn('[SableTextAgent] TextAgentEngine instance already exists. Returning existing instance.');
      }
      return _instance;
    }

    // Configuration
    this.config = {
      debug: false,
      stepDelay: 500,
      primaryColor: '#FFFFFF',
      defaultBoxWidth: 300,
      ...config
    };

    // Initialize modular components
    this.agentManager = new AgentManager(this.config);
    this.triggerManager = new TriggerManager(this.config);
    this.popupRenderer = new PopupRenderer(this.config);
    this.autoStartManager = new AutoStartManager(this.config);

    // Set up popup state listener for step duration tracking
    this._setupPopupStateListener();

    // Set up event listeners
    this._setupEventListeners();

    // Store singleton instance
    _instance = this;
  }

  static getInstance() {
    return _instance;
  }

  static resetInstance() {
    if (_instance) {
      _instance.destroy();
      _instance = null;
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    // Update config in all managers
    this.agentManager.config = this.config;
    this.triggerManager.config = this.config;
    this.popupRenderer.config = this.config;
    this.autoStartManager.config = this.config;
  }

  init() {
    if (this.config.debug) {
      console.log('[SableTextAgent] Initializing');
    }

    // Initialize auto-start manager with callbacks and agents map
    this.autoStartManager.init(
      (agentId, stepId, skipTrigger, isAutoStart) => this.start(agentId, stepId, skipTrigger, isAutoStart),
      (agentId) => this.end(agentId),
      this.agentManager.getAllAgents()
    );

    // Set up step completion callback
    this.popupRenderer.onStepComplete = (agentId) => this.next(agentId);

    // Set up agent end callback
    this.popupRenderer.onAgentEnd = (agentId) => this.end(agentId);

    return this;
  }

  /**
   * Set up event listeners for agent control
   */
  _setupEventListeners() {
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for sable:textAgentStart events
    this._textAgentStartHandler = (event) => {
      const { agentId, stepId, skipTrigger } = event.detail || {};

      if (this.config.debug) {
        console.log('[SableTextAgent] DEBUG: Received sable:textAgentStart event:', { agentId, stepId, skipTrigger });
      }

      if (agentId && this.agentManager.hasAgent(agentId)) {
        this.start(agentId, stepId, skipTrigger);
      } else if (agentId) {
        if (this.config.debug) {
          console.warn(`[SableTextAgent] Agent "${agentId}" not found when handling sable:textAgentStart event`);
        }
      }
    };

    // Listen for sable:textAgentEnd events
    this._textAgentEndHandler = (event) => {
      const { agentId } = event.detail || {};

      if (this.config.debug) {
        console.log('[SableTextAgent] DEBUG: Received sable:textAgentEnd event:', { agentId });
      }

      if (agentId && this.agentManager.hasAgent(agentId)) {
        this.end(agentId);
      }
    };

    window.addEventListener('sable:textAgentStart', this._textAgentStartHandler);
    window.addEventListener('sable:textAgentEnd', this._textAgentEndHandler);
  }

  /**
   * Set up popup state listener for step duration tracking
   */
  _setupPopupStateListener() {
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for popup state changes
    this._popupStateHandler = (state) => {
      if (this.config.debug) {
        console.log('[SableTextAgent] DEBUG: Popup state changed:', state);
      }

      // If popup is no longer active, update step duration for all running agents
      if (!state.hasActivePopup) {
        for (const [agentId, agent] of this.agentManager.getAllAgents().entries()) {
          if (agent.state.isRunning) {
            this._updatePreviousStepDuration(agentId);
          }
        }
      }
    };

    globalPopupManager.addListener(this._popupStateHandler);
  }

  /**
   * Register an agent
   */
  register(agentId, steps, config = {}) {
    this.agentManager.register(agentId, steps, config);
    // Update agents reference in autoStartManager and check triggers
    this.autoStartManager.updateAgents(this.agentManager.getAllAgents());
  }

  /**
   * Start a specific agent
   */
  async start(agentId, stepId = null, skipTrigger = false, isAutoStart = false) {
    if (!this.agentManager.hasAgent(agentId)) {
      if (this.config.debug) {
        console.warn(`[SableTextAgent] Agent "${agentId}" not registered`);
      }
      return false;
    }

    const agent = this.agentManager.getAgent(agentId);
    const { config, state } = agent;

    if (this.config.debug) {
      console.log(`[SableTextAgent] DEBUG: Starting agent "${agentId}" with stepId: "${stepId}", skipTrigger: ${skipTrigger}, isAutoStart: ${isAutoStart}`);
      console.log(`[SableTextAgent] DEBUG: Agent state - isRunning: ${state.isRunning}, currentStepIndex: ${state.currentStepIndex}`);
    }

    // Check if agent is already running and stepId is specified
    if (state.isRunning && stepId) {
      if (this.config.debug) {
        console.log(`[SableTextAgent] Agent "${agentId}" is already running, navigating to step "${stepId}"`);
      }

      // Find the target step index
      const targetStepIndex = agent.steps.findIndex(step => step.id === stepId);

      if (targetStepIndex === -1) {
        if (this.config.debug) {
          console.warn(`[SableTextAgent] Step "${stepId}" not found in agent "${agentId}"`);
        }
        return false;
      }

      // Check if we're already on the target step to prevent duplicate rendering
      if (state.currentStepIndex === targetStepIndex) {
        if (this.config.debug) {
          console.log(`[SableTextAgent] DEBUG: Already on target step "${stepId}" (index: ${targetStepIndex}), skipping navigation`);
        }
        // If skipTrigger is true and we're on the same step, render it anyway
        if (skipTrigger) {
          if (this.config.debug) {
            console.log(`[SableTextAgent] DEBUG: skipTrigger is true, rendering current step anyway`);
          }
          await this._renderCurrentStep(agentId, false);
        }
        return true;
      }

      // Clean up current step
      this._cleanupCurrentStep(agentId);

      // Update current step index to target step
      state.currentStepIndex = targetStepIndex;

      // Render the new step
      await this._renderCurrentStep(agentId, false);

      return true;
    }

    // Handle case where agent is running but no stepId specified
    if (state.isRunning && skipTrigger) {
      if (this.config.debug) {
        console.log(`[SableTextAgent] DEBUG: Agent "${agentId}" is already running but skipTrigger is true, rendering current step`);
      }
      await this._renderCurrentStep(agentId, false);
      return true;
    }

    if (this.config.debug) {
      console.log(`[SableTextAgent] Starting agent "${agentId}"${isAutoStart ? ' (auto-start)' : ''}`);
    }

    // Run beforeStart if provided and not auto-starting
    if (!isAutoStart && typeof config.beforeStart === 'function') {
      await config.beforeStart();
    }

    // Create new instance
    const { instanceId, startTime } = this.agentManager.createInstance(agentId);

    // Update state
    state.isRunning = true;
    state.currentStepIndex = stepId ?
      agent.steps.findIndex(step => step.id === stepId) : 0;

    if (state.currentStepIndex === -1) {
      state.currentStepIndex = 0;
    }

    // Log analytics for agent start
    const currentStep = agent.steps[state.currentStepIndex];
    if (currentStep && !isAutoStart) {
      await logTextAgentStart(
        agentId,
        currentStep.id,
        instanceId,
        { skipTrigger, stepId },
        null // agentDuration is null for start event
      );
    }

    // Render first step
    if (skipTrigger) {
      await this._renderCurrentStep(agentId, isAutoStart);
    } else {
      this._setupStepTrigger(agentId, isAutoStart);
    }

    return true;
  }

  /**
   * Set up trigger for current step
   */
  _setupStepTrigger(agentId, isAutoStart = false) {
    const agent = this.agentManager.getAgent(agentId);
    const step = agent.steps[agent.state.currentStepIndex];

    if (!step) {
      this._endAgent(agentId);
      return;
    }

    const cleanup = this.triggerManager.setupTrigger(
      agentId,
      step,
      async () => await this._renderCurrentStep(agentId, isAutoStart),
      isAutoStart
    );

    // Store cleanup function
    agent.state.triggerCleanup = cleanup;
  }

  /**
   * Render the current step
   */
  async _renderCurrentStep(agentId, isAutoStart = false, triggerInfo = null) {
    const agent = this.agentManager.getAgent(agentId);
    const { steps, state, config } = agent;
    const instance = this.agentManager.getInstance(agentId);

    if (state.currentStepIndex < 0 || state.currentStepIndex >= steps.length) {
      this._endAgent(agentId);
      return;
    }

    const step = steps[state.currentStepIndex];

    // Create agent info for analytics
    const agentInfo = {
      agentId,
      stepId: step.id,
      instanceId: instance.instanceId,
      agentStartTime: instance.startTime
    };

    // Render step
    const result = await this.popupRenderer.renderStep(agentId, step, agentInfo);

    if (result.shouldAdvance) {
      this.next(agentId);
      return;
    }

    // Log analytics for step rendered
    const analyticsId = await logTextAgentStepRendered(
      agentId,
      step.id,
      instance.instanceId,
      {
        isAutoStart,
        stepType: step.buttonType || 'popup',
        hasTargetElement: !!result.targetElement,
        targetSelector: step.targetElement?.selector,
        ...(triggerInfo && { triggerInfo })
      },
      this.agentManager.calculateAgentDuration(agentId)
    );

    // Store tracking info for step duration
    if (analyticsId) {
      this.agentManager.updateStepTracking(agentId, analyticsId);
    }

    // Set autoStartOnce localStorage key when first step is rendered (only for auto-starts)
    if (isAutoStart && config.autoStart && config.autoStartOnce) {
      this.autoStartManager.setAutoStartOnce(agentId);
    }

    // Update agent state
    if (result.popupManager) {
      agent.state.activePopupManager = result.popupManager;
      agent.state.hasRenderedOnce = true;
    }
  }

  /**
   * Move to next step
   */
  async next(agentId) {
    if (!agentId || !this.agentManager.hasAgent(agentId)) {
      return;
    }

    const agent = this.agentManager.getAgent(agentId);
    const { steps, state } = agent;

    // Get current step before cleanup for analytics
    const currentStep = steps[state.currentStepIndex];

    // Clean up current step
    this._cleanupCurrentStep(agentId);

    if (state.currentStepIndex < steps.length - 1) {
      state.currentStepIndex++;

      // Log analytics for next step
      const nextStep = steps[state.currentStepIndex];
      if (nextStep) {
        await logTextAgentNext(
          agentId,
          nextStep.id,
          this.agentManager.getInstance(agentId)?.instanceId,
          {
            previousStepId: currentStep?.id,
            previousStepIndex: state.currentStepIndex - 1,
            isLastStep: false
          },
          this.agentManager.calculateAgentDuration(agentId)
        );
      }

      this._renderCurrentStep(agentId, false);
    } else {
      // End of steps - end the agent
      if (currentStep) {
        await logTextAgentEnd(
          agentId,
          currentStep.id,
          this.agentManager.getInstance(agentId)?.instanceId,
          {
            stepsCompleted: steps.length,
            completionReason: 'user_finished'
          },
          this.agentManager.calculateAgentDuration(agentId)
        );
      }

      this._endAgent(agentId);
    }
  }

  /**
   * Move to previous step
   */
  async previous(agentId) {
    if (!agentId || !this.agentManager.hasAgent(agentId)) {
      return;
    }

    const agent = this.agentManager.getAgent(agentId);
    const { steps, state } = agent;

    // Get current step before cleanup for analytics
    const currentStep = steps[state.currentStepIndex];

    this._cleanupCurrentStep(agentId);

    if (state.currentStepIndex > 0) {
      state.currentStepIndex--;

      // Log analytics for previous step
      const previousStep = steps[state.currentStepIndex];
      if (previousStep) {
        await logTextAgentPrevious(
          agentId,
          previousStep.id,
          this.agentManager.getInstance(agentId)?.instanceId,
          {
            nextStepId: currentStep?.id,
            nextStepIndex: state.currentStepIndex + 1
          },
          this.agentManager.calculateAgentDuration(agentId)
        );
      }

      await this._renderCurrentStep(agentId, false);
    }
  }

  /**
   * Update previous step duration and reset tracking
   */
  _updatePreviousStepDuration(agentId) {
    const tracking = this.agentManager.getStepTracking(agentId);
    if (!tracking) return;

    if (tracking.analyticsId && tracking.startTime) {
      const stepDuration = Date.now() - tracking.startTime;
      updateTextAgentEventDuration(tracking.analyticsId, stepDuration);
    }

    // Reset tracking
    this.agentManager.clearStepTracking(agentId);
  }

  /**
   * Clean up current step
   */
  _cleanupCurrentStep(agentId) {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent) return;

    const { state } = agent;

    // Update previous step duration before cleanup
    this._updatePreviousStepDuration(agentId);

    // Clean up trigger
    if (state.triggerCleanup) {
      this.triggerManager.cleanupTrigger(state.triggerCleanup);
      state.triggerCleanup = null;
    }

    // Clean up popup
    if (state.activePopupManager && globalPopupManager.activePopup === state.activePopupManager) {
      state.activePopupManager.unmount();
      state.activePopupManager = null;
    }
  }

  /**
   * End an agent
   */
  _endAgent(agentId) {
    const agent = this.agentManager.getAgent(agentId);
    if (!agent) return;

    // Update step duration before ending
    this._updatePreviousStepDuration(agentId);

    // Log analytics for agent end if it was running
    if (agent.state.isRunning) {
      const currentStep = agent.steps[agent.state.currentStepIndex];
      if (currentStep) {
        logTextAgentEnd(
          agentId,
          currentStep.id,
          this.agentManager.getInstance(agentId)?.instanceId,
          {
            stepsCompleted: agent.state.currentStepIndex + 1,
            completionReason: 'agent_ended',
            hasRenderedOnce: agent.state.hasRenderedOnce
          },
          this.agentManager.calculateAgentDuration(agentId)
        );
      }
    }

    this._cleanupCurrentStep(agentId);

    // Clean up final popup
    if (agent.state.activePopupManager) {
      agent.state.activePopupManager.unmount();
      agent.state.activePopupManager = null;
    }

    // Reset state
    agent.state.isRunning = false;
    agent.state.currentStepIndex = -1;
    agent.state.activePopupManager = null;
    agent.state.hasRenderedOnce = false;

    // Remove instance tracking
    this.agentManager.removeInstance(agentId);

    if (this.config.debug) {
      console.log(`[SableTextAgent] Agent "${agentId}" ended`);
    }
  }

  /**
   * End current agent
   */
  end(agentId) {
    if (agentId && this.agentManager.hasAgent(agentId)) {
      this._endAgent(agentId);
    }
  }

  /**
   * Restart an agent
   */
  async restart(agentId, stepId = null, skipTrigger = false) {
    if (!agentId || !this.agentManager.hasAgent(agentId)) {
      if (this.config.debug) {
        console.warn(`[SableTextAgent] Agent "${agentId}" not found`);
      }
      return;
    }

    const agent = this.agentManager.getAgent(agentId);

    // Log analytics for restart
    const currentStep = agent.steps[agent.state.currentStepIndex];
    if (currentStep) {
      await logTextAgentRestart(
        agentId,
        currentStep.id,
        this.agentManager.getInstance(agentId)?.instanceId,
        {
          stepId,
          skipTrigger,
          wasRunning: agent.state.isRunning
        },
        this.agentManager.calculateAgentDuration(agentId)
      );
    }

    // End if currently running
    if (agent.state.isRunning) {
      this._endAgent(agentId);
    }

    // Reset state
    agent.state.hasRenderedOnce = false;

    // Start again
    await this.start(agentId, stepId, skipTrigger);
  }

  /**
   * Destroy the engine
   */
  destroy() {
    // Remove event listeners
    if (this._textAgentStartHandler && typeof window !== 'undefined') {
      window.removeEventListener('sable:textAgentStart', this._textAgentStartHandler);
      this._textAgentStartHandler = null;
    }

    if (this._textAgentEndHandler && typeof window !== 'undefined') {
      window.removeEventListener('sable:textAgentEnd', this._textAgentEndHandler);
      this._textAgentEndHandler = null;
    }

    // Remove popup state listener
    if (this._popupStateHandler) {
      globalPopupManager.removeListener(this._popupStateHandler);
      this._popupStateHandler = null;
    }

    // End all running agents
    for (const [agentId, agent] of this.agentManager.getAllAgents().entries()) {
      if (agent.state.isRunning) {
        this._endAgent(agentId);
      }
    }

    // Destroy managers
    this.autoStartManager.destroy();
    this.agentManager.clear();

    _instance = null;
  }
}
