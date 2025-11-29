/**
 * Yahoo Fantasy Sports API Configuration
 * 
 * Single source of truth for OAuth redirect URI and other configuration.
 * Validates on module load to fail fast on misconfiguration.
 */

/**
 * OAuth Redirect URI - Single Source of Truth
 * 
 * Must be set via YAHOO_REDIRECT_URI environment variable.
 * Validated on module load to ensure:
 * - HTTPS protocol
 * - No trailing slashes
 * - Valid URL format
 */
export const YAHOO_REDIRECT_URI = (() => {
  const uri = process.env.YAHOO_REDIRECT_URI?.trim()
  
  if (!uri) {
    throw new Error(
      'Missing YAHOO_REDIRECT_URI environment variable. ' +
      'Set this to your OAuth callback URL (e.g., https://aitradr.netlify.app/api/auth/yahoo/callback)'
    )
  }
  
  // Validate URL format
  let url: URL
  try {
    url = new URL(uri)
  } catch (error) {
    throw new Error(
      `Invalid YAHOO_REDIRECT_URI format: ${uri}. ` +
      'Must be a valid URL (e.g., https://aitradr.netlify.app/api/auth/yahoo/callback)'
    )
  }
  
  // Validate HTTPS
  if (url.protocol !== 'https:') {
    throw new Error(
      `YAHOO_REDIRECT_URI must use HTTPS: ${uri}. ` +
      'Yahoo OAuth requires HTTPS for redirect URIs.'
    )
  }
  
  // Remove trailing slashes (Yahoo is strict about exact matching)
  const cleanUri = uri.replace(/\/+$/, '')
  
  // Log once on startup (not per request)
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Yahoo Config] OAuth Redirect URI: ${cleanUri}`)
  }
  
  return cleanUri
})()

/**
 * Base URL for Yahoo Fantasy Sports API
 */
export const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'

