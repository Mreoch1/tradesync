# Yahoo Fantasy Sports API Setup Guide

This guide provides detailed instructions for setting up the Yahoo Fantasy Sports API integration for automatic team and player data synchronization.

## Overview

The Yahoo Fantasy Sports API allows you to programmatically access:
- League information
- Team rosters
- Player statistics
- Draft results
- Matchup data

## Step 1: Register Your Application

1. Go to the [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Sign in with your Yahoo account (or create one if needed)
3. Click **"Create an App"** button
4. Fill in the application form:

   - **Application Name**: Choose a descriptive name (e.g., "Fantasy Trade Analyzer")
   - **Application Type**: Select **"Web Application"**
   - **Home Page URL**: Your app's homepage URL
   - **Redirect URI(s)**: 
     - For development: `https://your-cloudflare-tunnel-url.trycloudflare.com/api/auth/yahoo/callback`
     - For production: `https://aitradr.netlify.app/api/auth/yahoo/callback`
     - **IMPORTANT**: Must be HTTPS (Yahoo blocks HTTP)
     - **CRITICAL**: The URI must match EXACTLY (no trailing slashes, exact path)
   - **Application Description**: Brief description of your application
   - **API Permissions**: Select **"Fantasy Sports - Read"** (at minimum)

5. Click **"Create App"**
6. Yahoo will review your application (usually takes a few hours to a few days)
7. Once approved, you'll receive:
   - **Client ID** (Consumer Key)
   - **Client Secret** (Consumer Secret)

## Step 2: Set Up HTTPS (Required)

**Yahoo requires HTTPS for OAuth authentication.** HTTP (including `http://localhost`) is blocked.

See **[YAHOO_HTTPS_SETUP.md](./YAHOO_HTTPS_SETUP.md)** for detailed instructions on setting up HTTPS locally using Cloudflare Tunnel.

**Quick start:**
1. Install cloudflared: `brew install cloudflare/cloudflare/cloudflared`
2. Start your app: `npm run dev`
3. In another terminal: `cloudflared tunnel --url http://localhost:3000`
4. Copy the HTTPS URL (e.g., `https://abc123-def456-ghi789.trycloudflare.com`)

## Step 3: Configure Environment Variables

Create a `.env.local` file in your project root (if it doesn't exist):

```bash
# Yahoo OAuth Credentials (Server-side only)
YAHOO_CLIENT_ID=your_client_id_from_yahoo
YAHOO_CLIENT_SECRET=your_client_secret_from_yahoo

# Redirect URI (must match what you configured in Yahoo Developer Portal)
# IMPORTANT: Yahoo requires HTTPS - see YAHOO_HTTPS_SETUP.md for local development
YAHOO_REDIRECT_URI=https://your-cloudflare-tunnel-url.trycloudflare.com/api/auth/yahoo/callback

# Game Key (418 = NHL 2024-25 season)
YAHOO_GAME_KEY=418

# Client-side Client ID (required for OAuth flow)
NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id_from_yahoo
```

### Important Notes:

- **Never commit** `.env.local` to version control
- The file is already in `.gitignore` by default
- Restart your development server after adding/updating environment variables
- For production, set these variables in your hosting platform's environment settings

## Step 4: Find Your Game Key

Game keys identify the specific sport and season:

- **418** = NHL (National Hockey League) 2024-25 season
- **414** = NHL 2023-24 season
- Other game keys can be found in [Yahoo's API documentation](https://developer.yahoo.com/fantasysports/guide/game-resource.html)

You can also query available games:
```
GET https://fantasysports.yahooapis.com/fantasy/v2/games
```

## Step 4: Understanding the OAuth Flow

### Authorization Flow:

1. **User initiates**: Clicks "Connect Yahoo Account" button
2. **Authorization Request**: App redirects to Yahoo login page
3. **User authorizes**: User logs in and grants permissions
4. **Authorization Code**: Yahoo redirects back with a code
5. **Token Exchange**: Server exchanges code for access/refresh tokens
6. **API Access**: App uses access token for API requests

### Token Management:

- **Access Tokens**: Valid for 1 hour, used for API requests
- **Refresh Tokens**: Long-lived, used to get new access tokens
- **Automatic Refresh**: Tokens refresh automatically before expiration
- **Storage**: Tokens stored in browser session storage (client-side)

## Step 5: Using the Sync Component

### Basic Usage:

```tsx
import YahooSync from '@/components/YahooSync'
import { Team } from '@/types/teams'

function MyComponent() {
  const handleTeamsSynced = (teams: Team[]) => {
    console.log(`Synced ${teams.length} teams`)
    // Update your team manager or state
  }

  return (
    <YahooSync 
      onTeamsSynced={handleTeamsSynced}
      gameKey="418" // Optional, defaults to 418 (NHL)
    />
  )
}
```

### Sync Process:

1. **Authenticate**: User connects their Yahoo account
2. **Fetch Leagues**: Get list of user's fantasy leagues
3. **Select League**: User chooses which league to sync
4. **Sync Teams**: Import all teams and their rosters
5. **Parse Data**: Convert Yahoo format to internal format

## Step 6: API Endpoints

### Server-Side Routes:

- `POST /api/yahoo/sync` - Main sync endpoint
  - Actions: `get_leagues`, `get_teams`, `sync_league`
- `GET /api/auth/yahoo/callback` - OAuth callback handler (receives authorization code from Yahoo)

### Client-Side Functions:

- `getAuthorizationUrl()` - Generate OAuth authorization URL
- `getAccessToken()` - Exchange code for tokens
- `refreshAccessToken()` - Refresh expired tokens
- `getUserLeagues()` - Fetch user's leagues
- `getLeagueTeams()` - Get teams in a league
- `getTeamRoster()` - Get team roster with players

## Troubleshooting

### Common Issues:

**1. "Yahoo Client ID not configured"**
- Solution: Add `NEXT_PUBLIC_YAHOO_CLIENT_ID` to `.env.local`
- Restart dev server after adding environment variables

**2. "Redirect URI mismatch" or "INVALID_REDIRECT_URI"**
- Solution: 
  1. Go to [Yahoo Developer Portal](https://developer.yahoo.com/apps/)
  2. Find your app and click "Edit"
  3. In "Redirect URI(s)" field, add EXACTLY: `https://aitradr.netlify.app/api/auth/yahoo/callback`
  4. **No trailing slashes** - must be exact match
  5. Click "Update" and wait 2-5 minutes for changes to propagate
  6. For local dev, use your Cloudflare Tunnel URL: `https://YOUR_TUNNEL_URL.trycloudflare.com/api/auth/yahoo/callback`

**3. "Token expired and no refresh token"**
- Solution: Re-authenticate by clicking "Connect Yahoo Account" again
- Clear session storage if tokens are corrupted

**4. "Failed to fetch leagues"**
- Solution: Verify your Yahoo account has active fantasy leagues
- Check that you're using the correct game key for the current season
- Ensure your Yahoo app has been approved for Fantasy Sports API access

**5. "Rate limit exceeded"**
- Solution: Yahoo has rate limits (typically 100 requests/hour)
- Implement request caching or reduce sync frequency

### Debug Mode:

Enable detailed logging by checking the browser console and server logs. The API client logs errors and token refresh attempts.

## Rate Limits

Yahoo Fantasy Sports API has rate limits:
- **100 requests per hour** per user/application
- Requests are counted against the authenticated user's quota
- Rate limit headers are included in API responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when limit resets

### Best Practices:

- Cache league/team data when possible
- Batch requests when fetching multiple teams
- Don't sync more frequently than necessary
- Handle rate limit errors gracefully

## Security Best Practices

1. **Never expose secrets**: Keep `YAHOO_CLIENT_SECRET` server-side only
2. **Use HTTPS**: Always use HTTPS in production
3. **Validate redirect URIs**: Only allow approved redirect URIs
4. **Token storage**: Store tokens securely (session storage is fine for client-side, but consider server-side sessions for production)
5. **Token expiration**: Always check token expiration before use
6. **Error handling**: Don't expose detailed error messages to clients

## Production Deployment

### Environment Variables:

Set these in your hosting platform (Vercel, Netlify, etc.):

```
YAHOO_CLIENT_ID=...
YAHOO_CLIENT_SECRET=...
YAHOO_REDIRECT_URI=https://yourdomain.com/api/auth/yahoo/callback
NEXT_PUBLIC_YAHOO_CLIENT_ID=...
YAHOO_GAME_KEY=418
```

### Redirect URI:

Make sure to add your production redirect URI to your Yahoo app settings:
1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Edit your app
3. Add production redirect URI under "Redirect URI(s)": `https://aitradr.netlify.app/api/auth/yahoo/callback`
4. **CRITICAL**: Must be EXACT match - no trailing slashes, exact path
5. Click "Update" and wait 2-5 minutes for changes to propagate
6. Save changes

## Additional Resources

- [Yahoo Fantasy Sports API Documentation](https://developer.yahoo.com/fantasysports/guide/)
- [OAuth 2.0 Documentation](https://developer.yahoo.com/oauth2/guide/)
- [Game Resource Reference](https://developer.yahoo.com/fantasysports/guide/game-resource.html)
- [Team Resource Reference](https://developer.yahoo.com/fantasysports/guide/team-resource.html)
- [Player Resource Reference](https://developer.yahoo.com/fantasysports/guide/player-resource.html)

## Support

If you encounter issues:

1. Check the browser console for client-side errors
2. Check server logs for API errors
3. Verify your Yahoo app status in the Developer Portal
4. Ensure all environment variables are set correctly
5. Try re-authenticating with a fresh session

