# TODO - AiTradr

## ✅ Completed Features

- [x] Yahoo Fantasy Sports API integration
- [x] OAuth2 authentication with automatic flow
- [x] Automatic league synchronization
- [x] Team roster fetching and display
- [x] Comprehensive player statistics (skaters and goalies)
- [x] Accurate stat_id mappings for 2025-26 NHL season
- [x] Player value calculation algorithm (weighted stats + Yahoo rank calibration)
- [x] Position eligibility bonuses
- [x] Team record extraction and display
- [x] Season stats filtering (rejects projected/average stats)
- [x] Dynamic stat definitions from Yahoo API
- [x] Real-time sync status indicator
- [x] Automatic OAuth flow on page load
- [x] Auto-sync on tab visibility change
- [x] Netlify deployment configuration
- [x] API testing with Jest
- [x] Workspace cleanup (removed ngrok files)

## 🚀 Current Status

**Version**: 1.0.0 - Production Ready

**Deployment**: 
- Production: https://aitradr.netlify.app
- Local Dev: Requires Cloudflare Tunnel for OAuth

**Latest Fixes (Nov 28, 2025)**:
- ✅ Fixed stats fetching to use ONLY season-based endpoints (removed date-based fallback)
- ✅ Stats now correctly reflect 2025-26 NHL season data
- ✅ Removed duplicate API calls - stats fetched once per team
- ✅ Fixed cached stats issue - teams always replaced with fresh data
- ✅ Mobile-friendly responsive design implemented

**Core Features**: All operational and tested
- ✅ All player stats correctly mapped and displaying (2025-26 season)
- ✅ All goalie stats correctly mapped and displaying (2025-26 season)
- ✅ All teams syncing correctly (10 teams)
- ✅ Team records accurate
- ✅ Player values calculated correctly (0-99.9 scale)
- ✅ OAuth auto-sync working
- ✅ Sync status indicator functional
- ✅ Mobile-responsive design

## 📋 Future Enhancements

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

## 🐛 Known Issues / Notes

- CSP errors from Yahoo's analytics scripts (can be ignored - Yahoo-side issue)
- Cloudflare Tunnel URLs change on restart (requires Yahoo app settings update for local dev)
- `NEXT_PUBLIC_` environment variables require rebuild after changes

## 🔍 Recent Fixes (Nov 28, 2025)

- **Stats Fetching**: Removed date-based fallback that was causing incorrect stats. Now uses ONLY season-based endpoint (`/stats;type=season;season=2025`) for 2025-26 NHL season
- **Duplicate API Calls**: Added logging to track and prevent duplicate stats fetches
- **Cached Stats**: Fixed team manager to always replace teams (no stale cache)
- **Mobile Design**: Added responsive design for mobile devices

## 🔧 Technical Debt

- [ ] Add comprehensive error handling for API failures
- [ ] Implement retry logic for failed API calls
- [ ] Add unit tests for value calculation algorithm
- [ ] Add integration tests for OAuth flow
- [ ] Optimize API call batching
- [ ] Add API rate limiting handling

## 📝 Documentation

- [x] README.md updated
- [x] Netlify deployment guide
- [x] Yahoo HTTPS setup guide (Cloudflare Tunnel)
- [ ] API documentation
- [ ] User guide
- [ ] Developer contribution guide

