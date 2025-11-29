# Yahoo API Remediation Implementation

This document tracks the implementation of the remediation plan for Yahoo Fantasy Sports API issues.

## New Module Structure

The remediation plan has been implemented with a new modular architecture:

```
lib/yahoo/
  ├── config.ts          # Single source of truth for OAuth redirect URI
  ├── client.ts          # Core API client for authenticated requests
  ├── normalize.ts       # Response normalization utilities
  ├── season.ts          # Season detection from game endpoint
  ├── statDefinitions.ts # Stat definitions cache and lookup
  ├── standings.ts       # Dedicated standings parser
  └── roster.ts          # Roster parsing utilities
```

## Implementation Details

### 1. OAuth Configuration (`lib/yahoo/config.ts`)

**Status:** ✅ Complete

- Single source of truth: `YAHOO_REDIRECT_URI` constant
- Validated on module load (HTTPS, no trailing slashes, valid URL)
- Logs once on startup, not per request
- Throws error if misconfigured

**Usage:**
```typescript
import { YAHOO_REDIRECT_URI } from '@/lib/yahoo/config'
// Use YAHOO_REDIRECT_URI directly - no branching logic
```

### 2. Response Normalization (`lib/yahoo/normalize.ts`)

**Status:** ✅ Complete

- `normalizeYahooNode()` - Extracts first element from Yahoo arrays
- `findFirstPath()` - Declarative path extraction with multiple fallback paths
- Replaces complex nested loops with simple path-based lookups

**Usage:**
```typescript
import { normalizeYahooNode, findFirstPath } from '@/lib/yahoo/normalize'

const team = normalizeYahooNode(raw.team)
const roster = findFirstPath(team, ['roster', 'team.0.roster', 'players'])
```

### 3. Season Detection (`lib/yahoo/season.ts`)

**Status:** ✅ Complete

- Canonical source: `game/{gameKey}` endpoint
- Cached globally by game_key
- Extracts season year (e.g., "2025" from "2025-26")
- Fail-fast if season cannot be determined

**Usage:**
```typescript
import { getSeason } from '@/lib/yahoo/season'

const season = await getSeason(accessToken, gameKey)
// Returns "2025" for NHL 2025-26 season
```

### 4. Stat Definitions (`lib/yahoo/statDefinitions.ts`)

**Status:** ✅ Complete

- Fetches from `game/{gameKey}/stat_categories`
- Cached globally by game_key
- Provides `getStatIdByName()` for dynamic stat mapping
- Fail-fast if stat definitions unavailable

**Usage:**
```typescript
import { getStatDefinitions, getStatIdByName } from '@/lib/yahoo/statDefinitions'

// Fetch and cache stat definitions
await getStatDefinitions(accessToken, gameKey)

// Look up stat ID by name
const goalsStatId = getStatIdByName(gameKey, ['goals', 'g', 'goal'])
```

### 5. Standings Parser (`lib/yahoo/standings.ts`)

**Status:** ✅ Complete

- Searches local team response first
- Falls back to league standings endpoint
- Fail-fast if standings cannot be found
- Never allows silent 0-0-0 defaults

**Usage:**
```typescript
import { parseStandings } from '@/lib/yahoo/standings'

const teamsWithStandings = await parseStandings(accessToken, leagueKey, teams)
// Throws error if any team missing standings
```

### 6. Roster Parser (`lib/yahoo/roster.ts`)

**Status:** ✅ Complete

- `flattenPlayers()` - Normalizes nested roster structures to flat list
- `parseRoster()` - Complete roster parser with fail-fast
- Handles multiple possible roster structures

**Usage:**
```typescript
import { parseRoster } from '@/lib/yahoo/roster'

const players = parseRoster(rosterResponse)
// Throws error if roster cannot be parsed
```

### 7. OAuth Callback (`app/api/auth/yahoo/callback/route.ts`)

**Status:** ✅ Updated

- Uses `YAHOO_REDIRECT_URI` from config
- Removed all branching logic
- Simplified error handling
- Reduced logging noise

### 8. Frontend Component (`components/YahooSync.tsx`)

**Status:** ✅ Partially Updated

- Simplified redirect URI construction
- Removed production detection logic
- Still needs full integration with new modules

## Migration Checklist

### High Priority

- [ ] Update `lib/yahooParser.ts` to use `getStatIdByName()` instead of hardcoded stat IDs
- [ ] Remove hardcoded stat ID fallbacks from `parsePlayerStats()`
- [ ] Update `app/api/yahoo/sync/route.ts` to use new modules:
  - [ ] Use `getSeason()` instead of `getLeagueInfo()`
  - [ ] Use `parseStandings()` for team standings
  - [ ] Use `parseRoster()` for roster parsing
  - [ ] Use `getStatDefinitions()` before parsing stats
- [ ] Update `lib/yahooFantasyApi.ts` to use new modules:
  - [ ] Replace `makeApiRequest()` with `client.makeApiRequest()`
  - [ ] Use `normalizeYahooNode()` throughout
  - [ ] Use `parseRoster()` for roster parsing

### Medium Priority

- [ ] Update coverage type validation to strict filtering
- [ ] Reduce logging to 3 levels (info, warn, error)
- [ ] Add integration tests with real API response snapshots
- [ ] Update error messages to be more actionable

### Low Priority

- [ ] Remove deprecated `extractYahooData()` function
- [ ] Clean up old fallback logic
- [ ] Update documentation

## Breaking Changes

1. **Environment Variable Required**: `YAHOO_REDIRECT_URI` must be set or app will fail to start
2. **Stat Definitions Required**: Stat parsing will fail if stat definitions cannot be fetched
3. **Season Required**: Season must be determinable from game endpoint
4. **Standings Required**: Standings must be found or sync will fail

## Testing Strategy

1. **Unit Tests**: Test each parser module with mock Yahoo responses
2. **Integration Tests**: Test full sync flow with real API responses
3. **Snapshot Tests**: Store real API responses and test parsers against them
4. **Regression Tests**: Test edge cases (empty roster, injured players, etc.)

## Next Steps

1. Complete migration of `yahooParser.ts` to use dynamic stat mappings
2. Update sync route to use all new modules
3. Add comprehensive error handling
4. Test with real Yahoo API responses
5. Update documentation

