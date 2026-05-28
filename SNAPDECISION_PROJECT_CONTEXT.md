# SnapDecision — Fantasy Football App

## Project Overview
Full-stack fantasy football decision support app.
- **Frontend**: React 18, TypeScript, Vite, MUI v6, recharts
- **Backend**: FastAPI, Python 3.13, SQLAlchemy async, asyncpg
- **Database**: PostgreSQL on Railway
- **Deployment**: Vercel (frontend) + Railway (backend + DB)
- **APIs**: Yahoo Fantasy OAuth2, The Odds API, Sleeper API, Anthropic Claude API

## Live URLs
- Frontend: snapdecision101.vercel.app
- Backend: flex-appeal-production.up.railway.app
- GitHub: flex-appeal repo

## Frontend Structure src/
### Pages
- TeamOverview.tsx — home, real Yahoo roster, real Yahoo matchup (opponent/projected/actual/record), mock fallback; league rules badge; NFL schedule
- LineupEval.tsx — real Yahoo roster via useRoster; league scoring settings active; slot-by-slot eval with mode toggle; "League rules active" badge; mock info banner when Yahoo not connected
- PlayerCompare.tsx — compare up to 5 players; leagueScoring from useRoster passed to useScoring; "League rules active" badge; Sleeper player search
- Settings.tsx — Yahoo status, scoring format/mode, engine accuracy, Sync Week UI (league + week selector, Sync button, feedback), logout
- TradeAnalyzer.tsx — AI trade evaluation via Claude; leagueScoring passed to Claude payload; real Yahoo roster via useRoster; pending trades banner; freeSolo autocomplete; 429 rate limit error handling
- WaiverAssistant.tsx — AI waiver recommendations via Claude; leagueScoring passed to Claude payload; real Yahoo roster; real free agents from Yahoo; quick-tap chips; mock pool fallback offseason; 429 rate limit error handling
- Landing.tsx — sign in page shown when VITE_AUTH_ENABLED=true and not logged in

### Components
- AppHeader.tsx — sticky header, SnapDecision logo, week badge, format badge, settings gear icon
- PlayerCard.tsx — roster player card, position-specific props, stat chips
- PlayerCompareCard.tsx — compare card with score, stats, explanation, lock/remove
- EvalCard.tsx — lineup eval card with keep/swap, floor/ceiling bar
- NflScheduleCarousel.tsx — week-by-week NFL schedule with spreads and O/U
- MatchHistoryChart.tsx — recharts bar chart, W/L colored bars, avg line
- LeagueSelector.tsx — Dialog shown after first login to pick league
- ScoreBadge.tsx — colored score pill, green/yellow/red
- StatChip.tsx — fixed width 58px stat chip
- ModeSelector.tsx — Floor/Balanced/Upside toggle
- VolatilityBadge.tsx — Low/Medium/High chip
- FloorCeilingBar.tsx — visual range bar
- FreshnessBadge.tsx — pulsing dot with UTC-aware local timestamp

### Hooks
- useAuth.ts — checks localStorage + backend /auth/yahoo/status
- useRoster.ts — smart roster: real Yahoo data with mock fallback, Sleeper stats enrichment, league scoring settings fetch (cached 6hr); returns leagueScoring, season, leagueKey in state
- useScoring.ts — POST /api/scoring/score, accepts leagueScoring param, returns scored players
- useLineup.ts — POST /api/lineup/evaluate, accepts leagueKey + leagueScoring, week/season for backtest logging
- usePlayers.ts — Sleeper player search via GET /api/players/nfl
- useOdds.ts — GET /api/odds/events, returns weeks grouped by NFL week
- useYahoo.ts — useYahooStatus, useYahooLeagues
- useStats.ts — enriches players with real pointsLastThree from Sleeper
- useSettings (context) — global scoringFormat + scoringMode persisted to localStorage

### Context
- AuthContext.tsx — wraps useAuth, provides user/loading/checked/logout globally
- SettingsContext.tsx — global scoringFormat + scoringMode, persists to localStorage

### Key Types (src/types/index.ts)
Player interface has position-specific props:
- passingYardsProp (QB), rushingYardsProp (RB), receivingYardsProp (WR, TE)
- pointsAllowedProp (DST), projectedFgProp (K)

### Services (src/services/api.ts)
Single axios instance at VITE_API_URL. Exports:
oddsApi, scoringApi, playerApi, lineupApi, yahooApi, backtestApi, statsApi, aiApi

yahooApi methods: getStatus, getLeagues, getMyTeam, getRoster, connectUrl,
  getPendingTrades, getFreeAgents, getLeagueSettings (cached 6hr localStorage),
  getMatchup (current week matchup with opponent/projected/actual/record),
  clearLeagueSettingsCache

backtestApi methods: getSummary (league_key param), getHistory (league_key param),
  syncWeek, logActualPoints, bulkLogActualPoints

LeagueScoring and LeagueSettingsResponse types exported from api.ts
scoringApi and lineupApi accept optional leagueScoring param
aiApi.analyzeTrade and aiApi.analyzeWaiver accept optional league_scoring param

### Data
- mockData.ts — full mock dataset: 9 starters, 9 bench, nflPlayerPool, 13-week history
- nflTeams.ts — all 32 NFL DST teams with dstToPlayer converter

### Environment Variables
- VITE_AUTH_ENABLED=false (local) / true (production)
- VITE_API_URL=http://localhost:8000 (local) / Railway URL (production)

## App Navigation (App.tsx)
Bottom nav tabs (5 visible):
- 0 — My Team (SportsFootballIcon)
- 1 — Lineup (BoltIcon)
- 2 — Compare (PeopleAltIcon)
- 3 — Trade (SwapHorizIcon)
- 4 — Waivers (PersonAddIcon)
- 5 — Settings (NOT in bottom nav — header gear icon only)

## Backend Structure backend/
### Entry Points
- main.py — FastAPI app, registers all routers, runs init_db() on startup, load_dotenv() at top
- database.py — SQLAlchemy async engine, converts postgresql:// to asyncpg, get_db dependency

### Models
- models/player.py — Pydantic: PlayerInput, PlayerScore, LeagueScoring (per-stat point values),
  ScoreRequest (accepts optional leagueScoring), enums
- models/db_models.py — SQLAlchemy ORM: users, leagues, teams, roster_players,
  player_stats, lineup_evaluations, weekly_matchups, ai_usage
- models/user_repository.py — DB ops: get_or_create_user, save_tokens,
  get_active_token, get_refresh_token, get_first_user

### Services
- scoring_service.py — core engine: position weights, mode adjustments,
  calc_league_format_boost() (replaces generic FORMAT_BOOSTS when LeagueScoring provided),
  build_explanation() (league-aware), score_players() — all accept optional LeagueScoring
- lineup_service.py — SLOT_ELIGIBILITY map, evaluate_lineup(), evaluate_flex()
- odds_service.py — Odds API: get_nfl_events() with spreads+totals, get_team_totals()
- sleeper_service.py — Sleeper API (no key), in-memory cache, parse_sleeper_players()
- yahoo_service.py — OAuth flow, token refresh, get_user_leagues(), get_roster(),
  get_my_team(), get_pending_trades(), get_free_agents(),
  get_league_settings() (parses Yahoo stat category IDs → LeagueScoring),
  get_roster_with_points() (actual pts for a week — used by sync-week),
  get_current_matchup() (scoreboard: opponent, record, projected, actual pts)
- backtest_service.py — log_lineup_evaluation(), log_actual_points(), get_backtest_summary()
- stats_service.py — Sleeper stats: get_week_stats(), calc_fantasy_points(), get_points_last_three()
- ai_service.py — AsyncAnthropic client, check_and_increment_usage() (per-user DB rate limiter),
  get_usage_today(), build_roster_context(), analyze_trade(), analyze_waiver_wire().
  Model: claude-haiku-4-5-20251001. league_scoring passed to both analyze functions.

### Routers
- routers/odds.py — GET /api/odds/events, /totals, /props/{id}
- routers/scoring.py — POST /api/scoring/score, /explain/{player_id}
- routers/lineup.py — POST /api/lineup/evaluate (accepts league_key, resolves team_id from DB,
  accepts leagueScoring, logs to DB), /flex
- routers/sleeper.py — GET /api/players/nfl, DELETE /api/players/nfl/cache
- routers/yahoo.py — GET /auth/yahoo/login, /callback, /status, /leagues,
  /league-settings/{league_key}, /team/{league_key}, /roster/{league_key}/{team_key},
  /matchup/{league_key} (current week matchup, graceful null fallback),
  /free-agents/{league_key}, /trades/pending (all leagues), /debug
- routers/backtest.py — GET /api/backtest/summary (league_key param, aggregates all leagues),
  POST /sync-week (Yahoo points + was_followed auto-set),
  POST /actual-points (single override), POST /actual-points/bulk, GET /history
- routers/stats.py — GET /api/stats/week, POST /points-last-three/bulk, GET /current-season
- routers/ai.py — POST /api/ai/trade (per-user rate limit, league_scoring passthrough),
  POST /api/ai/waiver (per-user rate limit, league_scoring passthrough),
  GET /api/ai/status (returns user's requests_today, requests_left, requests_limit)

### Utils
- utils/season.py — get_current_season(), get_current_week() (0 if offseason)

### Environment Variables (Railway + local .env)
- DATABASE_URL, ODDS_API_KEY, YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET
- YAHOO_REDIRECT_URI, FRONTEND_URL
- ANTHROPIC_API_KEY (spelled ANTHROPIC not ANTROPIC)
- MAX_AI_REQUESTS_PER_DAY=50

## Database Schema (PostgreSQL on Railway)
- users — yahoo_id, display_name, email, tokens, scoring_format, scoring_mode
- leagues — user_id FK, yahoo_league_key, name, season, scoring_format
- teams — league_id FK, user_id FK, yahoo_team_key, wins, losses, points
- roster_players — team_id FK, player data, week, season
- player_stats — yahoo_player_key, week, season, points, props, usage stats
- lineup_evaluations — team_id FK, week, slot, recommendation, scores,
  was_followed, actual_pts (for backtesting)
- weekly_matchups — team_id FK, week, result, points_for, points_against
- ai_usage — user_id FK, date, request_count; unique on (user_id, date);
  auto-created on Railway deploy via init_db(); resets daily — no cron needed

## Scoring Engine Details
Position-specific weights: QB(teamTotal 35%, prop 25%, usage 20%),
RB(usage 30%, prop 30%, teamTotal 20%), WR(prop 35%, usage 25%, teamTotal 20%),
TE(prop 35%, usage 30%, teamTotal 15%), K(teamTotal 35%, prop 40%),
DST(matchup 40%, prop 40% inverted)

Mode shifts weights ±10-15%. League scoring overrides generic format boosts when available.
calc_league_format_boost() translates per-stat Yahoo point values into score adjustments.
Fallback: PPR WR+4/TE+3/RB+2. Floor/ceiling spread by volatility (Low:3/4, Medium:7/9, High:12/15).
Opp rank: top-8=-5pts, 25-32=+6pts. Usage hierarchy: snapPct > targetShare×2.5 > carryShare×1.4 > label.

## League Settings Caching
Fetched via GET /auth/yahoo/league-settings/{league_key}.
Parsed from Yahoo stat category IDs via STAT_ID_MAP in yahoo_service.py.
Cached in localStorage 6hr (key: snapdecision_league_settings_{leagueKey}).
Cleared on logout and Yahoo reconnect. Falls back to PPR defaults if fetch fails.

## Backtest System
- Lineup evaluations auto-logged on every POST /api/lineup/evaluate
- POST /api/backtest/sync-week — pulls Yahoo actual points, sets was_followed automatically
- POST /api/backtest/actual-points/bulk — manual override
- GET /api/backtest/summary — swap/keep/overall accuracy, avg swap gain, aggregates leagues
- team_id always resolved from user_id + league_key join, never hardcoded

## AI Rate Limiting
- Per-user daily limit tracked in ai_usage table (not in-memory)
- Each Yahoo user gets their own 50/day bucket — users never share the limit
- Resets automatically at midnight — date-based, no cron needed
- check_and_increment_usage(user_id, db) called before every Claude API call
- get_usage_today(user_id, db) powers the /api/ai/status endpoint
- Router uses get_first_user() for now — one-line swap when multi-user goes live
- Frontend shows friendly "Resets at midnight" message on 429

## Auth Flow
VITE_AUTH_ENABLED=true → show Landing if no user.
Yahoo OAuth → callback saves token to DB → redirect with ?yahoo_connected=true
→ LeagueSelector Dialog → picks league → scoring format auto-set from Yahoo → ONBOARDED_KEY set.
selected_league_key in localStorage used by all pages.
Logout clears localStorage + AuthContext + league settings cache → returns to Landing.

## Deployment
- Vercel: auto-deploys on git push to main, runs npm run build
- Railway: auto-deploys on git push, runs uvicorn main:app
- ai_usage table auto-created on next Railway deploy via init_db() — no manual migration needed

## Paywall Flag
AI features have a paywall stub ready but disabled:
- AI_PAYWALL_ENABLED boolean — set to false until ready to monetize
- When enabled: add is_pro column to users table, check in get_current_user_id dependency
- No rearchitecting needed — one flag flip to activate

## Completed ✅
✅ Auth flow with landing page and route protection
✅ League selector with auto scoring format from Yahoo
✅ Real Yahoo roster with mock data fallback
✅ Scoring engine (position-specific, Vegas-anchored)
✅ Lineup evaluation with backtest logging
✅ Player compare with Sleeper search
✅ NFL schedule carousel with spreads and O/U
✅ Match history chart
✅ PostgreSQL database with full schema
✅ Sleeper stats service for pointsLastThree
✅ AI trade analyzer (Claude API)
✅ AI waiver wire assistant (Claude API)
✅ Settings with logout, format/mode, engine accuracy
✅ Phase 9: TradeAnalyzer + WaiverAssistant wired to real Yahoo roster
✅ Pending trades auto-detection in TradeAnalyzer
✅ freeSolo autocomplete in TradeAnalyzer
✅ WaiverAssistant real free agents from Yahoo
✅ Quick-tap chips for top 8 free agents with injury color coding
✅ Mock pool fallback during offseason
✅ AsyncAnthropic client — non-blocking
✅ Phase 8: Backtest system complete
  ✅ sync-week pulls real Yahoo points, sets was_followed automatically
  ✅ bulk actual-points endpoint
  ✅ Backtest summary aggregates across multiple leagues
  ✅ team_id hardcode eliminated everywhere
  ✅ Sync Week UI in Settings
✅ League-personalized scoring engine
  ✅ LeagueScoring model with full per-stat point values
  ✅ get_league_settings() parses Yahoo stat category IDs
  ✅ calc_league_format_boost() replaces generic boosts
  ✅ 6pt TD leagues, first down scoring, yardage bonuses handled
  ✅ League settings cached 6hr, cleared on logout
  ✅ useRoster returns leagueScoring — passed through useLineup, useScoring
  ✅ LineupEval, PlayerCompare wired end-to-end with real league rules
✅ Multi-league and multi-user architecture
✅ Real Yahoo matchup data in TeamOverview
  ✅ get_current_matchup() in yahoo_service.py
  ✅ GET /auth/yahoo/matchup/{league_key} endpoint
  ✅ yahooApi.getMatchup() in api.ts
  ✅ TeamOverview fetches and displays real opponent/projected/actual
  ✅ Mock fallback during offseason
✅ League scoring passed to Claude AI
  ✅ TradeAnalyzer passes leagueScoring to analyze_trade()
  ✅ WaiverAssistant passes leagueScoring to analyze_waiver_wire()
  ✅ Claude now gives advice specific to 6pt TD leagues, first down leagues, etc.
✅ Per-user AI rate limiting
  ✅ Replaced global in-memory counter with per-user PostgreSQL tracking
  ✅ ai_usage table: user_id + date unique constraint, auto-resets daily
  ✅ check_and_increment_usage() called before every Claude API call
  ✅ get_usage_today() powers live usage in /api/ai/status
  ✅ league_scoring passthrough fixed in both AI routes
  ✅ Frontend 429 handling with "Resets at midnight" message
  ✅ ai_usage table auto-created on Railway deploy — no manual migration

## Pending / Next Steps
- [ ] Test pending trades with a live Yahoo league
- [ ] Test real free agents when season starts
- [ ] Test sync-week with a completed week
- [ ] Test get_current_matchup with an active league
- [ ] When season starts: real Odds API props flow to scoring engine automatically
- [ ] Future: automate sync-week via Railway cron (Tuesday 10am)
- [ ] Future: paywall for AI features (AI_PAYWALL_ENABLED flag + is_pro on users table)
- [ ] Future: push notifications for lineup reminders
- [ ] Future: streaming Claude responses for snappier AI UX
- [ ] Future: add league_key + team_key columns to users table for faster lookups
- [ ] Future: swap get_first_user() for session-based lookup when multi-user goes live