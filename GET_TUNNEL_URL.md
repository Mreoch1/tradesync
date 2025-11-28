# Get Your Cloudflare Tunnel URL

## Quick Steps:

1. **Find your Cloudflare tunnel URL:**
   - The Cloudflare tunnel is running in the background
   - Check the terminal where you started it, or
   - Look for output that says: `https://xxxxx.trycloudflare.com`
   - The URL format is: `https://[random-words].trycloudflare.com`

2. **Yahoo Developer Portal:**
   - Go to: **https://developer.yahoo.com/apps/**
   - Sign in with your Yahoo account
   - Find your app and click "Edit"

3. **Update Redirect URI:**
   - In the "Redirect URI(s)" field, add:
   - `https://[your-cloudflare-url].trycloudflare.com/api/auth/yahoo/callback`
   - Replace `[your-cloudflare-url]` with your actual Cloudflare tunnel URL
   - Example: `https://abc123-xyz.trycloudflare.com/api/auth/yahoo/callback`
   - Click "Save"

4. **Update .env.local:**
   ```bash
   YAHOO_REDIRECT_URI=https://[your-cloudflare-url].trycloudflare.com/api/auth/yahoo/callback
   ```
   Replace `[your-cloudflare-url]` with your actual Cloudflare tunnel URL

## Important:
- The redirect URI MUST be exactly: `https://[your-url]/api/auth/yahoo/callback`
- Must use HTTPS (Cloudflare provides this automatically)
- If you restart Cloudflare tunnel, the URL will change - update both Yahoo and .env.local

