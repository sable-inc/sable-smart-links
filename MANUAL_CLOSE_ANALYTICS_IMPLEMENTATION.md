# Manual Close Analytics Implementation

## Overview

This implementation adds analytics logging when a user manually closes a popup by clicking the close button (X). The analytics event includes the agent's instanceId and other relevant information to track user behavior.

## Changes Made

### 1. TextAgentEngine (`src/core/textAgentEngine.js`)

#### `_createPopupForStep` method

- Added `agentInfo` object to popup options containing:
  - `agentId`: The current agent ID
  - `stepId`: The current step ID
  - `instanceId`: The current instance ID
- Added `onClose` callback that logs analytics when user manually closes the popup
- Analytics event includes:
  - `completionReason: 'manual'`

#### `_showFinalPopup` method

- Added `agentInfo` object to PopupStateManager configuration
- Added `onClose` callback that logs analytics when user manually closes the final popup
- Analytics event includes:
  - `completionReason: 'manual'`

### 2. PopupStateManager (`src/ui/PopupStateManager.js`)

#### Constructor

- Added `agentInfo` property to config object
- Imported `logTextAgentEnd` from analytics utility

#### `handleClose` method

- Added analytics logging when user manually closes the popup
- Analytics event includes:
  - `completionReason: 'manual'`

### 3. SimplePopup (`src/ui/components/SimplePopup.js`)

#### Constructor

- Added `agentInfo` property to config object
- Imported `logTextAgentEnd` from analytics utility

#### `close` method

- Added analytics logging when user manually closes the popup
- Analytics event includes:
  - `completionReason: 'manual'`

## Analytics Event Details

When a user manually closes a popup, the following analytics event is logged:

```javascript
logTextAgentEnd(
  agentId, // The agent ID
  stepId, // The current step ID
  instanceId, // The agent's instance ID
  {
    completionReason: "manual",
  }
);
```

## Test Files

Two test files were created to verify the implementation:

1. `test/manual-close-analytics-test.html` - Tests SimplePopup manual close
2. `test/final-popup-analytics-test.html` - Tests PopupStateManager manual close

## Usage

The implementation is automatic and requires no additional configuration. When a user clicks the close button (X) on any popup:

1. The popup closes normally
2. An analytics event is logged with the agent's instanceId
3. The event includes metadata with `completionReason: 'manual'`

## Benefits

- **User Behavior Tracking**: Understand when users manually close popups vs. completing them naturally
- **Agent Performance**: Track which agents are more likely to be manually closed
- **Instance Tracking**: Each manual close event includes the specific agent instance ID
- **Simplified Analytics**: Consistent 'manual' completion reason across all popup types

## Backward Compatibility

The implementation is fully backward compatible:

- Existing popup configurations continue to work without changes
- Agent information is only added when available
- Analytics logging only occurs when agent information is present
- No breaking changes to existing APIs
