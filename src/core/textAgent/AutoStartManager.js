/**
 * Auto Start Manager
 * Handles auto-start logic and DOM observation for agents
 */

export class AutoStartManager {
  constructor(config = {}) {
    this.config = config;
    this.observer = null;
    this.onAgentStart = null; // Callback to start agent
    this.onAgentEnd = null; // Callback to end agent
    this.agents = null; // Reference to agents map
  }

  /**
   * Initialize the observer
   */
  init(onAgentStart, onAgentEnd, agents) {
    this.onAgentStart = onAgentStart;
    this.onAgentEnd = onAgentEnd;
    this.agents = agents;
    this._startObserver();
  }

  /**
   * Start the global observer for all agents
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
   */
  _checkAgentTriggers() {
    if (!this.onAgentStart || !this.onAgentEnd || !this.agents) {
      return;
    }
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
      // If agent is running, end if selector is gone
      if (state.isRunning) {
        if (!requiredSelectorPresent) {
          if (this.config.debug) {
            console.log(`[SableTextAgent] Ending agent "${agentId}" - required selector no longer present`);
          }
          this.onAgentEnd(agentId);
        }
        continue;
      }
      // If agent is not running, check if it should be auto-started
      if (!requiredSelectorPresent || !config.autoStart) {
        continue;
      }
      // Check autoStartOnce with localStorage
      if (config.autoStartOnce) {
        const localStorageKey = `SableTextAgent_autoStartedOnce_${agentId}`;
        try {
          if (window.localStorage.getItem(localStorageKey)) {
            continue; // Already auto-started once, skip
          }
        } catch (e) {
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
      this.onAgentStart(agentId, null, false, true);
    }
  }

  /**
   * Update the agents map reference (call this after registration or agent changes)
   */
  updateAgents(agents) {
    this.agents = agents;
    this._checkAgentTriggers();
  }

  /**
   * Set autoStartOnce localStorage key
   */
  setAutoStartOnce(agentId) {
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

  /**
   * Find element by selector (supports CSS and XPath)
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
   * Destroy the observer
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
