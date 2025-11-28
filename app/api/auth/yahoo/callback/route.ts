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
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Extract the actual tunnel URL (ngrok or Cloudflare) from environment or request headers
  // ngrok/Cloudflare Tunnel sets the Host header to the tunnel domain
  let tunnelUrl = process.env.YAHOO_REDIRECT_URI 
    ? process.env.YAHOO_REDIRECT_URI.replace('/api/auth/yahoo/callback', '')
    : null
  
  // If not in env, try to get from Host header (ngrok/Cloudflare Tunnel sets this)
  if (!tunnelUrl) {
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host')
    if (host && (host.includes('ngrok') || host.includes('trycloudflare.com'))) {
      tunnelUrl = `https://${host}`
    } else {
      // Fallback to request origin (should be tunnel URL when proxied)
      tunnelUrl = request.nextUrl.origin
    }
  }
  
  console.log('Callback - Tunnel URL:', tunnelUrl)
  console.log('Callback - Request origin:', request.nextUrl.origin)
  console.log('Callback - Host header:', request.headers.get('host'))

  // Handle OAuth errors
  if (error) {
    const errorMsg = errorDescription || error
    const redirectUrl = new URL('/', tunnelUrl)
    redirectUrl.searchParams.set('yahoo_error', errorMsg)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Validate authorization code
  if (!code) {
    const redirectUrl = new URL('/', tunnelUrl)
    redirectUrl.searchParams.set('yahoo_error', 'No authorization code provided')
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Get OAuth credentials
  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET
  
  // Build redirect URI for token exchange - MUST match exactly what was sent in authorization request
  // Use the tunnel URL we already extracted above
  const redirectUri = `${tunnelUrl}/api/auth/yahoo/callback`
  
  console.log('Token exchange - Tunnel URL:', tunnelUrl)
  console.log('Token exchange - Redirect URI:', redirectUri)

  if (!clientId || !clientSecret) {
    const redirectUrl = new URL('/', tunnelUrl)
    redirectUrl.searchParams.set('yahoo_error', 'Yahoo OAuth credentials not configured')
    return NextResponse.redirect(redirectUrl.toString())
  }

  try {
    // Exchange authorization code for access token
    const tokens = await getAccessToken(clientId, clientSecret, code, redirectUri)

    // Redirect back to app with tokens in query params (hash doesn't work with server redirects)
    // The frontend will extract tokens from query params and store them
    // Use tunnel URL to ensure we redirect to HTTPS, not localhost
    const redirectUrl = new URL('/', tunnelUrl)
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
    const redirectUrl = new URL('/', tunnelUrl)
    redirectUrl.searchParams.set('yahoo_error', error.message || 'Failed to exchange authorization code')
    return NextResponse.redirect(redirectUrl.toString())
  }
}

