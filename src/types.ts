export interface Position {
  x: number; // 0 to 100 (relative to court width)
  y: number; // 0 to 100 (relative to court height)
}

export type PlayerRole = 'O1' | 'O2' | 'O3' | 'O4' | 'O5' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'Ball';

export interface PlayerState {
  id: PlayerRole;
  name: string; // PG, SG, X1, etc.
  type: 'offense' | 'defense' | 'ball';
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  type: 'pass' | 'dribble' | 'cut' | 'screen' | 'shot' | 'handoff'; // pass == dotted with arrow, dribble == zigzag, cut == solid with arrow, screen == line with T-end, shot == dotted with target, handoff == solid with double ticks
  color: string;
  points: Position[];
  startPlayerId?: string;
  endPlayerId?: string;
  origStart?: Position;
  origEnd?: Position;
}

export interface PlayStep {
  players: PlayerState[];
  description: string;
  duration: number; // Duration to animate to this step in seconds
}

export interface Play {
  id: string;
  name: string;
  description: string;
  courtType: 'half' | 'full';
  steps: PlayStep[];
  drawings: DrawingPath[]; // drawings per step, or global. Let's keep drawings as an array of step index drawings or simple per-step drawings.
  category?: 'banda' | 'fondo' | 'juego';
  isSaved?: boolean;
}
