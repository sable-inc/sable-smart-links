# Agent Duration Implementation

## Overview

The `agentDuration` feature has been added to textAgent analytics tracking to provide insight into the total time spent on an agent instance up to each step or event.

## Implementation Details

### Core Changes

1. **TextAgentEngine Updates** (`src/core/textAgentEngine.js`):

   - Added `currentInstanceStartTime` property to track when each agent instance starts
   - Added `_calculateAgentDuration()` helper method to compute duration
   - Updated all analytics calls to include `agentDuration` parameter
   - Reset instance start time when agent ends or engine is destroyed
   - **Key Change**: `currentInstanceStartTime` is set when the first step is rendered, not when the agent starts

2. **Analytics Updates** (`src/utils/analytics.js`):

   - Updated `logTextAgentEvent()` to accept and include `agentDuration` in payload
   - Updated all specific analytics functions to accept `agentDuration` parameter
   - `agentDuration` is included in the analytics payload sent to the API

3. **UI Component Updates**:

   - Updated `PopupStateManager.js` and `SimplePopup.js` to use `agentDuration` from `agentInfo`
   - `agentInfo` object now includes `agentDuration` calculated by the engine

4. **API Updates** (`api/server.js`):
   - Added `agentDuration` field to the analytics endpoint
   - Added database index for `agentDuration` for efficient queries
   - `agentDuration` is now properly saved to the database

### How It Works

1. **Instance Start Tracking**: When the first step is rendered, `currentInstanceStartTime` is set to `Date.now()`
2. **Duration Calculation**: `_calculateAgentDuration()` returns `Date.now() - currentInstanceStartTime`
3. **Analytics Integration**: All analytics events now include the calculated `agentDuration`
4. **Reset Logic**: Instance start time is reset when agent ends or engine is destroyed

### Analytics Events with Agent Duration

The following events now include `agentDuration`:

- `start` - Duration is `null` (instance hasn't started yet)
- `step_rendered` - Duration from instance start to step render
- `next` - Duration from instance start to next step
- `previous` - Duration from instance start to previous step
- `end` - Duration from instance start to agent end
- `restart` - Duration from instance start to restart

### API Payload

The analytics API now receives payloads with the additional `agentDuration` field:

```json
{
  "event": "step_rendered",
  "agentId": "my-agent",
  "stepId": "step-1",
  "instanceId": "instance_abc123_1234567890",
  "stepDuration": 5000,
  "agentDuration": 15000,
  "sessionId": "session_xyz789_1234567890",
  "userId": "user_def456_1234567890",
  "metadata": {
    "pageUrl": "https://example.com",
    "userAgent": "...",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Database Schema

The `textAgentAnalytics` collection now includes the `agentDuration` field:

```javascript
{
  _id: ObjectId,
  event: String,
  agentId: String,
  stepId: String,
  instanceId: String,
  stepDuration: Number,
  agentDuration: Number,  // NEW FIELD
  sessionId: String,
  userId: String,
  metadata: Object,
  timestamp: Date,
  createdAt: Date
}
```

### Key Benefits

1. **User Experience Insights**: Understand how long users spend with agents before completing steps
2. **Performance Analysis**: Identify if agents are taking too long to complete
3. **Engagement Metrics**: Measure user engagement duration with agent instances
4. **Debugging**: Help identify issues with agent timing and user interaction patterns

### Testing

A test file has been created at `test/agent-duration-test.js` to verify:

- Correct calculation of `agentDuration` for all event types
- Proper reset of duration when agents end and restart
- Integration with existing analytics pipeline

### Backward Compatibility

This implementation maintains full backward compatibility:

- Existing analytics events continue to work
- `agentDuration` is optional in the API payload
- No breaking changes to existing functionality

### Issue Resolution

**Fixed Issues:**

- ✅ `agentDuration` is now properly saved to the database
- ✅ `instanceId` and other fields are being passed correctly
- ✅ API endpoint properly extracts and stores `agentDuration` field
- ✅ Database index created for efficient `agentDuration` queries
