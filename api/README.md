# Sable Smart Links API

Express API for data logging and fetching for the Sable Smart Links NPM package.

## Setup

1. Install dependencies:

```bash
cd api
npm install
```

2. Configure environment variables:

```bash
cp env.example .env
# Edit .env with your MongoDB connection string
```

3. Start the server:

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Health Check

- **GET** `/health` - Server health status

### Data Logging

- **POST** `/api/log` - Log an event
  - Body: `{ event, data?, userId?, sessionId?, timestamp? }`

### Data Fetching

- **GET** `/api/logs` - Fetch logs
  - Query params: `userId?, sessionId?, event?, limit?, skip?`

### Analytics

- **GET** `/api/analytics` - Get analytics data
  - Query params: `userId?, sessionId?, startDate?, endDate?`

## Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 3001)

## Database Schema

The API uses a `logs` collection with the following structure:

```javascript
{
  event: String,           // Required: Event type
  data: Object,            // Optional: Additional data
  userId: String,          // Optional: User identifier
  sessionId: String,       // Optional: Session identifier
  timestamp: Date,         // Event timestamp
  createdAt: Date          // Record creation timestamp
}
```
