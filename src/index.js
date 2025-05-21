/**
 * Sable Smart Links
 * A library for creating guided product walkthroughs triggered by URL parameters
 */

// Import AWS Amplify Auth with a fallback for build-time
let Auth;
try {
  // Try to import Auth from AWS Amplify
  const AmplifyAuth = require('@aws-amplify/auth');
  Auth = AmplifyAuth.Auth || AmplifyAuth.default?.Auth || AmplifyAuth.default;
} catch (e) {
  // Fallback for build-time - mock the Auth object
  Auth = {
    configure: () => {},
    signIn: async () => ({}),
    currentSession: async () => ({
      getIdToken: () => ({ getJwtToken: () => 'mock-token' })
    })
  };
  console.warn('Using mock Auth implementation for build');
}
import { parseUrlParameters } from './core/urlParser.js';
import { WalkthroughEngine } from './core/walkthroughEngine.js';

// Default configuration (can be overridden)
const DEFAULT_CONFIG = {
  production: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_xxxxxxxxx',
    clientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    apiUrl: 'https://api.sable.ai'
  },
  staging: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_yyyyyyyyy',
    clientId: 'yyyyyyyyyyyyyyyyyyyyyyyyyy',
    apiUrl: 'https://staging.api.sable.ai'
  },
  development: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_zzzzzzzzz',
    clientId: 'zzzzzzzzzzzzzzzzzzzzzzzzzz',
    apiUrl: 'http://localhost:3000'
  }
};

class SableSmartLinks {
  static #initialized = false;
  static #authConfig = null;
  
  /**
   * Initialize AWS Amplify Auth
   * @param {Object} config - Configuration options
   * @param {'production'|'staging'|'development'} [config.environment='production'] - Environment to use
   * @param {string} [config.region] - AWS region (overrides environment default)
   * @param {string} [config.userPoolId] - Cognito User Pool ID (overrides environment default)
   * @param {string} [config.clientId] - Cognito Client ID (overrides environment default)
   * @param {string} [config.apiUrl] - API base URL (overrides environment default)
   */
  static initAuth(config = {}) {
    if (this.#initialized) return;
    
    const env = config.environment || 'production';
    const envConfig = { ...DEFAULT_CONFIG[env] || DEFAULT_CONFIG.production };
    
    // Override with any provided config
    if (config.region) envConfig.region = config.region;
    if (config.userPoolId) envConfig.userPoolId = config.userPoolId;
    if (config.clientId) envConfig.clientId = config.clientId;
    if (config.apiUrl) envConfig.apiUrl = config.apiUrl;
    
    Auth.configure({
      region: envConfig.region,
      userPoolId: envConfig.userPoolId,
      userPoolWebClientId: envConfig.clientId,
      authenticationFlowType: 'USER_PASSWORD_AUTH'
    });
    
    this.#authConfig = envConfig;
    this.#initialized = true;
  }
  
  /**
   * Login with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} The authenticated user object
   */
  static async login(email, password) {
    if (!this.#initialized) {
      throw new Error('SableSmartLinks not initialized. Call initAuth() first.');
    }
    
    try {
      const user = await Auth.signIn(email, password);
      return user;
    } catch (error) {
      throw new Error(this.#simplifyError(error));
    }
  }
  
  /**
   * Get the current authenticated user's JWT token
   * @returns {Promise<string>} The JWT token
   */
  static async getAuthToken() {
    try {
      const session = await Auth.currentSession();
      return session.getIdToken().getJwtToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }
  
  /**
   * Create a new SableSmartLinks instance
   * @param {Object} config - Configuration options
   * @param {string} [config.paramName='walkthrough'] - URL parameter name to trigger walkthroughs
   * @param {boolean} [config.autoStart=true] - Automatically start walkthrough if parameter is found
   * @param {number} [config.stepDelay=500] - Delay between steps in milliseconds
   * @param {string} [config.authToken] - Optional JWT token for authentication (alternative to email/password)
   */
  constructor(config = {}) {
    this.config = {
      paramName: 'walkthrough',  // Default URL parameter to look for
      autoStart: true,           // Start walkthrough automatically if param found
      stepDelay: 500,            // Delay between steps in milliseconds
      ...config
    };
    
    this.walkthroughEngine = new WalkthroughEngine(this.config);
    this.apiUrl = SableSmartLinks.#authConfig?.apiUrl || 'https://api.sable.ai';
    
    if (this.config.autoStart) {
      // Wait for DOM to be fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
  }
  
  /**
   * Initialize the library and check for walkthrough parameters
   */
  init() {
    const params = parseUrlParameters();
    const walkthroughId = params[this.config.paramName];
    
    if (walkthroughId) {
      this.start(walkthroughId);
    }
  }
  
  /**
   * Start a walkthrough by ID
   * @param {string} walkthroughId - ID of the walkthrough to start
   * @returns {boolean} - Success status
   */
  start(walkthroughId) {
    return this.walkthroughEngine.start(walkthroughId);
  }
  
  /**
   * Register a new walkthrough
   * @param {string} id - Unique identifier for the walkthrough
   * @param {Array} steps - Array of step objects defining the walkthrough
   */
  registerWalkthrough(id, steps) {
    this.walkthroughEngine.register(id, steps);
  }

  /**
   * Register active walkthroughs from the backend
   * @param {string} orgId - Organization ID
   * @param {string} [jwtToken] - Optional JWT token for authentication (if not using email/password)
   * @param {string} [apiBaseUrl] - Optional base URL for the API (overrides default)
   * @returns {Promise<Array>} - Array of registered walkthrough IDs
   */
  async registerActiveWalkthroughs(orgId, jwtToken, apiBaseUrl) {
    try {
      let authToken = jwtToken;
      
      // If no token provided, try to get it from Auth session
      if (!authToken && SableSmartLinks.#initialized) {
        authToken = await SableSmartLinks.getAuthToken();
      }
      
      if (!authToken) {
        throw new Error('No authentication token available. Please log in first or provide a JWT token.');
      }
      
      const baseUrl = apiBaseUrl || this.apiUrl;
      const response = await fetch(`${baseUrl}/walkthroughs?orgId=${orgId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch walkthroughs');
      }

      const walkthroughs = await response.json();
      const registeredIds = [];

      // Process each walkthrough
      for (const walkthrough of walkthroughs) {
        // Only register active walkthroughs
        if (walkthrough.active) {
          // Transform the API response into the expected format
          const steps = walkthrough.steps.map(step => ({
            selector: step.targetElement,
            highlight: true,
            tooltip: {
              title: step.title,
              content: step.content,
              position: step.position || 'bottom'
            }
          }));

          // Register the walkthrough
          this.registerWalkthrough(walkthrough.walkthroughId, steps);
          registeredIds.push(walkthrough.walkthroughId);
        }
      }

      console.log(`Successfully registered ${registeredIds.length} active walkthroughs`);
      return registeredIds;

    } catch (error) {
      console.error('Error registering active walkthroughs:', error);
      throw error; // Re-throw to allow caller to handle the error
    }
  }
  
  /**
   * Go to the next step in the current walkthrough
   */
  next() {
    this.walkthroughEngine.next();
  }
  
  /**
   * End the current walkthrough
   */
  end() {
    this.walkthroughEngine.end();
  }

  /**
   * Convert AWS Amplify errors to user-friendly messages
   * @private
   */
  static #simplifyError(error) {
    // Map Cognito errors to user-friendly messages
    const messages = {
      'UserNotFoundException': 'User not found',
      'NotAuthorizedException': 'Incorrect username or password',
      'UserNotConfirmedException': 'Please verify your email address',
      'CodeMismatchException': 'Invalid verification code',
      'ExpiredCodeException': 'Verification code has expired',
      'LimitExceededException': 'Too many attempts, please try again later',
      'No current user': 'No user is currently signed in',
      'Network error': 'Unable to connect to the server. Please check your internet connection.'
    };

    return messages[error.code] || error.message || 'An error occurred';
  }
}

// Create and export a default instance
const instance = new SableSmartLinks();

export { SableSmartLinks };
export default instance;
