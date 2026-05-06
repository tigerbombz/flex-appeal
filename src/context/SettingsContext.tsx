import { createContext, useContext, useState } from 'react';
import type { ScoringFormat } from '../utils/scoring';
import type { ScoringMode } from '../hooks/useScoring';

const SCORING_FORMAT_KEY = 'snapdecision_scoring_format';
const SCORING_MODE_KEY   = 'snapdecision_scoring_mode';

interface SettingsContextType {
  scoringFormat:    ScoringFormat;
  scoringMode:      ScoringMode;
  setScoringFormat: (format: ScoringFormat) => void;
  setScoringMode:   (mode: ScoringMode) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  scoringFormat:    'PPR',
  scoringMode:      'balanced',
  setScoringFormat: () => {},
  setScoringMode:   () => {},
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [scoringFormat, setScoringFormatState] = useState<ScoringFormat>(
    (localStorage.getItem(SCORING_FORMAT_KEY) as ScoringFormat) || 'PPR'
  );
  const [scoringMode, setScoringModeState] = useState<ScoringMode>(
    (localStorage.getItem(SCORING_MODE_KEY) as ScoringMode) || 'balanced'
  );

  const setScoringFormat = (format: ScoringFormat) => {
    localStorage.setItem(SCORING_FORMAT_KEY, format);
    setScoringFormatState(format);
  };

  const setScoringMode = (mode: ScoringMode) => {
    localStorage.setItem(SCORING_MODE_KEY, mode);
    setScoringModeState(mode);
  };

  return (
    <SettingsContext.Provider value={{ scoringFormat, scoringMode, setScoringFormat, setScoringMode }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);