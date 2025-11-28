# How to Check Netlify Function Logs

## Method 1: Netlify Dashboard (Recommended)

1. Go to: https://app.netlify.com/projects/aitradr/functions
2. You'll see a list of function invocations
3. Click on any invocation to see detailed logs
4. Look for logs from `/api/yahoo/sync` route

## Method 2: Netlify CLI

```bash
netlify logs:functions
```

Then select the function you want to see logs for.

## What to Look For in Logs

### For Standings (0-0-0 records):
- `📊 Team [Name]: Record X-Y-Z` - Shows successful standings parsing
- `⚠️ Team [Name]: No standings data found` - Shows standings weren't found
- `📊 Found standings data in separate endpoint` - Shows fallback worked
- `✅ Updated standings for [Name]: X-Y-Z` - Shows standings were updated

### For Player Stats:
- `📊 Extracted season from league: [season]` - Shows season was found
- `📊 Fetching stats for X players (season=[season])` - Shows stats fetch started
- `✅ Attached stats to [Player Name] (X stats)` - Shows stats were attached
- `✅ Stats fetch complete for team [Name]: X/Y players have stats` - Shows summary
- `⚠️ No season provided for team [Name] - skipping stats fetch` - Shows season missing

### Critical Errors:
- `❌ CRITICAL: No season found in league info` - Stats won't work without season
- `❌ Failed to fetch stats for team [Name]` - Stats fetch failed
- `⚠️ Team [Name]: No standings data found` - Standings not found

## Quick Check

The logs will show you:
1. If season is being extracted correctly
2. If stats are being fetched
3. How many players receive stats
4. If standings are found (either in teams response or fallback endpoint)

