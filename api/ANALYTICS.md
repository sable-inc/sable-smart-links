# Analytics System Documentation

This document describes the analytics logging system for Sable Smart Links, which tracks user interactions with text agents and walkthroughs.

## Overview

The analytics system consists of four separate collections in MongoDB:

- `textAgentAnalytics` - Tracks text agent interactions
- `walkthroughAnalytics` - Tracks walkthrough interactions
- `crawlBedrockQueries` - Tracks Bedrock crawl optimization queries
- `searchBedrockQueries` - Tracks Bedrock search optimization queries

Each collection stores events with timestamps and anonymous session IDs to track user journeys without compromising privacy.

**Note**: Auto-start events for text agents are not logged to analytics. Only manual triggers and actual step renders are tracked to focus on meaningful user interactions rather than potential triggers that may never be activated.

## Database Schemas

### Text Agent Analytics Schema

```javascript
{
  _id: ObjectId,
  event: String,           // Required: 'start', 'next', 'previous', 'end', 'restart', 'step_rendered', 'step_triggered'
  agentId: String,         // Required: Unique identifier for the text agent
  stepId: String,          // Required: ID of the specific step
  instanceId: String,      // Optional: Unique identifier for the agent instance
  stepDuration: Number,    // Optional: Duration of the step in milliseconds
  agentDuration: Number,   // Optional: Duration of the agent instance in milliseconds
  sessionId: String,       // Required: Anonymous session identifier
  userId: String,          // Optional: User identifier (localStorage/cookie-based)
  metadata: Object,        // Optional: Additional context-specific information
  timestamp: Date,         // Required: When the event occurred
  createdAt: Date,         // Server-generated: When the record was created
  updatedAt: Date          // Optional: When the record was last updated (for PATCH operations)
}
```

### Walkthrough Analytics Schema

```javascript
{
  _id: ObjectId,
  event: String,           // Required: 'start', 'next', 'end', 'step_executed', 'step_error'
  walkthroughId: String,   // Required: Unique identifier for the walkthrough
  stepIndex: Number,       // Required: Index of the current step (0-based)
  stepId: String,          // Required: Unique identifier for the step from config
  stepSelector: String,    // Optional: XPath or CSS selector for the target element
  instanceId: String,      // Optional: Unique identifier for the walkthrough instance
  stepDuration: Number,    // Optional: Duration of the step in milliseconds
  agentDuration: Number,   // Optional: Duration of the walkthrough instance in milliseconds
  sessionId: String,       // Required: Anonymous session identifier
  userId: String,          // Optional: User identifier (localStorage/cookie-based)
  metadata: Object,        // Optional: Additional context-specific information
  timestamp: Date,         // Required: When the event occurred
  createdAt: Date,         // Server-generated: When the record was created
  updatedAt: Date          // Optional: When the record was last updated (for PATCH operations)
}
```

**Note**: The `timestamp` field represents when the actual event occurred (user action), while `createdAt` is automatically set by the server when the database record is created. Use `timestamp` for analytics and user journey analysis, and `createdAt` for data integrity and debugging purposes.

### Crawl Bedrock Queries Schema

```javascript
{
  _id: ObjectId,
  sessionId: String,       // Required: Anonymous session identifier
  userId: String,          // Optional: User identifier (localStorage/cookie-based)
  input: {
    url: String,             // Required: The URL being crawled
    instructions: String,    // Required: Instructions for the crawl
  },
  output: {
    extractDepth: String,  // "basic" | "advanced"
    categories: Array,     // Array of category strings
    explanation: String,   // Explanation of parameter choices
    otherCrawls: Array     // Array of {url: string, instructions: string}
  },
  duration: Number,        // Required: Query duration in milliseconds
  error: String,           // Optional: Error message (null if successful)
  timestamp: Date,         // Required: When the query was made
  createdAt: Date          // Server-generated: When the record was created
}
```

### Search Bedrock Queries Schema

```javascript
{
  _id: ObjectId,
  sessionId: String,       // Required: Anonymous session identifier
  userId: String,          // Optional: User identifier (localStorage/cookie-based)
  input: {
    query: String,           // Required: The search query
  },
  output: {
    searchTopic: String,   // "general" | "news" | "finance"
    searchDepth: String,   // "basic" | "advanced"
    timeRange: String,     // "none" | "day" | "week" | "month" | "year"
    includeAnswer: String, // "none" | "basic" | "advanced"
    explanation: String,   // Explanation of parameter choices
    otherQueries: Array    // Array of related query strings
  },
  duration: Number,        // Required: Query duration in milliseconds
  error: String,           // Optional: Error message (null if successful)
  timestamp: Date,         // Required: When the query was made
  createdAt: Date          // Server-generated: When the record was created
}
```

## Metadata

The `metadata` field allows you to store additional context-specific information about each event. This is useful for debugging, analytics, and understanding user behavior patterns.

### Text Agent Metadata

The metadata field contains contextual information that is automatically populated by the analytics system plus any custom metadata passed by the application. Common fields include:

```javascript
{
  // Automatically populated fields
  pageUrl: string,              // Current page URL
  userAgent: string,            // User's browser user agent
  timestamp: string,            // ISO timestamp when event occurred

  // Application-specific fields (examples from actual usage)
  skipTrigger: boolean,         // Whether trigger was skipped
  stepId: string,               // Target step ID for navigation
  isAutoStart: boolean,         // Whether this was an auto-start event
  stepType: string,             // Type of step ('popup', 'arrow', 'yes-no', etc.)
  hasTargetElement: boolean,    // Whether step has a target element
  targetSelector: string,       // CSS selector for target element
  triggerInfo: object,          // Information about what triggered the step
  completionReason: string,     // How the agent ended ('manual', 'user_finished', 'agent_ended')
  stepsCompleted: number,       // Number of steps completed
  previousStepId: string,       // ID of previous step (for navigation events)
  nextStepId: string,          // ID of next step (for navigation events)
  wasRunning: boolean          // Whether agent was running (for restart events)
}
```

**Example Text Agent Metadata for step_rendered event:**

```javascript
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "isAutoStart": false,
  "stepType": "popup",
  "hasTargetElement": true,
  "targetSelector": ".signup-button"
}
```

### Walkthrough Metadata

The metadata field contains contextual information that is automatically populated by the analytics system plus any custom metadata passed by the application. Common fields include:

```javascript
{
  // Automatically populated fields
  pageUrl: string,              // Current page URL
  userAgent: string,            // User's browser user agent
  timestamp: string,            // ISO timestamp when event occurred
  screenSize: string,           // Screen dimensions (e.g., "1920x1080")

  // Application-specific fields (examples from actual usage)
  walkthroughType: string,      // Type of walkthrough ('tutorial', 'onboarding', 'feature_guide')
  stepType: string,             // Type of step ('highlight', 'tooltip', 'action', 'modal')
  actionPerformed: string,      // Action taken by user ('click', 'input', 'hover')
  elementTargeted: string,      // CSS selector of the targeted element
  interactionTime: number,      // Time user spent on this step (ms)
  navigationMethod: string,     // How user moved to next step ('auto', 'manual', 'timeout')
  errorType: string,            // Type of error ('element_not_found', 'timeout', 'action_failed')
  errorMessage: string,         // Detailed error message
  errorContext: object          // Additional error context
}
```

**Example Walkthrough Metadata for start event:**

```javascript
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "screenSize": "1920x1080",
  "walkthroughType": "onboarding"
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
// start event (auto-start events are not logged)
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "skipTrigger": false,
  "stepId": "welcome-step"
}

// step_rendered event
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "isAutoStart": false,
  "stepType": "popup",
  "hasTargetElement": true,
  "targetSelector": ".signup-button"
}

// end event
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "completionReason": "user_finished",
  "stepsCompleted": 3
}
```

**Walkthrough Events:**

```javascript
// start event
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "screenSize": "1920x1080",
  "walkthroughType": "onboarding"
}

// step_executed event
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "screenSize": "1920x1080",
  "stepType": "highlight",
  "actionPerformed": "click",
  "elementTargeted": ".signup-button"
}

// step_error event
{
  "pageUrl": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "screenSize": "1920x1080",
  "errorType": "element_not_found",
  "errorMessage": "Target element .signup-button not found"
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

### Crawl Bedrock Queries Analytics

#### POST `/api/analytics/crawl-bedrock`

Log a crawl Bedrock query event.

**Request Body:**

```javascript
{
  "sessionId": "session_abc123",      // Optional (auto-generated if not provided)
  "userId": "user-456",               // Optional (see User ID Tracking section)
  "input": {                          // Required
    "url": "https://example.com",     // Required: The URL being crawled
    "instructions": "Extract pricing information" // Required: Instructions for the crawl
  },
  "output": {                         // Required on success, omit on error
    "extractDepth": "advanced",
    "categories": ["Pricing", "Documentation"],
    "explanation": "Selected advanced depth for detailed pricing analysis",
    "otherCrawls": [
      {
        "url": "https://example.com/docs",
        "instructions": "Get API documentation"
      }
    ]
  },
  "duration": 2500,                   // Required: Duration in milliseconds
  "error": null,                      // Optional: Error message (null if successful)
  "timestamp": "2024-01-01T12:00:00Z" // Optional (defaults to current time)
}
```

**Response:**

```javascript
{
  "success": true,
  "id": "507f1f77bcf86cd799439011",
  "sessionId": "session_abc123",
  "message": "Crawl Bedrock query analytics logged successfully"
}
```

#### GET `/api/analytics/crawl-bedrock`

Retrieve crawl Bedrock query analytics with filtering.

**Query Parameters:**

- `sessionId` - Filter by session ID
- `userId` - Filter by user ID
- `url` - Filter by URL
- `hasError` - Filter by error status (true/false)
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

### Search Bedrock Queries Analytics

#### POST `/api/analytics/search-bedrock`

Log a search Bedrock query event.

**Request Body:**

```javascript
{
  "sessionId": "session_abc123",      // Optional (auto-generated if not provided)
  "userId": "user-456",               // Optional (see User ID Tracking section)
  "input": {                          // Required
    "query": "latest AI news"         // Required: The search query
  },
  "output": {                         // Required on success, omit on error
    "searchTopic": "news",
    "searchDepth": "advanced",
    "timeRange": "week",
    "includeAnswer": "basic",
    "explanation": "Selected news topic with weekly timeframe",
    "otherQueries": [
      "AI breakthroughs 2024",
      "machine learning updates",
      "artificial intelligence trends"
    ]
  },
  "duration": 1800,                   // Required: Duration in milliseconds
  "error": null,                      // Optional: Error message (null if successful)
  "timestamp": "2024-01-01T12:00:00Z" // Optional (defaults to current time)
}
```

**Response:**

```javascript
{
  "success": true,
  "id": "507f1f77bcf86cd799439011",
  "sessionId": "session_abc123",
  "message": "Search Bedrock query analytics logged successfully"
}
```

#### GET `/api/analytics/search-bedrock`

Retrieve search Bedrock query analytics with filtering.

**Query Parameters:**

- `sessionId` - Filter by session ID
- `userId` - Filter by user ID
- `query` - Filter by search query (partial match)
- `searchTopic` - Filter by search topic
- `hasError` - Filter by error status (true/false)
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

### Text Agent Analytics

#### POST `/api/analytics/text-agent`

Log a text agent event.

**Request Body:**

```javascript
{
  "event": "start",                    // Required
  "agentId": "my-agent",              // Required
  "stepId": "step-1",                 // Required
  "instanceId": "instance_abc123",    // Optional (unique identifier for agent instance)
  "stepDuration": 5000,               // Optional (duration of step in milliseconds)
  "agentDuration": 15000,             // Optional (duration of agent instance in milliseconds)
  "sessionId": "session_abc123",      // Optional (auto-generated if not provided)
  "userId": "user-456",               // Optional (see User ID Tracking section)
  "metadata": {                       // Optional (see Metadata section)
    "skipTrigger": false,
    "stepType": "popup",
    "pageUrl": "https://example.com/help"
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
  "stepId": "welcome-step",           // Required (unique identifier for the step from config)
  "stepSelector": ".target-element",   // Optional
  "instanceId": "instance_abc123",    // Optional (unique identifier for walkthrough instance)
  "stepDuration": 5000,               // Optional (duration of step in milliseconds)
  "agentDuration": 15000,             // Optional (duration of walkthrough instance in milliseconds)
  "sessionId": "session_abc123",      // Optional (auto-generated if not provided)
  "userId": "user-456",               // Optional (see User ID Tracking section)
  "metadata": {                       // Optional (see Metadata section)
    "walkthroughType": "onboarding",
    "pageUrl": "https://example.com/dashboard"
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

#### PATCH `/api/analytics/text-agent/:id`

Update the step duration for a text agent analytics event.

**Request Body:**

```javascript
{
  "stepDuration": 5000  // Required: Duration in milliseconds (non-negative number)
}
```

**Response:**

```javascript
{
  "success": true,
  "message": "Analytics event duration updated successfully"
}
```

#### PATCH `/api/analytics/walkthrough/:id`

Update the step duration for a walkthrough analytics event.

**Request Body:**

```javascript
{
  "stepDuration": 5000  // Required: Duration in milliseconds (non-negative number)
}
```

**Response:**

```javascript
{
  "success": true,
  "message": "Walkthrough analytics event duration updated successfully"
}
```

#### GET `/api/analytics/walkthrough`

Retrieve walkthrough analytics with filtering.

**Query Parameters:**

- `sessionId` - Filter by session ID
- `walkthroughId` - Filter by walkthrough ID
- `stepId` - Filter by step ID
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
- `instanceId` (ascending)
- `event` (ascending)
- `timestamp` (descending)
- `agentDuration` (ascending)
- `sessionId + agentId` (compound)
- `sessionId + instanceId` (compound)
- `sessionId + timestamp` (compound)

### Walkthrough Analytics Indexes

- `sessionId` (ascending)
- `walkthroughId` (ascending)
- `stepId` (ascending)
- `instanceId` (ascending)
- `event` (ascending)
- `timestamp` (descending)
- `agentDuration` (ascending)
- `sessionId + walkthroughId` (compound)
- `sessionId + instanceId` (compound)
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
  "error": "Missing required field: stepId"
}
```

## Testing

Use the test script to verify the analytics system:

```bash
cd api
node test-analytics.js
```

This will test all endpoints and verify the collections are set up correctly.
