/**
 * Yahoo Fantasy Sports API Client
 * 
 * Core API client for making authenticated requests to Yahoo Fantasy Sports API.
 */

import { YAHOO_API_BASE } from './config'

/**
 * Make authenticated API request to Yahoo Fantasy Sports API
 * 
 * @param endpoint - API endpoint (e.g., "league/465.l.9080")
 * @param accessToken - OAuth access token
 * @param params - Optional query parameters
 * @returns Parsed JSON response
 * @throws Error if request fails or response is invalid
 */
export async function makeApiRequest(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<any> {
  // Remove any .json or .xml extensions if present (not supported in path)
  let cleanEndpoint = endpoint
  if (endpoint.endsWith('.json') || endpoint.endsWith('.xml')) {
    cleanEndpoint = endpoint.replace(/\.(json|xml)$/, '')
  }
  
  const url = new URL(`${YAHOO_API_BASE}/${cleanEndpoint}`)
  
  // Yahoo API uses format query parameter for JSON (default is XML)
  url.searchParams.append('format', 'json')
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  const contentType = response.headers.get('content-type') || ''
  let responseText: string
  
  try {
    responseText = await response.text() || ''
  } catch (textError: any) {
    throw new Error(
      `Yahoo API error: ${response.status} ${response.statusText} - Failed to read response body`
    )
  }

  // Ensure responseText is a string
  if (typeof responseText !== 'string') {
    responseText = String(responseText || '')
  }

  if (!response.ok) {
    // If response is XML (error), parse it for error message
    if (responseText && (responseText.trim().startsWith('<?xml') || contentType.includes('xml'))) {
      const errorMatch = responseText.match(/<description>(.*?)<\/description>/i) || 
                         responseText.match(/<error>(.*?)<\/error>/i) ||
                         responseText.match(/<message>(.*?)<\/message>/i)
      const errorMsg = errorMatch ? errorMatch[1] : (responseText ? responseText.substring(0, 300) : 'No response body')
      throw new Error(`Yahoo API error: ${response.status} ${response.statusText} - ${errorMsg}`)
    }
    const errorPreview = responseText ? responseText.substring(0, 300) : 'No response body'
    throw new Error(`Yahoo API error: ${response.status} ${response.statusText} - ${errorPreview}`)
  }

  // Check if response is actually JSON
  if (responseText && responseText.trim().startsWith('<?xml')) {
    const errorMatch = responseText.match(/<description>(.*?)<\/description>/i) || 
                       responseText.match(/<error>(.*?)<\/error>/i) ||
                       responseText.match(/<message>(.*?)<\/message>/i)
    const errorMsg = errorMatch ? errorMatch[1] : 'Received XML response instead of JSON'
    const preview = responseText ? responseText.substring(0, 500) : 'No response body'
    throw new Error(`Yahoo API returned XML instead of JSON: ${errorMsg}. Response preview: ${preview}`)
  }

  if (!responseText || (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('['))) {
    const preview = responseText ? responseText.substring(0, 200) : 'No response body'
    throw new Error(`Unexpected response format. Expected JSON but got: ${preview}`)
  }

  try {
    return JSON.parse(responseText)
  } catch (parseError: any) {
    const preview = responseText ? responseText.substring(0, 500) : 'No response body'
    throw new Error(`Failed to parse JSON response: ${parseError.message}. Response preview: ${preview}`)
  }
}

