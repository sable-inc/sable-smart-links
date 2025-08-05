# Analytics System Documentation

This document describes the analytics logging system for Sable Smart Links, which tracks user interactions with text agents and walkthroughs.

## Overview

The analytics system consists of two separate collections in MongoDB:

- `textAgentAnalytics` - Tracks text agent interactions
- `walkthroughAnalytics` - Tracks walkthrough interactions

Each collection stores events with timestamps and anonymous session IDs to track user journeys without compromising privacy.

## Database Schemas

### Text Agent Analytics Schema

```javascript
{
  _id: ObjectId,
  event: String,           // Required: 'start', 'next', 'previous', 'end', 'restart', 'step_rendered', 'step_triggered'
  agentId: String,         // Required: Unique identifier for the text agent
  stepId: String,          // Required: ID of the specific step
  stepIndex: Number,       // Required: Index of the current step (0-based)
  sessionId: String,       // Required: Anonymous session identifier
  userId: String,          // Optional: User identifier (localStorage/cookie-based)
  metadata: {
    // Trigger information
    autoStart: boolean,           // Whether the agent started automatically
    triggerType: string,          // 'auto', 'manual', 'element', 'typing', 'button'
    triggerSelector: string,      // CSS selector that triggered the agent

    // Step information
    stepType: string,             // 'popup', 'tooltip', 'highlight', 'action'
    stepDuration: number,         // How long the step was active (ms)

    // User interaction data
    buttonClicked: string,        // Which button was clicked ('yes', 'no', 'next', etc.)
    interactionTime: number,      // Time user spent on this step (ms)
  },
  timestamp: Date,         // Required: When the event occurred
  createdAt: Date          // Server-generated: When the record was created
}
```

### Walkthrough Analytics Schema

```javascript
{
  _id: ObjectId,
  event: String,           // Required: 'start', 'next', 'end', 'step_executed', 'step_error'
  walkthroughId: String,   // Required: Unique identifier for the walkthrough
  stepIndex: Number,       // Required: Index of the current step (0-based)
  stepSelector: String,    // Optional: XPath or CSS selector for the target element (analog to stepId for text agent)
  sessionId: String,       // Required: Anonymous session identifier
  userId: String,          // Optional: User identifier (localStorage/cookie-based)
  metadata: {
    // Step information
    stepType: string,             // 'highlight', 'tooltip', 'action', 'modal'
    stepDuration: number,         // How long the step was active (ms)

    // User interaction data
    actionPerformed: string,      // Action taken by user ('click', 'input', 'hover')
    elementTargeted: string,      // XPath or CSS selector of the targeted element
    interactionTime: number,      // Time user spent on this step (ms)

    // Navigation data
    navigationMethod: string,     // How user moved to next step ('auto', 'manual', 'timeout')

    // Error information (for step_error events)
    errorType: string,            // Type of error ('element_not_found', 'timeout', 'action_failed')
    errorMessage: string,         // Detailed error message
    errorContext: object,         // Additional error context
  },
  timestamp: Date,         // Required: When the event occurred
  createdAt: Date          // Server-generated: When the record was created
}
```

**Note**: The `timestamp` field represents when the actual event occurred (user action), while `createdAt` is automatically set by the server when the database record is created. Use `timestamp` for analytics and user journey analysis, and `createdAt` for data integrity and debugging purposes.

## Metadata

The `metadata` field allows you to store additional context-specific information about each event. This is useful for debugging, analytics, and understanding user behavior patterns.

### Text Agent Metadata

Common metadata fields for text agent events:

```javascript
{
  // Trigger information
  autoStart: boolean,           // Whether the agent started automatically
  triggerType: string,          // 'auto', 'manual', 'element', 'typing', 'button'
  triggerSelector: string,      // CSS selector that triggered the agent

  // Step information
  stepType: string,             // 'popup', 'tooltip', 'highlight', 'action'
  stepDuration: number,         // How long the step was active (ms)

  // User interaction data
  buttonClicked: string,        // Which button was clicked ('yes', 'no', 'next', etc.)
  interactionTime: number,      // Time user spent on this step (ms)
}
```

**Example Text Agent Metadata:**

```javascript
{
  "autoStart": true,
  "triggerType": "auto",
  "stepType": "popup",
  "stepDuration": 5000,
  "buttonClicked": "next",
  "interactionTime": 3000
}
```

### Walkthrough Metadata

Common metadata fields for walkthrough events:

```javascript
{
  // Walkthrough information
  walkthroughType: string,      // 'tutorial', 'onboarding', 'feature_guide'

  // Step information
  stepType: string,             // 'highlight', 'tooltip', 'action', 'modal'
  stepDuration: number,         // How long the step was active (ms)

  // User interaction data
  actionPerformed: string,      // Action taken by user ('click', 'input', 'hover')
  elementTargeted: string,      // CSS selector of the targeted element
  interactionTime: number,      // Time user spent on this step (ms)

  // Navigation data
  navigationMethod: string,     // How user moved to next step ('auto', 'manual', 'timeout')

  // Error information (for step_error events)
  errorType: string,            // Type of error ('element_not_found', 'timeout', 'action_failed')
  errorMessage: string,         // Detailed error message
  errorContext: object,         // Additional error context
}
```

**Example Walkthrough Metadata:**

```javascript
{
  "walkthroughType": "onboarding",
  "stepType": "highlight",
  "stepDuration": 8000,
  "actionPerformed": "click",
  "elementTargeted": ".signup-button",
  "interactionTime": 2000,
  "navigationMethod": "manual"
}
```

### Metadata Best Practices

1. **Keep it Relevant**: Only include metadata that provides actionable insights
2. **Be Consistent**: Use the same field names across similar events
3. **Avoid Sensitive Data**: Never include PII (Personally Identifiable Information)
4. **Use Descriptive Names**: Make field names self-explanatory
5. **Limit Size**: Keep metadata objects reasonably sized (< 1KB)
6. **Version Your Schema**: Consider adding a `metadataVersion` field for future compatibility

### Metadata Examples by Event Type

**Text Agent Events:**

```javascript
// start event
{
  "autoStart": true,
  "triggerType": "auto"
}

// next event
{
  "stepDuration": 5000,
  "buttonClicked": "next",
  "interactionTime": 3000
}

// end event
{
  "completionReason": "user_finished",
  "totalDuration": 15000,
  "stepsCompleted": 3
}
```

**Walkthrough Events:**

```javascript
// start event
{
  "walkthroughType": "onboarding"
}

// step_executed event
{
  "stepType": "highlight",
  "stepDuration": 8000,
  "actionPerformed": "click",
  "elementTargeted": ".signup-button",
  "interactionTime": 2000
}

// step_error event
{
  "errorType": "element_not_found",
  "errorMessage": "Target element .signup-button not found",
  "stepSelector": ".signup-button",
  "timeout": 10000
}
```

## User ID Tracking

Since the system doesn't require user accounts, you can implement userId tracking using various anonymous methods:

### 1. Browser Fingerprinting

Generate a unique identifier based on browser characteristics:

```javascript
// Example implementation
function generateUserId() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillText("Sable Analytics", 2, 2);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|");

  return btoa(fingerprint).substr(0, 16);
}
```

### 2. Local Storage

Store a persistent user ID in localStorage:

```javascript
function getOrCreateUserId() {
  let userId = localStorage.getItem("sable_user_id");
  if (!userId) {
    userId =
      "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    localStorage.setItem("sable_user_id", userId);
  }
  return userId;
}
```

### 3. Cookie-Based

Use a persistent cookie:

```javascript
function getOrCreateUserId() {
  let userId = getCookie("sable_user_id");
  if (!userId) {
    userId =
      "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
    setCookie("sable_user_id", userId, 365); // Expires in 1 year
  }
  return userId;
}
```

### 4. IP + User Agent Hash

For server-side tracking:

```javascript
function generateServerSideUserId(req) {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers["user-agent"];
  const hash = crypto
    .createHash("md5")
    .update(ip + userAgent)
    .digest("hex");
  return "user_" + hash.substr(0, 16);
}
```

## API Endpoints

### Text Agent Analytics

#### POST `/api/analytics/text-agent`

Log a text agent event.

**Request Body:**

```javascript
{
  "event": "start",                    // Required
  "agentId": "my-agent",              // Required
  "stepId": "step-1",                 // Required
  "stepIndex": 0,                     // Required (non-negative number)
  "sessionId": "session_abc123",      // Optional (auto-generated if not provided)
  "userId": "user-456",               // Optional (see User ID Tracking section)
  "metadata": {                       // Optional (see Metadata section)
    "autoStart": true,
    "triggerType": "auto",
    "pageUrl": "https://example.com/help",
    "screenSize": "1920x1080"
  },
  "timestamp": "2024-01-01T12:00:00Z" // Optional (defaults to current time)
}
```

**Response:**

```javascript
{
  "success": true,
  "id": "507f1f77bcf86cd799439011",
  "sessionId": "session_abc123",
  "message": "Text agent analytics logged successfully"
}
```

#### GET `/api/analytics/text-agent`

Retrieve text agent analytics with filtering.

**Query Parameters:**

- `sessionId` - Filter by session ID
- `agentId` - Filter by agent ID
- `event` - Filter by event type
- `userId` - Filter by user ID
- `startDate` - Filter by start date (ISO string)
- `endDate` - Filter by end date (ISO string)
- `limit` - Number of results (default: 100)
- `skip` - Number of results to skip (default: 0)

**Response:**

```javascript
{
  "success": true,
  "data": [...],
  "count": 10
}
```

#### GET `/api/analytics/text-agent/summary`

Get aggregated analytics summary.

**Query Parameters:**

- `sessionId` - Filter by session ID
- `agentId` - Filter by agent ID
- `startDate` - Filter by start date (ISO string)
- `endDate` - Filter by end date (ISO string)

**Response:**

```javascript
{
  "success": true,
  "data": [
    {
      "event": "start",
      "count": 25,
      "uniqueSessions": 15,
      "uniqueAgents": 8,
      "uniqueUsers": 12
    }
  ]
}
```

### Walkthrough Analytics

#### POST `/api/analytics/walkthrough`

Log a walkthrough event.

**Request Body:**

```javascript
{
  "event": "start",                    // Required
  "walkthroughId": "my-walkthrough",   // Required
  "stepIndex": 0,                     // Required (non-negative number)
  "stepSelector": ".target-element",   // Optional
  "sessionId": "session_abc123",      // Optional (auto-generated if not provided)
  "userId": "user-456",               // Optional (see User ID Tracking section)
  "metadata": {                       // Optional (see Metadata section)
    "totalSteps": 5,
    "walkthroughType": "onboarding",
    "pageUrl": "https://example.com/dashboard",
    "screenSize": "1920x1080"
  },
  "timestamp": "2024-01-01T12:00:00Z" // Optional (defaults to current time)
}
```

**Response:**

```javascript
{
  "success": true,
  "id": "507f1f77bcf86cd799439011",
  "sessionId": "session_abc123",
  "message": "Walkthrough analytics logged successfully"
}
```

#### GET `/api/analytics/walkthrough`

Retrieve walkthrough analytics with filtering.

**Query Parameters:**

- `sessionId` - Filter by session ID
- `walkthroughId` - Filter by walkthrough ID
- `event` - Filter by event type
- `userId` - Filter by user ID
- `startDate` - Filter by start date (ISO string)
- `endDate` - Filter by end date (ISO string)
- `limit` - Number of results (default: 100)
- `skip` - Number of results to skip (default: 0)

**Response:**

```javascript
{
  "success": true,
  "data": [...],
  "count": 10
}
```

#### GET `/api/analytics/walkthrough/summary`

Get aggregated walkthrough analytics summary.

**Query Parameters:**

- `sessionId` - Filter by session ID
- `walkthroughId` - Filter by walkthrough ID
- `startDate` - Filter by start date (ISO string)
- `endDate` - Filter by end date (ISO string)

**Response:**

```javascript
{
  "success": true,
  "data": [
    {
      "event": "start",
      "count": 30,
      "uniqueSessions": 20,
      "uniqueWalkthroughs": 10,
      "uniqueUsers": 15
    }
  ]
}
```

## Event Types

### Text Agent Events

- `start` - Agent started
- `next` - Moved to next step
- `previous` - Moved to previous step
- `end` - Agent ended
- `restart` - Agent restarted
- `step_rendered` - Step was rendered
- `step_triggered` - Step trigger was activated

### Walkthrough Events

- `start` - Walkthrough started
- `next` - Moved to next step
- `end` - Walkthrough ended
- `step_executed` - Step was executed
- `step_error` - Error occurred during step execution

## Database Indexes

The system automatically creates the following indexes for optimal query performance:

### Text Agent Analytics Indexes

- `sessionId` (ascending)
- `agentId` (ascending)
- `event` (ascending)
- `timestamp` (descending)
- `sessionId + agentId` (compound)
- `sessionId + timestamp` (compound)

### Walkthrough Analytics Indexes

- `sessionId` (ascending)
- `walkthroughId` (ascending)
- `event` (ascending)
- `timestamp` (descending)
- `sessionId + walkthroughId` (compound)
- `sessionId + timestamp` (compound)

## Session Management

The system automatically generates anonymous session IDs if not provided. Session IDs follow the format:
`session_[random9chars]_[timestamp]`

Example: `session_abc123def_1704067200000`

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad Request (validation errors)
- `500` - Internal Server Error

Error responses include a descriptive message:

```javascript
{
  "error": "Missing required field: stepIndex"
}
```

## Testing

Use the test script to verify the analytics system:

```bash
cd api
node test-analytics.js
```

This will test all endpoints and verify the collections are set up correctly.
