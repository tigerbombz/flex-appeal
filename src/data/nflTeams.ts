export interface NflTeam {
  id: number;
  name: string;
  abbr: string;
  city: string;
  conference: 'AFC' | 'NFC';
  division: 'North' | 'South' | 'East' | 'West';
}

export const NFL_TEAMS: NflTeam[] = [
  // AFC North
  { id: 201, name: 'Baltimore Ravens D/ST',    abbr: 'BAL', city: 'Baltimore',   conference: 'AFC', division: 'North' },
  { id: 202, name: 'Cincinnati Bengals D/ST',  abbr: 'CIN', city: 'Cincinnati',  conference: 'AFC', division: 'North' },
  { id: 203, name: 'Cleveland Browns D/ST',    abbr: 'CLE', city: 'Cleveland',   conference: 'AFC', division: 'North' },
  { id: 204, name: 'Pittsburgh Steelers D/ST', abbr: 'PIT', city: 'Pittsburgh',  conference: 'AFC', division: 'North' },

  // AFC South
  { id: 205, name: 'Houston Texans D/ST',      abbr: 'HOU', city: 'Houston',     conference: 'AFC', division: 'South' },
  { id: 206, name: 'Indianapolis Colts D/ST',  abbr: 'IND', city: 'Indianapolis',conference: 'AFC', division: 'South' },
  { id: 207, name: 'Jacksonville Jaguars D/ST',abbr: 'JAX', city: 'Jacksonville',conference: 'AFC', division: 'South' },
  { id: 208, name: 'Tennessee Titans D/ST',    abbr: 'TEN', city: 'Tennessee',   conference: 'AFC', division: 'South' },

  // AFC East
  { id: 209, name: 'Buffalo Bills D/ST',       abbr: 'BUF', city: 'Buffalo',     conference: 'AFC', division: 'East' },
  { id: 210, name: 'Miami Dolphins D/ST',      abbr: 'MIA', city: 'Miami',       conference: 'AFC', division: 'East' },
  { id: 211, name: 'New England Patriots D/ST',abbr: 'NE',  city: 'New England', conference: 'AFC', division: 'East' },
  { id: 212, name: 'New York Jets D/ST',       abbr: 'NYJ', city: 'New York',    conference: 'AFC', division: 'East' },

  // AFC West
  { id: 213, name: 'Denver Broncos D/ST',      abbr: 'DEN', city: 'Denver',      conference: 'AFC', division: 'West' },
  { id: 214, name: 'Kansas City Chiefs D/ST',  abbr: 'KC',  city: 'Kansas City', conference: 'AFC', division: 'West' },
  { id: 215, name: 'Las Vegas Raiders D/ST',   abbr: 'LV',  city: 'Las Vegas',   conference: 'AFC', division: 'West' },
  { id: 216, name: 'Los Angeles Chargers D/ST',abbr: 'LAC', city: 'Los Angeles', conference: 'AFC', division: 'West' },

  // NFC North
  { id: 217, name: 'Chicago Bears D/ST',       abbr: 'CHI', city: 'Chicago',     conference: 'NFC', division: 'North' },
  { id: 218, name: 'Detroit Lions D/ST',       abbr: 'DET', city: 'Detroit',     conference: 'NFC', division: 'North' },
  { id: 219, name: 'Green Bay Packers D/ST',   abbr: 'GB',  city: 'Green Bay',   conference: 'NFC', division: 'North' },
  { id: 220, name: 'Minnesota Vikings D/ST',   abbr: 'MIN', city: 'Minnesota',   conference: 'NFC', division: 'North' },

  // NFC South
  { id: 221, name: 'Atlanta Falcons D/ST',     abbr: 'ATL', city: 'Atlanta',     conference: 'NFC', division: 'South' },
  { id: 222, name: 'Carolina Panthers D/ST',   abbr: 'CAR', city: 'Carolina',    conference: 'NFC', division: 'South' },
  { id: 223, name: 'New Orleans Saints D/ST',  abbr: 'NO',  city: 'New Orleans', conference: 'NFC', division: 'South' },
  { id: 224, name: 'Tampa Bay Buccaneers D/ST',abbr: 'TB',  city: 'Tampa Bay',   conference: 'NFC', division: 'South' },

  // NFC East
  { id: 225, name: 'Dallas Cowboys D/ST',      abbr: 'DAL', city: 'Dallas',      conference: 'NFC', division: 'East' },
  { id: 226, name: 'New York Giants D/ST',     abbr: 'NYG', city: 'New York',    conference: 'NFC', division: 'East' },
  { id: 227, name: 'Philadelphia Eagles D/ST', abbr: 'PHI', city: 'Philadelphia',conference: 'NFC', division: 'East' },
  { id: 228, name: 'Washington Commanders D/ST',abbr:'WAS', city: 'Washington',  conference: 'NFC', division: 'East' },

  // NFC West
  { id: 229, name: 'Arizona Cardinals D/ST',   abbr: 'ARI', city: 'Arizona',     conference: 'NFC', division: 'West' },
  { id: 230, name: 'Los Angeles Rams D/ST',    abbr: 'LAR', city: 'Los Angeles', conference: 'NFC', division: 'West' },
  { id: 231, name: 'San Francisco 49ers D/ST', abbr: 'SF',  city: 'San Francisco',conference: 'NFC', division: 'West' },
  { id: 232, name: 'Seattle Seahawks D/ST',    abbr: 'SEA', city: 'Seattle',     conference: 'NFC', division: 'West' },
];

// Convert NflTeam to Player shape for compare/eval
export const dstToPlayer = (team: NflTeam) => ({
  id:               team.id,
  name:             team.name,
  position:         'DST' as const,
  slot:             'D/ST',
  team:             team.abbr,
  opponent:         'TBD',
  vegasProp:        null,
  teamTotal:        null,
  oppTotal:         null,
  avgYards:         null,
  usage:            null,
  trend:            'neutral' as const,
  score:            50,
  status:           'active' as const,
  matchupDifficulty:'Medium' as const,
  isLocked:         false,
  oppRank:          null,
  oppPointsAllowed: null,
  snapPct:          null,
  targetShare:      null,
  carryShare:       null,
  volatility:       'High' as const,
  isDome:           false,
  weather:          'Clear' as const,
  pointsLastThree:  [],
});