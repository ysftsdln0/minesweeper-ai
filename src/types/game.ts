export type Difficulty = 'easy' | 'medium' | 'hard'

export interface GameConfig {
  rows: number
  cols: number
  mines: number
}

export interface Cell {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborCount: number
  row: number
  col: number
}

export type GameStatus = 'playing' | 'won' | 'lost'

export const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
}
