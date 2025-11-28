/**
 * Yahoo OAuth Callback Route
 * 
 * Handles the OAuth callback from Yahoo and exchanges the authorization code for tokens.
 * After successful token exchange, redirects back to the app with tokens in URL params (or stored server-side).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/yahooFantasyApi'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  // Log ALL query parameters for debugging
  const allParams: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    allParams[key] = value
  })
  console.log('🔍 Callback - All query parameters:', JSON.stringify(allParams, null, 2))
  console.log('🔍 Callback - Full URL:', request.nextUrl.toString())
  
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Extract the actual URL from environment or request headers
  // For Netlify production, use the environment variable
  // For local dev (Cloudflare Tunnel), use the request origin
  let baseUrl = process.env.YAHOO_REDIRECT_URI 
    ? process.env.YAHOO_REDIRECT_URI.replace('/api/auth/yahoo/callback', '')
    : null
  
  // If not in env, try to get from Host header (Cloudflare Tunnel sets this)
  if (!baseUrl) {
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host')
    if (host && host.includes('trycloudflare.com')) {
      baseUrl = `https://${host}`
    } else {
      // Fallback to request origin (should be Netlify URL in production)
      baseUrl = request.nextUrl.origin
    }
  }
  
  // Ensure no trailing slash
  baseUrl = baseUrl.replace(/\/$/, '')
  
  console.log('Callback - Base URL:', baseUrl)
  console.log('Callback - Request origin:', request.nextUrl.origin)
  console.log('Callback - Host header:', request.headers.get('host'))
  console.log('Callback - YAHOO_REDIRECT_URI env:', process.env.YAHOO_REDIRECT_URI)
  console.log('Callback - Full request URL:', request.url)
  console.log('Callback - Search params string:', request.nextUrl.search)
  console.log('🔍 Callback - Query param keys:', Object.keys(allParams).join(', '))

  // Handle OAuth errors
  if (error) {
    const errorMsg = errorDescription || error
    console.error('❌ OAuth error from Yahoo:', error, errorDescription)
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', errorMsg)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Validate authorization code
  if (!code) {
    console.error('❌ No authorization code in callback')
    console.error('❌ Callback URL:', request.nextUrl.toString())
    console.error('❌ All query params:', Object.keys(allParams).length > 0 ? Object.keys(allParams).join(', ') : 'NONE')
    console.error('❌ Query params object:', JSON.stringify(allParams))
    console.error('❌ Has error param:', !!error)
    console.error('❌ Error value:', error)
    console.error('❌ Error description:', errorDescription)
    console.error('❌ Full request URL:', request.url)
    console.error('❌ Search string:', request.nextUrl.search)
    
    // Check if this is a redirect from Yahoo without parameters (redirect URI mismatch)
    const hasAnyParams = Object.keys(allParams).length > 0
    const isFromYahoo = request.headers.get('referer')?.includes('yahoo.com') || 
                        request.headers.get('user-agent')?.includes('Yahoo')
    
    console.error('❌ Has any query params:', hasAnyParams)
    console.error('❌ Referer header:', request.headers.get('referer'))
    console.error('❌ User-Agent:', request.headers.get('user-agent'))
    
    // Provide more helpful error message
    let errorMsg = 'No authorization code provided'
    if (error) {
      errorMsg = `Yahoo OAuth error: ${errorDescription || error}`
    } else if (!hasAnyParams) {
      errorMsg = `Yahoo redirected back but provided no parameters. This usually means the redirect URI does not match exactly.

The redirect URI in your OAuth request must match EXACTLY what's configured in Yahoo Developer Portal.

Expected: https://aitradr.netlify.app/api/auth/yahoo/callback

Please verify:
1. In Yahoo Developer Portal, the Redirect URI is exactly: https://aitradr.netlify.app/api/auth/yahoo/callback
2. No trailing slashes
3. Click "Update" to save changes
4. Wait a few minutes for changes to propagate`
    } else {
      errorMsg = `No authorization code in callback. Received parameters: ${Object.keys(allParams).join(', ')}`
    }
    
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', errorMsg)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Get OAuth credentials - verify they're set
  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET
  
  console.log('🔍 Server-side env check:')
  console.log('  - YAHOO_CLIENT_ID:', clientId ? `Set (length: ${clientId.length})` : 'NOT SET')
  console.log('  - YAHOO_CLIENT_SECRET:', clientSecret ? 'Set' : 'NOT SET')
  console.log('  - YAHOO_REDIRECT_URI:', process.env.YAHOO_REDIRECT_URI || 'NOT SET')
  
  console.log('🔍 Token exchange - Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET')
  console.log('🔍 Token exchange - Client Secret:', clientSecret ? 'SET' : 'NOT SET')
  
  // Build redirect URI for token exchange - MUST match exactly what was sent in authorization request
  // CRITICAL: This must match EXACTLY what was sent in the OAuth authorization request
  // For production (Netlify), always use the hardcoded production URL
  // For local dev, use the request origin
  let redirectUri: string
  
  // Determine if we're in production based on hostname
  const isProduction = baseUrl.includes('netlify.app') || baseUrl.includes('aitradr.netlify.app')
  
  if (isProduction) {
    // Production: Always use the exact production URL (must match Yahoo Developer Portal)
    redirectUri = 'https://aitradr.netlify.app/api/auth/yahoo/callback'
  } else if (process.env.YAHOO_REDIRECT_URI) {
    // Local dev with env var: Use the env var
    redirectUri = process.env.YAHOO_REDIRECT_URI.trim()
  } else {
    // Local dev: Reconstruct from request origin
    redirectUri = `${baseUrl}/api/auth/yahoo/callback`
  }
  
  // Ensure no trailing slashes (Yahoo is strict)
  redirectUri = redirectUri.replace(/\/+$/, '')
  
  const expectedRedirectUri = 'https://aitradr.netlify.app/api/auth/yahoo/callback'
  
  console.log('🔍 Token exchange - Base URL:', baseUrl)
  console.log('🔍 Token exchange - Is Production:', isProduction)
  console.log('🔍 Token exchange - Redirect URI (from env):', process.env.YAHOO_REDIRECT_URI)
  console.log('🔍 Token exchange - Redirect URI (final):', redirectUri)
  console.log('🔍 Token exchange - Expected Redirect URI:', expectedRedirectUri)
  console.log('🔍 Token exchange - Match:', redirectUri === expectedRedirectUri)
  
  // Warn if redirect URI doesn't match expected
  if (isProduction && redirectUri !== expectedRedirectUri) {
    console.error(`❌ CRITICAL: Redirect URI mismatch in production! Expected: ${expectedRedirectUri}, Got: ${redirectUri}`)
    console.error(`❌ This will cause INVALID_REDIRECT_URI error.`)
    console.error(`❌ Please ensure YAHOO_REDIRECT_URI in Netlify is set to: ${expectedRedirectUri}`)
  }

  if (!clientId || !clientSecret) {
    console.error('❌ Missing OAuth credentials')
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', 'Yahoo OAuth credentials not configured')
    return NextResponse.redirect(redirectUrl.toString())
  }

  try {
    // Exchange authorization code for access token
    const tokens = await getAccessToken(clientId, clientSecret, code, redirectUri)

    // Redirect back to app with tokens in query params (hash doesn't work with server redirects)
    // The frontend will extract tokens from query params and store them
    // Use tunnel URL to ensure we redirect to HTTPS, not localhost
    const redirectUrl = new URL('/', baseUrl)
    // Store tokens temporarily - encode as base64 to avoid URL length issues
    const tokensBase64 = Buffer.from(JSON.stringify(tokens)).toString('base64')
    redirectUrl.searchParams.set('yahoo_tokens', tokensBase64)
    if (state) {
      redirectUrl.searchParams.set('state', state)
    }

    console.log('Redirecting back to app at:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error: any) {
    console.error('OAuth token exchange error:', error)
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', error.message || 'Failed to exchange authorization code')
    return NextResponse.redirect(redirectUrl.toString())
  }
}

