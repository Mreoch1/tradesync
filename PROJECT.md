# AiTradr - Single Source of Truth (SSOT)

**Last Updated:** 2025-01-XX (Current Session)

This document is the authoritative source for all project state, decisions, changes, TODOs, and unresolved issues. Always read from and write to this document.

---

## Project Status

**Version:** 1.0.0 - Production Ready  
**Deployment:** https://aitradr.netlify.app  
**Status:** ✅ Core features operational, API remediation in progress

---

## Current Session Changes (2025-01-XX)

### API Remediation Implementation

**Status:** 🚧 In Progress

**Completed:**
- ✅ Created modular architecture in `lib/yahoo/` directory
- ✅ Implemented single source of truth for OAuth redirect URI (`lib/yahoo/config.ts`)
- ✅ Created unified response normalization utilities (`lib/yahoo/normalize.ts`)
- ✅ Implemented canonical season detection from game endpoint (`lib/yahoo/season.ts`)
- ✅ Created stat definitions cache with dynamic lookup (`lib/yahoo/statDefinitions.ts`)
- ✅ Built dedicated standings parser with fail-fast (`lib/yahoo/standings.ts`)
- ✅ Created roster parser with player flattening (`lib/yahoo/roster.ts`)
- ✅ Updated OAuth callback to use config module
- ✅ Simplified frontend OAuth redirect URI construction
- ✅ Cleaned up `getAuthorizationUrl()` function

**In Progress:**
- 🚧 Integration of new modules into existing codebase
- 🚧 Migration of `yahooParser.ts` to use dynamic stat mappings
- 🚧 Update sync route to use new modules

**Pending:**
- ⏳ Remove hardcoded stat ID fallbacks
- ⏳ Implement strict coverage type filtering
- ⏳ Reduce logging to 3 levels (info, warn, error)
- ⏳ Add integration tests with real API responses

**Files Created:**
- `lib/yahoo/config.ts` - OAuth configuration with validation
- `lib/yahoo/client.ts` - Core API client
- `lib/yahoo/normalize.ts` - Response normalization utilities
- `lib/yahoo/season.ts` - Season detection from game endpoint
- `lib/yahoo/statDefinitions.ts` - Stat definitions cache
- `lib/yahoo/standings.ts` - Standings parser
- `lib/yahoo/roster.ts` - Roster parser
- `docs/REMEDIATION_IMPLEMENTATION.md` - Implementation guide

**Files Modified:**
- `app/api/auth/yahoo/callback/route.ts` - Uses config module, simplified
- `components/YahooSync.tsx` - Simplified redirect URI construction
- `lib/yahooFantasyApi.ts` - Simplified `getAuthorizationUrl()`
- `docs/API_ISSUES.md` - Updated with remediation status

---

## Architecture Decisions

### 1. Yahoo API Module Structure (2025-01-XX)

**Decision:** Implement modular architecture for Yahoo API integration

**Rationale:**
- Single responsibility principle
- Easier testing and maintenance
- Clear separation of concerns
- Fail-fast error handling

**Structure:**
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

**Status:** ✅ Implemented

---

### 2. OAuth Redirect URI (2025-01-XX)

**Decision:** Single source of truth with validation on boot

**Rationale:**
- Eliminates branching logic
- Prevents redirect URI mismatches
- Fail-fast on misconfiguration
- Reduces log noise

**Implementation:**
- `YAHOO_REDIRECT_URI` constant in `lib/yahoo/config.ts`
- Validated on module load (HTTPS, no trailing slashes, valid URL)
- Logs once on startup, not per request
- Throws error if misconfigured

**Status:** ✅ Implemented

---

### 3. Response Normalization (2025-01-XX)

**Decision:** Unified normalizer with declarative path extraction

**Rationale:**
- Eliminates complex nested loops
- Handles Yahoo's variable response structures
- Easier to maintain and debug

**Implementation:**
- `normalizeYahooNode()` - Extracts first element from Yahoo arrays
- `findFirstPath()` - Declarative path extraction with multiple fallback paths

**Status:** ✅ Implemented

---

### 4. Season Detection (2025-01-XX)

**Decision:** Canonical source from game endpoint, not league or game_key guessing

**Rationale:**
- Game endpoint is authoritative
- Prevents future breakage from game_key changes
- Cached globally by game_key

**Implementation:**
- `getSeason()` in `lib/yahoo/season.ts`
- Fetches from `game/{gameKey}` endpoint
- Extracts season year (e.g., "2025" from "2025-26")
- Fail-fast if season cannot be determined

**Status:** ✅ Implemented

---

### 5. Stat ID Mapping (2025-01-XX)

**Decision:** Dynamic mapping only, no hardcoded stat IDs

**Rationale:**
- Stat IDs may change between seasons
- Hardcoded mappings cause incorrect stats
- Fail-fast if stat definitions unavailable

**Implementation:**
- `getStatDefinitions()` fetches from `game/{gameKey}/stat_categories`
- `getStatIdByName()` provides dynamic lookup
- Cached globally by game_key
- No fallback to hardcoded IDs

**Status:** ✅ Module created, 🚧 Integration pending

---

### 6. Standings Parser (2025-01-XX)

**Decision:** Dedicated parser with fail-fast, no silent 0-0-0 defaults

**Rationale:**
- Standings are critical for team records
- Silent defaults hide data issues
- Better error visibility

**Implementation:**
- `parseStandings()` in `lib/yahoo/standings.ts`
- Searches local team response first
- Falls back to league standings endpoint
- Throws error if standings cannot be found

**Status:** ✅ Implemented

---

### 7. Roster Parser (2025-01-XX)

**Decision:** Normalize players to flat list from nested structures

**Rationale:**
- Yahoo's roster structure is complex and variable
- Flat list is easier to work with
- Consistent parsing logic

**Implementation:**
- `flattenPlayers()` normalizes nested structures
- `parseRoster()` provides complete parser
- Handles multiple possible roster structures

**Status:** ✅ Implemented

---

## Active TODOs

### High Priority

1. **Migrate yahooParser.ts to use dynamic stat mappings**
   - Remove hardcoded stat ID fallbacks
   - Use `getStatIdByName()` from `lib/yahoo/statDefinitions.ts`
   - Fail-fast if stat definitions unavailable
   - **Status:** 🚧 Pending

2. **Update sync route to use new modules**
   - Use `getSeason()` instead of `getLeagueInfo()`
   - Use `parseStandings()` for team standings
   - Use `parseRoster()` for roster parsing
   - Use `getStatDefinitions()` before parsing stats
   - **Status:** 🚧 Pending

3. **Update yahooFantasyApi.ts to use new modules**
   - Replace `makeApiRequest()` with `client.makeApiRequest()`
   - Use `normalizeYahooNode()` throughout
   - Use `parseRoster()` for roster parsing
   - **Status:** 🚧 Pending

4. **Implement strict coverage type filtering**
   - Only accept `coverage_type === 'season'`
   - No fallback to week or date stats
   - **Status:** ⏳ Pending

### Medium Priority

5. **Reduce logging to 3 levels**
   - Info: high-level flow
   - Warn: degraded behavior
   - Error: failed operations
   - **Status:** ⏳ Pending

6. **Add integration tests**
   - Store real API response snapshots
   - Test parsers against snapshots
   - Test edge cases (empty roster, injured players, etc.)
   - **Status:** ⏳ Pending

### Low Priority

7. **Remove deprecated functions**
   - Remove `extractYahooData()` (replaced by `normalizeYahooNode()`)
   - Clean up old fallback logic
   - **Status:** ⏳ Pending

---

## Unresolved Issues

### API Issues

1. **Stat ID Mappings May Have Changed**
   - **Issue:** Celebrini example shows G:24 A:14 but should be G:14 A:20
   - **Root Cause:** Stat IDs may have changed for 2025-26 season, or using wrong stat set
   - **Status:** 🚧 Being addressed by dynamic stat mapping implementation
   - **Resolution:** Use stat definitions from API, no hardcoded IDs

2. **Complex Response Structures**
   - **Issue:** Yahoo API returns variable nested structures
   - **Root Cause:** Yahoo uses arrays like `[dataObject, subResource1, subResource2, ...]`
   - **Status:** ✅ Addressed by normalization utilities
   - **Resolution:** Use `normalizeYahooNode()` and `findFirstPath()`

3. **Season Detection**
   - **Issue:** Season sometimes not found in league response
   - **Root Cause:** Season location varies in response structure
   - **Status:** ✅ Addressed by canonical game endpoint approach
   - **Resolution:** Use `getSeason()` from game endpoint

4. **Standings 0-0-0 Records**
   - **Issue:** Teams sometimes show 0-0-0 records
   - **Root Cause:** Standings not found in expected location
   - **Status:** ✅ Addressed by dedicated standings parser
   - **Resolution:** Use `parseStandings()` with fail-fast

### OAuth Issues

5. **Redirect URI Mismatch**
   - **Issue:** OAuth fails with INVALID_REDIRECT_URI
   - **Root Cause:** Complex branching logic, tunnel URLs in production
   - **Status:** ✅ Addressed by single source of truth
   - **Resolution:** Use `YAHOO_REDIRECT_URI` from config

---

## Completed Features

- [x] Yahoo Fantasy Sports API integration
- [x] OAuth2 authentication with automatic flow
- [x] Automatic league synchronization
- [x] Team roster fetching and display
- [x] Comprehensive player statistics (skaters and goalies)
- [x] Player value calculation algorithm (weighted stats + Yahoo rank calibration)
- [x] Position eligibility bonuses
- [x] Team record extraction and display
- [x] Season stats filtering (rejects projected/average stats)
- [x] Real-time sync status indicator
- [x] Automatic OAuth flow on page load
- [x] Auto-sync on tab visibility change
- [x] Netlify deployment configuration
- [x] API testing with Jest
- [x] Modular Yahoo API architecture
- [x] Single source of truth for OAuth redirect URI
- [x] Unified response normalization
- [x] Canonical season detection
- [x] Stat definitions cache
- [x] Dedicated standings parser
- [x] Roster parser with player flattening

---

## Future Enhancements

### High Priority
- [ ] Trade history and saving functionality
- [ ] Export trade analysis reports (PDF/CSV)
- [ ] Trade simulator with roster impact analysis
- [ ] Advanced league settings (custom scoring, roster requirements)

### Medium Priority
- [ ] Multi-league support
- [ ] Player comparison tool
- [ ] Trade block management improvements
- [ ] Notification system for trade recommendations

### Low Priority
- [ ] Mobile app version (React Native)
- [ ] Support for other fantasy platforms (ESPN, Sleeper, etc.)
- [ ] Advanced analytics dashboard
- [ ] Social features (share trades, comments)

---

## Technical Debt

- [ ] Add comprehensive error handling for API failures
- [ ] Implement retry logic for failed API calls
- [ ] Add unit tests for value calculation algorithm
- [ ] Add integration tests for OAuth flow
- [ ] Optimize API call batching
- [ ] Add API rate limiting handling
- [ ] Complete migration to new Yahoo API modules
- [ ] Remove deprecated functions and old fallback logic

---

## Known Issues / Notes

- CSP errors from Yahoo's analytics scripts (can be ignored - Yahoo-side issue)
- Cloudflare Tunnel URLs change on restart (requires Yahoo app settings update for local dev)
- `NEXT_PUBLIC_` environment variables require rebuild after changes
- `YAHOO_REDIRECT_URI` environment variable must be set or app will fail to start (new requirement)

---

## Environment Variables

### Required
- `YAHOO_CLIENT_ID` - Yahoo OAuth client ID
- `YAHOO_CLIENT_SECRET` - Yahoo OAuth client secret
- `YAHOO_REDIRECT_URI` - OAuth redirect URI (must be HTTPS, no trailing slash)
- `NEXT_PUBLIC_YAHOO_CLIENT_ID` - Client ID for client-side (must match YAHOO_CLIENT_ID)

### Optional
- `YAHOO_GAME_KEY` - Game key (defaults to '418' for NHL)

---

## File Structure

```
fantasy-sports-trade-analyzer/
├── app/
│   ├── api/
│   │   ├── auth/yahoo/callback/  # OAuth callback handler
│   │   └── yahoo/sync/           # Yahoo sync API route
│   └── teams/[id]/               # Team detail pages
├── components/                    # React components
├── lib/
│   ├── yahoo/                    # NEW: Modular Yahoo API architecture
│   │   ├── config.ts             # OAuth configuration
│   │   ├── client.ts             # Core API client
│   │   ├── normalize.ts          # Response normalization
│   │   ├── season.ts             # Season detection
│   │   ├── statDefinitions.ts    # Stat definitions cache
│   │   ├── standings.ts          # Standings parser
│   │   └── roster.ts             # Roster parser
│   ├── yahooFantasyApi.ts        # Legacy API client (being migrated)
│   ├── yahooParser.ts            # Legacy parser (being migrated)
│   └── ...
├── docs/
│   ├── API_ISSUES.md            # API issues documentation
│   ├── REMEDIATION_IMPLEMENTATION.md  # Remediation guide
│   └── ...
└── PROJECT.md                    # THIS FILE - SSOT
```

---

## Change Log

### 2025-01-XX - API Remediation Implementation
- Created modular Yahoo API architecture
- Implemented single source of truth for OAuth redirect URI
- Created unified response normalization utilities
- Implemented canonical season detection
- Created stat definitions cache
- Built dedicated standings parser
- Created roster parser with player flattening
- Updated OAuth callback and frontend components

### 2025-11-28 - Stats Fixes
- Fixed stats fetching to use ONLY season-based endpoints
- Removed date-based fallback that was causing incorrect stats
- Stats now correctly reflect 2025-26 NHL season data
- Removed duplicate API calls
- Fixed cached stats issue

---

## Notes

- Always update this document immediately after any modification to scope, behavior, or structure
- Never assume state from memory - always read from this document
- All decisions, changes, TODOs, and issues must be written here
- This is the single source of truth for project state

