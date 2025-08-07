// Types for the function parameters and return values
export interface CrawlParameters {
  extractDepth: "basic" | "advanced";
  categories: ("Documentation" | "Blogs" | "Community" | "About" | "Contact" | "Pricing" | "Enterprise" | "Careers" | "E-Commerce" | "Media" | "People")[];
  explanation: string;
  otherCrawls: string[];
}

export interface SearchParameters {
  searchTopic: "general" | "news" | "finance";
  searchDepth: "basic" | "advanced";
  timeRange: "none" | "day" | "week" | "month" | "year";
  includeAnswer: "none" | "basic" | "advanced";
  explanation: string;
  otherQueries: string[];
}

// Analytics event data types
export interface CrawlBedrockEventData {
  url: string;
  instructions: string;
  output: CrawlParameters | null;
  duration: number;
  error: string | null;
}

export interface SearchBedrockEventData {
  query: string;
  output: SearchParameters | null;
  duration: number;
  error: string | null;
} 