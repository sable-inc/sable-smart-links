# Text Agent Instance ID Implementation

## Overview

The instanceId feature allows tracking of specific instances of text agents, enabling grouping of analytics events (start, step_rendered, end, etc.) to the same agent instance rather than just the agentId.

## Implementation Details

### 1. Instance ID Generation

- **Location**: `src/core/textAgentEngine.js`
- **Method**: `_generateInstanceId()`
- **Format**: `instance_${randomString}_${timestamp}`
- **Example**: `instance_a1b2c3d4e_1703123456789`

### 2. Instance ID Lifecycle

1. **Generation**: When an agent starts (via `start()` method), a new instanceId is generated
2. **Tracking**: The instanceId is stored in `engine.currentInstanceId`
3. **Usage**: All analytics events for that agent instance use the same instanceId
4. **Cleanup**: When the agent ends, the instanceId is cleared

### 3. Analytics Integration

#### Updated Functions in `src/utils/analytics.js`:

- `logTextAgentEvent()` - Now accepts `instanceId` parameter
- `logTextAgentStart()` - Updated to pass instanceId
- `logTextAgentNext()` - Updated to pass instanceId
- `logTextAgentPrevious()` - Updated to pass instanceId
- `logTextAgentEnd()` - Updated to pass instanceId
- `logTextAgentRestart()` - Updated to pass instanceId
- `logTextAgentStepRendered()` - Updated to pass instanceId

#### Updated Analytics Calls in `src/core/textAgentEngine.js`:

- All analytics calls now include the current instanceId
- InstanceId is generated at agent start and cleared at agent end

### 4. Database Schema

#### MongoDB Collection: `textAgentAnalytics`

- **New Field**: `instanceId` (String, optional)
- **Index**: Added index on `instanceId` for efficient querying
- **Compound Index**: Added `{ sessionId: 1, instanceId: 1 }` for session-based instance tracking

### 5. API Updates

#### Endpoint: `POST /api/analytics/text-agent`

- **New Parameter**: `instanceId` (optional)
- **Storage**: instanceId is stored in the analytics record
- **Validation**: instanceId is optional, so existing analytics continue to work

## Usage Examples

### Querying Analytics by Instance

```javascript
// Get all events for a specific agent instance
db.textAgentAnalytics.find({
  instanceId: "instance_a1b2c3d4e_1703123456789",
});

// Get all events for an agent across all instances
db.textAgentAnalytics.find({
  agentId: "my-agent",
});

// Get all events for a session with instance grouping
db.textAgentAnalytics
  .find({
    sessionId: "session_abc123_1703123456789",
  })
  .sort({ instanceId: 1, timestamp: 1 });
```

### Analytics Event Flow

1. **Agent Start**: `start` event with new instanceId
2. **Step Rendering**: `step_rendered` events with same instanceId
3. **Navigation**: `next`/`previous` events with same instanceId
4. **Agent End**: `end` event with same instanceId
5. **Agent Restart**: New instanceId generated for new instance

## Benefits

1. **Instance Tracking**: Can track complete user journeys through specific agent instances
2. **Analytics Grouping**: Group related events by instance rather than just agent
3. **Session Analysis**: Understand how users interact with specific agent runs
4. **Debugging**: Easier to debug issues with specific agent instances
5. **Backward Compatibility**: Existing analytics continue to work (instanceId is optional)

## Testing

A test file has been created at `test/instance-id-test.html` to verify:

- InstanceId generation
- InstanceId tracking across agent lifecycle
- Analytics event correlation
- InstanceId cleanup on agent end

## Migration Notes

- **Backward Compatible**: Existing analytics records will have `instanceId: null`
- **Optional Field**: All analytics functions accept `instanceId` as optional parameter
- **No Breaking Changes**: Existing code continues to work without modification
- **Gradual Rollout**: Can be enabled per agent or globally

## Future Enhancements

1. **Instance Metadata**: Store additional metadata about each instance
2. **Instance Analytics**: Aggregate analytics per instance
3. **Instance Comparison**: Compare performance across different instances
4. **Instance Persistence**: Option to persist instance state across page reloads
