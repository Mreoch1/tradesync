# Netlify Deployment Guide

## Overview

When deploying to Netlify, you **do NOT need ngrok or Cloudflare Tunnel**. Netlify provides HTTPS automatically, so you can use your Netlify URL directly in the Yahoo Developer Portal.

## Prerequisites

- A Netlify account (free tier works fine)
- Your Yahoo Developer App credentials (Client ID and Client Secret)
- Your app code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard

1. Go to [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 18.x or higher
5. Click **"Deploy site"**

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

## Step 2: Get Your Netlify URL

After deployment, Netlify will provide you with a URL like:
- `https://your-app-name.netlify.app`
- Or a custom domain if you've configured one

**Note**: Your Netlify URL is permanent and won't change (unlike ngrok/Cloudflare Tunnel URLs).

## Step 3: Update Yahoo Developer Portal

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
2. Find your app and click **"Edit"**
3. Update the following:
   - **Homepage URL**: `https://your-app-name.netlify.app`
   - **Redirect URI(s)**: `https://your-app-name.netlify.app/api/auth/yahoo/callback`
     - Add this as a new redirect URI (you can keep your development URLs too)
4. Click **"Update"** to save

## Step 4: Configure Netlify Environment Variables

1. In Netlify Dashboard, go to your site
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:

```
YAHOO_CLIENT_ID=your_client_id_from_yahoo
YAHOO_CLIENT_SECRET=your_client_secret_from_yahoo
YAHOO_REDIRECT_URI=https://your-app-name.netlify.app/api/auth/yahoo/callback
NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id_from_yahoo
YAHOO_GAME_KEY=418
```

**Important Notes**:
- Replace `your-app-name.netlify.app` with your actual Netlify URL
- `NEXT_PUBLIC_` prefix is required for client-side variables in Next.js
- Never commit these values to your repository

## Step 5: Redeploy

After adding environment variables, trigger a new deployment:

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Deploy site"**
   - Or push a new commit to your repository

## Step 6: Test Your Deployment

1. Visit your Netlify URL: `https://your-app-name.netlify.app`
2. Click **"Connect Yahoo Account"** (or similar button)
3. You should be redirected to Yahoo for authentication
4. After authorizing, you should be redirected back to your app

## Differences from Local Development

| Local Development | Netlify Production |
|------------------|-------------------|
| Uses ngrok/Cloudflare Tunnel | Uses Netlify's HTTPS |
| URL changes on restart | Permanent URL |
| `.env.local` file | Environment variables in Netlify dashboard |
| `npm run dev` | Automatic builds on git push |

## Troubleshooting

### "redirect_uri_mismatch" Error

- Ensure the redirect URI in Yahoo **exactly matches** your Netlify URL
- Format: `https://your-app-name.netlify.app/api/auth/yahoo/callback`
- Check that environment variables are set correctly in Netlify

### Environment Variables Not Working

- Make sure you've redeployed after adding environment variables
- Check that variable names are correct (case-sensitive)
- Verify `NEXT_PUBLIC_YAHOO_CLIENT_ID` is set (required for client-side)

### Build Failures

- Check Netlify build logs for errors
- Ensure Node version is 18+ (set in Netlify settings)
- Verify all dependencies are in `package.json`

### OAuth Not Working

1. Check browser console for errors
2. Verify Yahoo app settings match your Netlify URL
3. Check Netlify function logs (if using serverless functions)
4. Ensure all environment variables are set

## Custom Domain (Optional)

If you have a custom domain:

1. In Netlify, go to **Domain settings**
2. Add your custom domain
3. Update Yahoo Developer Portal with your custom domain:
   - Homepage URL: `https://yourdomain.com`
   - Redirect URI: `https://yourdomain.com/api/auth/yahoo/callback`
4. Update `YAHOO_REDIRECT_URI` environment variable in Netlify

## Next Steps

- ✅ Your app is now live on Netlify
- ✅ HTTPS is automatically provided
- ✅ No need for ngrok/Cloudflare Tunnel
- ✅ URL is permanent (won't change)

You can continue developing locally with ngrok/Cloudflare Tunnel, but your production app on Netlify doesn't need it!

