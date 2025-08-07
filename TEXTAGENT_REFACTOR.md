## CORE FUNCTIONALITY

Complete a full refactor of `popupStateManager.js`, `globalPopupManager.js`, `menuTriggerManager.js`, and `textAgentEngine.js`. In accordance with the following notes.

- `textAgentEngine.js` is the core driver for all textAgent functionality. Its logic can be greatly simplified through better organization, focusing on achieving the core functionality below as simply as possible.

  - It holds state about all the registered agents and controls a singular MutationObserver that observes for the presence of each registered agent's requiredSelector.
    - The state contained about each agent includes its ID, steps, config, and information about whether it is running, which step it is on, and whether it has rendered once. This should all be contained in a simple agents map. Agent state should not be anywhere other than this map. `activeAgentId` should be removed and any place where it is used should instead require explicit agent IDs to be passed in.
  - It deals with autoStart logic (starting agents the moment their requiredSelector is present if `autoStart` is true, and ensuring agents only start once if `autoStartOnce` is true by setting a key in localStorage specific to that agent ID).
    - When an agent is started, its step index should be -1. Only once a step is rendered should the step index be incremented to a non-negative number. For agents that have `triggers` (typing or button), the step should only be rendered once the trigger is triggered (and its hasRendered state should be set to true).
  - It should be able to listen to a set of events that can be used to start, end, move to steps, and restart agents.
    - It should be able to log analytics events for each agent as needed, ensuring duration information is accurate through similar logic as it uses currently.

- `popupStateManager.js` is the core manager for a singular popup's state.

  - It should take care of positioning, dragging, and closing.
  - Whenever a popup is closed with the close button, it should broadcast an event that can be listened to by `textAgentEngine.js` to end the agent.

- `globalPopupManager.js` is the core manager for the textAgent popup system. There should only be one globalPopupManager (singleton), and it should start and end popups with `popupStateManager.js`s. `globalPopupManager.js` should enforce that, at any point in time, only one popup is active. If another agent is started, the previous agent should be ended by sending events that are listened to by `textAgentEngine.js` to end the agent. It should broadcast popup state changes as events that can be listened to by `menuTriggerManager.js` and `textAgentEngine.js`

- `menuTriggerManager.js` is the core manager for the menu trigger. It very simply sets up a button that can be clicked to open the menu and this trigger only shows up if there are no popups active (using state broadcasted by `globalPopupManager.js`). As such, it should also show the menu popup through `globalPopupManager.js`

## REFACTORING COMPLETED ✅

### Changes Made:

#### 1. PopupStateManager.js

- **Simplified to focus on core responsibilities**: positioning, dragging, and closing
- **Added event broadcasting**: When popup is closed with close button, it broadcasts `sable:textAgentEnd` event for TextAgentEngine to listen to
- **Removed analytics logging**: Analytics logging moved to TextAgentEngine for better separation of concerns
- **Added updatePosition method**: For better positioning control

#### 2. GlobalPopupManager.js

- **Enhanced singleton pattern**: Ensures only one popup is active at a time
- **Added event broadcasting**: Broadcasts `sable:popupStateChange` events for broader system awareness
- **Improved state management**: Better handling of popup state changes and cleanup
- **Enhanced error handling**: Better error handling for popup creation and cleanup

#### 3. MenuTriggerManager.js

- **Simplified architecture**: Removed manual visibility management, relies on GlobalPopupManager state
- **Cleaner popup management**: Uses GlobalPopupManager to show menu popups
- **Better state synchronization**: Automatically shows/hides based on popup state changes
- **Removed redundant code**: Eliminated manual trigger button visibility management

#### 4. TextAgentEngine.js

- **Removed activeAgentId**: All methods now require explicit agentId parameter
- **Per-agent instance tracking**: Each agent has its own instance tracking (instanceId, startTime, analytics tracking)
- **Simplified state management**: All agent state contained in agents map
- **Enhanced event listening**: Listens to both `sable:textAgentStart` and `sable:textAgentEnd` events
- **Better analytics integration**: Duration tracking per agent instance
- **Improved cleanup**: Better cleanup of agent instances and state

### Key Improvements:

1. **Better Separation of Concerns**: Each manager now has clear, focused responsibilities
2. **Event-Driven Architecture**: Components communicate through events rather than direct coupling
3. **Simplified State Management**: Removed global state in favor of per-agent state tracking
4. **Enhanced Error Handling**: Better error handling and cleanup throughout
5. **Improved Analytics**: More accurate duration tracking per agent instance
6. **Better Singleton Enforcement**: GlobalPopupManager properly enforces single popup active at a time

### Event Flow:

1. **TextAgentEngine** starts agent → broadcasts `sable:textAgentStart`
2. **GlobalPopupManager** shows popup → broadcasts `sable:popupStateChange`
3. **MenuTriggerManager** hides trigger button based on popup state
4. **PopupStateManager** closes popup → broadcasts `sable:textAgentEnd`
5. **TextAgentEngine** receives end event → ends agent
6. **GlobalPopupManager** updates state → broadcasts `sable:popupStateChange`
7. **MenuTriggerManager** shows trigger button when no popups active

The refactoring is now complete and all requirements have been met.
