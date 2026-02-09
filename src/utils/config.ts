/**
 * Application Configuration
 * Handles different base URLs for local development and GitHub Pages deployment
 */

/**
 * Get the base URL for the application
 * - Local development: Uses window.location.origin (e.g., http://localhost:5173)
 * - Production (GitHub Pages): Uses hardcoded URL with subpath
 */
export const APP_BASE_URL = 
  window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://hardtop87.github.io/hr-app';
