# Analytics Integration for Sable Smart Links

This document describes the analytics integration that has been added to Sable Smart Links to track text agent interactions.

## Overview

The analytics system tracks user interactions with text agents and sends the data to a MongoDB database via REST API endpoints. The system is designed to be privacy-friendly, using anonymous session and user IDs.

## Features

- **Automatic Event Logging**: Text agent events are automatically logged when they occur
- **Session Management**: Session IDs are stored in sessionStorage and persist for the browser session
- **User Tracking**: User IDs are stored in localStorage and persist across browser sessions
- **Environment Detection**: Automatically detects development vs production environments
- **Error Handling**: Analytics failures don't break the main application
- **Privacy-First**: No personally identifiable information is collected

## Configuration

### Basic Configuration

```javascript
import SableSmartLinks from "sable-smart-links";

const sable = new SableSmartLinks({
  analytics: {
    enabled: true, // Enable/disable analytics
    logEvents: true, // Enable/disable event logging
    sessionStorage: true, // Use sessionStorage for session IDs
    localStorage: true, // Use localStorage for user IDs
  },
});
```

### Disable Analytics

```javascript
const sable = new SableSmartLinks({
  analytics: {
    enabled: false,
  },
});
```

## API Endpoints

The analytics system uses the following endpoints:

- **Development**: `http://localhost:3001/api/analytics/text-agent`
- **Production**: `https://sable-smart-links.vercel.app/api/analytics/text-agent`

## Tracked Events

The following text agent events are automatically logged:

### 1. `start`

Triggered when a text agent starts.

**Metadata:**

- `autoStart`: Whether the agent started automatically
- `skipTrigger`: Whether trigger checks were skipped
- `stepId`: The step ID that was started from
- `totalSteps`: Total number of steps in the agent

### 2. `next`

Triggered when moving to the next step.

**Metadata:**

- `previousStepId`: ID of the previous step
- `previousStepIndex`: Index of the previous step
- `totalSteps`: Total number of steps
- `isLastStep`: Whether this is the last step

### 3. `previous`

Triggered when moving to the previous step.

**Metadata:**

- `nextStepId`: ID of the next step
- `nextStepIndex`: Index of the next step
- `totalSteps`: Total number of steps

### 4. `end`

Triggered when a text agent ends.

**Metadata:**

- `totalSteps`: Total number of steps
- `stepsCompleted`: Number of steps completed
- `completionReason`: Why the agent ended ('user_finished' or 'agent_ended')

### 5. `restart`

Triggered when a text agent is restarted.

**Metadata:**

- `stepId`: Step ID to restart from
- `skipTrigger`: Whether trigger checks were skipped
- `totalSteps`: Total number of steps
- `wasRunning`: Whether the agent was running before restart

### 6. `step_rendered`

Triggered when a step is rendered.

**Metadata:**

- `isAutoStart`: Whether this was an auto-start
- `stepType`: Type of step (popup, tooltip, etc.)
- `hasTargetElement`: Whether the step has a target element
- `targetSelector`: CSS selector of the target element
- `totalSteps`: Total number of steps

### 7. `step_triggered`

Triggered when a step trigger is activated.

**Metadata:**

- `triggerType`: Type of trigger ('typing', 'button')
- `triggerSelector`: CSS selector that triggered the step
- `triggerOn`: For typing triggers, when the trigger fires ('start', 'stop')
- `triggerEvent`: For button triggers, the event type ('click', etc.)
- `delay`: Delay before showing the step
- `stopDelay`: For typing triggers, delay after stopping
- `isAutoStart`: Whether this was an auto-start

## Session and User Management

### Session IDs

- Stored in `sessionStorage` as `sable_analytics_session_id`
- Format: `session_[random9chars]_[timestamp]`
- Persists for the browser session
- Automatically generated if not present

### User IDs

- Stored in `localStorage` as `sable_analytics_user_id`
- Format: `user_[random9chars]_[timestamp]`
- Persists across browser sessions
- Automatically generated if not present

## API Methods

### Get Analytics Information

```javascript
// Get current session ID
const sessionId = sable.getAnalyticsSessionId();

// Get current user ID
const userId = sable.getAnalyticsUserId();
```

### Reset Analytics

```javascript
// Reset session ID (creates new session)
sable.resetAnalyticsSession();

// Reset user ID (creates new user)
sable.resetAnalyticsUser();
```

## Data Schema

Each analytics event includes:

```javascript
{
  event: "start",                    // Event type
  agentId: "my-agent",              // Agent identifier
  stepId: "step-1",                 // Step identifier
  stepIndex: 0,                     // Step index (0-based)
  sessionId: "session_abc123",      // Session identifier
  userId: "user_456",               // User identifier
  metadata: {                       // Event-specific metadata
    autoStart: true,
    triggerType: "auto",
    pageUrl: "https://example.com",
    screenSize: "1920x1080",
    userAgent: "Mozilla/5.0...",
    timestamp: "2024-01-01T12:00:00Z"
  },
  timestamp: "2024-01-01T12:00:00Z" // When the event occurred
}
```

## Testing

Use the provided test file to verify analytics functionality:

```bash
# Start the development server
cd api
npm start

# Open the test file in a browser
open examples/analytics-test.html
```

The test file includes:

- Analytics configuration display
- Session and user ID management
- Text agent event testing
- Real-time event logging

## Error Handling

The analytics system is designed to be non-intrusive:

- Analytics failures don't break the main application
- Network errors are logged but don't throw exceptions
- Invalid data is logged but doesn't prevent other analytics
- Missing required fields are logged as warnings

## Privacy Considerations

- No personally identifiable information is collected
- Session and user IDs are randomly generated
- No IP addresses or device fingerprints are stored
- All data is anonymous and aggregated
- Users can reset their session/user IDs at any time

## Database Schema

The analytics data is stored in MongoDB with the following schema:

```javascript
{
  _id: ObjectId,
  event: String,           // Event type
  agentId: String,         // Agent identifier
  stepId: String,          // Step identifier
  stepIndex: Number,       // Step index
  sessionId: String,       // Session identifier
  userId: String,          // User identifier
  metadata: Object,        // Event metadata
  timestamp: Date,         // Event timestamp
  createdAt: Date          // Record creation timestamp
}
```

## Indexes

The following indexes are automatically created for optimal query performance:

- `sessionId` (ascending)
- `agentId` (ascending)
- `event` (ascending)
- `timestamp` (descending)
- `sessionId + agentId` (compound)
- `sessionId + timestamp` (compound)

## Environment Detection

The system automatically detects the environment:

- **Development**: Uses `http://localhost:3001`
- **Production**: Uses `https://sable-smart-links.vercel.app`

Detection is based on `window.location.hostname`:

- `localhost` or `127.0.0.1` → Development
- All others → Production

## Troubleshooting

### Common Issues

1. **Analytics not logging**

   - Check that `analytics.enabled` is `true`
   - Verify network connectivity to the API endpoint
   - Check browser console for error messages

2. **Session/User IDs not persisting**

   - Verify that sessionStorage/localStorage is available
   - Check browser privacy settings
   - Ensure cookies are enabled

3. **API errors**
   - Verify the API server is running (development)
   - Check API endpoint configuration
   - Review server logs for errors

### Debug Mode

Enable debug mode to see detailed analytics logs:

```javascript
const sable = new SableSmartLinks({
  debug: true,
  analytics: {
    enabled: true,
  },
});
```

This will log all analytics events to the browser console with the prefix `[SableAnalytics]`.
