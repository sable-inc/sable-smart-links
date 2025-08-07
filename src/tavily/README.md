# Sable Tavily Integration

This module provides integration with Tavily's search and crawl APIs, with separate server-side and client-side implementations.

## Setup

### 1. Server-Side Setup (Next.js API Routes)

Create a file at `pages/api/sable/[...path].ts` in your Next.js app:

```typescript
import { createSableTavilyHandler } from "sable-smart-links/tavily";

const SABLE_API_KEY = process.env.SABLE_API_KEY;

if (!SABLE_API_KEY) {
  throw new Error("SABLE_API_KEY environment variable is required");
}

const handler = createSableTavilyHandler(SABLE_API_KEY);

export default handler;
```

### 2. Environment Variables

Add your Sable API key to your environment variables:

```env
SABLE_API_KEY=your_sable_api_key_here
```

## Usage

### Client-Side Functions

The main functions are designed to be used on the client-side and will automatically call your API endpoints:

```typescript
import {
  getOptimalCrawlParameters,
  getOptimalSearchParameters,
} from "sable-smart-links/tavily";

// Get optimal crawl parameters
const crawlParams = await getOptimalCrawlParameters(
  "https://example.com",
  "Extract all documentation and pricing information"
);

// Get optimal search parameters
const searchParams = await getOptimalSearchParameters(
  "latest AI developments in 2024"
);
```

### Server-Side Functions (Advanced)

If you need to use the functions directly on the server-side:

```typescript
import {
  getOptimalCrawlParametersServer,
  getOptimalSearchParametersServer,
} from "sable-smart-links/tavily";

// These require the Sable API key
const crawlParams = await getOptimalCrawlParametersServer(
  "https://example.com",
  "Extract all documentation and pricing information",
  process.env.SABLE_API_KEY!
);

const searchParams = await getOptimalSearchParametersServer(
  "latest AI developments in 2024",
  process.env.SABLE_API_KEY!
);
```

## API Endpoints

Once set up, the following endpoints will be available:

- `POST /api/sable/crawl` - Get optimal crawl parameters
- `POST /api/sable/search` - Get optimal search parameters

### Crawl Endpoint

**Request:**

```json
{
  "url": "https://example.com",
  "instructions": "Extract all documentation and pricing information"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "explanation": "I've set the following parameters:<br> **Extract Depth is advanced** — Complex documentation site.<br> **Categories include Documentation** — Technical content focus.",
    "otherCrawls": [
      "Extract all API documentation and code examples",
      "Extract all pricing information",
      "Extract all pricing information"
    ],
    "crawlParams": {
      "extractDepth": "advanced",
      "categories": ["Documentation", "Pricing"]
    }
  }
}
```

### Search Endpoint

**Request:**

```json
{
  "query": "latest AI developments in 2024"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "explanation": "I've set the following parameters:<br> **Search Topic is news** — Current events query.<br> **Search Depth is advanced** — Complex topic analysis.",
    "otherQueries": [
      "AI trends 2024",
      "artificial intelligence news this year"
    ],
    "searchParams": {
      "searchTopic": "news",
      "searchDepth": "advanced",
      "timeRange": "month",
      "includeAnswer": "basic"
    }
  }
}
```

## Error Handling

The client-side functions will throw descriptive errors if:

1. The API endpoints are not set up (404 error)
2. The request fails (network or server errors)
3. The response format is invalid

## Analytics

All function calls are automatically logged for analytics purposes, including:

- Input parameters
- Output results
- Duration
- Error information (if any)

## Types

```typescript
interface CrawlParameters {
  extractDepth: "basic" | "advanced";
  categories: (
    | "Documentation"
    | "Blogs"
    | "Community"
    | "About"
    | "Contact"
    | "Pricing"
    | "Enterprise"
    | "Careers"
    | "E-Commerce"
    | "Media"
    | "People"
  )[];
  explanation: string;
  otherCrawls: string[];
}

interface SearchParameters {
  searchTopic: "general" | "news" | "finance";
  searchDepth: "basic" | "advanced";
  timeRange: "none" | "day" | "week" | "month" | "year";
  includeAnswer: "none" | "basic" | "advanced";
  explanation: string;
  otherQueries: string[];
}
```
