# Yahoo OAuth HTTPS Setup Guide

Yahoo Fantasy Sports API **requires HTTPS** for OAuth authentication. This guide shows you how to set up HTTPS for local development using ngrok.

## Why HTTPS is Required

Yahoo's OAuth implementation enforces HTTPS for security. HTTP connections (including `http://localhost`) are blocked. You must use one of these options:

1. **ngrok** (Recommended for local development)
2. **Cloudflare Tunnel** (Alternative)
3. **Self-signed SSL certificate** (More complex, not recommended)

## Option 1: Using ngrok (Recommended)

### Step 1: Install ngrok

```bash
npm install -g ngrok
```

Or using Homebrew (macOS):
```bash
brew install ngrok
```

Or download from: https://ngrok.com/download

### Step 2: Start Your Next.js Development Server

In one terminal window:

```bash
npm run dev
```

Your app should be running on `http://localhost:3000`

### Step 3: Start ngrok Tunnel

In a **separate** terminal window:

```bash
ngrok http 3000
```

You'll see output like:

```
ngrok

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok.io -> http://localhost:3000
Forwarding                    http://abc123def456.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Important**: Copy the HTTPS URL (e.g., `https://abc123def456.ngrok.io`)

### Step 4: Update Yahoo Developer App Settings

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Find your app and click "Edit"
3. Update these fields:

   - **Homepage URL**: 
     ```
     https://abc123def456.ngrok.io
     ```

   - **Redirect URI(s)**: 
     ```
     https://abc123def456.ngrok.io/api/auth/yahoo/callback
     ```

4. Click **Save**

### Step 5: Update Environment Variables

Update your `.env.local` file:

```bash
# Yahoo OAuth Credentials
YAHOO_CLIENT_ID=your_client_id_here
YAHOO_CLIENT_SECRET=your_client_secret_here

# Use your ngrok HTTPS URL
YAHOO_REDIRECT_URI=https://abc123def456.ngrok.io/api/auth/yahoo/callback

# Client-side Client ID (same as YAHOO_CLIENT_ID)
NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id_here

# Game Key (418 = NHL 2024-25)
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

1. Open your app at the ngrok URL: `https://abc123def456.ngrok.io`
2. Click "Connect Yahoo Account"
3. Complete OAuth authentication
4. You should be redirected back with tokens stored

## Important Notes

### ngrok URLs Change

- **Free tier**: URLs change every time you restart ngrok
- **Paid tier**: You can reserve a domain name

**Solution**: Update your Yahoo app settings and `.env.local` each time you restart ngrok, or use a paid ngrok account for a fixed domain.

### Keep ngrok Running

- Keep the ngrok terminal window open while developing
- If ngrok stops, you'll need to:
  1. Restart ngrok
  2. Get the new URL
  3. Update Yahoo app settings
  4. Update `.env.local`
  5. Restart your dev server

### Testing OAuth

Always test OAuth flows using the ngrok HTTPS URL, not `localhost`.

## Option 2: Cloudflare Tunnel

If you prefer Cloudflare Tunnel over ngrok:

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

Then use the provided HTTPS URL in the same way as ngrok.

## Option 3: Self-Signed Certificate (Not Recommended)

This is more complex and requires:
- Generating SSL certificates
- Configuring Next.js to use HTTPS
- Browser certificate warnings

Only use this if you already have HTTPS set up locally.

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. **Update Yahoo App Settings**:
   - Homepage URL: `https://yourdomain.com`
   - Redirect URI: `https://yourdomain.com/api/auth/yahoo/callback`

2. **Update Environment Variables** in your hosting platform:
   ```
   YAHOO_REDIRECT_URI=https://yourdomain.com/api/auth/yahoo/callback
   ```

3. **Remove ngrok**: You don't need it in production since your hosting platform provides HTTPS automatically.

## Troubleshooting

### "redirect_uri_mismatch" Error

- Ensure the redirect URI in Yahoo matches exactly what's in `.env.local`
- Must include the full path: `/api/auth/yahoo/callback`
- Must use HTTPS (not HTTP)

### "Invalid redirect URI" Error

- Check that your ngrok URL hasn't changed
- Update both Yahoo app settings and `.env.local`
- Restart your dev server after changing environment variables

### OAuth Flow Not Working

1. Verify ngrok is running: Check the ngrok dashboard at `http://127.0.0.1:4040`
2. Verify HTTPS: Make sure you're using the `https://` ngrok URL, not `http://`
3. Check environment variables: Ensure `NEXT_PUBLIC_YAHOO_CLIENT_ID` is set
4. Check browser console: Look for JavaScript errors

### Token Exchange Fails

- Check server logs for detailed error messages
- Verify `YAHOO_CLIENT_ID` and `YAHOO_CLIENT_SECRET` are correct
- Ensure `YAHOO_REDIRECT_URI` matches exactly in both Yahoo and `.env.local`

## Quick Reference

**Callback Route**: `/api/auth/yahoo/callback`

**Redirect URI Format**: `https://your-domain.com/api/auth/yahoo/callback`

**Required Environment Variables**:
- `YAHOO_CLIENT_ID`
- `YAHOO_CLIENT_SECRET`
- `YAHOO_REDIRECT_URI`
- `NEXT_PUBLIC_YAHOO_CLIENT_ID`

## Next Steps

Once you have:
1. ✅ ngrok running with HTTPS URL
2. ✅ Yahoo app configured with correct redirect URI
3. ✅ Environment variables set

Share with me:
- Your ngrok HTTPS URL
- Screenshot of your Yahoo app summary page

I'll provide the specific endpoints and code needed to complete the integration.

