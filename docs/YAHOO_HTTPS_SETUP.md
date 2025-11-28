# Yahoo OAuth HTTPS Setup Guide

Yahoo Fantasy Sports API **requires HTTPS** for OAuth authentication. This guide shows you how to set up HTTPS for local development using Cloudflare Tunnel.

## Why HTTPS is Required

Yahoo's OAuth implementation enforces HTTPS for security. HTTP connections (including `http://localhost`) are blocked. You must use one of these options:

1. **Cloudflare Tunnel** (Recommended for local development - Free, no signup required)
2. **Production Deployment** (Netlify/Vercel - HTTPS provided automatically)

## Local Development: Using Cloudflare Tunnel

### Step 1: Install cloudflared

**macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Other platforms:**
Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

### Step 2: Start Your Next.js Development Server

In one terminal window:

```bash
npm run dev
```

Your app should be running on `http://localhost:3000`

### Step 3: Start Cloudflare Tunnel

In a **separate** terminal window:

```bash
cloudflared tunnel --url http://localhost:3000
```

You'll see output like:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://abc123-def456-ghi789.trycloudflare.com                                           |
+--------------------------------------------------------------------------------------------+
```

**Important**: Copy the HTTPS URL (e.g., `https://abc123-def456-ghi789.trycloudflare.com`)

### Step 4: Update Yahoo Developer App Settings

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Find your app and click "Edit"
3. Update these fields:

   - **Homepage URL**: 
     ```
     https://abc123-def456-ghi789.trycloudflare.com
     ```

   - **Redirect URI(s)**: 
     ```
     https://abc123-def456-ghi789.trycloudflare.com/api/auth/yahoo/callback
     ```

4. Click **Save**

### Step 5: Update Environment Variables

Update your `.env.local` file:

```bash
# Yahoo OAuth Credentials
YAHOO_CLIENT_ID=your_client_id_here
YAHOO_CLIENT_SECRET=your_client_secret_here

# Use your Cloudflare Tunnel HTTPS URL
YAHOO_REDIRECT_URI=https://abc123-def456-ghi789.trycloudflare.com/api/auth/yahoo/callback

# Client-side Client ID (same as YAHOO_CLIENT_ID)
NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id_here

# Game Key (418 = NHL 2025-26)
YAHOO_GAME_KEY=418
```

### Step 6: Restart Your Development Server

After updating environment variables:

```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 7: Test OAuth Flow

1. Open your app at the Cloudflare Tunnel URL: `https://abc123-def456-ghi789.trycloudflare.com`
2. The app will automatically redirect to Yahoo for authentication (no button click required)
3. Complete OAuth authentication
4. You should be redirected back with tokens stored

## Important Notes

### Cloudflare Tunnel URLs Change

- **Free tier**: URLs change every time you restart cloudflared
- **Solution**: Update your Yahoo app settings and `.env.local` each time you restart the tunnel

### Keep Cloudflare Tunnel Running

- Keep the cloudflared terminal window open while developing
- If the tunnel stops, you'll need to:
  1. Restart cloudflared
  2. Get the new URL
  3. Update Yahoo app settings
  4. Update `.env.local`
  5. Restart your dev server

### Testing OAuth

Always test OAuth flows using the Cloudflare Tunnel HTTPS URL, not `localhost`.

## Production Deployment (Netlify)

When deploying to production on Netlify:

1. **No tunnel needed**: Netlify provides HTTPS automatically
2. **Update Yahoo App Settings**:
   - Homepage URL: `https://aitradr.netlify.app`
   - Redirect URI: `https://aitradr.netlify.app/api/auth/yahoo/callback`

3. **Set Environment Variables** in Netlify:
   - Go to Site Settings → Environment Variables
   - Add:
     ```
     YAHOO_CLIENT_ID=your_client_id_here
     YAHOO_CLIENT_SECRET=your_client_secret_here
     YAHOO_REDIRECT_URI=https://aitradr.netlify.app/api/auth/yahoo/callback
     NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id_here
     YAHOO_GAME_KEY=418
     ```

4. **Trigger a new deployment** after setting environment variables (required for `NEXT_PUBLIC_` variables)

5. See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for complete deployment guide

## Troubleshooting

### "redirect_uri_mismatch" Error

- Ensure the redirect URI in Yahoo matches exactly what's in `.env.local` or Netlify environment variables
- Must include the full path: `/api/auth/yahoo/callback`
- Must use HTTPS (not HTTP)

### "Invalid redirect URI" Error

- Check that your Cloudflare Tunnel URL hasn't changed
- Update both Yahoo app settings and `.env.local`
- Restart your dev server after changing environment variables

### OAuth Flow Not Working

1. Verify cloudflared is running: Check the terminal output for the HTTPS URL
2. Verify HTTPS: Make sure you're using the `https://` Cloudflare Tunnel URL, not `http://`
3. Check environment variables: Ensure `NEXT_PUBLIC_YAHOO_CLIENT_ID` is set
4. Check browser console: Look for JavaScript errors
5. For production: Verify environment variables are set in Netlify and trigger a new deployment

### Token Exchange Fails

- Check server logs for detailed error messages
- Verify `YAHOO_CLIENT_ID` and `YAHOO_CLIENT_SECRET` are correct
- Ensure `YAHOO_REDIRECT_URI` matches exactly in both Yahoo and your environment variables

## Quick Reference

**Callback Route**: `/api/auth/yahoo/callback`

**Redirect URI Format**: `https://your-domain.com/api/auth/yahoo/callback`

**Required Environment Variables**:
- `YAHOO_CLIENT_ID`
- `YAHOO_CLIENT_SECRET`
- `YAHOO_REDIRECT_URI`
- `NEXT_PUBLIC_YAHOO_CLIENT_ID`
- `YAHOO_GAME_KEY`

**Local Development**: Use Cloudflare Tunnel HTTPS URL

**Production**: Use your Netlify domain (HTTPS provided automatically)
