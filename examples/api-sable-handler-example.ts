// Example: pages/api/sable/[...path].ts
// This file shows how to set up the Sable Tavily API handler in your Next.js app

import { createSableTavilyHandler } from 'sable-smart-links/tavily';
import type { NextApiRequest, NextApiResponse } from 'next';

// Get your Sable API key from environment variables
const SABLE_API_KEY = process.env.SABLE_API_KEY;

if (!SABLE_API_KEY) {
  throw new Error('SABLE_API_KEY environment variable is required');
}

// Create the handler with your API key
const handler = createSableTavilyHandler(SABLE_API_KEY);

// Export the handler for Next.js
export default handler;

// Optional: Add CORS headers if needed
export const config = {
  api: {
    externalResolver: true,
  },
}; 