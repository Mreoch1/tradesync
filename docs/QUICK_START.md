# Quick Start Guide - Yahoo OAuth Setup

## Step-by-Step Instructions

### Terminal 1: Start Your Development Server

```bash
npm run dev
```

Wait for it to start. You should see:
```
✓ Ready on http://localhost:3000
```

### Terminal 2: Start Cloudflare Tunnel (in a NEW terminal window)

Open a **new terminal window** and run:

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

**Copy the HTTPS URL** (e.g., `https://abc123-def456-ghi789.trycloudflare.com`)

### Step 3: Configure Yahoo App

1. Go to https://developer.yahoo.com/apps/
2. Edit your app
3. Set:
   - **Homepage URL**: `https://abc123-def456-ghi789.trycloudflare.com`
   - **Redirect URI(s)**: `https://abc123-def456-ghi789.trycloudflare.com/api/auth/yahoo/callback`
4. Click Save

### Step 4: Update Environment Variables

Create/update `.env.local` in your project root:

```bash
YAHOO_CLIENT_ID=your_client_id
YAHOO_CLIENT_SECRET=your_client_secret
YAHOO_REDIRECT_URI=https://abc123-def456-ghi789.trycloudflare.com/api/auth/yahoo/callback
NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id
YAHOO_GAME_KEY=418
```

Replace `https://abc123-def456-ghi789.trycloudflare.com` with your actual Cloudflare Tunnel URL.

### Step 5: Restart Dev Server

1. Stop the dev server (Ctrl+C in Terminal 1)
2. Restart it: `npm run dev`

### Step 6: Test

Open your browser to: `https://abc123-def456-ghi789.trycloudflare.com` (your Cloudflare Tunnel HTTPS URL, not localhost!)

The app will automatically redirect to Yahoo for authentication (no button click required).

## Important Notes

- **Keep both terminals open** - Cloudflare Tunnel and dev server must both be running
- **Use the Cloudflare Tunnel HTTPS URL** - not localhost
- **Cloudflare Tunnel URL changes** - if you restart cloudflared, update Yahoo settings and `.env.local`

## Troubleshooting

**Cloudflare Tunnel URL changes each restart?**
- Free tier: Yes, URLs change
- Solution: Update Yahoo app settings and `.env.local` each time

**Can't connect?**
- Make sure both terminals are running
- Use the HTTPS Cloudflare Tunnel URL, not HTTP or localhost
- Check that redirect URI matches exactly in Yahoo and `.env.local`
- For production, see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)
