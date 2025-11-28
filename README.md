# AiTradr

**AiTradr** - A professional-grade web application for analyzing and evaluating fantasy sports trades across multiple sports (NFL, NBA, MLB, NHL). Make informed trade decisions with detailed value analysis, projections, and recommendations. Features real-time Yahoo Fantasy Sports synchronization and advanced trade analytics.

**Status**: ✅ Stable Development Version - All core features operational, stats correctly mapped, team records accurate.

## Features

### Core Functionality
- **Trade Value Analysis**: Comprehensive value calculations for both sides of a trade
- **Player Search & Selection**: Intuitive player search with autocomplete
- **Trade Recommendations**: AI-powered recommendations (Accept/Decline/Counter)
- **Confidence Scoring**: Percentage-based confidence levels for each recommendation
- **Projected Points Analysis**: Compare projected fantasy points between trade sides
- **Positional Value Distribution**: See value breakdown by position
- **Draft Pick Management**: Add and value draft picks in trades
- **League Settings**: Configure sport type and scoring system
- **Yahoo Fantasy Sports Integration**: Automatic team and player data synchronization
- **Comprehensive Player Stats**: Full season statistics displayed in Yahoo-style format
- **Advanced Value Calculation**: Weighted algorithm using stats, Yahoo rank, and position eligibility

### Advanced Analysis
- **Detailed Reasoning**: Comprehensive explanations for each recommendation
- **Strength & Weakness Analysis**: Identifies roster strengths and weaknesses
- **Positional Balance**: Analyzes positional diversity and balance
- **Value Comparison**: Side-by-side comparison with percentage differences
- **Multi-Factor Evaluation**: Considers value, projections, and roster quality

### Yahoo Fantasy Sports Features
- **Automatic Synchronization**: Auto-syncs to your league on page load
- **Comprehensive Player Statistics**: Full season stats displayed in Yahoo-style format
  - **Skater Stats**: G, A, P, +/-, PIM, PPP, SHP, GWG, SOG, FW, HIT, BLK
  - **Goalie Stats**: GS, W, L, GA, GAA, SV, SA, SV%, SHO
  - **Ownership Stats**: % Start, % Ros
- **Real-Time Data**: Teams, rosters, and stats fetched directly from Yahoo API
- **Advanced Value Calculation**: Sophisticated weighted algorithm using stats, Yahoo rank calibration, and position bonuses

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **UI Components**: Custom component library with professional design
- **Package Manager**: npm

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- **For Local Development**: Cloudflare Tunnel or ngrok (required for Yahoo API OAuth HTTPS)
- **For Production (Netlify/Vercel)**: No tunnel needed - hosting platform provides HTTPS automatically

### Installation

1. Install dependencies:
```bash
npm install
```

2. **Set up HTTPS tunnel** (required for Yahoo OAuth):
   
   **Option A: Cloudflare Tunnel (Recommended - Free, no signup required)**
   ```bash
   # Install cloudflared (if not already installed)
   brew install cloudflare/cloudflare/cloudflared
   
   # Start tunnel
   cloudflared tunnel --url http://localhost:3000
   ```
   - Copy your Cloudflare Tunnel HTTPS URL (e.g., `https://abc123.trycloudflare.com`)
   - **Note**: Cloudflare Tunnel URLs change each time you restart it
   
   **Option B: ngrok (Alternative)**
   ```bash
   # Sign up for a free account at https://dashboard.ngrok.com/signup
   # Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ngrok http 3000
   ```
   - Copy your ngrok HTTPS URL (e.g., `https://abc123.ngrok-free.dev`)
   - **Note**: ngrok free tier URLs change each time you restart it

3. (Optional) Create a `.env.local` file from `.env.local.example`:
```bash
cp .env.local.example .env.local
```

4. Run the development server:
```bash
npm run dev
```

5. Access your application:
   
   **For Local Development**: Use your tunnel URL (Cloudflare or ngrok)
   
   **For Production Deployment**: See [NETLIFY_DEPLOYMENT.md](./docs/NETLIFY_DEPLOYMENT.md)
   - Local: [http://localhost:3000](http://localhost:3000)
   - Public (via tunnel): Use your Cloudflare Tunnel or ngrok HTTPS URL

## Project Structure

```
fantasy-sports-trade-analyzer/
├── app/                           # Next.js app directory
│   ├── layout.tsx                # Root layout with metadata
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles with Tailwind
├── components/                    # React components
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx           # Button component
│   │   ├── Card.tsx             # Card component
│   │   └── Header.tsx           # Header component
│   ├── PlayerSelector.tsx        # Player search and selection
│   ├── PlayerSearch.tsx          # Player search component
│   ├── TradeSideBuilder.tsx      # Trade side configuration
│   ├── TradeAnalysisResults.tsx  # Analysis results display
│   ├── TradeBlock.tsx            # Trade block management
│   ├── LeagueSettings.tsx        # League configuration
│   ├── TradeAnalyzer.tsx         # Main analyzer component
│   ├── YahooSync.tsx             # Yahoo Fantasy Sports sync component
│   └── TeamBrowser.tsx           # Team browser component
├── lib/                          # Core libraries
│   ├── analyzer.ts              # Advanced trade analysis engine
│   ├── yahooFantasyApi.ts       # Yahoo Fantasy Sports API client
│   ├── yahooParser.ts           # Yahoo API response parser
│   ├── teamManager.ts           # Team management and persistence
│   ├── samplePlayers.ts         # Sample player data
│   └── draftPickValues.ts       # Draft pick value calculations
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/yahoo/callback/ # OAuth callback handler
│   │   └── yahoo/sync/          # Yahoo sync API route
│   └── teams/[id]/               # Team detail pages
├── types/                        # TypeScript type definitions
│   └── index.ts                 # Core types and interfaces
├── utils/                        # Utility functions
│   └── playerUtils.ts           # Player value calculations
├── hooks/                        # Custom React hooks
├── public/                       # Static assets
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
└── README.md
```

## Usage

1. **Configure League Settings**: Select your sport and scoring type
2. **Build Trade Sides**: 
   - Search and add players to Side A
   - Search and add players to Side B
   - Optionally add draft picks to either side
3. **Analyze Trade**: Click "Analyze Trade" to get detailed insights
4. **Review Results**: 
   - See value comparisons
   - Read recommendation reasoning
   - Check confidence levels
   - Review strengths and weaknesses

## Development

### Starting the Application

1. Start HTTPS tunnel (required for Yahoo API):
   
   **Cloudflare Tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   
   **Or ngrok:**
   ```bash
   ngrok http 3000
   ```
   
   Note your tunnel HTTPS URL for configuration.

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application:
   - Local: [http://localhost:3000](http://localhost:3000)
   - Public (via tunnel): Use your Cloudflare Tunnel or ngrok HTTPS URL

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build optimized production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality
- `npm run type-check` - Type-check TypeScript without emitting files

## Player Value Calculation Algorithm

The application uses a sophisticated weighted algorithm to calculate player values (0-99.9 scale, with 99.9 being the maximum):

### Value Calculation Components

1. **Stat-Based Value** (Primary): Weighted calculation based on actual player statistics
2. **Yahoo Rank Calibration** (Secondary): Uses Yahoo's player rankings to calibrate values
3. **Position Bonuses**: Dual/triple position eligibility adds value for roster flexibility

### Skater Value Weights

**Primary Scoring Stats:**
- Goals: 4.0 per goal (most valuable)
- Assists: 3.0 per assist
- Total Points: 3.4 per point (when G/A not available separately)

**Special Teams & Bonus Stats:**
- Power Play Points (PPP): 1.5 per point
- Short Handed Points (SHP): 2.0 per point (rare and valuable)
- Game Winning Goals (GWG): 1.0 per goal

**Team/Defensive Stats:**
- Plus/Minus: 0.8 per point
- Blocks: 0.3 per block
- Hits: 0.25 per hit

**Volume Indicators:**
- Shots on Goal: 0.15 per shot
- Faceoff Wins: 0.1 per win (centers only)
- Penalty Minutes: -0.05 per minute (slight negative)

**Position Bonuses:**
- Dual Position (e.g., "LW,RW"): +2.0 value
- Triple Position (e.g., "C,LW,RW"): +3.5 value

### Goalie Value Weights

**Primary Stats:**
- Wins: 3.5 per win (most important)
- Save Percentage: (SV% - 85) × 2 (e.g., 92% = +14 points)
- Goals Against Average: (3.00 - GAA) × 8.0 (lower is better)

**Bonus Stats:**
- Shutouts: 4.0 per shutout

**Volume Stats:**
- Games Started: 0.3 per game
- Saves: 0.02 per save
- Goals Against: -0.1 per goal (penalty)

### Yahoo Rank Calibration

The algorithm uses Yahoo's player rankings to calibrate values and ensure proper distribution:

- **Rank 1**: 99.9 (maximum value)
- **Rank 2-5**: 99.9 to 98.5 (top tier)
- **Rank 6-10**: 98.0 to 96.5 (elite tier)
- **Rank 11-25**: 96.0 to 91.0 (high tier)
- **Rank 26-50**: 90.5 to 82.0 (good tier)
- **Rank 51-100**: 81.5 to 64.0 (solid tier)
- **Rank 101-200**: 63.5 to 38.0 (average tier)
- **Rank 201-500**: 37.5 to 10.0 (below average)
- **Rank 500+**: 10.0 (minimum)

### Value Blending

Final values are calculated by blending:
- **Skaters**: 60% stat-based value + 40% rank-calibrated value
- **Goalies**: 65% stat-based value + 35% rank-calibrated value

This ensures that:
- Players with strong stats get high values
- Yahoo's rankings provide calibration to prevent all good players from being 99.9
- Top-ranked players (rank 1) achieve the maximum 99.9 value
- Value distribution is realistic and differentiated

## Analysis Engine

The trade analyzer uses a sophisticated multi-factor analysis system:

1. **Value Calculation**: Aggregates player values and draft pick worth
2. **Percentage Analysis**: Calculates value difference as a percentage
3. **Recommendation Logic**:
   - **Accept**: Within 5% value difference
   - **Counter**: 5-15% value difference
   - **Decline**: More than 15% value difference
4. **Confidence Scoring**: Based on value gap, projection availability, and roster balance
5. **Reasoning Generation**: Comprehensive explanations considering multiple factors

## Customization

### Adding Players
Edit `lib/samplePlayers.ts` to add your own player data. In production, this would typically come from an API or database.

### Adjusting Analysis Logic
Modify `lib/analyzer.ts` to customize:
- Recommendation thresholds
- Confidence calculations
- Strength/weakness identification
- Reasoning generation

### Styling
The app uses Tailwind CSS. Modify `tailwind.config.js` to customize the design system.

## Yahoo Fantasy Sports API Integration

The application supports automatic team and player data synchronization from Yahoo Fantasy Sports leagues. This eliminates the need for manual data entry and ensures your trade analysis uses real-time roster information with comprehensive player statistics.

**Key Features:**
- **Automatic Authentication**: OAuth flow initiates automatically on first visit
- **Auto-Sync**: Automatically syncs to your "atfh2" league (or saved league) on page load
- **Comprehensive Stats**: Full season statistics displayed in Yahoo-style table format
- **Real-Time Data**: Teams, rosters, and player stats are fetched directly from Yahoo Fantasy Sports API
- **Player Value Calculation**: Values calculated based on actual stats, rank, and ownership data
- **Automatic Cache Clearing**: Stats cache is automatically cleared before each sync to ensure fresh data

**Important**: Yahoo OAuth requires HTTPS, so all traffic must go through a tunnel (Cloudflare Tunnel or ngrok). The application is configured to use the tunnel for all Yahoo API interactions.

**Current Status (v1.0.0 - Stable Dev):**
- ✅ Team rosters and player data sync working
- ✅ Team records (wins/losses/ties) extraction working correctly
- ✅ Automatic cache clearing before each sync
- ✅ Player statistics correctly mapped and displaying accurate 2025-26 season stats
- ✅ All stat_id mappings verified and working correctly (Goals, Assists, SOG, FW, HIT, BLK, etc.)
- ✅ Player value calculation algorithm working with weighted stats, rank calibration, and position bonuses
- ✅ Stable development version - all core features operational and tested

### Setup Instructions

1. **Set up HTTPS tunnel** (if not already done):
   
   **Cloudflare Tunnel (Recommended):**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   - Copy your Cloudflare Tunnel HTTPS URL (e.g., `https://abc123.trycloudflare.com`)
   
   **Or ngrok:**
   ```bash
   ngrok http 3000
   ```
   - Copy your ngrok HTTPS URL (e.g., `https://abc123.ngrok-free.dev`)
   
   **Important**: Tunnel URLs change each time you restart. Update your Yahoo app settings whenever the URL changes.

2. **Register a Yahoo Developer Application**:
   - Go to [Yahoo Developer Network](https://developer.yahoo.com/apps/)
   - Click "Create an App"
   - Fill in the application details:
     - Application Name: Your app name
     - Application Type: Web Application
     - Homepage URL: 
       - **Local Dev**: Your tunnel HTTPS URL (e.g., `https://abc123.trycloudflare.com`)
       - **Production**: Your Netlify/Vercel URL (e.g., `https://your-app.netlify.app`)
     - Redirect URI(s): 
       - **Local Dev**: `https://YOUR_TUNNEL_URL/api/auth/yahoo/callback`
       - **Production**: `https://YOUR_NETLIFY_URL/api/auth/yahoo/callback`
       - You can add multiple redirect URIs (one for dev, one for production)
     - Description: Fantasy Sports Trade Analyzer integration
   - Request access to "Fantasy Sports" API
   - After approval, note your `Client ID` and `Client Secret`

3. **Configure Environment Variables**:
   
   Create a `.env.local` file in the root directory:
   ```bash
   # Yahoo Fantasy Sports API OAuth Credentials
   YAHOO_CLIENT_ID=your_client_id_here
   YAHOO_CLIENT_SECRET=your_client_secret_here
   YAHOO_REDIRECT_URI=https://YOUR_TUNNEL_URL/api/auth/yahoo/callback
   YAHOO_GAME_KEY=418
   NEXT_PUBLIC_YAHOO_CLIENT_ID=your_client_id_here
   ```

   **Note**: 
   - **Local Dev**: Replace `YOUR_TUNNEL_URL` with your actual tunnel domain (Cloudflare or ngrok)
   - **Production (Netlify)**: Replace with your Netlify URL (e.g., `https://your-app.netlify.app`)
   - The `NEXT_PUBLIC_` prefix is required for client-side environment variables in Next.js
   - For production, set these in your hosting platform's environment variables (not `.env.local`)
   - See [NETLIFY_DEPLOYMENT.md](./docs/NETLIFY_DEPLOYMENT.md) for production deployment guide

4. **Find Your Game Key**:
   - Game key `418` = NHL 2025-26 season (may vary - check Yahoo API for current season)
   - Stats are fetched for season 2025 (2025-26 NHL season)
   - You can find other game keys by querying the Yahoo API or checking [Yahoo's documentation](https://developer.yahoo.com/fantasysports/guide/game-resource.html)

### Using the Yahoo Sync Feature

The Yahoo sync feature works automatically:

1. **Automatic Authentication**: 
   - On first visit, the app automatically redirects to Yahoo for authentication
   - Log in to your Yahoo account and authorize the application
   - You'll be redirected back to the app with tokens stored

2. **Automatic League Sync**:
   - After authentication, the app automatically finds your "atfh2" league
   - If "atfh2" is not found, it will display available leagues
   - The league key is saved for future auto-syncs

3. **Automatic Team & Player Sync**:
   - Teams and rosters are automatically synced on page load
   - **Cache is automatically cleared** before each sync to ensure fresh data
   - Player statistics are fetched for the 2025-26 season
   - Stats include: G, A, P, +/-, PIM, PPP, SHP, GWG, SOG, FW, HIT, BLK (skaters)
   - Goalie stats: GS, W, L, GA, GAA, SV, SA, SV%, SHO
   - Ownership stats: % Start, % Ros

4. **Viewing Teams & Players**:
   - Navigate to any team page to see all players with full statistics
   - Stats are displayed in Yahoo-style table format
   - All stats are always visible (showing 0 if not available)
   - Team records (wins-losses-ties) are displayed in the team header

**Note**: Stats are automatically fetched for the current season (2025-26) and displayed accurately. The app uses season stats exclusively and rejects projected/average stats to ensure accuracy.

### API Structure

The Yahoo integration consists of several key files:

- `lib/yahooFantasyApi.ts` - Core API client with OAuth2 authentication
- `lib/yahooParser.ts` - Converts Yahoo API responses to our internal format
- `app/api/yahoo/sync/route.ts` - Server-side API route for secure API calls
- `components/YahooSync.tsx` - UI component for syncing teams

### OAuth Flow

The application uses OAuth2 authorization code flow with automatic initiation:

1. App automatically redirects to Yahoo authorization page (on first visit)
2. User authorizes the application
3. Yahoo redirects back with authorization code
4. Server exchanges code for access token
5. Access token stored in session storage (client-side)
6. Refresh tokens used automatically when access tokens expire
7. League auto-sync triggers after successful authentication

### Security Notes

- **Never commit** `.env.local` to version control (it's already in `.gitignore`)
- OAuth credentials are stored server-side only
- Access tokens are stored client-side in session storage (not persisted)
- API requests are proxied through Next.js API routes to keep credentials secure
- Tokens automatically refresh before expiration

### Troubleshooting

**"Yahoo Client ID not configured"**:
- Make sure you've created `.env.local` with `NEXT_PUBLIC_YAHOO_CLIENT_ID`
- Restart your development server after adding environment variables

**"Failed to authenticate"**:
- Ensure your tunnel is running (Cloudflare Tunnel or ngrok)
- Check that your redirect URI in `.env.local` matches exactly what's configured in your Yahoo app
- Verify your tunnel URL hasn't changed (free tunnel URLs change on restart)
- Update both Yahoo app settings and `.env.local` if the tunnel URL changed
- Ensure you've requested and received approval for Fantasy Sports API access
- Make sure you're accessing the app through the tunnel HTTPS URL, not localhost

**"No leagues found"**:
- Verify you're using the correct game key for your sport/season
- Check that your Yahoo account has active fantasy leagues

**Token refresh errors**:
- Tokens expire after 1 hour. Re-authenticate if refresh fails
- Clear session storage and try again

**Stats showing incorrect values** (if encountered):
- Stats are now correctly mapped and should match Yahoo's website
- If discrepancies occur, check browser console for coverage_type logs - should show "season" for season stats
- Verify the season parameter (defaults to 2025 for 2025-26 season)
- Stats cache is automatically cleared on each sync
- Ensure you're comparing with Yahoo's "2025-26 Season" stats, not projected or average stats

## Completed Features

- [x] API integration for real-time player data (Yahoo Fantasy Sports)
- [x] Automatic league synchronization
- [x] Comprehensive player statistics display with accurate stat_id mappings
- [x] Player value calculation with weighted algorithm
- [x] Yahoo rank calibration for value distribution
- [x] Position eligibility bonuses
- [x] Team record extraction and display
- [x] Season stats filtering (rejects projected/average stats)

## Future Enhancements

- [ ] Trade history and saving
- [ ] Export trade analysis reports
- [ ] Advanced league settings (custom scoring, roster requirements)
- [ ] Trade simulator with roster impact analysis
- [ ] Multi-league support
- [ ] Mobile app version
- [ ] Support for other fantasy platforms (ESPN, Sleeper, etc.)

## License

MIT

