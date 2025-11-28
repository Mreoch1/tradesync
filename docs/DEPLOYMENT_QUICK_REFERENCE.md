# Deployment Quick Reference

## Local Development vs Production

| Aspect | Local Development | Production (Netlify/Vercel) |
|--------|------------------|---------------------------|
| **HTTPS** | Cloudflare Tunnel required | Automatic (provided by platform) |
| **URL** | Changes on restart | Permanent |
| **Environment Variables** | `.env.local` file | Platform dashboard |
| **Setup** | Manual tunnel setup | Automatic HTTPS |

## Quick Answer: Do I Need a Tunnel?

- **Local Development**: ✅ Yes, you need Cloudflare Tunnel
- **Production (Netlify/Vercel)**: ❌ No, hosting platform provides HTTPS automatically

## Netlify Deployment

1. Deploy your app to Netlify
2. Get your Netlify URL (e.g., `https://your-app.netlify.app`)
3. Update Yahoo Developer Portal with Netlify URL
4. Set environment variables in Netlify dashboard
5. Done! No tunnel needed.

See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for detailed instructions.

## Environment Variables

### Local Development (`.env.local`)
```bash
YAHOO_REDIRECT_URI=https://your-tunnel-url.trycloudflare.com/api/auth/yahoo/callback
```

### Production (Netlify Dashboard)
```bash
YAHOO_REDIRECT_URI=https://your-app.netlify.app/api/auth/yahoo/callback
```

## Yahoo Developer Portal

You can add **multiple redirect URIs**:
- One for local development (tunnel URL)
- One for production (Netlify URL)

This way you can develop locally and deploy to production without changing settings each time.

