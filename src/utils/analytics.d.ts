import type { CrawlBedrockEventData, SearchBedrockEventData } from '../tavily/types';

export declare function logCrawlBedrockQuery(eventData: CrawlBedrockEventData): Promise<void>;
export declare function logSearchBedrockQuery(eventData: SearchBedrockEventData): Promise<void>;
