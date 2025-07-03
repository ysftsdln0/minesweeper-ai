import { Cell } from '../types/game'
import axios from 'axios'

export interface AIMove {
  row: number
  col: number
  action: 'reveal' | 'flag'
  confidence: number // 0-1, where 1 is certain
  reasoning?: string
}

export interface SolverState {
  board: Cell[][]
  moves: AIMove[]
  isComplete: boolean
  hasFoundSolution: boolean
}

export class MinesweeperAISolver {
  private board: Cell[][]
  private rows: number
  private cols: number
  private totalMines: number
  private mlApiUrl = 'http://localhost:5005'
  private lastFeatures: number[][] = []
  private lastLabels: number[] = []

  constructor(board: Cell[][], totalMines: number) {
    this.board = board.map(row => row.map(cell => ({ ...cell })))
    this.rows = board.length
    this.cols = board[0].length
    this.totalMines = totalMines
  }

  /**
   * Get all neighbors of a cell
   */
  private getNeighbors(row: number, col: number): Cell[] {
    const neighbors: Cell[] = []
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]

    for (const [dr, dc] of directions) {
      const newRow = row + dr
      const newCol = col + dc
      
      if (
        newRow >= 0 && 
        newRow < this.rows && 
        newCol >= 0 && 
        newCol < this.cols
      ) {
        neighbors.push(this.board[newRow][newCol])
      }
    }

    return neighbors
  }

  /**
   * Count flagged neighbors of a cell
   */
  private countFlaggedNeighbors(row: number, col: number): number {
    return this.getNeighbors(row, col).filter(neighbor => neighbor.isFlagged).length
  }

  /**
   * Count unrevealed neighbors of a cell
   */
  private countUnrevealedNeighbors(row: number, col: number): number {
    return this.getNeighbors(row, col).filter(neighbor => !neighbor.isRevealed && !neighbor.isFlagged).length
  }

  /**
   * Get unrevealed neighbors of a cell
   */
  private getUnrevealedNeighbors(row: number, col: number): Cell[] {
    return this.getNeighbors(row, col).filter(neighbor => !neighbor.isRevealed && !neighbor.isFlagged)
  }

  /**
   * Strategy 1: Basic constraint solving
   * If a number has enough flags around it, reveal remaining neighbors
   * If a number needs all remaining neighbors to be mines, flag them
   */
  private findBasicMoves(): AIMove[] {
    const moves: AIMove[] = []

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.board[row][col]
        
        if (cell.isRevealed && !cell.isMine && cell.neighborCount > 0) {
          const flaggedCount = this.countFlaggedNeighbors(row, col)
          const unrevealedNeighbors = this.getUnrevealedNeighbors(row, col)
          const unrevealedCount = unrevealedNeighbors.length

          // If we have flagged enough mines, reveal remaining neighbors
          if (flaggedCount === cell.neighborCount && unrevealedCount > 0) {
            for (const neighbor of unrevealedNeighbors) {
              moves.push({
                row: neighbor.row,
                col: neighbor.col,
                action: 'reveal',
                confidence: 1.0,
                reasoning: `Cell (${row},${col}) has ${cell.neighborCount} mines, ${flaggedCount} flagged`
              })
            }
          }
          // If remaining unrevealed neighbors equal remaining mines, flag them all
          else if (flaggedCount + unrevealedCount === cell.neighborCount && unrevealedCount > 0) {
            for (const neighbor of unrevealedNeighbors) {
              moves.push({
                row: neighbor.row,
                col: neighbor.col,
                action: 'flag',
                confidence: 1.0,
                reasoning: `Cell (${row},${col}) needs ${cell.neighborCount - flaggedCount} more mines, ${unrevealedCount} unrevealed`
              })
            }
          }
        }
      }
    }

    return moves
  }

  /**
   * Strategy 2: Pattern recognition
   * Recognize common minesweeper patterns
   */
  private findPatternMoves(): AIMove[] {
    const moves: AIMove[] = []

    // 1-2-1 pattern detection
    for (let row = 0; row < this.rows - 2; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell1 = this.board[row][col]
        const cell2 = this.board[row + 1][col]
        const cell3 = this.board[row + 2][col]

        if (cell1.isRevealed && cell2.isRevealed && cell3.isRevealed &&
            cell1.neighborCount === 1 && cell2.neighborCount === 2 && cell3.neighborCount === 1) {
          
          // Check if this forms a valid 1-2-1 pattern
          const moves121 = this.analyze121Pattern(row, col, 'vertical')
          moves.push(...moves121)
        }
      }
    }

    // Horizontal 1-2-1 pattern
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols - 2; col++) {
        const cell1 = this.board[row][col]
        const cell2 = this.board[row][col + 1]
        const cell3 = this.board[row][col + 2]

        if (cell1.isRevealed && cell2.isRevealed && cell3.isRevealed &&
            cell1.neighborCount === 1 && cell2.neighborCount === 2 && cell3.neighborCount === 1) {
          
          const moves121 = this.analyze121Pattern(row, col, 'horizontal')
          moves.push(...moves121)
        }
      }
    }

    return moves
  }

  /**
   * Analyze 1-2-1 pattern for safe moves
   */
  private analyze121Pattern(row: number, col: number, direction: 'vertical' | 'horizontal'): AIMove[] {
    const moves: AIMove[] = []
    // This is a simplified version - in a full implementation, 
    // you would analyze the specific positions around the 1-2-1 pattern
    // for common safe spots
    return moves
  }

  /**
   * Optimized: Only consider frontier cells for probability calculation
   */
  private getFrontierCells(): Array<{row: number, col: number}> {
    const frontier: Array<{row: number, col: number}> = []
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.board[row][col]
        if (!cell.isRevealed && !cell.isFlagged) {
          // If any neighbor is revealed, it's a frontier cell
          if (this.getNeighbors(row, col).some(n => n.isRevealed)) {
            frontier.push({ row, col })
          }
        }
      }
    }
    return frontier
  }

  /**
   * Optimized: Only calculate probabilities for frontier cells
   */
  private calculateProbabilities(): Map<string, number> {
    const probabilities = new Map<string, number>()
    let flaggedCount = 0
    let unrevealedCount = 0
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.board[row][col]
        if (!cell.isRevealed && !cell.isFlagged) {
          unrevealedCount++
        }
        if (cell.isFlagged) {
          flaggedCount++
        }
      }
    }
    const remainingMines = this.totalMines - flaggedCount
    const baseProbability = remainingMines / Math.max(1, unrevealedCount)
    // Only consider frontier cells
    const frontier = this.getFrontierCells()
    for (const {row, col} of frontier) {
      let probability = baseProbability
      let constraintCount = 0
      let totalConstraintValue = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const neighborRow = row + dr
          const neighborCol = col + dc
          if (neighborRow >= 0 && neighborRow < this.rows && neighborCol >= 0 && neighborCol < this.cols) {
            const neighbor = this.board[neighborRow][neighborCol]
            if (neighbor.isRevealed && !neighbor.isMine && neighbor.neighborCount > 0) {
              const flaggedNeighbors = this.countFlaggedNeighbors(neighborRow, neighborCol)
              const unrevealedNeighbors = this.countUnrevealedNeighbors(neighborRow, neighborCol)
              if (unrevealedNeighbors > 0) {
                const localProbability = (neighbor.neighborCount - flaggedNeighbors) / unrevealedNeighbors
                totalConstraintValue += localProbability
                constraintCount++
              }
            }
          }
        }
      }
      if (constraintCount > 0) {
        probability = totalConstraintValue / constraintCount
      }
      probabilities.set(`${row}-${col}`, Math.max(0, Math.min(1, probability)))
    }
    // For non-frontier cells, assign base probability (for true guessing)
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.board[row][col]
        if (!cell.isRevealed && !cell.isFlagged && !probabilities.has(`${row}-${col}`)) {
          probabilities.set(`${row}-${col}`, baseProbability)
        }
      }
    }
    return probabilities
  }

  /**
   * Find the safest move based on probability
   */
  private findProbabilisticMove(): AIMove | null {
    const probabilities = this.calculateProbabilities()
    
    let bestMove: AIMove | null = null
    let lowestProbability = 1.0

    Array.from(probabilities.keys()).forEach(key => {
      const probability = probabilities.get(key)!
      const [row, col] = key.split('-').map(Number)
      if (probability < lowestProbability) {
        lowestProbability = probability
        bestMove = {
          row,
          col,
          action: 'reveal',
          confidence: 1 - probability,
          reasoning: `Lowest mine probability: ${(probability * 100).toFixed(1)}%`
        }
      }
    })

    return bestMove
  }

  /**
   * Smart starting move strategy
   */
  private findSafeStartingMove(): AIMove | null {
    // Strategy 1: Try the center area first (often safest statistically)
    const centerRow = Math.floor(this.rows / 2)
    const centerCol = Math.floor(this.cols / 2)
    
    // Check a 3x3 area around center, but randomize the order
    const centerPositions: Array<[number, number]> = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const row = centerRow + dr
        const col = centerCol + dc
        
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
          centerPositions.push([row, col])
        }
      }
    }
    
    // Shuffle center positions for variety
    const shuffledCenterPositions = [...centerPositions].sort(() => Math.random() - 0.5)
    
    for (const [row, col] of shuffledCenterPositions) {
      const cell = this.board[row][col]
      if (!cell.isRevealed && !cell.isFlagged) {
        return {
          row,
          col,
          action: 'reveal',
          confidence: 0.85,
          reasoning: `Center area move (${row}, ${col}) - statistically optimal for opening`
        }
      }
    }

    // Strategy 2: Try corners - randomize the order for variety
    const corners = [
      [0, 0], [0, this.cols - 1], 
      [this.rows - 1, 0], [this.rows - 1, this.cols - 1]
    ]

    // Shuffle corners array for random selection
    const shuffledCorners = [...corners].sort(() => Math.random() - 0.5)

    for (const [row, col] of shuffledCorners) {
      const cell = this.board[row][col]
      if (!cell.isRevealed && !cell.isFlagged) {
        return {
          row,
          col,
          action: 'reveal',
          confidence: 0.8,
          reasoning: `Random corner move (${row}, ${col}) - statistically safer`
        }
      }
    }

    // Strategy 3: Try edges - prefer center of edges for better opening
    const edgePositions: Array<[number, number]> = []
    
    // Top and bottom edges (avoid corners)
    for (let col = 1; col < this.cols - 1; col++) {
      edgePositions.push([0, col]) // Top edge
      edgePositions.push([this.rows - 1, col]) // Bottom edge
    }
    
    // Left and right edges (avoid corners)
    for (let row = 1; row < this.rows - 1; row++) {
      edgePositions.push([row, 0]) // Left edge
      edgePositions.push([row, this.cols - 1]) // Right edge
    }

    // Shuffle edge positions for variety
    const shuffledEdges = [...edgePositions].sort(() => Math.random() - 0.5)

    for (const [row, col] of shuffledEdges) {
      const cell = this.board[row][col]
      if (!cell.isRevealed && !cell.isFlagged) {
        return {
          row,
          col,
          action: 'reveal',
          confidence: 0.7,
          reasoning: `Random edge move (${row}, ${col}) - statistically safer`
        }
      }
    }

    return null
  }

  // Converts a cell and its neighbors into a feature vector for ML
  private extractFeatures(row: number, col: number): number[] {
    const cell = this.board[row][col]
    const neighbors = this.getNeighbors(row, col)
    // Example features: isRevealed, isFlagged, neighborCount, #flagged, #unrevealed, neighbor states
    const features = [
      cell.isRevealed ? 1 : 0,
      cell.isFlagged ? 1 : 0,
      cell.neighborCount,
      this.countFlaggedNeighbors(row, col),
      this.countUnrevealedNeighbors(row, col),
      ...neighbors.map(n => n.isRevealed ? 1 : 0),
      ...neighbors.map(n => n.isFlagged ? 1 : 0),
      ...neighbors.map(n => n.neighborCount)
    ]
    return features
  }

  // Log a move to the ML backend
  private async logMove(row: number, col: number, label: number) {
    const features = this.extractFeatures(row, col)
    this.lastFeatures.push(features)
    this.lastLabels.push(label)
    try {
      await axios.post(`${this.mlApiUrl}/log_move`, { features, label })
      // Debug log
      console.log('Logged move to backend:', { features, label })
    } catch (e) {
      console.error('Failed to log move to backend:', e)
    }
  }

  // Predict mine probability for a cell using ML backend
  private async predictMineProbability(row: number, col: number): Promise<number> {
    const features = this.extractFeatures(row, col)
    try {
      const res = await axios.post(`${this.mlApiUrl}/predict`, { features })
      return res.data.mine_probability
    } catch (e) {
      return 0.5 // fallback
    }
  }

  /**
   * Get the next best move
   */
  public async getNextMove(): Promise<AIMove | null> {
    // Find all unrevealed, unflagged cells
    const candidates: Array<{row: number, col: number}> = []
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.board[row][col]
        if (!cell.isRevealed && !cell.isFlagged) {
          candidates.push({ row, col })
        }
      }
    }
    // Predict mine probability for each candidate
    let bestMove: AIMove | null = null
    let lowestProb = 1.0
    for (const {row, col} of candidates) {
      const prob = await this.predictMineProbability(row, col)
      if (prob < lowestProb) {
        lowestProb = prob
        bestMove = {
          row,
          col,
          action: 'reveal',
          confidence: 1 - prob,
          reasoning: `ML mine probability: ${(prob * 100).toFixed(1)}%`
        }
      }
    }
    return bestMove
  }

  // Call this after each game to train the model
  public async trainModel() {
    try {
      await axios.post(`${this.mlApiUrl}/train`)
    } catch (e) {
      // ignore for now
    }
  }

  // Call this after each move to log the result (label: 1 if mine, 0 if safe)
  public async logResult(row: number, col: number, label: number) {
    await this.logMove(row, col, label)
    // Debug log
    console.log('logResult called:', { row, col, label })
  }

  /**
   * Update the board state
   */
  public updateBoard(newBoard: Cell[][]): void {
    this.board = newBoard.map(row => row.map(cell => ({ ...cell })))
  }

  // public getAllCertainMoves(): AIMove[] {
  //   const basicMoves = this.findBasicMoves()
  //   const patternMoves = this.findPatternMoves()
  //   return [...basicMoves, ...patternMoves].filter(move => move.confidence >= 0.9)
  // }

  // public isSolvableWithoutGuessing(): boolean {
  //   const certainMoves = this.getAllCertainMoves()
  //   return certainMoves.length > 0
  // }

  /**
   * Get game completion percentage
   */
  public getCompletionPercentage(): number {
    let revealedCount = 0
    let totalSafeCells = 0

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.board[row][col]
        if (!cell.isMine) {
          totalSafeCells++
          if (cell.isRevealed) {
            revealedCount++
          }
        }
      }
    }

    return totalSafeCells > 0 ? (revealedCount / totalSafeCells) * 100 : 0
  }
}
