# Sable Smart Links Analytics

This document describes the analytics system for Sable Smart Links, which tracks user interactions with text agents and walkthroughs and stores the data in MongoDB.

## Overview

The analytics system provides comprehensive tracking of:

- **Text Agent Events**: Start, step completion, and completion/abandonment
- **Walkthrough Events**: Start, step completion, and completion/abandonment
- **Timing Data**: Step duration, total duration, and completion rates
- **User Behavior**: Session tracking, user identification, and interaction patterns

## Features

- **Real-time Tracking**: Events are tracked as they happen
- **Batch Processing**: Events are batched and sent to reduce API calls
- **Session Management**: Automatic session and user ID generation
- **MongoDB Integration**: Optimized schemas and indexes for fast queries
- **Configurable**: Enable/disable analytics and customize endpoints
- **Error Handling**: Graceful fallback when analytics service is unavailable

## Quick Start

### 1. Enable Analytics in Your App

```javascript
import { SableSmartLinks } from "sable-smart-links";

const sable = new SableSmartLinks({
  analytics: {
    enabled: true,
    endpoint: "https://your-api.com/api/analytics",
    batchSize: 10,
    flushInterval: 5000,
    debug: false,
  },
});

sable.init();
```

### 2. Set Up MongoDB Backend

Use the provided backend example or create your own:

```bash
cd examples
npm install
npm start
```

### 3. Configure MongoDB Atlas

1. Create a MongoDB Atlas cluster
2. Get your connection string
3. Set the `MONGODB_URI` environment variable
4. The backend will automatically create the necessary collections and indexes

## Configuration Options

### Analytics Configuration

| Option          | Type    | Default            | Description                              |
| --------------- | ------- | ------------------ | ---------------------------------------- |
| `enabled`       | boolean | `false`            | Enable/disable analytics tracking        |
| `endpoint`      | string  | `'/api/analytics'` | Backend API endpoint for analytics       |
| `batchSize`     | number  | `10`               | Number of events to batch before sending |
| `flushInterval` | number  | `5000`             | Milliseconds between automatic flushes   |
| `debug`         | boolean | `false`            | Enable debug logging                     |

### Example Configuration

```javascript
const analyticsConfig = {
  enabled: true,
  endpoint: "https://api.yourdomain.com/analytics",
  batchSize: 20,
  flushInterval: 3000,
  debug: true,
};
```

## Event Types

### Text Agent Events

- `text_agent_started`: When a text agent begins
- `text_agent_step_completed`: When a step is completed
- `text_agent_completed`: When an agent is fully completed
- `text_agent_abandoned`: When an agent is abandoned

### Walkthrough Events

- `walkthrough_started`: When a walkthrough begins
- `walkthrough_step_completed`: When a step is completed
- `walkthrough_completed`: When a walkthrough is fully completed
- `walkthrough_abandoned`: When a walkthrough is abandoned

## Data Schema

### Event Schema

```javascript
{
  type: 'text_agent_started',
  category: 'text_agent',
  timestamp: Date,
  sessionId: 'session_1234567890_abc123',
  userId: 'user_1234567890_xyz789',
  userAgent: 'Mozilla/5.0...',
  url: 'https://example.com/page',
  data: {
    agentId: 'my-agent',
    stepId: 'step-1',
    stepIndex: 0,
    totalSteps: 5,
    timestamp: Date
  }
}
```

### Session Schema

```javascript
{
  sessionId: 'session_1234567890_abc123',
  userId: 'user_1234567890_xyz789',
  startTime: Date,
  endTime: Date,
  duration: 300000, // milliseconds
  textAgents: {
    started: 2,
    completed: 1,
    abandoned: 1,
    totalSteps: 8,
    averageStepTime: 15000,
    agents: [...]
  },
  walkthroughs: {
    started: 1,
    completed: 1,
    abandoned: 0,
    totalSteps: 3,
    averageStepTime: 8000,
    walkthroughs: [...]
  }
}
```

## Backend API

### Endpoints

#### POST `/api/analytics`

Receives analytics events from the frontend.

**Request Body:**

```javascript
{
  events: [
    {
      type: 'text_agent_started',
      category: 'text_agent',
      timestamp: 1640995200000,
      sessionId: 'session_123',
      userId: 'user_456',
      data: { ... }
    }
  ]
}
```

#### GET `/api/analytics/summary`

Returns aggregated analytics data.

**Query Parameters:**

- `period`: 'daily', 'weekly', 'monthly' (default: 'daily')
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**

```javascript
{
  period: 'daily',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-01-01T23:59:59.999Z',
  textAgents: {
    totalStarted: 150,
    totalCompleted: 120,
    totalAbandoned: 30,
    topAgents: [...]
  },
  walkthroughs: {
    totalStarted: 75,
    totalCompleted: 60,
    totalAbandoned: 15,
    topWalkthroughs: [...]
  },
  sessions: {
    totalSessions: 200,
    uniqueUsers: 150,
    averageSessionDuration: 180000
  }
}
```

#### GET `/api/health`

Health check endpoint.

## MongoDB Collections

### `analytics_events`

Stores individual analytics events.

**Indexes:**

- `{ type: 1, timestamp: -1 }`
- `{ category: 1, timestamp: -1 }`
- `{ userId: 1, timestamp: -1 }`
- `{ sessionId: 1, timestamp: -1 }`
- `{ 'data.agentId': 1, timestamp: -1 }`
- `{ 'data.walkthroughId': 1, timestamp: -1 }`

### `analytics_sessions`

Stores session-level aggregated data.

**Indexes:**

- `{ sessionId: 1 }` (unique)
- `{ userId: 1, startTime: -1 }`
- `{ startTime: -1 }`

### `analytics_summaries`

Stores daily/weekly/monthly aggregated data.

**Indexes:**

- `{ period: 1, startDate: -1 }`
- `{ startDate: -1, endDate: -1 }`

## Usage Examples

### Basic Text Agent with Analytics

```javascript
// Register a text agent
sable.registerTextAgent("onboarding", [
  {
    id: "welcome",
    text: "Welcome to our platform!",
    buttonType: "arrow",
  },
  {
    id: "features",
    text: "Let's explore the key features.",
    buttonType: "arrow",
  },
]);

// Start the agent (analytics will be tracked automatically)
sable.startTextAgent("onboarding");
```

### Basic Walkthrough with Analytics

```javascript
// Register a walkthrough
sable.registerWalkthrough("feature-tour", [
  {
    target: "#dashboard-button",
    tooltip: "Click here to access your dashboard",
    highlight: true,
  },
  {
    target: "#settings-panel",
    tooltip: "Configure your preferences here",
    highlight: true,
  },
]);

// Start the walkthrough (analytics will be tracked automatically)
sable.startWalkthrough("feature-tour");
```

### Custom Analytics Integration

```javascript
// Access the analytics instance directly
const analytics = sable.analytics;

// Track custom events
analytics.trackTextAgentEvent("custom_event", {
  agentId: "my-agent",
  customData: "value",
});

// Force flush events
analytics.flush();
```

## Analytics Dashboard

The analytics data can be visualized in a dashboard similar to the one shown in the image. Key metrics include:

- **Total Events**: Number of analytics events tracked
- **Text Agents Started**: Number of text agents initiated
- **Walkthroughs Started**: Number of walkthroughs initiated
- **Completion Rate**: Percentage of completed vs started interactions
- **Average Completion Time**: Average time to complete interactions
- **Top Performing Agents/Walkthroughs**: Most used and successful guides

## Best Practices

### 1. Performance Optimization

- Use appropriate batch sizes (10-20 events)
- Set reasonable flush intervals (3-5 seconds)
- Monitor API response times

### 2. Data Privacy

- Implement user consent mechanisms
- Consider data retention policies
- Anonymize sensitive data if needed

### 3. Error Handling

- Always handle analytics failures gracefully
- Don't let analytics errors break core functionality
- Implement retry mechanisms for failed requests

### 4. Monitoring

- Monitor analytics API health
- Track event processing rates
- Set up alerts for unusual patterns

## Troubleshooting

### Common Issues

1. **Events not being sent**

   - Check if analytics is enabled
   - Verify the endpoint URL is correct
   - Check browser console for errors

2. **High latency**

   - Reduce batch size
   - Increase flush interval
   - Check network connectivity

3. **Missing data**
   - Verify MongoDB connection
   - Check if indexes are created
   - Review event validation

### Debug Mode

Enable debug mode to see detailed logging:

```javascript
const sable = new SableSmartLinks({
  analytics: {
    enabled: true,
    debug: true,
  },
});
```

## Migration Guide

### From Previous Versions

If you're upgrading from a version without analytics:

1. Add analytics configuration to your existing setup
2. Test with a small subset of users
3. Monitor performance impact
4. Gradually roll out to all users

### Data Migration

If you have existing analytics data:

1. Export existing data
2. Transform to new schema format
3. Import into new MongoDB collections
4. Verify data integrity

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the example code
3. Enable debug mode for detailed logs
4. Contact support with specific error messages

## License

This analytics system is part of Sable Smart Links and follows the same license terms.
