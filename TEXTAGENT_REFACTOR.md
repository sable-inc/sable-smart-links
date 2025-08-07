## CORE FUNCTIONALITY

- `globalPopupManager.js` the core manager for textAgent popups
  - LOW PRIORITY: interface with `walkthroughEngine.js`
  - NECESSARY STATE:
    -
- `textAgentEngine.js` is the core engine for the text agent.
  - NECESSARY BEHAVIOR:
    - Starting agents
    - Iterating through agent steps
    - Hiding agents programmatically
      - When an agent's triggerElement disappears from the DOM, the agent should be hidden
    - Ending agents programmatically
      - When new agents are started, the previous agent should be ended
    - Managing triggers
      - Set-up of trigger, remove triggers when instance is removed
  - NECESSARY STATE:
    -
