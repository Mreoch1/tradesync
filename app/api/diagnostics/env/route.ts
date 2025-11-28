/**
 * Environment Variables Diagnostic API
 * 
 * This endpoint checks which Yahoo OAuth environment variables are configured.
 * It does NOT expose sensitive values like secrets, only indicates if they're set.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Check for environment variables
  const envCheck = {
    // Client-side variables (NEXT_PUBLIC_*)
    clientSide: {
      NEXT_PUBLIC_YAHOO_CLIENT_ID: {
        isSet: !!process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID,
        length: process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID?.length || 0,
        preview: process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID 
          ? `${process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID.substring(0, 10)}...` 
          : null,
        trimmed: process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID?.trim().length || 0,
      },
    },
    
    // Server-side variables (not exposed to client)
    serverSide: {
      YAHOO_CLIENT_ID: {
        isSet: !!process.env.YAHOO_CLIENT_ID,
        length: process.env.YAHOO_CLIENT_ID?.length || 0,
        preview: process.env.YAHOO_CLIENT_ID 
          ? `${process.env.YAHOO_CLIENT_ID.substring(0, 10)}...` 
          : null,
        trimmed: process.env.YAHOO_CLIENT_ID?.trim().length || 0,
      },
      YAHOO_CLIENT_SECRET: {
        isSet: !!process.env.YAHOO_CLIENT_SECRET,
        length: process.env.YAHOO_CLIENT_SECRET?.length || 0,
        // Never show secret preview, only indicate if set
        preview: process.env.YAHOO_CLIENT_SECRET ? '***SET***' : null,
      },
      YAHOO_REDIRECT_URI: {
        isSet: !!process.env.YAHOO_REDIRECT_URI,
        value: process.env.YAHOO_REDIRECT_URI || null,
        // Show full redirect URI as it's not sensitive
      },
      YAHOO_GAME_KEY: {
        isSet: !!process.env.YAHOO_GAME_KEY,
        value: process.env.YAHOO_GAME_KEY || null,
      },
    },
    
    // Runtime information
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      vercelUrl: process.env.VERCEL_URL || null,
      netlifyUrl: process.env.URL || null,
      netlifyDeployUrl: process.env.DEPLOY_PRIME_URL || null,
    },
  }

  // Determine status
  const allClientSideSet = envCheck.clientSide.NEXT_PUBLIC_YAHOO_CLIENT_ID.isSet
  const allServerSideSet = 
    envCheck.serverSide.YAHOO_CLIENT_ID.isSet &&
    envCheck.serverSide.YAHOO_CLIENT_SECRET.isSet &&
    envCheck.serverSide.YAHOO_REDIRECT_URI.isSet

  const status = {
    overall: allClientSideSet && allServerSideSet ? 'ready' : 'incomplete',
    clientSideReady: allClientSideSet,
    serverSideReady: allServerSideSet,
  }

  // Generate recommendations
  const recommendations: string[] = []
  
  if (!envCheck.clientSide.NEXT_PUBLIC_YAHOO_CLIENT_ID.isSet) {
    recommendations.push('Set NEXT_PUBLIC_YAHOO_CLIENT_ID in Netlify environment variables and trigger a new deployment')
  } else if (envCheck.clientSide.NEXT_PUBLIC_YAHOO_CLIENT_ID.trimmed === 0) {
    recommendations.push('NEXT_PUBLIC_YAHOO_CLIENT_ID is set but empty (may have whitespace)')
  }
  
  if (!envCheck.serverSide.YAHOO_CLIENT_ID.isSet) {
    recommendations.push('Set YAHOO_CLIENT_ID in Netlify environment variables')
  }
  
  if (!envCheck.serverSide.YAHOO_CLIENT_SECRET.isSet) {
    recommendations.push('Set YAHOO_CLIENT_SECRET in Netlify environment variables')
  }
  
  if (!envCheck.serverSide.YAHOO_REDIRECT_URI.isSet) {
    recommendations.push('Set YAHOO_REDIRECT_URI in Netlify environment variables (should be: https://aitradr.netlify.app/api/auth/yahoo/callback)')
  } else {
    const expectedUri = 'https://aitradr.netlify.app/api/auth/yahoo/callback'
    if (envCheck.serverSide.YAHOO_REDIRECT_URI.value !== expectedUri) {
      recommendations.push(`YAHOO_REDIRECT_URI should be: ${expectedUri} (currently: ${envCheck.serverSide.YAHOO_REDIRECT_URI.value})`)
    }
  }

  return NextResponse.json({
    status,
    environment: envCheck,
    recommendations,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

