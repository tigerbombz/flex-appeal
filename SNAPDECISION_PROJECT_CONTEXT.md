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
- LineupEval.tsx — real Yahoo roster via useRoster; league scoring settings active; slot-by-slot eval with mode toggle; "League rules active" badge; mock data info banner when Yahoo not connected
- PlayerCompare.tsx — compare up to 5 players side by side grid
- Settings.tsx — Yahoo status, scoring format/mode, engine accuracy, Sync Week UI (league + week selector, Sync button, success/error feedback), logout
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
- useRoster.ts — smart roster: real Yahoo data with mock fallback, Sleeper stats enrichment, league scoring settings fetch (cached); signature: useRoster(connected, sessionExpired, selectedLeagueKey, scoringFormat); returns leagueScoring, season, leagueKey in state
- useScoring.ts — POST /api/scoring/score, returns scored players
- useLineup.ts — POST /api/lineup/evaluate, accepts leagueKey + leagueScoring params, passes to lineupApi; week/season for backtest logging
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

yahooApi methods: getStatus, getLeagues, getMyTeam, getRoster, connectUrl, getPendingTrades, getFreeAgents, getLeagueSettings (cached 6hr in localStorage), clearLeagueSettingsCache

backtestApi methods: getSummary (league_key param), getHistory (league_key param), syncWeek, logActualPoints, bulkLogActualPoints

LeagueScoring and LeagueSettingsResponse types exported from api.ts

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
- models/player.py — Pydantic: PlayerInput, PlayerScore, LeagueScoring (per-stat point values: passing_td_pts, reception_pts, first_down_pts, bonuses, DST, kicker ranges), ScoreRequest (accepts optional leagueScoring), enums
- models/db_models.py — SQLAlchemy ORM: users, leagues, teams, roster_players, player_stats, lineup_evaluations, weekly_matchups
- models/user_repository.py — DB ops: get_or_create_user, save_tokens, get_active_token, get_refresh_token, get_first_user

### Services
- scoring_service.py — core engine: position weights, mode adjustments, calc_league_format_boost() (replaces generic FORMAT_BOOSTS when LeagueScoring provided), get_position_prop(), get_prop_score(), calc_base_score(), calc_adjusted_score(), calc_floor(), calc_ceiling(), build_explanation() (league-aware explanations), score_players() — all accept optional LeagueScoring
- lineup_service.py — SLOT_ELIGIBILITY map, evaluate_lineup(), evaluate_flex()
- odds_service.py — Odds API: get_nfl_events() with spreads+totals, get_team_totals()
- sleeper_service.py — Sleeper API (no key), in-memory cache, parse_sleeper_players()
- yahoo_service.py — OAuth flow, token refresh, get_user_leagues(), get_roster(), get_my_team(), get_pending_trades(), get_free_agents(), get_league_settings() (parses Yahoo stat category IDs → LeagueScoring), get_roster_with_points() (fetches actual fantasy pts scored for a specific week — used by sync-week)
- backtest_service.py — log_lineup_evaluation(), log_actual_points(), get_backtest_summary()
- stats_service.py — Sleeper stats: get_week_stats(), get_player_stats(), calc_fantasy_points(), get_points_last_three()
- ai_service.py — AsyncAnthropic client (non-blocking), rate limiter (MAX_AI_REQUESTS_PER_DAY), build_roster_context(), analyze_trade(), analyze_waiver_wire(). Model: claude-haiku-4-5-20251001

### Routers
- routers/odds.py — GET /api/odds/events (grouped by NFL week), /totals, /props/{id}
- routers/scoring.py — POST /api/scoring/score, /explain/{player_id}
- routers/lineup.py — POST /api/lineup/evaluate (auto-logs to DB), /flex
- routers/sleeper.py — GET /api/players/nfl, DELETE /api/players/nfl/cache
- routers/yahoo.py — GET /auth/yahoo/login, /callback, /status, /leagues, /league-settings/{league_key} (returns LeagueScoring + meta flags), /team/{league_key}, /roster/{league_key}/{team_key}, /free-agents/{league_key}, /trades/pending (checks all user leagues), /debug
- routers/backtest.py — GET /api/backtest/summary (league_key param, aggregates across leagues), POST /sync-week (Yahoo points auto-sync + was_followed detection), POST /actual-points (single manual override), POST /actual-points/bulk (multi-player manual override), GET /history (league_key param)
- routers/stats.py — GET /api/stats/week/{season}/{week}, POST /points-last-three, POST /points-last-three/bulk, GET /top/{season}/{week}/{position}, GET /current-season
- routers/ai.py — POST /api/ai/trade, POST /api/ai/waiver, GET /api/ai/status

### Utils
- utils/season.py — get_current_season() (NFL year = year season starts), get_current_week() (0 if offseason)

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
- lineup_evaluations — team_id FK, week, slot, recommendation, scores, was_followed, actual_pts (for backtesting)
- weekly_matchups — team_id FK, week, result, points_for, points_against

## Scoring Engine Details
Position-specific weights: QB(teamTotal 35%, prop 25%, usage 20%),
RB(usage 30%, prop 30%, teamTotal 20%), WR(prop 35%, usage 25%, teamTotal 20%),
TE(prop 35%, usage 30%, teamTotal 15%), K(teamTotal 35%, prop 40%),
DST(matchup 40%, prop 40% inverted)

Mode shifts weights ±10-15%. League scoring overrides generic format boosts when available.
calc_league_format_boost() translates per-stat Yahoo point values into score-scale adjustments:
- 6pt passing TD leagues boost QB scores (~+passing_td_boost × 1.5 × SCALE)
- PPR reception_pts applied per position with position-specific avg catch rates
- First down bonuses reward high-volume skill positions
- 100/300/400yd bonuses add ceiling for qualifying players

Fallback: PPR WR+4/TE+3/RB+2 when no LeagueScoring provided.
Floor/ceiling spread by volatility (Low:3/4, Medium:7/9, High:12/15).
Opp rank adjustment: top-8=-5pts, 25-32=+6pts.
Usage hierarchy: snapPct > targetShare×2.5 > carryShare×1.4 > label.

## League Settings Caching
Yahoo league settings fetched via GET /auth/yahoo/league-settings/{league_key}.
Parsed from Yahoo stat category IDs using STAT_ID_MAP in yahoo_service.py.
Cached in localStorage for 6 hours (key: snapdecision_league_settings_{leagueKey}).
Cache cleared on logout and Yahoo reconnect.
Falls back to PPR defaults gracefully if fetch fails.

## Backtest System
- Lineup evaluations auto-logged to DB on every POST /api/lineup/evaluate
- POST /api/backtest/sync-week: fetches actual points from Yahoo for a completed week,
  bulk-updates starter_actual_pts + suggestion_actual_pts, sets was_followed by comparing
  actual Yahoo starting lineup vs engine recommendation. One tap per week replaces manual entry.
- POST /api/backtest/actual-points: single player manual override
- POST /api/backtest/actual-points/bulk: multi-player manual override
- GET /api/backtest/summary: swap accuracy, keep accuracy, overall accuracy, avg swap gain.
  Accepts league_key param; aggregates across all leagues when omitted.
- team_id resolved from yahoo_id + league_key — never hardcoded
- Settings page shows Sync Week UI: league selector (multi-league users), week dropdown 1-18,
  Sync button with loading state, success/error feedback, accuracy auto-refreshes after sync

## Auth Flow
VITE_AUTH_ENABLED=true → show Landing if no user.
Yahoo OAuth → callback saves token to DB → redirect with ?yahoo_connected=true
→ LeagueSelector Dialog on first login → picks league → scoring format
auto-set from Yahoo → ONBOARDED_KEY set in localStorage.
selected_league_key stored in localStorage after onboarding (used by LineupEval, TradeAnalyzer, WaiverAssistant).
Logout clears localStorage + AuthContext + league settings cache → returns to Landing.

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
✅ Phase 8: Backtest system complete
  ✅ sync-week endpoint pulls real Yahoo points, sets was_followed automatically
  ✅ bulk actual-points endpoint for manual overrides
  ✅ Backtest summary aggregates across multiple leagues
  ✅ team_id hardcode eliminated — resolved from user + league_key
  ✅ Sync Week UI in Settings with league/week selector and feedback
✅ League-personalized scoring engine
  ✅ LeagueScoring model with full per-stat point values
  ✅ get_league_settings() parses Yahoo stat category IDs
  ✅ calc_league_format_boost() replaces generic PPR/Standard boosts
  ✅ 6pt TD leagues, first down scoring, yardage bonuses all handled
  ✅ League settings cached 6hr in localStorage, cleared on logout
  ✅ useRoster returns leagueScoring — passed through useLineup to engine
  ✅ LineupEval wired end-to-end with real roster + real league rules
  ✅ "League rules active" badge shown when real settings loaded
  ✅ Graceful fallback to PPR defaults when settings unavailable
✅ Multi-league and multi-user architecture
  ✅ /trades/pending checks all user leagues
  ✅ Backtest summary accepts league_key or aggregates all
  ✅ team_id always resolved from user_id + league_key join

## Pending / Next Steps
- [ ] Test pending trades detection with a live Yahoo league that has an active trade proposal
- [ ] Test real free agents endpoint when season starts and league has active waiver pool
- [ ] Test sync-week with a completed week once season starts
- [ ] Consider adding league_key + team_key columns to users table in DB for faster pending trades lookup
- [ ] When season starts: real Odds API props flow to scoring engine automatically
- [ ] Future: automate sync-week via Railway cron job (Tuesday 10am after stats finalize)
- [ ] Future: paywall for AI features, push notifications for lineup reminders