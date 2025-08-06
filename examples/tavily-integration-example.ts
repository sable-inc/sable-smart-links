// Example: How to use the new Sable Tavily integration

// 1. Server-side setup (pages/api/sable/[...path].ts)
import { createSableTavilyHandler } from 'sable-smart-links/tavily';

const handler = createSableTavilyHandler(process.env.SABLE_API_KEY!);
export default handler;

// 2. Client-side usage in your React components
import { getOptimalCrawlParameters, getOptimalSearchParameters } from 'sable-smart-links/tavily';

// Example React component
function TavilyOptimizer() {
  const [crawlParams, setCrawlParams] = useState(null);
  const [searchParams, setSearchParams] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimizeCrawl = async (url: string, instructions: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = await getOptimalCrawlParameters(url, instructions);
      setCrawlParams(params);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const optimizeSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = await getOptimalSearchParameters(query);
      setSearchParams(params);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Crawl Optimization</h2>
      <button 
        onClick={() => optimizeCrawl(
          'https://example.com', 
          'Extract all documentation and pricing information'
        )}
        disabled={loading}
      >
        Optimize Crawl
      </button>

      <h2>Search Optimization</h2>
      <button 
        onClick={() => optimizeSearch('latest AI developments in 2024')}
        disabled={loading}
      >
        Optimize Search
      </button>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      
      {crawlParams && (
        <div>
          <h3>Crawl Parameters:</h3>
          <p><strong>Extract Depth:</strong> {crawlParams.extractDepth}</p>
          <p><strong>Categories:</strong> {crawlParams.categories.join(', ')}</p>
          <p><strong>Explanation:</strong> {crawlParams.explanation}</p>
          <p><strong>Other Crawls:</strong></p>
          <ul>
            {crawlParams.otherCrawls.map((crawl, i) => (
              <li key={i}>
                <strong>{crawl.url}</strong>: {crawl.instructions}
              </li>
            ))}
          </ul>
        </div>
      )}

      {searchParams && (
        <div>
          <h3>Search Parameters:</h3>
          <p><strong>Search Topic:</strong> {searchParams.searchTopic}</p>
          <p><strong>Search Depth:</strong> {searchParams.searchDepth}</p>
          <p><strong>Time Range:</strong> {searchParams.timeRange}</p>
          <p><strong>Include Answer:</strong> {searchParams.includeAnswer}</p>
          <p><strong>Explanation:</strong> {searchParams.explanation}</p>
          <p><strong>Other Queries:</strong></p>
          <ul>
            {searchParams.otherQueries.map((query, i) => (
              <li key={i}>{query}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// 3. Direct server-side usage (if needed)
import { 
  getOptimalCrawlParametersServer, 
  getOptimalSearchParametersServer 
} from 'sable-smart-links/tavily';

async function serverSideExample() {
  try {
    // These functions require the Sable API key and run server-side
    const crawlParams = await getOptimalCrawlParametersServer(
      'https://example.com',
      'Extract all documentation and pricing information',
      process.env.SABLE_API_KEY!
    );

    const searchParams = await getOptimalSearchParametersServer(
      'latest AI developments in 2024',
      process.env.SABLE_API_KEY!
    );

    console.log('Crawl params:', crawlParams);
    console.log('Search params:', searchParams);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 4. Error handling examples
async function errorHandlingExample() {
  try {
    const params = await getOptimalCrawlParameters('https://example.com', 'test');
    console.log('Success:', params);
  } catch (error) {
    if (error.message.includes('not configured')) {
      console.error('API endpoints not set up. Please configure the handler.');
    } else if (error.message.includes('API request failed')) {
      console.error('Network or server error occurred.');
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}

export { TavilyOptimizer, serverSideExample, errorHandlingExample }; 