/**
 * Yahoo OAuth Callback Route
 * 
 * Handles the OAuth callback from Yahoo and exchanges the authorization code for tokens.
 * After successful token exchange, redirects back to the app with tokens in URL params (or stored server-side).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/yahooFantasyApi'
import { YAHOO_REDIRECT_URI } from '@/lib/yahoo/config'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  // Extract base URL from redirect URI (remove /api/auth/yahoo/callback)
  const baseUrl = YAHOO_REDIRECT_URI.replace('/api/auth/yahoo/callback', '')

  // Handle OAuth errors
  if (error) {
    const errorMsg = errorDescription || error
    console.error('[OAuth] Error from Yahoo:', error, errorDescription)
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', errorMsg)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Validate authorization code
  if (!code) {
    const errorMsg = error
      ? `Yahoo OAuth error: ${errorDescription || error}`
      : 'No authorization code provided. This usually means the redirect URI does not match exactly what is configured in Yahoo Developer Portal.'
    
    console.error('[OAuth] No authorization code in callback')
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', errorMsg)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Get OAuth credentials
  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    console.error('[OAuth] Missing OAuth credentials')
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', 'Yahoo OAuth credentials not configured')
    return NextResponse.redirect(redirectUrl.toString())
  }
  
  // Use single source of truth for redirect URI
  const redirectUri = YAHOO_REDIRECT_URI

  if (!clientId || !clientSecret) {
    console.error('❌ Missing OAuth credentials')
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', 'Yahoo OAuth credentials not configured')
    return NextResponse.redirect(redirectUrl.toString())
  }

  try {
    // Exchange authorization code for access token
    const tokens = await getAccessToken(clientId, clientSecret, code, redirectUri)

    // Redirect back to app with tokens in query params
    const redirectUrl = new URL('/', baseUrl)
    const tokensBase64 = Buffer.from(JSON.stringify(tokens)).toString('base64')
    redirectUrl.searchParams.set('yahoo_tokens', tokensBase64)
    if (state) {
      redirectUrl.searchParams.set('state', state)
    }

    console.log('[OAuth] Token exchange successful')
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error: any) {
    console.error('[OAuth] Token exchange error:', error.message)
    
    const redirectUrl = new URL('/', baseUrl)
    redirectUrl.searchParams.set('yahoo_error', error.message || 'Failed to exchange authorization code')
    return NextResponse.redirect(redirectUrl.toString())
  }
}

