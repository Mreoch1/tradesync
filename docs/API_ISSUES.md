# Yahoo Fantasy Sports API Issues

This document outlines the current issues and challenges with the Yahoo Fantasy Sports API integration.

## Remediation Status

**Last Updated:** Implementation in progress

### ✅ Completed

1. **OAuth Authentication** - Single source of truth for redirect URI with validation on boot
2. **Response Parsing** - Unified normalizer function and declarative path extraction created
3. **Season Detection** - Game endpoint as canonical source implemented
4. **Standings Parser** - Dedicated standings parser with fail-fast created
5. **Roster Parser** - Normalize players to flat list implemented

### 🚧 In Progress

1. **Stat ID Mapping** - Removing hardcoded IDs, migrating to dynamic mapping only
2. **Coverage Type** - Implementing strict filtering for season stats only
3. **Error Handling** - Reducing logging to 3 levels, enforcing fail-fast

### 📋 Pending

1. Integration of new modules into existing codebase
2. Update yahooParser.ts to use centralized stat definitions
3. Update sync route to use new modules
4. Testing with real API responses

## Table of Contents

1. [OAuth Authentication Issues](#oauth-authentication-issues)
2. [Response Parsing Issues](#response-parsing-issues)
3. [Stats Fetching Issues](#stats-fetching-issues)
4. [Team Standings Issues](#team-standings-issues)
5. [Roster Parsing Issues](#roster-parsing-issues)
6. [Error Handling Challenges](#error-handling-challenges)
7. [Known Workarounds](#known-workarounds)

---

## OAuth Authentication Issues

### Problem: Redirect URI Mismatch

**Symptoms:**
- OAuth callback fails with `INVALID_REDIRECT_URI` error
- Yahoo redirects back without authorization code
- Authentication flow breaks in production

**Root Causes:**
1. **Hardcoded Production URL**: The code uses hardcoded `https://aitradr.netlify.app/api/auth/yahoo/callback` in production, but environment variables or request origin might differ
2. **Tunnel URL Interference**: In production, tunnel URLs or different domains can cause redirect URI mismatches
3. **Exact Match Requirement**: Yahoo requires the redirect URI to match EXACTLY (no trailing slashes, exact case, exact protocol)

**Current Implementation:**
- Complex logic in `app/api/auth/yahoo/callback/route.ts` to detect production vs local
- Hardcoded production URL to prevent tunnel URL issues
- Extensive logging to debug redirect URI mismatches

**Files Affected:**
- `app/api/auth/yahoo/callback/route.ts` (lines 28-156)
- `components/YahooSync.tsx` (lines 149-199)
- `lib/yahooFantasyApi.ts` (lines 1218-1275)

---

## Response Parsing Issues

### Problem: Complex Nested Array Structures

**Symptoms:**
- Data extraction fails intermittently
- Multiple fallback attempts needed to find data
- Inconsistent response structures from Yahoo API

**Root Causes:**
1. **Yahoo's Array Format**: Yahoo uses arrays like `[dataObject, subResource1, subResource2, ...]` where:
   - Index 0 contains the main data object
   - Subsequent indices contain sub-resources
   - Sometimes the structure is nested further (arrays within arrays)

2. **Inconsistent Structures**: The same endpoint can return different structures:
   - Sometimes `team[1].roster` exists
   - Sometimes roster is at `team[0][i].roster`
   - Sometimes roster is nested deeper

**Current Implementation:**
- `extractYahooData()` helper function attempts to handle nested structures
- Multiple search attempts through different array indices
- Extensive logging to identify structure location

**Example from Code:**
```typescript
// From getTeamRoster - multiple attempts to find roster
if (Array.isArray(team[0])) {
  // Try team[1].roster first
  if (team[1]?.roster) {
    rosterData = team[1].roster
  } else {
    // Search through team[0] array
    for (let i = 0; i < team[0].length; i++) {
      if (team[0][i]?.roster) {
        rosterData = team[0][i].roster
        break
      }
    }
  }
}
```

**Files Affected:**
- `lib/yahooFantasyApi.ts` (lines 542-560, 926-1024)
- `lib/yahooParser.ts` (lines 104-169)

---

## Stats Fetching Issues

### Problem 1: Season Detection

**Symptoms:**
- Stats not fetched for players
- Wrong season stats returned
- Logs show "No season found in league info"

**Root Causes:**
1. **Season Extraction**: The season must be extracted from league info, but:
   - League response structure varies
   - Season might be in `league[0]`, `league[1]`, or game info
   - Game key 465 = 2025-26 NHL season, but season should be "2025"

2. **Fallback Logic**: Multiple fallback attempts to find season:
   - Check league data
   - Check game info
   - Hardcoded fallback for game_key 465

**Current Implementation:**
- `getLeagueInfo()` function attempts multiple extraction methods
- Fallback to game info fetch if season not found
- Hardcoded mapping for known game keys

**Files Affected:**
- `lib/yahooFantasyApi.ts` (lines 427-533)
- `app/api/yahoo/sync/route.ts` (lines 114-134)

### Problem 2: Stat ID Mapping

**Symptoms:**
- Player stats show incorrect values
- Celebrini example: Shows G:24 A:14 but should be G:14 A:20
- Stat IDs may have changed for 2025-26 season

**Root Causes:**
1. **Stat ID Changes**: Yahoo may have changed stat_id mappings for the new season
2. **Hardcoded Mappings**: Code uses hardcoded stat_id mappings (0=Goals, 1=Assists, etc.) which may be incorrect
3. **Stat Definitions**: Stat definitions are fetched but may not be used correctly

**Current Implementation:**
- Stat definitions are fetched from `game/{gameKey}/stat_categories`
- `findStatIdByName()` function attempts to map by stat name
- Fallback to hardcoded stat_id mappings if definitions unavailable
- Extensive logging for Celebrini to debug stat mappings

**Example from Code:**
```typescript
// Goals (G) - use stat definitions first
const goalsStatId = findStatIdByName(['goals', 'g', 'goal'])
if (goalsStatId) {
  stats.goals = statsMap[goalsStatId]
} else if (statsMap['0'] !== undefined) {
  stats.goals = statsMap['0'] // Fallback to stat_id 0
}
```

**Files Affected:**
- `lib/yahooParser.ts` (lines 244-713)
- `lib/yahooFantasyApi.ts` (lines 396-422, 751-921)

### Problem 3: Coverage Type Validation

**Symptoms:**
- Stats fetched but not attached to players
- Logs show "coverage_type is not 'season'"
- Wrong coverage type returned (e.g., "date" instead of "season")

**Root Causes:**
1. **Coverage Type Mismatch**: Stats endpoint must specify `type=season;season={season}`
2. **Validation Too Strict**: Code validates `coverage_type === 'season'` and rejects other types
3. **Multiple Stat Sets**: Response may contain multiple stat sets (season, week, date) and wrong one selected

**Current Implementation:**
- Validates `coverage_type === 'season'` before using stats
- Searches through multiple stat sets to find season stats
- Rejects stats if coverage_type doesn't match

**Files Affected:**
- `lib/yahooFantasyApi.ts` (lines 819-861)

---

## Team Standings Issues

### Problem: Teams Show 0-0-0 Records

**Symptoms:**
- All teams show 0-0-0 record
- Standings data not found in expected location
- Fallback to separate standings endpoint needed

**Root Causes:**
1. **Standings Location**: Standings might be at:
   - `teamArray[2].team_standings.outcome_totals` (expected)
   - Different array index
   - Separate standings endpoint required

2. **Search Logic**: Code searches through multiple array indices but may miss the correct location

**Current Implementation:**
- Searches through `actualTeamArray` for standings
- Checks multiple possible locations
- Falls back to `/league/{leagueKey}/standings` endpoint if all teams have 0-0-0

**Example from Code:**
```typescript
// Search through actualTeamArray for standings
for (let i = 0; i < actualTeamArray.length; i++) {
  const item = actualTeamArray[i]
  if (item?.team_standings?.outcome_totals) {
    // Found standings
    const ot = item.team_standings.outcome_totals
    wins = parseInt(ot.wins || ot.win || '0', 10) || 0
    // ...
  }
}
```

**Files Affected:**
- `lib/yahooFantasyApi.ts` (lines 621-743)

---

## Roster Parsing Issues

### Problem: Complex Roster Structure

**Symptoms:**
- Roster not found in response
- Players not parsed correctly
- Multiple search attempts needed

**Root Causes:**
1. **Nested Structure**: Roster structure is `roster["0"].players["0"].player[...]`
2. **Array Variations**: Player data can be:
   - `player: [[{player_key}, ...], ...]` (nested array)
   - `player: [{player_key}, ...]` (direct array)
   - `player: {player_key}` (single object)

3. **Multiple Roster Entries**: Roster can have multiple entries (e.g., active roster, IR, etc.)

**Current Implementation:**
- Multiple search attempts through different structure paths
- Handles both array and object formats
- Extracts players from nested structures

**Files Affected:**
- `lib/yahooFantasyApi.ts` (lines 926-1179)

---

## Error Handling Challenges

### Problem: Extensive Error Handling But Many Edge Cases

**Symptoms:**
- Errors logged but not always actionable
- Multiple fallback attempts make debugging difficult
- Error messages may not clearly indicate root cause

**Current Implementation:**
- Extensive logging at every step
- Multiple fallback attempts
- Detailed error messages with troubleshooting steps

**Issues:**
1. **Too Many Fallbacks**: Makes it hard to identify the actual problem
2. **Log Noise**: Extensive logging can make it hard to find relevant errors
3. **Silent Failures**: Some errors are caught and logged but execution continues

**Files Affected:**
- All API-related files have extensive error handling

---

## Known Workarounds

### 1. Hardcoded Production URL

**Workaround:** Use hardcoded production URL in production to avoid tunnel URL issues.

**Location:** `app/api/auth/yahoo/callback/route.ts` (lines 34-37)

### 2. Fallback Standings Endpoint

**Workaround:** If all teams show 0-0-0, fetch from separate standings endpoint.

**Location:** `lib/yahooFantasyApi.ts` (lines 704-743)

### 3. Stat Definitions Cache

**Workaround:** Fetch stat definitions once and cache them for all players.

**Location:** `app/api/yahoo/sync/route.ts` (lines 136-154), `lib/yahooParser.ts` (lines 66-94)

### 4. Multiple Structure Searches

**Workaround:** Search through multiple possible structure locations before failing.

**Location:** Multiple locations in `lib/yahooFantasyApi.ts`

---

## Recommendations

1. **Simplify Structure Parsing**: Create a more robust, unified parser for Yahoo's nested structures
2. **Better Stat ID Mapping**: Rely more on stat definitions from API rather than hardcoded mappings
3. **Reduce Fallback Complexity**: Simplify error handling to make debugging easier
4. **Add Response Validation**: Validate API responses before attempting to parse
5. **Improve Error Messages**: Make error messages more actionable with specific next steps
6. **Add Integration Tests**: Test with real Yahoo API responses to catch structure changes early

---

## Related Documentation

- `docs/OAUTH_TROUBLESHOOTING.md` - OAuth-specific troubleshooting
- `docs/YAHOO_API_REBUILD.md` - Clean implementation reference
- `docs/YAHOO_API_SETUP.md` - API setup instructions
- `CHECK_LOGS.md` - How to check Netlify function logs

