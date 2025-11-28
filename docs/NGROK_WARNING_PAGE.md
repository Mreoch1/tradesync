# ngrok Free Tier Warning Page

## Important: ngrok Free Tier Requires Visitor Approval

When using ngrok's free tier, **first-time visitors** will see a warning page before accessing your site. This is normal behavior for ngrok free accounts.

### What You'll See

1. **First Visit**: ngrok shows a warning page asking you to click "Visit Site"
2. **After Clicking**: You'll be redirected to your actual application

### How to Handle This

**For Development:**
- Simply click "Visit Site" on the ngrok warning page
- Your app will load normally after that

**For OAuth Callbacks:**
- Yahoo will redirect back to your ngrok URL
- This should work fine - the warning page appears before the redirect happens

### If ngrok Stops Working

If you get SSL errors or "site can't be reached":

1. **Check if ngrok is running:**
   ```bash
   # In a terminal, check:
   curl http://localhost:4040/api/tunnels
   ```

2. **Restart ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Get the new URL** and update:
   - Yahoo app settings
   - `.env.local` file
   - Restart dev server

### Alternative: ngrok Paid Plan

If the warning page is annoying, you can:
- Upgrade to a paid ngrok plan (starts around $8/month)
- Use Cloudflare Tunnel (free, no warning page, but URLs change)
- Use a different tunneling solution

