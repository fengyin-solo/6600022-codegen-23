export type BoardState = number[][];

export interface Move {
  row: number;
  col: number;
  player: number; // 1=black, 2=white
  timestamp: number;
}

export interface GameRecord {
  id: string;
  moves: Move[];
  winner: number | null; // 0=draw, 1=black, 2=white, null=ongoing
  createdAt: string;
  duration: number;
}

export interface AIConfig {
  depth: number;
  enabled: boolean;
  playerColor: number; // AI plays as this color
}

export type GameStatus = 'idle' | 'playing' | 'finished' | 'replaying';

export type PatternType =
  | 'five'
  | 'live-four'
  | 'dead-four'
  | 'live-three'
  | 'dead-three'
  | 'live-two'
  | 'dead-two'
  | 'live-one'
  | 'dead-one';

export interface PatternInfo {
  type: PatternType;
  player: number;
  row: number;
  col: number;
  direction: [number, number];
  count: number;
  openEnds: number;
}

export interface HighlightPosition {
  row: number;
  col: number;
  type: 'threat' | 'opportunity' | 'recommend' | 'defense';
  priority: number;
}

export interface NextHint {
  position: [number, number];
  reason: string;
  strategy: string;
  priority: number;
}

export interface PositionAnalysis {
  row: number;
  col: number;
  score: number;
  patterns: PatternInfo[];
}

export interface BoardAnalysis {
  playerPatterns: PatternInfo[];
  opponentPatterns: PatternInfo[];
  threats: PatternInfo[];
  opportunities: PatternInfo[];
  highlights: HighlightPosition[];
}

export interface TeachingContent {
  situation: string;
  explanation: string[];
  strategyTips: string[];
  nextHints: NextHint[];
  keyPoints: string[];
}

export interface TeachingConfig {
  enabled: boolean;
  showHighlights: boolean;
  showHints: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
