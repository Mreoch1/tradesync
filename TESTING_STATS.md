# Testing Stats Accuracy

## How to Test

1. **Start your dev server and sync teams:**
   ```bash
   npm run dev
   ```
   - Navigate to your app
   - Let it auto-sync your league

2. **Check the Browser Console:**
   Look for these log messages:

   **✅ Good signs:**
   - `✅ Found SEASON stats in array for [playerKey]`
   - `✅ Found SEASON player_stats in object for [playerKey]`
   - `✅ Attached [X] SEASON stats to [Player Name] (coverage: season, value: [year])`
   - `📊 VERIFICATION: First player coverage_type="season", coverage_value=[year]`

   **⚠️ Warning signs:**
   - `⚠️ Skipping [coverage_type] stats for [playerKey] - only using season stats`
   - `❌ WARNING: No season stats found for player [playerKey]!`
   - `⚠️ WARNING: Player [name] has [coverage_type] stats, not season stats!`

3. **Compare Stats:**
   - Go to a team page (e.g., `/teams/mooninites`)
   - Compare the displayed stats with Yahoo Fantasy website
   - Check a few players to verify:
     - Goals (G)
     - Assists (A)
     - Points (P)
     - Plus/Minus (+/-)
     - Other stats match

4. **What to Look For:**
   - If stats don't match, check console for:
     - What `coverage_type` is being returned
     - What `coverage_value` (season year) is being returned
     - Whether season stats are being found or rejected

5. **If Stats Still Don't Match:**
   - Check the console logs for the actual API response
   - Look for `📊 Stats response structure` to see what Yahoo is returning
   - Verify the season parameter being used matches your league's season
   - Check if the API is returning multiple coverage types and we're selecting the wrong one

## Expected Behavior

- **Only season stats should be attached** - all other coverage types (projected, average, date) are rejected
- **Console should show** `coverage_type="season"` for all attached stats
- **Stats should match** what you see on Yahoo Fantasy website for the current season

## Debugging

If stats are wrong:
1. Check server logs (terminal) for API responses
2. Check browser console for coverage_type warnings
3. Verify the season parameter extracted from league matches your league's actual season
4. Check if Yahoo API is returning season stats or something else

