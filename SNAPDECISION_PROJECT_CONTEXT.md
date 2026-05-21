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
- TeamOverview.tsx — home, Yahoo roster, matchup, season record, NFL schedule
- LineupEval.tsx — slot-by-slot lineup evaluation with mode toggle
- PlayerCompare.tsx — compare up to 5 players side by side grid
- Settings.tsx — Yahoo status, scoring format/mode, engine accuracy, logout
- TradeAnalyzer.tsx — AI trade evaluation via Claude API; real Yahoo roster via useRoster with mock fallback; pending trades banner auto-fetches open proposals when Yahoo connected; freeSolo autocomplete for hypothetical trades
- WaiverAssistant.tsx — AI waiver recommendations via Claude API; real Yahoo roster via useRoster; real free agents from Yahoo via getFreeAgents with ownership %, injury status, bye week; quick-tap chips for top 8 free agents; falls back to mock pool offseason
- Landing.tsx — sign in page shown when VITE_AUTH_ENABLED=true and not logged in

### Components
- AppHeader.tsx — sticky header, SnapDecision logo, week badge, format badge, settings gear icon (navigates to tab 5)
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
- useRoster.ts — smart roster: real Yahoo data with mock fallback, Sleeper stats enrichment; signature: useRoster(connected, sessionExpired, selectedLeagueKey, scoringFormat)
- useScoring.ts — POST /api/scoring/score, returns scored players
- useLineup.ts — POST /api/lineup/evaluate, week/season for backtest logging
- usePlayers.ts — Sleeper player search via GET /api/players/nfl
- useOdds.ts — GET /api/odds/events, returns weeks grouped by NFL week
- useYahoo.ts — useYahooStatus (returns { connected, loading, sessionExpired, disconnect }), useYahooLeagues
- useStats.ts — enriches players with real pointsLastThree from Sleeper
- useSettings (context) — global scoringFormat + scoringMode persisted to localStorage

### Context
- AuthContext.tsx — wraps useAuth, provides user/loading/checked/logout globally
- SettingsContext.tsx — global scoringFormat + scoringMode, persists to localStorage

### Key Types (src/types/index.ts)
Player interface has position-specific props:
- passingYardsProp (QB)
- rushingYardsProp (RB)
- receivingYardsProp (WR, TE)
- pointsAllowedProp (DST)
- projectedFgProp (K)

### Services (src/services/api.ts)
Single axios instance at VITE_API_URL. Exports:
oddsApi, scoringApi, playerApi, lineupApi, yahooApi, backtestApi, statsApi, aiApi

yahooApi methods: getStatus, getLeagues, getMyTeam, getRoster, connectUrl, getPendingTrades, getFreeAgents

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
- 5 — Settings (tab exists but NOT in bottom nav — accessed via header gear icon only)

## Backend Structure backend/
### Entry Points
- main.py — FastAPI app, registers all routers, runs init_db() on startup, load_dotenv() at top
- database.py — SQLAlchemy async engine, converts postgresql:// to asyncpg, get_db dependency

### Models
- models/player.py — Pydantic: PlayerInput (all position-specific props), PlayerScore, enums
- models/db_models.py — SQLAlchemy ORM: users, leagues, teams, roster_players,
  player_stats, lineup_evaluations, weekly_matchups
- models/user_repository.py — DB ops: get_or_create_user, save_tokens,
  get_active_token, get_refresh_token, get_first_user

### Services
- scoring_service.py — core engine: position weights, mode adjustments,
  get_position_prop(), get_prop_score(), calc_base_score(), calc_adjusted_score(),
  calc_floor(), calc_ceiling(), build_explanation(), score_players()
- lineup_service.py — SLOT_ELIGIBILITY map, evaluate_lineup(), evaluate_flex()
- odds_service.py — Odds API: get_nfl_events() with spreads+totals, get_team_totals()
- sleeper_service.py — Sleeper API (no key), in-memory cache, parse_sleeper_players()
- yahoo_service.py — OAuth flow, token refresh, get_user_leagues(), get_roster(),
  get_my_team(), get_pending_trades(), get_free_agents() — fetches available players
  in league sorted by ownership %, includes injury status + bye week, returns [] offseason
- backtest_service.py — log_lineup_evaluation(), log_actual_points(), get_backtest_summary()
- stats_service.py — Sleeper stats: get_week_stats(), get_player_stats(),
  calc_fantasy_points(), get_points_last_three()
- ai_service.py — AsyncAnthropic client (non-blocking), rate limiter (MAX_AI_REQUESTS_PER_DAY),
  build_roster_context(), analyze_trade(), analyze_waiver_wire()
  Model: claude-haiku-4-5-20251001

### Routers
- routers/odds.py — GET /api/odds/events (grouped by NFL week), /totals, /props/{id}
- routers/scoring.py — POST /api/scoring/score, /explain/{player_id}
- routers/lineup.py — POST /api/lineup/evaluate (auto-logs to DB), /flex
- routers/sleeper.py — GET /api/players/nfl, DELETE /api/players/nfl/cache
- routers/yahoo.py — GET /auth/yahoo/login, /callback, /status, /leagues,
  /team/{league_key}, /roster/{league_key}/{team_key},
  /free-agents/{league_key} (available players sorted by ownership %, graceful [] offseason),
  /trades/pending (pending trade proposals for user's team, graceful [] fallback),
  /debug
- routers/backtest.py — GET /api/backtest/summary, POST /actual-points, GET /history
- routers/stats.py — GET /api/stats/week/{season}/{week}, POST /points-last-three,
  POST /points-last-three/bulk, GET /top/{season}/{week}/{position}, GET /current-season
- routers/ai.py — POST /api/ai/trade, POST /api/ai/waiver, GET /api/ai/status

### Utils
- utils/season.py — get_current_season() (NFL year = year season starts),
  get_current_week() (0 if offseason)

### Environment Variables (Railway + local .env)
- DATABASE_URL — internal Railway URL in prod, public URL locally
- ODDS_API_KEY — The Odds API key
- YAHOO_CLIENT_ID / YAHOO_CLIENT_SECRET
- YAHOO_REDIRECT_URI — Railway backend callback URL
- FRONTEND_URL — Vercel URL in prod, localhost:5173 locally
- ANTHROPIC_API_KEY — Claude API key (note: spelled ANTHROPIC not ANTROPIC)
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

## Scoring Engine Details
Position-specific weights: QB(teamTotal 35%, prop 25%, usage 20%),
RB(usage 30%, prop 30%, teamTotal 20%), WR(prop 35%, usage 25%, teamTotal 20%),
TE(prop 35%, usage 30%, teamTotal 15%), K(teamTotal 35%, prop 40%),
DST(matchup 40%, prop 40% inverted)

Mode shifts weights ±10-15%. Format boosts: PPR WR+4/TE+3/RB+2.
Floor/ceiling spread by volatility (Low:3/4, Medium:7/9, High:12/15).
Opp rank adjustment: top-8=-5pts, 25-32=+6pts.
Usage hierarchy: snapPct > targetShare×2.5 > carryShare×1.4 > label.

## Auth Flow
VITE_AUTH_ENABLED=true → show Landing if no user.
Yahoo OAuth → callback saves token to DB → redirect with ?yahoo_connected=true
→ LeagueSelector Dialog on first login → picks league → scoring format
auto-set from Yahoo → ONBOARDED_KEY set in localStorage.
selected_league_key stored in localStorage after onboarding (used by TradeAnalyzer + WaiverAssistant to call useRoster and getFreeAgents).
Logout clears localStorage + AuthContext → returns to Landing.

## Deployment
- Vercel: auto-deploys on git push to main, runs npm run build
- Railway: auto-deploys on git push, runs uvicorn main:app
- Both watch main branch on GitHub

## Current Status
All phases complete:
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
✅ AI trade analyzer (Claude API) — smoke tested and confirmed working
✅ AI waiver wire assistant (Claude API) — smoke tested and confirmed working
✅ Settings with logout, format/mode, engine accuracy
✅ Phase 9: TradeAnalyzer + WaiverAssistant wired to real Yahoo roster via useRoster
✅ Pending trades auto-detection in TradeAnalyzer (GET /auth/yahoo/trades/pending)
✅ freeSolo autocomplete in TradeAnalyzer for hypothetical trades
✅ WaiverAssistant real free agents from Yahoo (GET /auth/yahoo/free-agents/{league_key})
✅ Waiver pool includes ownership %, injury status, bye week passed to Claude
✅ Quick-tap chips for top 8 free agents by ownership % with injury color coding
✅ Mock pool fallback during offseason — auto-switches to live when season starts
✅ AsyncAnthropic client — non-blocking async calls confirmed
✅ load_dotenv() added to main.py startup
✅ Bottom nav updated — Compare uses PeopleAlt icon, Settings removed from nav
✅ Settings accessible via header gear icon only (tab 5 preserved internally)

## Pending / Next Steps
- [ ] Test pending trades detection with a live Yahoo league that has an active trade proposal
- [ ] Test real free agents endpoint when season starts and league has active waiver pool
- [ ] Consider adding league_key + team_key columns to users table in DB for faster pending trades lookup (currently fetches live on each request if not stored)
- [ ] When season starts: real Odds API props flow to scoring engine automatically
- [ ] Backtest Phase 8: enter actual points weekly via POST /api/backtest/actual-points
- [ ] Future: paywall for AI features, push notifications for lineup reminders