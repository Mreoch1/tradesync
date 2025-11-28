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

### Terminal 2: Start ngrok (in a NEW terminal window)

Open a **new terminal window** and run:

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123def456.ngrok.io`)

### Step 3: Configure Yahoo App

1. Go to https://developer.yahoo.com/apps/
2. Edit your app
3. Set:
   - **Homepage URL**: `https://abc123def456.ngrok.io`
   - **Redirect URI(s)**: `https://abc123def456.ngrok.io/api/auth/yahoo/callback`
4. Click Save

### Step 4: Update Environment Variables

Create/update `.env.local` in your project root:

```bash
YAHOO_CLIENT_ID=your_client_id
YAHOO_CLIENT_SECRET=your_client_secret
YAHOO_REDIRECT_URI=https://abc123def456.ngrok.io/api/auth/yahoo/callback
NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id
YAHOO_GAME_KEY=418
```

Replace `https://abc123def456.ngrok.io` with your actual ngrok URL.

### Step 5: Restart Dev Server

1. Stop the dev server (Ctrl+C in Terminal 1)
2. Restart it: `npm run dev`

### Step 6: Test

Open your browser to: `https://abc123def456.ngrok.io` (your ngrok HTTPS URL, not localhost!)

## Important Notes

- **Keep both terminals open** - ngrok and dev server must both be running
- **Use the ngrok HTTPS URL** - not localhost
- **ngrok URL changes** - if you restart ngrok, update Yahoo settings and `.env.local`

## Troubleshooting

**ngrok URL changes each restart?**
- Free tier: Yes, URLs change
- Paid tier: You can reserve a domain
- Solution: Update Yahoo app settings and `.env.local` each time

**Can't connect?**
- Make sure both terminals are running
- Use the HTTPS ngrok URL, not HTTP or localhost
- Check that redirect URI matches exactly in Yahoo and `.env.local`

