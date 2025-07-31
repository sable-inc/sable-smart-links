// src/config.ts
/**
 * Application configuration
 * 
 * This file reads environment-specific configuration values which are injected during the build process.
 */

// Helper function to get environment variables with fallbacks
const getEnvValue = (key: string, defaultValue: string): string => {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || defaultValue;
    }
    return defaultValue;
};

// Helper function to get boolean environment variables
const getBoolEnvValue = (key: string, defaultValue: boolean): boolean => {
    const value = getEnvValue(key, String(defaultValue));
    return value === 'true';
};

export const config = {
    api: {
      baseUrl: getEnvValue('API_BASE_URL', 'http://localhost:3000'),
    },
    debug: {
      enabled: getBoolEnvValue('DEBUG_ENABLED', false),
      logLevel: getEnvValue('DEBUG_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
    }
};

/**
 * Helper function for logging with consistent formatting
 */
export function debugLog(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
    if (!config.debug.enabled) return;
    
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    const configLogLevel = config.debug.logLevel;
    
    if (levels[level] >= levels[configLogLevel]) {
      const prefix = `[SABLE-SMART-LINKS][${level.toUpperCase()}]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, ...args);
          break;
        case 'info':
          console.info(prefix, ...args);
          break;
        case 'warn':
          console.warn(prefix, ...args);
          break;
        case 'error':
          console.error(prefix, ...args);
          break;
      }
    }
}