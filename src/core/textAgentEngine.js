/**
 * Text Agent Engine
 * Core functionality for managing and executing text agent guides
 */

import { waitForElement } from '../utils/elementSelector.js';
import { isBrowser, safeDocument } from '../utils/browserAPI.js';
import globalPopupManager from '../ui/GlobalPopupManager.js';
import { addEvent, debounce } from '../utils/events.js';
import {
  logTextAgentStart,
  logTextAgentNext,
  logTextAgentPrevious,
  logTextAgentEnd,
  logTextAgentRestart,
  logTextAgentStepRendered,
  updateTextAgentEventDuration
} from '../utils/analytics.js';

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

    // State management - agents map contains all agent state
    this.agents = new Map(); // agentId -> { steps, config, state }
    this.observer = null; // MutationObserver for triggers

    // Instance tracking per agent
    this.agentInstances = new Map(); // agentId -> { instanceId, startTime, currentStepAnalyticsId, currentStepStartTime }

    // Store singleton instance
    _instance = this;

    // Set up event listeners immediately
    this._setupEventListeners();

    // Set up popup state listener for step duration tracking
    this._setupPopupStateListener();
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
  }

  /**
   * Calculate agent duration from instance start time
   * @private
   */
  _calculateAgentDuration(agentId) {
    const instance = this.agentInstances.get(agentId);
    if (!instance || !instance.startTime) {
      return null;
    }
    return Date.now() - instance.startTime;
  }

  /**
   * Generate a unique instance ID for an agent
   * @private
   */
  _generateInstanceId() {
    return `instance_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  init() {
    if (this.config.debug) {
      console.log('[SableTextAgent] Initializing');
    }

    this._startObserver();
    this._setupEventListeners();
    return this;
  }

  /**
   * Register an agent
   * @param {string} agentId - Unique identifier
   * @param {Array} steps - Agent steps
   * @param {Object} config - Agent-specific config
   */
  register(agentId, steps, config = {}) {
    if (this.config.debug) {
      console.log(`[SableTextAgent] Registering agent "${agentId}" with ${steps.length} steps`);
    }

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
        requiredSelector: config.requiredSelector,
        endWithoutSelector: config.endWithoutSelector !== undefined ? config.endWithoutSelector : false
      },
      state: {
        isRunning: false,
        currentStepIndex: -1,
        hasRenderedOnce: false,
        activePopupManager: null
      }
    });

    this._startObserver();
  }

  /**
   * Set up event listeners for agent control
   * @private
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

      if (agentId && this.agents.has(agentId)) {
        this.start(agentId, stepId, skipTrigger);
      } else if (agentId) {
        if (this.config.debug) {
          console.warn(`[SableTextAgent] Agent "${agentId}" not found when handling sable:textAgentStart event`);
        }
      }
    };

    // Listen for sable:textAgentEnd events
    this._textAgentEndHandler = (event) => {
      const { agentId, stepId, instanceId, reason } = event.detail || {};

      if (this.config.debug) {
        console.log('[SableTextAgent] DEBUG: Received sable:textAgentEnd event:', { agentId, stepId, instanceId, reason });
      }

      if (agentId && this.agents.has(agentId)) {
        this.end(agentId);
      }
    };

    window.addEventListener('sable:textAgentStart', this._textAgentStartHandler);
    window.addEventListener('sable:textAgentEnd', this._textAgentEndHandler);
  }

  /**
   * Set up popup state listener for step duration tracking
   * @private
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
        for (const [agentId, agent] of this.agents.entries()) {
          if (agent.state.isRunning) {
            this._updatePreviousStepDuration(agentId);
          }
        }
      }
    };

    globalPopupManager.addListener(this._popupStateHandler);
  }

  /**
   * Start the global observer for all agents
   * @private
   */
  _startObserver() {
    if (this.observer) {
      return; // Already running
    }

    if (typeof document === 'undefined') {
      return;
    }

    this.observer = new MutationObserver(() => {
      this._checkAgentTriggers();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial check
    this._checkAgentTriggers();
  }

  /**
   * Check if any agents should be started or ended based on their required selectors
   * @private
   */
  _checkAgentTriggers() {
    for (const [agentId, agent] of this.agents.entries()) {
      const { config, state } = agent;

      // Check if required selector is present
      let requiredSelectorPresent = false;
      if (!config.requiredSelector) {
        requiredSelectorPresent = true; // No required selector means always present
      } else {
        const element = this._findElement(config.requiredSelector);
        requiredSelectorPresent = !!element; // Convert to boolean
      }

      if (state.isRunning) {
        // Agent is running - check if it should be ended
        if (!requiredSelectorPresent && (!state.hasRenderedOnce || config.endWithoutSelector)) {
          // Agent is running but required selector is gone and either:
          // - no steps have rendered yet, OR
          // - endWithoutSelector is true (end immediately when selector disappears)
          if (this.config.debug) {
            console.log(`[SableTextAgent] Ending agent "${agentId}" - required selector no longer present${config.endWithoutSelector ? ' (endWithoutSelector enabled)' : ' and no steps rendered'}`);
          }
          this._endAgent(agentId);
        }
        continue;
      }

      // Agent is not running - check if it should be started
      if (!requiredSelectorPresent || !config.autoStart) {
        continue; // Don't start
      }

      // Check autoStartOnce with localStorage
      if (config.autoStartOnce) {
        const localStorageKey = `SableTextAgent_autoStartedOnce_${agentId}`;
        try {
          if (window.localStorage.getItem(localStorageKey)) {
            continue; // Already auto-started once, skip
          }
        } catch (e) {
          // localStorage not available, assume already started
          if (this.config.debug) {
            console.log(`[SableTextAgent] localStorage not available for agent "${agentId}", assuming autoStartOnce has already happened`);
          }
          continue;
        }
      }

      // Start the agent
      if (this.config.debug) {
        console.log(`[SableTextAgent] Starting agent "${agentId}" (auto-start)`);
      }
      this.start(agentId, null, false, true);
    }
  }

  /**
   * Find element by selector (supports CSS and XPath)
   * @private
   */
  _findElement(selector) {
    if (selector.startsWith('//')) {
      return document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    }
    return document.querySelector(selector);
  }

  /**
   * Start a specific agent
   * @param {string} agentId - Agent to start
   * @param {string} stepId - Optional step to start from
   * @param {boolean} skipTrigger - Skip trigger checks
   * @param {boolean} isAutoStart - Whether this is an auto-start (affects beforeStart and localStorage)
   */
  async start(agentId, stepId = null, skipTrigger = false, isAutoStart = false) {
    if (!this.agents.has(agentId)) {
      if (this.config.debug) {
        console.warn(`[SableTextAgent] Agent "${agentId}" not registered`);
      }
      return false;
    }

    const agent = this.agents.get(agentId);
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

      // Clean up current step (similar to next() method)
      this._cleanupCurrentStep(agentId);

      // Update current step index to target step
      state.currentStepIndex = targetStepIndex;

      // Render the new step (not auto-start for navigation)
      await this._renderCurrentStep(agentId, false);

      return true;
    }

    // Handle case where agent is running but no stepId specified (auto-started but not rendered)
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

    // Generate new instance ID for this agent run
    const instanceId = this._generateInstanceId();
    const startTime = Date.now();

    // Store instance information
    this.agentInstances.set(agentId, {
      instanceId,
      startTime,
      currentStepAnalyticsId: null,
      currentStepStartTime: null
    });

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
      logTextAgentStart(
        agentId,
        currentStep.id,
        instanceId,
        {
          skipTrigger,
          stepId
        },
        null // agentDuration is null for start event since instance hasn't started yet
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
   * @private
   */
  _setupStepTrigger(agentId, isAutoStart = false) {
    const agent = this.agents.get(agentId);
    const step = agent.steps[agent.state.currentStepIndex];

    if (!step) {
      this._endAgent(agentId);
      return;
    }

    if (step.triggerOnTyping) {
      this._setupTypingTrigger(agentId, step, isAutoStart);
    } else if (step.triggerOnButtonPress) {
      this._setupButtonTrigger(agentId, step, isAutoStart);
    } else {
      // No trigger, show immediately
      setTimeout(async () => await this._renderCurrentStep(agentId, isAutoStart), 100);
    }
  }

  /**
   * Set up typing trigger
   * @private
   */
  _setupTypingTrigger(agentId, step, isAutoStart = false) {
    const { selector, on = 'start', stopDelay = 1000 } = step.triggerOnTyping;

    const checkAndSetup = () => {
      const input = this._findElement(selector);
      if (!input) {
        setTimeout(checkAndSetup, 500);
        return;
      }

      let hasStarted = false;
      let cleanup = null;

      const showStep = async () => {
        if (cleanup) cleanup();

        await this._renderCurrentStep(agentId, isAutoStart, {
          triggerType: 'typing',
          triggerSelector: selector,
          triggerOn: on,
          stopDelay
        });
      };

      if (on === 'start') {
        const handler = () => {
          if (!hasStarted && input.value.length > 0) {
            hasStarted = true;
            showStep();
          }
        };
        cleanup = addEvent(input, 'input', handler);
      } else if (on === 'stop') {
        const handler = debounce(showStep, stopDelay);
        cleanup = addEvent(input, 'input', handler);
      }

      // Store cleanup function
      const agent = this.agents.get(agentId);
      agent.state.triggerCleanup = cleanup;
    };

    checkAndSetup();
  }

  /**
   * Set up button trigger
   * @private
   */
  _setupButtonTrigger(agentId, step, isAutoStart = false) {
    const { selector, event = 'click', delay = 0 } = step.triggerOnButtonPress;

    const checkAndSetup = () => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        setTimeout(checkAndSetup, 500);
        return;
      }

      const showStep = async () => {
        // Remove event listeners
        elements.forEach(el => el.removeEventListener(event, handler));

        const triggerInfo = {
          triggerType: 'button',
          triggerSelector: selector,
          triggerEvent: event,
          delay
        };

        if (delay > 0) {
          setTimeout(async () => await this._renderCurrentStep(agentId, isAutoStart, triggerInfo), delay);
        } else {
          await this._renderCurrentStep(agentId, isAutoStart, triggerInfo);
        }
      };

      const handler = showStep;

      // Add event listeners
      elements.forEach(el => el.addEventListener(event, handler));

      // Store cleanup function
      const agent = this.agents.get(agentId);
      agent.state.triggerCleanup = () => {
        elements.forEach(el => el.removeEventListener(event, handler));
      };
    };

    checkAndSetup();
  }

  /**
   * Render the current step
   * @private
   */
  async _renderCurrentStep(agentId, isAutoStart = false, triggerInfo = null) {
    const agent = this.agents.get(agentId);
    const { steps, state, config } = agent;
    const instance = this.agentInstances.get(agentId);

    if (state.currentStepIndex < 0 || state.currentStepIndex >= steps.length) {
      this._endAgent(agentId);
      return;
    }

    const step = steps[state.currentStepIndex];

    if (this.config.debug) {
      console.log(`[SableTextAgent] Rendering step ${step.id} for agent "${agentId}"${isAutoStart ? ' (auto-start)' : ''}`);
    }

    // Check conditional rendering
    if (typeof step.showIf === 'function' && !step.showIf()) {
      this.next(agentId);
      return;
    }

    // Handle target element
    this._handleTargetElement(step).then(async targetElement => {
      this._createPopupForStep(agentId, step, targetElement);

      // Log analytics for step rendered and store tracking info
      if (this.config.debug) {
        console.log(`[SableTextAgent] DEBUG: About to log step_rendered analytics for step "${step.id}" (index: ${state.currentStepIndex})`);
      }

      const analyticsId = await logTextAgentStepRendered(
        agentId,
        step.id,
        instance.instanceId,
        {
          isAutoStart,
          stepType: step.buttonType || 'popup',
          hasTargetElement: !!targetElement,
          targetSelector: step.targetElement?.selector,
          ...(triggerInfo && { triggerInfo })
        },
        this._calculateAgentDuration(agentId)
      );

      if (this.config.debug) {
        console.log(`[SableTextAgent] DEBUG: Received analytics ID: ${analyticsId} for step "${step.id}"`);
      }

      // Store tracking info for step duration
      if (analyticsId && instance) {
        instance.currentStepAnalyticsId = analyticsId;
        instance.currentStepStartTime = Date.now();

        if (this.config.debug) {
          console.log(`[SableTextAgent] Started tracking step duration for analytics ID: ${analyticsId}`);
        }
      }

      // Set autoStartOnce localStorage key when first step is rendered (only for auto-starts)
      if (isAutoStart && config.autoStart && config.autoStartOnce) {
        const localStorageKey = `SableTextAgent_autoStartedOnce_${agentId}`;
        try {
          window.localStorage.setItem(localStorageKey, 'true');
          if (this.config.debug) {
            console.log(`[SableTextAgent] Set autoStartOnce localStorage key for agent "${agentId}": ${localStorageKey}`);
          }
        } catch (e) {
          if (this.config.debug) {
            console.log(`[SableTextAgent] localStorage not available, cannot set autoStartOnce key for agent "${agentId}"`);
          }
        }
      }

      // Handle auto-actions
      setTimeout(() => {
        this._performStepActions(step, targetElement);
      }, this.config.stepDelay);
    });
  }

  /**
   * Handle target element selection
   * @private
   */
  async _handleTargetElement(step) {
    if (!step.targetElement?.selector) {
      return null;
    }

    try {
      if (step.targetElement.waitForElement) {
        return await waitForElement(step.targetElement.selector, {
          timeout: step.targetElement.waitTimeout || 5000
        });
      } else {
        return this._findElement(step.targetElement.selector);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[SableTextAgent] Error handling target element:', error);
      }
      return null;
    }
  }

  /**
   * Create popup for current step
   * @private
   */
  _createPopupForStep(agentId, step, targetElement) {
    const agent = this.agents.get(agentId);
    const instance = this.agentInstances.get(agentId);

    // Get text content
    const text = typeof step.text === 'function' ? step.text() : step.text;
    const secondaryText = typeof step.secondaryText === 'function' ? step.secondaryText() : step.secondaryText;
    const sections = typeof step.sections === 'function' ? step.sections() : step.sections;

    // Create popup options
    const popupOptions = {
      text,
      secondaryText,
      boxWidth: step.boxWidth || this.config.defaultBoxWidth,
      buttonType: step.buttonType || 'arrow',
      primaryColor: step.primaryColor || this.config.primaryColor,
      sections,
      fontSize: step.fontSize || '15px',
      parent: safeDocument?.body || document.body,
      // Add agent information for analytics logging
      agentInfo: {
        agentId,
        stepId: step.id,
        instanceId: instance.instanceId,
        agentStartTime: instance.startTime
      }
    };

    // Set up callbacks
    if (step.buttonType === 'yes-no') {
      popupOptions.onYesNo = async (isYes) => {
        if (typeof step.onYesNo === 'function') {
          await step.onYesNo(isYes);
        }
        if (step.autoAdvance) {
          setTimeout(() => this.next(agentId), step.autoAdvanceDelay || 1000);
        }
      };
    } else {
      popupOptions.onProceed = async (textInput) => {
        if (typeof step.onProceed === 'function') {
          await step.onProceed(textInput);
        }
        if (step.autoAdvance) {
          setTimeout(() => this.next(agentId), step.autoAdvanceDelay || 1000);
        }
      };
    }

    // Create and mount popup through GlobalPopupManager
    const popupManager = globalPopupManager.showPopup(popupOptions);
    if (popupManager) {
      agent.state.activePopupManager = popupManager;
      agent.state.hasRenderedOnce = true; // Mark that at least one step has been rendered

      // Position popup if target element specified
      if (targetElement && step.targetElement?.position) {
        this._positionPopup(popupManager, targetElement, step.targetElement.position);
      }
    }

    // Execute callback if provided
    if (typeof step.callback === 'function') {
      step.callback(targetElement, this);
    }
  }

  /**
   * Position popup relative to target element
   * @private
   */
  _positionPopup(popupManager, targetElement, position) {
    if (!popupManager.container) {
      return;
    }

    const elementRect = targetElement.getBoundingClientRect();
    const popupRect = popupManager.container.getBoundingClientRect();
    const margin = 10;

    let newPosition = {};
    let transform = '';

    switch (position) {
      case 'top':
        newPosition = {
          top: elementRect.top - popupRect.height - margin,
          left: elementRect.left + (elementRect.width / 2)
        };
        transform = 'translateX(-50%)';
        break;
      case 'right':
        newPosition = {
          top: elementRect.top + (elementRect.height / 2),
          left: elementRect.right + margin
        };
        transform = 'translateY(-50%)';
        break;
      case 'bottom':
        newPosition = {
          top: elementRect.bottom + margin,
          left: elementRect.left + (elementRect.width / 2)
        };
        transform = 'translateX(-50%)';
        break;
      case 'left':
        newPosition = {
          top: elementRect.top + (elementRect.height / 2),
          left: elementRect.left - margin
        };
        transform = 'translate(-100%, -50%)';
        break;
      default:
        newPosition = {
          top: elementRect.top + (elementRect.height / 2),
          left: elementRect.left + (elementRect.width / 2)
        };
        transform = 'translate(-50%, -50%)';
    }

    popupManager.container.style.transform = transform;
    popupManager.updatePosition(newPosition);
  }

  /**
   * Perform step actions
   * @private
   */
  _performStepActions(step, element) {
    if (!step.action || !element) {
      return;
    }

    const { type, value, delay = 0, autoAdvance, typeEffect, typeDelay = 50 } = step.action;

    const executeAction = () => {
      switch (type) {
        case 'click':
          element.click();
          break;
        case 'input':
          if (typeEffect) {
            this._typeText(element, value, typeDelay, autoAdvance);
          } else {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
          break;
        case 'focus':
          element.focus();
          break;
        case 'hover':
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          break;
        case 'custom':
          if (typeof step.action.handler === 'function') {
            step.action.handler(element, this);
          }
          break;
      }

      if (autoAdvance && type !== 'input') {
        setTimeout(() => this.next(agentId), delay || 1000);
      }
    };

    setTimeout(executeAction, delay);
  }

  /**
   * Type text character by character
   * @private
   */
  _typeText(element, text, charDelay, autoAdvance) {
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));

    let i = 0;
    const typeNextChar = () => {
      if (i < text.length) {
        element.value += text.charAt(i);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        i++;
        setTimeout(typeNextChar, charDelay);
      } else if (autoAdvance) {
        setTimeout(() => this.next(agentId), 1000);
      }
    };

    typeNextChar();
  }

  /**
   * Move to next step
   */
  async next(agentId) {
    if (!agentId || !this.agents.has(agentId)) {
      return;
    }

    const agent = this.agents.get(agentId);
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
        logTextAgentNext(
          agentId,
          nextStep.id,
          this.agentInstances.get(agentId)?.instanceId,
          {
            previousStepId: currentStep?.id,
            previousStepIndex: state.currentStepIndex - 1,
            isLastStep: false
          },
          this._calculateAgentDuration(agentId)
        );
      }

      this._renderCurrentStep(agentId, false); // Not auto-start for navigation
    } else {
      // End of steps - end the agent
      // Log analytics for agent end
      if (currentStep) {
        logTextAgentEnd(
          agentId,
          currentStep.id,
          this.agentInstances.get(agentId)?.instanceId,
          {
            stepsCompleted: steps.length,
            completionReason: 'user_finished'
          },
          this._calculateAgentDuration(agentId)
        );
      }

      // End the agent
      this._endAgent(agentId);
    }
  }

  /**
   * Move to previous step
   */
  async previous(agentId) {
    if (!agentId || !this.agents.has(agentId)) {
      return;
    }

    const agent = this.agents.get(agentId);
    const { steps, state } = agent;

    // Get current step before cleanup for analytics
    const currentStep = steps[state.currentStepIndex];

    this._cleanupCurrentStep(agentId);

    if (state.currentStepIndex > 0) {
      state.currentStepIndex--;

      // Log analytics for previous step
      const previousStep = steps[state.currentStepIndex];
      if (previousStep) {
        logTextAgentPrevious(
          agentId,
          previousStep.id,
          this.agentInstances.get(agentId)?.instanceId,
          {
            nextStepId: currentStep?.id,
            nextStepIndex: state.currentStepIndex + 1
          },
          this._calculateAgentDuration(agentId)
        );
      }

      await this._renderCurrentStep(agentId, false); // Not auto-start for navigation
    }
  }

  /**
   * Update previous step duration and reset tracking
   * @private
   */
  _updatePreviousStepDuration(agentId) {
    const instance = this.agentInstances.get(agentId);
    if (!instance) return;

    if (this.config.debug) {
      console.log(`[SableTextAgent] DEBUG: _updatePreviousStepDuration called for agent "${agentId}"`);
      console.log(`[SableTextAgent] DEBUG: currentStepAnalyticsId: ${instance.currentStepAnalyticsId}`);
      console.log(`[SableTextAgent] DEBUG: currentStepStartTime: ${instance.currentStepStartTime}`);
    }

    if (instance.currentStepAnalyticsId && instance.currentStepStartTime) {
      const stepDuration = Date.now() - instance.currentStepStartTime;
      if (this.config.debug) {
        console.log(`[SableTextAgent] DEBUG: Calculating step duration: ${Date.now()} - ${instance.currentStepStartTime} = ${stepDuration}ms`);
      }
      updateTextAgentEventDuration(instance.currentStepAnalyticsId, stepDuration);

      if (this.config.debug) {
        console.log(`[SableTextAgent] Updated step duration: ${stepDuration}ms for analytics ID: ${instance.currentStepAnalyticsId}`);
      }
    } else {
      if (this.config.debug) {
        console.log(`[SableTextAgent] DEBUG: No tracking info available for step duration update`);
      }
    }

    // Reset tracking≠
    instance.currentStepAnalyticsId = null;
    instance.currentStepStartTime = null;
  }

  /**
   * Clean up current step
   * @private
   */
  _cleanupCurrentStep(agentId) {
    if (this.config.debug) {
      console.log(`[SableTextAgent] DEBUG: _cleanupCurrentStep called for agent "${agentId}"`);
    }

    const agent = this.agents.get(agentId);
    if (!agent) return;

    const { state } = agent;

    // Update previous step duration before cleanup
    this._updatePreviousStepDuration(agentId);

    // Clean up trigger
    if (state.triggerCleanup) {
      state.triggerCleanup();
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
   * @private
   */
  _endAgent(agentId) {
    if (this.config.debug) {
      console.log(`[SableTextAgent] DEBUG: _endAgent called for agent "${agentId}"`);
    }

    const agent = this.agents.get(agentId);
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
          this.agentInstances.get(agentId)?.instanceId,
          {
            stepsCompleted: agent.state.currentStepIndex + 1,
            completionReason: 'agent_ended',
            hasRenderedOnce: agent.state.hasRenderedOnce
          },
          this._calculateAgentDuration(agentId)
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
    this.agentInstances.delete(agentId);

    if (this.config.debug) {
      console.log(`[SableTextAgent] Agent "${agentId}" ended`);
    }
  }

  /**
   * End current agent
   */
  end(agentId) {
    if (agentId && this.agents.has(agentId)) {
      this._endAgent(agentId);
    }
  }

  /**
   * Restart an agent
   */
  async restart(agentId, stepId = null, skipTrigger = false) {
    if (!agentId || !this.agents.has(agentId)) {
      if (this.config.debug) {
        console.warn(`[SableTextAgent] Agent "${agentId}" not found`);
      }
      return;
    }

    const agent = this.agents.get(agentId);

    // Log analytics for restart
    const currentStep = agent.steps[agent.state.currentStepIndex];
    if (currentStep) {
      logTextAgentRestart(
        agentId,
        currentStep.id,
        this.agentInstances.get(agentId)?.instanceId,
        {
          stepId,
          skipTrigger,
          wasRunning: agent.state.isRunning
        },
        this._calculateAgentDuration(agentId)
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
   * Show a simple popup
   */
  showPopup(options) {
    if (!isBrowser) {
      if (this.config.debug) {
        console.warn('[SableTextAgent] Popup can only be shown in browser environment');
      }
      return null;
    }

    const defaultOptions = {
      text: '',
      boxWidth: this.config.defaultBoxWidth,
      buttonType: 'arrow',
      primaryColor: this.config.primaryColor,
      parent: safeDocument?.body || document.body,
      fontSize: '15px',
      sections: []
    };

    return globalPopupManager.showPopup({ ...defaultOptions, ...options });
  }

  /**
   * Destroy the engine
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

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
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.state.isRunning) {
        this._endAgent(agentId);
      }
    }

    this.agents.clear();
    this.agentInstances.clear();
    _instance = null;
  }
}
