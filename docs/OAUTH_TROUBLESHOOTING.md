# Yahoo OAuth Troubleshooting Guide

## Error: "Looks like something went wrong" / "Please specify a valid request and submit again"

This error typically indicates one of these issues:

### 1. Redirect URI Mismatch (Most Common)

**Problem**: The redirect URI in your OAuth request doesn't match what's configured in Yahoo Developer Portal.

**Solution**:

1. **Check Yahoo Developer Portal**:
   - Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
   - Find your app
   - Check the "Redirect URI(s)" field
   - It must be **exactly**: `https://aitradr.netlify.app/api/auth/yahoo/callback`
   - No trailing slashes
   - Must use HTTPS (not HTTP)

2. **Verify Netlify Environment Variables**:
   - Go to Netlify → Site Settings → Environment Variables
   - Check `YAHOO_REDIRECT_URI` is set to: `https://aitradr.netlify.app/api/auth/yahoo/callback`
   - No trailing slashes
   - No extra spaces

3. **After making changes**:
   - Click "Update" in Yahoo Developer Portal
   - Wait 2-5 minutes for changes to propagate
   - Trigger a new Netlify deployment (push a commit or use "Trigger deploy")

### 2. Client ID Not Set or Incorrect

**Problem**: `NEXT_PUBLIC_YAHOO_CLIENT_ID` is missing, empty, or incorrect.

**Solution**:

1. **Check Netlify Environment Variables**:
   - Go to Netlify → Site Settings → Environment Variables
   - Verify `NEXT_PUBLIC_YAHOO_CLIENT_ID` is set
   - Verify `YAHOO_CLIENT_ID` is set (should be the same value)
   - No extra spaces or newlines

2. **Trigger a New Deployment**:
   - `NEXT_PUBLIC_` variables are embedded at build time
   - Push a commit to trigger automatic deployment
   - Or use "Trigger deploy" in Netlify dashboard
   - Wait for build to complete

3. **Verify Client ID**:
   - Check browser console for logs showing the client ID being used
   - Compare with the Client ID in Yahoo Developer Portal
   - They must match exactly

### 3. Check Diagnostics Page

Visit the diagnostics page to verify environment variables:

**Production**: `https://aitradr.netlify.app/diagnostics`

This will show:
- Which environment variables are set
- Which ones are missing
- Recommendations for fixing issues

### 4. Browser Console Logs

Check the browser console (F12) for detailed OAuth logs:

- Look for `🔍 OAuth Redirect URI:` - should show `https://aitradr.netlify.app/api/auth/yahoo/callback`
- Look for `🔍 Debug - NEXT_PUBLIC_YAHOO_CLIENT_ID:` - should show "Set"
- Look for any error messages

### 5. Server Logs

Check Netlify Functions logs for server-side errors:

- Go to Netlify → Functions → View logs
- Look for OAuth-related errors
- Check for "Redirect URI mismatch" warnings

## Quick Checklist

- [ ] Redirect URI in Yahoo Developer Portal: `https://aitradr.netlify.app/api/auth/yahoo/callback` (exact match, no trailing slash)
- [ ] `YAHOO_REDIRECT_URI` in Netlify: `https://aitradr.netlify.app/api/auth/yahoo/callback`
- [ ] `NEXT_PUBLIC_YAHOO_CLIENT_ID` in Netlify: Set and matches Yahoo Developer Portal
- [ ] `YAHOO_CLIENT_ID` in Netlify: Set and matches Yahoo Developer Portal
- [ ] `YAHOO_CLIENT_SECRET` in Netlify: Set
- [ ] New deployment triggered after setting `NEXT_PUBLIC_` variables
- [ ] Waited 2-5 minutes after updating Yahoo Developer Portal settings

## Common Mistakes

1. **Trailing slashes**: `https://aitradr.netlify.app/api/auth/yahoo/callback/` ❌ (should be no trailing slash)
2. **HTTP instead of HTTPS**: `http://aitradr.netlify.app/api/auth/yahoo/callback` ❌
3. **Wrong domain**: Using localhost or tunnel URL in production ❌
4. **Not triggering rebuild**: `NEXT_PUBLIC_` variables require a new build
5. **Extra spaces**: Client ID or redirect URI has leading/trailing spaces

## Still Not Working?

1. **Clear browser cache and cookies**
2. **Try incognito/private browsing mode**
3. **Check Netlify deployment logs** for build errors
4. **Verify Yahoo app is approved** for Fantasy Sports API access
5. **Check Yahoo Developer Portal** for any app status issues

## Need More Help?

Check the server logs in Netlify Functions for detailed error messages. The callback route logs extensive debugging information that can help identify the exact issue.

