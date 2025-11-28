# ngrok Setup Guide

## Step 1: Sign Up for ngrok Account

1. Go to https://dashboard.ngrok.com/signup
2. Sign up for a free account (no credit card required)
3. Verify your email address

## Step 2: Get Your Authtoken

1. After signing up, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (it will look like: `2abc123def456...`)

## Step 3: Configure ngrok

Run this command in your terminal (replace with your actual authtoken):

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

For example:
```bash
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu
```

## Step 4: Verify Setup

Test that ngrok is working:

```bash
ngrok http 3000
```

You should see output like:
```
Session Status                online
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

If you see this, ngrok is configured correctly!

## Alternative: Cloudflare Tunnel

If you prefer not to sign up for ngrok, you can use Cloudflare Tunnel instead (no account required):

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

This will also give you an HTTPS URL that you can use with Yahoo OAuth.

