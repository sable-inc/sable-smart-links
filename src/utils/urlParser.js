/**
 * URL parameter parsing utilities
 */

import { safeWindow } from './browserAPI.js';

/**
 * Parse URL query parameters from the current window location
 * @returns {Object} Object containing all query parameters as key-value pairs
 */
export function parseUrlParameters() {
  const params = {};
  const queryString = safeWindow.location.search.substring(1);

  if (queryString) {
    const pairs = queryString.split('&');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
  }

  return params;
}

/**
 * Check if a specific parameter exists in the URL
 * @param {string} paramName - The parameter name to check for
 * @returns {boolean} True if the parameter exists
 */
export function hasUrlParameter(paramName) {
  const params = parseUrlParameters();
  return Object.prototype.hasOwnProperty.call(params, paramName);
}

/**
 * Get a specific parameter value from the URL
 * @param {string} paramName - The parameter name to get
 * @param {*} defaultValue - Default value to return if parameter doesn't exist
 * @returns {string|*} The parameter value or the default value
 */
export function getUrlParameter(paramName, defaultValue = null) {
  const params = parseUrlParameters();
  return Object.prototype.hasOwnProperty.call(params, paramName)
    ? params[paramName]
    : defaultValue;
}
